# ReqFlow - AI 需求澄清工作台

一个可视化的、可交互的 AI-Native 需求澄清工具。

从一句话想法出发，通过“澄清问题 → 变更提案 → 用户确认 → 质量检查 → 版本快照”的受控循环，把模糊想法变成清晰的可执行方案。

## 核心功能

- **受控需求澄清**：先生成变更提案，用户确认后才修改正式文档
- **需求宪法**：锁定产品核心定义，降低多轮对话后的方向漂移
- **质量闸门**：检查完整性、一致性、可测试性和冻结条件
- **版本快照**：每次接受提案后自动保存，可回滚
- **原型预览**：生成 HTML 原型，使用 sandbox iframe 渲染
- **命令系统**：`/review` `/quality` `/generate-tech` `/generate-acceptance` `/freeze` `/reset`

## 快速开始

```bash
# 安装依赖
cd server && npm install
cd ../client && npm install

# 启动后端
cd server && npm run dev

# 启动前端
cd client && npm run dev

# 访问 http://localhost:5173
```

## 使用流程

1. 输入你的模糊想法
2. 系统生成第一版需求提案
3. 接受提案后生成正式需求文档和版本快照
4. 继续生成技术方案、验收标准和原型
5. 质量检查通过后 `/freeze` 冻结规格包
