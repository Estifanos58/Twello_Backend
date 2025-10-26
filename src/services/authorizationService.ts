import { query } from '../db/pool.js';

export type WorkspaceRole = 'OWNER' | 'MEMBER' | 'VIEWER';
export type ProjectRole = 'LEAD' | 'CONTRIBUTOR' | 'VIEWER';
export type GlobalRole = 'USER' | 'ADMIN';

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface ProjectMembership {
  projectId: string;
  userId: string;
  role: ProjectRole;
}

/**
 * Check if user has a specific global role
 */
export async function hasGlobalRole(userId: string, role: GlobalRole): Promise<boolean> {
  const result = await query(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  return result.rows[0].role === role;
}

/**
 * Require user to be an admin (throws if not)
 */
export async function requireAdmin(userId: string): Promise<void> {
  const isAdmin = await hasGlobalRole(userId, 'ADMIN');
  
  if (!isAdmin) {
    throw new Error('Forbidden: Admin access required');
  }
}

/**
 * Get user's workspace membership
 */
export async function getWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<WorkspaceMembership | null> {
  const result = await query<WorkspaceMembership>(
    'SELECT workspace_id, user_id, role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  return result.rows[0] || null;
}

/**
 * Check if user is a member of workspace
 */
export async function isWorkspaceMember(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  return membership !== null;
}

/**
 * Require user to be a workspace member with specific role(s)
 */
export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  allowedRoles: WorkspaceRole[]
): Promise<WorkspaceMembership> {
  const membership = await getWorkspaceMembership(userId, workspaceId);

  if (!membership) {
    throw new Error('Forbidden: Not a workspace member');
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new Error(`Forbidden: Requires one of: ${allowedRoles.join(', ')}`);
  }

  return membership;
}

/**
 * Check if user has workspace owner role
 */
export async function isWorkspaceOwner(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  return membership?.role === 'OWNER';
}

/**
 * Get user's project membership
 */
export async function getProjectMembership(
  userId: string,
  projectId: string
): Promise<ProjectMembership | null> {
  const result = await query<ProjectMembership>(
    'SELECT project_id, user_id, role FROM project_memberships WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );

  return result.rows[0] || null;
}

/**
 * Check if user is a member of project
 */
export async function isProjectMember(
  userId: string,
  projectId: string
): Promise<boolean> {
  const membership = await getProjectMembership(userId, projectId);
  return membership !== null;
}

/**
 * Require user to be a project member with specific role(s)
 */
export async function requireProjectRole(
  userId: string,
  projectId: string,
  allowedRoles: ProjectRole[]
): Promise<ProjectMembership> {
  const membership = await getProjectMembership(userId, projectId);

  if (!membership) {
    throw new Error('Forbidden: Not a project member');
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new Error(`Forbidden: Requires one of: ${allowedRoles.join(', ')}`);
  }

  return membership;
}

/**
 * Check if user can access project (either project member or workspace member)
 */
export async function canAccessProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  // Check if user is project member
  const projectMember = await isProjectMember(userId, projectId);
  if (projectMember) {
    return true;
  }

  // Check if user is workspace member (workspace members can see all projects)
  const result = await query(
    `SELECT wm.role FROM workspace_members wm
     JOIN projects p ON p.workspace_id = wm.workspace_id
     WHERE p.id = $1 AND wm.user_id = $2`,
    [projectId, userId]
  );

  return result.rows.length > 0;
}

/**
 * Require user to have access to project
 */
export async function requireProjectAccess(
  userId: string,
  projectId: string
): Promise<void> {
  const hasAccess = await canAccessProject(userId, projectId);

  if (!hasAccess) {
    throw new Error('Forbidden: No access to this project');
  }
}

/**
 * Get workspace ID from project ID
 */
export async function getWorkspaceIdFromProject(projectId: string): Promise<string> {
  const result = await query(
    'SELECT workspace_id FROM projects WHERE id = $1',
    [projectId]
  );

  if (result.rows.length === 0) {
    throw new Error('Project not found');
  }

  return result.rows[0].workspace_id;
}

/**
 * Get workspace ID from task ID
 */
export async function getWorkspaceIdFromTask(taskId: string): Promise<string> {
  const result = await query(
    `SELECT p.workspace_id FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.id = $1`,
    [taskId]
  );

  if (result.rows.length === 0) {
    throw new Error('Task not found');
  }

  return result.rows[0].workspace_id;
}

/**
 * Check if user can modify task (creator, project lead/contributor, or workspace owner/member)
 */
export async function canModifyTask(
  userId: string,
  taskId: string
): Promise<boolean> {
  const result = await query(
    `SELECT 
       t.created_by,
       t.project_id,
       p.workspace_id,
       pm.role as project_role,
       wm.role as workspace_role
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN project_memberships pm ON pm.project_id = t.project_id AND pm.user_id = $2
     LEFT JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
     WHERE t.id = $1`,
    [taskId, userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const task = result.rows[0];

  // Task creator can always modify
  if (task.created_by === userId) {
    return true;
  }

  // Project leads and contributors can modify
  if (task.project_role && ['LEAD', 'CONTRIBUTOR'].includes(task.project_role)) {
    return true;
  }

  // Workspace owners and members can modify
  if (task.workspace_role && ['OWNER', 'MEMBER'].includes(task.workspace_role)) {
    return true;
  }

  return false;
}

/**
 * Require user to be able to modify task
 */
export async function requireTaskModifyPermission(
  userId: string,
  taskId: string
): Promise<void> {
  const canModify = await canModifyTask(userId, taskId);

  if (!canModify) {
    throw new Error('Forbidden: Cannot modify this task');
  }
}

/**
 * Check if user is the only owner of workspace
 */
export async function isOnlyWorkspaceOwner(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(*) as owner_count FROM workspace_members 
     WHERE workspace_id = $1 AND role = 'OWNER'`,
    [workspaceId]
  );

  const ownerCount = parseInt(result.rows[0].owner_count, 10);
  
  if (ownerCount !== 1) {
    return false;
  }

  // Check if the only owner is this user
  const ownerResult = await query(
    `SELECT user_id FROM workspace_members 
     WHERE workspace_id = $1 AND role = 'OWNER'`,
    [workspaceId]
  );

  return ownerResult.rows[0]?.user_id === userId;
}

/**
 * Prevent demoting the last workspace owner
 */
export async function validateWorkspaceOwnerChange(
  workspaceId: string,
  userId: string,
  newRole: WorkspaceRole
): Promise<void> {
  if (newRole === 'OWNER') {
    return; // Promoting to owner is always okay
  }

  const isOnly = await isOnlyWorkspaceOwner(userId, workspaceId);

  if (isOnly) {
    throw new Error('Cannot demote the only workspace owner. Promote another user to owner first.');
  }
}
