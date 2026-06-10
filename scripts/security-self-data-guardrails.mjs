import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

function listFiles(globPattern) {
  const raw = execSync(`git ls-files "${globPattern}"`, { encoding: "utf8" });
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function isIgnored(path) {
  if (
    path.startsWith("components/admin/") ||
    path.startsWith("components/dashboard/") ||
    path.startsWith("app/dashboard/")
  ) {
    return true;
  }

  return (
    path.endsWith(".test.ts") ||
    path.endsWith(".test.tsx") ||
    path.endsWith(".spec.ts") ||
    path.endsWith(".spec.tsx")
  );
}

const sourceFiles = [
  ...listFiles("app/**/*.ts"),
  ...listFiles("app/**/*.tsx"),
  ...listFiles("components/**/*.ts"),
  ...listFiles("components/**/*.tsx"),
  ...listFiles("lib/**/*.ts"),
  ...listFiles("lib/**/*.tsx"),
  ...listFiles("hooks/**/*.ts"),
  ...listFiles("hooks/**/*.tsx"),
  ...listFiles("store/**/*.ts"),
  ...listFiles("store/**/*.tsx"),
].filter((path, index, arr) => arr.indexOf(path) === index);

const filesToScan = sourceFiles.filter((path) => !isIgnored(path));

const globalUsersViolations = [];
const selfReconstructionViolations = [];

for (const filePath of filesToScan) {
  const content = readText(filePath);
  if (!content) {
    continue;
  }

  const hasGlobalUsersReference = /api\.users\.list\(|\/api\/v1\/users/.test(content);
  const isAdminView = filePath.startsWith("components/admin/");

  if (hasGlobalUsersReference && !isAdminView) {
    globalUsersViolations.push(filePath);
  }

  const hasListSource = /api\.users\.list\(|\/api\/v1\/users/.test(content);
  const hasFilterOrFind = /\bfind\(|\bfilter\(/.test(content);
  const hasIdentitySignal = /\b(sub|preferred_username|currentUser|email)\b/.test(content);

  if (hasListSource && hasFilterOrFind && hasIdentitySignal) {
    selfReconstructionViolations.push(filePath);
  }
}

if (globalUsersViolations.length > 0) {
  console.error("Security policy violation: non-admin code references global users listing endpoint.");
  for (const filePath of globalUsersViolations) {
    console.error(` - ${filePath}`);
  }
}

if (selfReconstructionViolations.length > 0) {
  console.error("Security policy violation: suspected self-data reconstruction from a users list.");
  for (const filePath of selfReconstructionViolations) {
    console.error(` - ${filePath}`);
  }
}

if (globalUsersViolations.length > 0 || selfReconstructionViolations.length > 0) {
  process.exit(1);
}

console.log("Self data guardrails passed.");
