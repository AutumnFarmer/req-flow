import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAdvice, parseStructuredTurn } from '../src/llm.ts';

test('parseStructuredTurn accepts fenced structured JSON', () => {
  const parsed = parseStructuredTurn(`
\`\`\`json
{
  "message": "已生成提案",
  "proposal": {
    "summary": "形成第一版需求草案",
    "impactLevel": "medium",
    "reason": "根据用户想法生成",
    "proposedDocuments": {},
    "conflicts": []
  },
  "suggestedQuestions": ["目标用户是谁？"]
}
\`\`\`
`);

  assert.equal(parsed.proposal.summary, '形成第一版需求草案');
  assert.equal(parsed.suggestedQuestions[0], '目标用户是谁？');
});

test('parseStructuredTurn reports schema errors with field path', () => {
  assert.throws(
    () => parseStructuredTurn('{"message":"","proposal":{"summary":"","impactLevel":"bad","reason":"","proposedDocuments":{}}}'),
    /LLM 返回结构不合格/,
  );
});

test('parseStructuredTurn reports invalid JSON clearly', () => {
  assert.throws(
    () => parseStructuredTurn('not json'),
    /LLM 返回内容不是 JSON 对象/,
  );
});

test('parseAdvice accepts decision advice without proposal', () => {
  const parsed = parseAdvice(JSON.stringify({
    message: '默认建议：先做保守版本。',
    suggestedQuestions: ['为什么不先做复杂版本？'],
  }));

  assert.match(parsed.message, /默认建议/);
  assert.equal(parsed.suggestedQuestions.length, 1);
});
