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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPLAgent = exports.Agent = exports.SubAgent = void 0;
const chalk_1 = __importDefault(require("chalk"));
const readline_1 = __importDefault(require("readline"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
const llm = __importStar(require("./llm"));
const tools_1 = require("./tools");
const context_1 = require("./context");
const test_runner_1 = require("./test-runner");
const approval_1 = require("./approval");
const shell_1 = require("./tools/shell");
const plan_1 = require("./plan");
const hooks_1 = require("./hooks");
const memory_1 = require("./memory");
const session_1 = require("./session");
const conversation_1 = require("./conversation");
const sandbox_1 = require("./sandbox");
const plugin_system_1 = require("./plugin-system");
const tui_1 = require("./tui");
const DEFAULT_SYSTEM = `你是一个专业的 AI 编程助手。你有以下工具：

1. **read_file** - 读取文件内容
2. **write_file** - 写入文件（创建或覆盖，自动保存快照）
3. **edit_file** - 精准替换文件中的文本块（自动保存快照）
4. **append_file** - 追加到文件末尾（自动保存快照）
5. **peek_file** - 快速读取文件前 N 行
6. **search_files** - 按 glob 模式搜索文件
7. **list_dir** - 列出目录
8. **project_tree** - 打印项目文件树（自动忽略 node_modules/dist）
9. **grep** - ripgrep 全文搜索
10. **find_symbol** - 查找符号定义
11. **run_shell** - 执行 Shell 命令（危险命令需要审批）
12. **git_status** - 查看 Git 状态
13. **git_diff** - 查看文件差异
14. **git_commit** - 提交所有更改
15. **git_log** - 查看提交记录
16. **get_dependencies** - 分析文件的 import/require 依赖
17. **list_symbols** - 列出文件中定义的函数/类/变量（AST 级）
18. **call_graph** - 分析函数调用关系
19. **undo** - 撤销上一次文件修改
20. **redo** - 重做上一次撤销
21. **undo_history** - 查看撤销/重做历史
22. **apply_diff** - 使用 unified diff 格式精确修改文件
23. **generate_diff** - 生成文件差异对比
24. **list_sessions** - 列出所有已保存的会话

规则：
- 先用 project_tree 或 list_dir 了解项目结构
- 改代码优先用 edit_file 或 apply_diff
- 危险命令（rm/sudo/drop 等）会被拦截
- 写完后用 shell 命令验证
- 任务完成时总结做了什么
- 用中文回复`;
// Spinner
const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval = null;
function startSpinner(text) {
    let i = 0;
    process.stdout.write(`\r  ${chalk_1.default.cyan(spinners[i])} ${text}  `);
    spinnerInterval = setInterval(() => {
        i = (i + 1) % spinners.length;
        process.stdout.write(`\r  ${chalk_1.default.cyan(spinners[i])} ${text}  `);
    }, 100);
}
function stopSpinner() {
    if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
    }
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
}
function renderStatusBar(round, tokens, toolsUsed) {
    const bar = '─'.repeat(60);
    process.stdout.write(`\n${chalk_1.default.gray(bar)}\n`);
    process.stdout.write(`  ${chalk_1.default.cyan(`🔄 第 ${round} 轮`)} | ` +
        `${chalk_1.default.yellow(`📊 ~${tokens} tokens`)} | ` +
        `${chalk_1.default.green(`🔧 工具调用: ${toolsUsed}`)}\n`);
    process.stdout.write(`${chalk_1.default.gray(bar)}\n`);
}
/**
 * 完整 TUI 多面板仪表盘
 */
class TUIDashboard {
    cwd;
    task;
    model;
    sessionId;
    stats;
    outputLines = [];
    recentTools = [];
    spinnerText;
    startTime;
    constructor(cwd) {
        this.cwd = cwd;
        this.task = '';
        this.model = '';
        this.stats = { round: 0, toolCalls: 0, tokens: 0, lastTool: '' };
        this.startTime = Date.now();
    }
    init(task, model, sessionId) {
        this.task = task;
        this.model = model;
        this.sessionId = sessionId;
        this.startTime = Date.now();
    }
    updateStats(stats) {
        Object.assign(this.stats, stats);
    }
    addOutput(line) {
        this.outputLines.push(line);
        // 最多保留 200 行
        if (this.outputLines.length > 200) {
            this.outputLines = this.outputLines.slice(-200);
        }
    }
    addRecentTool(name) {
        this.recentTools.unshift(name);
        if (this.recentTools.length > 10) {
            this.recentTools = this.recentTools.slice(0, 10);
        }
    }
    setSpinner(text) {
        this.spinnerText = text;
    }
    getElapsedTime() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        return mins > 0 ? `${mins}m${secs}s` : `${secs}s`;
    }
    render() {
        (0, tui_1.renderDashboard)({
            round: this.stats.round,
            tokens: this.stats.tokens,
            toolCalls: this.stats.toolCalls,
            time: this.getElapsedTime(),
            task: this.task,
            cwd: this.cwd,
            model: this.model,
            outputLines: this.outputLines,
            recentTools: this.recentTools,
            sessionId: this.sessionId,
            spinnerText: this.spinnerText,
        });
    }
    /**
     * 获取当前状态（用于 resize 重渲染）
     */
    get state() {
        return {
            round: this.stats.round,
            tokens: this.stats.tokens,
            toolCalls: this.stats.toolCalls,
            time: this.getElapsedTime(),
            task: this.task,
            cwd: this.cwd,
            model: this.model,
            outputLines: this.outputLines,
            recentTools: this.recentTools,
            sessionId: this.sessionId,
            spinnerText: this.spinnerText,
        };
    }
    /**
     * 从状态对象渲染（用于 resize）
     */
    renderFromState(state) {
        (0, tui_1.renderDashboard)(state);
    }
    clear() {
        process.stdout.write('\x1B[2J\x1B[H');
    }
}
/**
 * 子 Agent — 用于并行处理子任务
 */
class SubAgent {
    id;
    messages;
    config;
    toolCallHistory;
    totalToolCalls;
    constructor(id, config, systemPrompt) {
        this.id = id;
        this.config = config;
        this.messages = [
            { role: 'system', content: systemPrompt || DEFAULT_SYSTEM },
        ];
        this.toolCallHistory = new Map();
        this.totalToolCalls = 0;
        llm.initClient(config.apiKey, config.baseURL);
        (0, shell_1.setApprovalHandler)(approval_1.askApproval);
    }
    async run(task) {
        console.log(chalk_1.default.magenta(`\n  ┌─ 子 Agent [${this.id}] 启动`));
        console.log(chalk_1.default.magenta(`  │  任务: ${task.slice(0, 80)}${task.length > 80 ? '...' : ''}`));
        this.messages.push({ role: 'user', content: task });
        let iteration = 0;
        const maxIterations = this.config.maxIterations || 15;
        while (iteration < maxIterations) {
            iteration++;
            const compressed = (0, context_1.compressMessages)(this.messages, 40000);
            startSpinner(`子 Agent [${this.id}] 思考中...`);
            const reply = await llm.chatStreaming(this.config.model, compressed, (0, tools_1.toOpenAIFormat)(), (_text) => { if (spinnerInterval)
                stopSpinner(); });
            if (spinnerInterval)
                stopSpinner();
            if (reply.tool_calls && reply.tool_calls.length > 0) {
                this.messages.push(reply);
                for (const tc of reply.tool_calls) {
                    const fn = JSON.parse(tc.function.arguments);
                    const toolName = tc.function.name;
                    console.log(chalk_1.default.magenta(`  │  🔧 ${toolName}(${JSON.stringify(fn).slice(0, 60)})`));
                    const tool = (0, tools_1.getTool)(toolName);
                    if (!tool)
                        continue;
                    const key = `${toolName}:${JSON.stringify(fn)}`;
                    const count = this.toolCallHistory.get(key) || 0;
                    if (count >= 2)
                        continue;
                    this.toolCallHistory.set(key, count + 1);
                    this.totalToolCalls++;
                    const result = await tool.execute(fn, this.config.cwd);
                    const output = (0, context_1.truncateToolOutput)(result.output, 2000);
                    if (result.success) {
                        console.log(chalk_1.default.magenta(`  │  ✅ ${output.split('\n')[0]}`));
                    }
                    else {
                        console.log(chalk_1.default.magenta(`  │  ❌ ${result.error || output}`));
                    }
                    this.messages.push({
                        role: 'tool',
                        content: output,
                        tool_call_id: tc.id,
                        name: toolName,
                    });
                }
            }
            else {
                console.log(chalk_1.default.magenta(`  └─ 子 Agent [${this.id}] 完成`));
                return (0, types_1.messageText)(reply) || '(无回复)';
            }
        }
        console.log(chalk_1.default.magenta(`  └─ 子 Agent [${this.id}] 达到最大迭代`));
        return '(达到最大迭代次数)';
    }
}
exports.SubAgent = SubAgent;
/**
 * 主 Agent
 */
class Agent {
    config;
    messages = [];
    toolCallHistory = new Map();
    totalToolCalls = 0;
    agentConfig;
    testRunner;
    subAgentCount = 0;
    currentSession = null;
    contextManager;
    codeSandbox;
    pluginManager;
    dashboard;
    constructor(config, agentConfig) {
        this.config = config;
        this.agentConfig = agentConfig || {
            cwd: config.cwd,
            model: config.model,
            apiKey: config.apiKey,
            baseUrl: config.baseURL,
            maxIterations: config.maxIterations,
            maxToolTokens: 3000,
            maxContextTokens: 60000,
            autoApprove: ['ls', 'cat', 'echo', 'pwd', 'head', 'tail', 'wc'],
            skipApproval: false,
            testCommand: 'npm test',
            lintCommand: 'npm run lint',
            autoTest: false,
            maxTestRetries: 3,
            autoCommit: false,
            commitPrefix: '🤖 coding-agent: ',
            maxSubAgents: 3,
        };
        llm.initClient(config.apiKey, config.baseURL);
        (0, shell_1.setApprovalHandler)(approval_1.askApproval);
        this.testRunner = new test_runner_1.TestRunner(this.agentConfig.cwd);
        // 初始化上下文管理器
        this.contextManager = new conversation_1.ContextManager(config.cwd);
        this.codeSandbox = new sandbox_1.CodeSandbox(config.cwd);
        this.pluginManager = new plugin_system_1.PluginManager(config.cwd);
        this.dashboard = new TUIDashboard(config.cwd);
        // 注册内置钩子
        hooks_1.globalHooks.on('after_tool_execute', (0, hooks_1.createRateLimitHook)(50, 60000));
        // 加载并注册插件工具
        this.registerPluginTools();
        // 设置 Shell 心跳处理器（长命令执行时保持 spinner 活跃）
        (0, shell_1.setHeartbeatHandler)((msg) => {
            if (this.dashboard) {
                this.dashboard.setSpinner(msg);
                this.dashboard.render();
            }
        });
        // 终端 resize 监听
        (0, tui_1.handleTerminalResize)(this.dashboard.state, (state) => this.dashboard?.renderFromState(state));
    }
    /**
     * 加载插件工具并合并到全局工具列表
     */
    async registerPluginTools() {
        if (!this.pluginManager)
            return;
        const loaded = await this.pluginManager.loadAllPlugins();
        const pluginTools = this.pluginManager.getPluginTools();
        for (const tool of pluginTools) {
            if (!tools_1.tools.find(t => t.name === tool.name)) {
                tools_1.tools.push(tool);
                console.log(`🧩 插件工具已注册: ${tool.name}`);
            }
        }
        if (pluginTools.length > 0) {
            console.log(`🧩 已加载 ${pluginTools.length} 个插件工具`);
        }
    }
    /**
     * 重新加载插件工具（热重载后调用）
     */
    async reloadPluginTools() {
        if (!this.pluginManager)
            return;
        // 清除旧插件工具
        const pluginToolNames = new Set(this.pluginManager.getPluginTools().map(t => t.name));
        const staticToolNames = new Set([
            'read', 'write', 'edit_file', 'append_file', 'peek', 'search_files', 'list_dir', 'tree',
            'grep', 'find_symbol', 'shell', 'git_status', 'git_diff', 'git_commit', 'git_log',
            'dependencies', 'symbols', 'call_graph', 'undo', 'redo', 'undo_history',
            'apply_diff', 'generate_diff', 'session', 'list_sessions', 'delete_session',
            'web_search', 'web_fetch', 'lsp_hover', 'lsp_definition', 'lsp_references', 'lsp_diagnostics',
            'docker_ps', 'docker_logs', 'docker_exec', 'docker_compose',
            'sqlite_query', 'sqlite_tables', 'sqlite_schema',
            'format', 'read_image', 'notify', 'mcp_status',
            'code_review', 'batch_review',
            'env', 'http_server', 'archive', 'ssh', 'config',
            'ps', 'kill', 'ping', 'port_check', 'curl', 'log', 'perf',
            'python_repl', 'pip', 'npm', 'screenshot', 'regex', 'detect_encoding', 'env_manager',
            'browser', 'fetch_page', 'git_branch', 'git_merge', 'chmod',
            'take_screenshot', 'vision', 'screenshot_analyze', 'analyze_image',
        ]);
        // 只清除不在静态列表中的（即插件工具）
        for (let i = tools_1.tools.length - 1; i >= 0; i--) {
            if (!staticToolNames.has(tools_1.tools[i].name)) {
                tools_1.tools.splice(i, 1);
            }
        }
        // 重新加载
        await this.registerPluginTools();
    }
    /**
     * 执行主任务
     */
    async run(task) {
        // 加载/创建项目记忆
        let memory = (0, memory_1.loadMemory)(this.config.cwd);
        if (!memory) {
            memory = (0, memory_1.autoDetect)(this.config.cwd);
            (0, memory_1.saveMemory)(this.config.cwd, memory);
            console.log(chalk_1.default.gray(`🧠 已自动检测项目: ${memory.projectName} (${memory.language.join(', ')})`));
        }
        // 创建会话
        this.currentSession = (0, session_1.createSession)(task.slice(0, 50));
        // 构建系统提示（注入项目记忆 + 对话上下文）
        const systemPrompt = this.config.systemPrompt || DEFAULT_SYSTEM;
        const memoryContext = (0, memory_1.formatMemoryForContext)(memory);
        const conversationContext = this.contextManager?.getContextSummary() || '';
        let fullSystemPrompt = `${systemPrompt}\n\n## 项目上下文\n${memoryContext}`;
        if (conversationContext) {
            fullSystemPrompt += `\n\n## 对话上下文\n${conversationContext}`;
        }
        // 渲染 TUI 面板
        this.dashboard?.init(task, this.config.model, this.currentSession?.id);
        this.dashboard?.render();
        console.log(chalk_1.default.gray(`   工作目录: ${this.config.cwd}`));
        console.log(chalk_1.default.gray(`   模型:     ${this.config.model}`));
        console.log(chalk_1.default.gray(`   项目:     ${memory.projectName} [${memory.language.join(', ')}]`));
        console.log(chalk_1.default.gray(`   最大轮数: ${this.config.maxIterations}`));
        console.log(chalk_1.default.gray(`   会话 ID:  ${this.currentSession.id.slice(0, 30)}...`));
        console.log(chalk_1.default.bold.yellow(`\n📋 任务: ${task}\n`));
        // 添加对话上下文
        this.contextManager?.addUserMessage(task);
        // 多轮对话：如果已有消息历史，追加新任务；否则初始化
        if (this.messages.length > 0 && this.messages.some(m => m.role === 'assistant')) {
            this.messages.push({ role: 'user', content: task });
        }
        else {
            this.messages = [
                { role: 'system', content: fullSystemPrompt },
                { role: 'user', content: task },
            ];
        }
        let iteration = 0;
        while (iteration < this.config.maxIterations) {
            iteration++;
            this.dashboard?.updateStats({ round: iteration, toolCalls: this.totalToolCalls });
            const compressed = (0, context_1.compressMessages)(this.messages, this.agentConfig.maxContextTokens);
            const currentTokens = compressed.reduce((s, m) => s + (0, context_1.countMessageTokens)(m), 0);
            this.dashboard?.updateStats({ tokens: currentTokens });
            this.dashboard?.setSpinner('思考中...');
            this.dashboard?.render();
            startSpinner('思考中...');
            const reply = await llm.chatStreaming(this.config.model, compressed, (0, tools_1.toOpenAIFormat)(), (text) => {
                if (spinnerInterval)
                    stopSpinner();
                process.stdout.write(chalk_1.default.white(text));
            });
            if (spinnerInterval)
                stopSpinner();
            this.dashboard?.setSpinner(undefined);
            if (reply.tool_calls && reply.tool_calls.length > 0) {
                this.messages.push(reply);
                const replyText = (0, types_1.messageText)(reply) || '';
                if (replyText)
                    this.dashboard?.addOutput(replyText.slice(0, 100));
                for (const tc of reply.tool_calls) {
                    const fn = JSON.parse(tc.function.arguments);
                    const toolName = tc.function.name;
                    console.log(chalk_1.default.green(`\n  🔧 ${toolName}(${JSON.stringify(fn).slice(0, 80)})`));
                    this.dashboard?.addRecentTool(toolName);
                    // 钩子: before
                    let hookCtx = await hooks_1.globalHooks.emit('before_tool_execute', {
                        toolName, toolArgs: fn, taskName: task,
                    });
                    if (hookCtx.toolResult) {
                        console.log(chalk_1.default.yellow(`  ⛔ 被钩子拦截: ${hookCtx.toolResult.error}`));
                        this.messages.push({
                            role: 'tool',
                            content: hookCtx.toolResult.output || hookCtx.toolResult.error || '',
                            tool_call_id: tc.id,
                            name: toolName,
                        });
                        continue;
                    }
                    const tool = (0, tools_1.getTool)(toolName);
                    if (!tool) {
                        console.log(chalk_1.default.red(`  ❌ 未知工具: ${toolName}`));
                        continue;
                    }
                    const key = `${toolName}:${JSON.stringify(fn)}`;
                    const count = this.toolCallHistory.get(key) || 0;
                    if (count >= 3) {
                        console.log(chalk_1.default.yellow(`  ⚠️  同一调用已执行 ${count} 次，跳过`));
                        continue;
                    }
                    this.toolCallHistory.set(key, count + 1);
                    this.totalToolCalls++;
                    this.currentSession.toolCalls++;
                    this.dashboard?.updateStats({ lastTool: toolName });
                    startSpinner(`执行 ${toolName}...`);
                    const result = await tool.execute(fn, this.config.cwd);
                    stopSpinner();
                    // 钩子: after
                    await hooks_1.globalHooks.emit('after_tool_execute', {
                        toolName, toolArgs: fn, toolResult: result, taskName: task,
                    });
                    const output = (0, context_1.truncateToolOutput)(result.output, this.agentConfig.maxToolTokens);
                    if (result.success) {
                        const lines = output.split('\n').slice(0, 3);
                        console.log(chalk_1.default.gray(`  ✅ ${lines.join('\n  ')}`));
                        this.dashboard?.addOutput(`✅ ${toolName}: ${lines[0]}`);
                    }
                    else {
                        console.log(chalk_1.default.red(`  ❌ ${result.error || output}`));
                        this.dashboard?.addOutput(`❌ ${toolName}: ${result.error || 'failed'}`);
                    }
                    this.messages.push({
                        role: 'tool',
                        content: output,
                        tool_call_id: tc.id,
                        name: toolName,
                    });
                    // 记录到会话
                    this.currentSession.messageCount++;
                    (0, session_1.updateSession)(this.currentSession.id, { messageCount: this.currentSession.messageCount, toolCalls: this.currentSession.toolCalls });
                }
            }
            else {
                console.log();
                console.log(chalk_1.default.gray(`\n🏁 完成 (共 ${iteration} 轮, 工具调用 ${this.totalToolCalls} 次)`));
                this.dashboard?.setSpinner('✅ 完成');
                this.dashboard?.render();
                // 更新对话上下文
                const replyText = (0, types_1.messageText)(reply) || '';
                this.contextManager?.addAssistantMessage(replyText);
                this.contextManager?.completeTask(task, replyText, [], []);
                // 更新会话
                if (this.currentSession) {
                    (0, session_1.updateSession)(this.currentSession.id, {
                        messageCount: this.currentSession.messageCount + 1,
                        summary: replyText.slice(0, 200),
                    });
                }
                // 更新项目记忆
                this.updateMemory(task, replyText);
                await this.runPostTaskActions();
                break;
            }
        }
        if (iteration >= this.config.maxIterations) {
            console.log(chalk_1.default.red(`\n⚠️  达到最大迭代次数 (${this.config.maxIterations})`));
        }
    }
    /**
     * 更新项目记忆
     */
    updateMemory(task, result) {
        const memory = (0, memory_1.loadMemory)(this.config.cwd);
        if (!memory)
            return;
        (0, memory_1.addTask)(memory, task, result);
        (0, memory_1.saveMemory)(this.config.cwd, memory);
    }
    /**
     * 任务完成后处理
     */
    async runPostTaskActions() {
        if (this.agentConfig.autoTest && this.agentConfig.testCommand) {
            console.log(chalk_1.default.cyan('\n📦 任务完成，执行自动测试...'));
            for (let i = 0; i < this.agentConfig.maxTestRetries; i++) {
                const result = await this.testRunner.runTest(this.agentConfig.testCommand);
                if (result.success) {
                    console.log(chalk_1.default.green('✅ 测试通过！'));
                    break;
                }
                else {
                    console.log(chalk_1.default.red(`❌ 测试失败 (第 ${i + 1}/${this.agentConfig.maxTestRetries} 次)`));
                    if (result.error) {
                        console.log(chalk_1.default.gray(`   ${result.error.split('\n').slice(0, 5).join('\n   ')}`));
                    }
                    this.messages.push({
                        role: 'user',
                        content: `测试失败了，请修复。错误信息：\n${result.error || result.output}`,
                    });
                    const fixReply = await llm.chatStreaming(this.config.model, (0, context_1.compressMessages)(this.messages, this.agentConfig.maxContextTokens), (0, tools_1.toOpenAIFormat)(), (text) => process.stdout.write(chalk_1.default.white(text)));
                    if (fixReply.tool_calls) {
                        this.messages.push(fixReply);
                        for (const tc of fixReply.tool_calls) {
                            const fn = JSON.parse(tc.function.arguments);
                            const tool = (0, tools_1.getTool)(tc.function.name);
                            if (tool) {
                                const result = await tool.execute(fn, this.config.cwd);
                                this.messages.push({
                                    role: 'tool',
                                    content: (0, context_1.truncateToolOutput)(result.output, 2000),
                                    tool_call_id: tc.id,
                                    name: tc.function.name,
                                });
                            }
                        }
                    }
                }
            }
        }
        if (this.agentConfig.autoCommit) {
            console.log(chalk_1.default.cyan('\n📦 自动 Git 提交...'));
            const gitTool = (0, tools_1.getTool)('git_status');
            if (gitTool) {
                const statusResult = await gitTool.execute({}, this.config.cwd);
                console.log(chalk_1.default.gray(`  ${statusResult.output}`));
                if (!statusResult.output.includes('干净')) {
                    const commitTool = (0, tools_1.getTool)('git_commit');
                    if (commitTool) {
                        await commitTool.execute({ message: `${this.agentConfig.commitPrefix}auto commit after task` }, this.config.cwd);
                        console.log(chalk_1.default.green('✅ 已自动提交'));
                    }
                }
            }
        }
    }
    /**
     * 并行派生多个子 Agent
     */
    async spawnSubAgents(subTasks) {
        const maxSubAgents = this.agentConfig.maxSubAgents;
        const results = new Map();
        console.log(chalk_1.default.magenta(`\n🌟 派生 ${subTasks.length} 个子 Agent（最多 ${maxSubAgents} 并行）...`));
        for (let i = 0; i < subTasks.length; i += maxSubAgents) {
            const batch = subTasks.slice(i, i + maxSubAgents);
            const promises = batch.map(async ({ id, task }) => {
                const subAgent = new SubAgent(id, {
                    model: this.config.model,
                    apiKey: this.config.apiKey,
                    baseURL: this.config.baseURL,
                    cwd: this.config.cwd,
                    maxIterations: 15,
                }, this.config.systemPrompt);
                const result = await subAgent.run(task);
                results.set(id, result);
                return { id, result };
            });
            await Promise.all(promises);
        }
        console.log(chalk_1.default.magenta(`\n🌟 所有子 Agent 完成`));
        return results;
    }
    /**
     * 加载历史会话（从摘要恢复上下文）
     */
    async loadSession(sessionId) {
        const session = (0, session_1.getSession)(sessionId);
        if (!session) {
            console.log(chalk_1.default.red(`❌ 未找到会话: ${sessionId}`));
            return false;
        }
        console.log(chalk_1.default.cyan(`📂 已加载会话: ${session.title}`));
        this.currentSession = session;
        // 从会话摘要重建基础上下文
        this.messages = [
            { role: 'system', content: this.config.systemPrompt || DEFAULT_SYSTEM },
            { role: 'user', content: session.task },
        ];
        if (session.summary) {
            this.messages.push({ role: 'assistant', content: `[上次会话结果] ${session.summary}` });
        }
        return true;
    }
    /**
     * 获取上下文管理器（REPL 使用）
     */
    getConversationContext() {
        return this.contextManager;
    }
    /**
     * 获取代码沙箱（REPL 使用）
     */
    getCodeSandbox() {
        return this.codeSandbox;
    }
    /**
     * 获取插件管理器（REPL 使用）
     */
    getPluginManager() {
        return this.pluginManager;
    }
    /**
     * 持久化 Agent 配置到 .agent-config.json
     */
    saveConfig() {
        const configPath = path.join(this.config.cwd, '.agent-config.json');
        const persistentConfig = {
            model: this.config.model,
            baseURL: this.config.baseURL,
            maxIterations: this.config.maxIterations,
            maxContextTokens: this.agentConfig.maxContextTokens,
            maxToolTokens: this.agentConfig.maxToolTokens,
            autoApprove: this.agentConfig.autoApprove,
            autoTest: this.agentConfig.autoTest,
            testCommand: this.agentConfig.testCommand,
            lintCommand: this.agentConfig.lintCommand,
            autoCommit: this.agentConfig.autoCommit,
            commitPrefix: this.agentConfig.commitPrefix,
            savedAt: new Date().toISOString(),
        };
        fs.writeFileSync(configPath, JSON.stringify(persistentConfig, null, 2));
    }
    /**
     * 从 .agent-config.json 加载配置（如果存在）
     */
    static loadSavedConfig(cwd) {
        const configPath = path.join(cwd, '.agent-config.json');
        if (!fs.existsSync(configPath))
            return null;
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        catch {
            return null;
        }
    }
    get sessionId() {
        return this.currentSession?.id || null;
    }
    /**
     * 清空消息历史（保留 system prompt）
     */
    clearHistory() {
        const systemMsg = this.messages.find(m => m.role === 'system');
        this.messages = systemMsg ? [systemMsg] : [];
        this.totalToolCalls = 0;
        this.toolCallHistory.clear();
        this.contextManager = new conversation_1.ContextManager(this.config.cwd);
        console.log(chalk_1.default.gray('🗑️  已清空对话历史'));
    }
    /**
     * 获取消息统计
     */
    getMessageStats() {
        const totalMessages = this.messages.length;
        const userCount = this.messages.filter(m => m.role === 'user').length;
        const assistantCount = this.messages.filter(m => m.role === 'assistant').length;
        const toolCount = this.messages.filter(m => m.role === 'tool').length;
        const totalTokens = this.messages.reduce((sum, m) => sum + (0, context_1.countMessageTokens)(m), 0);
        return { totalMessages, userCount, assistantCount, toolCount, totalTokens };
    }
    /**
     * 获取最近的工具调用记录
     */
    getRecentToolCalls() {
        return [...this.toolCallHistory.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([name, count]) => ({ name, count }));
    }
    /**
     * 继续上次对话（追加消息）
     */
    continueConversation(message) {
        this.messages.push({ role: 'user', content: message });
        this.contextManager?.addUserMessage(message);
    }
}
exports.Agent = Agent;
/**
 * REPL 交互模式（改进版 — 支持多轮对话）
 */
class REPLAgent {
    agent;
    rl;
    agentConfig;
    constructor(config, agentConfig) {
        this.agentConfig = agentConfig || {
            cwd: config.cwd,
            model: config.model,
            apiKey: config.apiKey,
            baseUrl: config.baseURL,
            maxIterations: config.maxIterations,
            maxToolTokens: 3000,
            maxContextTokens: 60000,
            autoApprove: ['ls', 'cat', 'echo', 'pwd', 'head', 'tail', 'wc'],
            skipApproval: false,
            testCommand: 'npm test',
            lintCommand: 'npm run lint',
            autoTest: false,
            maxTestRetries: 3,
            autoCommit: false,
            commitPrefix: '🤖 coding-agent: ',
            maxSubAgents: 3,
        };
        this.agent = new Agent(config, this.agentConfig);
        this.rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }
    async start() {
        console.log(chalk_1.default.bold.cyan('\n╔══════════════════════════════════════╗'));
        console.log(chalk_1.default.bold.cyan('║     🤖  Coding Agent REPL v1.6     ║'));
        console.log(chalk_1.default.bold.cyan('╚══════════════════════════════════════╝'));
        console.log(chalk_1.default.gray('   输入任务描述，输入 /quit 退出\n'));
        console.log(chalk_1.default.gray('   命令: /quit /reset /clear /history /stats /tools /continue /plan /sessions /config /test /git /undo /redo /memory /context /sandbox /plugins'));
        const ask = () => {
            return new Promise(resolve => {
                this.rl.question(chalk_1.default.bold.green('\n👤 任务: '), resolve);
            });
        };
        while (true) {
            const task = await ask();
            const trimmed = task.trim();
            if (!trimmed)
                continue;
            if (trimmed === '/quit' || trimmed === '/exit') {
                // 保存配置
                this.agent.saveConfig();
                // 清 resize 监听
                (0, tui_1.cleanupResizeListener)();
                console.log(chalk_1.default.gray('👋 再见！'));
                this.rl.close();
                break;
            }
            if (trimmed === '/reset') {
                console.log(chalk_1.default.gray('🔄 已重置上下文'));
                this.agent = new Agent({
                    model: this.config.model,
                    apiKey: this.config.apiKey,
                    baseURL: this.config.baseURL,
                    cwd: this.config.cwd,
                    maxIterations: this.config.maxIterations,
                }, this.agentConfig);
                continue;
            }
            if (trimmed === '/help') {
                console.log(chalk_1.default.gray('  /quit          - 退出'));
                console.log(chalk_1.default.gray('  /reset         - 重置上下文'));
                console.log(chalk_1.default.gray('  /clear         - 清空消息历史'));
                console.log(chalk_1.default.gray('  /continue      - 继续上次任务'));
                console.log(chalk_1.default.gray('  /history       - 查看工具调用历史'));
                console.log(chalk_1.default.gray('  /stats         - 显示对话统计'));
                console.log(chalk_1.default.gray('  /tools         - 列出所有工具'));
                console.log(chalk_1.default.gray('  /plan          - 生成执行计划'));
                console.log(chalk_1.default.gray('  /sessions      - 列出历史会话'));
                console.log(chalk_1.default.gray('  /config        - 显示当前配置'));
                console.log(chalk_1.default.gray('  /saveconfig    - 保存配置到文件'));
                console.log(chalk_1.default.gray('  /test          - 手动运行测试'));
                console.log(chalk_1.default.gray('  /git           - 显示 Git 状态'));
                console.log(chalk_1.default.gray('  /undo          - 撤销上一次修改'));
                console.log(chalk_1.default.gray('  /redo          - 重做撤销'));
                console.log(chalk_1.default.gray('  /memory        - 显示项目记忆'));
                console.log(chalk_1.default.gray('  /context       - 显示对话上下文'));
                console.log(chalk_1.default.gray('  /sandbox       - 沙箱状态'));
                console.log(chalk_1.default.gray('  /plugins       - 插件列表'));
                continue;
            }
            if (trimmed === '/context') {
                const ctx = this.agent.getConversationContext();
                if (ctx) {
                    const stats = ctx.getStats();
                    console.log(chalk_1.default.cyan('💬 对话上下文:'));
                    console.log(chalk_1.default.gray(`  任务计数: ${stats.taskCount}`));
                    console.log(chalk_1.default.gray(`  消息数量: ${stats.messageCount}`));
                    console.log(chalk_1.default.gray(`  最近任务: ${stats.recentWork}`));
                    if (stats.openFiles.length > 0) {
                        console.log(chalk_1.default.gray(`  打开文件: ${stats.openFiles.join(', ')}`));
                    }
                }
                continue;
            }
            if (trimmed === '/sandbox') {
                const sb = this.agent.getCodeSandbox();
                if (sb) {
                    const status = sb.getStatus();
                    console.log(chalk_1.default.cyan('🏖️  沙箱状态:'));
                    console.log(chalk_1.default.gray(`  临时目录: ${status.tempDir}`));
                    console.log(chalk_1.default.gray(`  超时: ${status.config.timeout}s`));
                    console.log(chalk_1.default.gray(`  最大内存: ${status.config.maxMemory}MB`));
                    console.log(chalk_1.default.gray(`  网络: ${status.config.network ? '✅' : '❌'}`));
                }
                continue;
            }
            if (trimmed === '/plugins') {
                const pm = this.agent.getPluginManager();
                if (pm) {
                    console.log(chalk_1.default.cyan('🧩 插件:'));
                    console.log(chalk_1.default.gray(pm.getPluginStatus()));
                }
                continue;
            }
            if (trimmed === '/sessions') {
                console.log(chalk_1.default.cyan('📂 历史会话:'));
                console.log(chalk_1.default.gray((0, session_1.formatSessionList)()));
                continue;
            }
            if (trimmed === '/memory') {
                const memory = (0, memory_1.loadMemory)(this.config.cwd);
                if (memory) {
                    console.log(chalk_1.default.cyan('🧠 项目记忆:'));
                    console.log(chalk_1.default.gray((0, memory_1.formatMemoryForContext)(memory)));
                }
                else {
                    console.log(chalk_1.default.gray('(无项目记忆)'));
                }
                continue;
            }
            if (trimmed === '/plan') {
                console.log(chalk_1.default.gray('为以下任务生成计划:'));
                const planTask = await ask();
                if (planTask.trim()) {
                    const plan = await (0, plan_1.generatePlan)(this.config.model, [{ role: 'system', content: '' }, { role: 'user', content: planTask }], DEFAULT_SYSTEM);
                    (0, plan_1.renderPlan)(plan);
                }
                continue;
            }
            if (trimmed === '/config') {
                console.log(chalk_1.default.gray(JSON.stringify(this.agentConfig, null, 2)));
                continue;
            }
            if (trimmed === '/saveconfig') {
                this.agent.saveConfig();
                console.log(chalk_1.default.green('✅ 配置已保存到 .agent-config.json'));
                continue;
            }
            if (trimmed === '/test') {
                const result = await this.agent['testRunner'].runTest(this.agentConfig.testCommand);
                console.log(result.success ? chalk_1.default.green('✅ 测试通过') : chalk_1.default.red(`❌ ${result.error}`));
                continue;
            }
            if (trimmed === '/git') {
                const gitTool = (0, tools_1.getTool)('git_status');
                if (gitTool) {
                    const result = await gitTool.execute({}, this.agentConfig.cwd);
                    console.log(chalk_1.default.gray(result.output));
                }
                continue;
            }
            if (trimmed === '/undo') {
                const undoTool = (0, tools_1.getTool)('undo');
                if (undoTool) {
                    const result = await undoTool.execute({}, this.agentConfig.cwd);
                    console.log(result.success ? chalk_1.default.green(`✅ ${result.output}`) : chalk_1.default.red(`❌ ${result.error || result.output}`));
                }
                continue;
            }
            if (trimmed === '/redo') {
                const redoTool = (0, tools_1.getTool)('redo');
                if (redoTool) {
                    const result = await redoTool.execute({}, this.agentConfig.cwd);
                    console.log(result.success ? chalk_1.default.green(`✅ ${result.output}`) : chalk_1.default.red(`❌ ${result.error || result.output}`));
                }
                continue;
            }
            if (trimmed === '/clear') {
                this.agent.clearHistory();
                continue;
            }
            if (trimmed === '/history') {
                const recent = this.agent.getRecentToolCalls();
                if (recent.length === 0) {
                    console.log(chalk_1.default.gray('(暂无工具调用记录)'));
                }
                else {
                    console.log(chalk_1.default.cyan('🔧 工具调用历史:'));
                    for (const { name, count } of recent) {
                        console.log(chalk_1.default.gray(`  ${name} × ${count}`));
                    }
                    console.log(chalk_1.default.gray(`  总调用次数: ${this.agent['totalToolCalls']}`));
                }
                continue;
            }
            if (trimmed === '/stats') {
                const stats = this.agent.getMessageStats();
                console.log(chalk_1.default.cyan('📊 对话统计:'));
                console.log(chalk_1.default.gray(`  总消息: ${stats.totalMessages}`));
                console.log(chalk_1.default.gray(`  用户消息: ${stats.userCount}`));
                console.log(chalk_1.default.gray(`  AI 回复: ${stats.assistantCount}`));
                console.log(chalk_1.default.gray(`  工具调用结果: ${stats.toolCount}`));
                console.log(chalk_1.default.gray(`  估算 Token: ~${stats.totalTokens}`));
                console.log(chalk_1.default.gray(`  工具总调用: ${this.agent['totalToolCalls']}`));
                const ctx = this.agent.getConversationContext();
                if (ctx) {
                    const cs = ctx.getStats();
                    console.log(chalk_1.default.gray(`  任务计数: ${cs.taskCount}`));
                    console.log(chalk_1.default.gray(`  打开文件: ${cs.openFiles.length}`));
                }
                continue;
            }
            if (trimmed === '/tools') {
                const toolNames = [
                    'read_file', 'write_file', 'edit_file', 'append_file', 'peek_file',
                    'search_files', 'list_dir', 'project_tree', 'grep', 'find_symbol',
                    'shell', 'python', 'pip', 'npm', 'browser', 'fetch_page',
                    'git_status', 'git_diff', 'git_commit', 'git_branch', 'git_merge',
                    'docker_run', 'docker_exec', 'docker_logs',
                    'vision', 'take_screenshot', 'screenshot_analyze', 'analyze_image',
                    'plan', 'test', 'lint', 'format', 'undo', 'redo',
                    'sys_info', 'disk_usage', 'memory_usage', 'process_list',
                    'review_code', 'security_scan', 'chmod', 'chmod_tool',
                ];
                console.log(chalk_1.default.cyan(`🔧 可用工具 (${toolNames.length}):`));
                for (const name of toolNames.sort()) {
                    const t = (0, tools_1.getTool)(name);
                    if (t) {
                        console.log(chalk_1.default.gray(`  ${name.padEnd(25)} ${t.description.slice(0, 50)}`));
                    }
                }
                continue;
            }
            if (trimmed === '/continue') {
                console.log(chalk_1.default.gray('(REPL 模式下直接输入即可继续对话，消息历史已自动保持)'));
                continue;
            }
            try {
                await this.agent.run(trimmed);
            }
            catch (err) {
                console.log(chalk_1.default.red(`\n💥 执行失败: ${err.message}`));
            }
        }
    }
    get config() {
        return this.agent['config'];
    }
}
exports.REPLAgent = REPLAgent;
//# sourceMappingURL=agent.js.map