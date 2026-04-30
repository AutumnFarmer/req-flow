export interface RequirementDoc {
  version: number;
  productDef: {
    description: string;
    targetUsers: string;
    coreValue: string;
  };
  features: Array<{
    priority: 'P0' | 'P1' | 'P2';
    name: string;
    description: string;
    notes: string;
  }>;
  excluded: string[];
  rules: string[];
  pendingQuestions: string[];
}

export interface TechDoc {
  techStack: Array<{ tech: string; reason: string }>;
  modules: Array<{ name: string; description: string; dependencies: string[] }>;
  dataModels: Array<{ name: string; fields: Array<{ name: string; type: string; required: boolean; description: string }> }>;
  apis: Array<{ method: string; path: string; description: string }>;
}

export interface AcceptanceDoc {
  features: Array<{
    name: string;
    cases: Array<{ scenario: string; operation: string; expected: string; boundary: string }>;
  }>;
}

export interface PrototypeDoc {
  html: string;
  pages: string[];
}

export type Stage = 'clarify' | 'draft' | 'review' | 'frozen';

export interface Session {
  id: string;
  idea: string;
  stage: Stage;
  version: number;
  requirement: RequirementDoc | null;
  tech: TechDoc | null;
  acceptance: AcceptanceDoc | null;
  prototype: PrototypeDoc | null;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>;
  changelog: Array<{ version: number; action: string; detail: string }>;
  createdAt: number;
  updatedAt: number;
}

const sessions = new Map<string, Session>();

export function createSession(id: string, idea: string): Session {
  const session: Session = {
    id,
    idea,
    stage: 'clarify',
    version: 0,
    requirement: null,
    tech: null,
    acceptance: null,
    prototype: null,
    messages: [],
    changelog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function updateSession(id: string, updates: Partial<Session>): Session | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  Object.assign(session, updates, { updatedAt: Date.now() });
  return session;
}
