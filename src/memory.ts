import * as fs from 'fs';
import * as path from 'path';

export interface ProjectMemory {
  projectName: string;
  detectedAt: string;
  lastUpdated: string;

  // 项目元信息
  language: string[];
  framework: string[];
  packageManager: string;

  // 架构理解
  entryPoints: string[];
  keyModules: { name: string; path: string; description: string }[];

  // 编码规范
  conventions: string[];
  testPattern: string;

  // 历史交互
  recentTasks: { task: string; result: string; timestamp: string }[];
  commonErrors: { pattern: string; solution: string }[];

  // 用户偏好
  userNotes: string[];
}

const MEMORY_FILE = '.agent-memory.json';
const MAX_RECENT_TASKS = 10;

export function loadMemory(dir: string): ProjectMemory | null {
  const filePath = path.join(dir, MEMORY_FILE);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ProjectMemory;
  } catch {
    return null;
  }
}

export function saveMemory(dir: string, memory: ProjectMemory): void {
  const filePath = path.join(dir, MEMORY_FILE);
  memory.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
}

export function createEmptyMemory(dir: string): ProjectMemory {
  const memory: ProjectMemory = {
    projectName: path.basename(dir),
    detectedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    language: [],
    framework: [],
    packageManager: 'unknown',
    entryPoints: [],
    keyModules: [],
    conventions: [],
    testPattern: '',
    recentTasks: [],
    commonErrors: [],
    userNotes: [],
  };
  return memory;
}

export function autoDetect(dir: string): ProjectMemory {
  const memory = createEmptyMemory(dir);

  // 检测语言
  const { glob } = require('glob');

  // 包管理器
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) memory.packageManager = 'npm';
  else if (fs.existsSync(path.join(dir, 'yarn.lock'))) memory.packageManager = 'yarn';
  else if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) memory.packageManager = 'pnpm';

  // package.json
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      memory.projectName = pkg.name || memory.projectName;

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.react || deps.vue) memory.framework.push('前端框架');
      if (deps.express || deps.fastify) memory.framework.push('Node.js 后端');
      if (deps.next) memory.framework.push('Next.js');
      if (deps.electron) memory.framework.push('Electron');

      // 测试模式
      if (deps.jest) memory.testPattern = 'jest';
      else if (deps.vitest) memory.testPattern = 'vitest';
      else if (deps.mocha) memory.testPattern = 'mocha';

      memory.language.push('TypeScript/JavaScript');
    } catch {}
  }

  // Swift/iOS
  if (fs.existsSync(path.join(dir, 'Podfile'))) {
    memory.language.push('Swift/ObjC');
    memory.packageManager = 'cocoapods';
  }
  if (fs.existsSync(path.join(dir, 'Package.swift'))) {
    memory.language.push('Swift');
    memory.packageManager = 'spm';
  }

  // Python
  if (fs.existsSync(path.join(dir, 'requirements.txt')) || fs.existsSync(path.join(dir, 'pyproject.toml'))) {
    memory.language.push('Python');
    memory.packageManager = 'pip';
  }
  if (fs.existsSync(path.join(dir, 'Pipfile'))) memory.packageManager = 'pipenv';
  if (fs.existsSync(path.join(dir, 'poetry.lock'))) memory.packageManager = 'poetry';

  // Go
  if (fs.existsSync(path.join(dir, 'go.mod'))) {
    memory.language.push('Go');
    memory.packageManager = 'go mod';
  }

  // Rust
  if (fs.existsSync(path.join(dir, 'Cargo.toml'))) {
    memory.language.push('Rust');
    memory.packageManager = 'cargo';
  }

  if (memory.language.length === 0) memory.language.push('未知');

  // 入口点
  if (fs.existsSync(path.join(dir, 'src/main.ts'))) memory.entryPoints.push('src/main.ts');
  if (fs.existsSync(path.join(dir, 'src/index.ts'))) memory.entryPoints.push('src/index.ts');
  if (fs.existsSync(path.join(dir, 'src/App.tsx'))) memory.entryPoints.push('src/App.tsx');
  if (fs.existsSync(path.join(dir, 'main.py'))) memory.entryPoints.push('main.py');

  return memory;
}

export function addTask(memory: ProjectMemory, task: string, result: string): void {
  memory.recentTasks.push({
    task,
    result: result.slice(0, 200),
    timestamp: new Date().toISOString(),
  });
  if (memory.recentTasks.length > MAX_RECENT_TASKS) {
    memory.recentTasks = memory.recentTasks.slice(-MAX_RECENT_TASKS);
  }
}

export function addConvention(memory: ProjectMemory, convention: string): void {
  if (!memory.conventions.includes(convention)) {
    memory.conventions.push(convention);
  }
}

export function addCommonError(memory: ProjectMemory, pattern: string, solution: string): void {
  if (!memory.commonErrors.some(e => e.pattern === pattern)) {
    memory.commonErrors.push({ pattern, solution });
  }
}

export function formatMemoryForContext(memory: ProjectMemory): string {
  const lines: string[] = [
    `## 项目: ${memory.projectName}`,
    `语言: ${memory.language.join(', ')}`,
    `框架: ${memory.framework.join(', ') || '无'}`,
    `包管理器: ${memory.packageManager}`,
  ];

  if (memory.entryPoints.length > 0) {
    lines.push(`入口: ${memory.entryPoints.join(', ')}`);
  }

  if (memory.conventions.length > 0) {
    lines.push(`项目约定: ${memory.conventions.join('; ')}`);
  }

  if (memory.recentTasks.length > 0) {
    lines.push(`最近任务:`);
    for (const t of memory.recentTasks.slice(-3)) {
      lines.push(`  - ${t.task} → ${t.result}`);
    }
  }

  if (memory.commonErrors.length > 0) {
    lines.push(`常见错误:`);
    for (const e of memory.commonErrors) {
      lines.push(`  - ${e.pattern} → ${e.solution}`);
    }
  }

  if (memory.userNotes.length > 0) {
    lines.push(`用户备注: ${memory.userNotes.join('; ')}`);
  }

  return lines.join('\n');
}
