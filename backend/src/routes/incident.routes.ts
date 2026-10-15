import { Router, Request, Response } from 'express';
import { incidentService } from '../services/incident.service';
import { authenticate } from '../middleware/auth';
import { requireProjectRole, requireIncidentRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createIncidentSchema,
  updateIncidentSchema,
  updateIncidentStatusSchema,
  assignIncidentSchema,
  linkDeploymentSchema,
  addCommentSchema,
} from '../validators';

const router = Router();

// List incidents for a project
router.get('/projects/:projectId/incidents', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const { severity, status } = req.query;
    const incidents = await incidentService.listIncidents(req.params.projectId as string, {
      severity: (severity && severity !== 'undefined') ? severity as any : undefined,
      status: (status && status !== 'undefined') ? status as any : undefined,
    });
    res.json({ success: true, incidents });
  } catch (err) {
    next(err);
  }
});

// Create incident
router.post('/projects/:projectId/incidents', authenticate, requireProjectRole('DEVELOPER'), validate(createIncidentSchema), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.createIncident(req.user!.id, req.params.projectId as string, req.body);
    res.status(201).json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Get incident detail (with workspace, suggested correlations, timeline, comments)
router.get('/incidents/:id', authenticate, requireIncidentRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.getIncident(req.params.id as string);
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Update incident
router.patch('/incidents/:id', authenticate, requireIncidentRole('DEVELOPER'), validate(updateIncidentSchema), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.updateIncident(req.user!.id, req.params.id as string, req.body);
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Update incident status (workflow transition)
router.patch('/incidents/:id/status', authenticate, requireIncidentRole('DEVELOPER'), validate(updateIncidentStatusSchema), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.updateIncidentStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status,
      req.body.note,
      req.body.resolutionNote
    );
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Assign incident
router.post('/incidents/:id/assign', authenticate, requireIncidentRole('DEVELOPER'), validate(assignIncidentSchema), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.assignIncident(req.user!.id, req.params.id as string, req.body.assignedToId);
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Link deployment (evidence correlation)
router.post('/incidents/:id/link-deployment', authenticate, requireIncidentRole('DEVELOPER'), validate(linkDeploymentSchema), async (req: Request, res: Response, next) => {
  try {
    const link = await incidentService.linkDeployment(
      req.user!.id,
      req.params.id as string,
      req.body.deploymentId,
      req.body.confidence,
      req.body.note
    );
    res.json({ success: true, link });
  } catch (err) {
    next(err);
  }
});

// Unlink deployment
router.delete('/incidents/:id/link-deployment/:deploymentId', authenticate, requireIncidentRole('DEVELOPER'), async (req: Request, res: Response, next) => {
  try {
    const result = await incidentService.unlinkDeployment(req.user!.id, req.params.id as string, req.params.deploymentId as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// List comments
router.get('/incidents/:id/comments', authenticate, requireIncidentRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const comments = await incidentService.getComments(req.params.id as string);
    res.json({ success: true, comments });
  } catch (err) {
    next(err);
  }
});

// Add comment
router.post('/incidents/:id/comments', authenticate, requireIncidentRole('DEVELOPER'), validate(addCommentSchema), async (req: Request, res: Response, next) => {
  try {
    const comment = await incidentService.addComment(req.user!.id, req.params.id as string, req.body.content);
    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
});

// Status history
router.get('/incidents/:id/history', authenticate, requireIncidentRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const history = await incidentService.getHistory(req.params.id as string);
    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
});

export default router;
