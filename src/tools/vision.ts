import { exec } from 'child_process';
import * as util from 'util';
import { Tool, ToolResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as llm from '../llm';

const execAsync = util.promisify(exec);

/**
 * macOS 截图工具
 */
export const takeScreenshotTool: Tool = {
  name: 'take_screenshot',
  description: '截取屏幕截图（macOS），可选指定区域',
  parameters: {
    type: 'object',
    properties: {
      area: { type: 'string', description: '截图区域: full(全屏)/window(当前窗口)/select(选择区域)', default: 'full' },
      output: { type: 'string', description: '输出路径（默认 /tmp/screenshot_时间戳.png）' },
      delay: { type: 'number', description: '延迟秒数（0-10）', default: 0 },
    },
    required: [],
  },
  async execute(args: any): Promise<ToolResult> {
    try {
      const outputFile = args.output || path.join(os.tmpdir(), `screenshot_${Date.now()}.png`);

      if (args.delay && args.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, args.delay * 1000));
      }

      let cmd: string;
      switch (args.area) {
        case 'window':
          cmd = `screencapture -W "${outputFile}"`;
          break;
        case 'select':
          cmd = `screencapture -i "${outputFile}"`;
          break;
        default:
          cmd = `screencapture "${outputFile}"`;
      }

      await execAsync(cmd);

      const stats = fs.statSync(outputFile);
      const sizeKB = (stats.size / 1024).toFixed(1);

      return {
        success: true,
        output: `截图已保存: ${outputFile}\n尺寸: ${sizeKB}KB`,
      };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

/**
 * 图片分析（视觉理解）— 发给 LLM 分析
 */
export const visionTool: Tool = {
  name: 'vision',
  description: '分析图片内容（截图/UI/错误信息/图表），支持 base64 或文件路径',
  parameters: {
    type: 'object',
    properties: {
      image: {
        type: 'string',
        description: '图片路径（本地文件）或 base64 编码的字符串',
      },
      prompt: {
        type: 'string',
        description: '分析指令，例如 "这是什么错误？" "描述这个 UI 界面" "提取所有文字"',
      },
      model: {
        type: 'string',
        description: '视觉模型（默认使用配置的模型）',
      },
    },
    required: ['image'],
  },
  async execute(args: any, cwd?: string): Promise<ToolResult> {
    try {
      let base64Image: string;

      // 判断是文件路径还是 base64
      if (fs.existsSync(args.image)) {
        const imgPath = path.isAbsolute(args.image) ? args.image : path.resolve(cwd || '.', args.image);
        const imgBuffer = fs.readFileSync(imgPath);
        base64Image = imgBuffer.toString('base64');
      } else {
        base64Image = args.image;
      }

      // 构造多模态消息
      const analysisPrompt = args.prompt || '请详细描述这张图片的内容';
      const messages: any[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: analysisPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ];

      const reply = await llm.chatStreaming(
        args.model || 'qwen3.5-plus',
        messages,
        [],
        () => {}
      );

      return {
        success: true,
        output: typeof reply.content === 'string' ? reply.content : '(LLM 返回非文本格式)',
      };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

/**
 * 截屏并立即分析（一键操作）
 */
export const screenshotAnalyzeTool: Tool = {
  name: 'screenshot_analyze',
  description: '截屏并立即分析（截图 → 发给 LLM → 返回分析结果）',
  parameters: {
    type: 'object',
    properties: {
      area: { type: 'string', description: '截图区域: full/window/select', default: 'full' },
      prompt: { type: 'string', description: '分析指令', default: '请描述截图内容' },
      delay: { type: 'number', description: '延迟秒数', default: 0 },
    },
    required: [],
  },
  async execute(args: any): Promise<ToolResult> {
    try {
      const outputFile = path.join(os.tmpdir(), `vision_${Date.now()}.png`);

      if (args.delay && args.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, args.delay * 1000));
      }

      let cmd: string;
      switch (args.area) {
        case 'window':
          cmd = `screencapture -W "${outputFile}"`;
          break;
        case 'select':
          cmd = `screencapture -i "${outputFile}"`;
          break;
        default:
          cmd = `screencapture "${outputFile}"`;
      }

      await execAsync(cmd);

      // 分析截图
      const imgBuffer = fs.readFileSync(outputFile);
      const base64Image = imgBuffer.toString('base64');
      const analysisPrompt = args.prompt || '请描述截图内容';

      const messages: any[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: analysisPrompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64Image}` },
            },
          ],
        },
      ];

      const reply = await llm.chatStreaming(
        'qwen3.5-plus',
        messages,
        [],
        () => {}
      );

      // 清理临时文件
      try { fs.unlinkSync(outputFile); } catch {}

      return {
        success: true,
        output: typeof reply.content === 'string' ? reply.content : '(LLM 返回非文本格式)',
      };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

/**
 * 图片元信息分析（尺寸/格式/大小）
 */
export const analyzeImageTool: Tool = {
  name: 'analyze_image',
  description: '分析图片元信息（尺寸/格式/文件大小），不做视觉理解',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '图片文件路径' },
    },
    required: ['path'],
  },
  async execute(args: any, cwd?: string): Promise<ToolResult> {
    try {
      const imgPath = path.isAbsolute(args.path) ? args.path : path.resolve(cwd || '.', args.path);

      if (!fs.existsSync(imgPath)) {
        return { success: false, output: '', error: `文件不存在: ${imgPath}` };
      }

      const stats = fs.statSync(imgPath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // 用 sips 获取图片尺寸
      const { stdout } = await execAsync(`sips -g pixelWidth -g pixelHeight "${imgPath}"`);
      const widthMatch = stdout.match(/pixelWidth: (\d+)/);
      const heightMatch = stdout.match(/pixelHeight: (\d+)/);
      const formatMatch = stdout.match(/format: (\w+)/);

      return {
        success: true,
        output: [
          `文件: ${imgPath}`,
          `尺寸: ${widthMatch?.[1] || '?'} x ${heightMatch?.[1] || '?'} px`,
          `格式: ${formatMatch?.[1] || '?'}`,
          `大小: ${sizeKB}KB (${sizeMB}MB)`,
        ].join('\n'),
      };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
