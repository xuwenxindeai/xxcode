# xxcode 🤖

> 一个从零手写的 AI 编程 CLI 工具，81+ 工具、TUI 仪表盘、插件系统，全部原生 TypeScript。

![Version](https://img.shields.io/badge/version-1.9.0-blue)
![Tools](https://img.shields.io/badge/tools-81%2B-green)
![Language](https://img.shields.io/badge/language-TypeScript-3178c6)
![License](https://img.shields.io/badge/license-ISC-orange)

---

## 一句话介绍

**用自然语言写代码。** 告诉 xxcode 你想做什么，它自己读文件、改代码、跑测试、提交 Git。

## 快速开始

### 1. 安装

```bash
git clone --depth 1 https://github.com/xuwenxindeai/xxcode.git
cd xxcode
npm install
```

### 2. 运行

```bash
# 进入你的项目目录
cd /path/to/your/project

# 启动 xxcode
xxcode
```

> 也可以在任何目录下用 `npx` 直接运行：
> ```bash
> npx github:xuwenxindeai/xxcode
> ```

### 3. 首次配置

首次运行会自动引导配置 API Key，支持：

- **阿里云百炼 (DashScope)** — 推荐
- **OpenAI**
- **自定义 OpenAI 兼容接口**

配置保存在 `~/.xxcode/config.json`，下次启动自动使用。

也可以手动设置环境变量：

```bash
export DASHSCOPE_API_KEY="sk-xxx"
export DASHSCOPE_BASE_URL="https://coding.dashscope.aliyuncs.com/v1"
export DASHSCOPE_MODEL="qwen3.5-plus"
```

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

## 使用示例

### 交互模式

```bash
cd my-project
xxcode
```

然后在对话框中输入任务，xxcode 会自动读写文件、执行命令、提交代码。

### 一次性任务

```bash
xxcode -t "创建一个 Express TODO REST API" -d ./my-api
```

### 指定模型

```bash
xxcode -m qwen-max
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `/plan` | 生成实现计划（不写代码） |
| `/history` | 查看对话历史 |
| `/stats` | 查看 Token 统计 |
| `/tools` | 列出所有可用工具 |
| `/undo` | 撤销上一步操作 |
| `/clear` | 清空对话历史 |
| `/plugins` | 管理插件 |
| `/quit` | 退出 |

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
