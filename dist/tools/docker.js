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
exports.dockerComposeTool = exports.dockerExecTool = exports.dockerLogsTool = exports.dockerPsTool = void 0;
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const execAsync = util.promisify(child_process_1.exec);
// Docker 容器列表
exports.dockerPsTool = {
    name: 'docker_ps',
    description: '列出正在运行的 Docker 容器',
    parameters: {
        type: 'object',
        properties: {
            all: { type: 'boolean', description: '是否显示所有容器（包括停止的）', default: false },
        },
        required: [],
    },
    async execute(args, _cwd) {
        try {
            const cmd = args.all ? 'docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"' : 'docker ps --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"';
            const { stdout } = await execAsync(cmd, { timeout: 10000 });
            const trimmed = stdout.trim();
            if (!trimmed)
                return { success: true, output: args.all ? '(无容器)' : '(无运行中的容器)' };
            const lines = trimmed.split('\n').map(l => {
                const [id, name, image, status, ports] = l.split('\t');
                return `📦 ${name} | ${image} | ${status} | ${ports || ''}`;
            });
            return { success: true, output: lines.join('\n') };
        }
        catch (e) {
            if (e.message.includes('Cannot connect'))
                return { success: false, output: '', error: 'Docker 未运行' };
            return { success: false, output: '', error: e.message };
        }
    },
};
// Docker 容器日志
exports.dockerLogsTool = {
    name: 'docker_logs',
    description: '查看 Docker 容器日志',
    parameters: {
        type: 'object',
        properties: {
            container: { type: 'string', description: '容器名称或 ID' },
            lines: { type: 'number', description: '日志行数', default: 50 },
        },
        required: ['container'],
    },
    async execute(args, _cwd) {
        try {
            const lines = args.lines || 50;
            const cmd = `docker logs --tail ${lines} ${args.container}`;
            const { stdout, stderr } = await execAsync(cmd, { timeout: 10000 });
            const output = [stdout, stderr].filter(Boolean).join('\n');
            return { success: true, output: output || '(无日志)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// Docker 执行命令
exports.dockerExecTool = {
    name: 'docker_exec',
    description: '在 Docker 容器内执行命令',
    parameters: {
        type: 'object',
        properties: {
            container: { type: 'string', description: '容器名称或 ID' },
            command: { type: 'string', description: '要执行的命令' },
        },
        required: ['container', 'command'],
    },
    async execute(args, _cwd) {
        try {
            const cmd = `docker exec ${args.container} ${args.command}`;
            const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
            const output = [stdout, stderr].filter(Boolean).join('\n');
            return { success: true, output: output || '(无输出)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// Docker Compose 操作
exports.dockerComposeTool = {
    name: 'docker_compose',
    description: '执行 docker compose 命令（up/down/logs/ps/build）',
    parameters: {
        type: 'object',
        properties: {
            action: { type: 'string', description: '子命令', enum: ['up', 'down', 'logs', 'ps', 'restart', 'build'] },
            args: { type: 'string', description: '额外参数', default: '' },
        },
        required: ['action'],
    },
    async execute(args, _cwd) {
        try {
            const extra = args.args || '';
            let cmd = '';
            switch (args.action) {
                case 'up':
                    cmd = `docker compose up ${extra}`;
                    break;
                case 'down':
                    cmd = `docker compose down ${extra}`;
                    break;
                case 'logs':
                    cmd = `docker compose logs --tail 100 ${extra}`;
                    break;
                case 'ps':
                    cmd = `docker compose ps ${extra}`;
                    break;
                case 'restart':
                    cmd = `docker compose restart ${extra}`;
                    break;
                case 'build':
                    cmd = `docker compose build ${extra}`;
                    break;
                default: return { success: false, output: '', error: `未知操作: ${args.action}` };
            }
            const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
            const output = [stdout, stderr].filter(Boolean).join('\n');
            return { success: true, output: output || '(无输出)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=docker.js.map