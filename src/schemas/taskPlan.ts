/**
 * Zod schemas for runtime validation of LLM outputs
 */

import { z } from 'zod';

/**
 * Schema for a single task plan item
 */
export const TaskPlanItemSchema = z.object({
    id: z.string().min(1, 'Task ID cannot be empty'),
    name: z.string().min(1, 'Task name cannot be empty'),
    desc: z.string().min(1, 'Task description cannot be empty'),
});

/**
 * Schema for the complete task plan array
 */
export const TaskPlanSchema = z.array(TaskPlanItemSchema).min(1, 'Task plan must contain at least one task');

/**
 * Type inference from schemas
 */
export type TaskPlanItem = z.infer<typeof TaskPlanItemSchema>;
export type TaskPlan = z.infer<typeof TaskPlanSchema>;
