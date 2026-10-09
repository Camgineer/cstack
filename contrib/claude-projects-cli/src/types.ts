export interface Target {
  projectId: string;
  // Undefined addresses the project's coordinator chat.
  threadId?: string;
}

export interface Message {
  id: string;
  author: 'user' | 'assistant';
  text: string;
}

export interface ProjectRef {
  id: string;
  name: string;
}

export interface ThreadRef {
  id: string;
  title: string;
}

// The seam between commands and claude.ai. The Playwright adapter implements it
// for real; tests implement it with an in-memory fake.
export interface ChatPort {
  listProjects(): Promise<ProjectRef[]>;
  listThreads(projectId: string): Promise<ThreadRef[]>;
  readMessages(target: Target): Promise<Message[]>;
  sendMessage(target: Target, text: string): Promise<void>;
  readDraft(target: Target): Promise<string>;
  clearDraft(target: Target): Promise<void>;
  close(): Promise<void>;
}

export type Request =
  | { command: 'list-projects' }
  | { command: 'list-threads'; projectId: string }
  | { command: 'read-coordinator'; projectId: string }
  | { command: 'read-thread'; projectId: string; threadId: string }
  | {
      command: 'post';
      projectId: string;
      threadId?: string;
      text: string;
      dryRun?: boolean;
      allowDuplicate?: boolean;
    }
  | { command: 'clear-draft'; projectId: string; threadId?: string };

export type Envelope =
  | { ok: true; command: string; timing_ms: number; data: unknown }
  | { ok: false; command: string; timing_ms: number; error: { code: string; message: string } };
