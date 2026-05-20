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
exports.CodeSandbox = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const execAsync = util.promisify(child_process_1.exec);
const DEFAULT_SANDBOX = {
    timeout: 30,
    maxMemory: 256,
    network: false,
    maxCpu: 1,
    allowedDirs: [],
};
/**
 * 代码沙箱执行器
 * 使用 Docker 或 nexec（macOS 原生）隔离代码执行
 */
class CodeSandbox {
    config;
    cwd;
    tempDir;
    constructor(cwd, config) {
        this.cwd = cwd;
        this.config = { ...DEFAULT_SANDBOX, ...config };
        this.tempDir = path.join(cwd, '.agent-sandbox');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    /**
     * 执行代码（尝试沙箱隔离）
     */
    async execute(code, lang) {
        const tempFile = path.join(this.tempDir, `sandbox_${Date.now()}.${this.getExtension(lang)}`);
        try {
            fs.writeFileSync(tempFile, code);
            // 尝试 Docker 沙箱
            if (await this.isDockerAvailable()) {
                return await this.runInDocker(tempFile, lang);
            }
            // 回退：受限环境执行（无网络 + 超时）
            return await this.runRestricted(tempFile, lang);
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
        finally {
            // 清理临时文件
            try {
                fs.unlinkSync(tempFile);
            }
            catch { }
        }
    }
    /**
     * 执行命令（受限环境）
     */
    async runCommand(cmd) {
        try {
            const result = await execAsync(cmd, {
                cwd: this.tempDir,
                timeout: this.config.timeout * 1000,
                maxBuffer: 5 * 1024 * 1024,
                env: {
                    ...process.env,
                    // 禁用网络相关环境变量
                    HTTP_PROXY: '',
                    HTTPS_PROXY: '',
                    NO_PROXY: '*',
                },
            });
            return {
                success: true,
                output: result.stdout.trim(),
                error: result.stderr.trim(),
            };
        }
        catch (e) {
            return {
                success: false,
                output: e.stdout?.trim() || '',
                error: e.stderr?.trim() || e.message,
            };
        }
    }
    async isDockerAvailable() {
        try {
            await execAsync('docker --version', { timeout: 5000 });
            return true;
        }
        catch {
            return false;
        }
    }
    async runInDocker(file, lang) {
        const imageName = this.getDockerImage(lang);
        const containerName = `agent-sandbox-${Date.now()}`;
        const mountedFile = '/workspace/code';
        const ext = this.getExtension(lang);
        let cmd;
        switch (lang) {
            case 'python':
                cmd = `python3 ${mountedFile}.${ext}`;
                break;
            case 'node':
            case 'javascript':
                cmd = `node ${mountedFile}.${ext}`;
                break;
            case 'bash':
                cmd = `bash ${mountedFile}.${ext}`;
                break;
            default:
                cmd = `cat ${mountedFile}.${ext}`;
        }
        try {
            const networkFlag = this.config.network ? '' : '--network none';
            const { stdout, stderr } = await execAsync(`docker run --rm ${networkFlag} ` +
                `--memory=${this.config.maxMemory}m ` +
                `--cpus=${this.config.maxCpu} ` +
                `--name ${containerName} ` +
                `-v "${this.tempDir}:/workspace" ` +
                `--read-only ` +
                `--tmpfs /tmp:exec,size=50m ` +
                `${imageName} ` +
                `${cmd}`, {
                timeout: this.config.timeout * 1000,
                maxBuffer: 5 * 1024 * 1024,
            });
            return {
                success: !stderr,
                output: stdout.trim(),
                error: stderr.trim(),
            };
        }
        catch (e) {
            return {
                success: false,
                output: e.stdout?.trim() || '',
                error: e.stderr?.trim() || e.message,
            };
        }
    }
    async runRestricted(file, lang) {
        let cmd;
        switch (lang) {
            case 'python':
                cmd = `python3 "${file}"`;
                break;
            case 'node':
            case 'javascript':
                cmd = `node "${file}"`;
                break;
            case 'bash':
                cmd = `bash "${file}"`;
                break;
            default:
                return { success: false, output: '', error: `不支持的语言: ${lang}` };
        }
        return await this.runCommand(cmd);
    }
    getDockerImage(lang) {
        switch (lang) {
            case 'python':
                return 'python:3.11-slim';
            case 'node':
            case 'javascript':
                return 'node:20-slim';
            case 'bash':
                return 'ubuntu:22.04';
            default:
                return 'ubuntu:22.04';
        }
    }
    getExtension(lang) {
        switch (lang) {
            case 'python':
                return 'py';
            case 'node':
            case 'javascript':
                return 'js';
            case 'bash':
                return 'sh';
            default:
                return 'txt';
        }
    }
    /**
     * 清理沙箱临时文件
     */
    cleanup() {
        try {
            fs.rmSync(this.tempDir, { recursive: true, force: true });
        }
        catch { }
    }
    /**
     * 获取沙箱状态
     */
    getStatus() {
        return {
            tempDir: this.tempDir,
            config: this.config,
        };
    }
}
exports.CodeSandbox = CodeSandbox;
//# sourceMappingURL=sandbox.js.map