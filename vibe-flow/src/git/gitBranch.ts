/**
 * Git branch management
 */

import { runGit } from '../utils/childProcess.js';

/**
 * Ensure the 'vibe' branch exists and switch to it
 */
export async function ensureVibeBranch(): Promise<string> {
    // Check if vibe branch exists
    const checkResult = await runGit(['show-ref', '--verify', '--quiet', 'refs/heads/vibe']);

    if (checkResult.code !== 0) {
        // Branch doesn't exist, create it
        const createResult = await runGit(['checkout', '-b', 'vibe']);
        if (createResult.code !== 0) {
            throw new Error(`Failed to create vibe branch: ${createResult.stderr}`);
        }
    } else {
        // Branch exists, switch to it
        const checkoutResult = await runGit(['checkout', 'vibe']);
        if (checkoutResult.code !== 0) {
            throw new Error(`Failed to checkout vibe branch: ${checkoutResult.stderr}`);
        }
    }

    return 'vibe';
}

/**
 * Merge multiple branches into current branch
 */
export async function mergeBranches(branches: string[]): Promise<void> {
    for (const branch of branches) {
        // Check if branch exists
        const checkResult = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);

        if (checkResult.code !== 0) {
            console.warn(`⚠️  Branch ${branch} not found. Skipping merge.`);
            continue;
        }

        const mergeResult = await runGit(['merge', '--no-edit', branch]);

        if (mergeResult.code !== 0) {
            // Merge conflict - will be handled by caller (mediator)
            throw new Error(`Merge conflict in branch ${branch}`);
        }
    }
}

/**
 * Get current commit hash
 */
export async function getCurrentHash(): Promise<string> {
    const result = await runGit(['rev-parse', 'HEAD']);

    if (result.code !== 0) {
        // Empty repository
        return 'EMPTY_TREE';
    }

    return result.stdout.trim();
}

/**
 * Create initial commit if repository is empty
 */
export async function ensureInitialCommit(): Promise<string> {
    const hash = await getCurrentHash();

    if (hash === 'EMPTY_TREE') {
        const result = await runGit(['commit', '--allow-empty', '-m', 'Initial commit for Vibe Flow session']);

        if (result.code !== 0) {
            throw new Error(`Failed to create initial commit: ${result.stderr}`);
        }

        return await getCurrentHash();
    }

    return hash;
}
