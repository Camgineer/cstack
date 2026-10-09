import { chromium, type BrowserContext, type Page } from 'playwright-core';
import type { ChatPort, Message, ProjectRef, Target, ThreadRef } from './types.ts';

// Selectors live in one place. They drift when claude.ai ships UI changes, so
// re-check them against the live page first when a command starts failing.
export const SELECTORS = {
  projectLink: 'a[href^="/project/"]',
  chatLink: 'a[href^="/chat/"]',
  message: '[data-testid="user-message"], [data-testid="assistant-message"]',
  composer: 'div[contenteditable="true"].ProseMirror',
  send: 'button[aria-label="Send message"]',
} as const;

export interface PlaywrightOptions {
  profileDir: string;
  baseUrl: string;
  headless: boolean;
  executablePath?: string;
}

export async function openPlaywrightPort(options: PlaywrightOptions): Promise<ChatPort> {
  const context = await chromium.launchPersistentContext(options.profileDir, {
    headless: options.headless,
    executablePath: options.executablePath,
    viewport: { width: 1280, height: 900 },
  });
  return new WarmTabs(context, options.baseUrl);
}

// Keeps one tab per URL open for the life of the daemon, so repeat calls skip
// navigation and only pay for the DOM read or the send.
class WarmTabs implements ChatPort {
  private pages = new Map<string, Page>();

  constructor(
    private readonly context: BrowserContext,
    private readonly baseUrl: string,
  ) {}

  async listProjects(): Promise<ProjectRef[]> {
    const page = await this.open(`${this.baseUrl}/projects`);
    const links = await anchors(page, SELECTORS.projectLink);
    return unique(links.map(({ href, text }) => ({ id: idFrom(href), name: text })));
  }

  async listThreads(projectId: string): Promise<ThreadRef[]> {
    const page = await this.open(this.projectUrl(projectId));
    const links = await anchors(page, SELECTORS.chatLink);
    return unique(links.map(({ href, text }) => ({ id: idFrom(href), title: text })));
  }

  async readMessages(target: Target): Promise<Message[]> {
    const page = await this.open(this.urlOf(target));
    return page.$$eval(SELECTORS.message, (nodes) =>
      nodes.map((node, index) => ({
        id: node.getAttribute('data-message-id') ?? String(index),
        author: node.getAttribute('data-testid') === 'user-message' ? 'user' : 'assistant',
        text: (node as HTMLElement).innerText,
      })),
    ) as Promise<Message[]>;
  }

  async sendMessage(target: Target, text: string): Promise<void> {
    const page = await this.open(this.urlOf(target));
    await page.locator(SELECTORS.composer).click();
    await page.keyboard.insertText(text);
    await page.locator(SELECTORS.send).click();
  }

  async readDraft(target: Target): Promise<string> {
    const page = await this.open(this.urlOf(target));
    return page.locator(SELECTORS.composer).innerText();
  }

  async clearDraft(target: Target): Promise<void> {
    const page = await this.open(this.urlOf(target));
    const composer = page.locator(SELECTORS.composer);
    await composer.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
  }

  async close(): Promise<void> {
    await this.context.close();
  }

  private projectUrl(projectId: string): string {
    return `${this.baseUrl}/project/${projectId}`;
  }

  private urlOf(target: Target): string {
    return target.threadId === undefined
      ? this.projectUrl(target.projectId)
      : `${this.baseUrl}/chat/${target.threadId}`;
  }

  private async open(url: string): Promise<Page> {
    const warm = this.pages.get(url);
    if (warm && !warm.isClosed()) return warm;
    const page = await this.context.newPage();
    this.pages.set(url, page);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    return page;
  }
}

async function anchors(page: Page, selector: string): Promise<Array<{ href: string; text: string }>> {
  return page.$$eval(selector, (nodes) =>
    nodes.map((node) => ({
      href: node.getAttribute('href') ?? '',
      text: (node as HTMLElement).innerText.trim(),
    })),
  );
}

// Hrefs look like /project/<id> or /chat/<id>.
function idFrom(href: string): string {
  return href.split('/')[2] ?? '';
}

function unique<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
