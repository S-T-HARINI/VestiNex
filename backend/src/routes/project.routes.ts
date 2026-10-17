import { Router, Request, Response } from 'express';
import { projectService } from '../services/project.service';
import { timelineService } from '../services/timeline.service';
import { dashboardService } from '../services/dashboard.service';
import { realtimeService } from '../services/realtime.service';
import { auditService } from '../services/audit.service';
import { authenticate } from '../middleware/auth';
import { requireProjectRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema, addMemberSchema, updateMemberRoleSchema } from '../validators';

const router = Router();

// List accessible projects
router.get('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const projects = await projectService.listProjects(req.user!.id);
    res.json({ success: true, projects });
  } catch (err) {
    next(err);
  }
});

// Create project
router.post('/', authenticate, validate(createProjectSchema), async (req: Request, res: Response, next) => {
  try {
    const project = await projectService.createProject(req.user!.id, req.body);
    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
});

// Get project details
router.get('/:id', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const project = await projectService.getProject(req.user!.id, req.params.id as string);
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
});

// Update project
router.patch('/:id', authenticate, requireProjectRole('ADMIN'), validate(updateProjectSchema), async (req: Request, res: Response, next) => {
  try {
    const project = await projectService.updateProject(req.user!.id, req.params.id as string, req.body);
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
});

// Archive project
router.post('/:id/archive', authenticate, requireProjectRole('OWNER'), async (req: Request, res: Response, next) => {
  try {
    const project = await projectService.archiveProject(req.user!.id, req.params.id as string);
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
});

// Get members
router.get('/:id/members', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const members = await projectService.getMembers(req.params.id as string);
    res.json({ success: true, members });
  } catch (err) {
    next(err);
  }
});

// Add member
router.post('/:id/members', authenticate, requireProjectRole('ADMIN'), validate(addMemberSchema), async (req: Request, res: Response, next) => {
  try {
    const member = await projectService.addMember(req.user!.id, req.params.id as string, req.body.email, req.body.role);
    res.status(201).json({ success: true, member });
  } catch (err) {
    next(err);
  }
});

// Update member role
router.patch('/:id/members/:userId', authenticate, requireProjectRole('OWNER'), validate(updateMemberRoleSchema), async (req: Request, res: Response, next) => {
  try {
    const member = await projectService.updateMemberRole(req.user!.id, req.params.id as string, req.params.userId as string, req.body.role);
    res.json({ success: true, member });
  } catch (err) {
    next(err);
  }
});

// Remove member
router.delete('/:id/members/:userId', authenticate, requireProjectRole('ADMIN'), async (req: Request, res: Response, next) => {
  try {
    const result = await projectService.removeMember(req.user!.id, req.params.id as string, req.params.userId as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Project Unified Timeline
router.get('/:id/timeline', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const { type, outOfOrderOnly, delayedOnly } = req.query;
    const events = await timelineService.getProjectTimeline(req.params.id as string, {
      type: type as any,
      outOfOrderOnly: outOfOrderOnly === 'true',
      delayedOnly: delayedOnly === 'true',
    });
    res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
});

// Project Dashboard Metrics
router.get('/:id/dashboard', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const data = await dashboardService.getProjectDashboard(req.params.id as string);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// Real-Time Server-Sent Events (SSE) stream for project workspace
router.get('/:id/events', authenticate, requireProjectRole('VIEWER'), (req: Request, res: Response) => {
  realtimeService.subscribe(req.params.id as string, req.user!.id, res);
  if (req.query.once === 'true') {
    res.end();
  }
});

// Project-scoped audit logs
router.get('/:id/audit', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const { entityType, entityId } = req.query;
    const logs = await auditService.listByProject(req.user!.id, req.params.id as string, {
      entityType: entityType as string,
      entityId: entityId as string,
    });
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

export default router;
