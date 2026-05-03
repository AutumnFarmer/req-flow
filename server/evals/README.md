# LLM Eval Suite

ReqFlow 的 LLM 评测用于固定验证真实模型是否仍能支撑核心需求分析流程。

默认评测覆盖：

- 模糊想法生成结构化需求提案
- 提案中包含需求宪法和需求文档
- 需求文档包含 P0 功能、范围边界和领域关键词
- 只读 `/advise` 不创建新提案、不覆盖待确认提案
- 接受提案后的草稿质量检查没有阻断项

运行方式：

```bash
npm run eval:llm
```

需要配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL`。DeepSeek 示例：

```bash
OPENAI_API_KEY=你的 DeepSeek API Key \
OPENAI_BASE_URL=https://api.deepseek.com \
OPENAI_MODEL=deepseek-v4-flash \
npm run eval:llm
```

可选环境变量：

- `REQFLOW_EVAL_THRESHOLD=80`：单个案例最低分，默认 80。
- `REQFLOW_EVAL_FULL=1`：追加验收标准、任务拆解和技术方案生成评测。
- `REQFLOW_EVAL_CASES=evals/llm-eval-cases.json`：指定评测集文件。

评测输出是 JSON，适合接入 CI 或模型升级前的人工对比。
