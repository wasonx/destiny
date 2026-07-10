#!/usr/bin/env node
/**
 * 同步 + 清理 tdesign-miniprogram —— 一条命令替代微信开发者工具「构建 npm」。
 *
 * 流程：
 *   1. 检测 miniprogram_npm/tdesign-miniprogram 是否存在
 *      - 不存在或 --rebuild 时：从 node_modules/tdesign-miniprogram/miniprogram_dist 复制全量
 *      - 已存在：跳过复制（增量维护）
 *   2. 扫描 miniprogram/pages 下所有 json 和 app.json 的 usingComponents
 *   3. 保留实际引用的组件 + common/locale/mixins/miniprogram_npm/shared 等基础目录
 *   4. 删除其余未引用的组件目录，把体积从 ~3.6MB 压到 ~800KB（低于 2MB 小程序上限）
 *
 * 用法：
 *   node scripts/sync-tdesign.mjs           # 智能模式（缺则构建，有则清理）
 *   node scripts/sync-tdesign.mjs --rebuild # 强制重建（删了重来）
 *
 * 工作流：改代码用 TDesign 组件 → 跑此脚本 → 回微信开发者工具点「编译/预览」
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const MINI = path.join(ROOT, 'miniprogram');
const MNPM = path.join(MINI, 'miniprogram_npm');
const TDIST = path.join(MNPM, 'tdesign-miniprogram');
const SOURCE = path.join(MINI, 'node_modules', 'tdesign-miniprogram', 'miniprogram_dist');

const forceRebuild = process.argv.includes('--rebuild');

const KEEP_ALWAYS = new Set(['common', 'miniprogram_npm', 'locale', 'mixins', 'shared']);

function log(tag, msg) { console.log(`[sync-tdesign] ${tag}: ${msg}`); }

function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walkJsonFiles(full)
      : (entry.isFile() && entry.name.endsWith('.json') ? [full] : []);
  });
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

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

/* ---------------- 步骤 1：构建 miniprogram_npm（如需） ---------------- */

if (!fs.existsSync(SOURCE)) {
  log('error', '找不到 node_modules/tdesign-miniprogram/miniprogram_dist。');
  log('hint', '在 miniprogram/ 目录跑 `npm install` 装好 tdesign-miniprogram 再来。');
  process.exit(1);
}

const needRebuild =
  forceRebuild ||
  !fs.existsSync(TDIST) ||
  !fs.existsSync(path.join(TDIST, 'button', 'button.js'));

if (needRebuild) {
  if (forceRebuild && fs.existsSync(MNPM)) {
    fs.rmSync(MNPM, { recursive: true, force: true });
    log('clean', '强制重建：已删除旧 miniprogram_npm');
  }
  fs.mkdirSync(MNPM, { recursive: true });
  log('build', '从 node_modules 复制 tdesign-miniprogram 全量到 miniprogram_npm...');
  copyDir(SOURCE, TDIST);
  const built = dirSize(TDIST);
  log('build', `复制完成，miniprogram_npm/tdesign-miniprogram = ${(built / 1024).toFixed(1)} KB`);
} else {
  log('skip', 'miniprogram_npm 已存在且完整，跳过构建（用 --rebuild 强制重建）');
}

/* ---------------- 步骤 2：扫描页面 usingComponents ---------------- */

const referenced = new Set();
for (const file of walkJsonFiles(path.join(MINI, 'pages'))) {
  let json;
  try { json = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { continue; }
  for (const value of Object.values(json.usingComponents || {})) {
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
log('scan', `页面直接引用的 TDesign 组件：${[...referenced].sort().join(', ') || '（无）'}`);

/* ---------------- 步骤 2.5：递归解析组件间依赖链 ----------------
 * 例：button 依赖 t-loading(../loading/loading) 和 t-icon(../icon/icon)
 *     只看页面引用会漏掉 loading，导致 button.json 编译失败
 * 解决：读每个保留组件的 <comp>/<comp>.json，提取 ../<dep>/<dep> 依赖，递归收集
 */
function getComponentDeps(compName) {
  const jsonPath = path.join(TDIST, compName, `${compName}.json`);
  if (!fs.existsSync(jsonPath)) return [];
  try {
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const deps = [];
    for (const value of Object.values(json.usingComponents || {})) {
      const m = String(value).match(/^\.\.\/(?:\.\/)?([^/]+)\/[^/]+$/);
      if (m) deps.push(m[1]);
    }
    return deps;
  } catch { return []; }
}

function resolveAllDeps(initial) {
  const result = new Set(initial);
  const queue = [...initial];
  let added = 0;
  while (queue.length > 0) {
    const comp = queue.shift();
    if (KEEP_ALWAYS.has(comp)) continue;
    for (const dep of getComponentDeps(comp)) {
      if (!result.has(dep)) {
        result.add(dep);
        queue.push(dep);
        added++;
      }
    }
  }
  return { result, added };
}

const { result: referencedFull, added: depAdded } = resolveAllDeps(referenced);
if (depAdded > 0) {
  const extra = [...referencedFull].filter((c) => !referenced.has(c));
  log('deps', `组件依赖链额外保留 ${depAdded} 个：${extra.sort().join(', ')}`);
}
const referencedFinal = referencedFull;

/* ---------------- 步骤 3：清理未使用组件 ---------------- */

const allDirs = fs.readdirSync(TDIST, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let removedCount = 0;
let removedBytes = 0;
const kept = [];

for (const dir of allDirs) {
  if (KEEP_ALWAYS.has(dir) || referencedFinal.has(dir)) {
    kept.push(dir);
    continue;
  }
  const full = path.join(TDIST, dir);
  try {
    removedBytes += dirSize(full);
    fs.rmSync(full, { recursive: true, force: true });
    removedCount++;
  } catch (err) {
    log('warn', `删除失败 ${dir}: ${err.message}`);
  }
}

const finalSize = dirSize(TDIST);
log('keep', `保留组件：${kept.sort().join(', ')}`);
log('prune', `删除未使用目录 ${removedCount} 个，释放 ${(removedBytes / 1024).toFixed(1)} KB`);
log('done', `最终 miniprogram_npm/tdesign-miniprogram = ${(finalSize / 1024).toFixed(1)} KB`);

/* ---------------- 步骤 4：删除 node_modules（避免被算进 source size） ----------------
 * miniprogram_npm 是构建产物，已经自包含，node_modules 不再需要。
 * 保留它会让微信把 3.8MB 算进 source size，触发 2MB 限制。
 * 下次需要重建时跑 `npm install`（在 miniprogram 目录）恢复即可。
 */
const nodeModulesPath = path.join(MINI, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  log('clean', '已删除 miniprogram/node_modules（构建产物已自包含，避免触发 source size 限制）');
}
log('next', '回微信开发者工具点「编译」或「预览」即可');
