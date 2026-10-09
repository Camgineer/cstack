import type { ChatPort, Message, Target } from '../src/types.ts';

// In-memory claude.ai. Set dropSends to model a send the page never shows,
// and keepDraft to model a composer that ignores the clear.
export class FakePort implements ChatPort {
  messages: Message[] = [];
  sent: Array<{ target: Target; text: string }> = [];
  draft = '';
  dropSends = false;
  keepDraft = false;
  readTargets: Target[] = [];

  async listProjects() {
    return [{ id: 'p1', name: 'Ops' }];
  }

  async listThreads(projectId: string) {
    return [{ id: `${projectId}-t1`, title: 'Blockers' }];
  }

  async readMessages(target: Target) {
    this.readTargets.push(target);
    return this.messages.map((message) => ({ ...message }));
  }

  async sendMessage(target: Target, text: string) {
    this.sent.push({ target, text });
    if (this.dropSends) return;
    this.messages.push({ id: String(this.messages.length), author: 'user', text });
  }

  async readDraft() {
    return this.draft;
  }

  async clearDraft() {
    if (!this.keepDraft) this.draft = '';
  }

  async close() {}
}
