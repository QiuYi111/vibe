/**
 * Architect: Task planning and decomposition
 */

import { SessionState, VibeConfig, TaskPlanItem } from '../types.js';
import { runClaude } from '../utils/childProcess.js';
import { fileExists, readFile, readJsonFile, writeFile } from '../utils/file.js';
import { log } from '../logger.js';

/**
 * Run Architect to generate task plan
 */
export async function runArchitect(state: SessionState, config: VibeConfig): Promise<TaskPlanItem[]> {
    log.info('🏗️  [Architect] Planning tasks...');

    // Read requirements and index
    const requirements = fileExists('REQUIREMENTS.md')
        ? readFile('REQUIREMENTS.md')
        : 'Optimize existing codebase based on index.';

    const indexData = readJsonFile(config.indexFile);

    // Hybrid approach (user feedback): Use /sc:workflow with custom requirements
    const basePrompt = `/sc:workflow

Domain: ${state.domain}

Project Index:
${JSON.stringify(indexData, null, 2)}

Requirements:
${requirements}

[CRITICAL CONSTRAINTS]
- Max ${config.maxParallelAgents} parallel agents
- Tasks MUST modify DIFFERENT files (no race conditions)
- Output valid JSON array with fields: id, name, desc

[OUTPUT FORMAT]
Return ONLY a JSON array wrapped in markdown code block:
\`\`\`json
[
  {"id": "task_1", "name": "Short Name", "desc": "Detailed description"}
]
\`\`\`
`;

    // Retry loop with error correction (bash approach)
    let retry = 0;
    const maxRetries = 3;
    let lastError: string = '';

    while (retry < maxRetries) {
        try {
            const prompt = retry === 0 ? basePrompt : buildRetryPrompt(lastError, basePrompt);

            const result = await runClaude(prompt);

            if (result.code !== 0) {
                throw new Error(`Claude failed: ${result.stderr}`);
            }

            // Use robust JSON extractor (from jsonExtractor.ts)
            const { extractJsonArrayFromText } = await import('../utils/jsonExtractor.js');
            const tasks = extractJsonArrayFromText(result.stdout);

            // Write plan file
            writeFile(config.planFile, JSON.stringify(tasks, null, 2));
            log.success(`✅ Plan generated: ${tasks.length} tasks.`);

            return tasks;
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            retry++;

            if (retry >= maxRetries) {
                throw new Error(`Architect failed after ${maxRetries} retries: ${lastError}`);
            }

            log.warn(`⚠️  JSON Parse Error. Retrying (${retry}/${maxRetries})...`);
        }
    }

    throw new Error('Architect failed to generate valid task plan');
}

/**
 * Build retry prompt with error feedback
 */
function buildRetryPrompt(error: string, originalPrompt: string): string {
    return `[System]
The previous JSON output was invalid.
Error: ${error}

[Original Request]
${originalPrompt}

[Instruction]
Fix the JSON syntax. Output ONLY the valid JSON array.
REMINDER: Use "id", "name", and "desc" fields exactly as specified.
`;
}
