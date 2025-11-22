/**
 * Review Agent: Code review and test generation
 */

import { TaskState, SessionState, VibeConfig } from '../types.js';
import { runClaude, execCmd } from '../utils/childProcess.js';
import { fileExists, writeFile } from '../utils/file.js';
import { log } from '../logger.js';
import * as path from 'path';

/**
 * Run Review Agent for a task
 */
export async function runReviewAgent(task: TaskState, session: SessionState, config: VibeConfig): Promise<boolean> {
    log.info(`🔍 [Review Agent] Analyzing task: ${task.name}`);

    const reviewLog = path.join(config.logDir, `review_${task.id}.log`);
    const reviewReport = path.join(config.logDir, `review_report_${task.id}.md`);
    const testCmdFile = path.join(config.logDir, `test_cmd_${task.id}.txt`);

    // Get changes in worktree (using git diff)
    const diffResult = await execCmd('git', ['diff', 'HEAD~1', '--stat'], { cwd: task.worktreePath });
    const changes = diffResult.code === 0 ? diffResult.stdout : 'No commits yet';

    const diffContentResult = await execCmd('git', ['diff', 'HEAD~1'], { cwd: task.worktreePath });
    const diffContent = diffContentResult.code === 0 ? diffContentResult.stdout : 'No diff available';

    // Use SuperClaude review command
    const reviewPrompt = `/sc:review
Task: ${task.name} (ID: ${task.id})
Domain: ${session.domain}
Worktree: ${task.worktreePath}

Changes:
${changes}

Diff:
${diffContent}
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

    // Simple test determination based on domain
    let testCmd = 'echo "No tests required"';

    switch (session.domain) {
        case 'WEB':
            testCmd = fileExists(path.join(task.worktreePath, 'package.json')) ? 'npm test' : testCmd;
            break;
        case 'PYTHON_GENERIC':
            testCmd = fileExists(path.join(task.worktreePath, 'requirements.txt')) ? 'python -m pytest' : testCmd;
            break;
        case 'HARDWARE':
        case 'AI_ROBOT':
        case 'GENERIC':
        default:
            testCmd = 'echo "No standard tests for this domain"';
            break;
    }

    writeFile(testCmdFile, testCmd);
    log.file(reviewLog, `>>> Running test: ${testCmd}`);

    // Run the test command in worktree
    const testResult = await execCmd('sh', ['-c', testCmd], { cwd: task.worktreePath });
    log.file(reviewLog, testResult.stdout);
    log.file(reviewLog, testResult.stderr);

    // For now, consider review passed unless there's an explicit failure in the review output
    const reviewPassed =
        !claudeResult.stdout.toLowerCase().includes('failed') && !claudeResult.stdout.toLowerCase().includes('error');

    if (reviewPassed && testResult.code === 0) {
        log.file(reviewLog, '✅ Review passed and tests successful');
        return true;
    } else {
        log.file(reviewLog, '❌ Review failed or tests failed');
        return false;
    }
}
