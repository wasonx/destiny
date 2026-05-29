import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const MINI = path.join(ROOT, 'miniprogram');
const EXPECTED_APPID = 'wxc4ed7c07ce86326c';
const EXPECTED_API_BASE = 'https://www.goye.cc/destiny-api';
const REQUIRED_PAGES = [
  'pages/home/index',
  'pages/life/index',
  'pages/relationship/index',
  'pages/question/index',
  'pages/space/index',
  'pages/compass/index',
  'pages/store/index',
  'pages/address/index',
  'pages/orders/index',
  'pages/report/index',
];

const errors = [];

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`cannot read ${rel(filePath)}: ${error.message}`);
    return '';
  }
}

function readJson(filePath) {
  const text = readText(filePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`invalid JSON ${rel(filePath)}: ${error.message}`);
    return null;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function ensureFile(filePath) {
  assert(fs.existsSync(filePath), `missing ${rel(filePath)}`);
}

ensureFile(path.join(MINI, 'app.js'));
ensureFile(path.join(MINI, 'app.json'));
ensureFile(path.join(MINI, 'app.wxss'));
ensureFile(path.join(MINI, 'project.config.json'));
ensureFile(path.join(MINI, 'utils', 'api.js'));
ensureFile(path.join(MINI, 'utils', 'auth.js'));
ensureFile(path.join(MINI, 'utils', 'fallback.js'));

const appJson = readJson(path.join(MINI, 'app.json'));
const projectConfig = readJson(path.join(MINI, 'project.config.json'));
assert(projectConfig?.appid === EXPECTED_APPID, `project.config.json appid must be ${EXPECTED_APPID}`);
assert(JSON.stringify(appJson?.pages) === JSON.stringify(REQUIRED_PAGES), 'app.json pages are not the expected native page list');
assert(appJson?.window?.navigationBarTitleText === '甄算', 'navigation title must be 甄算');

for (const page of REQUIRED_PAGES) {
  for (const suffix of ['js', 'json', 'wxml', 'wxss']) {
    ensureFile(path.join(MINI, `${page}.${suffix}`));
  }
}

const allFiles = walk(MINI);
const jsonFiles = allFiles.filter((file) => file.endsWith('.json'));
const jsFiles = allFiles.filter((file) => file.endsWith('.js'));
const wxmlFiles = allFiles.filter((file) => file.endsWith('.wxml'));
const wxssFiles = allFiles.filter((file) => file.endsWith('.wxss'));
const allSource = allFiles
  .filter((file) => ['.js', '.json', '.wxml', '.wxss'].includes(path.extname(file)))
  .map(readText)
  .join('\n');

for (const file of jsonFiles) readJson(file);

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert(result.status === 0, `JS syntax check failed for ${rel(file)}\n${result.stderr || result.stdout}`);
}

const apiJs = readText(path.join(MINI, 'utils', 'api.js'));
assert(apiJs.includes(EXPECTED_API_BASE), `utils/api.js must use ${EXPECTED_API_BASE}`);
assert(apiJs.includes('wx.request'), 'utils/api.js must use wx.request');
assert(apiJs.includes('Authorization'), 'utils/api.js must attach customer token authorization');

const compassJs = readText(path.join(MINI, 'pages', 'compass', 'index.js'));
assert(compassJs.includes('wx.startCompass'), 'compass page must call wx.startCompass');
assert(compassJs.includes('wx.onCompassChange'), 'compass page must call wx.onCompassChange');
assert(compassJs.includes('wx.stopCompass'), 'compass page must call wx.stopCompass');
assert(compassJs.includes("wx.setStorageSync('house_direction'"), 'compass page must store recorded house direction');

const requiredCommerceText = ['商城', '收货地址', '订单', '申请退款', '/customer/orders'];
for (const text of requiredCommerceText) {
  assert(allSource.includes(text), `miniprogram source must include ${text}`);
}

assert(!allSource.includes('<web-view'), 'miniprogram must not use web-view as an H5 wrapper');
assert(!allSource.includes('React'), 'miniprogram source must remain native and not include React code');
assert(!allSource.includes('元启东方'), 'old project wording must not appear in miniprogram source');
assert(!allSource.includes('Digital Zen'), 'old English branding must not appear in miniprogram source');
assert(wxmlFiles.length >= REQUIRED_PAGES.length, 'each page must include WXML');
assert(wxssFiles.length >= REQUIRED_PAGES.length, 'each page must include WXSS');

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`miniprogram_static_ok=${jsFiles.length}`);
console.log(`json_files_ok=${jsonFiles.length}`);
console.log(`native_pages_ok=${REQUIRED_PAGES.length}`);
