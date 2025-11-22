/**
 * Child process execution utilities
 */

import { spawn } from 'child_process';
import { ExecResult } from '../types.js';

/**
 * Execute a command and return the result
 */
export async function execCmd(
    cmd: string,
    args: string[],
    options?: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string }
): Promise<ExecResult> {
    return new Promise((resolve) => {
        const proc = spawn(cmd, args, {
            cwd: options?.cwd || process.cwd(),
            env: { ...process.env, ...options?.env },
            shell: false,
        });

        if (options?.input && proc.stdin) {
            proc.stdin.write(options.input);
            proc.stdin.end();
        }

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            resolve({ stdout, stderr, code });
        });

        proc.on('error', (error) => {
            resolve({ stdout, stderr: error.message, code: 1 });
        });
    });
}

/**
 * Run Claude CLI with a prompt
 */
export async function runClaude(
    prompt: string,
    options?: { cwd?: string; context?: string }
): Promise<ExecResult> {
    return execCmd('claude', ['--dangerously-skip-permissions', '-p', prompt], {
        ...options,
        input: options?.context
    });
}

/**
 * Run git command
 */
export async function runGit(
    args: string[],
    options?: { cwd?: string }
): Promise<ExecResult> {
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
 * Execute with retry and rate limit handling
 */
export async function execWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let retryCount = 0;

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
            if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
                console.warn(`⚠️ Rate limit detected, waiting 60s...`);
                await new Promise(resolve => setTimeout(resolve, 60000));
            } else {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    throw new Error(`Max retries (${maxRetries}) exceeded`);
}
