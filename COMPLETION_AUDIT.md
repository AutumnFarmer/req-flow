# ReqFlow Completion Audit

审计日期：2026-05-03

## 目标重述

本轮目标是把 ReqFlow 从本地单人需求澄清原型，优化成一个企业级适用的 AI-native 需求分析网站。成功标准不是单点功能可运行，而是：

- 能接入真实 OpenAI 兼容 LLM，并已用 DeepSeek `deepseek-v4-flash` 验证核心链路。
- 网站主流程可用：输入模糊想法、生成需求提案、人工确认、继续生成验收/任务拆解、导出规格包。
- 当前工作流能自循环拆分、分析和推进需求，而不是依赖用户记命令或自己具备产品/架构能力。
- 非技术、非产品、非架构用户能借助 AI 决策辅助理解选项、风险和默认建议。
- 企业使用需要的基础能力可落地：受控变更、质量闸门、追溯、审计、评审签核、工作区隔离、角色边界、部署和 CI。
- 真实密钥不能被写入仓库。

## Prompt-To-Artifact Checklist

| 要求 | 证据 | 状态 |
| --- | --- | --- |
| 阅读并优化现有项目 | `ENTERPRISE_OPTIMIZATION.md` 记录现状判断、已落地优化和路线图；代码改动覆盖 `server/src`、`client/src`、测试、CI 和部署文件 | 已完成 |
| 接入实际 LLM API | `server/src/ai.ts` 使用 OpenAI 兼容客户端；`server/src/llm.ts` 负责结构化生成、校验和修复；`server/.env.example`、`DEPLOYMENT.md`、`README.md` 记录 DeepSeek 配置 | 已完成 |
| 使用 DeepSeek `deepseek-v4-flash` | `server/.env.example`、`DEPLOYMENT.md`、`.github/workflows/llm-smoke.yml`、`server/evals/README.md` 均包含 `deepseek-v4-flash` 示例；本地 `/api/ready` 显示 provider 为 `deepseek-v4-flash @ api.deepseek.com` | 已验证 |
| 网站整体流程可用 | `client/e2e/smoke.spec.ts` 覆盖首页输入、等待 LLM 提案、应用草案、发送 `/generate-acceptance`、再次应用草案、导出 Markdown；本轮 `npm run test:e2e` 通过 | 已验证 |
| 工作流能自循环拆分分析需求 | `client/src/components/ChatPanel.tsx` 的流程教练根据 pending proposal、open questions、acceptance、tech、review、quality 状态推荐下一步；后端受控提案和质量闸门在 `server/src/store.ts` | 已完成 |
| 不能假设用户有产品/技术/架构能力 | `ChatPanel.tsx` 的 AI 决策辅助提供默认方向、问题选项、假设检查、提案解释、验收解释、技术方案对比、质量问题排序和冻结建议；走只读 `/advise` 模式 | 已完成 |
| AI 建议不能破坏正式文档 | `server/src/llm.ts` 支持 `advise` 只读模式；`server/tests/llm.integration.test.ts` 覆盖 advice 不覆盖 pending proposal；`README.md` 说明 `/advise` 不创建提案、不修改文档 | 已完成 |
| 受控需求变更 | `server/src/store.ts` 的 `makeProposal`、`acceptProposal`、`rejectProposal`、版本快照和决策记录；`server/tests/store.test.ts`、`server/tests/api.test.ts` 覆盖接受提案链路 | 已验证 |
| 企业质量闸门 | `server/src/store.ts` 的 `runQualityCheck` 检查占位内容、验收覆盖、任务依赖、追溯、技术方案和冻结条件；`server/tests/store.test.ts` 覆盖冻结阻断 | 已验证 |
| 需求追溯 | `client/src/components/TraceabilityView.tsx`、`DocPreview.tsx` 的 traceability tab；`server/src/store.ts` 检查功能、验收、任务、技术线索断链 | 已完成 |
| 审计日志 | `server/src/types.ts`、`server/src/store.ts` 记录 `AuditEvent`；`server/src/routes/session.ts` 暴露 `/audit`；`client/src/components/AuditView.tsx` 展示；API 测试断言创建、质量、评审、导出审计事件 | 已验证 |
| 工作区隔离 | `server/src/access.ts`、`server/src/store.ts`、`server/src/routes/session.ts` 使用 `workspaceId` 和 `x-reqflow-workspace`；API 测试覆盖跨工作区 403 和列表隔离 | 已验证 |
| 角色边界 | `server/src/access.ts` 定义 viewer/reviewer/editor/admin；路由按最低角色拦截；API 测试覆盖 viewer 被禁止做质量检查、trusted-header 缺失/非法角色被拒绝 | 已验证 |
| 企业身份接入边界 | `REQFLOW_AUTH_MODE=trusted-header` 要求可信网关注入身份头；`/api/health` 和 `/api/ready` 作为运维探针放行；测试覆盖 readiness 不被 trusted-header 拦截 | 已验证 |
| 评审签核 | `server/src/store.ts` 的 `submitReview` 和冻结前 review gate；`client/src/components/ReviewView.tsx`；API/store 测试覆盖未评审冻结失败、评审通过后可冻结 | 已验证 |
| 规格包交付 | `server/src/store.ts` 的 `exportMarkdown` 导出宪法、需求、技术、验收、任务、风险、决策、问题、评审、审计和质量；网站工作台有“导出规格包”按钮；e2e 覆盖下载 `.md` | 已验证 |
| 部署可用 | `Dockerfile` 单端口托管 API + React build；`docker-compose.yml` 挂载数据卷并使用 `/api/ready` healthcheck；`DEPLOYMENT.md` 记录环境变量和运行方式；本轮 Docker build 通过 | 已验证 |
| CI 和上线前真实模型烟测 | `.github/workflows/ci.yml` 覆盖测试、构建、审计、Docker build；`.github/workflows/llm-smoke.yml` 手动读取 secret 并跑网站烟测 | 已完成 |
| LLM 评测基准 | `server/evals/llm-eval-cases.json`、`server/scripts/run-llm-evals.ts`、`server/evals/README.md`、`npm run eval:llm` | 已完成 |
| 密钥安全 | `.env.example` 只写占位值；本轮使用 `rg` 扫描用户提供的真实 key 前缀和真实 key 环境变量赋值模式，排除 `node_modules`、数据目录和构建产物后无命中 | 已验证 |

## Commands Verified In This Audit

```bash
(cd server && npm test)
(cd server && npm run build)
(cd client && npm run test:e2e)
docker build -t reqflow:ready-check .
git diff --check
rg -n "<redacted-real-key-prefix>|<redacted-real-key-env-assignment-pattern>" . -g '!node_modules' -g '!server/data' -g '!data' -g '!client/dist' -g '!server/dist'
find client -maxdepth 2 \( -name 'test-results' -o -name 'playwright-report' \) -print
```

结果：

- 后端测试：10 tests，9 pass，1 skip。跳过项是默认不调用真实模型的 LLM 集成测试。
- 后端构建：通过。
- 网站 Playwright 烟测：1 passed，真实浏览器走通核心网站工作流。
- Docker build：通过。
- `git diff --check`：通过。
- 密钥扫描：无命中。
- Playwright 临时产物：已清理，无残留输出。

## Completion Decision

本轮用户明确提出的要求已经有对应实现和验证证据：真实 LLM、DeepSeek 模型、网站整体流程、流程自循环、非专家 AI 决策辅助、企业基础能力、部署和测试闭环均已覆盖。

仍可继续增强的方向包括正式 SSO/组织成员管理、多 Agent 分工、企业模板库、指标看板和更细粒度权限策略。这些属于后续产品化路线图，不阻断当前“企业级适用的 AI-native 需求分析工具”目标的完成判断。
