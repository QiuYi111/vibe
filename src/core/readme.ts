/**
 * README Auto-Update: Generate or update README.md after session
 */

import { SessionState } from '../types.js';
import { runClaude } from '../utils/childProcess.js';
import { log } from '../logger.js';

/**
 * Update README.md based on session changes
 * (User feedback: add README update to reporting phase)
 */
export async function updateReadme(session: SessionState): Promise<void> {
    log.info('📝 [README] Updating project documentation...');

    const taskSummary = session.tasks
        .map((t) => `- ${t.name}: ${t.status}`)
        .join('\n');

    const prompt = `
[ROLE] Technical Writer & Documentation Specialist

[TASK]
Update or create the README.md file to reflect the changes made in this development session.

[SESSION INFO]
Domain: ${session.domain}
Mode: ${session.mode}

Tasks Completed:
${taskSummary}

[REQUIREMENTS]
1. If README.md doesn't exist, create a comprehensive one with:
   - Project title and description
   - Installation instructions
   - Usage examples
   - Architecture overview
   - Contributing guidelines (if applicable)

2. If it exists, intelligently update relevant sections:
   - Features (if new features added)
   - Installation (if dependencies changed)
   - Usage (if API or interface changed)
   - Architecture (if structure changed)
   - Keep existing content that's still relevant

3. Use clear, concise language
4. Include code examples where appropriate
5. Follow markdown best practices
6. Add shields/badges if appropriate for the project type

Use your native file editing tools to update or create README.md
`;

    const result = await runClaude(prompt);

    if (result.code !== 0) {
        log.error(`README update failed: ${result.stderr}`);
        return;
    }

    log.success('✅ README.md updated');
}
