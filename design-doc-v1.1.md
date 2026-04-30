# ReqFlow 设计文档 v1.0

> AI-Native 需求澄清工作台：把一句话想法稳定收敛成可开发、可验收、可回滚的规格包。

---

## 0. 版本说明

| 项 | 内容 |
|----|------|
| 版本 | v1.0 |
| 核心升级 | 从“对话即文档”升级为“对话驱动的受控自循环” |
| 关键变化 | 引入需求宪法、变更提案、影响分析、质量闸门、版本快照、冻结体检 |
| 设计原则 | AI 可以主动推进，但不能绕过确认、验证和回滚机制 |

v1.0 的重点不是让 AI 多生成几份文档，而是让整个需求澄清流程具备工程化闭环：能探索、能收敛、能解释、能撤销、能交付。

---

## 1. 产品定位

### 1.1 一句话定位

ReqFlow 是一个面向独立开发者和小团队的 AI 需求澄清工作台，帮助用户从模糊想法出发，通过对话、原型、验收标准和技术方案的持续校准，形成可直接进入开发的规格包。

### 1.2 目标用户

| 用户 | 典型场景 | 核心诉求 |
|------|----------|----------|
| 独立开发者 | 有产品想法，但不知道怎么拆需求 | 快速把想法变成可执行开发规格 |
| 小团队负责人 | 没有专职产品经理，需求靠口头沟通 | 降低理解偏差，沉淀统一文档 |
| AI 编程用户 | 想交给 Codex、Claude Code、Cursor 实现 | 先把需求讲清楚，避免 AI 直接写偏 |
| 外包/协作发起人 | 需要把需求交付给他人开发 | 输出明确范围、验收标准和原型 |

### 1.3 核心问题

传统需求澄清有三个断点：

1. 用户不知道如何表达需求，只能说“我想做个类似 xxx 的东西”。
2. 文档、原型、技术方案和验收标准彼此分离，改一处容易漏三处。
3. AI 虽然能生成内容，但容易过早收敛、擅自改动、上下文漂移，最后产物看似完整但不可开发。

ReqFlow v1.0 要解决的不是“让 AI 写文档”，而是“让 AI 在有边界的循环里帮助需求逐步收敛”。

---

## 2. 设计目标与非目标

### 2.1 设计目标

- 用户只需要输入碎片想法，系统负责追问、整理和推进。
- 每次需求变化都能说明影响范围，并由用户确认后再落文档。
- 所有关键产物保持一致：需求、技术方案、验收标准、原型、任务拆解。
- 每次确认变更都保存快照，可对比、可回滚。
- 冻结前自动体检，避免带着未解决冲突进入开发。
- 最终输出一个可交付规格包，而不是一段聊天记录。

### 2.2 非目标

- v1.0 不做多人实时协作。
- v1.0 不直接生成完整生产代码。
- v1.0 不追求复杂权限系统，优先本地单人可信工作流。
- v1.0 不把 AI 原型当最终 UI，只作为需求确认工具。

---

## 3. 核心自循环模型

### 3.1 从“双环迭代”升级为“受控双环”

```
                 外环：方向校准
        ┌─────────────────────────────┐
        │                             │
        │  需求宪法 ← 认知冲突 ← 原型反馈 │
        │     │                       │
        │     ▼                       │
        │  重新澄清 → 变更提案 → 确认    │
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
                 内环：细节收敛
        ┌─────────────────────────────┐
        │                             │
        │  用户反馈 → 影响分析 → 提案   │
        │     ▲             │         │
        │     │             ▼         │
        │  质量检查 ← 应用变更 ← 确认   │
        │                             │
        └─────────────────────────────┘
```

内环处理“方向已对，只是细节不对”的问题，例如字段、页面、规则、验收条件调整。

外环处理“方向不对，需要重新定义产品”的问题，例如从博客变成社区，从工具变成内容产品，从个人使用变成团队协作。

v1.0 的关键是：AI 不能直接把用户反馈写进最终文档，必须先经过影响分析和变更提案。

### 3.2 自循环的五个控制器

| 控制器 | 作用 | 解决的问题 |
|--------|------|------------|
| 需求宪法 | 记录产品不可轻易推翻的核心定义 | 防止多轮对话后目标漂移 |
| 变更分类器 | 判断反馈属于微调、扩展、冲突还是推翻 | 防止所有反馈都被当成普通修改 |
| 影响分析器 | 判断本次变化影响哪些文档和流程 | 防止只改需求、不改验收或原型 |
| 质量闸门 | 检查当前产物是否足够进入下一阶段 | 防止过早收敛和虚假完整 |
| 版本快照 | 每次确认变更后保存完整状态 | 防止试错后无法回退 |

### 3.3 标准循环步骤

```
用户输入反馈
  │
  ▼
变更分类：fix / idea / conflict / reset
  │
  ▼
影响分析：需求 / 技术 / 验收 / 原型 / 任务
  │
  ▼
生成变更提案
  │
  ├── 用户接受 → 应用变更 → 保存快照 → 质量检查
  │
  ├── 用户拒绝 → 丢弃提案 → 保持当前版本
  │
  └── 用户补充 → 更新提案 → 再确认
```

这条循环是 v1.0 的核心。它让 AI 有主动性，但每次真正改变需求资产前都留下解释和确认点。

---

## 4. 阶段状态机

### 4.1 顶层阶段

| 阶段 | 目标 | 进入条件 | 退出条件 |
|------|------|----------|----------|
| CLARIFY | 把模糊想法变成可讨论需求 | 用户创建会话 | 需求宪法已形成，关键问题可控 |
| DRAFT | 生成第一版规格草案 | 澄清质量达标 | 需求、验收、原型至少有可审阅版本 |
| REVIEW | 基于原型和文档循环校准 | 草案生成完成 | 冻结体检通过，用户确认 |
| FROZEN | 锁定可开发规格包 | 冻结检查通过 | 开新版本或复制会话后继续 |

### 4.2 阶段质量门槛

#### CLARIFY → DRAFT

必须满足：

- 已明确目标用户。
- 已明确核心使用场景。
- 已明确产品核心价值。
- 已列出 P0 功能范围。
- 已列出至少 3 条明确不做项或边界。
- 待确认问题不超过 5 个，且没有阻断级问题。

#### DRAFT → REVIEW

必须满足：

- 需求文档包含用户、场景、范围、功能、规则、风险。
- P0 功能都有可测试验收标准。
- 原型覆盖核心路径。
- 技术方案至少覆盖模块、数据模型、接口边界。
- 文档之间没有明显冲突。

#### REVIEW → FROZEN

必须满足：

- 所有阻断级待确认项已关闭。
- P0 和 P1 功能都有验收标准。
- 原型与需求中的核心流程一致。
- 技术方案没有未解释的高风险依赖。
- 用户明确确认可以进入开发。

### 4.3 临时状态

除了顶层阶段，系统内部维护临时状态：

| 临时状态 | 含义 |
|----------|------|
| IDLE | 没有待处理提案 |
| THINKING | AI 正在生成回复 |
| PROPOSAL_PENDING | 有变更提案等待用户确认 |
| APPLYING | 正在应用提案并生成快照 |
| CHECKING | 正在执行质量检查 |
| BLOCKED | 存在阻断项，不能进入下一阶段 |

临时状态不改变主流程阶段，但决定 UI 上可用的按钮和下一步动作。

---

## 5. 核心数据模型

### 5.1 Session

```typescript
type Stage = 'clarify' | 'draft' | 'review' | 'frozen';
type RuntimeState = 'idle' | 'thinking' | 'proposal_pending' | 'applying' | 'checking' | 'blocked';

interface Session {
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

  messages: ChatMessage[];
  snapshots: VersionSnapshot[];

  createdAt: number;
  updatedAt: number;
}
```

### 5.2 需求宪法

需求宪法是防漂移锚点。普通 `/fix` 不能直接修改它，只有外环变更或用户明确确认后才能修改。

```typescript
interface RequirementConstitution {
  productName: string;
  oneSentence: string;
  targetUsers: string[];
  coreValue: string;
  primaryScenario: string;
  successCriteria: string[];
  nonGoals: string[];
  lockedDecisions: string[];
}
```

### 5.3 需求文档

```typescript
interface RequirementDoc {
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
```

### 5.4 技术方案

```typescript
interface TechDoc {
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
```

### 5.5 验收标准

```typescript
interface AcceptanceDoc {
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
```

### 5.6 变更提案

```typescript
type ChangeType = 'fix' | 'idea' | 'conflict' | 'reset' | 'freeze';
type ImpactTarget = 'constitution' | 'requirement' | 'tech' | 'acceptance' | 'prototype' | 'taskPlan';

interface ChangeProposal {
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
  conflicts: string[];
  requiresConfirmation: boolean;
  createdAt: number;
}
```

### 5.7 质量报告

```typescript
interface QualityReport {
  score: number; // 0-100
  stage: Stage;
  blockers: string[];
  warnings: string[];
  passedChecks: string[];
  nextActions: string[];
}
```

### 5.8 版本快照

```typescript
interface VersionSnapshot {
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
```

### 5.9 辅助与核心未列出模型

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;                  // 完整内容
  displayContent?: string;          // 过滤后的显示内容（如过滤掉结构化标记）
  command?: string;                 // 用户使用的命令（如 /fix, /idea）
  proposalId?: string;              // 关联的提案 ID
  timestamp: number;
  tokenCount?: number;              // token 消耗（用于上下文管理）
}

interface OpenQuestion {
  id: string;
  question: string;
  context: string;
  priority: 'blocker' | 'important' | 'nice-to-have';
  status: 'open' | 'resolved' | 'deferred';
  answer?: string;
  resolvedAt?: number;
}

interface DecisionRecord {
  id: string;
  decision: string;
  reason: string;
  alternatives: string[];
  madeAt: number;
  version: number;
}

interface RiskRecord {
  id: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  mitigation: string;
  status: 'open' | 'mitigated' | 'accepted';
}

interface TaskPlanDoc {
  phases: Array<{
    name: string;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      relatedFeatures: string[];
      estimatedEffort: 'small' | 'medium' | 'large';
      dependencies: string[];
      priority: 'P0' | 'P1' | 'P2';
    }>;
  }>;
  milestones: Array<{
    name: string;
    criteria: string[];
    targetPhase: string;
  }>;
}

interface PrototypeDoc {
  html: string;
  pages: string[];
  linkedRequirementVersion: number;
  generatedAt: number;
}
```

---

## 6. AI 工作流设计

### 6.1 AI 不再直接改文档

v0 的方式是：AI 回复中嵌入文档标记，后端解析后直接更新文档。

v1.0 改为：AI 先生成自然语言回复和结构化提案，只有用户确认后才应用到正式文档。

```
用户消息
  │
  ▼
AI Orchestrator
  │
  ├── 自然语言回复：解释、追问、建议
  │
  └── 结构化输出：ChangeProposal / Questions / QualityReport
        │
        ▼
Schema 校验
        │
        ├── 成功 → 展示提案
        └── 失败 → 自动重试一次，仍失败则提示用户
```

### 6.2 Prompt 分层

| Prompt | 作用 | 输出 |
|--------|------|------|
| Clarifier Prompt | 澄清模糊需求 | 问题、已知事实、待确认项 |
| Classifier Prompt | 判断反馈类型 | fix / idea / conflict / reset |
| Proposal Prompt | 生成变更提案 | ChangeProposal |
| Writer Prompt | 应用已确认提案 | 更新后的文档对象 |
| Quality Prompt | 执行质量检查 | QualityReport |
| Prototype Prompt | 生成原型 | HTML + 页面清单 |
| Freeze Prompt | 生成最终规格包 | 冻结摘要 + 开发任务 |

### 6.3 结构化输出协议

流式输出只用于人类可读回复。结构化数据通过单独字段返回。

```typescript
interface AssistantTurnResult {
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
```

后端必须使用 schema 校验结构化输出，禁止用正则从 Markdown 代码块里猜 JSON。

### 6.4 追问策略

AI 每轮最多问 3 个问题，但不是所有问题都必须是选择题。

| 问题类型 | 使用场景 | 示例 |
|----------|----------|------|
| 选择题 | 用户没有明确偏好 | 这个工具主要给 A 个人用，B 团队用，还是 C 对外客户用？ |
| 确认题 | AI 已有推断 | 我理解这是一个本地优先工具，不需要账号系统，对吗？ |
| 排序题 | 需要明确优先级 | 速度、准确性、可视化，你最看重哪一个？ |
| 开放补充 | 选项覆盖不了 | 有没有必须保留的业务规则？ |

### 6.5 上下文窗口管理策略（防超限）

多轮对话和复杂的文档快照容易导致 Token 超限。系统在构建传递给大模型的 Context 时，采取以下策略：

1. **核心锚点常驻**：系统 Prompt、需求宪法、质量检查失败的 Blocker 始终在上下文中。
2. **文档动态截取**：不传入所有文档，根据当前 `ImpactTarget` 分析结果，仅传入受影响的文档片段。
3. **对话滑动窗口**：
   - 仅保留最近 N 轮（如 5-10 轮）完整对话。
   - 超过窗口的历史对话由 AI 定期总结并合并为 `DecisionRecord`，作为精简事实传入。
4. **Token 预算与降级**：每次请求前计算预计 Token 数（基于 `tokenCount`），若预估超过模型上限 80%，强制触发总结或提示用户开启新会话（clone）。

---

## 7. 核心流程

### 7.1 创建会话

```
用户输入一句话想法
  │
  ▼
创建 Session
  │
  ▼
AI 生成第一轮澄清问题
  │
  ▼
保存 version 0 快照
```

### 7.2 澄清循环

```
用户回答问题
  │
  ▼
AI 提取事实、假设、待确认项
  │
  ▼
更新需求宪法草案
  │
  ▼
质量闸门判断是否可进入 DRAFT
  │
  ├── 未达标 → 继续追问
  └── 达标 → 生成第一版需求文档提案
```

### 7.3 变更提案循环

```
用户输入：/fix 首页太复杂
  │
  ▼
分类器：fix，低影响
  │
  ▼
影响分析：prototype + requirement.scenarios
  │
  ▼
生成提案：
  - 首页减少统计卡片
  - 保留主行动按钮
  - 原型需重新生成
  │
  ▼
用户接受
  │
  ▼
应用变更，保存 v5 快照
```

### 7.4 外环推翻

外环不是简单 `/reset` 清空，而是一次受控重定义。

```
用户：这不是博客，我想做社区
  │
  ▼
分类器：conflict，高影响
  │
  ▼
AI 标记与需求宪法冲突
  │
  ▼
展示两种路径：
  A. 修改当前产品定义
  B. 复制当前会话，创建新方向
  C. 完全重置
  │
  ▼
用户确认后执行
```

### 7.5 原型反馈循环

```
用户查看原型
  │
  ▼
用户反馈“不对/太复杂/缺页面”
  │
  ▼
AI 归因：
  - 是视觉布局问题？
  - 是流程理解问题？
  - 是需求定义问题？
  │
  ▼
只改受影响资产
```

原型反馈不能默认只改 HTML。如果反馈暴露的是需求理解问题，必须回到需求文档和验收标准。

### 7.6 冻结流程

```
用户执行 /freeze
  │
  ▼
运行冻结体检
  │
  ├── 有 blocker → 展示阻断项，不允许冻结
  └── 通过 → 生成冻结提案
        │
        ▼
用户确认
        │
        ▼
保存 frozen 快照
        │
        ▼
导出规格包
```

冻结后的文档不可直接修改。后续变更必须通过“创建 v1.1 草案”或“复制会话继续迭代”完成。

---

## 8. 命令系统

### 8.1 命令列表

| 命令 | 作用 | 是否需要确认 |
|------|------|--------------|
| `/review` | 总结当前状态、待确认项、质量问题 | 否 |
| `/fix <问题>` | 微调已有内容 | 低影响可一键确认 |
| `/idea <想法>` | 增加新想法并评估影响 | 是 |
| `/accept` | 接受当前变更提案 | 否 |
| `/reject` | 拒绝当前变更提案 | 否 |
| `/diff <版本号>` | 对比当前版本和历史版本 | 否 |
| `/rollback <版本号>` | 回退到某个快照 | 是 |
| `/generate-tech` | 基于当前需求生成技术方案提案 | 是 |
| `/generate-acceptance` | 基于当前需求生成验收标准提案 | 是 |
| `/generate-prototype` | 基于当前需求生成原型 | 是 |
| `/quality` | 运行质量检查 | 否 |
| `/freeze` | 发起冻结体检和冻结提案 | 是 |
| `/reset` | 推翻当前方向 | 强确认 |

### 8.2 命令处理原则

- 所有会改变正式文档的命令，都先生成提案。
- 高影响命令必须展示影响范围和冲突。
- `/reset` 不直接清空，必须先询问重置、复制新方向或修改宪法。
- `/rollback` 会生成新版本快照，而不是删除历史。
- 冻结状态下只允许 `/review`、`/diff`、`/export`、`/new-version`。

---

## 9. 系统架构

### 9.1 总体架构

```
┌──────────────────────────────────────────────────────────┐
│                       Frontend                           │
│ React + Zustand + Markdown Preview + Prototype iframe     │
│                                                          │
│  Chat Panel      Proposal Drawer      Doc Preview         │
│  Quality Panel   Version Timeline     Export Panel        │
└──────────────────────────────┬───────────────────────────┘
                               │ REST / SSE
┌──────────────────────────────▼───────────────────────────┐
│                       Backend                            │
│ Express                                                     │
│                                                          │
│  Session Service        AI Orchestrator                    │
│  Proposal Service       Quality Gate Service               │
│  Snapshot Service       Export Service                     │
│  Prototype Service      Schema Validator                   │
└──────────────────────────────┬───────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────┐
│                        Storage                           │
│ SQLite                                                     │
│ sessions / messages / snapshots / proposals / exports      │
└──────────────────────────────┬───────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────┐
│                      LLM Provider                         │
│ OpenAI compatible API: GPT / DeepSeek / local gateway       │
└──────────────────────────────────────────────────────────┘
```

### 9.2 后端核心服务

| 服务 | 职责 |
|------|------|
| SessionService | 会话创建、读取、阶段变更 |
| AIOrchestrator | 组织不同 Prompt，处理 AI 调用 |
| ProposalService | 创建、接受、拒绝变更提案 |
| DocumentWriter | 将已确认提案应用到正式文档 |
| QualityGateService | 执行阶段检查和冻结体检 |
| SnapshotService | 保存快照、diff、rollback |
| PrototypeService | 生成、保存和安全渲染原型 |
| ExportService | 导出 Markdown / HTML 规格包 |
| SchemaValidator | 校验 AI 结构化输出 |

### 9.3 技术栈

| 层 | 技术 | v1.0 决策 |
|----|------|-----------|
| 前端 | React 18 + TypeScript | 保持当前技术栈 |
| 样式 | Tailwind CSS | 保持当前技术栈 |
| 状态管理 | Zustand | 保持轻量 |
| 后端 | Express + TypeScript | 保持当前技术栈 |
| 存储 | SQLite | v1.0 引入，替代内存存储 |
| AI SDK | OpenAI SDK | 兼容 OpenAI 格式接口 |
| 校验 | Zod | 校验 AI 结构化输出 |
| 流式输出 | SSE | 继续用于自然语言回复 |
| 导出 | Markdown / HTML | v1.0 优先，PDF 延后 |

---

## 10. API 设计

### 10.1 会话

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sessions` | 获取会话列表（分页） |
| POST | `/api/sessions` | 创建会话 |
| GET | `/api/sessions/:id` | 获取会话完整状态 |
| DELETE | `/api/sessions/:id` | 删除会话 |
| POST | `/api/sessions/:id/clone` | 复制会话（用于方向分岔或上下文清理） |
| PATCH | `/api/sessions/:id/stage` | 阶段变更，由质量闸门控制 |
| POST | `/api/sessions/:id/quality` | 运行质量检查 |

### 10.2 对话与 AI

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sessions/:id/chat/stream` | 发送消息，流式返回自然语言 |
| POST | `/api/sessions/:id/clarify` | 生成澄清问题 |
| POST | `/api/sessions/:id/freeze` | 发起冻结体检 |

### 10.3 提案

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sessions/:id/proposals/current` | 获取当前待确认提案 |
| POST | `/api/sessions/:id/proposals/:proposalId/accept` | 接受提案并应用 |
| POST | `/api/sessions/:id/proposals/:proposalId/reject` | 拒绝提案 |

### 10.4 版本

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sessions/:id/snapshots` | 获取版本快照列表 |
| GET | `/api/sessions/:id/snapshots/:version` | 获取指定快照 |
| GET | `/api/sessions/:id/diff?from=1&to=3` | 对比版本 |
| POST | `/api/sessions/:id/rollback` | 回滚到指定版本并生成新快照 |

### 10.5 原型与导出

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sessions/:id/prototype` | 生成或重新生成原型 |
| GET | `/api/sessions/:id/export/markdown` | 导出 Markdown 规格包 |
| GET | `/api/sessions/:id/export/html` | 导出 HTML 规格包 |

### 10.6 SSE 事件

| 事件 | 数据 | 说明 |
|------|------|------|
| `delta` | `{ content: string }` | AI 自然语言片段 |
| `proposal` | `{ proposalId: string }` | 生成了待确认提案 |
| `quality` | `{ report: QualityReport }` | 质量检查完成 |
| `done` | `{ recommendedAction: string }` | 本轮完成 |
| `error` | `{ message: string; retryable: boolean }` | 错误 |

---

## 11. 前端体验设计

### 11.1 页面结构

```
Workspace
├── Header
│   ├── 产品名
│   ├── 阶段状态
│   ├── 质量分
│   └── 当前版本
│
├── LeftRail
│   ├── 版本时间线
│   ├── 决策记录
│   └── 风险/待确认项
│
├── ChatPanel
│   ├── 对话历史
│   ├── AI 追问
│   ├── 命令输入
│   └── 快捷操作
│
├── ProposalDrawer
│   ├── 变更摘要
│   ├── 影响范围
│   ├── before / after
│   ├── 冲突提示
│   └── 接受 / 拒绝 / 继续修改
│
└── DocPreview
    ├── 需求文档
    ├── 技术方案
    ├── 验收标准
    ├── 原型预览
    └── 任务拆解
```

### 11.2 关键交互

| 场景 | v1.0 行为 |
|------|-----------|
| AI 生成提案 | 右侧弹出 ProposalDrawer，不直接改正式文档 |
| 用户接受提案 | 应用变更、保存快照、刷新质量报告 |
| 用户拒绝提案 | 提案进入 rejected 状态，文档不变 |
| 质量不达标 | 阶段按钮禁用，展示阻断项 |
| 原型反馈 | 先判断是原型问题还是需求问题 |
| 冻结成功 | 展示规格包入口和版本号 |

---

## 12. 质量闸门

### 12.1 检查维度

| 检查项 | 说明 | 阻断条件 |
|--------|------|----------|
| 完整性 | 关键文档是否齐全 | 缺少需求或验收标准 |
| 一致性 | 文档之间是否冲突 | 功能存在于需求但没有验收 |
| 可测试性 | 验收标准是否能执行 | 只有抽象描述，没有 Given/When/Then |
| 可开发性 | 技术方案是否足够落地 | 没有模块、数据模型或接口边界 |
| 范围控制 | 是否有明确不做项 | 功能无限扩张 |
| 风险透明 | 高风险是否被记录 | 关键风险无说明 |
| 原型覆盖 | 原型是否覆盖核心路径 | P0 流程没有原型 |

### 12.2 质量评分

| 分数 | 状态 | 含义 |
|------|------|------|
| 0-59 | blocked | 不能进入下一阶段 |
| 60-79 | warning | 可以继续迭代，不建议冻结 |
| 80-89 | ready | 可以进入下一阶段 |
| 90-100 | frozen-ready | 可以冻结 |

评分只用于辅助判断，真正阻断以 blockers 为准。

---

## 13. 原型设计与安全

### 13.1 原型生成原则

- 原型必须服务于需求确认，不追求最终视觉。
- 原型要覆盖 P0 核心流程。
- 多页面原型必须有清晰导航。
- 手机/桌面视图需要可切换。
- 生成后要记录对应需求版本。

### 13.2 iframe 安全

原型使用 iframe 渲染，但必须加安全边界：

```html
<iframe
  sandbox="allow-scripts"
  referrerpolicy="no-referrer"
  srcdoc="..."
/>
```

v1.0 原型限制：

- 默认不允许访问父页面。
- 默认不允许表单真实提交。
- 默认不允许加载未知远程脚本。
- Tailwind CDN 可在本地开发阶段放开，后续应改为内联样式或受控资源。

---

## 14. 存储设计

v1.0 使用 SQLite，原因是需求资产必须可靠保存，内存存储不足以支撑真实使用。

### 14.1 核心表

| 表 | 内容 |
|----|------|
| `sessions` | 会话基础信息、阶段、当前版本 |
| `messages` | 用户和 AI 对话 |
| `documents` | 当前文档对象 |
| `proposals` | 变更提案 |
| `snapshots` | 版本快照 |
| `quality_reports` | 质量检查结果 |
| `exports` | 导出记录 |

### 14.2 快照策略

- 创建会话时保存 v0。
- 每次接受提案后保存新版本。
- 生成原型后保存新版本。
- 冻结时保存不可变 frozen 快照。
- 回滚不会删除历史，而是生成新的当前版本。

---

## 15. 导出规格包

冻结后生成规格包，包含：

1. 产品概述
2. 需求宪法
3. 用户与场景
4. 功能范围
5. 业务规则
6. 非功能需求
7. 技术方案
8. 数据模型
9. API 草案
10. 验收标准
11. 原型页面清单
12. 开发任务拆解
13. 风险与假设
14. 决策记录
15. 版本历史摘要

v1.0 优先支持 Markdown 和 HTML 导出。PDF 可作为后续能力。

---

## 16. 错误处理与韧性

### 16.1 AI 调用异常处理
- **超时与重试**：AI API 设置明确超时（如 30s）。失败后采用指数退避策略自动重试最多 2 次。
- **降级响应**：重试失败后，保留用户的 `ChatMessage`（状态标记为 error），向用户展示友好的错误提示，允许用户点击“重试”按钮重新触发。
- **Schema 校验失败**：如果 AI 的结构化输出被 Zod 拒绝，后端会自动附带错误日志发起 1 次修复请求。如仍失败，向用户提供只包含自然语言回复的降级体验。

### 16.2 状态同步与并发
- **SSE 断连**：前端记录最后收到的消息 ID（Offset）。断连后发起重连，带上 Offset 恢复流，确保 UI 状态一致。
- **并发控制**：前端禁用输入框直到当前 AI 生成结束。后端使用基于 Session ID 的锁（或排队机制）防止同一会话出现竞争性写入。

---

## 17. 安全与防护

v1.0 提供基础安全防线：
- **流量防刷**：实施基于 IP 的 API 速率限制（Rate Limiting，例如 30 次请求/分钟）。
- **输入过滤**：限制用户单次输入的最大长度（如 5000 字符），防止恶意消耗 Token。
- **Prompt 注入防护**：使用明确的系统 Prompt 角色边界。对于用户意图模糊的命令，强制经过变更分类器隔离。
- **跨域安全**：配置严格的 CORS 策略（白名单域名）。

---

## 18. 环境配置 (.env)

系统所需的环境变量清单：

```env
# AI 服务配置
AI_PROVIDER=deepseek           # deepseek | openai | local
AI_API_KEY=sk-xxxxxxxxxxx
AI_MODEL=deepseek-chat
AI_MAX_TOKENS=8192
AI_TIMEOUT_MS=30000

# 服务运行配置
PORT=3001
CORS_ORIGIN=http://localhost:5173

# 存储
SQLITE_PATH=./data/reqflow.db

# 安全防线
RATE_LIMIT_RPM=30
MAX_INPUT_LENGTH=5000
```

---

## 19. 测试策略

ReqFlow 的工程化闭环需要严格的测试保障：

### 19.1 单元测试 (Unit Tests)
- **Schema Validator**：验证各种残缺、多余字段的 AI 结构化输出是否能被正确拒绝或修正。
- **质量闸门 (QualityGate)**：穷举各种文档不完整、状态不一致的场景，确保能正确触发 Block。
- **命令解析器**：验证各类 `/command` 和后续参数的解析正确性。

### 19.2 集成测试 (Integration Tests)
- **提案流闭环**：创建提案 -> 检查冲突 -> 接受提案 -> 快照生成 -> 文档应用 的完整状态机流转。
- **SSE 流式解析**：模拟 AI 的分块下发，验证前端能正确拼接文本和提取结构化标记。

### 19.3 AI 评估 (Evals)
- 建立一组固定的测试用例（Idea -> Clarify -> Draft），对比不同 Prompt/模型 组合下的生成稳定性与结构化格式正确率。

---

## 20. v1.0 实施范围

### 20.1 必须实现

- SQLite 持久化。
- 需求宪法。
- 变更提案确认流。
- 影响范围分析。
- 版本快照。
- 质量检查。
- 冻结体检。
- Markdown 导出。
- 原型 iframe 安全边界。
- **基础错误处理与令牌限制（新增）**。

### 20.2 可以延后

- 多人协作。
- 用户账号和权限。
- PDF 导出。
- 代码仓库联动。
- 自动生成完整工程代码。
- 评论批注系统。
- 实时多人编辑。

---

## 21. 产品级验收标准

ReqFlow v1.0 自身需要满足以下验收标准：

| 编号 | 验收项 | 标准 |
|------|--------|------|
| A1 | 创建会话 | 用户输入一句话想法后，系统能创建会话并提出首轮澄清问题 |
| A2 | 澄清收敛 | 用户回答 3-5 轮后，系统能形成需求宪法和第一版需求文档 |
| A3 | 提案确认 | 用户提出修改时，系统先展示变更提案，不直接改正式文档 |
| A4 | 影响分析 | 每个提案都能说明影响哪些文档 |
| A5 | 快照保存 | 接受提案后自动生成新版本快照 |
| A6 | 回滚 | 用户可以回滚到历史版本，并生成新的当前版本 |
| A7 | 质量检查 | 系统能列出 blockers、warnings 和下一步建议 |
| A8 | 冻结限制 | 存在 blockers 时不允许冻结 |
| A9 | 导出 | 冻结后能导出 Markdown 规格包 |
| A10 | 原型安全 | 原型在 sandbox iframe 中渲染，不影响主应用 |
| A11 | 异常恢复 | 网络中断或 AI 接口报错后，用户可重试且不丢失上下文 |

---

## 22. 从当前版本迁移到 v1.0

### 22.1 代码层迁移顺序

1. 引入 SQLite 和数据访问层。
2. 扩展 Session / Document / Snapshot 类型（**包括新增的 ChatMessage 等辅助类型**）。
3. 替换 Markdown 代码块解析，改为结构化输出校验。
4. 增加 ProposalService 和 ProposalDrawer。
5. 增加 SnapshotService 和版本时间线。
6. 增加 QualityGateService。
7. 改造 `/freeze` 为冻结体检。
8. 增加 Markdown 导出。
9. 加固 Prototype iframe。
10. **实现上下文窗口动态截断和 API 限流**。

### 22.2 文档层迁移

旧版 `RequirementDoc` 可迁移为：

| 旧字段 | 新字段 |
|--------|--------|
| `productDef.description` | `constitution.oneSentence` + `requirement.overview.goal` |
| `productDef.targetUsers` | `constitution.targetUsers` + `requirement.users` |
| `productDef.coreValue` | `constitution.coreValue` |
| `features` | `requirement.features` |
| `excluded` | `constitution.nonGoals` + `requirement.scope.outOfScope` |
| `rules` | `requirement.businessRules` |
| `pendingQuestions` | `openQuestions` |

---

## 23. 后续路线

### Phase 1: v1.0 闭环稳定

- 单人本地工作流。
- SQLite 持久化。
- 提案确认、快照、回滚、质量闸门、导出。
- **错误重试与安全边界**。

### Phase 2: 协作增强

- 多人评论。
- 批注。
- 权限。
- 变更通知。

### Phase 3: 开发衔接

- 需求生成 Issue。
- 任务拆分到代码代理。
- 需求和 PR 关联。
- 验收标准转自动化测试草案。

### Phase 4: 项目资产库

- 多项目管理。
- 模板库。
- 需求复用。
- 团队知识沉淀。

---

## 24. 文件结构建议

```
req-flow/
├── README.md
├── design-doc.md
├── .env.example              # ★ 新增环境配置示例
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── ai/
│       │   ├── client.ts
│       │   ├── orchestrator.ts
│       │   ├── prompts.ts
│       │   └── schemas.ts
│       ├── db/
│       │   ├── index.ts
│       │   ├── migrations.ts
│       │   └── repositories.ts
│       ├── services/
│       │   ├── sessionService.ts
│       │   ├── proposalService.ts
│       │   ├── documentWriter.ts
│       │   ├── qualityGateService.ts
│       │   ├── snapshotService.ts
│       │   ├── prototypeService.ts
│       │   └── exportService.ts
│       ├── routes/
│       │   ├── sessions.ts
│       │   ├── chat.ts
│       │   ├── proposals.ts
│       │   ├── snapshots.ts
│       │   └── exports.ts
│       └── types.ts
│
└── client/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api.ts
        ├── store.ts
        ├── types.ts
        └── components/
            ├── Workspace.tsx
            ├── ChatPanel.tsx
            ├── ProposalDrawer.tsx
            ├── QualityPanel.tsx
            ├── VersionTimeline.tsx
            ├── DocPreview.tsx
            ├── RequirementView.tsx
            ├── TechView.tsx
            ├── AcceptanceView.tsx
            ├── PrototypeView.tsx
            └── ExportPanel.tsx
```

---

## 25. 核心判断

ReqFlow 的关键价值不在于“AI 生成 PRD”，而在于建立一个受控的需求自循环：

- AI 负责发现问题、提出方案、维护一致性。
- 用户负责确认方向、取舍范围、锁定决策。
- 系统负责记录版本、检查质量、防止漂移、确保可回退。

只有这三者分工清楚，ReqFlow 才能从演示型 AI 工具变成真正可依赖的需求生产系统。
