/**
 * Session Report: Final summary generation
 */

import { SessionState, VibeConfig } from '../types.js';
import { runGit, runClaude } from '../utils/childProcess.js';
import { writeFile, fileExists, readFile } from '../utils/file.js';
import { log } from '../logger.js';

/**
 * Generate session report
 */
export async function generateSessionReport(session: SessionState, config: VibeConfig): Promise<void> {
    log.info('🛡️  Generating Session Report...');

    // Get git status
    const gitStatusResult = await runGit(['status']);
    const gitStatus = gitStatusResult.stdout;

    // Read plan file
    let planContent = 'No plan file available';
    if (fileExists(config.planFile)) {
        planContent = readFile(config.planFile);
    }

    // Construct report prompt
    const prompt = `Summarize this Vibe Flow session.

[PLAN]
${planContent}

[GIT STATUS]
${gitStatus}

[TASK RESULTS]
${session.tasks.map(t => `- ${t.name} (${t.id}): ${t.status} (${t.attempts} attempts)`).join('\n')}

Generate a concise markdown report with:
- Session Overview
- Tasks Completed
- Tasks Failed (if any)
- Next Steps

Keep it brief and actionable.
`;

    const result = await runClaude(prompt);

    if (result.code !== 0) {
        log.error(`Session report generation failed: ${result.stderr}`);
        return;
    }

    writeFile(config.reportFile, result.stdout);
    log.success(`📊 Session Report: ${config.reportFile}`);
}
