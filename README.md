# xxcode 🤖

> 从零手写、对标 Claude Code 的 AI 编程 CLI —— 多厂商模型、自动上下文压缩、大仓库可用，原生 TypeScript。

![Version](https://img.shields.io/badge/version-1.9.0-blue)
![Tools](https://img.shields.io/badge/tools-73-green)
![Provider](https://img.shields.io/badge/provider-OpenAI%20%7C%20Claude%20%7C%20Gemini-orange)
![Language](https://img.shields.io/badge/language-TypeScript-3178c6)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

---

**用自然语言写代码。** 告诉 xxcode 你想做什么，它自己读文件、改代码、跑命令、提交 Git —— 多轮对话 + 73 个工具 + 自动上下文管理。

## ✨ 特性

- **🤖 多模型厂商**（基于 [Vercel AI SDK](https://ai-sdk.dev)）：OpenAI 兼容（DashScope / DeepSeek / Kimi / 智谱 GLM / 本地 Ollama·vLLM）、Anthropic Claude、Google Gemini —— 改个配置就切。
- **🧠 上下文工程**：上下文超阈值时自动把老对话**摘要压缩**（compact），长任务 / 大仓库不失忆；每次请求显示**真实 token 用量**（↑输入 ↓输出 + 思考 + 缓存命中 + 会话累计，来自 API usage）。
- **🛡️ 可靠性**：LLM 调用自动重试、工具执行超时保护、**大文件 / 二进制读取防护**（几 G 的仓库读到上百 MB 的 framework 也不会把内存撑爆）。
- **🔧 73 个内置工具**：文件读写（分页 + 二进制识别）、Shell、Git、grep / AST / LSP、Docker、浏览器、Web、视觉 —— 全部统一过一层安全包装（默认值填充 / 必填校验 / 超时 / 错误兜底）。
- **🎨 流式终端 UI**：工具调用折叠块（`● name(args)` + `└ 结果`）+ 宽度自适应；非 TTY 自动降级为纯日志。
- **🔑 命令审批 + 错误日志**：危险命令（rm / sudo …）拦截确认；异常落盘到 `~/.xxcode/logs/`。
- **✅ 测试**：vitest 单元测试覆盖核心（上下文压缩配对、工具安全层、消息/工具转换、大文件防护…）。

## 🚀 快速开始

```bash
git clone https://github.com/xuwenxindeai/xxcode.git
cd xxcode
npm install
npm run build      # 编译 TypeScript → dist/
npm link           # 注册全局命令 xxcode（可选；也可直接 node dist/index.js）
```

> 要求 **Node.js ≥ 22.12**（依赖以 ESM 形式加载）。

**首次配置**：直接运行会引导你选厂商并填 API Key，保存到 `~/.xxcode/config.json`；也可用环境变量：

```bash
export DASHSCOPE_API_KEY="sk-xxx"
export DASHSCOPE_BASE_URL="https://coding.dashscope.aliyuncs.com/v1"
export DASHSCOPE_MODEL="qwen3.5-plus"
```

**运行**：

```bash
cd 你的项目
xxcode                                       # 交互模式（REPL）
xxcode -t "把 utils.js 拆成多个模块并补测试"   # 一次性任务
xxcode -m qwen-max                           # 指定模型
```

## 🌐 支持的模型厂商（多 Provider）

基于 Vercel AI SDK，默认 `openai-compatible`：

| Provider | 适用厂商 | 配置 |
|----------|---------|------|
| `openai-compatible`（默认） | OpenAI、阿里百炼、DeepSeek、Kimi、智谱 GLM、本地 Ollama / vLLM 等所有 OpenAI 兼容接口 | `baseUrl` + `model` + API Key |
| `anthropic` | Anthropic Claude | 首次向导选 `4`，或设 `provider: "anthropic"` |
| `google` | Google Gemini | 首次向导选 `5`，或设 `provider: "google"` |

切换方式：环境变量 `export XXCODE_PROVIDER=anthropic`，或编辑 `~/.xxcode/config.json`：

```json
{ "provider": "anthropic", "apiKey": "sk-ant-...", "model": "claude-sonnet-4-5" }
```

> - 想用 Claude / Gemini 也可走 **OpenRouter** 等聚合网关：provider 保持默认，`baseUrl` 指向网关即可。
> - 模型必须支持 **function calling（工具调用）**，xxcode 才能正常工作。

## 💬 常用命令（REPL）

| 命令 | 说明 |
|------|------|
| `/context` | 查看上下文用量（已用 / 上限 / 百分比） |
| `/stats` | 对话统计（消息数 / token / 工具调用） |
| `/tools` | 列出全部可用工具 |
| `/plan` | 为任务生成实现计划（不写代码） |
| `/undo` `/redo` | 撤销 / 重做文件修改 |
| `/history` `/clear` | 查看 / 清空对话历史 |
| `/git` `/test` `/memory` | Git 状态 / 跑测试 / 项目记忆 |
| `/quit` | 退出 |

## 🏗️ 架构

```
src/
├── agent.ts        # Agent 主循环 + REPL（流式输出、自动 compact、token 用量）
├── llm.ts          # LLM 层（Vercel AI SDK，多 provider + 消息/工具双向转换）
├── context.ts      # 上下文：token 估算、硬截断兜底、自动摘要压缩 compact
├── tools/
│   ├── index.ts    #   73 个工具注册（统一 .map(withToolSafety)）
│   ├── define.ts   #   工具安全层：默认值填充 / 必填校验 / 超时 / 错误兜底
│   ├── file.ts     #   文件读写（大文件分页 + 二进制防护）
│   └── ...
├── logger.ts       # 错误日志 → ~/.xxcode/logs/error.log
├── config.ts · session.ts · memory.ts · hooks.ts · approval.ts · ...
test/               # vitest 单元测试
ROADMAP.md          # 对标 Claude Code 的分阶段路线图（P1–P7）
```

## 🧪 测试

```bash
npm test
```

## 🗺️ 路线图

目标是对标 Claude Code / opencode 的完整体验。**已完成**：多 provider、P1 上下文工程（自动 compact）、P2 可靠性（重试 / 超时 / 大文件防护）。后续（安全权限、任务编排、模型能力感知、MCP、Ink 交互）见 **[ROADMAP.md](./ROADMAP.md)**。

## License

ISC
