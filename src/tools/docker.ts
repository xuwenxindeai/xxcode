import { exec } from 'child_process';
import * as util from 'util';
import { Tool, ToolResult } from '../types';

const execAsync = util.promisify(exec);

// Docker 容器列表
export const dockerPsTool: Tool = {
  name: 'docker_ps',
  description: '列出正在运行的 Docker 容器',
  parameters: {
    type: 'object',
    properties: {
      all: { type: 'boolean', description: '是否显示所有容器（包括停止的）', default: false },
    },
    required: [],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const cmd = args.all ? 'docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"' : 'docker ps --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"';
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      const trimmed = stdout.trim();
      if (!trimmed) return { success: true, output: args.all ? '(无容器)' : '(无运行中的容器)' };

      const lines = trimmed.split('\n').map(l => {
        const [id, name, image, status, ports] = l.split('\t');
        return `📦 ${name} | ${image} | ${status} | ${ports || ''}`;
      });
      return { success: true, output: lines.join('\n') };
    } catch (e: any) {
      if (e.message.includes('Cannot connect')) return { success: false, output: '', error: 'Docker 未运行' };
      return { success: false, output: '', error: e.message };
    }
  },
};

// Docker 容器日志
export const dockerLogsTool: Tool = {
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
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const lines = args.lines || 50;
      const cmd = `docker logs --tail ${lines} ${args.container}`;
      const { stdout, stderr } = await execAsync(cmd, { timeout: 10000 });
      const output = [stdout, stderr].filter(Boolean).join('\n');
      return { success: true, output: output || '(无日志)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// Docker 执行命令
export const dockerExecTool: Tool = {
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
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const cmd = `docker exec ${args.container} ${args.command}`;
      const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
      const output = [stdout, stderr].filter(Boolean).join('\n');
      return { success: true, output: output || '(无输出)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// Docker Compose 操作
export const dockerComposeTool: Tool = {
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
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const extra = args.args || '';
      let cmd = '';
      switch (args.action) {
        case 'up': cmd = `docker compose up ${extra}`; break;
        case 'down': cmd = `docker compose down ${extra}`; break;
        case 'logs': cmd = `docker compose logs --tail 100 ${extra}`; break;
        case 'ps': cmd = `docker compose ps ${extra}`; break;
        case 'restart': cmd = `docker compose restart ${extra}`; break;
        case 'build': cmd = `docker compose build ${extra}`; break;
        default: return { success: false, output: '', error: `未知操作: ${args.action}` };
      }
      const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
      const output = [stdout, stderr].filter(Boolean).join('\n');
      return { success: true, output: output || '(无输出)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
