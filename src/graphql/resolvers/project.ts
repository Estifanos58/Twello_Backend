import * as projectService from '../../services/projectService';
import * as workspaceService from '../../services/workspaceService';
import * as taskService from '../../services/taskService';

export const projectFieldResolvers = {
  Project: {
    workspaceId(parent: any) {
      return parent.workspace_id;
    },
    createdBy(parent: any) {
      return parent.created_by;
    },
    createdAt(parent: any) {
      return parent.created_at;
    },
    updatedAt(parent: any) {
      return parent.updated_at;
    },
    async members(parent: any) {
      // Get members for this project
      const project = await projectService.getProjectById(parent.id);
      return project ? project.members : [];
    },
    async workspace(parent: any) {
      return await workspaceService.getWorkspaceById(parent.workspace_id);
    },
    async tasks(parent: any) {
      return await taskService.getProjectTasks(parent.id);
    },
  },
  ProjectMembership: {
    addedAt(parent: any) {
      return parent.added_at;
    },
  },
};
