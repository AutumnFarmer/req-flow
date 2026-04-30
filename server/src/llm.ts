import { z } from 'zod';
import { getModel, getOpenAIClient, getProviderLabel, hasLLMConfig } from './ai.js';
import { makeProposal, persist, proposalMessage } from './store.js';
import type { AssistantTurnResult, ChangeProposal, ImpactTarget, Session } from './types.js';

const impactTargetSchema = z.enum(['constitution', 'requirement', 'tech', 'acceptance', 'prototype', 'taskPlan']);
const impactLevelSchema = z.enum(['low', 'medium', 'high']);
const questionImpactSchema = z.enum(['low', 'medium', 'high']);

const stringList = z.array(z.string().min(1)).default([]);

const constitutionSchema = z.object({
  productName: z.string().min(1),
  oneSentence: z.string().min(1),
  targetUsers: stringList,
  coreValue: z.string().min(1),
  primaryScenario: z.string().min(1),
  successCriteria: stringList,
  nonGoals: stringList,
  lockedDecisions: stringList,
});

const riskRecordSchema = z.object({
  id: z.string().min(1),
  risk: z.string().min(1),
  impact: impactLevelSchema,
  mitigation: z.string().min(1),
});

const requirementSchema = z.object({
  overview: z.object({
    background: z.string().min(1),
    problem: z.string().min(1),
    goal: z.string().min(1),
  }),
  users: z.array(z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    painPoints: stringList,
  })).min(1),
  scenarios: z.array(z.object({
    name: z.string().min(1),
    trigger: z.string().min(1),
    userGoal: z.string().min(1),
    mainFlow: stringList,
    exceptions: stringList,
  })).min(1),
  scope: z.object({
    inScope: stringList,
    outOfScope: stringList,
  }),
  features: z.array(z.object({
    id: z.string().min(1),
    priority: z.enum(['P0', 'P1', 'P2']),
    name: z.string().min(1),
    description: z.string().min(1),
    userValue: z.string().min(1),
    relatedScenarios: stringList,
  })).min(1),
  businessRules: z.array(z.object({
    id: z.string().min(1),
    rule: z.string().min(1),
    reason: z.string().min(1),
  })).min(1),
  nonFunctional: z.object({
    performance: stringList,
    security: stringList,
    usability: stringList,
    compatibility: stringList,
  }),
  assumptions: stringList,
  openQuestions: stringList,
});

const techSchema = z.object({
  architecture: z.object({
    style: z.string().min(1),
    rationale: z.string().min(1),
    constraints: stringList,
  }),
  techStack: z.array(z.object({
    tech: z.string().min(1),
    reason: z.string().min(1),
    risk: z.string().optional(),
  })).min(1),
  modules: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    responsibility: z.string().min(1),
    dependencies: stringList,
  })).min(1),
  dataModels: z.array(z.object({
    name: z.string().min(1),
    fields: z.array(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      required: z.boolean(),
      description: z.string().min(1),
    })).min(1),
  })).min(1),
  apis: z.array(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: z.string().min(1),
    description: z.string().min(1),
    request: z.string().optional(),
    response: z.string().optional(),
  })).min(1),
  risks: z.array(riskRecordSchema).default([]),
});

const acceptanceSchema = z.object({
  featureCases: z.array(z.object({
    featureId: z.string().min(1),
    cases: z.array(z.object({
      id: z.string().min(1),
      scenario: z.string().min(1),
      given: z.string().min(1),
      when: z.string().min(1),
      then: z.string().min(1),
      boundary: z.string().optional(),
      priority: z.enum(['must', 'should', 'could']),
    })).min(1),
  })).min(1),
  releaseChecklist: stringList,
});

const taskPlanSchema = z.object({
  tasks: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    dependsOn: stringList,
    acceptanceRefs: stringList,
  })).min(1),
});

const openQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1),
  impact: questionImpactSchema.default('medium'),
  status: z.enum(['open', 'answered', 'dismissed']).default('open'),
});

const proposedDocumentsSchema = z.object({
  constitution: constitutionSchema.optional(),
  requirement: requirementSchema.optional(),
  tech: techSchema.optional(),
  acceptance: acceptanceSchema.optional(),
  taskPlan: taskPlanSchema.optional(),
  openQuestions: z.array(openQuestionSchema).optional(),
  risks: z.array(riskRecordSchema).optional(),
});

const llmTurnSchema = z.object({
  message: z.string().min(1),
  proposal: z.object({
    summary: z.string().min(1),
    impactLevel: impactLevelSchema,
    reason: z.string().min(1),
    proposedDocuments: proposedDocumentsSchema,
    conflicts: z.array(z.string()).default([]),
  }),
  suggestedQuestions: z.array(z.string()).default([]),
});

type LLMPlan = {
  type: ChangeProposal['type'];
  summary: string;
  targets: ImpactTarget[];
  requiredDocs: ImpactTarget[];
  instruction: string;
};

const LOCAL_COMMANDS = new Set(['review', 'quality', 'freeze', 'reset']);

export function shouldUseLocalCommand(command?: string): boolean {
  return Boolean(command && LOCAL_COMMANDS.has(command));
}

export async function handleLLMAssistantTurn(
  session: Session,
  message: string,
  command?: string,
): Promise<AssistantTurnResult> {
  if (!hasLLMConfig()) {
    throw new Error('LLM 未配置：请在 server/.env 配置 OPENAI_API_KEY、OPENAI_BASE_URL 和 OPENAI_MODEL');
  }

  const plan = createPlan(session, command);
  if (!plan) {
    throw new Error(`命令 ${command || '空'} 不是 LLM 生成命令`);
  }

  const parsed = await requestStructuredTurn(session, message, command, plan);
  const docs = normalizeDocuments(parsed.proposal.proposedDocuments);
  ensureRequiredDocs(plan, docs);

  const proposal = makeProposal(
    session,
    plan.type,
    parsed.proposal.summary || plan.summary,
    message,
    plan.targets,
    docs,
    parsed.proposal.impactLevel,
    parsed.proposal.conflicts,
  );
  proposal.reason = parsed.proposal.reason;

  session.pendingProposal = proposal;
  session.runtimeState = 'proposal_pending';
  persist(session);

  const messageWithControl = withControlHint(parsed.message, proposal);
  return {
    message: messageWithControl,
    suggestedQuestions: parsed.suggestedQuestions,
    proposal,
    qualityReport: null,
    recommendedAction: 'accept_proposal',
  };
}

function createPlan(session: Session, command?: string): LLMPlan | null {
  if (command === 'generate-tech') {
    return {
      type: 'generate',
      summary: '生成技术方案',
      targets: ['tech'],
      requiredDocs: ['tech'],
      instruction: '生成一份可交付给开发团队的技术方案，必须覆盖架构、技术栈、模块、数据模型、API 和风险。',
    };
  }

  if (command === 'generate-acceptance') {
    if (!session.requirement) {
      throw new Error('还没有正式需求文档，无法生成验收标准。请先接受一版需求提案。');
    }
    return {
      type: 'generate',
      summary: '生成验收标准和任务拆解',
      targets: ['acceptance', 'taskPlan'],
      requiredDocs: ['acceptance', 'taskPlan'],
      instruction: '基于当前需求文档生成验收标准和开发任务拆解，验收用例必须覆盖每个 P0/P1 功能。',
    };
  }

  if (command && command !== 'idea' && command !== 'fix') {
    return null;
  }

  if (!session.requirement) {
    return {
      type: 'idea',
      summary: '形成第一版需求草案',
      targets: ['constitution', 'requirement'],
      requiredDocs: ['constitution', 'requirement'],
      instruction: '把用户的模糊想法整理成第一版需求宪法和需求文档。文档要具体、可讨论、可继续追问。',
    };
  }

  const downstreamTargets: ImpactTarget[] = [];
  if (session.acceptance) downstreamTargets.push('acceptance');
  if (session.taskPlan) downstreamTargets.push('taskPlan');
  return {
    type: command === 'fix' ? 'fix' : 'idea',
    summary: command === 'fix' ? '按反馈修正需求资产' : '根据反馈更新需求资产',
    targets: ['requirement', ...downstreamTargets],
    requiredDocs: ['requirement', ...downstreamTargets],
    instruction: '根据用户反馈增量更新现有需求文档；如果已有验收标准或任务拆解，必须同步更新它们，保持上下游一致。',
  };
}

async function requestStructuredTurn(session: Session, message: string, command: string | undefined, plan: LLMPlan) {
  const completion = await getOpenAIClient().chat.completions.create({
    model: getModel(),
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: buildUserPrompt(session, message, command, plan),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`LLM 没有返回内容：${getProviderLabel()}`);
  }

  const json = parseJsonObject(content);
  const result = llmTurnSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`LLM 返回结构不合格：${issue.path.join('.') || 'root'} ${issue.message}`);
  }
  return result.data;
}

function buildUserPrompt(session: Session, message: string, command: string | undefined, plan: LLMPlan) {
  const promptState = {
    originalIdea: session.originalIdea,
    stage: session.stage,
    currentVersion: session.currentVersion,
    command: command || 'idea',
    userMessage: message,
    generationPlan: {
      proposalType: plan.type,
      expectedSummary: plan.summary,
      impactTargets: plan.targets,
      requiredDocuments: plan.requiredDocs,
      instruction: plan.instruction,
    },
    currentDocuments: {
      constitution: session.constitution,
      requirement: session.requirement,
      tech: session.tech,
      acceptance: session.acceptance,
      taskPlan: session.taskPlan,
      openQuestions: session.openQuestions,
      risks: session.risks,
      qualityReport: session.qualityReport,
    },
    recentMessages: session.messages.slice(-8).map((item) => ({
      role: item.role,
      content: item.content,
    })),
  };

  return [
    '请基于下面的 ReqFlow 会话状态生成一次受控变更提案。',
    '必须只返回 JSON 对象，不要 Markdown，不要解释 JSON 之外的内容。',
    '',
    `会话状态：${JSON.stringify(promptState)}`,
    '',
    '输出必须符合这个顶层结构：',
    JSON.stringify(OUTPUT_CONTRACT, null, 2),
    '',
    '关键要求：',
    '- proposedDocuments 必须包含 generationPlan.requiredDocuments 列出的全部文档。',
    '- 所有内容使用中文，避免空泛措辞，功能、边界、验收和任务都要能落地。',
    '- 更新已有需求时，不要无理由删除既有核心能力；如需要删减，写入 conflicts。',
    '- requirement.features 的 id 使用 F-001 这类格式，priority 只能是 P0/P1/P2。',
    '- acceptance.featureCases 必须引用 requirement.features 的 featureId。',
    '- tech.apis.method 只能是 GET/POST/PUT/PATCH/DELETE。',
    '- openQuestions 如有输出，必须是本轮仍需要用户回答的问题。',
  ].join('\n');
}

const SYSTEM_PROMPT = [
  '你是 ReqFlow 的真实 LLM 需求架构师。',
  '你的职责是把用户想法转成结构化需求资产，但不能直接应用正式变更。',
  '每次输出都必须是一份可由系统确认的变更提案。',
  '你要遵守受控自循环：先提案、用户接受后才变更；文档之间必须一致；冻结前要能被质量闸门检查。',
].join('\n');

const OUTPUT_CONTRACT = {
  message: '给用户看的简短说明，说明你生成了什么提案，以及为什么',
  proposal: {
    summary: '提案摘要',
    impactLevel: 'low | medium | high',
    reason: '生成这份提案的原因',
    proposedDocuments: {
      constitution: '当 requiredDocuments 包含 constitution 时，输出完整 RequirementConstitution 对象',
      requirement: '当 requiredDocuments 包含 requirement 时，输出完整 RequirementDoc 对象',
      tech: '当 requiredDocuments 包含 tech 时，输出完整 TechDoc 对象',
      acceptance: '当 requiredDocuments 包含 acceptance 时，输出完整 AcceptanceDoc 对象',
      taskPlan: '当 requiredDocuments 包含 taskPlan 时，输出完整 TaskPlanDoc 对象',
      openQuestions: [
        { id: 'Q-001', question: '待确认问题', impact: 'high', status: 'open' },
      ],
      risks: [
        { id: 'RSK-001', risk: '风险描述', impact: 'medium', mitigation: '缓解方式' },
      ],
    },
    conflicts: ['如没有冲突，返回空数组'],
  },
  suggestedQuestions: ['建议用户下一步回答的问题'],
};

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new Error('LLM 返回内容不是 JSON 对象');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeDocuments(input: z.infer<typeof proposedDocumentsSchema>): ChangeProposal['proposedDocuments'] {
  return {
    constitution: input.constitution,
    requirement: input.requirement,
    tech: input.tech,
    acceptance: input.acceptance,
    taskPlan: input.taskPlan,
    openQuestions: input.openQuestions?.map((item, index) => ({
      id: item.id?.trim() || `LLM-Q-${String(index + 1).padStart(3, '0')}`,
      question: item.question,
      impact: item.impact,
      status: item.status,
    })),
    risks: input.risks,
  };
}

function ensureRequiredDocs(plan: LLMPlan, docs: ChangeProposal['proposedDocuments']) {
  const missing = plan.requiredDocs.filter((target) => docs[target] === undefined);
  if (missing.length > 0) {
    throw new Error(`LLM 返回缺少必需文档：${missing.join('、')}`);
  }
}

function withControlHint(message: string, proposal: ChangeProposal) {
  if (/接受提案|确认提案|变更提案/.test(message)) return message;
  return `${message.trim()}\n\n${proposalMessage(proposal)}`;
}
