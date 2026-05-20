import readline from 'readline';
import chalk from 'chalk';

// 需要审批的危险操作关键词
const DANGEROUS_PATTERNS = [
  'rm -rf', 'rm -f', 'rm -r',
  'sudo', 'chmod 777', 'chmod +s',
  '> /dev/', '> /etc/',
  'curl .* |.* sh', 'wget .* |.* sh',
  'DROP TABLE', 'DELETE FROM',
  'format C:', 'diskutil erase',
  'mkfs', 'dd if=',
];

/**
 * 判断命令是否危险
 */
export function isDangerous(command: string): boolean {
  const lower = command.toLowerCase().trim();
  return DANGEROUS_PATTERNS.some(p => new RegExp(p, 'i').test(lower));
}

/**
 * 获取危险原因
 */
export function getDangerReason(command: string): string {
  const lower = command.toLowerCase().trim();
  if (/^rm\s+(-[rf]+)\s/.test(lower)) return '🗑️  删除文件操作';
  if (lower.startsWith('sudo')) return '🔒 需要 root 权限';
  if (/curl.*\|.*sh/i.test(lower) || /wget.*\|.*sh/i.test(lower)) return '🌐 下载并执行远程脚本';
  if (/drop\s+table/i.test(lower)) return '🗃️  数据库 DROP 操作';
  if (/delete\s+from/i.test(lower)) return '🗃️  数据库 DELETE 操作';
  return '⚠️  潜在危险操作';
}

/**
 * 异步等待用户确认
 */
export async function askApproval(command: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const reason = getDangerReason(command);
  console.log(chalk.red(`\n${reason}`));
  console.log(chalk.yellow(`命令: ${command}`));

  return new Promise<boolean>(resolve => {
    rl.question(chalk.bold.green('\n⚠️  确认执行？ [y/N]: '), answer => {
      rl.close();
      const confirmed = answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
      if (!confirmed) {
        console.log(chalk.gray('已取消执行'));
      }
      resolve(confirmed);
    });
  });
}
