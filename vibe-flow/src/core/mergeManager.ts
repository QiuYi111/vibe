/**
 * Merge Manager: Branch integration and conflict resolution
 */

import { TaskState, VibeConfig } from '../types.js';
import { runGit, runClaude } from '../utils/childProcess.js';
import { log } from '../logger.js';
import * as path from 'path';

/**
 * AI Mediator for conflict resolution
 */
async function runMediator(conflictedBranch: string, config: VibeConfig): Promise<void> {
    const mediatorLog = path.join(config.logDir, `mediator_${conflictedBranch}.log`);

    // Get conflict files and diff
    const conflictFilesResult = await runGit(['diff', '--name-only', '--diff-filter=U']);
    const conflictFiles = conflictFilesResult.stdout;

    const conflictDiffResult = await runGit(['diff']);
    const conflictDiff = conflictDiffResult.stdout;

    const mediationPrompt = `
[ROLE] You are Linus Torvalds mediating a merge conflict.

[PHILOSOPHY]
- Good code has no special cases
- When in doubt, choose simplicity
- Both sides might be wrong - don't be afraid to write a third solution
- Never sacrifice correctness for convenience

[CONFLICT]
Branch: ${conflictedBranch}
Files: ${conflictFiles}

[DIFF WITH CONFLICT MARKERS]
${conflictDiff}

[TASK]
Resolve the conflicts by:
1. Understanding the intent of both code paths
2. Applying good taste - choose the simpler, more elegant solution
3. If both are flawed, write a better third solution
4. Use your native file editing tools to resolve conflicts in each file
5. Stage the resolved files and complete the merge

Be decisive. This is your codebase now.
`;

    log.file(mediatorLog, `Running AI Mediator for ${conflictedBranch}...`);
    const result = await runClaude(mediationPrompt);
    log.file(mediatorLog, result.stdout);
    log.file(mediatorLog, result.stderr);

    // Check if resolved
    const checkResult = await runGit(['diff', '--name-only', '--diff-filter=U']);
    if (checkResult.stdout.trim()) {
        throw new Error('Mediator failed to resolve conflicts. Manual intervention required.');
    }

    // Complete merge
    await runGit(['commit', '--no-edit']);
    log.success('✅ Conflicts resolved by AI Mediator');
}

/**
 * Merge Manager: Orchestrate branch integration
 */
export async function runMergeManager(tasks: TaskState[], config: VibeConfig): Promise<void> {
    const successfulTasks = tasks.filter(t => t.status === 'SUCCEEDED' || t.status === 'HEALED');
    const taskBranches = successfulTasks.map(t => t.branchName);

    log.info(`🔀 [Merge Manager] Integrating ${taskBranches.length} branches...`);

    for (const branch of taskBranches) {
        // Check if branch exists
        const checkResult = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);

        if (checkResult.code !== 0) {
            log.warn(`⚠️  Branch ${branch} not found. Skipping merge.`);
            continue;
        }

        const mergeResult = await runGit(['merge', '--no-edit', branch]);

        if (mergeResult.code === 0) {
            log.success(`✅ Merged ${branch}`);
        } else {
            log.warn(`⚠️  Conflict detected in ${branch}. Starting Mediator...`);
            await runMediator(branch, config);
        }
    }
}
