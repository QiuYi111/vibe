/**
 * Review Agent: Linus-style code review and dynamic test generation
 */

import { TaskState, SessionState, VibeConfig } from '../types.js';
import { runClaude, execCmd } from '../utils/childProcess.js';
import { fileExists, readFile, writeFile } from '../utils/file.js';
import { log } from '../logger.js';
import * as path from 'path';

/**
 * Run Review Agent for a task
 */
export async function runReviewAgent(
    task: TaskState,
    session: SessionState,
    config: VibeConfig
): Promise<boolean> {
    log.info(`🔍 [Review Agent] Analyzing task: ${task.name}`);

    const reviewLog = path.join(config.logDir, `review_${task.id}.log`);
    const reviewReport = path.join(config.logDir, `review_report_${task.id}.md`);
    const testCmdFile = path.join(config.logDir, `test_cmd_${task.id}.txt`);

    // Get changes in worktree (using git diff)
    const diffResult = await execCmd('git', ['diff', 'HEAD~1', '--stat'], { cwd: task.worktreePath });
    const changes = diffResult.code === 0 ? diffResult.stdout : 'No commits yet';

    const diffContentResult = await execCmd('git', ['diff', 'HEAD~1'], { cwd: task.worktreePath });
    const diffContent = diffContentResult.code === 0 ? diffContentResult.stdout : 'No diff available';

    // Construct review prompt
    const reviewPrompt = `
[ROLE] You are Linus Torvalds reviewing code for the Linux kernel.

[TASK] ${task.name} (ID: ${task.id})
[DOMAIN] ${session.domain}
[WORKTREE] ${task.worktreePath}

[CHANGES]
${changes}

[DIFF]
${diffContent}

[REVIEW PHILOSOPHY]
1. **Good Taste**: Code should be simple and elegant. No special cases.
2. **Clarity Over Cleverness**: If it's not obvious, it's wrong.
3. **Never Break Userspace**: Don't introduce breaking changes.
4. **Resource Management**: Every allocation must have a clear deallocation path.
5. **Error Handling**: Handle errors explicitly. No silent failures.

[INSTRUCTIONS]
1. Review the code changes using the philosophy above
2. Determine the appropriate test command(s) for this domain and changes
3. Output your review in this format:

## Review Report
[Your brutally honest review. If it's good, say LGTM. If not, be specific about what's wrong.]

## Test Command
[Single line test command to run, e.g., 'npm test' or 'pytest tests/test_foo.py']

If no tests are needed: echo 'No tests required'
`;

    // Run Claude in worktree
    const claudeResult = await runClaude(reviewPrompt, { cwd: task.worktreePath });

    if (claudeResult.code !== 0) {
        log.file(reviewLog, `Claude failed: ${claudeResult.stderr}`);
        return false;
    }

    // Write review report
    writeFile(reviewReport, claudeResult.stdout);
    log.file(reviewLog, `Review report generated: ${reviewReport}`);

    // Extract test command with retry
    let testCmd = "echo 'No test command found'";
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        if (fileExists(reviewReport)) {
            const reportContent = readFile(reviewReport);
            const lines = reportContent.split('\n');

            // Find "## Test Command" and get the next non-empty line
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('## Test Command')) {
                    for (let j = i + 1; j < lines.length; j++) {
                        const line = lines[j].trim().replace(/`/g, '');
                        if (line && !line.startsWith('#')) {
                            testCmd = line;
                            break;
                        }
                    }
                    break;
                }
            }
            break;
        } else {
            log.file(reviewLog, `Review report not found, retrying (${retryCount + 1}/${maxRetries})...`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    writeFile(testCmdFile, testCmd);
    log.file(reviewLog, `>>> Running test: ${testCmd}`);

    // Run the test command in worktree
    const testResult = await execCmd('sh', ['-c', testCmd], { cwd: task.worktreePath });
    log.file(reviewLog, testResult.stdout);
    log.file(reviewLog, testResult.stderr);

    if (testResult.code === 0) {
        log.file(reviewLog, '✅ Tests passed');
        return true;
    } else {
        log.file(reviewLog, '❌ Tests failed');
        return false;
    }
}
