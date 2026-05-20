import chalk from 'chalk';

// 终端宽度
function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

function getTerminalHeight(): number {
  return process.stdout.rows || 24;
}

// ANSI 光标控制
function moveCursor(x: number, y: number): string {
  return `\x1b[${y};${x}H`;
}
function clearLine(): string {
  return '\x1b[2K';
}
function saveCursor(): string {
  return '\x1b[s';
}
function restoreCursor(): string {
  return '\x1b[u';
}

// ─── 面板边框 ──────────────────────────────

export function renderBorder(title: string, width: number, height: number, x: number, y: number): void {
  const topLine = `┌${'─'.repeat(width - 2)}┐`;
  const bottomLine = `└${'─'.repeat(width - 2)}┘`;
  const titleStr = ` ${title} `;
  const topWithTitle = `┌${titleStr}${'─'.repeat(width - 2 - titleStr.length)}┐`;

  process.stdout.write(moveCursor(x, y) + chalk.cyan(topWithTitle));
  for (let i = 1; i < height - 1; i++) {
    process.stdout.write(moveCursor(x, y + i) + chalk.cyan('│') + ' '.repeat(width - 2) + chalk.cyan('│'));
  }
  process.stdout.write(moveCursor(x, y + height - 1) + chalk.cyan(bottomLine));
}

// ─── 顶部状态栏 ──────────────────────────────

export function renderTopBar(state: {
  round: number;
  tokens: number;
  toolCalls: number;
  time: string;
  width?: number;
}): void {
  const w = state.width || getTerminalWidth();
  const bar = [
    chalk.cyan.bold('🤖 Coding Agent v1.7'),
    chalk.yellow(`🔄 第 ${state.round} 轮`),
    chalk.green(`🔧 ${state.toolCalls} 次调用`),
    chalk.magenta(`📊 ~${state.tokens >= 1000 ? (state.tokens / 1000).toFixed(1) + 'K' : state.tokens} tokens`),
    chalk.gray(`⏱ ${state.time}`),
  ].join('  ');

  const padding = ' '.repeat(Math.max(0, w - bar.length - 2));
  process.stdout.write(moveCursor(1, 1) + clearLine() + chalk.bgBlack(bar + padding));
  // 分隔线
  process.stdout.write(moveCursor(1, 2) + chalk.cyan('├' + '─'.repeat(w - 2) + '┤'));
}

// ─── 左侧信息面板 ──────────────────────────────

export function renderInfoPanel(info: {
  task: string;
  cwd: string;
  model: string;
  progress?: { current: number; total: number };
  recentTools?: string[];
  sessionId?: string;
}, x: number, y: number, width: number, height: number): void {
  renderBorder('📋 任务信息', width, height, x, y);

  const lines: string[] = [];

  // 任务描述（截断）
  const taskPreview = info.task.length > width - 6 ? info.task.slice(0, width - 9) + '...' : info.task;
  lines.push(chalk.white.bold(`  任务:`));
  lines.push(chalk.gray(`  ${taskPreview}`));
  lines.push('');

  // 工作目录
  const cwdShort = info.cwd.length > width - 8 ? '...' + info.cwd.slice(-(width - 11)) : info.cwd;
  lines.push(chalk.white(`  📂 ${cwdShort}`));

  // 模型
  lines.push(chalk.white(`  🧠 ${info.model}`));

  // 会话
  if (info.sessionId) {
    lines.push(chalk.gray(`  💬 ${info.sessionId.slice(0, 20)}...`));
  }

  lines.push('');

  // 进度条
  if (info.progress) {
    const pct = info.progress.total > 0 ? info.progress.current / info.progress.total : 0;
    const barWidth = width - 8;
    const filled = Math.round(pct * barWidth);
    const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(barWidth - filled));
    lines.push(chalk.white(`  进度 ${bar} ${Math.round(pct * 100)}%`));
    lines.push('');
  }

  // 最近工具
  if (info.recentTools && info.recentTools.length > 0) {
    lines.push(chalk.white.bold(`  🔧 最近调用:`));
    for (const tool of info.recentTools.slice(0, height - 15)) {
      lines.push(chalk.gray(`    • ${tool}`));
    }
  }

  for (let i = 0; i < lines.length && y + 2 + i < y + height - 1; i++) {
    const line = lines[i].padEnd(width - 2);
    process.stdout.write(moveCursor(x + 1, y + 2 + i) + clearLine() + line);
  }
}

// ─── 右侧输出面板 ──────────────────────────────

export function renderOutputPanel(lines: string[], x: number, y: number, width: number, height: number, scrollTop: number = 0): void {
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

export function renderBottomBar(state: {
  commands: string;
  status?: string;
  width?: number;
}): void {
  const w = state.width || getTerminalWidth();
  const status = state.status || '就绪';
  const text = `  ${chalk.gray(status)}  ${' '.repeat(4)}  命令: ${chalk.cyan(state.commands)}`;
  const padding = ' '.repeat(Math.max(0, w - text.length - 2));

  process.stdout.write(moveCursor(1, getTerminalHeight()) + clearLine() + chalk.bgBlack(text + padding));
}

// ─── 工具调用行内显示 ──────────────────────────────

export function renderToolCallInline(name: string, args: string, success: boolean, y: number, x: number = 1): string {
  const icon = success ? chalk.green('✅') : chalk.red('❌');
  const argsShort = args.length > 40 ? args.slice(0, 37) + '...' : args;
  return moveCursor(x, y) + clearLine() + `  ${icon} ${chalk.cyan(name)}(${chalk.gray(argsShort)})`;
}

// ─── Spinner 动画帧 ──────────────────────────────

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;

export function getSpinnerFrame(): string {
  const frame = spinnerFrames[spinnerIndex % spinnerFrames.length];
  spinnerIndex++;
  return frame;
}

export function renderSpinner(text: string, y: number, x: number = 1): void {
  const frame = getSpinnerFrame();
  process.stdout.write(moveCursor(x, y) + clearLine() + `  ${chalk.yellow(frame)} ${text}`);
}

// ─── 完整仪表盘渲染 ──────────────────────────────

export interface DashboardState {
  round: number;
  tokens: number;
  toolCalls: number;
  time: string;
  task: string;
  cwd: string;
  model: string;
  outputLines: string[];
  recentTools: string[];
  progress?: { current: number; total: number };
  sessionId?: string;
  spinnerText?: string;
}

export function renderDashboard(state: DashboardState): void {
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

export function renderStartupBanner(version: string, cwd: string, model: string): void {
  const w = getTerminalWidth();
  const line = '═'.repeat(w - 4);

  console.log();
  console.log(chalk.cyan(`  ╔${line}╗`));
  console.log(chalk.cyan(`  ║  Coding Agent v${version}  `.padEnd(w - 2) + chalk.cyan('║')));
  console.log(chalk.cyan(`  ║  📂 ${cwd}  `.padEnd(w - 2) + chalk.cyan('║')));
  console.log(chalk.cyan(`  ║  🧠 ${model}  `.padEnd(w - 2) + chalk.cyan('║')));
  console.log(chalk.cyan(`  ╚${line}╝`));
  console.log();
}

// ─── 终端 Resize 处理 ──────────────────────────────

let resizeListener: (() => void) | null = null;
let lastState: DashboardState | null = null;
let lastRenderFn: ((state: DashboardState) => void) | null = null;

export function handleTerminalResize(state: DashboardState, renderFn: (state: DashboardState) => void): void {
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

export function cleanupResizeListener(): void {
  if (resizeListener) {
    process.stdout.removeListener('resize', resizeListener);
    resizeListener = null;
  }
}
