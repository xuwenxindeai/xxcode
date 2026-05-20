"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.chmodTool = exports.gitMergeTool = exports.gitBranchTool = exports.fetchPageTool = exports.browserTool = void 0;
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const execAsync = util.promisify(child_process_1.exec);
// 浏览器自动化 - 使用 Playwright 或 Puppeteer
exports.browserTool = {
    name: 'browser_automation',
    description: '浏览器自动化操作（导航/点击/输入/截图/获取内容）',
    parameters: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                description: '操作类型',
                enum: ['navigate', 'screenshot', 'click', 'type', 'get_text', 'get_html', 'evaluate', 'close'],
                default: 'navigate',
            },
            url: { type: 'string', description: '目标 URL' },
            selector: { type: 'string', description: 'CSS 选择器' },
            text: { type: 'string', description: '要输入的文本' },
            js_code: { type: 'string', description: '要执行的 JavaScript 代码' },
            output_path: { type: 'string', description: '截图输出路径' },
            headless: { type: 'boolean', description: '是否无头模式', default: true },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            // 生成临时脚本
            const scriptPath = path.join(cwd, '.tmp_browser_action.mjs');
            let script = `
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: ${args.headless !== false} });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
`;
            switch (args.action) {
                case 'navigate':
                    if (!args.url) {
                        fs.writeFileSync(scriptPath, '');
                        return { success: false, output: '', error: '需要指定 url' };
                    }
                    script += `
    await page.goto('${args.url}', { waitUntil: 'networkidle' });
    console.log('✅ 已导航到:', page.url());
    console.log('标题:', await page.title());
`;
                    break;
                case 'screenshot':
                    if (!args.url) {
                        fs.writeFileSync(scriptPath, '');
                        return { success: false, output: '', error: '需要指定 url' };
                    }
                    const outPath = args.output_path || `/tmp/browser_${Date.now()}.png`;
                    script += `
    await page.goto('${args.url}', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '${outPath}', fullPage: true });
    console.log('📸 截图已保存: ${outPath}');
`;
                    break;
                case 'click':
                    if (!args.url || !args.selector) {
                        fs.writeFileSync(scriptPath, '');
                        return { success: false, output: '', error: '需要指定 url 和 selector' };
                    }
                    script += `
    await page.goto('${args.url}', { waitUntil: 'networkidle' });
    await page.click('${args.selector}');
    console.log('✅ 已点击:', '${args.selector}');
    console.log('当前 URL:', page.url());
`;
                    break;
                case 'type':
                    if (!args.url || !args.selector || !args.text) {
                        fs.writeFileSync(scriptPath, '');
                        return { success: false, output: '', error: '需要指定 url、selector 和 text' };
                    }
                    script += `
    await page.goto('${args.url}', { waitUntil: 'networkidle' });
    await page.fill('${args.selector}', '${args.text.replace(/'/g, "\\'")}');
    console.log('✅ 已输入文本到:', '${args.selector}');
`;
                    break;
                case 'get_text':
                    if (!args.url || !args.selector) {
                        fs.writeFileSync(scriptPath, '');
                        return { success: false, output: '', error: '需要指定 url 和 selector' };
                    }
                    script += `
    await page.goto('${args.url}', { waitUntil: 'networkidle' });
    const text = await page.textContent('${args.selector}');
    console.log(text || '(空)');
`;
                    break;
                case 'get_html':
                    if (!args.url) {
                        fs.writeFileSync(scriptPath, '');
                        return { success: false, output: '', error: '需要指定 url' };
                    }
                    script += `
    await page.goto('${args.url}', { waitUntil: 'networkidle' });
    const html = await page.content();
    console.log(html.slice(0, 10000));
`;
                    break;
                case 'evaluate':
                    if (!args.url || !args.js_code) {
                        fs.writeFileSync(scriptPath, '');
                        return { success: false, output: '', error: '需要指定 url 和 js_code' };
                    }
                    script += `
    await page.goto('${args.url}', { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => {
      ${args.js_code}
    });
    console.log(typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
`;
                    break;
                case 'close':
                    script += `
    console.log('✅ 浏览器已关闭');
`;
                    break;
            }
            script += `
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
`;
            fs.writeFileSync(scriptPath, script);
            try {
                const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
                    cwd,
                    timeout: 60000,
                    maxBuffer: 10 * 1024 * 1024,
                });
                // 清理
                try {
                    fs.unlinkSync(scriptPath);
                }
                catch { }
                if (stderr) {
                    return { success: true, output: stdout.trim(), error: stderr.trim() };
                }
                return { success: true, output: stdout.trim() || '(无输出)' };
            }
            catch (e) {
                // 清理
                try {
                    fs.unlinkSync(scriptPath);
                }
                catch { }
                // 如果 Playwright 没安装，给出提示
                if (e.message.includes('Cannot find package')) {
                    return {
                        success: false,
                        output: '',
                        error: 'Playwright 未安装，请运行: npm install playwright && npx playwright install chromium',
                    };
                }
                return {
                    success: false,
                    output: e.stdout?.trim() || '',
                    error: e.stderr?.trim() || e.message,
                };
            }
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 简单的网页抓取（不需要浏览器，用 http 请求）
exports.fetchPageTool = {
    name: 'fetch_page',
    description: '获取网页 HTML 内容（轻量级，不需要浏览器）',
    parameters: {
        type: 'object',
        properties: {
            url: { type: 'string', description: '网页 URL' },
            selector: { type: 'string', description: 'CSS 选择器（提取特定内容）' },
            max_length: { type: 'number', description: '最大返回长度', default: 5000 },
        },
        required: ['url'],
    },
    async execute(args) {
        try {
            const https = await import('https');
            const http = await import('http');
            const url = new URL(args.url);
            const client = url.protocol === 'https:' ? https : http;
            return new Promise((resolve) => {
                client.get(url.toString(), { timeout: 15000 }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                            resolve({ success: false, output: '', error: `重定向到: ${res.headers.location}` });
                            return;
                        }
                        let content = data;
                        if (args.selector) {
                            // 简单的文本提取（非完整 CSS 解析）
                            const regex = new RegExp(`${args.selector}[^>]*>([^<]*)</`, 'i');
                            const match = content.match(regex);
                            content = match ? match[1] : `(未找到选择器: ${args.selector})`;
                        }
                        const truncated = content.length > (args.max_length || 5000)
                            ? content.slice(0, args.max_length || 5000) + '...'
                            : content;
                        resolve({
                            success: true,
                            output: `HTTP ${res.statusCode}\n\n${truncated}`,
                        });
                    });
                }).on('error', (e) => {
                    resolve({ success: false, output: '', error: e.message });
                });
            });
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// Git 工具 - 创建分支
exports.gitBranchTool = {
    name: 'git_branch',
    description: 'Git 分支管理（创建/切换/删除/列出）',
    parameters: {
        type: 'object',
        properties: {
            action: { type: 'string', description: '操作', enum: ['list', 'create', 'checkout', 'delete', 'current'], default: 'list' },
            branch: { type: 'string', description: '分支名' },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            let cmd = 'git';
            switch (args.action) {
                case 'list':
                    cmd += ' branch -a';
                    break;
                case 'create':
                    if (!args.branch)
                        return { success: false, output: '', error: '需要指定分支名' };
                    cmd += ` checkout -b ${args.branch}`;
                    break;
                case 'checkout':
                    if (!args.branch)
                        return { success: false, output: '', error: '需要指定分支名' };
                    cmd += ` checkout ${args.branch}`;
                    break;
                case 'delete':
                    if (!args.branch)
                        return { success: false, output: '', error: '需要指定分支名' };
                    cmd += ` branch -d ${args.branch}`;
                    break;
                case 'current':
                    cmd += ' branch --show-current';
                    break;
            }
            const { stdout } = await execAsync(cmd, { cwd, timeout: 10000 });
            return { success: true, output: stdout.trim() };
        }
        catch (e) {
            return { success: false, output: '', error: e.stderr?.trim() || e.message };
        }
    },
};
// Git 工具 - PR/Merge
exports.gitMergeTool = {
    name: 'git_merge',
    description: 'Git 合并操作（merge/rebase/stash）',
    parameters: {
        type: 'object',
        properties: {
            action: { type: 'string', description: '操作', enum: ['merge', 'rebase', 'stash', 'stash_pop', 'stash_list'], default: 'merge' },
            branch: { type: 'string', description: '分支名（merge/rebase 需要）' },
            message: { type: 'string', description: 'stash 消息' },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            let cmd = 'git';
            switch (args.action) {
                case 'merge':
                    if (!args.branch)
                        return { success: false, output: '', error: '需要指定分支名' };
                    cmd += ` merge ${args.branch} --no-edit`;
                    break;
                case 'rebase':
                    if (!args.branch)
                        return { success: false, output: '', error: '需要指定分支名' };
                    cmd += ` rebase ${args.branch}`;
                    break;
                case 'stash':
                    cmd += ' stash';
                    if (args.message)
                        cmd += ` -m "${args.message}"`;
                    break;
                case 'stash_pop':
                    cmd += ' stash pop';
                    break;
                case 'stash_list':
                    cmd += ' stash list';
                    break;
            }
            const { stdout } = await execAsync(cmd, { cwd, timeout: 30000 });
            return { success: true, output: stdout.trim() || '(无输出)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.stderr?.trim() || e.message };
        }
    },
};
// 文件权限管理
exports.chmodTool = {
    name: 'chmod_file',
    description: '修改文件权限',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
            mode: { type: 'string', description: '权限模式（如 755, 644）' },
        },
        required: ['file_path', 'mode'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            if (!fs.existsSync(fullPath)) {
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            }
            await execAsync(`chmod ${args.mode} "${fullPath}"`, { timeout: 5000 });
            return { success: true, output: `✅ 已将 ${fullPath} 权限设为 ${args.mode}` };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=browser.js.map