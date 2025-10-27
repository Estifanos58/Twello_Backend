import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address').toLowerCase();

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Registration input validation
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1, 'Full name is required').max(255).optional(),
});

/**
 * Login input validation
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Workspace creation validation
 */
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(255),
});

/**
 * Project creation validation
 */
export const createProjectSchema = z.object({
  workspaceId: uuidSchema,
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(2000).optional(),
});

/**
 * Task creation validation
 */
export const createTaskSchema = z.object({
  projectId: uuidSchema,
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().max(5000).optional(),
  assigneeIds: z.array(uuidSchema).optional(),
});

/**
 * Task update validation
 */
export const updateTaskSchema = z.object({
  taskId: uuidSchema,
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeIds: z.array(uuidSchema).optional(),
});

/**
 * Workspace role validation
 */
export const workspaceRoleSchema = z.enum(['OWNER', 'MEMBER', 'VIEWER']);

/**
 * Project role validation
 */
export const projectRoleSchema = z.enum(['LEAD', 'CONTRIBUTOR', 'VIEWER']);

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate and sanitize text input
 */
export function validateAndSanitize(
  input: string,
  maxLength: number = 1000
): { valid: boolean; sanitized: string; error?: string } {
  if (!input || input.trim().length === 0) {
    return { valid: false, sanitized: '', error: 'Input cannot be empty' };
  }

  const sanitized = sanitizeString(input);

  if (sanitized.length > maxLength) {
    return {
      valid: false,
      sanitized,
      error: `Input exceeds maximum length of ${maxLength} characters`,
    };
  }

  return { valid: true, sanitized };
}
