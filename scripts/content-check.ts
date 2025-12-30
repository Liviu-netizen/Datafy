process.env.CONTENT_CHECK = "true";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runContentChecks } = require("../lib/lessons");

const issues = runContentChecks();

if (!issues.length) {
  console.log("Content check passed.");
  process.exit(0);
}

issues.forEach((issue: { day: number; issues: string[] }) => {
  console.log(`Day ${issue.day}: ${issue.issues.join(" ")}`);
});

process.exit(1);
