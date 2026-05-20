import { Tool, ToolResult } from '../types';
import * as https from 'https';
import * as http from 'http';

// Web 搜索（通过搜索引擎 API 或爬取）
export const webSearchTool: Tool = {
  name: 'web_search',
  description: '搜索互联网获取编程相关信息（文档、API 参考、Stack Overflow）',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索查询' },
      maxResults: { type: 'number', description: '最大结果数', default: 5 },
    },
    required: ['query'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      // 使用 DuckDuckGo HTML 搜索（无需 API key）
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
      const html = await fetchUrl(url);

      // 提取搜索结果
      const results: string[] = [];
      const titleRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;

      let match;
      const titles: { href: string; title: string }[] = [];
      while ((match = titleRegex.exec(html)) !== null) {
        titles.push({ href: match[1], title: match[2].replace(/<[^>]*>/g, '') });
      }

      const snippets: string[] = [];
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1].replace(/<[^>]*>/g, ''));
      }

      const maxResults = args.maxResults || 5;
      for (let i = 0; i < Math.min(titles.length, snippets.length, maxResults); i++) {
        results.push(`${i + 1}. ${titles[i].title}\n   URL: ${titles[i].href}\n   ${snippets[i].slice(0, 200)}`);
      }

      if (results.length === 0) {
        return { success: true, output: '(无搜索结果)' };
      }

      return { success: true, output: results.join('\n\n') };
    } catch (e: any) {
      return { success: false, output: '', error: `搜索失败: ${e.message}` };
    }
  },
};

// 获取网页内容
export const webFetchTool: Tool = {
  name: 'web_fetch',
  description: '获取网页内容（适合读取文档、API 参考）',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: '网页 URL' },
      maxChars: { type: 'number', description: '最大返回字符数', default: 5000 },
    },
    required: ['url'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const html = await fetchUrl(args.url);
      // 简易 HTML 转文本
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      const maxChars = args.maxChars || 5000;
      const truncated = text.length > maxChars
        ? text.slice(0, maxChars) + `\n\n... (已截断，共 ${text.length} 字符)`
        : text;

      return { success: true, output: truncated };
    } catch (e: any) {
      return { success: false, output: '', error: `获取失败: ${e.message}` };
    }
  },
};

// 简易 HTTP GET
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // 跟随重定向
        fetchUrl(res.headers.location!).then(resolve, reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
