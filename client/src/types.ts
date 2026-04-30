export type Stage = 'clarify' | 'draft' | 'review' | 'frozen';

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
  dataModels: Array<{
    name: string;
    fields: Array<{ name: string; type: string; required: boolean; description: string }>;
  }>;
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

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Changelog {
  version: number;
  action: string;
  detail: string;
}

export interface Session {
  id: string;
  idea: string;
  stage: Stage;
  version: number;
  requirement: RequirementDoc | null;
  tech: TechDoc | null;
  acceptance: AcceptanceDoc | null;
  prototype: PrototypeDoc | null;
  messages: ChatMessage[];
  changelog: Changelog[];
  createdAt: number;
  updatedAt: number;
}

export type DocTab = 'requirement' | 'tech' | 'acceptance' | 'prototype';
