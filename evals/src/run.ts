/**
 * Runs the golden set through the real script writer and claim checker.
 *   pnpm eval            # all cases
 *   pnpm eval celebrity  # cases whose id contains "celebrity"
 * Writes a JSON + Markdown report to evals/reports and exits 1 below the pass threshold,
 * so CI can block prompt changes that make scripts worse. Costs roughly $0.10 per case.
 */
import { checkClaims, JUDGE_PROMPT_VERSION, writeScript, WRITER_PROMPT_VERSION, type AiContext } from "@content-engine/ai";
import { requireFeature } from "@content-engine/config";
import type { UsageRecord } from "@content-engine/core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CASES } from "./cases";
import { gradeScript, type GradeResult } from "./graders";

const PASS_THRESHOLD = 0.85;

requireFeature("claude");
const filter = process.argv[2];
const cases = CASES.filter((testCase) => !filter || testCase.id.includes(filter));
const usage: UsageRecord[] = [];
const ctx: AiContext = { trendId: null, recordUsage: async (record) => void usage.push(record) };

interface CaseReport {
  id: string;
  grades: GradeResult[];
  claimCheckPassed: boolean;
  issues: string[];
  error?: string;
}

const reports: CaseReport[] = [];
for (const testCase of cases) {
  process.stdout.write(`- ${testCase.id} … `);
  try {
    const script = await writeScript(ctx, testCase.dossier);
    const check = await checkClaims(ctx, script, testCase.dossier.evidence);
    const grades = gradeScript(script, testCase);
    reports.push({ id: testCase.id, grades, claimCheckPassed: check.passed, issues: check.issues });
    const failed = grades.filter((grade) => !grade.passed).length + (check.passed ? 0 : 1);
    console.log(failed === 0 ? "pass" : `${failed} failing check(s)`);
  } catch (error) {
    reports.push({ id: testCase.id, grades: [], claimCheckPassed: false, issues: [], error: String(error) });
    console.log(`error: ${String(error)}`);
  }
}

const checks = reports.flatMap((report) => [...report.grades.map((grade) => grade.passed), report.claimCheckPassed]);
const passRate = checks.length ? checks.filter(Boolean).length / checks.length : 0;
const cost = usage.reduce((sum, record) => sum + record.costUsd, 0);

const dir = path.join(import.meta.dirname, "..", "reports");
await mkdir(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const summary = { writer: WRITER_PROMPT_VERSION, judge: JUDGE_PROMPT_VERSION, passRate, costUsd: cost, threshold: PASS_THRESHOLD, reports };
await writeFile(path.join(dir, `${stamp}.json`), JSON.stringify(summary, null, 2));
await writeFile(
  path.join(dir, `${stamp}.md`),
  [
    `# Eval ${stamp}`,
    `Writer ${WRITER_PROMPT_VERSION}, judge ${JUDGE_PROMPT_VERSION}. Pass rate **${(passRate * 100).toFixed(1)}%** (threshold ${PASS_THRESHOLD * 100}%). Cost $${cost.toFixed(2)}.`,
    "",
    "| Case | Failing checks |",
    "|---|---|",
    ...reports.map(
      (r) =>
        `| ${r.id} | ${r.error ?? ([...r.grades.filter((g) => !g.passed).map((g) => `${g.name} (${g.detail})`), ...(r.claimCheckPassed ? [] : ["claim check"])].join("; ") || "none")} |`,
    ),
  ].join("\n"),
);

console.log(
  `\nPass rate ${(passRate * 100).toFixed(1)}% over ${checks.length} checks · cost $${cost.toFixed(2)} · report in evals/reports/${stamp}.md`,
);
process.exit(passRate >= PASS_THRESHOLD ? 0 : 1);
