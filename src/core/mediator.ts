/**
 * AI Mediator: Linus-style conflict resolution
 * 
 * Uses Claude to automatically resolve git merge conflicts
 * with "good taste" and simplicity principles
 */

import { runGit } from '../utils/childProcess.js';
import { TmuxTaskRunner } from './tmuxTaskRunner.js';
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
1. Resolve the conflicts in the files.
2. Use your native file editing tools.
3. Stage the resolved files: git add <files>
4. Verify that no conflict markers remain.

[OUTPUT REQUIREMENT]
When finished, write a JSON object to the output file:
{
  "status": "RESOLVED" | "FAILED",
  "message": "Brief summary of resolution"
}
`;

    console.log(``);
    log.cyan(`🎬 [Tmux] Mediator started for ${conflictedBranch}`);
    log.success(`📺 To watch: tmux attach -t vibe-task-mediator-${conflictedBranch}`);
    console.log(``);

    try {
        const resultJson = await TmuxTaskRunner.runClaudeInTmux({
            taskId: `mediator-${conflictedBranch}`,
            prompt: mediationPrompt,
            cwd: process.cwd(), // Mediator runs in root
            needsOutput: true,
            outputFormat: 'json',
            timeout: 0
        });

        if (!resultJson) {
            log.error('❌ Mediator returned no output');
            return false;
        }

        const result = JSON.parse(resultJson);
        log.file(mediatorLog, JSON.stringify(result, null, 2));

        if (result.status === 'RESOLVED') {
            // Check if conflicts are actually resolved
            if (await hasUnresolvedConflicts()) {
                log.error('❌ Mediator claimed success but conflicts remain');
                return false;
            }

            // Complete the merge
            const commitResult = await runGit(['commit', '--no-edit']);
            if (commitResult.code !== 0) {
                log.error('❌ Failed to commit resolved conflicts');
                return false;
            }

            log.success('✅ Conflicts resolved by AI Mediator');
            return true;
        } else {
            log.error(`❌ Mediator failed: ${result.message}`);
            return false;
        }

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`Mediator error: ${errorMsg}`);
        return false;
    }
}
