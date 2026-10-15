import { Router, Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { auditService } from '../services/audit.service';
import { authenticate } from '../middleware/auth';

const router = Router();

// Global overview stats across all user projects
router.get('/overview', authenticate, async (req: Request, res: Response, next) => {
  try {
    const stats = await dashboardService.getGlobalOverview(req.user!.id);
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});

// Audit log list
router.get('/audit', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { entityType, entityId } = req.query;
    const logs = await auditService.list({
      entityType: entityType as string,
      entityId: entityId as string,
    });
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

export default router;
