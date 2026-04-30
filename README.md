# ReqFlow - AI 需求澄清工作台

一个可视化的、可交互的 AI-Native 需求澄清工具。

从一句话想法出发，AI 扮演产品经理逐步追问，帮你把模糊想法变成清晰的可执行方案。

## 核心功能

- **AI 对话澄清**：AI 产品经理逐步追问，帮你明确需求
- **实时文档生成**：需求摘要、技术方案、验收标准自动生成
- **原型预览**：AI 生成 HTML 原型，直接在页面中预览
- **迭代循环**：支持微调和推翻重来，版本自动管理
- **命令系统**：`/fix` `/idea` `/reset` `/review` `/freeze` 快捷操作

## 快速开始

```bash
# 安装依赖
cd server && npm install
cd ../client && npm install

# 配置 AI（编辑 server/.env）
OPENAI_API_KEY=your-key-here
OPENAI_BASE_URL=https://api.openai.com/v1  # 或其他兼容接口
OPENAI_MODEL=gpt-4o

# 启动后端
cd server && npm run dev

# 启动前端
cd client && npm run dev

# 访问 http://localhost:5173
```

## 使用流程

1. 输入你的模糊想法
2. AI 会逐步追问关键问题
3. 回答后 AI 自动更新需求文档
4. 审阅原型，不满意就迭代
5. 满意后 `/freeze` 冻结，导出开发规格
