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
    private static readonly POLL_INTERVAL = 2000; // 2 seconds
    private static readonly MAX_SESSIONS = 10;

    /**
     * Check if tmux is available
     */
    static async checkTmuxAvailability(): Promise<void> {
        try {
            execSync('tmux -V', { stdio: 'ignore' });
        } catch {
            throw new Error('tmux is required but not available. Please install tmux: brew install tmux (macOS) or apt-get install tmux (Ubuntu)');
        }
    }

    /**
     * Check session limits
     */
    static async checkSessionLimits(): Promise<void> {
        const activeSessions = this.getActiveSessions();
        if (activeSessions.length >= this.MAX_SESSIONS) {
            throw new Error(`Too many active sessions (${activeSessions.length}/${this.MAX_SESSIONS}). Please complete some tasks first.`);
        }
    }

    /**
     * Clean up old sessions
     */
    static async cleanupOldSessions(): Promise<void> {
        const sessions = this.getActiveSessions();

        if (sessions.length <= this.MAX_SESSIONS * 0.8) {
            return;
        }

        for (const sessionId of sessions) {
            try {
                execSync(`tmux has-session -t ${sessionId}`, { stdio: 'ignore' });
                const creationTime = execSync(`tmux display-message -p -t ${sessionId} '#{session_created}'`, {
                    encoding: 'utf-8'
                }).trim();

                const sessionAge = Date.now() - parseInt(creationTime) * 1000;

                if (sessionAge > 3600000) { // 1 hour
                    console.log(`🧹 Cleaning up old session: ${sessionId}`);
                    execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
                }
            } catch {
                continue;
            }
        }
    }

    /**
     * Run Claude in a tmux session
     */
    static async runClaudeInTmux(options: TmuxTaskOptions): Promise<string | null> {
        const { taskId, prompt, cwd, needsOutput = false, outputFormat = 'text', timeout = 0 } = options;

        await this.checkTmuxAvailability();
        await this.checkSessionLimits();
        await this.cleanupOldSessions();

        const sessionId = `${this.SESSION_PREFIX}-${taskId}`;
        const doneSignalFile = path.join(cwd, `.vibe_done_${taskId}`);
        const outputFile = path.join(cwd, `.vibe_output_${taskId}.${outputFormat}`);

        // Clean up previous signals
        if (fs.existsSync(doneSignalFile)) fs.unlinkSync(doneSignalFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

        try {
            // 1. Prepare prompt with sentinel instruction
            const finalPrompt = this.preparePrompt(prompt, doneSignalFile, needsOutput, outputFile, outputFormat);

            // 2. Start tmux session with interactive Claude
            await this.startTmuxSession(sessionId, cwd);

            // 3. Wait for GUI/TUI to load
            await new Promise(r => setTimeout(r, 3000));

            // 4. Bypass warning (Down + Enter)
            await this.bypassWarning(sessionId);

            // 5. Inject prompt
            await this.injectPrompt(sessionId, finalPrompt);

            // 6. Show intervention guide
            this.showInterventionGuide(sessionId, taskId);

            // 7. Wait for sentinel file
            await this.waitForSentinel(doneSignalFile, sessionId, timeout);

            // 8. Graceful exit
            await this.gracefulExit(sessionId);

            // 9. Read result
            if (needsOutput && fs.existsSync(outputFile)) {
                const result = fs.readFileSync(outputFile, 'utf-8').trim();
                this.cleanupFiles(doneSignalFile, outputFile);
                return result;
            }

            this.cleanupFiles(doneSignalFile, outputFile);
            return null;

        } catch (error) {
            // Don't kill session immediately on error to allow debugging, 
            // but maybe we should if it's a timeout? 
            // For now, let's keep the session alive for manual inspection if it failed.
            // But if it's a critical error in setup, we might want to clean up.
            // Let's stick to the original behavior of cleaning up files but maybe keeping session?
            // Actually, if we throw, the caller might want to retry.
            // Let's kill session on error to be safe and avoid zombie sessions accumulating.
            this.killSession(sessionId);
            this.cleanupFiles(doneSignalFile, outputFile);
            throw error;
        }
    }

    /**
     * Prepare the prompt string with instructions
     */
    private static preparePrompt(
        originalPrompt: string,
        doneSignalFile: string,
        needsOutput: boolean,
        outputFile: string,
        outputFormat: string
    ): string {
        let finalPrompt = originalPrompt;

        finalPrompt += `\n\n[SYSTEM INSTRUCTION]\n`;

        if (needsOutput) {
            const outputInstruction = outputFormat === 'json'
                ? `1. Write your response as a JSON object to file "${path.basename(outputFile)}". Do not output to stdout.\n`
                : `1. Write your response to file "${path.basename(outputFile)}". Do not output to stdout.\n`;
            finalPrompt += outputInstruction;
        }

        finalPrompt += `2. WHEN DONE, create an empty file named "${path.basename(doneSignalFile)}"\n`;

        return finalPrompt;
    }

    /**
     * Start tmux session with interactive Claude
     */
    private static async startTmuxSession(sessionId: string, cwd: string): Promise<void> {
        // Kill existing session
        try {
            execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
        } catch { }

        // Start session with bash and claude
        // We use 'read' to keep the window open if claude crashes or exits unexpectedly
        const cmd = `cd "${cwd}" && claude --dangerously-skip-permissions; read`;

        const tmux = spawn('tmux', ['new-session', '-d', '-s', sessionId, 'bash', '-c', cmd]);

        return new Promise((resolve, reject) => {
            tmux.on('error', reject);
            tmux.on('close', (code) => {
                if (code === 0) {
                    setTimeout(() => {
                        try {
                            execSync(`tmux has-session -t ${sessionId}`, { stdio: 'ignore' });
                            resolve();
                        } catch {
                            reject(new Error(`Tmux session ${sessionId} was not created successfully`));
                        }
                    }, 500);
                } else {
                    reject(new Error(`Failed to start tmux session: ${code}`));
                }
            });
        });
    }

    /**
     * Bypass the warning screen
     */
    private static async bypassWarning(sessionId: string): Promise<void> {
        try {
            // Down + Enter to select "Yes" and confirm
            execSync(`tmux send-keys -t ${sessionId} Down Enter`);
            // Wait a bit for the main input interface to load
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error(`Failed to bypass warning for session ${sessionId}`, e);
        }
    }

    /**
     * Inject prompt via tmux buffer
     */
    private static async injectPrompt(sessionId: string, prompt: string): Promise<void> {
        try {
            // Load prompt into buffer
            const loadBuffer = spawn('tmux', ['load-buffer', '-']);
            loadBuffer.stdin.write(prompt);
            loadBuffer.stdin.end();

            await new Promise((resolve, reject) => {
                loadBuffer.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('load-buffer failed')));
                loadBuffer.on('error', reject);
            });

            // Paste buffer and send Enter
            execSync(`tmux paste-buffer -t ${sessionId}`);
            execSync(`tmux send-keys -t ${sessionId} Enter`);

        } catch (e) {
            throw new Error(`Failed to inject prompt: ${e}`);
        }
    }

    /**
     * Wait for sentinel file to appear
     */
    private static async waitForSentinel(doneSignalFile: string, sessionId: string, timeout: number): Promise<void> {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                // Check if session is still alive
                try {
                    execSync(`tmux has-session -t ${sessionId}`, { stdio: 'ignore' });
                } catch {
                    clearInterval(checkInterval);
                    // If session died but file exists, that's fine. If not, it's an error.
                    if (fs.existsSync(doneSignalFile)) {
                        resolve();
                    } else {
                        reject(new Error('Tmux session ended unexpectedly without signal'));
                    }
                    return;
                }

                // Check for sentinel file
                if (fs.existsSync(doneSignalFile)) {
                    clearInterval(checkInterval);
                    resolve();
                    return;
                }

                // Check timeout
                if (timeout > 0 && Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error(`Task timeout after ${timeout / 1000}s`));
                }
            }, this.POLL_INTERVAL);
        });
    }

    /**
     * Gracefully exit the session
     */
    private static async gracefulExit(sessionId: string): Promise<void> {
        try {
            execSync(`tmux send-keys -t ${sessionId} /exit Enter`);
            // Give it a moment to exit
            await new Promise(r => setTimeout(r, 1500));
            // Force kill if it's still there (optional, but keeps things clean)
            execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
        } catch { }
    }

    /**
     * Show intervention guide
     */
    private static showInterventionGuide(sessionId: string, taskId: string): void {
        console.log(`📺 Tmux session ${sessionId} running for task ${taskId}`);
    }

    /**
     * Clean up files
     */
    private static cleanupFiles(...files: string[]): void {
        files.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch { }
        });
    }

    /**
     * Kill session
     */
    private static killSession(sessionId: string): void {
        try {
            execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
        } catch { }
    }

    /**
     * Get active sessions
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
     * Show session status
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
     * Cleanup all sessions
     */
    static async cleanup(): Promise<void> {
        try {
            await this.checkTmuxAvailability();
            const sessions = this.getActiveSessions();
            if (sessions.length === 0) return;

            for (const sessionId of sessions) {
                try {
                    execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
                    console.log(`🧹 Cleaned up session: ${sessionId}`);
                } catch { }
            }
        } catch { }
    }
}