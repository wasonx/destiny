#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const MINI = 'D:/Projects/destiny/miniprogram/pages';
const dirs = ['relationship', 'question', 'space', 'compass', 'address', 'orders', 'legal'];

for (const dir of dirs) {
  const jsonPath = path.join(MINI, dir, 'index.json');
  if (fs.existsSync(jsonPath)) {
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    json.usingComponents = { ...(json.usingComponents || {}), 't-button': 'tdesign-miniprogram/button/button' };
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  }
  const wxmlPath = path.join(MINI, dir, 'index.wxml');
  if (fs.existsSync(wxmlPath)) {
    let t = fs.readFileSync(wxmlPath, 'utf8');
    t = t.replace(/<button class="primary-button"/g, '<t-button theme="primary" block');
    t = t.replace(/<button class="secondary-button"/g, '<t-button theme="default" variant="outline"');
    t = t.replace(/<button class="teal-button"/g, '<t-button theme="primary"');
    t = t.replace(/<button class="ghost-button"/g, '<t-button theme="default" variant="text"');
    t = t.replace(/<\/button>/g, '</t-button>');
    fs.writeFileSync(wxmlPath, t, 'utf8');
  }
  console.log(`[batch] ${dir} done`);
}
