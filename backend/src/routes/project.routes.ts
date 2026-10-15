import { Router, Request, Response } from 'express';
import { projectService } from '../services/project.service';
import { timelineService } from '../services/timeline.service';
import { dashboardService } from '../services/dashboard.service';
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
    const project = await projectService.getProject(req.user!.id, req.params.id);
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
});

// Update project
router.patch('/:id', authenticate, requireProjectRole('ADMIN'), validate(updateProjectSchema), async (req: Request, res: Response, next) => {
  try {
    const project = await projectService.updateProject(req.user!.id, req.params.id, req.body);
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
});

// Archive project
router.post('/:id/archive', authenticate, requireProjectRole('OWNER'), async (req: Request, res: Response, next) => {
  try {
    const project = await projectService.archiveProject(req.user!.id, req.params.id);
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
});

// Get members
router.get('/:id/members', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const members = await projectService.getMembers(req.params.id);
    res.json({ success: true, members });
  } catch (err) {
    next(err);
  }
});

// Add member
router.post('/:id/members', authenticate, requireProjectRole('ADMIN'), validate(addMemberSchema), async (req: Request, res: Response, next) => {
  try {
    const member = await projectService.addMember(req.user!.id, req.params.id, req.body.email, req.body.role);
    res.status(201).json({ success: true, member });
  } catch (err) {
    next(err);
  }
});

// Update member role
router.patch('/:id/members/:userId', authenticate, requireProjectRole('OWNER'), validate(updateMemberRoleSchema), async (req: Request, res: Response, next) => {
  try {
    const member = await projectService.updateMemberRole(req.user!.id, req.params.id, req.params.userId, req.body.role);
    res.json({ success: true, member });
  } catch (err) {
    next(err);
  }
});

// Remove member
router.delete('/:id/members/:userId', authenticate, requireProjectRole('ADMIN'), async (req: Request, res: Response, next) => {
  try {
    const result = await projectService.removeMember(req.user!.id, req.params.id, req.params.userId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Project Unified Timeline
router.get('/:id/timeline', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const { type, outOfOrderOnly, delayedOnly } = req.query;
    const events = await timelineService.getProjectTimeline(req.params.id, {
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
    const data = await dashboardService.getProjectDashboard(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

export default router;
