# ReqFlow - AI 需求澄清工作台

一个可视化的、可交互的 AI-Native 需求澄清工具。

从一句话想法出发，通过“澄清问题 → 变更提案 → 用户确认 → 质量检查 → 版本快照”的受控循环，把模糊想法变成清晰的可执行方案。

## 核心功能

- **受控需求澄清**：先生成变更提案，用户确认后才修改正式文档
- **需求宪法**：锁定产品核心定义，降低多轮对话后的方向漂移
- **质量闸门**：检查完整性、一致性、可测试性和冻结条件
- **追溯矩阵**：检查功能是否被验收用例、开发任务和技术方案支撑
- **版本快照**：每次接受提案后自动保存，可回滚
- **审计日志**：记录提案接受、拒绝、质量检查、回滚和导出等关键动作
- **评审签核**：冻结前要求当前版本至少一条通过记录，打回记录会阻断冻结
- **工作区隔离**：会话绑定 `workspaceId`，API 通过 `x-reqflow-workspace` 阻断跨工作区访问
- **会话列表**：首页按当前工作区展示最近会话，方便继续已有需求项目
- **网站导出**：工作台可直接导出 Markdown 规格包，并写入审计日志
- **轻量 RBAC**：通过 `x-reqflow-role` 区分 viewer、reviewer、editor、admin 的操作边界
- **原型预览**：生成 HTML 原型，使用 sandbox iframe 渲染
- **命令系统**：`/review` `/quality` `/generate-tech` `/generate-acceptance` `/advise` `/freeze` `/reset`
- **真实 LLM 编排**：需求、技术方案、验收标准等生成流程必须调用 OpenAI 兼容 API；接口失败会直接报错，不会静默退回本地规则
- **流程教练**：根据当前状态提示下一步动作，减少用户记命令和猜流程的成本
- **AI 决策辅助**：用户不懂产品/技术/架构时，可让 AI 推荐默认方案、解释取舍、给保守版本

## 快速开始

```bash
# 安装依赖
(cd server && npm install)
(cd client && npm install)

# 配置模型，当前后端使用 OpenAI 兼容接口
cp server/.env.example server/.env
# 编辑 server/.env:
# OPENAI_API_KEY=你的 key
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o

# 启动后端
(cd server && npm run dev)

# 启动前端
(cd client && npm run dev)

# 访问 http://localhost:5173
```

## 测试

```bash
# 后端单元/API 测试，不调用真实模型
(cd server && npm test)

# 前后端构建
(cd server && npm run build)
(cd client && npm run build)

# 浏览器烟测，会真实打开网站并跑通首页 -> 需求提案 -> 验收/任务拆解提案
(cd client && npm run test:e2e)

# 真实 LLM 集成测试，会读取 server/.env 或当前 shell 环境
(cd server && npm run test:llm)

# 固定评测集，验证真实模型是否仍能完成核心需求分析链路
(cd server && npm run eval:llm)
```

## CI

- `.github/workflows/ci.yml` 会在 push/PR 上运行后端测试、前后端构建、依赖审计和 Docker build，不调用真实模型。
- `.github/workflows/llm-smoke.yml` 是手动 workflow，需要配置 `OPENAI_API_KEY` secret，会用真实 OpenAI 兼容模型跑网站烟测。

如果使用本机 OpenAI 兼容 API，即使服务本身不校验 key，也需要给 OpenAI SDK 一个占位 key：

```bash
OPENAI_API_KEY=local-dev-key
OPENAI_BASE_URL=http://127.0.0.1:你的端口/v1
OPENAI_MODEL=你的模型名
```

DeepSeek 示例：

```bash
OPENAI_API_KEY=你的 DeepSeek API Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
```

## 使用流程

1. 输入你的模糊想法
2. 系统生成第一版需求提案，并在右侧预览草案
3. 按流程教练提示接受提案、回答待确认问题或补充反馈
4. 接受提案后生成正式需求文档和版本快照
5. 继续生成验收标准、任务拆解和技术方案
6. 查看追溯矩阵，确认功能、验收、任务和技术方案没有断链
7. 生成原型校准体验，提交当前版本评审通过
8. 质量检查通过后 `/freeze` 冻结规格包

## 面向非专家用户

ReqFlow 不要求用户先具备产品经理、架构师或测试工程师能力。工作台中的“AI 决策辅助”会在关键节点提供低门槛入口：

- 不知道产品方向时，让 AI 推荐保守的第一版定位。
- 不知道待确认问题怎么答时，让 AI 给出 2-3 个选项和默认推荐。
- 不确定默认假设是否可靠时，让 AI 标出高风险假设和验证办法。
- 不确定是否接受提案时，让 AI 解释收益、风险和可逆性。
- 不懂验收标准时，让 AI 用业务结果拆成可测试用例。
- 不懂技术架构时，让 AI 推荐稳妥、低风险、易维护方案。
- 质量检查有问题时，让 AI 按必须修、建议修、可暂缓排序。

这些“解释/建议/对比”走只读 `/advise` 模式，不会覆盖待确认提案，也不会修改正式文档。

## 企业接入说明

- 后端关键写操作支持 `x-reqflow-actor` 请求头，用于记录审计日志中的操作者。
- 前端支持设置工作区、操作者和角色，并会在创建、提案确认、质量检查、回滚、原型生成、导出和对话请求中自动透传。
- 后端通过 `x-reqflow-workspace` 进行轻量工作区隔离；请求工作区与会话工作区不一致时返回 403。
- 后端通过 `x-reqflow-role` 执行轻量 RBAC：`viewer` 只读，`reviewer` 可评审和质量检查，`editor` 可发起/确认需求变更，`admin` 可阶段切换和回滚。未传角色时按本地 `admin` 处理，便于本地开发。
- 生产环境可设置 `REQFLOW_AUTH_MODE=trusted-header`，要求可信网关或 SSO 中间件注入 `x-reqflow-actor`、`x-reqflow-workspace`、`x-reqflow-role`；除 `/api/health` 和 `/api/ready` 外，缺少这些头部的 API 请求会被拒绝。
- 后端会透传或生成 `x-request-id`，错误响应会返回 `requestId`，便于前端错误和后端日志关联。
- `/api/health` 用于存活检查，`/api/ready` 会校验存储可访问和 LLM 已配置。
- 请求日志默认输出结构化 JSON；如需关闭，可设置 `REQFLOW_REQUEST_LOGS=0`。
- `GET /api/session/:id/audit` 可获取当前会话审计日志。
- `GET /api/session` 会按 `x-reqflow-workspace` 返回当前工作区的会话摘要列表。
- `POST /api/session/:id/reviews` 可提交当前版本评审通过或打回记录；冻结规格包会校验当前版本评审状态。
- 工作台顶部可直接导出 Markdown 规格包；导出的规格包会包含审计日志章节，便于评审和交付留痕。
- 生产部署可使用根目录 `Dockerfile` 和 `docker-compose.yml`，详细说明见 `DEPLOYMENT.md`。

## LLM 接入规则

- 普通反馈、`/fix`、`/idea`、`/generate-tech`、`/generate-acceptance` 会调用真实 LLM，并要求模型返回结构化 JSON 提案。
- `/advise` 会调用真实 LLM 生成只读决策建议，不创建提案、不修改正式文档。
- LLM 返回缺字段、JSON 无效或接口失败时，本轮会直接失败，不会使用本地规则假装生成。
- `/quality`、`/review`、`/freeze`、`/reset` 属于确定性流程控制，仍由后端规则执行，避免模型绕过确认和质量闸门。

## LLM 评测

`server/evals/llm-eval-cases.json` 维护固定评测场景，`npm run eval:llm` 会调用真实模型并输出 JSON 结果。默认评测覆盖“模糊想法生成结构化需求提案、只读 `/advise` 不改状态、接受提案后草稿质量无阻断项”。设置 `REQFLOW_EVAL_FULL=1` 后，会继续评测验收标准、任务拆解和技术方案生成。
