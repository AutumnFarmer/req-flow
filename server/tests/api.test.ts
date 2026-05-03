import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test from 'node:test';

process.env.REQFLOW_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'reqflow-api-test-'));
process.env.REQFLOW_REQUEST_LOGS = '0';

const { app } = await import('../src/app.ts');
const {
  getSession,
  makeProposal,
  persist,
} = await import('../src/store.ts');

test('session API supports controlled proposal acceptance and full markdown export', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
  }));

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const readyRes = await fetch(`${baseUrl}/api/ready`);
  const ready = await readyRes.json();
  assert.equal(readyRes.status, process.env.OPENAI_API_KEY ? 200 : 503);
  assert.equal(ready.storage.ok, true);

  const invalid = await fetch(`${baseUrl}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea: '   ' }),
  });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.headers.get('x-request-id'));

  const invalidJson = await fetch(`${baseUrl}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-request-id': 'req-json-test' },
    body: '{bad json',
  });
  assert.equal(invalidJson.status, 400);
  assert.equal(invalidJson.headers.get('x-request-id'), 'req-json-test');
  assert.equal((await invalidJson.json()).requestId, 'req-json-test');

  const created = await fetchJson<{ id: string }>(`${baseUrl}/api/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-reqflow-actor': 'pm@example.com',
      'x-request-id': 'req-create-test',
    },
    body: JSON.stringify({ idea: '企业级 AI 需求分析工具' }),
  });
  assert.ok(created.id);

  const defaultList = await fetchJson<any>(`${baseUrl}/api/session`);
  assert.equal(defaultList.workspaceId, 'default');
  assert(defaultList.sessions.some((item: any) => item.id === created.id));

  const crossWorkspace = await fetch(`${baseUrl}/api/session/${created.id}`, {
    headers: { 'x-reqflow-workspace': 'another-team' },
  });
  assert.equal(crossWorkspace.status, 403);

  const otherWorkspaceList = await fetchJson<any>(`${baseUrl}/api/session`, {
    headers: { 'x-reqflow-workspace': 'another-team' },
  });
  assert(!otherWorkspaceList.sessions.some((item: any) => item.id === created.id));

  const viewerQuality = await fetch(`${baseUrl}/api/session/${created.id}/quality`, {
    method: 'POST',
    headers: { 'x-reqflow-role': 'viewer' },
  });
  assert.equal(viewerQuality.status, 403);

  const session = getSession(created.id);
  assert.ok(session);
  assert.equal(session.workspaceId, 'default');

  const docs = buildEnterpriseDocs();
  const proposal = makeProposal(
    session,
    'idea',
    '形成企业级规格包',
    '补齐可交付规格包',
    ['constitution', 'requirement', 'tech', 'acceptance', 'taskPlan'],
    {
      ...docs,
      openQuestions: [],
      risks: docs.tech.risks,
    },
    'high',
  );
  session.pendingProposal = proposal;
  persist(session);

  const accepted = await fetchJson<any>(`${baseUrl}/api/session/${created.id}/proposals/${proposal.id}/accept`, {
    method: 'POST',
    headers: { 'x-reqflow-actor': 'pm@example.com' },
  });
  assert.equal(accepted.currentVersion, 1);
  assert.equal(accepted.requirement.features.length, 2);
  assert(accepted.auditEvents.some((item: any) => item.action === 'proposal.accepted'));

  const quality = await fetchJson<any>(`${baseUrl}/api/session/${created.id}/quality`, {
    method: 'POST',
    headers: { 'x-reqflow-actor': 'qa@example.com' },
  });
  assert.equal(quality.report.blockers.length, 0);
  assert(quality.report.passedChecks.includes('任务可追溯到验收用例'));

  const blockedFreeze = await fetch(`${baseUrl}/api/session/${created.id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-reqflow-actor': 'pm@example.com' },
    body: JSON.stringify({ stage: 'frozen' }),
  });
  assert.equal(blockedFreeze.status, 409);
  assert.match(await blockedFreeze.text(), /评审通过/);

  const reviewed = await fetchJson<any>(`${baseUrl}/api/session/${created.id}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-reqflow-actor': 'biz@example.com' },
    body: JSON.stringify({
      status: 'approved',
      role: '业务负责人',
      comment: '当前版本可以进入开发交付。',
    }),
  });
  assert(reviewed.reviews.some((item: any) => item.status === 'approved' && item.actor === 'biz@example.com'));

  const frozen = await fetchJson<any>(`${baseUrl}/api/session/${created.id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-reqflow-actor': 'pm@example.com' },
    body: JSON.stringify({ stage: 'frozen' }),
  });
  assert.equal(frozen.stage, 'frozen');

  const exported = await fetch(`${baseUrl}/api/session/${created.id}/export/markdown`, {
    headers: { 'x-reqflow-actor': 'pm@example.com' },
  });
  assert.equal(exported.status, 200);
  const markdown = await exported.text();
  assert.match(markdown, /## 技术方案/);
  assert.match(markdown, /## 验收标准/);
  assert.match(markdown, /## 任务拆解/);
  assert.match(markdown, /## 决策记录/);
  assert.match(markdown, /## 评审签核/);
  assert.match(markdown, /## 审计日志/);
  assert.match(markdown, /biz@example.com/);
  assert.match(markdown, /T-001/);
  assert.match(markdown, /F-002-C1/);

  const auditEvents = await fetchJson<any[]>(`${baseUrl}/api/session/${created.id}/audit`);
  assert(auditEvents.some((item) => item.action === 'session.created' && item.actor === 'pm@example.com'));
  assert(auditEvents.some((item) => item.action === 'quality.checked' && item.actor === 'qa@example.com'));
  assert(auditEvents.some((item) => item.action === 'review.submitted' && item.actor === 'biz@example.com'));
  assert(auditEvents.some((item) => item.action === 'spec.exported' && item.actor === 'pm@example.com'));

  const notFound = await fetch(`${baseUrl}/api/missing`, {
    headers: { 'x-request-id': 'req-missing-test' },
  });
  assert.equal(notFound.status, 404);
  assert.equal((await notFound.json()).requestId, 'req-missing-test');
});

test('trusted-header auth mode rejects missing or invalid identity headers', async (t) => {
  const previousMode = process.env.REQFLOW_AUTH_MODE;
  process.env.REQFLOW_AUTH_MODE = 'trusted-header';

  const server = app.listen(0);
  t.after(() => {
    if (previousMode === undefined) {
      delete process.env.REQFLOW_AUTH_MODE;
    } else {
      process.env.REQFLOW_AUTH_MODE = previousMode;
    }
    return new Promise<void>((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
    });
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await fetchJson<any>(`${baseUrl}/api/health`);
  assert.equal(health.authMode, 'trusted-header');

  const readyRes = await fetch(`${baseUrl}/api/ready`);
  assert.notEqual(readyRes.status, 401);
  assert.notEqual(readyRes.status, 403);
  const ready = await readyRes.json();
  assert.equal(ready.authMode, 'trusted-header');

  const missingHeaders = await fetch(`${baseUrl}/api/session`);
  assert.equal(missingHeaders.status, 401);

  const invalidRole = await fetch(`${baseUrl}/api/session`, {
    headers: {
      'x-reqflow-actor': 'pm@example.com',
      'x-reqflow-workspace': 'enterprise',
      'x-reqflow-role': 'owner',
    },
  });
  assert.equal(invalidRole.status, 403);

  const allowed = await fetchJson<any>(`${baseUrl}/api/session`, {
    headers: {
      'x-reqflow-actor': 'pm@example.com',
      'x-reqflow-workspace': 'enterprise',
      'x-reqflow-role': 'viewer',
    },
  });
  assert.equal(allowed.workspaceId, 'enterprise');
});

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    assert.fail(`${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function buildEnterpriseDocs() {
  const constitution = {
    productName: 'ReqFlow Enterprise',
    oneSentence: '把企业业务想法转成可开发、可验收、可追溯的需求规格包。',
    targetUsers: ['产品经理', '业务分析师', '研发负责人'],
    coreValue: '降低需求漂移、验收遗漏和交付偏差。',
    primaryScenario: '业务方提出模糊需求后，团队通过 AI 辅助澄清、确认、评审和冻结规格包。',
    successCriteria: ['P0/P1 功能都有验收标准', '开发任务可追溯到验收用例', '冻结前通过质量闸门和评审签核'],
    nonGoals: ['不生成生产代码', '不替代项目管理系统', '不承载线上运行监控'],
    lockedDecisions: ['正式变更必须先确认提案', '冻结前必须保留审计和评审记录'],
  };

  const requirement = {
    overview: {
      background: '企业需求分散在会议、聊天和临时文档中。',
      problem: '缺少可追溯的澄清、确认、验收和任务拆解流程。',
      goal: '输出可开发、可验收、可回滚的需求规格包。',
    },
    users: [
      {
        name: '产品经理',
        description: '负责把业务目标转成开发规格。',
        painPoints: ['需求变更不可追溯', '验收口径不一致'],
      },
    ],
    scenarios: [
      {
        name: '生成规格包',
        trigger: '业务方提出一个模糊需求',
        userGoal: '得到可交付给研发的规格包',
        mainFlow: ['输入想法', '生成提案', '确认文档', '运行质量检查', '导出规格包'],
        exceptions: ['存在阻断项时不能冻结'],
      },
    ],
    scope: {
      inScope: ['需求澄清', '提案确认', '验收标准', '任务拆解'],
      outOfScope: ['生产代码生成', '多人实时协同', '复杂权限系统'],
    },
    features: [
      {
        id: 'F-001',
        priority: 'P0' as const,
        name: '受控提案',
        description: 'AI 生成变更提案，用户确认后才写入正式文档。',
        userValue: '降低 AI 擅自改动造成的需求漂移。',
        relatedScenarios: ['生成规格包'],
      },
      {
        id: 'F-002',
        priority: 'P1' as const,
        name: '规格包导出',
        description: '导出需求、技术、验收、任务和质量报告。',
        userValue: '交付给研发和业务方审阅。',
        relatedScenarios: ['生成规格包'],
      },
    ],
    businessRules: [
      {
        id: 'R-001',
        rule: '正式文档变更必须经过提案确认。',
        reason: '保证需求资产可追溯。',
      },
    ],
    nonFunctional: {
      performance: ['质量检查在普通规格包规模下秒级完成'],
      security: ['原型使用 sandbox 渲染'],
      usability: ['阻断项必须给出下一步建议'],
      compatibility: ['支持现代浏览器'],
    },
    assumptions: ['第一版以单工作区为主'],
    openQuestions: [],
  };

  const acceptance = {
    featureCases: [
      {
        featureId: 'F-001',
        cases: [
          {
            id: 'F-001-C1',
            scenario: '接受受控提案',
            given: '存在待确认提案',
            when: '用户接受提案',
            then: '系统写入正式文档并保存版本快照',
            priority: 'must' as const,
          },
        ],
      },
      {
        featureId: 'F-002',
        cases: [
          {
            id: 'F-002-C1',
            scenario: '导出完整规格包',
            given: '需求、技术、验收和任务已生成',
            when: '用户导出 Markdown',
            then: '系统输出包含所有核心章节的规格包',
            priority: 'should' as const,
          },
        ],
      },
    ],
    releaseChecklist: ['P0/P1 功能都有验收用例', '任务可追溯到验收用例'],
  };

  const taskPlan = {
    tasks: [
      {
        id: 'T-001',
        title: '实现受控提案链路',
        description: '支持提案接受后生成版本快照。',
        dependsOn: [],
        acceptanceRefs: ['F-001-C1'],
      },
      {
        id: 'T-002',
        title: '实现规格包导出',
        description: '导出需求、技术、验收、任务和质量报告。',
        dependsOn: ['T-001'],
        acceptanceRefs: ['F-002-C1'],
      },
    ],
  };

  const tech = {
    architecture: {
      style: '前后端分离',
      rationale: '沿用现有 React + Express 架构，降低迁移成本。',
      constraints: ['AI 输出必须结构化校验', '正式变更必须可回滚'],
    },
    techStack: [
      { tech: 'React', reason: '承载需求工作台 UI' },
      { tech: 'Express', reason: '承载会话和导出 API' },
      { tech: 'SQLite', reason: '本地持久化会话和快照' },
    ],
    modules: [
      {
        id: 'M-001',
        name: '会话服务',
        responsibility: '维护需求资产和版本快照',
        dependencies: ['SQLite'],
      },
    ],
    dataModels: [
      {
        name: 'Session',
        fields: [
          { name: 'id', type: 'string', required: true, description: '会话 ID' },
          { name: 'currentVersion', type: 'number', required: true, description: '当前版本' },
        ],
      },
    ],
    apis: [
      { method: 'POST' as const, path: '/api/session', description: '创建会话' },
      { method: 'GET' as const, path: '/api/session/:id/export/markdown', description: '导出规格包' },
    ],
    risks: [
      {
        id: 'RSK-001',
        risk: 'LLM 输出结构不稳定',
        impact: 'medium' as const,
        mitigation: '使用 Zod 校验并返回结构化错误',
      },
    ],
  };

  return { constitution, requirement, acceptance, taskPlan, tech };
}
