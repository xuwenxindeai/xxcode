"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDangerous = isDangerous;
exports.getDangerReason = getDangerReason;
exports.askApproval = askApproval;
const readline_1 = __importDefault(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
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
function isDangerous(command) {
    const lower = command.toLowerCase().trim();
    return DANGEROUS_PATTERNS.some(p => new RegExp(p, 'i').test(lower));
}
/**
 * 获取危险原因
 */
function getDangerReason(command) {
    const lower = command.toLowerCase().trim();
    if (/^rm\s+(-[rf]+)\s/.test(lower))
        return '🗑️  删除文件操作';
    if (lower.startsWith('sudo'))
        return '🔒 需要 root 权限';
    if (/curl.*\|.*sh/i.test(lower) || /wget.*\|.*sh/i.test(lower))
        return '🌐 下载并执行远程脚本';
    if (/drop\s+table/i.test(lower))
        return '🗃️  数据库 DROP 操作';
    if (/delete\s+from/i.test(lower))
        return '🗃️  数据库 DELETE 操作';
    return '⚠️  潜在危险操作';
}
/**
 * 异步等待用户确认
 */
async function askApproval(command) {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const reason = getDangerReason(command);
    console.log(chalk_1.default.red(`\n${reason}`));
    console.log(chalk_1.default.yellow(`命令: ${command}`));
    return new Promise(resolve => {
        rl.question(chalk_1.default.bold.green('\n⚠️  确认执行？ [y/N]: '), answer => {
            rl.close();
            const confirmed = answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
            if (!confirmed) {
                console.log(chalk_1.default.gray('已取消执行'));
            }
            resolve(confirmed);
        });
    });
}
//# sourceMappingURL=approval.js.map