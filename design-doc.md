# ReqFlow 设计文档

> AI-Native 需求澄清工作台 — 从一句话想法到可执行方案

---

## 1. 问题与动机

### 1.1 痛点

传统需求澄清流程存在以下问题：

| 角色 | 痛点 |
|------|------|
| 独立开发者 | 有想法但不会写 PRD、不会画原型、没有测试思维 |
| 小团队 | 没有专职产品经理，需求靠口头传达，理解偏差大 |
| 所有人 | 需求变更大，文档维护成本高，改一次排期两周 |

### 1.2 核心洞察

1. **需求澄清本质上是对话**：好产品经理也是通过追问来明确需求的
2. **原型比文字更直观**：看到页面才能判断"这是不是我要的"
3. **迭代是常态**：需求不是一次定死的，而是否定之否定的螺旋过程
4. **AI 可以扮演缺失角色**：产品经理、架构师、设计师、测试、文档专家

### 1.3 设计目标

- 一个人也能走完需求澄清全流程
- 从想法到可执行方案，AI 全程辅助
- 支持迭代循环，修改成本趋近于零
- 所见即所得，对话即文档

---

## 2. 核心概念模型

### 2.1 双环迭代

```
            ┌──────────────────────────────────┐
            │          外环：认知迭代            │
            │                                  │
            │   想法 → 看到原型 → "不对/差点"    │
            │         ↑              │         │
            │         └── 修正想法 ←──┘         │
            │                                  │
            │   ┌────────────────────────┐     │
            │   │    内环：细节迭代        │     │
            │   │                        │     │
            │   │  需求 → 方案 → 原型      │     │
            │   │   ↑              │     │     │
            │   │   └── 微调细节 ←──┘     │     │
            │   │                        │     │
            │   └────────────────────────┘     │
            │                                  │
            └──────────────────────────────────┘
```

**内环**：方向对了，调整细节（加个字段、改个布局）  
**外环**：方向不对，推翻重来（这不是博客，是社区）

### 2.2 四阶段状态机

```
                    ┌──────────┐
          ┌────────►│ CLARIFY  │◄────────┐
          │         │ 需求澄清  │         │
          │         └────┬─────┘         │
          │              │               │
          │              ▼               │
          │         ┌──────────┐         │
          │  ┌──────│ DRAFT    │◄──┐     │
          │  │      │ 方案草稿  │   │     │
          │  │      └────┬─────┘   │     │
          │  │           │         │     │
          │  │           ▼         │     │
          │  │      ┌──────────┐   │     │
          │  │      │ REVIEW   │───┘     │
          │  │      │ 审阅迭代  │ 微调     │
          │  │      └────┬─────┘         │
          │  │           │               │
          │  │     ┌─────┴─────┐         │
          │  │     │           │         │
          │  │   满意        不满意(大改)  │
          │  │     │           │         │
          │  │     ▼           └─────────┘
          │  │  ┌──────────┐     推翻重来
          │  │  │ FROZEN   │
          │  │  │ 已冻结    │
          │  │  └──────────┘
          │  │
          │  └── 不满意(小改) → 回到 DRAFT 微调
          │
          └── 完全推翻 → 回到 CLARIFY 重新澄清
```

| 阶段 | 触发条件 | AI 行为 |
|------|---------|---------|
| **CLARIFY** | 用户输入想法 | AI 产品经理逐步追问，每轮2-3个具体问题 |
| **DRAFT** | 需求基本清晰 | AI 生成需求文档、技术方案、验收标准 |
| **REVIEW** | 用户审阅原型 | AI 根据反馈微调或推翻重来 |
| **FROZEN** | 用户执行 /freeze | 锁定所有文档，输出最终开发规格 |

### 2.3 对话即文档

核心设计：**AI 的对话回复中嵌入结构化文档标记，解析后自动更新右侧文档面板。**

```
AI 回复示例：
─────────────────────
好的，根据你的回答，我更新了需求文档：

1. 目标读者是技术同行
2. 支持评论功能
3. 长文为主

```requirement
{
  "productDef": { "description": "技术博客", "targetUsers": "技术同行", "coreValue": "..." },
  "features": [{ "priority": "P0", "name": "文章管理", ... }],
  "excluded": ["社交功能"],
  "rules": ["..."],
  "pendingQuestions": ["是否需要暗黑模式？"]
}
```

你觉得还需要调整吗？
─────────────────────

前端显示时：
- 对话区：只显示自然语言部分（文档标记被过滤）
- 文档区：显示解析后的结构化文档
```

### 2.4 命令系统

用户通过命令控制迭代方向，无需理解底层状态机：

| 命令 | 迭代类型 | 效果 |
|------|---------|------|
| `/review` | 审阅 | AI 总结当前状态，列出已确定项和待确认项 |
| `/fix <问题>` | 内环微调 | 定点修改，只动相关部分 |
| `/idea <想法>` | 内环扩展 | AI 评估影响范围，自动更新受影响的文档 |
| `/reset` | 外环推翻 | 清空所有文档，回到 CLARIFY 重新开始 |
| `/freeze` | 锁定 | 冻结当前状态，输出最终开发规格 |
| `/generate-tech` | 按需生成 | 基于当前需求生成技术方案 |
| `/generate-acceptance` | 按需生成 | 基于当前需求生成验收标准 |
| `/generate-prototype` | 按需生成 | 基于当前需求生成 HTML 原型 |

---

## 3. 系统架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 欢迎页    │  │  工作台       │  │  文档导出     │  │
│  │ Welcome  │  │  Workspace   │  │  Export      │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
│                                                     │
│  ┌────────┐ ┌──────────┐ ┌───────┐ ┌────────────┐  │
│  │版本历史 │ │ 对话面板  │ │阶段栏 │ │ 文档预览    │  │
│  │Version │ │ Chat     │ │Stage  │ │ DocPreview │  │
│  │History │ │ Panel    │ │Ind.   │ │            │  │
│  └────────┘ └──────────┘ └───────┘ └────────────┘  │
│                                                     │
│  状态管理：Zustand    API 层：SSE + REST             │
└────────────────────────┬────────────────────────────┘
                         │ HTTP / SSE
┌────────────────────────▼────────────────────────────┐
│                   Backend (Express)                   │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Session 路由  │  │  Chat 路由    │  │ AI 服务   │  │
│  │ /api/session │  │  /api/chat   │  │ OpenAI    │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 文档解析器    │  │  会话存储     │                  │
│  │ parseUpdates │  │  MemoryStore │                  │
│  └──────────────┘  └──────────────┘                  │
└────────────────────────┬─────────────────────────────┘
                         │ API Call
                ┌────────▼────────┐
                │  DeepSeek / GPT  │
                │  LLM Service     │
                └─────────────────┘
```

### 3.2 技术栈

| 层 | 技术 | 选型理由 |
|----|------|---------|
| 前端框架 | React 18 | 生态成熟，组件化 |
| 样式 | Tailwind CSS | 原子化 CSS，开发速度快 |
| 状态管理 | Zustand | 轻量，API 简洁 |
| Markdown 渲染 | react-markdown | AI 回复格式化 |
| 后端框架 | Express | 简单稳定 |
| AI SDK | OpenAI SDK | 兼容 DeepSeek 等 OpenAI 格式 API |
| 流式输出 | SSE (Server-Sent Events) | 单向流，适合 AI 逐字输出 |
| 运行时 | tsx | TypeScript 直接执行，开发体验好 |

### 3.3 数据模型

```typescript
// 会话（核心实体）
interface Session {
  id: string;
  idea: string;                    // 用户的一句话想法
  stage: 'clarify' | 'draft' | 'review' | 'frozen';
  version: number;                 // 每次文档更新 +1
  requirement: RequirementDoc | null;
  tech: TechDoc | null;
  acceptance: AcceptanceDoc | null;
  prototype: PrototypeDoc | null;
  messages: ChatMessage[];         // 完整对话历史
  changelog: Changelog[];          // 版本变更记录
  createdAt: number;
  updatedAt: number;
}

// 需求文档
interface RequirementDoc {
  productDef: {
    description: string;   // 一句话描述
    targetUsers: string;   // 目标用户
    coreValue: string;     // 核心价值
  };
  features: Array<{
    priority: 'P0' | 'P1' | 'P2';
    name: string;
    description: string;
    notes: string;
  }>;
  excluded: string[];          // 明确不做的事
  rules: string[];             // 关键规则
  pendingQuestions: string[];  // 待确认项
}

// 技术方案
interface TechDoc {
  techStack: Array<{ tech: string; reason: string }>;
  modules: Array<{ name: string; description: string; dependencies: string[] }>;
  dataModels: Array<{ name: string; fields: Field[] }>;
  apis: Array<{ method: string; path: string; description: string }>;
}

// 验收标准
interface AcceptanceDoc {
  features: Array<{
    name: string;
    cases: Array<{
      scenario: string;    // 场景
      operation: string;   // 操作
      expected: string;    // 预期结果
      boundary: string;    // 边界条件
    }>;
  }>;
}

// 原型
interface PrototypeDoc {
  html: string;     // 完整 HTML 文件
  pages: string[];  // 页面名称列表
}
```

---

## 4. 核心流程详解

### 4.1 需求澄清流程

```
用户输入想法
     │
     ▼
┌─────────────────────────────────┐
│ ① 创建 Session (stage=clarify) │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ ② AI 第一轮追问                 │
│   - 识别模糊点                  │
│   - 提出2-3个选择题             │
│   - 给出选项引导 (A/B/C)        │
└─────────────┬───────────────────┘
              │
              ▼
         用户回答
              │
              ▼
┌─────────────────────────────────┐
│ ③ AI 解析回答 + 继续追问        │
│   - 更新已知信息                │
│   - 识别新的模糊点              │
│   - 缩小问题范围                │
│   - 可能输出 ```requirement```  │
└─────────────┬───────────────────┘
              │
              ▼
       需求是否足够清晰？
        │           │
       否           是
        │           │
        ▼           ▼
   继续追问    输出需求文档
                   │
                   ▼
            stage → draft
```

### 4.2 文档生成与更新流程

```
AI 回复
   │
   ▼
parseDocUpdates() 解析
   │
   ├── 匹配 ```requirement``` → 更新 RequirementDoc
   ├── 匹配 ```tech```        → 更新 TechDoc
   ├── 匹配 ```acceptance```  → 更新 AcceptanceDoc
   ├── 匹配 ```prototype```   → 更新页面列表
   └── 匹配 ```stage```       → 更新阶段
   │
   ▼
version + 1
changelog 记录变更
   │
   ▼
updateSession() 持久化
   │
   ▼
前端 getSession() 拉取最新数据
   │
   ▼
文档面板自动刷新
```

### 4.3 原型生成流程

```
用户点击「生成原型」
        │
        ▼
前端 POST /api/chat/:id/prototype
        │
        ▼
后端构建 Prompt：
  - 系统提示词：UI/UX 设计师 + 前端开发角色
  - 用户消息：当前需求 JSON + 页面列表
  - 指令：输出完整 HTML 文件
        │
        ▼
AI 生成完整 HTML（含 Tailwind CDN）
        │
        ▼
清理 markdown 代码块标记
        │
        ▼
保存到 session.prototype.html
        │
        ▼
前端 iframe srcDoc 渲染
  - 桌面模式：全宽
  - 手机模式：375x667
```

### 4.4 迭代回退流程

| 触发 | 回退到 | 保留什么 | 清除什么 |
|------|--------|---------|---------|
| `/fix 具体问题` | 当前阶段 | 全部 | 只修改指定部分 |
| `/idea 新想法` | 当前阶段 | 全部 | AI 评估影响范围，更新受影响文档 |
| `/reset` | clarify | idea, id | requirement, tech, acceptance, prototype, messages |
| 修改核心方向 | clarify | idea, id | 同上 |

---

## 5. AI Prompt 设计

### 5.1 系统 Prompt 结构

```
┌─────────────────────────────────────┐
│ 角色定义                             │
│ "你是 AI 全栈产品团队"                │
│ 同时扮演：产品经理/架构师/设计师/      │
│ 测试工程师/文档专家                    │
├─────────────────────────────────────┤
│ 工作原则                             │
│ 1. 每轮只问2-3个关键问题              │
│ 2. 问题要具体，给选项引导              │
│ 3. 逐步锁定核心要素                   │
│ 4. 需求清晰时主动生成文档             │
├─────────────────────────────────────┤
│ 输出格式约定                          │
│ ```requirement → 需求文档更新         │
│ ```tech        → 技术方案更新         │
│ ```acceptance  → 验收标准更新         │
│ ```prototype   → 原型页面列表         │
│ ```stage       → 阶段变更             │
├─────────────────────────────────────┤
│ 当前会话状态（动态注入）              │
│ 想法: xxx                            │
│ 阶段: clarify                        │
│ 版本: 3                              │
└─────────────────────────────────────┘
```

### 5.2 为什么这样设计 Prompt

| 设计决策 | 理由 |
|---------|------|
| 多角色合一 | 避免 AI 在不同角色间切换时丢失上下文 |
| 结构化标记 | 让 AI 回复同时服务于人类阅读和程序解析 |
| 每轮只问2-3个 | 信息过载会让用户放弃，少问多轮比多问少轮好 |
| 给选项引导 | 开放式问题用户不知道怎么答，选择题降低认知负担 |
| 注入会话状态 | AI 需要知道当前在哪个阶段，才能决定是追问还是生成文档 |

### 5.3 原型生成 Prompt

独立于主对话，专门用于生成 HTML 原型：

```
角色：UI/UX 设计师 + 前端开发
指令：
- 使用 Tailwind CSS（CDN）
- 真实布局、导航、表单、列表
- 合理的占位内容
- 单个完整 HTML 文件
- 美观、现代、有设计感
- 多页面用 tab/导航切换
```

---

## 6. 前端架构

### 6.1 组件树

```
App
├── Welcome                    # 欢迎页（未创建会话时显示）
│   ├── 标题 + 描述
│   ├── 想法输入框
│   └── 示例列表
│
└── Workspace                  # 工作台（创建会话后显示）
    ├── Header
    │   ├── Logo + 标题
    │   ├── StageIndicator     # 四阶段进度条
    │   └── 版本号
    │
    ├── VersionHistory         # 左侧：版本历史 + 统计 + 命令说明
    │
    ├── ChatPanel              # 中间：对话面板
    │   ├── MessageBubble[]    # 消息列表（用户/AI）
    │   ├── StreamingContent   # 流式输出
    │   ├── CommandBar         # 命令快捷栏
    │   └── InputBox           # 输入框
    │
    └── DocPreview             # 右侧：文档预览
        ├── TabBar             # 需求/技术/验收/原型 四个 Tab
        └── Content
            ├── RequirementView
            ├── TechView
            ├── AcceptanceView
            └── PrototypeView  # iframe 渲染 HTML 原型
```

### 6.2 状态管理（Zustand）

```typescript
interface AppState {
  // 数据
  session: Session | null;          // 当前会话
  docTab: DocTab;                   // 当前文档 Tab
  streamingContent: string;         // 流式输出缓存
  isStreaming: boolean;             // 是否正在流式输出
  error: string | null;             // 错误信息

  // Actions
  setSession: (session) => void;
  setDocTab: (tab) => void;
  setStreamingContent: (content) => void;
  appendStreamingContent: (content) => void;
  setIsStreaming: (streaming) => void;
  setError: (error) => void;
  addMessage: (msg) => void;
  updateStage: (stage) => void;
}
```

### 6.3 流式通信

```
前端                          后端
  │                             │
  │  POST /api/chat/:id/stream  │
  │  { message, command }       │
  │────────────────────────────►│
  │                             │ 构建上下文
  │                             │ 调用 AI API (stream=true)
  │                             │
  │  event: delta               │
  │  data: { content: "好" }    │◄─── AI 逐字输出
  │  event: delta               │
  │  data: { content: "的" }    │◄───
  │  event: delta               │
  │  data: { content: "..." }   │◄───
  │  ...                        │
  │                             │ 解析文档更新
  │  event: done                │
  │  data: { updates: [...] }   │◄─── 完成
  │                             │
  │  GET /api/session/:id       │
  │────────────────────────────►│
  │  { requirement, tech, ... } │◄─── 拉取最新数据
  │                             │
```

---

## 7. API 设计

### 7.1 会话管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/session` | 创建会话，body: `{ idea }` |
| GET | `/api/session/:id` | 获取会话完整数据 |
| PATCH | `/api/session/:id/stage` | 更新阶段，body: `{ stage }` |
| POST | `/api/session/:id/reset` | 重置会话（回到 clarify） |

### 7.2 AI 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat/:id/stream` | 流式对话，SSE 返回 |
| POST | `/api/chat/:id/prototype` | 生成原型 HTML |

### 7.3 SSE 事件类型

| 事件 | 数据 | 说明 |
|------|------|------|
| `delta` | `{ content: string }` | AI 输出的一个文本片段 |
| `done` | `{ updates: string[] }` | 对话完成，列出更新的文档类型 |
| `error` | `{ message: string }` | 错误信息 |

---

## 8. 设计决策与权衡

### 8.1 为什么用 SSE 而不是 WebSocket

| 维度 | SSE | WebSocket |
|------|-----|-----------|
| 方向 | 单向（服务端→客户端） | 双向 |
| 复杂度 | 低，HTTP 协议 | 高，需维护连接状态 |
| 适用场景 | AI 流式输出 | 实时协作 |
| 重连 | 自动 | 需手动实现 |

ReqFlow 的 AI 输出是典型的单向流，SSE 足够且更简单。

### 8.2 为什么文档标记嵌在对话中而不是单独请求

**方案 A（当前）**：AI 回复中包含文档标记，一次对话同时更新文档
**方案 B**：对话和文档更新分开，先对话再调 API 生成文档

选择 A 的理由：
- 减少请求次数，用户体验更流畅
- AI 能根据对话内容即时更新文档，不会遗漏
- 用户感知到"对话即文档"，理解成本更低

### 8.3 为什么用内存存储而不是数据库

MVP 阶段选择内存存储的理由：
- 快速验证核心流程，不引入数据库依赖
- 需求澄清是短会话（通常1-2小时），不需要持久化
- 后续可替换为 SQLite/PostgreSQL，接口不变

### 8.4 为什么原型用 iframe 而不是截图

- iframe 中的原型可以交互（点击、滚动）
- 用户可以直接体验布局和流程
- 桌面/手机视图切换是实时的
- 截图只能看不能点，交互感差

---

## 9. 已知限制与后续规划

### 9.1 当前限制

| 限制 | 影响 | 优先级 |
|------|------|--------|
| 内存存储，重启丢失 | 会话不持久 | P1 |
| 无用户认证 | 任何人可访问 | P1 |
| 原型无交互逻辑 | 只能看布局 | P2 |
| 无协作功能 | 只能单人使用 | P2 |
| 无文档导出 | 不能下载 | P2 |
| 无历史版本回滚 | 只能看不能回退 | P3 |

### 9.2 后续规划

**Phase 2 — 基础增强**
- SQLite 持久化存储
- 文档导出（Markdown / PDF）
- 历史版本对比与回滚
- 原型交互逻辑增强

**Phase 3 — 协作能力**
- 多人协作会话
- 评论与批注
- 需求变更通知
- 权限管理

**Phase 4 — 开发衔接**
- 从冻结需求自动生成项目脚手架
- 对接 CI/CD
- 与代码仓库联动（需求→Issue→PR）
- 开发进度追踪

---

## 10. 文件结构

```
req-flow/
├── README.md
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                          # AI API 配置
│   └── src/
│       ├── index.ts                  # 服务入口
│       ├── ai.ts                     # AI 服务配置
│       ├── store.ts                  # 数据模型 + 内存存储
│       └── routes/
│           ├── chat.ts               # ★ 核心：AI 对话 + 文档解析 + 命令分发
│           └── session.ts            # 会话 CRUD
│
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── types.ts                  # 类型定义
        ├── store.ts                  # Zustand 状态
        ├── api.ts                    # API 层 + 常量
        └── components/
            ├── Welcome.tsx           # 欢迎页
            ├── Workspace.tsx         # ★ 工作台布局（三栏）
            ├── ChatPanel.tsx         # ★ 对话面板（流式+命令）
            ├── DocPreview.tsx        # 文档预览容器
            ├── StageIndicator.tsx    # 阶段进度条
            ├── VersionHistory.tsx    # 版本历史
            ├── RequirementView.tsx   # 需求文档视图
            ├── TechView.tsx          # 技术方案视图
            ├── AcceptanceView.tsx    # 验收标准视图
            └── PrototypeView.tsx     # 原型预览（iframe）
```

★ 标记的是核心文件，理解全貌优先阅读这些。
