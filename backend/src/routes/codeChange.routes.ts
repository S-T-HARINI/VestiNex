import { Router, Request, Response } from 'express';
import { codeChangeService } from '../services/codeChange.service';
import { authenticate } from '../middleware/auth';
import { requireProjectRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createCodeChangeSchema } from '../validators';

const router = Router();

// List code changes for a project
router.get('/projects/:projectId/code-changes', authenticate, requireProjectRole('VIEWER'), async (req: Request, res: Response, next) => {
  try {
    const codeChanges = await codeChangeService.listCodeChanges(req.params.projectId);
    res.json({ success: true, codeChanges });
  } catch (err) {
    next(err);
  }
});

// Record code change
router.post('/projects/:projectId/code-changes', authenticate, requireProjectRole('DEVELOPER'), validate(createCodeChangeSchema), async (req: Request, res: Response, next) => {
  try {
    const codeChange = await codeChangeService.recordCodeChange(req.user!.id, req.params.projectId, req.body);
    res.status(201).json({ success: true, codeChange });
  } catch (err) {
    next(err);
  }
});

// Get code change detail
router.get('/code-changes/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    const codeChange = await codeChangeService.getCodeChange(req.params.id);
    res.json({ success: true, codeChange });
  } catch (err) {
    next(err);
  }
});

export default router;
