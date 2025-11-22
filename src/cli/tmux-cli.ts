#!/usr/bin/env node

/**
 * Vibe Tmux CLI: 管理Tmux交互式会话的命令行工具
 */

import { TmuxTaskRunner } from '../core/tmuxTaskRunner.js';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        switch (command) {
            case 'list':
            case 'ls':
                TmuxTaskRunner.showSessionStatus();
                break;

            case 'attach':
            case 'at':
                if (args.length < 2) {
                    console.error('Usage: vibe-tmux attach <session-id|task-id>');
                    process.exit(1);
                }
                const sessionId = args[1].startsWith('vibe-task-')
                    ? args[1]
                    : `vibe-task-${args[1]}`;

                console.log(`Attaching to session: ${sessionId}`);
                console.log('Use Ctrl+B D to detach');

                const { spawn } = await import('child_process');
                spawn('tmux', ['attach', '-t', sessionId], { stdio: 'inherit' });
                break;

            case 'kill':
                if (args.length < 2) {
                    console.error('Usage: vibe-tmux kill <session-id|task-id>');
                    process.exit(1);
                }
                const killSessionId = args[1].startsWith('vibe-task-')
                    ? args[1]
                    : `vibe-task-${args[1]}`;

                const { execSync } = await import('child_process');
                execSync(`tmux kill-session -t ${killSessionId}`, { stdio: 'inherit' });
                console.log(`Session ${killSessionId} killed`);
                break;

            case 'check':
                const isAvailable = await TmuxTaskRunner.isTmuxAvailable();
                console.log(`Tmux availability: ${isAvailable ? '✅ Available' : '❌ Not found'}`);

                if (isAvailable) {
                    const activeSessions = TmuxTaskRunner.getActiveSessions();
                    console.log(`Active Vibe sessions: ${activeSessions.length}`);
                    if (activeSessions.length > 0) {
                        console.log('Sessions:', activeSessions.join(', '));
                    }
                }
                break;

            default:
                console.log(`
Vibe Tmux CLI - 管理交互式任务会话

Commands:
  list, ls       显示所有活跃的Vibe会话
  attach, at    附加到指定会话 (支持session-id或task-id)
  kill          杀死指定会话
  check         检查Tmux可用性和会话状态

Examples:
  vibe-tmux ls                           # 列出所有会话
  vibe-tmux attach task_1                # 附加到task_1
  vibe-tmux attach vibe-task-task_1      # 使用完整session-id
  vibe-tmux kill task_1                  # 杀死task_1会话
  vibe-tmux check                        # 检查状态

Tmux操作提示:
  - 附加到会话后使用 Ctrl+B D 分离
  - 使用 tmux ls 查看所有tmux会话
  - 使用 tmux kill-session -t <name> 杀死任意会话
                `);
                break;
        }
    } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}