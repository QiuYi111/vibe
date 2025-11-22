/**
 * Session Report: Final summary generation
 */

import { SessionState, VibeConfig } from '../types.js';
import { runClaude } from '../utils/childProcess.js';
import { readFile, fileExists, writeFile } from '../utils/file.js';
import { log } from '../logger.js';
import { updateReadme } from './readme.js';

/**
 * Generate session summary report
 */
export async function generateSessionReport(session: SessionState, config: VibeConfig): Promise<void> {
    log.info('🛡️  Generating Session Report...');

    // Prepare task summary
    const taskSummary = session.tasks
        .map((t) => `- ${t.name} (${t.id}): ${t.status}`)
        .join('\n');

    // Read git status
    const gitStatus = fileExists('git_status.txt') ? readFile('git_status.txt') : 'No git status available';

    const prompt = `
[ROLE] Session Reporter

[TASK]
Summarize this Vibe Flow development session.

[SESSION INFO]
Mode: ${session.mode}
Domain: ${session.domain}

Tasks:
${taskSummary}

Git Status:
${gitStatus}

[REQUIREMENTS]
Generate a concise Markdown report including:
- Session overview (mode, domain, number of tasks)
- Task completion status
- Key changes made
- Any warnings or recommendations

Keep it brief and actionable.
`;

    const result = await runClaude(prompt);

    if (result.code !== 0) {
        log.error(`Report generation failed: ${result.stderr}`);
        return;
    }

    writeFile(config.reportFile, result.stdout);
    log.success(`📊 Session Report: ${config.reportFile}`);

    // Update README.md (user feedback: add this to reporting phase)
    await updateReadme(session);
}
