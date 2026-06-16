/*
 * Style Compliance Linter
 * 
 * 强制执行样式规范的自动化检查工具
 * 
 * 规则：
 * 1. 所有管理端页面必须使用 AdminPageTemplate
 * 2. 必须使用 shadcn/ui 组件（Button, Input, Select 等）
 * 3. 禁止使用原生 button 元素
 * 4. 禁止在组件上使用零散的 Tailwind 工具类覆盖样式
 * 
 * 使用方式：
 *   在开发环境自动运行，检测违规并报错
 */

import {readFileSync} from 'fs';
import {join} from 'path';

interface Violation {
    filePath: string;
    line: number;
    column: number;
    message: string;
    rule: string;
}

interface LinterResult {
    violations: Violation[];
    passed: boolean;
}

const ADMIN_PAGES_DIR = join(__dirname, '../../pages/admin');

// 规则定义
const RULES = {
    MUST_USE_ADMIN_TEMPLATE: 'STYLE-001',
    MUST_USE_SHADCN_BUTTON: 'STYLE-002',
    FORBIDDEN_NATIVE_BUTTON: 'STYLE-003',
    FORBIDDEN_RAW_TAILWIND: 'STYLE-004',
};

// 禁止的原生元素和属性组合
const FORBIDDEN_PATTERNS = [
    {
        rule: RULES.FORBIDDEN_NATIVE_BUTTON,
        pattern: /<button[^>]*className=/g,
        message: '禁止使用原生 <button> 元素，请使用 shadcn/ui 的 <Button> 组件',
    },
    {
        rule: RULES.FORBIDDEN_RAW_TAILWIND,
        pattern: /className="[^"]*\b(?:bg-indigo-|bg-slate-|text-slate-|text-white|h-9|px-4|py-2|rounded-lg)\b[^"]*"/g,
        message: '禁止在组件上使用零散的 Tailwind 工具类，请使用 shadcn/ui 组件的 variant/size 属性',
    },
];

export function lintAdminPage(filePath: string): LinterResult {
    const violations: Violation[] = [];
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // 规则1：检查是否使用了 AdminPageTemplate
    if (!content.includes('AdminPageTemplate')) {
        violations.push({
            filePath,
            line: 1,
            column: 1,
            message: '管理端页面必须使用 AdminPageTemplate 组件',
            rule: RULES.MUST_USE_ADMIN_TEMPLATE,
        });
    }

    // 规则2：检查是否导入了 Button 组件
    if (!content.includes("from '@/components/ui/button'") && 
        !content.includes("from '../../components/ui/button'")) {
        if (content.includes('<Button')) {
            violations.push({
                filePath,
                line: 1,
                column: 1,
                message: 'Button 组件必须从 @/components/ui/button 导入',
                rule: RULES.MUST_USE_SHADCN_BUTTON,
            });
        }
    }

    // 规则3：禁止原生 button
    for (const forbidden of FORBIDDEN_PATTERNS) {
        let match;
        const regex = new RegExp(forbidden.pattern.source, 'g');
        
        while ((match = regex.exec(content)) !== null) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            const colNum = match.index - content.lastIndexOf('\n', match.index);
            
            violations.push({
                filePath,
                line: lineNum,
                column: colNum,
                message: forbidden.message,
                rule: forbidden.rule,
            });
        }
    }

    // 检查 Breadcrumb 是否重复（页面内部不应有独立面包屑）
    if (content.includes('BreadcrumbList') && content.includes('AdminPageTemplate')) {
        violations.push({
            filePath,
            line: 1,
            column: 1,
            message: '面包屑已由 AdminPageTemplate 统一管理，页面内部不应重复定义',
            rule: 'STYLE-005',
        });
    }

    return {
        violations,
        passed: violations.length === 0,
    };
}

export function lintAllAdminPages(): LinterResult {
    const allViolations: Violation[] = [];
    const fs = require('fs').promises;
    const path = require('path');

    // 同步读取目录
    const syncFs = require('fs');
    const files = syncFs.readdirSync(ADMIN_PAGES_DIR);
    
    for (const file of files) {
        if (file.endsWith('.tsx')) {
            const filePath = join(ADMIN_PAGES_DIR, file);
            const result = lintAdminPage(filePath);
            allViolations.push(...result.violations);
        }
    }

    return {
        violations: allViolations,
        passed: allViolations.length === 0,
    };
}

export function printViolations(result: LinterResult): void {
    if (result.passed) {
        console.log('\x1b[32m✓ 所有页面样式合规检查通过\x1b[0m');
        return;
    }

    console.log('\x1b[31m✗ 样式合规检查失败\x1b[0m');
    console.log(`发现 ${result.violations.length} 个违规:\n`);

    for (const violation of result.violations) {
        console.log(`\x1b[33m[${violation.rule}]\x1b[0m ${violation.filePath}`);
        console.log(`  第 ${violation.line} 行, 第 ${violation.column} 列`);
        console.log(`  ${violation.message}\n`);
    }
}

// 在开发环境自动运行检查
if (process.env.NODE_ENV === 'development') {
    const result = lintAllAdminPages();
    printViolations(result);
    
    if (!result.passed) {
        // 在开发环境抛出错误，强制修复
        throw new Error('样式合规检查失败，请修复以上问题');
    }
}
