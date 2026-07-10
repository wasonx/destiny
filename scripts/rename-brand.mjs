#!/usr/bin/env node
/**
 * 批量替换项目内所有文本文件的「甄好算」→「甄好算」。
 * 排除 node_modules / miniprogram_npm / .workbuddy / __pycache__ / .git / dist / package-lock.json。
 * 英文标识 zhensuan/Zhensuan 保留不动（技术标识，单独决策）。
 *
 * 运行：node scripts/rename-brand.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const SKIP_DIRS = new Set([
  'node_modules', 'miniprogram_npm', '.workbuddy', '__pycache__', '.git',
  'dist', '.cache', 'design',
]);
const SKIP_FILES = new Set(['package-lock.json']);
const EXTENSIONS = new Set([
  '.js', '.mjs', '.ts', '.tsx', '.json', '.wxml', '.wxss',
  '.md', '.sql', '.py', '.html', '.css', '.wxs',
]);

const OLD = '甄好算';
const NEW = '甄好算';

let scanned = 0;
let changed = 0;
const changedFiles = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.isDirectory() && !SKIP_DIRS.has(e.name)) {
      out.push(...walk(path.join(dir, e.name)));
    } else if (e.isFile() && !SKIP_FILES.has(e.name)) {
      const ext = path.extname(e.name).toLowerCase();
      if (EXTENSIONS.has(ext)) out.push(path.join(dir, e.name));
    }
  }
  return out;
}

const files = walk(ROOT);
for (const file of files) {
  scanned++;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); }
  catch { continue; }
  if (!text.includes(OLD)) continue;
  const next = text.split(OLD).join(NEW);
  fs.writeFileSync(file, next, 'utf8');
  changed++;
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  changedFiles.push(rel);
}

console.log(`[rename-brand] 扫描 ${scanned} 个文本文件`);
console.log(`[rename-brand] 替换 ${changed} 个文件：「${OLD}」→「${NEW}」`);
console.log('[rename-brand] 改动清单：');
for (const f of changedFiles) console.log(`  ${f}`);
