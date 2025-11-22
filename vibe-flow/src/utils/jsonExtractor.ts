/**
 * JSON extraction utilities (replaces Python JSON_EXTRACTOR)
 */

import { TaskPlanItem } from '../types.js';

/**
 * Extract JSON array from text content
 * Handles markdown code blocks and fallback extraction
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

    // 3. Parse and validate
    try {
        const parsed = JSON.parse(jsonStr);

        if (!Array.isArray(parsed)) {
            throw new Error('Extracted JSON is not an array');
        }

        // Validate each item has required fields
        for (const item of parsed) {
            if (!item.id || !item.name || !item.desc) {
                throw new Error(`Invalid task item: missing required fields (id, name, desc). Got: ${JSON.stringify(item)}`);
            }
        }

        return parsed as TaskPlanItem[];
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`JSON parse error: ${error.message}`);
        }
        throw error;
    }
}
