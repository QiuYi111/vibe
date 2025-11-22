/**
 * Child process execution utilities
 *
 * CRITICAL: Uses execa to prevent process deadlocks that plagued the Bash version.
 * Key protections: timeout, maxBuffer, stdin closure, CI env variables.
 */

import { execa, ExecaError } from 'execa';
import { ExecResult } from '../types.js';

/**
 * Execute a command and return the result
 *
 * @param cmd - Command to execute
 * @param args - Command arguments
 * @param options - Execution options (cwd, env, input, timeout)
 * @returns ExecResult with stdout, stderr, and exit code
 */
export async function execCmd(
    cmd: string,
    args: string[],
    options?: {
        cwd?: string;
        env?: NodeJS.ProcessEnv;
        input?: string;
        timeout?: number; // milliseconds
    }
): Promise<ExecResult> {
    const isClaude = cmd === 'claude';
    const timeout = options?.timeout || 300000; // 5 minutes default
    let progressInterval: NodeJS.Timeout | null = null;

    // 🔑 简化的Claude进度监控 - 只提醒，不中断
    if (isClaude) {
        const startTime = Date.now();

        // 每2分钟提醒一次Claude还在工作
        progressInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            console.log(`🤔 [Claude] Still working... (${minutes}m ${seconds}s elapsed)`);
            console.log(`💡 To monitor progress: tmux attach -t vibe-task-TASK_ID`);
        }, 120000); // 2分钟间隔
    }

    try {
        const result = await execa(cmd, args, {
            cwd: options?.cwd || process.cwd(),
            env: { ...process.env, ...options?.env },
            input: options?.input || '', // 🔑 Critical: explicitly close stdin to prevent hanging
            timeout: isClaude ? undefined : timeout, // 🔑 No hard timeout for Claude, only for other commands
            maxBuffer: 10 * 1024 * 1024, // 🔑 10MB buffer limit to prevent overflow
            cleanup: true, // 🔑 Automatically kill child processes on exit
            shell: false,
            reject: false, // Don't throw on non-zero exit, return result instead
        });

        // Cleanup progress monitoring
        if (progressInterval) {
            clearInterval(progressInterval);
        }

        return {
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.exitCode ?? null,
        };
    } catch (error) {
        // Cleanup progress monitoring
        if (progressInterval) {
            clearInterval(progressInterval);
        }

        // 简化错误处理 - 不再特殊处理Claude超时
        const execaError = error as ExecaError;
        return {
            stdout: typeof execaError.stdout === 'string' ? execaError.stdout : '',
            stderr: typeof execaError.stderr === 'string' ? execaError.stderr : execaError.message,
            code: execaError.exitCode ?? 1,
        };
    }
}

/**
 * Run Claude CLI with a prompt
 *
 * CRITICAL FIX: Forces non-interactive mode to prevent TTY detection deadlocks
 * ENHANCEMENT: Supports session IDs for resumability
 *
 * @param prompt - The prompt to send to Claude
 * @param options - Execution options (cwd, context, timeout, sessionId)
 * @returns ExecResult with Claude's response
 */
export async function runClaude(
    prompt: string,
    options?: { cwd?: string; context?: string; timeout?: number; sessionId?: string }
): Promise<ExecResult> {
    const args = ['--dangerously-skip-permissions', '-p', prompt];

    // Add session ID if provided (enables resumability)
    if (options?.sessionId) {
        args.push('--session-id', options.sessionId);
    }

    return execCmd('claude', args, {
        cwd: options?.cwd,
        input: options?.context || '', // 🔑 Empty string closes stdin
        timeout: options?.timeout || 5 * 60 * 1000, // 🔑 5 minute default for LLM calls
        env: {
            CI: 'true', // 🔑 Force non-interactive mode
            NO_COLOR: '1', // 🔑 Disable ANSI colors for clean parsing
        },
    });
}

/**
 * Run git command
 */
export async function runGit(args: string[], options?: { cwd?: string }): Promise<ExecResult> {
    return execCmd('git', args, options);
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(cmd: string): Promise<boolean> {
    const result = await execCmd('command', ['-v', cmd]);
    return result.code === 0;
}

/**
 * Execute with retry and exponential backoff
 *
 * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
 * Special handling for rate limiting (429 errors): 60s wait
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 1000)
 * @returns Result of fn()
 */
export async function execWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
): Promise<T> {
    let retryCount = 0;
    const maxDelay = 60000; // 60 seconds maximum

    while (retryCount < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            retryCount++;

            if (retryCount >= maxRetries) {
                throw error;
            }

            // Check for rate limiting
            const errorMsg = error instanceof Error ? error.message : String(error);
            let delayMs: number;

            if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
                console.warn(`⚠️ Rate limit detected, waiting 60s... (attempt ${retryCount}/${maxRetries})`);
                delayMs = 60000; // Fixed 60s for rate limits
            } else {
                // Exponential backoff: delay = initialDelay * 2^(retryCount - 1)
                delayMs = Math.min(initialDelayMs * Math.pow(2, retryCount - 1), maxDelay);
                console.warn(`⚠️ Retry ${retryCount}/${maxRetries} after ${delayMs}ms: ${errorMsg}`);
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    throw new Error(`Max retries (${maxRetries}) exceeded`);
}

/**
 * Run Python script with arguments
 * 
 * @param scriptCode - Python script code to execute
 * @param args - Optional command line arguments
 * @param options - Execution options
 * @returns ExecResult with script output
 */
export async function runPython(
    scriptCode: string,
    args?: string[],
    options?: { cwd?: string; timeout?: number }
): Promise<ExecResult> {
    return execCmd('python3', ['-c', scriptCode, ...(args || [])], {
        cwd: options?.cwd,
        timeout: options?.timeout || 30000, // 30s default for scripts
    });
}
