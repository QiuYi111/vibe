/**
 * Git worktree management
 */

import { runGit } from '../utils/childProcess.js';
import { dirExists } from '../utils/file.js';
import * as path from 'path';

const WORKTREE_BASE_DIR = '.vibe_worktrees';

/**
 * Create an isolated worktree for a task
 */
export async function createTaskWorktree(taskId: string): Promise<{ branchName: string; worktreePath: string }> {
    const timestamp = Date.now();
    const branchName = `vibe-task_${taskId}_${timestamp}`;
    const worktreePath = path.join(WORKTREE_BASE_DIR, taskId);

    // Ensure worktree base directory exists
    const mkdirResult = await runGit(['init'], { cwd: '.' }); // Dummy command to ensure we're in a git repo
    if (mkdirResult.code !== 0) {
        throw new Error('Not in a git repository');
    }

    // Remove existing worktree if it exists (cleanup from failed runs)
    if (dirExists(worktreePath)) {
        await runGit(['worktree', 'remove', worktreePath, '--force']);
    }

    // Create branch and worktree
    let result = await runGit(['worktree', 'add', '-b', branchName, worktreePath]);

    if (result.code !== 0) {
        // Branch might already exist, try without -b
        result = await runGit(['worktree', 'add', worktreePath, branchName]);

        if (result.code !== 0) {
            throw new Error(`Failed to create worktree for ${taskId}: ${result.stderr}`);
        }
    }

    // Verify worktree was created
    if (!dirExists(worktreePath)) {
        throw new Error(`Worktree directory was not created: ${worktreePath}`);
    }

    // Return absolute path
    const absolutePath = path.resolve(worktreePath);
    return { branchName, worktreePath: absolutePath };
}

/**
 * Cleanup worktree after completion
 */
export async function cleanupTaskWorktree(taskId: string): Promise<void> {
    const worktreePath = path.join(WORKTREE_BASE_DIR, taskId);

    if (dirExists(worktreePath)) {
        const result = await runGit(['worktree', 'remove', worktreePath, '--force']);

        if (result.code !== 0) {
            // Log warning but don't throw - cleanup is best-effort
            console.warn(`Warning: Failed to remove worktree ${worktreePath}: ${result.stderr}`);
        }
    }
}

/**
 * Create all worktrees serially to avoid git race conditions
 * CRITICAL: Must be serial, not parallel
 */
export async function createAllWorktreesSerial(
    taskIds: string[]
): Promise<Array<{ taskId: string; branchName: string; worktreePath: string }>> {
    const results: Array<{ taskId: string; branchName: string; worktreePath: string }> = [];

    for (const taskId of taskIds) {
        const { branchName, worktreePath } = await createTaskWorktree(taskId);
        results.push({ taskId, branchName, worktreePath });
    }

    return results;
}
