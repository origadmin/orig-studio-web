#!/usr/bin/env bun

/*
 * Style Backup & Restore Tool
 * 
 * 安全保障工具：
 * 1. 在重构前备份所有页面样式
 * 2. 支持一键回退到任意版本
 * 3. 提供预览对比功能
 * 
 * 运行方式：
 *   npm run style-backup           # 创建备份
 *   npm run style-restore <backup-name>  # 恢复备份
 *   npm run style-compare          # 对比当前与备份
 */

import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'fs';
import {join, basename} from 'path';

const ADMIN_PAGES_DIR = join(__dirname, '../src/pages/admin');
const BACKUP_DIR = join(__dirname, '../.style-backups');

interface Backup {
    name: string;
    timestamp: string;
    files: Record<string, string>;
}

export function createBackup(name?: string): string {
    const backupName = name || `backup-${Date.now()}`;
    const backupPath = join(BACKUP_DIR, `${backupName}.json`);
    
    if (!existsSync(BACKUP_DIR)) {
        mkdirSync(BACKUP_DIR, {recursive: true});
    }
    
    const files: Record<string, string> = {};
    const fs = require('fs');
    const dirFiles = fs.readdirSync(ADMIN_PAGES_DIR);
    
    for (const file of dirFiles) {
        if (file.endsWith('.tsx')) {
            const filePath = join(ADMIN_PAGES_DIR, file);
            files[file] = readFileSync(filePath, 'utf-8');
        }
    }
    
    const backup: Backup = {
        name: backupName,
        timestamp: new Date().toISOString(),
        files,
    };
    
    writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`✅ 备份创建成功: ${backupName}`);
    return backupName;
}

export function restoreBackup(name: string): boolean {
    const backupPath = join(BACKUP_DIR, `${name}.json`);
    
    if (!existsSync(backupPath)) {
        console.log(`❌ 备份不存在: ${name}`);
        return false;
    }
    
    const backup: Backup = JSON.parse(readFileSync(backupPath, 'utf-8'));
    
    for (const [file, content] of Object.entries(backup.files)) {
        const filePath = join(ADMIN_PAGES_DIR, file);
        writeFileSync(filePath, content);
    }
    
    console.log(`✅ 备份恢复成功: ${name}`);
    return true;
}

export function listBackups(): string[] {
    if (!existsSync(BACKUP_DIR)) {
        return [];
    }
    
    const fs = require('fs');
    return fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
}

export function compareWithBackup(name: string): void {
    const backupPath = join(BACKUP_DIR, `${name}.json`);
    
    if (!existsSync(backupPath)) {
        console.log(`❌ 备份不存在: ${name}`);
        return;
    }
    
    const backup: Backup = JSON.parse(readFileSync(backupPath, 'utf-8'));
    const fs = require('fs');
    const dirFiles = fs.readdirSync(ADMIN_PAGES_DIR);
    
    console.log(`\n📊 与备份 ${name} 的差异对比:\n`);
    
    for (const file of dirFiles) {
        if (file.endsWith('.tsx')) {
            const currentContent = readFileSync(join(ADMIN_PAGES_DIR, file), 'utf-8');
            const backupContent = backup.files[file];
            
            if (currentContent !== backupContent) {
                const currentLines = currentContent.split('\n').length;
                const backupLines = backupContent?.split('\n').length || 0;
                console.log(`🔄 ${file}: ${backupLines} → ${currentLines} 行`);
            }
        }
    }
    
    console.log('\n✅ 对比完成');
}

function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'create':
            createBackup(args[1]);
            break;
        case 'restore':
            restoreBackup(args[1]);
            break;
        case 'list':
            console.log('📋 可用备份:');
            listBackups().forEach(b => console.log(`  - ${b}`));
            break;
        case 'compare':
            compareWithBackup(args[1] || listBackups().pop() || '');
            break;
        default:
            console.log(`
用法:
  npm run style-backup create [name]    创建备份
  npm run style-backup restore <name>   恢复备份
  npm run style-backup list             列出所有备份
  npm run style-backup compare [name]   对比当前与备份
            `);
    }
}

main();
