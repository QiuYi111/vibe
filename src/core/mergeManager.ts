/**
 * Merge Manager: Branch integration and conflict resolution
 */

import { TaskState, VibeConfig } from '../types.js';
import { runGit } from '../utils/childProcess.js';
import { runMediator } from './mediator.js';
import { log } from '../logger.js';

/**
 * Merge Manager: Orchestrate branch integration
 */
export async function runMergeManager(tasks: TaskState[], config: VibeConfig): Promise<void> {
    const successfulTasks = tasks.filter((t) => t.status === 'SUCCEEDED' || t.status === 'HEALED');
    const taskBranches = successfulTasks.map((t) => t.branchName);

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
            const resolved = await runMediator(branch, config.logDir);

            if (!resolved) {
                log.error(`❌ Failed to resolve conflicts in ${branch}. Manual intervention required.`);
                throw new Error(`Merge conflict in ${branch} could not be resolved by Mediator`);
            }
        }
    }
}
