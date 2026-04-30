import { Router } from 'express';
import { getOpenAIClient, getModel } from '../ai.js';
import { getSession, updateSession } from '../store.js';
import type { RequirementDoc, TechDoc, AcceptanceDoc, PrototypeDoc } from '../store.js';

export const chatRouter = Router();

const SYSTEM_PROMPT = `你是 AI 全栈产品团队，协助用户从模糊想法到可执行方案。你同时扮演产品经理、架构师、设计师、测试工程师、文档专家。

## 工作原则
1. 每轮只问 2-3 个最关键的问题，不要一次问太多
2. 问题要具体，给选项引导（A/B/C），不要问开放式问题
3. 根据用户回答，逐步锁定：目标用户、核心场景、功能边界、关键规则
4. 当需求足够清晰时，主动提出生成需求文档

## 输出格式约定
- 回复中如需更新文档，使用以下标记：

### 需求文档更新
\`\`\`requirement
{
  "productDef": { "description": "...", "targetUsers": "...", "coreValue": "..." },
  "features": [{ "priority": "P0/P1/P2", "name": "...", "description": "...", "notes": "..." }],
  "excluded": ["..."],
  "rules": ["..."],
  "pendingQuestions": ["..."]
}
\`\`\`

### 技术方案更新
\`\`\`tech
{
  "techStack": [{ "tech": "...", "reason": "..." }],
  "modules": [{ "name": "...", "description": "...", "dependencies": [] }],
  "dataModels": [{ "name": "...", "fields": [{ "name": "...", "type": "...", "required": true, "description": "..." }] }],
  "apis": [{ "method": "GET/POST/PUT/DELETE", "path": "...", "description": "..." }]
}
\`\`\`

### 验收标准更新
\`\`\`acceptance
{
  "features": [{ "name": "...", "cases": [{ "scenario": "...", "operation": "...", "expected": "...", "boundary": "..." }] }]
}
\`\`\`

### 原型更新
\`\`\`prototype
{
  "pages": ["页面1", "页面2"]
}
\`\`\`
（原型HTML会在单独的请求中生成）

### 阶段变更
\`\`\`stage
clarify/draft/review/frozen
\`\`\`

你可以同时输出多个更新标记。不要输出无关的代码块。`;

const PROTOTYPE_PROMPT = `你是一位 UI/UX 设计师 + 前端开发。
根据以下需求，生成可交互的 HTML 原型页面。
- 使用 Tailwind CSS（通过 CDN）
- 包含真实的布局、导航、表单、列表等元素
- 使用合理的占位内容
- 输出单个完整的 HTML 文件，浏览器可直接打开
- 页面要美观、现代、有设计感
- 如果有多个页面，用 tab 或导航切换`;

function parseDocUpdates(content: string) {
  const result: {
    requirement?: RequirementDoc;
    tech?: TechDoc;
    acceptance?: AcceptanceDoc;
    prototype?: { pages: string[] };
    stage?: string;
  } = {};

  const reqMatch = content.match(/```requirement\n([\s\S]*?)```/);
  if (reqMatch) {
    try { result.requirement = JSON.parse(reqMatch[1]); } catch {}
  }

  const techMatch = content.match(/```tech\n([\s\S]*?)```/);
  if (techMatch) {
    try { result.tech = JSON.parse(techMatch[1]); } catch {}
  }

  const accMatch = content.match(/```acceptance\n([\s\S]*?)```/);
  if (accMatch) {
    try { result.acceptance = JSON.parse(accMatch[1]); } catch {}
  }

  const protoMatch = content.match(/```prototype\n([\s\S]*?)```/);
  if (protoMatch) {
    try { result.prototype = JSON.parse(protoMatch[1]); } catch {}
  }

  const stageMatch = content.match(/```stage\n(\w+)\n```/);
  if (stageMatch) {
    result.stage = stageMatch[1];
  }

  return result;
}

// 主对话接口（SSE 流式）
chatRouter.post('/:id/stream', async (req, res) => {
  const { message, command } = req.body as { message: string; command?: string };
  const session = getSession(req.params.id);

  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const openai = getOpenAIClient();

    // 构建上下文
    const contextMsgs = session.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let userMsg = message;
    if (command === 'reset') {
      userMsg = `[用户执行了 /reset 命令，推翻重来] 让我们重新开始，重新澄清需求。`;
    } else if (command === 'review') {
      userMsg = `[用户执行了 /review 命令] 请审阅当前状态，总结已确定的内容和待确认项。`;
    } else if (command === 'freeze') {
      userMsg = `[用户执行了 /freeze 命令] 用户确认需求已清晰，请冻结当前状态，输出最终摘要。`;
    } else if (command === 'generate-prototype') {
      userMsg = `请为当前需求生成页面原型。列出需要哪些页面。`;
    } else if (command === 'generate-tech') {
      userMsg = `请为当前需求生成技术方案，包括技术选型、模块划分、数据模型、API设计。`;
    } else if (command === 'generate-acceptance') {
      userMsg = `请为当前需求生成验收标准。`;
    }

    contextMsgs.push({ role: 'user', content: userMsg });

    const stream = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + `\n\n## 当前会话状态\n想法: ${session.idea}\n阶段: ${session.stage}\n版本: ${session.version}` },
        ...contextMsgs,
      ],
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        send('delta', { content: delta });
      }
    }

    // 解析文档更新
    const updates = parseDocUpdates(fullContent);
    const updateData: any = {};

    if (updates.requirement) {
      updateData.requirement = updates.requirement;
    }
    if (updates.tech) {
      updateData.tech = updates.tech;
    }
    if (updates.acceptance) {
      updateData.acceptance = updates.acceptance;
    }
    if (updates.prototype) {
      updateData.prototype = {
        ...session.prototype,
        pages: updates.prototype.pages,
      };
    }
    if (updates.stage) {
      updateData.stage = updates.stage;
    }

    // 版本号 +1
    if (Object.keys(updateData).length > 0) {
      updateData.version = session.version + 1;
    }

    // 保存消息
    session.messages.push({ role: 'user', content: userMsg, timestamp: Date.now() });
    session.messages.push({ role: 'assistant', content: fullContent, timestamp: Date.now() });

    if (Object.keys(updateData).length > 0) {
      updateSession(req.params.id, updateData);
      if (updateData.version) {
        session.changelog.push({
          version: updateData.version,
          action: 'update',
          detail: Object.keys(updates).filter(k => k !== 'stage').join(', ') || '阶段变更',
        });
      }
    }

    send('done', { updates: Object.keys(updates) });
  } catch (err: any) {
    send('error', { message: err.message || 'AI 服务异常' });
  }

  res.end();
});

// 生成原型 HTML
chatRouter.post('/:id/prototype', async (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }

  if (!session.requirement) {
    res.status(400).json({ error: '请先生成需求文档' });
    return;
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: PROTOTYPE_PROMPT },
        {
          role: 'user',
          content: `需求：\n${JSON.stringify(session.requirement, null, 2)}\n\n页面列表：${session.prototype?.pages?.join(', ') || '根据需求自动设计'}\n\n请生成完整的 HTML 原型文件。只输出 HTML 代码，不要其他内容。`,
        },
      ],
    });

    let html = completion.choices[0]?.message?.content || '';
    // 清理 markdown 代码块标记
    html = html.replace(/^```html?\n?/, '').replace(/\n?```$/, '');

    const prototype: PrototypeDoc = {
      html,
      pages: session.prototype?.pages || [],
    };

    updateSession(req.params.id, { prototype });

    res.json({ html });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '生成原型失败' });
  }
});
