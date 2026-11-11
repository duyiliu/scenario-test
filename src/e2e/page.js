import { E2E_CSS } from './ui/style.generated.js';
import { E2E_APP_JS } from './ui/app.generated.js';
import { E2E_HEADER, E2E_BODY } from './ui/template.js';

export const E2E_PAGE = '<!doctype html>\n<html lang="zh-CN">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>浏览器 E2E · 测试工作台</title>\n<style data-e2e-style>' + E2E_CSS + '</style></head>\n<body class="e2e-app">' + E2E_HEADER + E2E_BODY + '<script>' + E2E_APP_JS + '\nScenarioTestE2E.mountE2E(document.body,{mode:"standalone"});</script></body></html>';
