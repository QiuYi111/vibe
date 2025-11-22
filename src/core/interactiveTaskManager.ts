/**
 * Interactive Task Manager: Allows user intervention when tasks get stuck
 *
 * Problem: Promise.all() creates a black box where stuck tasks cannot be rescued
 * Solution: Add keyboard interrupt handling and interactive debugging
 */

import { TaskState, SessionState, VibeConfig } from '../types.js';
import { log } from '../logger.js';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export class InteractiveTaskManager {
    private tasks: TaskState[] = [];
    private config: VibeConfig;
    private isPaused: boolean = false;
    private rl: readline.Interface;
    private taskSessions: Map<string, string> = new Map(); // task.id -> session-id

    constructor(tasks: TaskState[], _session: SessionState, config: VibeConfig) {
        this.tasks = tasks;
        this.config = config;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Assign session IDs to all tasks
        tasks.forEach(task => {
            this.taskSessions.set(task.id, randomUUID());
        });

        // Setup keyboard handlers (use Ctrl+T instead of Ctrl+C)
        this.setupKeyboardHandlers();
    }

    /**
     * Setup keyboard interrupt handlers
     */
    private setupKeyboardHandlers(): void {
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(true);
        }

        process.stdin.on('data', (key) => {
            // Ctrl+T to enter debug mode (20 = Ctrl+T)
            if (key[0] === 20) {
                console.log('\n🔧 [DEBUG MODE] Task execution interrupted');
                this.enterDebugMode();
            }
        });
    }

    /**
     * Enter interactive debug mode
     */
    private async enterDebugMode(): Promise<void> {
        this.isPaused = true;

        console.log('\n' + '='.repeat(60));
        log.warn('   🚨 INTERACTIVE DEBUG MODE');
        console.log('='.repeat(60));

        this.showTaskStatus();

        while (this.isPaused) {
            const choice = await this.askUser('\nWhat would you like to do?');

            switch (choice.toLowerCase()) {
                case 'status':
                case 's':
                    this.showTaskStatus();
                    break;
                case 'logs':
                case 'l':
                    await this.showTaskLogs();
                    break;
                case 'debug':
                case 'd':
                    await this.debugTask();
                    break;
                case 'kill':
                case 'k':
                    await this.killTask();
                    break;
                case 'resume':
                case 'r':
                    this.resumeExecution();
                    break;
                case 'help':
                case 'h':
                    this.showHelp();
                    break;
                case 'quit':
                case 'q':
                    console.log('👋 Aborting all tasks...');
                    process.exit(1);
                    break;
                default:
                    console.log('Unknown command. Type "help" for options.');
            }
        }
    }

    /**
     * Show current task status
     */
    private showTaskStatus(): void {
        console.log('\n📊 Task Status:');
        console.log('-'.repeat(50));

        this.tasks.forEach((task, index) => {
            const statusIcon = this.getStatusIcon(task.status);
            const duration = task.startTime ?
                `${Math.floor((Date.now() - task.startTime) / 1000)}s` : 'N/A';
            const sessionId = this.taskSessions.get(task.id) || 'unknown';

            console.log(`${index + 1}. ${statusIcon} ${task.name}`);
            console.log(`   Status: ${task.status} | Duration: ${duration}`);
            console.log(`   Branch: ${task.branchName}`);
            console.log(`   Worktree: ${task.worktreePath}`);
            console.log(`   Session ID: ${sessionId}`);
            console.log('');
        });
    }

    /**
     * Show logs for a specific task
     */
    private async showTaskLogs(): Promise<void> {
        const taskNum = await this.askUser('Enter task number to view logs (or "all"):');

        if (taskNum.toLowerCase() === 'all') {
            this.tasks.forEach(task => this.showTaskLog(task));
        } else {
            const index = parseInt(taskNum) - 1;
            if (index >= 0 && index < this.tasks.length) {
                this.showTaskLog(this.tasks[index]);
            } else {
                console.log('Invalid task number');
            }
        }
    }

    /**
     * Show logs for a single task
     */
    private showTaskLog(task: TaskState): void {
        const logFile = path.join(this.config.logDir, `${task.id}.log`);

        console.log(`\n📝 Logs for ${task.name}:`);
        console.log('-'.repeat(40));

        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf-8');
            const lines = logs.split('\n').slice(-20); // Last 20 lines
            lines.forEach(line => console.log(line));
        } else {
            console.log('No logs found');
        }
    }

    /**
     * Debug a stuck task by entering interactive Claude session
     */
    private async debugTask(): Promise<void> {
        const taskNum = await this.askUser('Enter task number to debug:');
        const index = parseInt(taskNum) - 1;

        if (index < 0 || index >= this.tasks.length) {
            console.log('Invalid task number');
            return;
        }

        const task = this.tasks[index];
        const sessionId = this.taskSessions.get(task.id);

        console.log(`\n🔍 Debug options for: ${task.name}`);
        console.log(`📁 Worktree: ${task.worktreePath}`);
        console.log(`🆔 Session ID: ${sessionId}`);
        console.log('');

        console.log('Choose debug method:');
        console.log('1. Start new Claude session in worktree');
        console.log('2. Try to resume existing session (if still running)');
        console.log('3. View session files and attach manually');

        const choice = await this.askUser('Enter choice (1-3):');

        const { spawn } = await import('child_process');

        switch (choice) {
            case '1':
                console.log('\n🚀 Starting new Claude session...');
                spawn('claude', [], {
                    cwd: task.worktreePath,
                    stdio: 'inherit'
                }).on('close', (code) => {
                    console.log(`\n✅ Debug session ended with code: ${code}`);
                });
                break;

            case '2':
                if (sessionId) {
                    console.log(`\n🔄 Attempting to resume session ${sessionId}...`);
                    spawn('claude', ['--resume', sessionId], {
                        cwd: task.worktreePath,
                        stdio: 'inherit'
                    }).on('close', (code) => {
                        console.log(`\n✅ Resume attempt ended with code: ${code}`);
                    });
                } else {
                    console.log('❌ No session ID available for this task');
                }
                break;

            case '3':
                console.log(`\n📂 Manual attach instructions:`);
                console.log(`   cd ${task.worktreePath}`);
                if (sessionId) {
                    console.log(`   claude --resume ${sessionId}`);
                } else {
                    console.log(`   claude  # Start new session`);
                }
                console.log('');
                break;

            default:
                console.log('Invalid choice');
        }
    }

    /**
     * Kill a stuck task
     */
    private async killTask(): Promise<void> {
        const taskNum = await this.askUser('Enter task number to kill:');
        const index = parseInt(taskNum) - 1;

        if (index < 0 || index >= this.tasks.length) {
            console.log('Invalid task number');
            return;
        }

        const task = this.tasks[index];
        task.status = 'FAILED';

        console.log(`❌ Task ${task.name} marked as FAILED`);
    }

    /**
     * Resume task execution
     */
    private resumeExecution(): void {
        console.log('▶️  Resuming task execution...');
        this.isPaused = false;

        // Cleanup keyboard handlers
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(false);
        }
        process.stdin.removeAllListeners('data');

        this.rl.close();
    }

    /**
     * Show help information
     */
    private showHelp(): void {
        console.log('\n📖 Debug Mode Commands:');
        console.log('  status (s)    - Show task status');
        console.log('  logs (l)      - View task logs');
        console.log('  debug (d)     - Enter interactive Claude session');
        console.log('  kill (k)      - Mark task as failed');
        console.log('  resume (r)    - Continue task execution');
        console.log('  help (h)      - Show this help');
        console.log('  quit (q)      - Abort all tasks');
    }

    /**
     * Ask user for input
     */
    private async askUser(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(`${question} `, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    /**
     * Get status icon for task
     */
    private getStatusIcon(status: string): string {
        switch (status) {
            case 'PENDING': return '⏳';
            case 'RUNNING': return '⚙️';
            case 'SUCCEEDED': return '✅';
            case 'HEALED': return '🔄';
            case 'FAILED': return '❌';
            default: return '❓';
        }
    }

    /**
     * Get session ID for a task
     */
    getTaskSessionId(taskId: string): string | undefined {
        return this.taskSessions.get(taskId);
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(false);
        }
        process.stdin.removeAllListeners('data');
        this.rl.close();
    }
}