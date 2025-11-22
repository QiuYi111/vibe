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

/**
 * Get git hash from index file (bash approach)
 * Index file should contain metadata with git hash
 */
export async function getIndexGitHash(indexFile: string): Promise<string | null> {
    const { fileExists, readFile } = await import('../utils/file.js');

    if (!fileExists(indexFile)) {
        return null;
    }

    const content = readFile(indexFile);

    // Try to find git hash in various formats
    // XML format: <!-- COMMIT: abc123 -->
    const xmlMatch = content.match(/<!-- COMMIT: ([a-f0-9]+) -->/);
    if (xmlMatch) {
        return xmlMatch[1];
    }

    // JSON format: "gitHash": "abc123"
    const jsonMatch = content.match(/"gitHash":\s*"([a-f0-9]+)"/);
    if (jsonMatch) {
        return jsonMatch[1];
    }

    return null;
}

/**
 * Check if index is stale and needs regeneration
 * Returns true if index doesn't exist or git hash doesn't match current HEAD
 */
export async function isIndexStale(indexFile: string): Promise<boolean> {
    const lastHash = await getIndexGitHash(indexFile);
    if (!lastHash) {
        return true; // No hash found, consider stale
    }

    const currentHash = await getCurrentHash();
    if (currentHash === 'EMPTY_TREE') {
        return true; // Empty repo, always regenerate
    }

    return lastHash !== currentHash;
}
