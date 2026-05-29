import { buildReportContext } from './context-builder.mjs';
import { reviewReportSafety } from './safety-review.mjs';

export function assembleReportRun({ input, features, rules, knowledge, template, report }) {
  const context = buildReportContext({ input, features, rules, knowledge, template });
  const safety = reviewReportSafety(JSON.stringify(report));
  return { context, safety, report };
}
