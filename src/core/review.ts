/**
 * Review Agent: Code review and test generation
 */

import { TaskState, SessionState, VibeConfig } from '../types.js';
import { execCmd } from '../utils/childProcess.js';
import { TmuxTaskRunner } from './tmuxTaskRunner.js';
import { fileExists } from '../utils/file.js';
import { log } from '../logger.js';
import * as path from 'path';

/**
 * Run Review Agent for a task
 */
export async function runReviewAgent(task: TaskState, session: SessionState, config: VibeConfig): Promise<boolean> {
    log.info(`🔍 [Review Agent] Analyzing task: ${task.name}`);

    const reviewLog = path.join(config.logDir, `review_${task.id}.log`);

    // Get changes in worktree
    const diffResult = await execCmd('git', ['diff', 'HEAD~1', '--stat'], { cwd: task.worktreePath });
    const changes = diffResult.code === 0 ? diffResult.stdout : 'No commits yet';

    const diffContentResult = await execCmd('git', ['diff', 'HEAD~1'], { cwd: task.worktreePath });
    const diffContent = diffContentResult.code === 0 ? diffContentResult.stdout : 'No diff available';

    // Determine default test command
    const defaultTestCmd = getDefaultTestCommand(session.domain, task.worktreePath);

    const reviewPrompt = `/sc:analyze

[TASK REVIEW]
Task: ${task.name} (ID: ${task.id})
Domain: ${session.domain}
Worktree: ${task.worktreePath}

Changes Statistics:
${changes}

Code Diff:
${diffContent}

[INSTRUCTIONS]
1. Analyze the code changes for correctness, security, and style.
2. **EXECUTE TESTS**: Run the appropriate test command for this project (e.g., ${defaultTestCmd}).
   - If no tests exist, create a simple verification script and run it.
   - Ensure the tests pass.
3. If tests fail, try to fix the code and re-run tests (you have full shell access).
4. If you cannot fix it, report failure.

[OUTPUT REQUIREMENT]
When finished, write a JSON object to the output file with this structure:
{
  "status": "PASS" | "FAIL",
  "message": "Brief summary of review and test results",
  "testCommand": "The command you ran"
}
`;

    console.log(``);
    log.cyan(`🎬 [Tmux] Review Agent started for ${task.name}`);
    log.success(`📺 To watch: tmux attach -t vibe-task-review-${task.id}`);
    console.log(``);

    try {
        const resultJson = await TmuxTaskRunner.runClaudeInTmux({
            taskId: `review-${task.id}`,
            prompt: reviewPrompt,
            cwd: task.worktreePath,
            needsOutput: true,
            outputFormat: 'json',
            timeout: 0 // No timeout, let user intervene if needed
        });

        if (!resultJson) {
            log.error('❌ Review Agent returned no output');
            return false;
        }

        const result = JSON.parse(resultJson);
        log.file(reviewLog, JSON.stringify(result, null, 2));

        if (result.status === 'PASS') {
            log.success(`✅ Review passed: ${result.message}`);
            return true;
        } else {
            log.error(`❌ Review failed: ${result.message}`);
            return false;
        }

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`Review Agent failed: ${errorMsg}`);
        return false;
    }
}

/**
 * Get default test command based on domain (fallback)
 */
function getDefaultTestCommand(domain: string, worktreePath: string): string {
    switch (domain) {
        case 'WEB':
            return fileExists(path.join(worktreePath, 'package.json')) ? 'npm test' : 'echo "No tests configured"';
        case 'PYTHON_GENERIC':
        case 'AI_ROBOT':
            return fileExists(path.join(worktreePath, 'requirements.txt')) || fileExists(path.join(worktreePath, 'pyproject.toml'))
                ? 'pytest -v'
                : 'echo "No tests configured"';
        case 'HARDWARE':
            return 'pio test -e native';
        case 'GENERIC':
        default:
            return 'echo "No standard tests for this domain"';
    }
}
