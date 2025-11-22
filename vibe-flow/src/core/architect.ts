/**
 * Architect: Task planning and decomposition
 */

import { SessionState, VibeConfig, TaskPlanItem } from '../types.js';
import { runClaude } from '../utils/childProcess.js';
import { fileExists, readFile, writeFile } from '../utils/file.js';
import { extractJsonArrayFromText } from '../utils/jsonExtractor.js';
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

    const index = readFile(config.indexFile);

    // Construct prompt
    const basePrompt = `/sc:estimate
[Context]
Domain: ${state.domain}
${index}

[Requirements]
${requirements}

[Task]
Break down requirements into parallelizable tasks.
Constraint: The system can run at most ${config.maxParallelAgents} parallel agents.
IMPORTANT: Ensure tasks modify DIFFERENT files to avoid race conditions.
NOTE: Tasks will be executed in batches of ${config.maxParallelAgents}. Design tasks to be independent within batches.

[Output Format]
RETURN ONLY A RAW JSON ARRAY. 
Wrap the JSON in a markdown code block like this:
\`\`\`json
[ ... ]
\`\`\`
DO NOT include any explanation or text outside the code block.

SCHEMA DEFINITION:
- "id": string (unique task id)
- "name": string (short task name)  <-- MUST use "name", NOT "title"
- "desc": string (detailed description) <-- MUST use "desc", NOT "description"

Example:
[{"id": "task_1", "name": "Auth", "desc": "Implement login"}]
`;

    let retryCount = 0;
    const maxRetries = 3;
    let lastOutput = '';
    let lastError = '';

    while (retryCount < maxRetries) {
        try {
            // Call Claude
            const prompt = retryCount === 0
                ? basePrompt
                : `[System]
The previous JSON output was invalid.
Error: ${lastError}

[Previous Output]
${lastOutput}

[Instruction]
Fix the JSON syntax. Output ONLY the valid JSON array.
REMINDER: Use "name" and "desc" fields.
`;

            const result = await runClaude(prompt);

            if (result.code !== 0) {
                throw new Error(`Claude failed: ${result.stderr}`);
            }

            lastOutput = result.stdout;

            // Extract and validate JSON
            const tasks = extractJsonArrayFromText(result.stdout);

            // Write plan file
            writeFile(config.planFile, JSON.stringify(tasks, null, 2));
            log.success(`✅ Plan generated: ${tasks.length} tasks.`);

            return tasks;

        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            retryCount++;

            if (retryCount < maxRetries) {
                log.warn(`⚠️ JSON Parse Error. Retrying (${retryCount}/${maxRetries})...`);
            }
        }
    }

    throw new Error(`Architect failed to generate valid JSON after ${maxRetries} retries.`);
}
