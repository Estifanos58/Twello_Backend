import { query, transaction } from '../db/pool.js';
import { logWorkspaceCreated } from './loggingService.js';
import type { WorkspaceRole } from './authorizationService.js';

export interface Workspace {
  id: string;
  name: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  added_at: Date;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
  name: string,
  creatorId: string
): Promise<Workspace> {
  let workspace: Workspace;

  await transaction(async (client) => {
    // Create workspace
    const workspaceResult = await client.query<Workspace>(
      `INSERT INTO workspaces (name, created_by) 
       VALUES ($1, $2) 
       RETURNING *`,
      [name, creatorId]
    );

    workspace = workspaceResult.rows[0];

    // Add creator as owner
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) 
       VALUES ($1, $2, 'OWNER')`,
      [workspace.id, creatorId]
    );
  });

  logWorkspaceCreated(creatorId, workspace!.id, name);

  return workspace!;
}

/**
 * Get workspace by ID with members
 */
export async function getWorkspaceById(workspaceId: string): Promise<Workspace & { members: WorkspaceMember[] } | null> {
  const workspaceResult = await query<Workspace>(
    'SELECT * FROM workspaces WHERE id = $1',
    [workspaceId]
  );

  if (workspaceResult.rows.length === 0) {
    return null;
  }

  const workspace = workspaceResult.rows[0];

  // Get members
  const membersResult = await query<WorkspaceMember & { email: string; full_name: string | null }>(
    `SELECT wm.*, u.email, u.full_name 
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1`,
    [workspaceId]
  );

  const members = membersResult.rows.map((m) => ({
    workspace_id: m.workspace_id,
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
    ...workspace,
    members,
  };
}

/**
 * Get all workspaces (admin only)
 */
export async function getAllWorkspaces(): Promise<Workspace[]> {
  const result = await query<Workspace>(
    'SELECT * FROM workspaces ORDER BY created_at DESC'
  );

  return result.rows;
}

/**
 * Get workspaces for a user
 */
export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const result = await query<Workspace>(
    `SELECT w.* FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id
     WHERE wm.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Add member to workspace
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<void> {
  await query(
    `INSERT INTO workspace_members (workspace_id, user_id, role) 
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id) DO NOTHING`,
    [workspaceId, userId, role]
  );
}

/**
 * Remove member from workspace
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  await transaction(async (client) => {
    // Remove from workspace
    await client.query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    // Remove from all projects in workspace
    await client.query(
      `DELETE FROM project_memberships 
       WHERE user_id = $1 AND project_id IN (
         SELECT id FROM projects WHERE workspace_id = $2
       )`,
      [userId, workspaceId]
    );
  });
}

/**
 * Update workspace member role
 */
export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<void> {
  await query(
    `UPDATE workspace_members 
     SET role = $3 
     WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId, role]
  );
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  // Cascade delete will handle related records
  await query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
}
