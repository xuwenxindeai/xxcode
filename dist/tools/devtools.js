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
exports.envManagerTool = exports.detectEncodingTool = exports.regexTool = exports.analyzeImageTool = exports.screenshotTool = exports.npmTool = exports.pipTool = exports.pythonReplTool = void 0;
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const execAsync = util.promisify(child_process_1.exec);
// Python REPL - 单行/多行执行
exports.pythonReplTool = {
    name: 'python_repl',
    description: '执行 Python 代码（支持单行或多行脚本）',
    parameters: {
        type: 'object',
        properties: {
            code: { type: 'string', description: 'Python 代码' },
            file_path: { type: 'string', description: 'Python 脚本文件路径（如果提供代码则忽略此参数）' },
            python_cmd: { type: 'string', description: 'Python 命令', enum: ['python', 'python3'], default: 'python3' },
            timeout: { type: 'number', description: '超时时间（秒）', default: 30 },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            let cmd = args.python_cmd || 'python3';
            if (args.code) {
                // 写临时文件执行（避免 stdin 问题）
                const tempFile = path.join(cwd, '.tmp_agent_repl.py');
                fs.writeFileSync(tempFile, args.code);
                cmd += ` "${tempFile}"`;
            }
            else if (args.file_path) {
                const fullPath = path.isAbsolute(args.file_path)
                    ? args.file_path
                    : path.resolve(cwd, args.file_path);
                if (!fs.existsSync(fullPath)) {
                    return { success: false, output: '', error: `文件不存在: ${fullPath}` };
                }
                cmd += ` "${fullPath}"`;
            }
            else {
                return { success: false, output: '', error: '需要提供 code 或 file_path' };
            }
            const { stdout, stderr } = await execAsync(cmd, {
                cwd,
                timeout: (args.timeout || 30) * 1000,
                maxBuffer: 10 * 1024 * 1024,
            });
            // 清理临时文件
            if (args.code) {
                try {
                    fs.unlinkSync(path.join(cwd, '.tmp_agent_repl.py'));
                }
                catch { }
            }
            let output = stdout.trim();
            if (stderr.trim()) {
                output += (output ? '\n' : '') + `⚠️ stderr:\n${stderr.trim()}`;
            }
            return {
                success: !stderr.trim(),
                output: output || '(无输出)',
                error: stderr.trim() || undefined,
            };
        }
        catch (e) {
            // 清理临时文件
            try {
                fs.unlinkSync(path.join(cwd, '.tmp_agent_repl.py'));
            }
            catch { }
            return {
                success: false,
                output: e.stdout?.trim() || '',
                error: e.stderr?.trim() || e.message,
            };
        }
    },
};
// Python 包管理 - 安装/卸载/列表
exports.pipTool = {
    name: 'pip_manage',
    description: '管理 Python 包（安装/卸载/列表/搜索）',
    parameters: {
        type: 'object',
        properties: {
            action: { type: 'string', description: '操作类型', enum: ['install', 'uninstall', 'list', 'show', 'freeze'], default: 'list' },
            package: { type: 'string', description: '包名' },
            version: { type: 'string', description: '指定版本（如 ==1.0.0）' },
            upgrade: { type: 'boolean', description: '是否升级', default: false },
            user: { type: 'boolean', description: '是否安装到用户目录', default: false },
            pip_cmd: { type: 'string', description: 'pip 命令', enum: ['pip', 'pip3'], default: 'pip3' },
        },
        required: [],
    },
    async execute(args, _cwd) {
        try {
            const cmd = args.pip_cmd || 'pip3';
            let fullCmd = cmd;
            switch (args.action) {
                case 'install':
                    if (!args.package)
                        return { success: false, output: '', error: '需要指定包名' };
                    fullCmd += ` install ${args.package}${args.version || ''}`;
                    if (args.upgrade)
                        fullCmd += ' --upgrade';
                    if (args.user)
                        fullCmd += ' --user';
                    break;
                case 'uninstall':
                    if (!args.package)
                        return { success: false, output: '', error: '需要指定包名' };
                    fullCmd += ` uninstall -y ${args.package}`;
                    break;
                case 'list':
                    fullCmd += ' list --format=columns';
                    break;
                case 'show':
                    if (!args.package)
                        return { success: false, output: '', error: '需要指定包名' };
                    fullCmd += ` show ${args.package}`;
                    break;
                case 'freeze':
                    fullCmd += ' freeze';
                    break;
            }
            const { stdout } = await execAsync(fullCmd, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
            return { success: true, output: stdout.trim() || '(无输出)' };
        }
        catch (e) {
            return { success: false, output: e.stdout?.trim() || '', error: e.stderr?.trim() || e.message };
        }
    },
};
// npm 包管理
exports.npmTool = {
    name: 'npm_manage',
    description: '管理 Node.js 包（安装/卸载/脚本执行/版本检查）',
    parameters: {
        type: 'object',
        properties: {
            action: { type: 'string', description: '操作类型', enum: ['install', 'uninstall', 'run', 'list', 'outdated', 'version', 'init'], default: 'list' },
            package: { type: 'string', description: '包名' },
            dev: { type: 'boolean', description: '是否作为开发依赖', default: false },
            script: { type: 'string', description: '要运行的 npm script 名称' },
            global: { type: 'boolean', description: '是否全局安装', default: false },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            let cmd = 'npm';
            switch (args.action) {
                case 'install':
                    cmd += ' install';
                    if (args.package)
                        cmd += ` ${args.package}`;
                    if (args.dev)
                        cmd += ' --save-dev';
                    if (args.global)
                        cmd += ' -g';
                    break;
                case 'uninstall':
                    if (!args.package)
                        return { success: false, output: '', error: '需要指定包名' };
                    cmd += ` uninstall ${args.package}`;
                    if (args.global)
                        cmd += ' -g';
                    break;
                case 'run':
                    if (!args.script)
                        return { success: false, output: '', error: '需要指定 script 名称' };
                    cmd += ` run ${args.script}`;
                    break;
                case 'list':
                    cmd += ' ls --depth=0';
                    break;
                case 'outdated':
                    cmd += ' outdated';
                    break;
                case 'version':
                    cmd += ' --version';
                    break;
                case 'init':
                    cmd += ' init -y';
                    break;
            }
            const { stdout } = await execAsync(cmd, {
                cwd,
                timeout: 120000,
                maxBuffer: 10 * 1024 * 1024,
            });
            return { success: true, output: stdout.trim() || '(无输出)' };
        }
        catch (e) {
            return { success: false, output: e.stdout?.trim() || '', error: e.stderr?.trim() || e.message };
        }
    },
};
// 截图工具
exports.screenshotTool = {
    name: 'take_screenshot',
    description: '截取屏幕截图',
    parameters: {
        type: 'object',
        properties: {
            output_path: { type: 'string', description: '保存路径（默认保存到临时目录）' },
            format: { type: 'string', description: '图片格式', enum: ['png', 'jpg', 'jpeg'], default: 'png' },
            region: { type: 'string', description: '截取区域（macOS: "x,y,w,h"）', default: 'full' },
        },
        required: [],
    },
    async execute(args, _cwd) {
        try {
            const timestamp = Date.now();
            const outputPath = args.output_path
                || `/tmp/screenshot_${timestamp}.${args.format || 'png'}`;
            let cmd;
            if (args.region && args.region !== 'full') {
                cmd = `screencapture -R ${args.region} "${outputPath}"`;
            }
            else {
                cmd = `screencapture "${outputPath}"`;
            }
            await execAsync(cmd, { timeout: 10000 });
            const stats = fs.statSync(outputPath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            return {
                success: true,
                output: `📸 截图已保存: ${outputPath} (${sizeKB} KB)`,
            };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 图片分析（基础元信息）
exports.analyzeImageTool = {
    name: 'analyze_image',
    description: '分析图片元信息（尺寸、格式、大小）',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '图片文件路径' },
        },
        required: ['file_path'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            if (!fs.existsSync(fullPath)) {
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            }
            const stats = fs.statSync(fullPath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            const { stdout } = await execAsync(`file "${fullPath}"`, { timeout: 5000 });
            const fileInfo = stdout.trim();
            // 尝试获取图片尺寸
            let dimensions = '(无法获取)';
            try {
                const { stdout: dimOut } = await execAsync(`sips -g pixelWidth -g pixelHeight "${fullPath}"`, { timeout: 5000 });
                const lines = dimOut.trim().split('\n').filter(l => l.includes(':'));
                if (lines.length >= 2) {
                    const w = lines[0].split(':')[1]?.trim();
                    const h = lines[1].split(':')[1]?.trim();
                    if (w && h)
                        dimensions = `${w} × ${h}`;
                }
            }
            catch { }
            return {
                success: true,
                output: `🖼️ 图片分析:\n` +
                    `  路径: ${fullPath}\n` +
                    `  类型: ${fileInfo}\n` +
                    `  尺寸: ${dimensions}\n` +
                    `  大小: ${sizeKB} KB (${sizeMB} MB)\n` +
                    `  修改时间: ${stats.mtime.toLocaleString('zh-CN')}`,
            };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 正则表达式测试
exports.regexTool = {
    name: 'test_regex',
    description: '测试正则表达式匹配',
    parameters: {
        type: 'object',
        properties: {
            pattern: { type: 'string', description: '正则表达式' },
            text: { type: 'string', description: '要匹配的文本' },
            flags: { type: 'string', description: '正则标志（g, i, m, s）', default: 'g' },
            max_matches: { type: 'number', description: '最大匹配数', default: 20 },
        },
        required: ['pattern', 'text'],
    },
    async execute(args) {
        try {
            let flags = args.flags || 'g';
            let regex;
            try {
                regex = new RegExp(args.pattern, flags);
            }
            catch (e) {
                return { success: false, output: '', error: `无效正则: ${e.message}` };
            }
            const matches = [];
            let match;
            const isGlobal = flags.includes('g');
            if (isGlobal) {
                while ((match = regex.exec(args.text)) !== null && matches.length < (args.max_matches || 20)) {
                    matches.push({
                        index: match.index,
                        match: match[0],
                        groups: match.groups || undefined,
                    });
                    if (!match[0])
                        regex.lastIndex++; // 防止空匹配死循环
                }
            }
            else {
                match = regex.exec(args.text);
                if (match) {
                    matches.push({ index: match.index, match: match[0] });
                }
            }
            const maxMatch = args.max_matches || 20;
            const more = matches.length >= maxMatch ? ` (仅显示前 ${maxMatch} 个)` : '';
            if (matches.length === 0) {
                return { success: true, output: `❌ 无匹配\n\n正则: /${args.pattern}/${flags}\n文本长度: ${args.text.length} 字符` };
            }
            const result = matches.map((m, i) => {
                const preview = m.match.length > 100 ? m.match.slice(0, 100) + '...' : m.match;
                let line = `${i + 1}. [${m.index}] "${preview}"`;
                if (m.groups) {
                    line += `\n   分组: ${JSON.stringify(m.groups)}`;
                }
                return line;
            });
            return {
                success: true,
                output: `✅ 找到 ${matches.length} 个匹配${more}\n\n正则: /${args.pattern}/${flags}\n\n${result.join('\n')}`,
            };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 文件编码检测
exports.detectEncodingTool = {
    name: 'detect_encoding',
    description: '检测文件编码',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
        },
        required: ['file_path'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            if (!fs.existsSync(fullPath)) {
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            }
            const { stdout } = await execAsync(`file -I "${fullPath}"`, { timeout: 5000 });
            const encoding = stdout.trim();
            // 尝试读取前几行检测是否有 BOM 或乱码
            const buffer = fs.readFileSync(fullPath);
            const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
            return {
                success: true,
                output: `📄 编码检测:\n  路径: ${fullPath}\n  MIME: ${encoding}\n  BOM: ${hasBOM ? '✅ UTF-8 BOM' : '❌ 无'}`,
            };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 环境变量管理
exports.envManagerTool = {
    name: 'env_manager',
    description: '管理 .env 文件（读取、写入、删除变量）',
    parameters: {
        type: 'object',
        properties: {
            action: { type: 'string', description: '操作', enum: ['read', 'set', 'delete', 'list', 'check'], default: 'list' },
            key: { type: 'string', description: '变量名' },
            value: { type: 'string', description: '变量值' },
            file_path: { type: 'string', description: '.env 文件路径', default: '.env' },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            const envPath = path.isAbsolute(args.file_path || '.env')
                ? (args.file_path || '.env')
                : path.resolve(cwd, args.file_path || '.env');
            let content = fs.existsSync(envPath)
                ? fs.readFileSync(envPath, 'utf-8')
                : '';
            let lines = content.split('\n');
            switch (args.action) {
                case 'read':
                case 'check':
                    if (!args.key)
                        return { success: false, output: '', error: '需要指定 key' };
                    const match = lines.find(l => l.match(new RegExp(`^${args.key}\\s*=`)));
                    if (match) {
                        const val = match.split('=').slice(1).join('=').trim();
                        return { success: true, output: `${args.key}=${val}` };
                    }
                    return { success: args.action === 'check' ? false : true, output: `(未找到 ${args.key})` };
                case 'set':
                    if (!args.key)
                        return { success: false, output: '', error: '需要指定 key' };
                    const existingIdx = lines.findIndex(l => l.match(new RegExp(`^${args.key}\\s*=`)));
                    if (existingIdx >= 0) {
                        lines[existingIdx] = `${args.key}=${args.value || ''}`;
                    }
                    else {
                        lines.push(`${args.key}=${args.value || ''}`);
                    }
                    fs.writeFileSync(envPath, lines.join('\n'));
                    return { success: true, output: `✅ 已设置 ${args.key}` };
                case 'delete':
                    if (!args.key)
                        return { success: false, output: '', error: '需要指定 key' };
                    const deleteIdx = lines.findIndex(l => l.match(new RegExp(`^${args.key}\\s*=`)));
                    if (deleteIdx < 0)
                        return { success: false, output: `未找到 ${args.key}` };
                    lines.splice(deleteIdx, 1);
                    fs.writeFileSync(envPath, lines.join('\n'));
                    return { success: true, output: `✅ 已删除 ${args.key}` };
                case 'list':
                default:
                    if (!fs.existsSync(envPath))
                        return { success: true, output: `${envPath} 不存在` };
                    const vars = lines
                        .filter(l => l.trim() && !l.startsWith('#'))
                        .map(l => {
                        const [k, ...rest] = l.split('=');
                        return `${k.trim()} = ${rest.join('=').trim().slice(0, 30)}`;
                    });
                    return { success: true, output: vars.join('\n') || '(空)' };
            }
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=devtools.js.map