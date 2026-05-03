import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import dotenv from 'dotenv';

dotenv.config();
process.env.REQFLOW_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'reqflow-llm-test-'));

const shouldRun = process.env.RUN_LLM_TESTS === '1';
const hasApiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

test('real LLM generates a structured requirement proposal', {
  skip: shouldRun ? false : 'Set RUN_LLM_TESTS=1 or run npm run test:llm to call the configured LLM API',
  timeout: 120_000,
}, async () => {
  assert.ok(hasApiKey, 'OPENAI_API_KEY is required for real LLM integration tests. Configure server/.env or the shell environment.');

  const { createSession } = await import('../src/store.ts');
  const { getProviderLabel, hasLLMConfig } = await import('../src/ai.ts');
  const { handleLLMAssistantTurn } = await import('../src/llm.ts');

  assert.equal(hasLLMConfig(), true, `LLM config is incomplete for ${getProviderLabel()}`);

  const session = createSession('为中型企业做一个 AI 原生需求分析工作台，支持需求澄清、验收标准和规格包导出');
  const result = await handleLLMAssistantTurn(
    session,
    '第一版面向产品经理和业务分析师，必须能形成可开发、可验收、可追溯的需求规格包。',
    'idea',
  );

  assert.equal(result.recommendedAction, 'accept_proposal');
  assert.ok(result.proposal, 'LLM should return a pending proposal');
  assert(result.proposal.impactTargets.includes('constitution'));
  assert(result.proposal.impactTargets.includes('requirement'));
  assert.ok(result.proposal.proposedDocuments.constitution?.oneSentence);
  assert.ok(result.proposal.proposedDocuments.requirement?.features.length);
  assert.equal(session.pendingProposal?.id, result.proposal.id);

  const pendingProposalId = session.pendingProposal?.id;
  const advice = await handleLLMAssistantTurn(
    session,
    '我没有产品经验，请解释我是否应该接受当前提案，并说明默认建议、风险和下一步。',
    'advise',
  );

  assert.equal(advice.proposal, null);
  assert.equal(advice.recommendedAction, 'answer_questions');
  assert.ok(advice.message.length > 20);
  assert.equal(session.pendingProposal?.id, pendingProposalId);
});
