/**
 * Tmux Interactive Task Runner: 实习生提出的Tmux容器方案实现
 *
 * 核心思路：
 * 1. 将Claude放入tmux后台会话运行
 * 2. 通过文件传递Prompt和Result
 * 3. 支持随时attach介入交互
 * 4. 轮询session状态替代进程等待
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TmuxTaskOptions {
    taskId: string;
    prompt: string;
    cwd: string;
    needsOutput?: boolean; // 是否需要获取输出结果
    outputFormat?: 'text' | 'json'; // 输出格式
    timeout?: number; // 轮询超时时间（毫秒）
}

export class TmuxTaskRunner {
    private static readonly SESSION_PREFIX = 'vibe-task';
    private static readonly POLL_INTERVAL = 2000; // 2秒检查一次
    private static readonly STARTUP_DELAY = 500; // 等待tmux启动
    private static readonly MAX_SESSIONS = 10; // 最大并发会话数

    /**
     * 检查tmux是否可用（带错误提示）
     */
    static async checkTmuxAvailability(): Promise<void> {
        try {
            execSync('tmux -V', { stdio: 'ignore' });
        } catch {
            throw new Error('tmux is required but not available. Please install tmux: brew install tmux (macOS) or apt-get install tmux (Ubuntu)');
        }
    }

    /**
     * 检查会话数量限制
     */
    static async checkSessionLimits(): Promise<void> {
        const activeSessions = this.getActiveSessions();
        if (activeSessions.length >= this.MAX_SESSIONS) {
            throw new Error(`Too many active sessions (${activeSessions.length}/${this.MAX_SESSIONS}). Please complete some tasks first.`);
        }
    }

    /**
     * 清理旧的会话
     */
    static async cleanupOldSessions(): Promise<void> {
        const sessions = this.getActiveSessions();

        // 如果会话数量未达到限制，无需清理
        if (sessions.length <= this.MAX_SESSIONS * 0.8) {
            return;
        }

        // 获取会话创建时间并清理最老的会话
        for (const sessionId of sessions) {
            try {
                // 检查会话是否真的存在
                execSync(`tmux has-session -t ${sessionId}`, { stdio: 'ignore' });

                // 获取会话创建时间（通过tmux session的created时间）
                const creationTime = execSync(`tmux display-message -p -t ${sessionId} '#{session_created}'`, {
                    encoding: 'utf-8'
                }).trim();

                const sessionAge = Date.now() - parseInt(creationTime) * 1000;

                // 清理超过1小时的僵尸会话
                if (sessionAge > 3600000) { // 1小时
                    console.log(`🧹 Cleaning up old session: ${sessionId}`);
                    execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
                }
            } catch {
                // 会话已不存在，从列表中移除
                continue;
            }
        }
    }

    /**
     * 在tmux会话中运行Claude任务
     */
    static async runClaudeInTmux(options: TmuxTaskOptions): Promise<string | null> {
        const { taskId, prompt, cwd, needsOutput = false, outputFormat = 'text', timeout = 0 } = options;

        // 健壮性检查
        await this.checkTmuxAvailability();
        await this.checkSessionLimits();
        await this.cleanupOldSessions();

        const sessionId = `${this.SESSION_PREFIX}-${taskId}`;
        const promptFile = path.join(cwd, `.vibe_prompt_${taskId}.txt`);
        const outputFile = path.join(cwd, `.vibe_output_${taskId}.${outputFormat}`);

        try {
            // 1. 准备Prompt文件
            await this.preparePromptFile(prompt, promptFile, needsOutput, outputFile, outputFormat);

            // 2. 启动tmux会话
            await this.startTmuxSession(sessionId, cwd, promptFile);

            // 3. 显示介入指南
            this.showInterventionGuide(sessionId, taskId);

            // 4. 等待任务完成 (timeout=0表示无限等待)
            await this.waitForSessionCompletion(sessionId, timeout);

            // 5. 读取结果
            if (needsOutput && fs.existsSync(outputFile)) {
                const result = fs.readFileSync(outputFile, 'utf-8').trim();
                this.cleanupFiles(promptFile, outputFile);
                return result;
            }

            this.cleanupFiles(promptFile, outputFile);
            return null;

        } catch (error) {
            this.cleanupFiles(promptFile, outputFile);
            this.killSession(sessionId); // 出错时清理session
            throw error;
        }
    }

    /**
     * 准备Prompt文件，添加输出指令
     */
    private static async preparePromptFile(
        originalPrompt: string,
        promptFile: string,
        needsOutput: boolean,
        outputFile: string,
        outputFormat: string
    ): Promise<void> {
        let finalPrompt = originalPrompt;

        if (needsOutput) {
            const outputInstruction = outputFormat === 'json'
                ? `\n\nCRITICAL: Write your response as a JSON object to file "${path.basename(outputFile)}". Do not output to stdout.`
                : `\n\nCRITICAL: Write your response to file "${path.basename(outputFile)}". Do not output to stdout.`;

            finalPrompt += outputInstruction;
        }

        fs.writeFileSync(promptFile, finalPrompt, 'utf-8');
    }

    /**
     * 启动tmux会话
     */
    private static async startTmuxSession(sessionId: string, cwd: string, promptFile: string): Promise<void> {
        // 清理已存在的session
        try {
            execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
        } catch {
            // Session不存在，忽略
        }

        // 构造tmux内部命令
        const innerCmd = [
            `cd "${cwd}"`,
            `echo "🚀 Vibe Task Started in Tmux Session: ${sessionId}"`,
            `echo "📁 Working Directory: $(pwd)"`,
            `echo "🤖 Starting Claude..."`,
            `echo ""`,
            `claude --dangerously-skip-permissions "$(cat '${promptFile}')"`, // 关键：添加权限跳过标志
            `exit_code=$?`,
            `echo ""`,
            `if [ $exit_code -eq 0 ]; then echo "✅ Task completed successfully"; exit 0; else echo "❌ Task failed with exit code $exit_code"; read -p "Press Enter to exit..." || true; exit 1; fi`
        ].join(' && ');

        // 启动detached tmux session
        const tmux = spawn('tmux', ['new-session', '-d', '-s', sessionId, 'bash', '-c', innerCmd]);

        return new Promise((resolve, reject) => {
            tmux.on('error', reject);
            tmux.on('close', (code) => {
                if (code === 0) {
                    // 等待一小段时间让tmux完全启动
                    setTimeout(() => {
                        // 验证tmux会话是否真的创建成功
                        try {
                            execSync(`tmux has-session -t ${sessionId}`, { stdio: 'ignore' });
                            resolve();
                        } catch {
                            reject(new Error(`Tmux session ${sessionId} was not created successfully`));
                        }
                    }, this.STARTUP_DELAY);
                } else {
                    reject(new Error(`Failed to start tmux session: ${code}`));
                }
            });
        });
    }

    /**
     * 显示介入指南 (内部使用，详细信息在factory中显示)
     */
    private static showInterventionGuide(sessionId: string, taskId: string): void {
        // 简化为内部日志，详细信息在factory.ts中显示给用户
        console.log(`📺 Tmux session ${sessionId} created for task ${taskId}`);
    }

    /**
     * 轮询等待session完成
     */
    private static async waitForSessionCompletion(sessionId: string, timeout: number): Promise<void> {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                try {
                    // has-session返回0表示存在，非0表示不存在（已结束）
                    execSync(`tmux has-session -t ${sessionId}`, { stdio: 'ignore' });

                    // 检查超时 (timeout=0表示无超时限制)
                    if (timeout > 0 && Date.now() - startTime > timeout) {
                        clearInterval(checkInterval);
                        reject(new Error(`Tmux session timeout after ${timeout/1000}s`));
                        return;
                    }

                    // Session仍在运行，继续等待
                } catch {
                    // Session不存在了，任务完成
                    clearInterval(checkInterval);
                    resolve();
                }
            }, this.POLL_INTERVAL);
        });
    }

    /**
     * 清理临时文件
     */
    private static cleanupFiles(...files: string[]): void {
        files.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch {
                // 忽略清理错误
            }
        });
    }

    /**
     * 强制杀死session
     */
    private static killSession(sessionId: string): void {
        try {
            execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
        } catch {
            // 忽略错误
        }
    }

    /**
     * 获取所有活跃的vibe session
     */
    static getActiveSessions(): string[] {
        try {
            const output = execSync('tmux ls -F "#{session_name}"', { encoding: 'utf-8' });
            return output
                .split('\n')
                .filter(name => name.startsWith(this.SESSION_PREFIX))
                .map(name => name.trim());
        } catch {
            return [];
        }
    }

    /**
     * 显示所有活跃session的状态
     */
    static showSessionStatus(): void {
        const sessions = this.getActiveSessions();

        if (sessions.length === 0) {
            console.log('📭 No active Vibe sessions');
            return;
        }

        console.log(`🎬 Active Vibe Sessions (${sessions.length}/${this.MAX_SESSIONS}):`);
        console.log('-'.repeat(50));

        sessions.forEach(sessionId => {
            try {
                const taskId = sessionId.replace(`${this.SESSION_PREFIX}-`, '');
                const windowCount = execSync(`tmux display-message -p -t ${sessionId} '#{window_count}'`, { encoding: 'utf-8' }).trim();

                console.log(`📺 ${sessionId}`);
                console.log(`   Task ID: ${taskId}`);
                console.log(`   Windows: ${windowCount}`);
                console.log(`   Attach: tmux attach -t ${sessionId}`);
                console.log('');
            } catch {
                console.log(`📺 ${sessionId} (status unknown)`);
            }
        });
    }

    /**
     * 强制清理所有vibe session
     */
    static async cleanup(): Promise<void> {
        try {
            // 首先检查tmux是否可用
            await this.checkTmuxAvailability();

            const sessions = this.getActiveSessions();
            if (sessions.length === 0) {
                console.log('📭 No active Vibe sessions to clean');
                return;
            }

            for (const sessionId of sessions) {
                try {
                    execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
                    console.log(`🧹 Cleaned up session: ${sessionId}`);
                } catch {
                    // 忽略单个会话清理错误
                    console.log(`⚠️ Session ${sessionId} already ended or not found`);
                }
            }
        } catch {
            // tmux不可用，无需清理
            console.log('📭 Tmux not available, no sessions to clean');
        }
    }
}