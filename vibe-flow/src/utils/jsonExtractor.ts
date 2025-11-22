/**
 * JSON extraction utilities (replaces Python JSON_EXTRACTOR)
 * 
 * CRITICAL: Uses Zod for runtime Schema validation to catch LLM mistakes early
 */

import { TaskPlanSchema } from '../schemas/taskPlan.js';
import type { TaskPlanItem } from '../schemas/taskPlan.js';

/**
 * Extract and validate JSON array from text content
 * Handles markdown code blocks and fallback extraction
 * 
 * @param content - Raw text content potentially containing JSON
 * @returns Validated array of TaskPlanItems
 * @throws Error with detailed Zod validation message if schema validation fails
 */
export function extractJsonArrayFromText(content: string): TaskPlanItem[] {
    let jsonStr: string | null = null;

    // 1. Try to find markdown code blocks first
    const codeBlockPattern = /```(?:json)?\s*(\[.*?\])\s*```/s;
    const match = content.match(codeBlockPattern);

    if (match) {
        jsonStr = match[1];
    } else {
        // 2. Fallback: Find the first '[' and the last ']'
        const start = content.indexOf('[');
        const end = content.lastIndexOf(']');

        if (start !== -1 && end !== -1 && end > start) {
            jsonStr = content.substring(start, end + 1);
        }
    }

    if (!jsonStr) {
        throw new Error('No JSON array found in content');
    }

    // 3. Parse JSON
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`JSON parse error: ${error.message}`);
        }
        throw error;
    }

    // 4. 🔑 CRITICAL: Validate with Zod
    //    This catches missing fields, wrong types, etc. from LLM output
    //    The error message can be fed back to Claude for retry
    const validationResult = TaskPlanSchema.safeParse(parsed);

    if (!validationResult.success) {
        const formattedErrors = validationResult.error.format();
        throw new Error(
            `Schema validation failed. Please fix the following errors and regenerate:\n${JSON.stringify(formattedErrors, null, 2)}`
        );
    }

    return validationResult.data;
}
