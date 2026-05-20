"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderBorder = renderBorder;
exports.renderTopBar = renderTopBar;
exports.renderInfoPanel = renderInfoPanel;
exports.renderOutputPanel = renderOutputPanel;
exports.renderBottomBar = renderBottomBar;
exports.renderToolCallInline = renderToolCallInline;
exports.getSpinnerFrame = getSpinnerFrame;
exports.renderSpinner = renderSpinner;
exports.renderDashboard = renderDashboard;
exports.renderStartupBanner = renderStartupBanner;
exports.handleTerminalResize = handleTerminalResize;
exports.cleanupResizeListener = cleanupResizeListener;
const chalk_1 = __importDefault(require("chalk"));
// 终端宽度
function getTerminalWidth() {
    return process.stdout.columns || 80;
}
function getTerminalHeight() {
    return process.stdout.rows || 24;
}
// ANSI 光标控制
function moveCursor(x, y) {
    return `\x1b[${y};${x}H`;
}
function clearLine() {
    return '\x1b[2K';
}
function saveCursor() {
    return '\x1b[s';
}
function restoreCursor() {
    return '\x1b[u';
}
// ─── 面板边框 ──────────────────────────────
function renderBorder(title, width, height, x, y) {
    const topLine = `┌${'─'.repeat(width - 2)}┐`;
    const bottomLine = `└${'─'.repeat(width - 2)}┘`;
    const titleStr = ` ${title} `;
    const topWithTitle = `┌${titleStr}${'─'.repeat(width - 2 - titleStr.length)}┐`;
    process.stdout.write(moveCursor(x, y) + chalk_1.default.cyan(topWithTitle));
    for (let i = 1; i < height - 1; i++) {
        process.stdout.write(moveCursor(x, y + i) + chalk_1.default.cyan('│') + ' '.repeat(width - 2) + chalk_1.default.cyan('│'));
    }
    process.stdout.write(moveCursor(x, y + height - 1) + chalk_1.default.cyan(bottomLine));
}
// ─── 顶部状态栏 ──────────────────────────────
function renderTopBar(state) {
    const w = state.width || getTerminalWidth();
    const bar = [
        chalk_1.default.cyan.bold('🤖 Coding Agent v1.7'),
        chalk_1.default.yellow(`🔄 第 ${state.round} 轮`),
        chalk_1.default.green(`🔧 ${state.toolCalls} 次调用`),
        chalk_1.default.magenta(`📊 ~${state.tokens >= 1000 ? (state.tokens / 1000).toFixed(1) + 'K' : state.tokens} tokens`),
        chalk_1.default.gray(`⏱ ${state.time}`),
    ].join('  ');
    const padding = ' '.repeat(Math.max(0, w - bar.length - 2));
    process.stdout.write(moveCursor(1, 1) + clearLine() + chalk_1.default.bgBlack(bar + padding));
    // 分隔线
    process.stdout.write(moveCursor(1, 2) + chalk_1.default.cyan('├' + '─'.repeat(w - 2) + '┤'));
}
// ─── 左侧信息面板 ──────────────────────────────
function renderInfoPanel(info, x, y, width, height) {
    renderBorder('📋 任务信息', width, height, x, y);
    const lines = [];
    // 任务描述（截断）
    const taskPreview = info.task.length > width - 6 ? info.task.slice(0, width - 9) + '...' : info.task;
    lines.push(chalk_1.default.white.bold(`  任务:`));
    lines.push(chalk_1.default.gray(`  ${taskPreview}`));
    lines.push('');
    // 工作目录
    const cwdShort = info.cwd.length > width - 8 ? '...' + info.cwd.slice(-(width - 11)) : info.cwd;
    lines.push(chalk_1.default.white(`  📂 ${cwdShort}`));
    // 模型
    lines.push(chalk_1.default.white(`  🧠 ${info.model}`));
    // 会话
    if (info.sessionId) {
        lines.push(chalk_1.default.gray(`  💬 ${info.sessionId.slice(0, 20)}...`));
    }
    lines.push('');
    // 进度条
    if (info.progress) {
        const pct = info.progress.total > 0 ? info.progress.current / info.progress.total : 0;
        const barWidth = width - 8;
        const filled = Math.round(pct * barWidth);
        const bar = chalk_1.default.green('█'.repeat(filled)) + chalk_1.default.dim('░'.repeat(barWidth - filled));
        lines.push(chalk_1.default.white(`  进度 ${bar} ${Math.round(pct * 100)}%`));
        lines.push('');
    }
    // 最近工具
    if (info.recentTools && info.recentTools.length > 0) {
        lines.push(chalk_1.default.white.bold(`  🔧 最近调用:`));
        for (const tool of info.recentTools.slice(0, height - 15)) {
            lines.push(chalk_1.default.gray(`    • ${tool}`));
        }
    }
    for (let i = 0; i < lines.length && y + 2 + i < y + height - 1; i++) {
        const line = lines[i].padEnd(width - 2);
        process.stdout.write(moveCursor(x + 1, y + 2 + i) + clearLine() + line);
    }
}
// ─── 右侧输出面板 ──────────────────────────────
function renderOutputPanel(lines, x, y, width, height, scrollTop = 0) {
    renderBorder('💬 Agent 输出', width, height, x, y);
    const maxLines = height - 2;
    const visible = lines.slice(scrollTop, scrollTop + maxLines);
    for (let i = 0; i < visible.length && y + 2 + i < y + height - 1; i++) {
        const line = visible[i];
        const truncated = line.length > width - 4 ? line.slice(0, width - 7) + '...' : line;
        process.stdout.write(moveCursor(x + 1, y + 2 + i) + clearLine() + truncated);
    }
}
// ─── 底部状态栏 ──────────────────────────────
function renderBottomBar(state) {
    const w = state.width || getTerminalWidth();
    const status = state.status || '就绪';
    const text = `  ${chalk_1.default.gray(status)}  ${' '.repeat(4)}  命令: ${chalk_1.default.cyan(state.commands)}`;
    const padding = ' '.repeat(Math.max(0, w - text.length - 2));
    process.stdout.write(moveCursor(1, getTerminalHeight()) + clearLine() + chalk_1.default.bgBlack(text + padding));
}
// ─── 工具调用行内显示 ──────────────────────────────
function renderToolCallInline(name, args, success, y, x = 1) {
    const icon = success ? chalk_1.default.green('✅') : chalk_1.default.red('❌');
    const argsShort = args.length > 40 ? args.slice(0, 37) + '...' : args;
    return moveCursor(x, y) + clearLine() + `  ${icon} ${chalk_1.default.cyan(name)}(${chalk_1.default.gray(argsShort)})`;
}
// ─── Spinner 动画帧 ──────────────────────────────
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;
function getSpinnerFrame() {
    const frame = spinnerFrames[spinnerIndex % spinnerFrames.length];
    spinnerIndex++;
    return frame;
}
function renderSpinner(text, y, x = 1) {
    const frame = getSpinnerFrame();
    process.stdout.write(moveCursor(x, y) + clearLine() + `  ${chalk_1.default.yellow(frame)} ${text}`);
}
function renderDashboard(state) {
    const w = getTerminalWidth();
    const h = getTerminalHeight();
    // 保存光标
    process.stdout.write(saveCursor());
    // 清屏
    process.stdout.write('\x1b[2J');
    process.stdout.write(moveCursor(1, 1));
    // 顶部栏
    renderTopBar({
        round: state.round,
        tokens: state.tokens,
        toolCalls: state.toolCalls,
        time: state.time,
        width: w,
    });
    // 布局计算
    const topY = 2;
    const sidebarWidth = Math.min(35, Math.floor(w * 0.35));
    const outputX = sidebarWidth + 2;
    const outputWidth = w - sidebarWidth - 3;
    const outputHeight = h - 5;
    // 左侧信息面板
    renderInfoPanel({
        task: state.task,
        cwd: state.cwd,
        model: state.model,
        progress: state.progress,
        recentTools: state.recentTools,
        sessionId: state.sessionId,
    }, 1, topY, sidebarWidth, outputHeight);
    // 右侧输出面板
    renderOutputPanel(state.outputLines, outputX, topY, outputWidth, outputHeight);
    // Spinner
    if (state.spinnerText) {
        renderSpinner(state.spinnerText, h - 2, outputX + 1);
    }
    // 底部栏
    renderBottomBar({
        commands: '/quit /clear /stats /tools /help',
        status: state.spinnerText || '就绪',
        width: w,
    });
    // 恢复光标
    process.stdout.write(restoreCursor());
}
// ─── 快速初始化显示 ──────────────────────────────
function renderStartupBanner(version, cwd, model) {
    const w = getTerminalWidth();
    const line = '═'.repeat(w - 4);
    console.log();
    console.log(chalk_1.default.cyan(`  ╔${line}╗`));
    console.log(chalk_1.default.cyan(`  ║  Coding Agent v${version}  `.padEnd(w - 2) + chalk_1.default.cyan('║')));
    console.log(chalk_1.default.cyan(`  ║  📂 ${cwd}  `.padEnd(w - 2) + chalk_1.default.cyan('║')));
    console.log(chalk_1.default.cyan(`  ║  🧠 ${model}  `.padEnd(w - 2) + chalk_1.default.cyan('║')));
    console.log(chalk_1.default.cyan(`  ╚${line}╝`));
    console.log();
}
// ─── 终端 Resize 处理 ──────────────────────────────
let resizeListener = null;
let lastState = null;
let lastRenderFn = null;
function handleTerminalResize(state, renderFn) {
    lastState = state;
    lastRenderFn = renderFn;
    if (resizeListener) {
        process.stdout.removeListener('resize', resizeListener);
    }
    resizeListener = () => {
        if (lastState && lastRenderFn) {
            process.stdout.write('\x1b[2J\x1b[H');
            lastRenderFn(lastState);
        }
    };
    process.stdout.on('resize', resizeListener);
}
function cleanupResizeListener() {
    if (resizeListener) {
        process.stdout.removeListener('resize', resizeListener);
        resizeListener = null;
    }
}
//# sourceMappingURL=tui.js.map