import { Router, Request, Response } from 'express';
import { incidentService } from '../services/incident.service';
import { authenticate } from '../middleware/auth';
import { requireProjectRole } from '../middleware/rbac';
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
    const incidents = await incidentService.listIncidents(req.params.projectId, {
      severity: severity as any,
      status: status as any,
    });
    res.json({ success: true, incidents });
  } catch (err) {
    next(err);
  }
});

// Create incident
router.post('/projects/:projectId/incidents', authenticate, requireProjectRole('DEVELOPER'), validate(createIncidentSchema), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.createIncident(req.user!.id, req.params.projectId, req.body);
    res.status(201).json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Get incident detail (with workspace, suggested correlations, timeline, comments)
router.get('/incidents/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.getIncident(req.params.id);
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Update incident
router.patch('/incidents/:id', authenticate, validate(updateIncidentSchema), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.updateIncident(req.user!.id, req.params.id, req.body);
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Update incident status (workflow transition)
router.patch('/incidents/:id/status', authenticate, validate(updateIncidentStatusSchema), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.updateIncidentStatus(
      req.user!.id,
      req.params.id,
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
router.post('/incidents/:id/assign', authenticate, validate(assignIncidentSchema), async (req: Request, res: Response, next) => {
  try {
    const incident = await incidentService.assignIncident(req.user!.id, req.params.id, req.body.assignedToId);
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

// Link deployment (evidence correlation)
router.post('/incidents/:id/link-deployment', authenticate, validate(linkDeploymentSchema), async (req: Request, res: Response, next) => {
  try {
    const link = await incidentService.linkDeployment(
      req.user!.id,
      req.params.id,
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
router.delete('/incidents/:id/link-deployment/:deploymentId', authenticate, async (req: Request, res: Response, next) => {
  try {
    const result = await incidentService.unlinkDeployment(req.user!.id, req.params.id, req.params.deploymentId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// List comments
router.get('/incidents/:id/comments', authenticate, async (req: Request, res: Response, next) => {
  try {
    const comments = await incidentService.getComments(req.params.id);
    res.json({ success: true, comments });
  } catch (err) {
    next(err);
  }
});

// Add comment
router.post('/incidents/:id/comments', authenticate, validate(addCommentSchema), async (req: Request, res: Response, next) => {
  try {
    const comment = await incidentService.addComment(req.user!.id, req.params.id, req.body.content);
    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
});

// Status history
router.get('/incidents/:id/history', authenticate, async (req: Request, res: Response, next) => {
  try {
    const history = await incidentService.getHistory(req.params.id);
    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
});

export default router;
