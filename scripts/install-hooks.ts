#!/usr/bin/env bun
// Installs web/ git hooks by pointing core.hooksPath at this scripts/ dir.
// Runs automatically on `bun install` via package.json "prepare", so a fresh
// clone enforces the English Conventional Commits gate (commit-msg) and the
// shared pollution/design-placement gate (pre-commit) without manual setup.
//
// Hooks live in scripts/ (committed) instead of .git/hooks/ (local-only) so
// they are distributed with the repo. See BUG-214.
import { execSync } from "node:child_process";

const root = execSync("git rev-parse --show-toplevel").toString().trim();
const hooksPath = `${root}/scripts`;

try {
    execSync(`git config core.hooksPath "${hooksPath}"`, { stdio: "inherit" });
    console.log(`[OK] web core.hooksPath -> ${hooksPath}`);
} catch (err) {
    console.error("[WARN] failed to set web core.hooksPath:", err);
    process.exit(1);
}
