export type Stage = 'clarify' | 'draft' | 'review' | 'frozen';
export type RuntimeState = 'idle' | 'thinking' | 'proposal_pending' | 'applying' | 'checking' | 'blocked';
export type DocTab = 'constitution' | 'requirement' | 'tech' | 'acceptance' | 'prototype' | 'taskPlan';
export type MessageRole = 'user' | 'assistant' | 'system';
export type ChangeType = 'fix' | 'idea' | 'conflict' | 'reset' | 'freeze' | 'generate';
export type ImpactTarget = 'constitution' | 'requirement' | 'tech' | 'acceptance' | 'prototype' | 'taskPlan';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface RequirementConstitution {
  productName: string;
  oneSentence: string;
  targetUsers: string[];
  coreValue: string;
  primaryScenario: string;
  successCriteria: string[];
  nonGoals: string[];
  lockedDecisions: string[];
}

export interface RequirementDoc {
  overview: {
    background: string;
    problem: string;
    goal: string;
  };
  users: Array<{
    name: string;
    description: string;
    painPoints: string[];
  }>;
  scenarios: Array<{
    name: string;
    trigger: string;
    userGoal: string;
    mainFlow: string[];
    exceptions: string[];
  }>;
  scope: {
    inScope: string[];
    outOfScope: string[];
  };
  features: Array<{
    id: string;
    priority: 'P0' | 'P1' | 'P2';
    name: string;
    description: string;
    userValue: string;
    relatedScenarios: string[];
  }>;
  businessRules: Array<{
    id: string;
    rule: string;
    reason: string;
  }>;
  nonFunctional: {
    performance: string[];
    security: string[];
    usability: string[];
    compatibility: string[];
  };
  assumptions: string[];
  openQuestions: string[];
}

export interface TechDoc {
  architecture: {
    style: string;
    rationale: string;
    constraints: string[];
  };
  techStack: Array<{ tech: string; reason: string; risk?: string }>;
  modules: Array<{
    id: string;
    name: string;
    responsibility: string;
    dependencies: string[];
  }>;
  dataModels: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
  }>;
  apis: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description: string;
    request?: string;
    response?: string;
  }>;
  risks: RiskRecord[];
}

export interface AcceptanceDoc {
  featureCases: Array<{
    featureId: string;
    cases: Array<{
      id: string;
      scenario: string;
      given: string;
      when: string;
      then: string;
      boundary?: string;
      priority: 'must' | 'should' | 'could';
    }>;
  }>;
  releaseChecklist: string[];
}

export interface PrototypeDoc {
  html: string;
  pages: string[];
  sourceVersion: number;
}

export interface TaskPlanDoc {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    dependsOn: string[];
    acceptanceRefs: string[];
  }>;
}

export interface OpenQuestion {
  id: string;
  question: string;
  impact: 'low' | 'medium' | 'high';
  status: 'open' | 'answered' | 'dismissed';
}

export interface DecisionRecord {
  id: string;
  decision: string;
  reason: string;
  createdAt: number;
}

export interface RiskRecord {
  id: string;
  risk: string;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ChangeProposal {
  id: string;
  type: ChangeType;
  summary: string;
  userIntent: string;
  impactTargets: ImpactTarget[];
  impactLevel: 'low' | 'medium' | 'high';
  reason: string;
  proposedChanges: Array<{
    target: ImpactTarget;
    before: string;
    after: string;
    reason: string;
  }>;
  proposedDocuments: Partial<Pick<Session, 'constitution' | 'requirement' | 'tech' | 'acceptance' | 'prototype' | 'taskPlan' | 'openQuestions' | 'risks' | 'decisions'>>;
  conflicts: string[];
  requiresConfirmation: boolean;
  createdAt: number;
}

export interface QualityReport {
  score: number;
  stage: Stage;
  blockers: string[];
  warnings: string[];
  passedChecks: string[];
  nextActions: string[];
}

export interface VersionSnapshot {
  version: number;
  proposalId: string | null;
  summary: string;
  constitution: RequirementConstitution;
  requirement: RequirementDoc | null;
  tech: TechDoc | null;
  acceptance: AcceptanceDoc | null;
  prototype: PrototypeDoc | null;
  taskPlan: TaskPlanDoc | null;
  qualityReport: QualityReport | null;
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  originalIdea: string;
  stage: Stage;
  runtimeState: RuntimeState;
  currentVersion: number;
  constitution: RequirementConstitution;
  requirement: RequirementDoc | null;
  tech: TechDoc | null;
  acceptance: AcceptanceDoc | null;
  prototype: PrototypeDoc | null;
  taskPlan: TaskPlanDoc | null;
  openQuestions: OpenQuestion[];
  decisions: DecisionRecord[];
  risks: RiskRecord[];
  pendingProposal: ChangeProposal | null;
  qualityReport: QualityReport | null;
  messages: ChatMessage[];
  snapshots: VersionSnapshot[];
  createdAt: number;
  updatedAt: number;
}

export interface AssistantTurnResult {
  message: string;
  suggestedQuestions: string[];
  proposal: ChangeProposal | null;
  qualityReport: QualityReport | null;
  recommendedAction:
    | 'answer_questions'
    | 'accept_proposal'
    | 'generate_docs'
    | 'generate_prototype'
    | 'run_quality_check'
    | 'freeze';
}
