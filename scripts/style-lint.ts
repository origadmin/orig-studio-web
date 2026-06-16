#!/usr/bin/env ts-node

/*
 * Style Compliance Linter CLI
 * 
 * 运行方式：
 *   npm run style-lint
 *   npx ts-node scripts/style-lint.ts
 * 
 * 在 CI/CD 中使用：
 *   npm run style-lint -- --strict
 */

import {lintAllAdminPages, printViolations} from '../src/lib/styles/style-linter';

const args = process.argv.slice(2);
const strictMode = args.includes('--strict');

function main() {
    console.log('🚀 运行样式合规检查...\n');
    
    const result = lintAllAdminPages();
    printViolations(result);
    
    if (!result.passed && strictMode) {
        process.exit(1);
    }
}

main();
