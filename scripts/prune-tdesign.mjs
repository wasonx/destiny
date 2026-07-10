#!/usr/bin/env node
/**
 * 清理 miniprogram_npm/tdesign-miniprogram 下未被任何页面引用的组件目录。
 *
 * 为什么需要这个脚本：
 *   tdesign-miniprogram 全量构建后会产出 100+ 组件目录，共约 3.6MB，
 *   触发微信小程序"source size exceed max limit 2MB"错误。
 *   本项目目前只用 button/cell/divider/icon/tag 等少量组件，
 *   其余组件目录应从 miniprogram_npm 中删除，让体积回到 2MB 以下。
 *
 * 使用场景：
 *   - 微信开发者工具点「构建 npm」之后，立即运行此脚本清理
 *   - 新增 TDesign 组件引用后：先在微信工具里「构建 npm」，再跑此脚本
 *
 * 运行：node scripts/prune-tdesign.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const MINI = path.join(ROOT, 'miniprogram');
const TDIST = path.join(MINI, 'miniprogram_npm', 'tdesign-miniprogram');

if (!fs.existsSync(TDIST)) {
  console.error('[prune-tdesign] miniprogram_npm/tdesign-miniprogram 不存在。');
  console.error('请先在微信开发者工具里点「工具 → 构建 npm」生成 miniprogram_npm，再跑此脚本。');
  process.exit(1);
}

function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walkJsonFiles(full)
      : (entry.isFile() && entry.name.endsWith('.json') ? [full] : []);
  });
}

const KEEP_ALWAYS = new Set(['common', 'miniprogram_npm', 'locale', 'mixins', 'shared']);

const referenced = new Set();
for (const file of walkJsonFiles(path.join(MINI, 'pages'))) {
  let json;
  try { json = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { continue; }
  const usingComponents = json.usingComponents || {};
  for (const value of Object.values(usingComponents)) {
    const m = String(value).match(/^tdesign-miniprogram\/([^/]+)/);
    if (m) referenced.add(m[1]);
  }
}
const appJsonPath = path.join(MINI, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    for (const value of Object.values(appJson.usingComponents || {})) {
      const m = String(value).match(/^tdesign-miniprogram\/([^/]+)/);
      if (m) referenced.add(m[1]);
    }
  } catch {}
}

const allDirs = fs.readdirSync(TDIST, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let removedCount = 0;
let removedBytes = 0;
const kept = [];

for (const dir of allDirs) {
  if (KEEP_ALWAYS.has(dir) || referenced.has(dir)) {
    kept.push(dir);
    continue;
  }
  const full = path.join(TDIST, dir);
  try {
    removedBytes += dirSize(full);
    fs.rmSync(full, { recursive: true, force: true });
    removedCount++;
  } catch (err) {
    console.error(`[prune-tdesign] 删除失败 ${dir}: ${err.message}`);
  }
}

function dirSize(p) {
  let total = 0;
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, entry.name);
    if (entry.isDirectory()) total += dirSize(full);
    else if (entry.isFile()) total += fs.statSync(full).size;
  }
  return total;
}

const finalSize = dirSize(TDIST);
console.log(`[prune-tdesign] 保留组件：${kept.sort().join(', ')}`);
console.log(`[prune-tdesign] 引用到的 TDesign 组件：${[...referenced].sort().join(', ') || '（无）'}`);
console.log(`[prune-tdesign] 删除未使用组件目录：${removedCount} 个，释放 ${(removedBytes / 1024).toFixed(1)} KB`);
console.log(`[prune-tdesign] 清理后 miniprogram_npm/tdesign-miniprogram 体积：${(finalSize / 1024).toFixed(1)} KB`);
