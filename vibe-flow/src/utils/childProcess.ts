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
    options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<ExecResult> {
    return new Promise((resolve) => {
        const proc = spawn(cmd, args, {
            cwd: options?.cwd || process.cwd(),
            env: { ...process.env, ...options?.env },
            shell: true,
        });

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
    options?: { cwd?: string }
): Promise<ExecResult> {
    return execCmd('claude', ['--dangerously-skip-permissions', '-p', prompt], options);
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
 * Run repomix
 */
export async function runRepomix(
    args: string[],
    options?: { cwd?: string }
): Promise<ExecResult> {
    return execCmd('npx', ['repomix', ...args], options);
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(cmd: string): Promise<boolean> {
    const result = await execCmd('command', ['-v', cmd]);
    return result.code === 0;
}
