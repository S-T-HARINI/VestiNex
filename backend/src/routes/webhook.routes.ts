import { Router, Request, Response } from 'express';
import { webhookService } from '../services/webhook.service';

const router = Router();

/**
 * POST /api/webhooks/github
 * Receives incoming GitHub webhook events, verifies cryptographic signature,
 * deduplicates deliveries, and routes payload to the appropriate processing pipeline.
 */
router.post('/github', async (req: Request, res: Response, next) => {
  try {
    const eventType = (req.headers['x-github-event'] as string) || '';
    const deliveryId = (req.headers['x-github-delivery'] as string) || '';
    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;

    if (!eventType) {
      res.status(400).json({ success: false, error: 'Missing X-GitHub-Event header' });
      return;
    }

    if (!deliveryId) {
      res.status(400).json({ success: false, error: 'Missing X-GitHub-Delivery header' });
      return;
    }

    // Cryptographic signature verification
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const isValidSignature = webhookService.verifySignature(rawBody, signatureHeader, webhookSecret);
    if (!isValidSignature) {
      res.status(401).json({ success: false, error: 'Invalid or missing GitHub webhook signature' });
      return;
    }

    // Database-level deduplication: avoid processing duplicate delivery
    const alreadyProcessed = await webhookService.isDeliveryProcessed(deliveryId);
    if (alreadyProcessed) {
      res.status(200).json({
        success: true,
        deduplicated: true,
        deliveryId,
        message: 'Webhook delivery already processed (deduplicated).',
      });
      return;
    }

    let result;
    switch (eventType) {
      case 'push':
        result = await webhookService.processPushEvent(deliveryId, req.body);
        break;
      case 'deployment':
        result = await webhookService.processDeploymentEvent(deliveryId, req.body);
        break;
      case 'deployment_status':
        result = await webhookService.processDeploymentStatusEvent(deliveryId, req.body);
        break;
      case 'ping':
        result = await webhookService.processPingEvent(deliveryId, req.body);
        break;
      default:
        await webhookService.recordDelivery(deliveryId, eventType, null, 'IGNORED_UNSUPPORTED_TYPE');
        result = {
          success: true,
          event: eventType,
          deliveryId,
          message: `Event type '${eventType}' received and acknowledged safely without processing.`,
        };
        break;
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
