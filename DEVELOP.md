# 🤖 Coding Agent

从零手写的 AI 编程 Agent，支持 81+ 工具、多轮对话、代码沙箱、插件系统。

## 快速开始

```bash
npm install
npm run build
./dist/index.js "创建一个 Express TODO REST API"
```

或使用 REPL 模式交互：

```bash
./dist/index.js --repl
```

## 环境变量

```bash
# 阿里云百炼 DashScope
export DASHSCOPE_API_KEY="sk-xxx"
export DASHSCOPE_BASE_URL="https://coding.dashscope.aliyuncs.com/v1"
export DASHSCOPE_MODEL="qwen3.5-plus"
```

## REPL 命令

| 命令 | 说明 |
|------|------|
| `/quit` | 退出 |
| `/reset` | 重置 Agent（新建实例） |
| `/clear` | 清空消息历史（保留 system prompt） |
| `/history` | 查看工具调用历史 |
| `/stats` | 显示对话统计（消息数/Token/工具调用） |
| `/tools` | 列出所有可用工具 |
| `/continue` | 继续上次对话（多轮上下文已自动保持） |
| `/context` | 显示对话上下文状态 |
| `/sandbox` | 代码沙箱状态 |
| `/plugins` | 插件列表 |
| `/plan` | 为任务生成执行计划 |
| `/sessions` | 历史会话列表 |
| `/config` | 当前配置 |
| `/saveconfig` | 保存配置到文件 |
| `/test` | 手动运行测试 |
| `/git` | Git 状态 |
| `/undo` / `/redo` | 撤销/重做文件修改 |
| `/memory` | 项目记忆 |
| `/help` | 帮助 |

## 工具清单（81 个）

### 文件操作
`read_file` `write_file` `edit_file` `append_file` `peek_file` `search_files` `list_dir` `project_tree` `grep` `find_symbol`

### Shell/系统
`shell` `sys_info` `disk_usage` `memory_usage` `process_list` `network_info` `env_manager` `chmod`

### 开发工具
`python` `pip` `npm` `test` `lint` `format` `regex` `detect_encoding` `analyze_image` `screenshot`

### Git
`git_status` `git_diff` `git_commit` `git_branch` `git_merge`

### 浏览器/Web
`browser` `fetch_page` `git_branch_tool` `chmod_tool`

### Docker
`docker_run` `docker_exec` `docker_logs` `docker_build` `docker_ps` `docker_stop`

### 视觉理解
`vision` `take_screenshot` `screenshot_analyze`

### 架构/Review
`plan` `review_code` `security_scan` `ast_analysis`

### LSP/AST
`lsp_symbol` `lsp_references` `lsp_definition` `ast_parse`

### 会话/项目
`session_list` `session_load` `session_create` `project_tree`

### Diff/Undo
`undo` `redo` `diff_show`

### 工具类
`path_resolve` `path_exists` `path_info` `file_type` `hash_file` `timestamp`

### Web 搜索
`web_search` `web_fetch` `web_extract`

## 架构

```
src/
├── agent.ts          # 主 Agent + REPL 交互
├── llm.ts            # LLM 客户端（DashScope 兼容）
├── types.ts          # 类型定义
├── context.ts        # 消息压缩/Token 计数
├── conversation.ts   # 多轮对话上下文管理
├── sandbox.ts        # 代码沙箱
├── plugin-system.ts  # 插件系统
├── plan.ts           # 任务计划生成
├── session.ts        # 会话管理
├── memory.ts         # 项目记忆
├── hooks.ts          # 钩子系统
├── approval.ts       # 命令审批
├── test-runner.ts    # 测试运行器
├── config.ts         # 配置
├── tui.ts            # 终端 UI 工具
└── tools/            # 81 个工具实现
    ├── file.ts       # 文件操作
    ├── shell.ts      # Shell 命令
    ├── sysops.ts     # 系统运维
    ├── devtools.ts   # 开发工具
    ├── browser.ts    # 浏览器自动化
    ├── docker.ts     # Docker 操作
    ├── vision.ts     # 视觉分析
    ├── git.ts        # Git 操作
    ├── review.ts     # 代码 Review
    └── ...
```

## 版本历史

| 版本 | 内容 |
|------|------|
| 1.0 | 基础文件读写 + Shell |
| 1.1 | 编辑操作 + 搜索 |
| 1.2 | Git + Docker + 浏览器 |
| 1.3 | 测试 + Lint + Review |
| 1.4 | 子 Agent + 会话管理 |
| 1.5 | 钩子系统 + 项目记忆 + LSP/AST |
| **1.7** | **多轮对话 + REPL 命令 + 视觉分析 + 沙箱 + 插件系统** |
| **1.8** | **完整 TUI 多面板仪表盘 + 实时状态渲染** |
| **1.9** | **插件工具注册 + Git 安装源 + 长命令心跳 + Resize 适配 + 配置持久化** |

## License

ISC
