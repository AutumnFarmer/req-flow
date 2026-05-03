import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

type EvalCase = {
  id: string;
  title: string;
  idea: string;
  message: string;
  advicePrompt: string;
  minFeatures: number;
  minNonGoals: number;
  expectedKeywords: string[];
};

type Check = {
  name: string;
  passed: boolean;
  points: number;
  detail?: string;
};

dotenv.config();
process.env.REQFLOW_DATA_DIR ||= mkdtempSync(path.join(tmpdir(), 'reqflow-llm-evals-'));

const threshold = Number(process.env.REQFLOW_EVAL_THRESHOLD || 80);
const runFull = process.env.REQFLOW_EVAL_FULL === '1';
const casesPath = process.env.REQFLOW_EVAL_CASES || path.resolve('evals/llm-eval-cases.json');

function loadCases(): EvalCase[] {
  const parsed = JSON.parse(readFileSync(casesPath, 'utf8')) as EvalCase[];
  assert(Array.isArray(parsed) && parsed.length > 0, 'No eval cases found');
  return parsed;
}

function check(name: string, passed: boolean, points: number, detail?: string): Check {
  return { name, passed, points, detail };
}

function scoreChecks(checks: Check[]) {
  return checks.reduce((sum, item) => sum + (item.passed ? item.points : 0), 0);
}

function hasAnyKeyword(value: unknown, keywords: string[]) {
  const content = JSON.stringify(value);
  return keywords.some((keyword) => content.includes(keyword));
}

async function main() {
  const { getProviderLabel, hasLLMConfig } = await import('../src/ai.ts');
  const { acceptProposal, createSession, runQualityCheck } = await import('../src/store.ts');
  const { handleLLMAssistantTurn } = await import('../src/llm.ts');

  if (!hasLLMConfig()) {
    throw new Error('LLM eval requires OPENAI_API_KEY, OPENAI_BASE_URL and OPENAI_MODEL');
  }

  const cases = loadCases();
  const results = [];

  for (const item of cases) {
    const session = createSession(item.idea, 'llm-eval');
    const proposalResult = await handleLLMAssistantTurn(session, item.message, 'idea');
    const proposal = proposalResult.proposal;
    const docs = proposal?.proposedDocuments;
    const requirement = docs?.requirement;
    const constitution = docs?.constitution;
    const pendingProposalId = session.pendingProposal?.id;

    const advice = await handleLLMAssistantTurn(session, item.advicePrompt, 'advise');
    const checks: Check[] = [
      check('proposal created', Boolean(proposal), 10),
      check('constitution generated', Boolean(constitution?.oneSentence), 10),
      check('requirement generated', Boolean(requirement?.overview?.goal), 10),
      check('minimum feature count', (requirement?.features.length || 0) >= item.minFeatures, 10, `features=${requirement?.features.length || 0}`),
      check('has P0 feature', Boolean(requirement?.features.some((feature) => feature.priority === 'P0')), 10),
      check('scope has non-goals', (constitution?.nonGoals.length || 0) >= item.minNonGoals, 10, `nonGoals=${constitution?.nonGoals.length || 0}`),
      check('expected domain keywords present', hasAnyKeyword(docs, item.expectedKeywords), 10),
      check('advice is read-only', !advice.proposal && session.pendingProposal?.id === pendingProposalId, 15),
      check('advice is useful', advice.message.length >= 80, 5, `length=${advice.message.length}`),
    ];

    if (proposal) {
      acceptProposal(session, proposal.id, 'llm-eval');
      const draftReport = runQualityCheck(session, 'draft');
      checks.push(check('accepted draft has no blockers', draftReport.blockers.length === 0, 10, draftReport.blockers.join('；')));
    } else {
      checks.push(check('accepted draft has no blockers', false, 10, 'missing proposal'));
    }

    if (runFull) {
      const acceptanceResult = await handleLLMAssistantTurn(session, '请继续生成验收标准和开发任务拆解。', 'generate-acceptance');
      const acceptanceProposal = acceptanceResult.proposal;
      checks.push(check('acceptance proposal created', Boolean(acceptanceProposal?.proposedDocuments.acceptance), 10));
      checks.push(check('task plan proposal created', Boolean(acceptanceProposal?.proposedDocuments.taskPlan), 10));
      if (acceptanceProposal) acceptProposal(session, acceptanceProposal.id, 'llm-eval');

      const techResult = await handleLLMAssistantTurn(session, '请继续生成稳妥、低风险、易维护的技术方案。', 'generate-tech');
      const techProposal = techResult.proposal;
      checks.push(check('tech proposal created', Boolean(techProposal?.proposedDocuments.tech), 10));
      if (techProposal) acceptProposal(session, techProposal.id, 'llm-eval');

      const reviewReport = runQualityCheck(session, 'review');
      checks.push(check('review stage has no blockers', reviewReport.blockers.length === 0, 10, reviewReport.blockers.join('；')));
    }

    const score = Math.round((scoreChecks(checks) / checks.reduce((sum, item) => sum + item.points, 0)) * 100);
    results.push({
      id: item.id,
      title: item.title,
      score,
      passed: score >= threshold,
      failedChecks: checks.filter((entry) => !entry.passed).map((entry) => ({
        name: entry.name,
        detail: entry.detail,
      })),
    });
  }

  const summary = {
    provider: getProviderLabel(),
    threshold,
    full: runFull,
    passed: results.every((item) => item.passed),
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.passed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
