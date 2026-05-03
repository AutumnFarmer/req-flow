import { v4 as uuid } from 'uuid';
import { getSession as readSession, listSessions as readSessions, saveSession, saveSnapshot, getSnapshot } from './db.js';
import type {
  AcceptanceDoc,
  AssistantTurnResult,
  AuditAction,
  ChangeProposal,
  ChatMessage,
  DecisionRecord,
  ImpactTarget,
  OpenQuestion,
  PrototypeDoc,
  QualityReport,
  RequirementConstitution,
  RequirementDoc,
  RiskRecord,
  ReviewStatus,
  Session,
  SessionSummary,
  Stage,
  TaskPlanDoc,
  TechDoc,
  VersionSnapshot,
} from './types.js';

export * from './types.js';

const now = () => Date.now();

function shortTitle(idea: string) {
  const normalized = idea.trim().replace(/\s+/g, ' ');
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized || '未命名需求';
}

function initialConstitution(idea: string): RequirementConstitution {
  return {
    productName: shortTitle(idea),
    oneSentence: idea.trim(),
    targetUsers: ['待确认的核心用户'],
    coreValue: '帮助用户把模糊想法变成可执行方案',
    primaryScenario: '用户输入一个初始想法，系统通过追问和提案逐步收敛需求',
    successCriteria: ['形成可开发需求文档', '生成可测试验收标准', '能导出规格包'],
    nonGoals: ['不在澄清阶段直接生成生产代码', '不跳过用户确认直接改正式文档'],
    lockedDecisions: ['正式文档变更必须先生成提案并由用户确认'],
  };
}

function initialQuestions(): OpenQuestion[] {
  return [
    {
      id: uuid(),
      question: '这个产品第一批目标用户是谁？个人、团队内部，还是对外客户？',
      impact: 'high',
      status: 'open',
    },
    {
      id: uuid(),
      question: '用户完成的第一个核心任务是什么？',
      impact: 'high',
      status: 'open',
    },
    {
      id: uuid(),
      question: '第一版明确不做哪些能力？',
      impact: 'medium',
      status: 'open',
    },
  ];
}

export function createSession(idea: string, actor = 'system', workspaceId = 'default'): Session {
  const timestamp = now();
  const session: Session = {
    id: uuid(),
    workspaceId: workspaceId.trim() || 'default',
    title: shortTitle(idea),
    originalIdea: idea.trim(),
    stage: 'clarify',
    runtimeState: 'idle',
    currentVersion: 0,
    constitution: initialConstitution(idea),
    requirement: null,
    tech: null,
    acceptance: null,
    prototype: null,
    taskPlan: null,
    openQuestions: initialQuestions(),
    decisions: [],
    risks: [],
    pendingProposal: null,
    qualityReport: null,
    messages: [],
    snapshots: [],
    auditEvents: [],
    reviews: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  recordAuditEvent(session, 'session.created', '创建需求分析会话', {
    originalIdeaLength: session.originalIdea.length,
    workspaceId: session.workspaceId,
  }, actor);
  session.qualityReport = runQualityCheck(session);
  saveSession(session);
  createSnapshot(session, null, '创建会话');
  persist(session);
  return session;
}

export function getSession(id: string): Session | undefined {
  const session = readSession(id);
  return session ? ensureSessionDefaults(session) : undefined;
}

export function listSessionSummaries(workspaceId = 'default'): SessionSummary[] {
  return readSessions()
    .map((session) => ensureSessionDefaults(session))
    .filter((session) => session.workspaceId === workspaceId)
    .map((session) => ({
      id: session.id,
      workspaceId: session.workspaceId,
      title: session.title,
      originalIdea: session.originalIdea,
      stage: session.stage,
      runtimeState: session.runtimeState,
      currentVersion: session.currentVersion,
      qualityScore: session.qualityReport?.score ?? null,
      pendingProposal: Boolean(session.pendingProposal),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
}

export function persist(session: Session) {
  session.updatedAt = now();
  saveSession(session);
}

export function addMessage(session: Session, role: ChatMessage['role'], content: string) {
  session.messages.push({ role, content, timestamp: now() });
}

export function recordAuditEvent(
  session: Session,
  action: AuditAction,
  summary: string,
  metadata: Record<string, string | number | boolean | null> = {},
  actor = 'system',
) {
  ensureSessionDefaults(session);
  session.auditEvents.push({
    id: uuid(),
    action,
    actor: actor.trim() || 'system',
    summary,
    metadata,
    createdAt: now(),
  });
  if (session.auditEvents.length > 500) {
    session.auditEvents = session.auditEvents.slice(-500);
  }
}

function ensureSessionDefaults(session: Session): Session {
  session.workspaceId ||= 'default';
  session.auditEvents ||= [];
  session.reviews ||= [];
  return session;
}

function createSnapshot(session: Session, proposalId: string | null, summary: string) {
  const snapshot: VersionSnapshot = {
    version: session.currentVersion,
    proposalId,
    summary,
    constitution: session.constitution,
    requirement: session.requirement,
    tech: session.tech,
    acceptance: session.acceptance,
    prototype: session.prototype,
    taskPlan: session.taskPlan,
    qualityReport: session.qualityReport,
    createdAt: now(),
  };

  const existingIndex = session.snapshots.findIndex((item) => item.version === snapshot.version);
  if (existingIndex >= 0) {
    session.snapshots[existingIndex] = snapshot;
  } else {
    session.snapshots.push(snapshot);
  }
  saveSnapshot(session.id, snapshot);
}

function targetLabel(target: ImpactTarget) {
  const labels: Record<ImpactTarget, string> = {
    constitution: '需求宪法',
    requirement: '需求文档',
    tech: '技术方案',
    acceptance: '验收标准',
    prototype: '原型',
    taskPlan: '任务拆解',
  };
  return labels[target];
}

function buildRequirement(session: Session, userIntent: string): RequirementDoc {
  const idea = session.originalIdea;
  return {
    overview: {
      background: `用户提出的初始想法是：${idea}`,
      problem: '当前需求还停留在想法层，缺少明确用户、边界、流程和验收标准。',
      goal: '先形成第一版可讨论的需求草案，再通过提案机制逐步收敛。',
    },
    users: [
      {
        name: '核心使用者',
        description: session.constitution.targetUsers[0] || '待确认的第一批用户',
        painPoints: ['想法模糊，难以直接进入开发', '缺少统一文档和验收口径'],
      },
    ],
    scenarios: [
      {
        name: '从想法到规格草案',
        trigger: '用户输入一个还不完整的产品想法',
        userGoal: '快速得到一份可以审阅和继续修改的需求草案',
        mainFlow: ['输入想法', '回答澄清问题', '查看变更提案', '确认后生成文档快照'],
        exceptions: ['用户推翻方向时进入外环重新澄清', '存在阻断项时不能冻结'],
      },
    ],
    scope: {
      inScope: ['需求澄清', '文档生成', '变更提案', '质量检查', '版本快照'],
      outOfScope: ['多人实时协作', '直接生成生产代码', '复杂权限系统'],
    },
    features: [
      {
        id: 'F-001',
        priority: 'P0',
        name: '受控需求澄清',
        description: '通过追问、提案和确认机制把模糊需求逐步收敛。',
        userValue: '避免 AI 擅自改文档，也避免用户不知道下一步该回答什么。',
        relatedScenarios: ['从想法到规格草案'],
      },
      {
        id: 'F-002',
        priority: 'P0',
        name: '版本快照',
        description: '每次接受提案后保存完整版本快照。',
        userValue: '允许试错和回滚，降低需求迭代成本。',
        relatedScenarios: ['从想法到规格草案'],
      },
    ],
    businessRules: [
      {
        id: 'R-001',
        rule: '任何正式文档变更必须先生成变更提案。',
        reason: '防止 AI 在用户未确认的情况下改动核心需求。',
      },
      {
        id: 'R-002',
        rule: '冻结前必须通过质量检查。',
        reason: '避免带着阻断项进入开发。',
      },
    ],
    nonFunctional: {
      performance: ['本地会话读写应在普通项目规模下即时完成'],
      security: ['原型必须在 sandbox iframe 中渲染'],
      usability: ['每轮只暴露少量关键问题和清晰下一步'],
      compatibility: ['优先支持本地开发环境和现代浏览器'],
    },
    assumptions: ['第一版以单人本地工作流为主', '用户愿意通过确认提案控制需求变更'],
    openQuestions: session.openQuestions.filter((q) => q.status === 'open').map((q) => q.question),
  };
}

function buildTech(session: Session): TechDoc {
  return {
    architecture: {
      style: '前后端分离的本地优先 Web 应用',
      rationale: '保留现有 React + Express 技术栈，同时用 SQLite 承接 v1.0 的快照和提案闭环。',
      constraints: ['单人本地优先', 'AI 输出必须结构化校验', '正式变更必须可回滚'],
    },
    techStack: [
      { tech: 'React + TypeScript', reason: '承载工作台、提案抽屉和文档预览' },
      { tech: 'Express + TypeScript', reason: '提供会话、提案、快照和导出 API' },
      { tech: 'SQLite', reason: '用低成本方式持久化需求资产和版本快照' },
      { tech: 'Zod', reason: '校验 AI 结构化输出和内部提案对象' },
    ],
    modules: [
      {
        id: 'M-SESSION',
        name: '会话服务',
        responsibility: '维护会话、阶段、运行状态和当前文档',
        dependencies: ['SQLite'],
      },
      {
        id: 'M-PROPOSAL',
        name: '提案服务',
        responsibility: '生成、接受、拒绝变更提案',
        dependencies: ['会话服务'],
      },
      {
        id: 'M-QUALITY',
        name: '质量闸门',
        responsibility: '检查完整性、一致性、可测试性和冻结条件',
        dependencies: ['会话服务'],
      },
    ],
    dataModels: [
      {
        name: 'Session',
        fields: [
          { name: 'id', type: 'string', required: true, description: '会话 ID' },
          { name: 'stage', type: 'Stage', required: true, description: '顶层阶段' },
          { name: 'currentVersion', type: 'number', required: true, description: '当前快照版本' },
        ],
      },
      {
        name: 'ChangeProposal',
        fields: [
          { name: 'id', type: 'string', required: true, description: '提案 ID' },
          { name: 'impactTargets', type: 'ImpactTarget[]', required: true, description: '影响范围' },
          { name: 'proposedDocuments', type: 'object', required: true, description: '待应用的文档变化' },
        ],
      },
    ],
    apis: [
      { method: 'POST', path: '/api/session', description: '创建会话' },
      { method: 'POST', path: '/api/chat/:id/stream', description: '发送消息并生成提案或质量报告' },
      { method: 'POST', path: '/api/session/:id/proposals/:proposalId/accept', description: '接受提案' },
      { method: 'POST', path: '/api/session/:id/quality', description: '运行质量检查' },
    ],
    risks: session.risks,
  };
}

function buildAcceptance(requirement: RequirementDoc): AcceptanceDoc {
  return {
    featureCases: requirement.features.map((feature) => ({
      featureId: feature.id,
      cases: [
        {
          id: `${feature.id}-C1`,
          scenario: feature.name,
          given: '当前会话已创建且用户处于工作台',
          when: `用户围绕“${feature.name}”进行操作`,
          then: '系统给出明确结果，并保持文档、质量状态和版本记录一致',
          boundary: '如果存在阻断项，系统不能静默进入下一阶段',
          priority: feature.priority === 'P0' ? 'must' : 'should',
        },
      ],
    })),
    releaseChecklist: [
      'P0 功能都有验收用例',
      '冻结前没有阻断项',
      '接受提案后会生成快照',
      '导出的规格包包含需求、技术、验收和版本摘要',
    ],
  };
}

function buildTaskPlan(requirement: RequirementDoc): TaskPlanDoc {
  return {
    tasks: requirement.features.map((feature, index) => ({
      id: `T-${String(index + 1).padStart(3, '0')}`,
      title: feature.name,
      description: feature.description,
      dependsOn: index === 0 ? [] : ['T-001'],
      acceptanceRefs: [`${feature.id}-C1`],
    })),
  };
}

export function makeProposal(
  session: Session,
  type: ChangeProposal['type'],
  summary: string,
  userIntent: string,
  targets: ImpactTarget[],
  proposedDocuments: ChangeProposal['proposedDocuments'],
  impactLevel: ChangeProposal['impactLevel'] = 'medium',
  conflicts: string[] = [],
): ChangeProposal {
  return {
    id: uuid(),
    type,
    summary,
    userIntent,
    impactTargets: targets,
    impactLevel,
    reason: '根据当前阶段、用户反馈和 v1.0 受控自循环规则生成。',
    proposedChanges: targets.map((target) => ({
      target,
      before: `当前${targetLabel(target)}状态`,
      after: `应用本次提案后的${targetLabel(target)}状态`,
      reason: '保持需求、验收、技术和原型之间的一致性。',
    })),
    proposedDocuments,
    conflicts,
    requiresConfirmation: true,
    createdAt: now(),
  };
}

export function proposalMessage(proposal: ChangeProposal) {
  const targets = proposal.impactTargets.map(targetLabel).join('、');
  return [
    `我先不直接改正式文档，已经生成一份变更提案：${proposal.summary}`,
    '',
    `影响范围：${targets}`,
    `影响级别：${proposal.impactLevel}`,
    proposal.conflicts.length ? `冲突提示：${proposal.conflicts.join('；')}` : '',
    '',
    '你可以点击右侧提案的“接受提案”，或继续补充修改要求。',
  ].filter(Boolean).join('\n');
}

export function handleAssistantTurn(session: Session, message: string, command?: string): AssistantTurnResult {
  if (command === 'review' || command === 'quality') {
    const report = runQualityCheck(session);
    session.qualityReport = report;
    session.runtimeState = report.blockers.length > 0 ? 'blocked' : 'idle';
    persist(session);
    return {
      message: formatQualityReport(report),
      suggestedQuestions: session.openQuestions.filter((q) => q.status === 'open').map((q) => q.question),
      proposal: null,
      qualityReport: report,
      recommendedAction: report.blockers.length > 0 ? 'answer_questions' : 'run_quality_check',
    };
  }

  if (command === 'freeze') {
    const report = runQualityCheck(session, 'frozen');
    session.qualityReport = report;
    if (report.blockers.length > 0 || report.score < 90) {
      session.runtimeState = 'blocked';
      persist(session);
      return {
        message: `冻结体检未通过，暂时不能冻结。\n\n${formatQualityReport(report)}`,
        suggestedQuestions: report.nextActions,
        proposal: null,
        qualityReport: report,
        recommendedAction: 'run_quality_check',
      };
    }

    const proposal = makeProposal(session, 'freeze', '冻结当前规格包', message, ['taskPlan'], {
      taskPlan: session.taskPlan || (session.requirement ? buildTaskPlan(session.requirement) : null),
    }, 'high');
    session.pendingProposal = proposal;
    session.runtimeState = 'proposal_pending';
    persist(session);
    return {
      message: proposalMessage(proposal),
      suggestedQuestions: [],
      proposal,
      qualityReport: report,
      recommendedAction: 'accept_proposal',
    };
  }

  if (command === 'generate-tech') {
    const proposal = makeProposal(session, 'generate', '生成技术方案', message, ['tech'], {
      tech: buildTech(session),
    });
    session.pendingProposal = proposal;
    session.runtimeState = 'proposal_pending';
    persist(session);
    return {
      message: proposalMessage(proposal),
      suggestedQuestions: [],
      proposal,
      qualityReport: null,
      recommendedAction: 'accept_proposal',
    };
  }

  if (command === 'generate-acceptance') {
    if (!session.requirement) {
      return {
        message: '还没有需求文档，先接受一版需求提案后再生成验收标准。',
        suggestedQuestions: session.openQuestions.map((q) => q.question),
        proposal: null,
        qualityReport: session.qualityReport,
        recommendedAction: 'answer_questions',
      };
    }
    const proposal = makeProposal(session, 'generate', '生成验收标准和任务拆解', message, ['acceptance', 'taskPlan'], {
      acceptance: buildAcceptance(session.requirement),
      taskPlan: buildTaskPlan(session.requirement),
    });
    session.pendingProposal = proposal;
    session.runtimeState = 'proposal_pending';
    persist(session);
    return {
      message: proposalMessage(proposal),
      suggestedQuestions: [],
      proposal,
      qualityReport: null,
      recommendedAction: 'accept_proposal',
    };
  }

  if (command === 'reset') {
    const proposal = makeProposal(session, 'reset', '重新澄清当前方向', message, ['constitution', 'requirement', 'tech', 'acceptance', 'prototype', 'taskPlan'], {
      constitution: initialConstitution(session.originalIdea),
      requirement: null,
      tech: null,
      acceptance: null,
      prototype: null,
      taskPlan: null,
      openQuestions: initialQuestions(),
      risks: [],
      decisions: [],
    }, 'high', ['这会清空当前正式文档，但历史快照会保留']);
    session.pendingProposal = proposal;
    session.runtimeState = 'proposal_pending';
    persist(session);
    return {
      message: proposalMessage(proposal),
      suggestedQuestions: proposal.proposedDocuments.openQuestions?.map((q) => q.question) || [],
      proposal,
      qualityReport: null,
      recommendedAction: 'accept_proposal',
    };
  }

  const isFirstDraft = !session.requirement;
  const targets: ImpactTarget[] = isFirstDraft
    ? ['constitution', 'requirement']
    : ['requirement', 'acceptance', 'prototype'];

  const nextRequirement = buildRequirement(session, message);
  if (!isFirstDraft && session.requirement) {
    nextRequirement.overview = session.requirement.overview;
    nextRequirement.users = session.requirement.users;
    nextRequirement.scenarios = session.requirement.scenarios;
    nextRequirement.scope = session.requirement.scope;
    nextRequirement.features = [
      ...session.requirement.features,
      {
        id: `F-${String(session.requirement.features.length + 1).padStart(3, '0')}`,
        priority: 'P1',
        name: '用户反馈调整',
        description: message,
        userValue: '把本轮反馈纳入正式需求，并同步影响验收和原型。',
        relatedScenarios: session.requirement.scenarios.map((item) => item.name),
      },
    ];
    nextRequirement.businessRules = session.requirement.businessRules;
    nextRequirement.nonFunctional = session.requirement.nonFunctional;
    nextRequirement.assumptions = [...session.requirement.assumptions, `本轮反馈：${message}`];
    nextRequirement.openQuestions = session.requirement.openQuestions;
  }

  const constitution = isFirstDraft
    ? {
        ...session.constitution,
        oneSentence: session.originalIdea,
        lockedDecisions: [...new Set([...session.constitution.lockedDecisions, '用户确认提案后才应用正式变更'])],
      }
    : session.constitution;

  const proposal = makeProposal(
    session,
    isFirstDraft ? 'idea' : command === 'fix' ? 'fix' : 'idea',
    isFirstDraft ? '形成第一版需求草案' : '根据反馈更新需求资产',
    message,
    targets,
    {
      constitution,
      requirement: nextRequirement,
      acceptance: isFirstDraft ? null : buildAcceptance(nextRequirement),
      taskPlan: isFirstDraft ? null : buildTaskPlan(nextRequirement),
    },
    isFirstDraft ? 'medium' : 'low',
  );

  session.pendingProposal = proposal;
  session.runtimeState = 'proposal_pending';
  persist(session);

  return {
    message: proposalMessage(proposal),
    suggestedQuestions: session.openQuestions.filter((q) => q.status === 'open').map((q) => q.question),
    proposal,
    qualityReport: null,
    recommendedAction: 'accept_proposal',
  };
}

export function acceptProposal(session: Session, proposalId: string, actor = 'system'): Session {
  const proposal = session.pendingProposal;
  if (!proposal || proposal.id !== proposalId) {
    throw new Error('没有可接受的当前提案');
  }

  session.runtimeState = 'applying';
  const docs = proposal.proposedDocuments;
  if (docs.constitution !== undefined) session.constitution = docs.constitution;
  if (docs.requirement !== undefined) session.requirement = docs.requirement;
  if (docs.tech !== undefined) session.tech = docs.tech;
  if (docs.acceptance !== undefined) session.acceptance = docs.acceptance;
  if (docs.prototype !== undefined) session.prototype = docs.prototype;
  if (docs.taskPlan !== undefined) session.taskPlan = docs.taskPlan;
  if (docs.openQuestions !== undefined) session.openQuestions = docs.openQuestions;
  if (docs.openQuestions === undefined && docs.requirement !== undefined) {
    session.openQuestions = syncOpenQuestionsFromRequirement(docs.requirement, session.openQuestions);
  }
  if (docs.risks !== undefined) session.risks = docs.risks;
  if (docs.decisions !== undefined) session.decisions = docs.decisions;

  const decision: DecisionRecord = {
    id: uuid(),
    decision: proposal.summary,
    reason: proposal.reason,
    createdAt: now(),
  };
  session.decisions = [...session.decisions, decision];

  if (proposal.type === 'reset') {
    session.stage = 'clarify';
  } else if (proposal.type === 'freeze') {
    session.stage = 'frozen';
  } else if (session.stage === 'clarify' && session.requirement) {
    session.stage = 'draft';
  } else if (session.stage === 'draft' && session.acceptance) {
    session.stage = 'review';
  }

  session.pendingProposal = null;
  session.currentVersion += 1;
  session.qualityReport = runQualityCheck(session);
  session.runtimeState = session.qualityReport.blockers.length > 0 ? 'blocked' : 'idle';
  addMessage(session, 'assistant', `已接受提案：${proposal.summary}。我保存了 v${session.currentVersion} 快照。`);
  createSnapshot(session, proposal.id, proposal.summary);
  recordAuditEvent(session, 'proposal.accepted', `接受提案：${proposal.summary}`, {
    proposalId: proposal.id,
    proposalType: proposal.type,
    impactLevel: proposal.impactLevel,
    currentVersion: session.currentVersion,
    targetCount: proposal.impactTargets.length,
  }, actor);
  persist(session);
  return session;
}

export function rejectProposal(session: Session, proposalId: string, actor = 'system'): Session {
  if (!session.pendingProposal || session.pendingProposal.id !== proposalId) {
    throw new Error('没有可拒绝的当前提案');
  }
  const summary = session.pendingProposal.summary;
  session.pendingProposal = null;
  session.runtimeState = 'idle';
  addMessage(session, 'assistant', `已拒绝提案：${summary}。正式文档没有变化。`);
  recordAuditEvent(session, 'proposal.rejected', `拒绝提案：${summary}`, {
    proposalId,
  }, actor);
  persist(session);
  return session;
}

export function submitReview(
  session: Session,
  status: ReviewStatus,
  comment: string,
  role = 'reviewer',
  actor = 'system',
): Session {
  ensureSessionDefaults(session);
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('无效的评审状态');
  }
  if (!session.requirement) {
    throw new Error('还没有正式需求文档，无法提交评审');
  }

  const review = {
    id: uuid(),
    version: session.currentVersion,
    status,
    actor: actor.trim() || 'system',
    role: role.trim() || 'reviewer',
    comment: comment.trim(),
    createdAt: now(),
  };
  session.reviews.push(review);
  if (session.reviews.length > 200) {
    session.reviews = session.reviews.slice(-200);
  }
  session.qualityReport = runQualityCheck(session);
  session.runtimeState = session.qualityReport.blockers.length > 0 ? 'blocked' : 'idle';
  recordAuditEvent(session, 'review.submitted', `提交评审：${status === 'approved' ? '通过' : '打回'}`, {
    reviewId: review.id,
    version: review.version,
    status: review.status,
    role: review.role,
  }, actor);
  persist(session);
  return session;
}

export function rollbackToSnapshot(session: Session, version: number, actor = 'system'): Session {
  const snapshot = getSnapshot(session.id, version) || session.snapshots.find((item) => item.version === version);
  if (!snapshot) {
    throw new Error('目标版本不存在');
  }

  session.constitution = snapshot.constitution;
  session.requirement = snapshot.requirement;
  session.tech = snapshot.tech;
  session.acceptance = snapshot.acceptance;
  session.prototype = snapshot.prototype;
  session.taskPlan = snapshot.taskPlan;
  session.pendingProposal = null;
  session.currentVersion += 1;
  session.stage = snapshot.requirement ? 'draft' : 'clarify';
  if (snapshot.acceptance || snapshot.prototype) session.stage = 'review';
  session.qualityReport = runQualityCheck(session);
  session.runtimeState = session.qualityReport.blockers.length > 0 ? 'blocked' : 'idle';
  addMessage(session, 'assistant', `已从 v${version} 回滚，并保存为新的 v${session.currentVersion}。`);
  createSnapshot(session, null, `回滚到 v${version}`);
  recordAuditEvent(session, 'snapshot.rolled_back', `回滚到 v${version}`, {
    sourceVersion: version,
    currentVersion: session.currentVersion,
  }, actor);
  persist(session);
  return session;
}

export function runQualityCheck(session: Session, targetStage: Stage = session.stage): QualityReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const passedChecks: string[] = [];
  const nextActions: string[] = [];
  const addUnique = (target: string[], item: string) => {
    if (!target.includes(item)) target.push(item);
  };

  if (!session.constitution.oneSentence.trim()) {
    blockers.push('需求宪法缺少一句话定义');
  } else {
    passedChecks.push('需求宪法已有一句话定义');
  }
  if (session.constitution.nonGoals.length < 3) {
    warnings.push('需求宪法不做项少于 3 条，企业交付时范围边界偏弱');
  } else {
    passedChecks.push('需求宪法已有明确范围边界');
  }
  if (targetStage === 'frozen' && hasPlaceholderText([
    session.constitution.oneSentence,
    session.constitution.coreValue,
    session.constitution.primaryScenario,
    ...session.constitution.targetUsers,
  ])) {
    blockers.push('冻结前需求宪法仍包含待确认占位内容');
  }

  const highOpenQuestions = session.openQuestions.filter((q) => q.status === 'open' && q.impact === 'high');
  if (highOpenQuestions.length > 0) {
    const message = `仍有 ${highOpenQuestions.length} 个高影响待确认问题`;
    if (targetStage === 'review' || targetStage === 'frozen') {
      blockers.push(message);
      addUnique(nextActions, '先关闭高影响待确认问题');
    } else {
      warnings.push(message);
    }
  } else {
    passedChecks.push('没有高影响待确认问题');
  }

  if (!session.requirement) {
    blockers.push('还没有正式需求文档');
    nextActions.push('先接受一版需求草案提案');
  } else {
    passedChecks.push('已有正式需求文档');
    if (session.requirement.features.filter((f) => f.priority === 'P0').length === 0) {
      blockers.push('需求文档缺少 P0 功能');
    } else {
      passedChecks.push('需求文档包含 P0 功能');
    }
    if (session.requirement.scope.outOfScope.length === 0) {
      warnings.push('缺少明确不做项，范围可能扩张');
    }
    if (session.requirement.openQuestions.length > 0) {
      warnings.push(`仍有 ${session.requirement.openQuestions.length} 个待确认问题`);
    }
    const featureIds = session.requirement.features.map((feature) => feature.id);
    const duplicatedFeatureIds = findDuplicates(featureIds);
    if (duplicatedFeatureIds.length > 0) {
      blockers.push(`需求文档存在重复功能 ID：${duplicatedFeatureIds.join('、')}`);
    } else {
      passedChecks.push('功能 ID 唯一');
    }
    const scenarioNames = new Set(session.requirement.scenarios.map((scenario) => scenario.name));
    const orphanFeatureRefs = session.requirement.features.flatMap((feature) =>
      feature.relatedScenarios
        .filter((scenario) => !scenarioNames.has(scenario))
        .map((scenario) => `${feature.id} -> ${scenario}`),
    );
    if (orphanFeatureRefs.length > 0) {
      warnings.push(`功能关联了不存在的场景：${orphanFeatureRefs.join('；')}`);
    } else {
      passedChecks.push('功能与场景引用一致');
    }
  }

  if (targetStage === 'review' || targetStage === 'frozen') {
    if (!session.acceptance) {
      blockers.push('进入审阅/冻结前需要验收标准');
      nextActions.push('执行 /generate-acceptance 生成验收标准提案');
    } else {
      passedChecks.push('已有验收标准');
    }
    if (!session.tech) {
      if (targetStage === 'frozen') {
        blockers.push('冻结前需要技术方案');
      } else {
        warnings.push('还没有技术方案，开发交接风险较高');
      }
      addUnique(nextActions, '执行 /generate-tech 生成技术方案提案');
    } else {
      passedChecks.push('已有技术方案');
    }
  }

  if (targetStage === 'frozen') {
    if (!session.prototype) {
      warnings.push('没有原型，需求确认可能不直观');
    } else {
      passedChecks.push('已有原型');
    }
    if (!session.taskPlan) {
      blockers.push('冻结前需要任务拆解');
    } else {
      passedChecks.push('已有任务拆解');
    }

    const currentReviews = currentVersionReviews(session);
    const rejectedReviews = currentReviews.filter((review) => review.status === 'rejected');
    const approvedReviews = currentReviews.filter((review) => review.status === 'approved');
    if (rejectedReviews.length > 0) {
      blockers.push(`当前版本有 ${rejectedReviews.length} 条评审打回记录`);
      addUnique(nextActions, '先处理评审打回意见并重新提交评审');
    } else if (approvedReviews.length === 0) {
      blockers.push('冻结前至少需要一条当前版本评审通过记录');
      addUnique(nextActions, '请业务或产品负责人提交当前版本评审通过');
    } else {
      passedChecks.push('当前版本已有评审通过记录');
    }
  }

  if (session.requirement && session.acceptance) {
    validateAcceptanceConsistency(session.requirement, session.acceptance, targetStage, blockers, warnings, passedChecks, nextActions);
  }
  if (session.taskPlan) {
    validateTaskPlanConsistency(session.taskPlan, session.acceptance, blockers, warnings, passedChecks);
  }
  if (session.tech) {
    validateTechConsistency(session.tech, targetStage, blockers, warnings, passedChecks);
  }

  const score = Math.max(0, Math.min(100, 100 - blockers.length * 25 - warnings.length * 8));
  if (nextActions.length === 0) {
    if (blockers.length > 0) {
      nextActions.push('先处理阻断项');
    } else if (targetStage === 'frozen') {
      nextActions.push('规格包已冻结，可以导出或创建新版本继续迭代');
    } else {
      nextActions.push('可以继续生成技术方案、验收标准或发起冻结');
    }
  }

  return {
    score,
    stage: targetStage,
    blockers,
    warnings,
    passedChecks,
    nextActions,
  };
}

function currentVersionReviews(session: Session) {
  ensureSessionDefaults(session);
  return session.reviews.filter((review) => review.version === session.currentVersion);
}

function syncOpenQuestionsFromRequirement(requirement: RequirementDoc | null, currentQuestions: OpenQuestion[]) {
  if (!requirement) return currentQuestions;
  return requirement.openQuestions.map((question, index) => {
    const existing = currentQuestions.find((item) => item.question === question);
    return {
      id: existing?.id || `REQ-Q-${String(index + 1).padStart(3, '0')}`,
      question,
      impact: existing?.impact || 'medium',
      status: existing?.status || 'open',
    };
  });
}

function formatQualityReport(report: QualityReport) {
  const lines = [`质量检查完成，当前得分 ${report.score}/100。`];
  if (report.blockers.length) {
    lines.push('', '阻断项：', ...report.blockers.map((item) => `- ${item}`));
  }
  if (report.warnings.length) {
    lines.push('', '提醒：', ...report.warnings.map((item) => `- ${item}`));
  }
  lines.push('', '下一步：', ...report.nextActions.map((item) => `- ${item}`));
  return lines.join('\n');
}

function hasPlaceholderText(values: string[]) {
  return values.some((value) => /待确认|TBD|TODO|未定|占位/.test(value));
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicated.add(value);
    } else {
      seen.add(value);
    }
  });
  return [...duplicated];
}

function validateAcceptanceConsistency(
  requirement: RequirementDoc,
  acceptance: AcceptanceDoc,
  targetStage: Stage,
  blockers: string[],
  warnings: string[],
  passedChecks: string[],
  nextActions: string[],
) {
  const featureIds = new Set(requirement.features.map((feature) => feature.id));
  const acceptanceFeatureIds = new Set(acceptance.featureCases.map((group) => group.featureId));
  const unknownFeatureIds = [...acceptanceFeatureIds].filter((featureId) => !featureIds.has(featureId));
  if (unknownFeatureIds.length > 0) {
    blockers.push(`验收标准引用了不存在的功能 ID：${unknownFeatureIds.join('、')}`);
  }

  const requiredPriorities = targetStage === 'frozen' ? new Set(['P0', 'P1']) : new Set(['P0']);
  const missingCoverage = requirement.features
    .filter((feature) => requiredPriorities.has(feature.priority))
    .filter((feature) => {
      const group = acceptance.featureCases.find((item) => item.featureId === feature.id);
      return !group || group.cases.length === 0;
    })
    .map((feature) => `${feature.id} ${feature.name}`);

  if (missingCoverage.length > 0) {
    const message = `验收标准未覆盖关键功能：${missingCoverage.join('、')}`;
    if (targetStage === 'review' || targetStage === 'frozen') {
      blockers.push(message);
      nextActions.push('补齐 P0/P1 功能的验收用例');
    } else {
      warnings.push(message);
    }
  } else {
    passedChecks.push('关键功能已有验收覆盖');
  }

  const caseIds = acceptance.featureCases.flatMap((group) => group.cases.map((item) => item.id));
  const duplicateCaseIds = findDuplicates(caseIds);
  if (duplicateCaseIds.length > 0) {
    blockers.push(`验收用例 ID 重复：${duplicateCaseIds.join('、')}`);
  } else {
    passedChecks.push('验收用例 ID 唯一');
  }
}

function validateTaskPlanConsistency(
  taskPlan: TaskPlanDoc,
  acceptance: AcceptanceDoc | null,
  blockers: string[],
  warnings: string[],
  passedChecks: string[],
) {
  const taskIds = taskPlan.tasks.map((task) => task.id);
  const taskIdSet = new Set(taskIds);
  const duplicateTaskIds = findDuplicates(taskIds);
  if (duplicateTaskIds.length > 0) {
    blockers.push(`任务 ID 重复：${duplicateTaskIds.join('、')}`);
  } else {
    passedChecks.push('任务 ID 唯一');
  }

  const missingDependencies = taskPlan.tasks.flatMap((task) =>
    task.dependsOn
      .filter((dependency) => !taskIdSet.has(dependency))
      .map((dependency) => `${task.id} -> ${dependency}`),
  );
  if (missingDependencies.length > 0) {
    blockers.push(`任务依赖不存在：${missingDependencies.join('；')}`);
  } else {
    passedChecks.push('任务依赖引用一致');
  }

  if (!acceptance) {
    warnings.push('已有任务拆解但没有验收标准，任务无法追溯到可测试结果');
    return;
  }

  const acceptanceCaseIds = new Set(acceptance.featureCases.flatMap((group) => group.cases.map((item) => item.id)));
  const missingAcceptanceRefs = taskPlan.tasks.flatMap((task) =>
    task.acceptanceRefs
      .filter((acceptanceRef) => !acceptanceCaseIds.has(acceptanceRef))
      .map((acceptanceRef) => `${task.id} -> ${acceptanceRef}`),
  );
  if (missingAcceptanceRefs.length > 0) {
    blockers.push(`任务引用了不存在的验收用例：${missingAcceptanceRefs.join('；')}`);
  } else {
    passedChecks.push('任务可追溯到验收用例');
  }
}

function validateTechConsistency(
  tech: TechDoc,
  targetStage: Stage,
  blockers: string[],
  warnings: string[],
  passedChecks: string[],
) {
  const apiPaths = tech.apis.map((api) => api.path);
  const duplicateApiPaths = findDuplicates(apiPaths);
  if (duplicateApiPaths.length > 0) {
    warnings.push(`技术方案存在重复 API 路径：${duplicateApiPaths.join('、')}`);
  } else {
    passedChecks.push('API 路径没有重复');
  }

  const invalidApiPaths = tech.apis.filter((api) => !api.path.startsWith('/')).map((api) => api.path);
  if (invalidApiPaths.length > 0) {
    blockers.push(`API 路径必须以 / 开头：${invalidApiPaths.join('、')}`);
  }

  const highRisks = tech.risks.filter((risk) => risk.impact === 'high');
  if (targetStage === 'frozen' && highRisks.length > 0) {
    warnings.push(`技术方案仍有 ${highRisks.length} 个高影响风险，需要在交付时显式跟踪`);
  }
}

export function generatePrototype(session: Session, actor = 'system'): PrototypeDoc {
  const title = session.constitution.productName || session.title;
  const features = session.requirement?.features || [];
  const pages = ['工作台', '需求文档', '质量检查'];
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <title>${escapeHtml(title)} 原型</title>
</head>
<body class="bg-slate-950 text-slate-100">
  <main class="min-h-screen p-6">
    <header class="mb-6">
      <p class="text-emerald-300 text-sm">ReqFlow Prototype</p>
      <h1 class="text-3xl font-bold mt-2">${escapeHtml(title)}</h1>
      <p class="text-slate-400 mt-2">${escapeHtml(session.constitution.oneSentence)}</p>
    </header>
    <section class="grid gap-4 md:grid-cols-3">
      <article class="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 class="font-semibold">需求宪法</h2>
        <p class="text-sm text-slate-400 mt-2">${escapeHtml(session.constitution.coreValue)}</p>
      </article>
      <article class="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 class="font-semibold">质量得分</h2>
        <p class="text-4xl font-bold text-emerald-300 mt-2">${session.qualityReport?.score ?? 0}</p>
      </article>
      <article class="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 class="font-semibold">当前版本</h2>
        <p class="text-4xl font-bold text-sky-300 mt-2">v${session.currentVersion}</p>
      </article>
    </section>
    <section class="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 class="font-semibold mb-3">核心功能</h2>
      <div class="space-y-3">
        ${features.map((feature) => `
        <div class="rounded-md bg-slate-800 p-3">
          <div class="text-sm text-emerald-300">${escapeHtml(feature.priority)}</div>
          <div class="font-medium">${escapeHtml(feature.name)}</div>
          <p class="text-sm text-slate-400">${escapeHtml(feature.description)}</p>
        </div>`).join('')}
      </div>
    </section>
  </main>
</body>
</html>`;

  session.prototype = { html, pages, sourceVersion: session.currentVersion };
  session.currentVersion += 1;
  session.qualityReport = runQualityCheck(session);
  createSnapshot(session, null, '生成原型');
  recordAuditEvent(session, 'prototype.generated', '生成原型预览', {
    currentVersion: session.currentVersion,
    pageCount: pages.length,
  }, actor);
  persist(session);
  return session.prototype;
}

export function exportMarkdown(session: Session): string {
  const lines = [
    `# ${session.constitution.productName || session.title} 规格包`,
    '',
    `工作区：${session.workspaceId || 'default'}`,
    `版本：v${session.currentVersion}`,
    `阶段：${session.stage}`,
    `更新时间：${new Date(session.updatedAt).toISOString()}`,
    '',
    '## 需求宪法',
    '',
    `- 一句话：${session.constitution.oneSentence}`,
    `- 目标用户：${session.constitution.targetUsers.join('、') || '暂无'}`,
    `- 核心价值：${session.constitution.coreValue}`,
    `- 核心场景：${session.constitution.primaryScenario}`,
    '',
    '### 成功标准',
    '',
    ...formatList(session.constitution.successCriteria),
    '',
    '### 不做项',
    '',
    ...formatList(session.constitution.nonGoals),
    '',
    '### 锁定决策',
    '',
    ...formatList(session.constitution.lockedDecisions),
    '',
    '## 需求文档',
    '',
    ...(session.requirement ? formatRequirement(session.requirement) : ['暂无正式需求文档']),
    '',
    '## 技术方案',
    '',
    ...(session.tech ? formatTech(session.tech) : ['暂无技术方案']),
    '',
    '## 验收标准',
    '',
    ...(session.acceptance ? formatAcceptance(session.acceptance) : ['暂无验收标准']),
    '',
    '## 任务拆解',
    '',
    ...(session.taskPlan ? formatTaskPlan(session.taskPlan) : ['暂无任务拆解']),
    '',
    '## 风险记录',
    '',
    ...formatRisks([...session.risks, ...(session.tech?.risks || [])]),
    '',
    '## 决策记录',
    '',
    ...(session.decisions.length
      ? session.decisions.map((item) => `- ${item.decision}：${item.reason}（${new Date(item.createdAt).toISOString()}）`)
      : ['暂无决策记录']),
    '',
    '## 待确认问题',
    '',
    ...(session.openQuestions.length
      ? session.openQuestions.map((item) => `- [${item.status}] [${item.impact}] ${item.question}`)
      : ['暂无待确认问题']),
    '',
    '## 评审签核',
    '',
    ...(session.reviews.length
      ? session.reviews.map((item) => `- v${item.version} [${item.status}] ${item.actor}（${item.role}）：${item.comment || '无备注'}（${new Date(item.createdAt).toISOString()}）`)
      : ['暂无评审记录']),
    '',
    '## 审计日志',
    '',
    ...(session.auditEvents.length
      ? session.auditEvents.map((item) => `- ${new Date(item.createdAt).toISOString()} [${item.actor}] ${item.action}：${item.summary}`)
      : ['暂无审计日志']),
    '',
    '## 版本快照',
    '',
    ...(session.snapshots.length
      ? session.snapshots.map((item) => `- v${item.version}：${item.summary}（${new Date(item.createdAt).toISOString()}）`)
      : ['暂无版本快照']),
    '',
    '## 质量报告',
    '',
    ...(session.qualityReport ? formatQualityMarkdown(session.qualityReport) : ['暂无质量报告']),
  ];
  return lines.join('\n');
}

function formatRequirement(requirement: RequirementDoc) {
  return [
    '### 概览',
    '',
    `- 背景：${requirement.overview.background}`,
    `- 问题：${requirement.overview.problem}`,
    `- 目标：${requirement.overview.goal}`,
    '',
    '### 用户',
    '',
    ...requirement.users.flatMap((user) => [
      `- ${user.name}：${user.description}`,
      ...user.painPoints.map((painPoint) => `  - 痛点：${painPoint}`),
    ]),
    '',
    '### 场景',
    '',
    ...requirement.scenarios.flatMap((scenario) => [
      `- ${scenario.name}`,
      `  - 触发：${scenario.trigger}`,
      `  - 目标：${scenario.userGoal}`,
      `  - 主流程：${scenario.mainFlow.join(' -> ') || '暂无'}`,
      `  - 异常：${scenario.exceptions.join('；') || '暂无'}`,
    ]),
    '',
    '### 范围',
    '',
    '- 本版包含：',
    ...formatList(requirement.scope.inScope, 2),
    '- 本版不做：',
    ...formatList(requirement.scope.outOfScope, 2),
    '',
    '### 功能',
    '',
    ...requirement.features.map((feature) => `- [${feature.priority}] ${feature.id} ${feature.name}：${feature.description}；用户价值：${feature.userValue}`),
    '',
    '### 业务规则',
    '',
    ...requirement.businessRules.map((rule) => `- ${rule.id}：${rule.rule}；原因：${rule.reason}`),
    '',
    '### 非功能需求',
    '',
    '- 性能：',
    ...formatList(requirement.nonFunctional.performance, 2),
    '- 安全：',
    ...formatList(requirement.nonFunctional.security, 2),
    '- 易用性：',
    ...formatList(requirement.nonFunctional.usability, 2),
    '- 兼容性：',
    ...formatList(requirement.nonFunctional.compatibility, 2),
    '',
    '### 假设',
    '',
    ...formatList(requirement.assumptions),
    '',
    '### 需求内待确认问题',
    '',
    ...formatList(requirement.openQuestions),
  ];
}

function formatTech(tech: TechDoc) {
  return [
    '### 架构',
    '',
    `- 风格：${tech.architecture.style}`,
    `- 理由：${tech.architecture.rationale}`,
    '- 约束：',
    ...formatList(tech.architecture.constraints, 2),
    '',
    '### 技术栈',
    '',
    ...tech.techStack.map((item) => `- ${item.tech}：${item.reason}${item.risk ? `；风险：${item.risk}` : ''}`),
    '',
    '### 模块',
    '',
    ...tech.modules.map((module) => `- ${module.id} ${module.name}：${module.responsibility}；依赖：${module.dependencies.join('、') || '无'}`),
    '',
    '### 数据模型',
    '',
    ...tech.dataModels.flatMap((model) => [
      `- ${model.name}`,
      ...model.fields.map((field) => `  - ${field.name}: ${field.type}${field.required ? ' required' : ''}，${field.description}`),
    ]),
    '',
    '### API',
    '',
    ...tech.apis.map((api) => `- ${api.method} ${api.path}：${api.description}${api.request ? `；请求：${api.request}` : ''}${api.response ? `；响应：${api.response}` : ''}`),
  ];
}

function formatAcceptance(acceptance: AcceptanceDoc) {
  return [
    '### 功能验收',
    '',
    ...acceptance.featureCases.flatMap((group) => [
      `- ${group.featureId}`,
      ...group.cases.map((item) => `  - ${item.id} [${item.priority}] ${item.scenario}: Given ${item.given}; When ${item.when}; Then ${item.then}${item.boundary ? `; Boundary ${item.boundary}` : ''}`),
    ]),
    '',
    '### 发布检查',
    '',
    ...formatList(acceptance.releaseChecklist),
  ];
}

function formatTaskPlan(taskPlan: TaskPlanDoc) {
  return taskPlan.tasks.map((task) => `- ${task.id} ${task.title}：${task.description}；依赖：${task.dependsOn.join('、') || '无'}；验收引用：${task.acceptanceRefs.join('、') || '无'}`);
}

function formatRisks(risks: RiskRecord[]) {
  if (!risks.length) return ['暂无风险记录'];
  const unique = new Map<string, RiskRecord>();
  risks.forEach((risk) => unique.set(risk.id, risk));
  return [...unique.values()].map((risk) => `- [${risk.impact}] ${risk.id} ${risk.risk}；缓解：${risk.mitigation}`);
}

function formatQualityMarkdown(report: QualityReport) {
  return [
    `得分：${report.score}/100`,
    '',
    '### 阻断项',
    '',
    ...formatList(report.blockers),
    '',
    '### 提醒',
    '',
    ...formatList(report.warnings),
    '',
    '### 已通过',
    '',
    ...formatList(report.passedChecks),
    '',
    '### 下一步',
    '',
    ...formatList(report.nextActions),
  ];
}

function formatList(items: string[], indent = 0) {
  const prefix = `${' '.repeat(indent)}- `;
  return items.length ? items.map((item) => `${prefix}${item}`) : [`${prefix}暂无`];
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
