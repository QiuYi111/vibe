/**
 * AI Mediator: Linus-style conflict resolution
 * 
 * Uses Claude to automatically resolve git merge conflicts
 * with "good taste" and simplicity principles
 */

import { runClaude, runGit } from '../utils/childProcess.js';
import { log } from '../logger.js';
import * as path from 'path';

/**
 * Get list of conflicted files
 */
async function getConflictFiles(): Promise<string> {
    const result = await runGit(['diff', '--name-only', '--diff-filter=U']);
    return result.stdout.trim();
}

/**
 * Get full diff with conflict markers
 */
async function getConflictDiff(): Promise<string> {
    const result = await runGit(['diff']);
    return result.stdout;
}

/**
 * Check if there are still unresolved conflicts
 */
async function hasUnresolvedConflicts(): Promise<boolean> {
    const result = await runGit(['diff', '--name-only', '--diff-filter=U']);
    return result.stdout.trim().length > 0;
}

/**
 * Run AI Mediator to resolve merge conflicts
 * 
 * @param conflictedBranch - Branch that caused the conflict
 * @param logDir - Directory for storing logs
 * @returns true if conflicts were resolved successfully
 */
export async function runMediator(conflictedBranch: string, logDir: string): Promise<boolean> {
    const mediatorLog = path.join(logDir, `mediator_${conflictedBranch}.log`);

    log.warn(`⚖️  [Mediator] Resolving conflicts from ${conflictedBranch}...`);

    // Get conflict context
    const conflictFiles = await getConflictFiles();
    if (!conflictFiles) {
        log.warn('No conflict files found (already resolved?)');
        return true;
    }

    const conflictDiff = await getConflictDiff();

    // Mediation prompt following Linus philosophy
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
5. Stage the resolved files with: git add <files>
6. DO NOT commit yet - just resolve and stage

Be decisive. This is your codebase now.
`;

    try {
        // Run Claude to resolve conflicts
        const result = await runClaude(mediationPrompt);

        // Log the mediation session
        log.file(mediatorLog, `=== Mediator Session for ${conflictedBranch} ===\n`);
        log.file(mediatorLog, `Conflict Files:\n${conflictFiles}\n`);
        log.file(mediatorLog, `\nClaude Output:\n${result.stdout}\n`);
        if (result.stderr) {
            log.file(mediatorLog, `\nStderr:\n${result.stderr}\n`);
        }

        // Check if conflicts are resolved
        if (await hasUnresolvedConflicts()) {
            log.error('❌ Mediator failed to resolve all conflicts');
            log.file(mediatorLog, '\n❌ FAILED: Unresolved conflicts remain');
            return false;
        }

        // Complete the merge
        const commitResult = await runGit(['commit', '--no-edit']);
        if (commitResult.code !== 0) {
            log.error('❌ Failed to commit resolved conflicts');
            return false;
        }

        log.success('✅ Conflicts resolved by AI Mediator');
        log.file(mediatorLog, '\n✅ SUCCESS: Conflicts resolved and committed');
        return true;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`Mediator error: ${errorMsg}`);
        log.file(mediatorLog, `\n❌ ERROR: ${errorMsg}`);
        return false;
    }
}
