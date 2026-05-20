# xxcode 🤖

> 一个从零手写的 AI 编程 CLI 工具，81+ 工具、TUI 仪表盘、插件系统，全部原生 TypeScript。

![Version](https://img.shields.io/badge/version-1.9.0-blue)
![Tools](https://img.shields.io/badge/tools-81%2B-green)
![Language](https://img.shields.io/badge/language-TypeScript-3178c6)
![License](https://img.shields.io/badge/license-ISC-orange)

---

## 一句话介绍

**用自然语言写代码。** 告诉 xxcode 你想做什么，它自己读文件、改代码、跑测试、提交 Git。

## 能力一览

| 能力 | 说明 |
|------|------|
| 🧠 **多轮对话** | 记住上下文，支持子任务、跨任务追问 |
| 🛠️ **81+ 工具** | 文件操作、Shell、Git、Docker、浏览器、视觉、LSP/AST |
| 🎨 **TUI 仪表盘** | 终端内实时展示状态：轮数、工具调用、Token 消耗、输出流 |
| 📦 **插件系统** | npm 安装、Git 克隆、热重载，扩展无上限 |
| 🔒 **沙箱隔离** | Docker `--read-only` + `--network none` 安全执行 |
| 🔑 **命令审批** | 危险操作自动拦截，确认后才执行 |
| 🖼️ **视觉理解** | 截图 + 分析，支持 OpenAI 多模态标准 |
| 📝 **REPL 交互** | 15+ 内置命令：`/plan`、`/history`、`/stats`、`/undo`... |

## 快速开始

### 1. 克隆

```bash
git clone https://github.com/xuwenxindeai/xxcode.git
cd xxcode
```

### 2. 安装依赖

```bash
npm install
npm run build
```

### 3. 配置 API Key

```bash
# 阿里云百炼 DashScope
export DASHSCOPE_API_KEY="sk-xxx"
export DASHSCOPE_BASE_URL="https://coding.dashscope.aliyuncs.com/v1"
export DASHSCOPE_MODEL="qwen3.5-plus"
```

### 4. 运行

```bash
# 一次性任务
./dist/index.js "创建一个 Express TODO REST API"

# 交互模式（推荐）
./dist/index.js --repl
```

## 效果预览

```
╔══════════════════════════════════════════════════╗
║  ✨ xxcode v1.9.0                                ║
║  🧠 qwen3.5-plus                                 ║
╚══════════════════════════════════════════════════╝

  📋 任务: 创建一个 Express TODO REST API
  📂 目录: /Users/xwx/projects/todo-api
  ⚙️  状态: 分析中... [████████░░░░] 67%

  ┌─ Agent 输出 ───────────────────────────────────┐
  │ 📖 读取 package.json...                        │
  │ 📝 创建 src/app.ts...                          │
  │ ✅ 安装依赖 express                            │
  │ 🧪 运行测试... 通过                            │
  │ 💾 Git 提交完成                                 │
  └────────────────────────────────────────────────┘
```

## 技术栈

- **TypeScript** — 严格模式，零隐式 any
- **OpenAI SDK** — 兼容 DashScope / OpenAI 等 LLM 提供商
- **chalk + readline** — 零依赖 TUI，纯 ANSI 转义序列
- **child_process** — Shell 执行 + Docker 沙箱
- **fs + glob** — 文件系统 + 文件搜索

## 架构

```
xxcode/
├── src/
│   ├── agent.ts          # Agent 核心 + REPL 主循环
│   ├── llm.ts            # LLM 客户端（OpenAI 兼容）
│   ├── types.ts          # 类型定义
│   ├── context.ts        # Token 计数 + 消息压缩
│   ├── tui.ts            # 终端 UI 仪表盘
│   ├── sandbox.ts        # Docker 沙箱隔离
│   ├── plugin-system.ts  # 插件管理器
│   ├── tools/            # 81 个工具实现
│   └── ...
├── DEVELOP.md            # 开发文档（工具清单 / REPL 命令 / 版本历史）
└── README.md             # 项目介绍
```

## 插件系统

xxcode 支持第三方插件扩展能力：

```bash
# 交互模式中
> /plugins
> /plugin install my-xxcode-plugin

# 从 npm 安装
npm install xxcode-plugin-xxx

# 从 Git 安装
> /plugin install https://github.com/xxx/xxcode-plugin
```

## License

ISC

---

**开发文档**：详见 [DEVELOP.md](./DEVELOP.md)（完整工具清单 / REPL 命令 / 架构细节 / 版本历史）
