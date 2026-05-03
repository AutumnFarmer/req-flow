import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.REQFLOW_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'reqflow-test-'));

const store = await import('../src/store.ts');
const {
  acceptProposal,
  createSession,
  makeProposal,
  runQualityCheck,
  submitReview,
} = store;

test('acceptProposal applies controlled changes and creates a version snapshot', () => {
  const session = createSession('企业内部需求分析工作台');
  const requirement = {
    overview: {
      background: '企业内部需求分散在聊天和文档中。',
      problem: '缺少统一澄清、确认、追踪机制。',
      goal: '形成可交付的需求规格包。',
    },
    users: [
      {
        name: '产品负责人',
        description: '负责把业务想法转成开发规格。',
        painPoints: ['需求漂移', '验收不清晰'],
      },
    ],
    scenarios: [
      {
        name: '澄清需求',
        trigger: '业务方提出模糊想法',
        userGoal: '得到可确认的需求提案',
        mainFlow: ['输入想法', '查看提案', '确认入库'],
        exceptions: ['信息不足时继续追问'],
      },
    ],
    scope: {
      inScope: ['提案确认', '版本快照'],
      outOfScope: ['多人权限'],
    },
    features: [
      {
        id: 'F-001',
        priority: 'P0' as const,
        name: '受控提案',
        description: '正式文档变更前必须先生成提案。',
        userValue: '避免 AI 擅自改动需求。',
        relatedScenarios: ['澄清需求'],
      },
    ],
    businessRules: [
      {
        id: 'R-001',
        rule: '接受提案后才能修改正式文档。',
        reason: '保证可追溯。',
      },
    ],
    nonFunctional: {
      performance: ['普通规格包秒级加载'],
      security: ['原型使用 sandbox 渲染'],
      usability: ['每轮给出清晰下一步'],
      compatibility: ['支持现代浏览器'],
    },
    assumptions: ['第一版单团队使用'],
    openQuestions: [],
  };

  const proposal = makeProposal(
    session,
    'idea',
    '形成企业级需求草案',
    '补齐第一版需求',
    ['requirement'],
    { requirement },
  );
  session.pendingProposal = proposal;

  const updated = acceptProposal(session, proposal.id, 'pm@example.com');

  assert.equal(updated.requirement?.features[0].id, 'F-001');
  assert.equal(updated.stage, 'draft');
  assert.equal(updated.currentVersion, 1);
  assert.equal(updated.snapshots.at(-1)?.summary, '形成企业级需求草案');
  assert(updated.auditEvents.some((item) => item.action === 'proposal.accepted' && item.actor === 'pm@example.com'));
  assert.equal(updated.openQuestions.length, 0);
});

test('runQualityCheck blocks frozen handoff when traceability is broken', () => {
  const session = createSession('企业级需求分析工具');
  session.openQuestions = [];
  session.constitution = {
    productName: 'ReqFlow Enterprise',
    oneSentence: '把业务想法转成可开发、可验收、可追溯的规格包。',
    targetUsers: ['产品经理', '业务分析师'],
    coreValue: '降低需求漂移和交付偏差。',
    primaryScenario: '从业务想法生成确认过的需求规格包。',
    successCriteria: ['P0/P1 功能都有验收标准', '任务可追溯到验收用例'],
    nonGoals: ['不生成生产代码', '不替代项目管理系统', '不做多人实时协作'],
    lockedDecisions: ['正式变更必须先确认提案'],
  };
  session.requirement = {
    overview: {
      background: '企业需要统一需求分析流程。',
      problem: '需求、验收和任务之间容易脱节。',
      goal: '提供可冻结的规格包。',
    },
    users: [
      {
        name: '产品经理',
        description: '负责需求分析。',
        painPoints: ['验收遗漏'],
      },
    ],
    scenarios: [
      {
        name: '生成规格包',
        trigger: '输入业务目标',
        userGoal: '得到可交付文档',
        mainFlow: ['澄清', '确认', '冻结'],
        exceptions: ['阻断问题未关闭时不可冻结'],
      },
    ],
    scope: {
      inScope: ['需求', '验收', '任务'],
      outOfScope: ['代码生成'],
    },
    features: [
      {
        id: 'F-001',
        priority: 'P0',
        name: '需求提案',
        description: '生成待确认需求提案。',
        userValue: '受控修改。',
        relatedScenarios: ['生成规格包'],
      },
      {
        id: 'F-002',
        priority: 'P1',
        name: '任务追踪',
        description: '任务关联验收用例。',
        userValue: '便于开发交接。',
        relatedScenarios: ['生成规格包'],
      },
    ],
    businessRules: [
      {
        id: 'R-001',
        rule: '冻结前必须通过质量闸门。',
        reason: '避免不可交付规格包。',
      },
    ],
    nonFunctional: {
      performance: ['秒级检查'],
      security: ['数据本地持久化'],
      usability: ['清晰显示阻断项'],
      compatibility: ['现代浏览器'],
    },
    assumptions: [],
    openQuestions: [],
  };
  session.acceptance = {
    featureCases: [
      {
        featureId: 'F-001',
        cases: [
          {
            id: 'F-001-C1',
            scenario: '确认需求提案',
            given: '存在待确认提案',
            when: '用户接受提案',
            then: '系统保存正式文档和快照',
            priority: 'must',
          },
        ],
      },
    ],
    releaseChecklist: ['验收覆盖 P0/P1'],
  };
  session.tech = {
    architecture: {
      style: '前后端分离',
      rationale: '保持现有架构。',
      constraints: ['结构化输出'],
    },
    techStack: [{ tech: 'React', reason: '工作台 UI' }],
    modules: [{ id: 'M-001', name: '质量闸门', responsibility: '检查一致性', dependencies: [] }],
    dataModels: [
      {
        name: 'Session',
        fields: [{ name: 'id', type: 'string', required: true, description: '会话 ID' }],
      },
    ],
    apis: [{ method: 'POST', path: '/api/session', description: '创建会话' }],
    risks: [],
  };
  session.taskPlan = {
    tasks: [
      {
        id: 'T-001',
        title: '实现任务追踪',
        description: '任务必须引用验收用例。',
        dependsOn: ['T-404'],
        acceptanceRefs: ['F-002-C1'],
      },
    ],
  };

  const report = runQualityCheck(session, 'frozen');

  assert(report.blockers.some((item) => item.includes('F-002')));
  assert(report.blockers.some((item) => item.includes('任务依赖不存在')));
  assert(report.blockers.some((item) => item.includes('任务引用了不存在的验收用例')));
  assert(report.score < 90);
});

test('frozen handoff requires current version approval', () => {
  const session = createSession('企业级需求分析工具');
  session.openQuestions = [];
  session.constitution = {
    productName: 'ReqFlow Enterprise',
    oneSentence: '把业务想法转成可开发、可验收、可追溯的规格包。',
    targetUsers: ['产品经理', '业务分析师'],
    coreValue: '降低需求漂移和交付偏差。',
    primaryScenario: '从业务想法生成确认过的需求规格包。',
    successCriteria: ['P0 功能都有验收标准', '规格包可冻结'],
    nonGoals: ['不生成生产代码', '不替代项目管理系统', '不做多人实时协作'],
    lockedDecisions: ['正式变更必须先确认提案'],
  };
  session.requirement = {
    overview: {
      background: '企业需要统一需求分析流程。',
      problem: '需求、验收和任务之间容易脱节。',
      goal: '提供可冻结的规格包。',
    },
    users: [{ name: '产品经理', description: '负责需求分析。', painPoints: ['验收遗漏'] }],
    scenarios: [{
      name: '生成规格包',
      trigger: '输入业务目标',
      userGoal: '得到可交付文档',
      mainFlow: ['澄清', '确认', '冻结'],
      exceptions: ['阻断问题未关闭时不可冻结'],
    }],
    scope: { inScope: ['需求', '验收', '任务'], outOfScope: ['代码生成'] },
    features: [{
      id: 'F-001',
      priority: 'P0',
      name: '需求提案',
      description: '生成待确认需求提案。',
      userValue: '受控修改。',
      relatedScenarios: ['生成规格包'],
    }],
    businessRules: [{ id: 'R-001', rule: '冻结前必须通过质量闸门。', reason: '避免不可交付规格包。' }],
    nonFunctional: {
      performance: ['秒级检查'],
      security: ['数据本地持久化'],
      usability: ['清晰显示阻断项'],
      compatibility: ['现代浏览器'],
    },
    assumptions: [],
    openQuestions: [],
  };
  session.acceptance = {
    featureCases: [{
      featureId: 'F-001',
      cases: [{
        id: 'F-001-C1',
        scenario: '确认需求提案',
        given: '存在待确认提案',
        when: '用户接受提案',
        then: '系统保存正式文档和快照',
        priority: 'must',
      }],
    }],
    releaseChecklist: ['验收覆盖 P0'],
  };
  session.tech = {
    architecture: { style: '前后端分离', rationale: '保持现有架构。', constraints: ['结构化输出'] },
    techStack: [{ tech: 'React', reason: '工作台 UI' }],
    modules: [{ id: 'M-001', name: '质量闸门', responsibility: '检查一致性', dependencies: [] }],
    dataModels: [{
      name: 'Session',
      fields: [{ name: 'id', type: 'string', required: true, description: '会话 ID' }],
    }],
    apis: [{ method: 'POST', path: '/api/session', description: '创建会话' }],
    risks: [],
  };
  session.taskPlan = {
    tasks: [{
      id: 'T-001',
      title: '实现受控提案',
      description: '任务引用验收用例。',
      dependsOn: [],
      acceptanceRefs: ['F-001-C1'],
    }],
  };

  const blocked = runQualityCheck(session, 'frozen');
  assert(blocked.blockers.some((item) => item.includes('评审通过')));

  submitReview(session, 'approved', '当前版本可以冻结', '业务负责人', 'biz@example.com');
  const approved = runQualityCheck(session, 'frozen');
  assert(!approved.blockers.some((item) => item.includes('评审通过')));
  assert(approved.passedChecks.includes('当前版本已有评审通过记录'));
});
