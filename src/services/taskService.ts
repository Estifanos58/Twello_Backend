import { query, transaction } from '../db/pool.js';
import { logTaskStatusChange } from './loggingService.js';
import { createNotification } from './notificationService.js';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskWithAssignees extends Task {
  assignees: Array<{
    id: string;
    email: string;
    full_name: string | null;
  }>;
}

/**
 * Create a new task
 */
export async function createTask(
  projectId: string,
  title: string,
  creatorId: string,
  description?: string,
  assigneeIds?: string[]
): Promise<TaskWithAssignees> {
  let task: Task;
  const assignees: any[] = [];

  await transaction(async (client) => {
    // Create task
    const taskResult = await client.query<Task>(
      `INSERT INTO tasks (project_id, title, description, status, created_by) 
       VALUES ($1, $2, $3, 'TODO', $4) 
       RETURNING *`,
      [projectId, title, description || null, creatorId]
    );

    task = taskResult.rows[0];

    // Add assignees if provided
    if (assigneeIds && assigneeIds.length > 0) {
      for (const assigneeId of assigneeIds) {
        await client.query(
          'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
          [task.id, assigneeId]
        );

        // Create notification for assignee
        await createNotification(
          assigneeId,
          'Task Assigned',
          `You have been assigned to task: ${title}`,
          task.id
        );
      }

      // Get assignee details
      const assigneeResult = await client.query(
        `SELECT u.id, u.email, u.full_name 
         FROM users u
         JOIN task_assignees ta ON ta.user_id = u.id
         WHERE ta.task_id = $1`,
        [task.id]
      );

      assignees.push(...assigneeResult.rows);
    }
  });

  return {
    ...task!,
    assignees,
  };
}

/**
 * Get task by ID with assignees
 */
export async function getTaskById(taskId: string): Promise<TaskWithAssignees | null> {
  const taskResult = await query<Task>(
    'SELECT * FROM tasks WHERE id = $1',
    [taskId]
  );

  if (taskResult.rows.length === 0) {
    return null;
  }

  const task = taskResult.rows[0];

  // Get assignees
  const assigneesResult = await query(
    `SELECT u.id, u.email, u.full_name 
     FROM users u
     JOIN task_assignees ta ON ta.user_id = u.id
     WHERE ta.task_id = $1`,
    [taskId]
  );

  return {
    ...task,
    assignees: assigneesResult.rows,
  };
}

/**
 * Get tasks in a project
 */
export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const result = await query<Task>(
    'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId]
  );

  return result.rows;
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeIds?: string[];
  }
): Promise<TaskWithAssignees> {
  let task: Task;
  let assignees: any[] = [];

  await transaction(async (client) => {
    // Get current task for comparison
    const currentTask = await client.query<Task>(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    if (currentTask.rows.length === 0) {
      throw new Error('Task not found');
    }

    const oldStatus = currentTask.rows[0].status;

    // Update task fields
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_at = now()`);
      values.push(taskId);

      const taskResult = await client.query<Task>(
        `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      task = taskResult.rows[0];

      // Log status change
      if (updates.status && updates.status !== oldStatus) {
        logTaskStatusChange(userId, taskId, oldStatus, updates.status);
      }
    } else {
      task = currentTask.rows[0];
    }

    // Update assignees if provided
    if (updates.assigneeIds !== undefined) {
      // Get current assignees
      const currentAssignees = await client.query(
        'SELECT user_id FROM task_assignees WHERE task_id = $1',
        [taskId]
      );

      const currentAssigneeIds = currentAssignees.rows.map((r: any) => r.user_id);
      const newAssigneeIds = updates.assigneeIds;

      // Find newly assigned users
      const addedAssignees = newAssigneeIds.filter(
        (id) => !currentAssigneeIds.includes(id)
      );

      // Find removed assignees
      const removedAssignees = currentAssigneeIds.filter(
        (id: string) => !newAssigneeIds.includes(id)
      );

      // Remove old assignees
      if (removedAssignees.length > 0) {
        await client.query(
          'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = ANY($2)',
          [taskId, removedAssignees]
        );
      }

      // Add new assignees and notify them
      for (const assigneeId of addedAssignees) {
        await client.query(
          'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
          [taskId, assigneeId]
        );

        // Create notification
        await createNotification(
          assigneeId,
          'Task Assigned',
          `You have been assigned to task: ${task.title}`,
          taskId
        );
      }
    }

    // Get final assignee list
    const assigneeResult = await client.query(
      `SELECT u.id, u.email, u.full_name 
       FROM users u
       JOIN task_assignees ta ON ta.user_id = u.id
       WHERE ta.task_id = $1`,
      [taskId]
    );

    assignees = assigneeResult.rows;
  });

  return {
    ...task!,
    assignees,
  };
}

/**
 * Delete task
 */
export async function deleteTask(taskId: string): Promise<void> {
  await query('DELETE FROM tasks WHERE id = $1', [taskId]);
}

/**
 * Get tasks assigned to a user
 */
export async function getUserTasks(userId: string): Promise<TaskWithAssignees[]> {
  const result = await query(
    `SELECT DISTINCT t.* 
     FROM tasks t
     JOIN task_assignees ta ON ta.task_id = t.id
     WHERE ta.user_id = $1
     ORDER BY t.created_at DESC`,
    [userId]
  );

  const tasks: TaskWithAssignees[] = [];

  for (const task of result.rows) {
    const assigneesResult = await query(
      `SELECT u.id, u.email, u.full_name 
       FROM users u
       JOIN task_assignees ta ON ta.user_id = u.id
       WHERE ta.task_id = $1`,
      [task.id]
    );

    tasks.push({
      ...task,
      assignees: assigneesResult.rows,
    });
  }

  return tasks;
}
