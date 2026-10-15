import { Request, Response, NextFunction } from 'express';
import { db } from '../lib/store';
import { ProjectRole } from '../types';

export const requireSystemRole = (role: 'ADMIN') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ success: false, error: 'System administrator privileges required' });
      return;
    }
    next();
  };
};

const roleHierarchy: Record<ProjectRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  DEVELOPER: 2,
  VIEWER: 1,
};

export const requireProjectRole = (minimumRole: ProjectRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // System ADMIN has implicit full access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) {
      res.status(400).json({ success: false, error: 'Project ID is missing from request context' });
      return;
    }

    const userRole = db.getProjectMemberRole(req.user.id, projectId);
    if (!userRole) {
      res.status(403).json({
        success: false,
        error: 'Access denied: You are not a member of this project.',
      });
      return;
    }

    if (roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
      res.status(403).json({
        success: false,
        error: `Insufficient permissions. Requires minimum role: ${minimumRole}. Your role: ${userRole}.`,
      });
      return;
    }

    next();
  };
};
