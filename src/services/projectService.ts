import { query, transaction } from '../db/pool.js';
import { logProjectCreated } from './loggingService.js';
import type { ProjectRole } from './authorizationService.js';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: ProjectRole;
  added_at: Date;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

/**
 * Create a new project
 */
export async function createProject(
  workspaceId: string,
  name: string,
  creatorId: string,
  description?: string
): Promise<Project> {
  let project: Project;

  await transaction(async (client) => {
    // Create project
    const projectResult = await client.query<Project>(
      `INSERT INTO projects (workspace_id, name, description, created_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [workspaceId, name, description || null, creatorId]
    );

    project = projectResult.rows[0];

    // Add creator as project lead
    await client.query(
      `INSERT INTO project_memberships (project_id, user_id, role) 
       VALUES ($1, $2, 'LEAD')`,
      [project.id, creatorId]
    );
  });

  logProjectCreated(creatorId, project!.id, workspaceId, name);

  return project!;
}

/**
 * Get project by ID with members
 */
export async function getProjectById(
  projectId: string
): Promise<(Project & { members: ProjectMember[] }) | null> {
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1',
    [projectId]
  );

  if (projectResult.rows.length === 0) {
    return null;
  }

  const project = projectResult.rows[0];

  // Get members
  const membersResult = await query(
    `SELECT pm.*, u.email, u.full_name 
     FROM project_memberships pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1`,
    [projectId]
  );

  const members = membersResult.rows.map((m: any) => ({
    project_id: m.project_id,
    user_id: m.user_id,
    role: m.role,
    added_at: m.added_at,
    user: {
      id: m.user_id,
      email: m.email,
      full_name: m.full_name,
    },
  }));

  return {
    ...project,
    members,
  };
}

/**
 * Get projects in a workspace
 */
export async function getWorkspaceProjects(workspaceId: string): Promise<Project[]> {
  const result = await query<Project>(
    'SELECT * FROM projects WHERE workspace_id = $1 ORDER BY created_at DESC',
    [workspaceId]
  );

  return result.rows;
}

/**
 * Update project
 */
export async function updateProject(
  projectId: string,
  updates: { name?: string; description?: string }
): Promise<Project> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  setClauses.push(`updated_at = now()`);
  values.push(projectId);

  const result = await query<Project>(
    `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Delete project
 */
export async function deleteProject(projectId: string): Promise<void> {
  await query('DELETE FROM projects WHERE id = $1', [projectId]);
}

/**
 * Add member to project
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<void> {
  // The trigger will ensure user is a workspace member
  await query(
    `INSERT INTO project_memberships (project_id, user_id, role) 
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) DO NOTHING`,
    [projectId, userId, role]
  );
}

/**
 * Remove member from project
 */
export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<void> {
  await query(
    'DELETE FROM project_memberships WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
}

/**
 * Update project member role
 */
export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<void> {
  await query(
    `UPDATE project_memberships 
     SET role = $3 
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId, role]
  );
}
