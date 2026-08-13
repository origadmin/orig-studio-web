#!/usr/bin/env pwsh
param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMsgFile
)

$ErrorActionPreference = "Stop"

$commitMessage = Get-Content $CommitMsgFile -Raw -Encoding UTF8

$firstLine = ($commitMessage -split "`n")[0].Trim()

if ([string]::IsNullOrWhiteSpace($firstLine)) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Red
    Write-Host "  COMMIT REJECTED: Empty commit message" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Red
    exit 1
}

$errors = @()

# Block ALL CJK characters anywhere in the message (subject + body).
# Covers Chinese, Japanese kana, and Korean Jamo/Hangul ranges.
if ($commitMessage -match '[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]') {
    $errors += "COMMIT MESSAGE MUST BE IN ENGLISH: CJK characters detected in commit message.`n   Found: `"$firstLine`"`n   Commit messages must use English only for consistency across the team."
}

if ($firstLine.Length -gt 100) {
    $errors += "SUBJECT LINE TOO LONG: ${($firstLine.Length)} characters (max 100). Keep the subject concise."
}

$conventionalCommitPattern = '^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\([a-z0-9_-]+\))?: .{1,}'
if ($firstLine -notmatch $conventionalCommitPattern) {
    $errors += "NOT CONVENTIONAL COMMITS FORMAT: `"$firstLine`"`n   Expected format: <type>(<scope>): <subject>`n   Allowed types: feat, fix, docs, style, refactor, perf, test, chore, build, ci, revert`n   Example: fix(media): correct route registration order and Nginx proxy config"
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Red
    Write-Host "  COMMIT REJECTED: Invalid commit message" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Red
    Write-Host ""
    foreach ($e in $errors) {
        Write-Host "  [ERROR] $e" -ForegroundColor Red
        Write-Host ""
    }
    Write-Host "Please write commit messages in English following Conventional Commits format." -ForegroundColor Yellow
    Write-Host "Format: <type>(<scope>): <subject>" -ForegroundColor Yellow
    exit 1
}

Write-Host "  [OK] Commit message check passed" -ForegroundColor Green
exit 0
