import { Router, Request, Response } from 'express';
import { deploymentService } from '../services/deployment.service';
import { authenticate } from '../middleware/auth';
import { requireProjectRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createDeploymentSchema, updateDeploymentStatusSchema } from '../validators';

const router = Router();

// List deployments for project
router.get('/projects/:projectId/deployments', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const { environment, status } = req.query;
    const deployments = await deploymentService.listDeployments(req.params.projectId, {
      environment: environment as any,
      status: status as any,
    });
    res.json({ success: true, deployments });
  } catch (err) {
    next(err);
  }
});

// Create deployment
router.post('/projects/:projectId/deployments', authenticate, requireProjectRole('DEVELOPER'), validate(createDeploymentSchema), async (req: Request, res: Response, next) => {
  try {
    const deployment = await deploymentService.createDeployment(req.user!.id, req.params.projectId, req.body);
    res.status(201).json({ success: true, deployment });
  } catch (err) {
    next(err);
  }
});

// Get deployment detail
router.get('/deployments/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    const deployment = await deploymentService.getDeployment(req.params.id);
    res.json({ success: true, deployment });
  } catch (err) {
    next(err);
  }
});

// Update deployment status (status transition with audit)
router.patch('/deployments/:id/status', authenticate, validate(updateDeploymentStatusSchema), async (req: Request, res: Response, next) => {
  try {
    const deployment = await deploymentService.updateDeploymentStatus(req.user!.id, req.params.id, req.body.status, req.body.note);
    res.json({ success: true, deployment });
  } catch (err) {
    next(err);
  }
});

// Status history
router.get('/deployments/:id/history', authenticate, async (req: Request, res: Response, next) => {
  try {
    const deployment = await deploymentService.getDeployment(req.params.id);
    res.json({ success: true, history: deployment.statusHistory });
  } catch (err) {
    next(err);
  }
});

export default router;
