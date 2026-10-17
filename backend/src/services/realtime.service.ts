import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RealtimeEvent {
  type: string;
  projectId: string;
  timestamp: string;
  payload?: any;
}

interface SseClient {
  id: string;
  userId: string;
  res: Response;
}

export class RealtimeService {
  // Map of projectId -> Set of SseClient
  private projectClients = new Map<string, Set<SseClient>>();

  /**
   * Subscribes an authenticated client to receive real-time SSE updates for a specific project workspace.
   */
  subscribe(projectId: string, userId: string, res: Response): () => void {
    const clientId = `client_${uuidv4().substring(0, 8)}`;

    // Set standard SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const client: SseClient = { id: clientId, userId, res };

    if (!this.projectClients.has(projectId)) {
      this.projectClients.set(projectId, new Set());
    }
    const clients = this.projectClients.get(projectId)!;
    clients.add(client);

    // Send initial connection confirmation
    this.sendSseMessage(res, {
      type: 'CONNECTED',
      projectId,
      clientId,
      timestamp: new Date().toISOString(),
    });

    // Heartbeat ping every 15 seconds to keep intermediary proxies from closing idle connections
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeatInterval);
        this.unsubscribe(projectId, client);
      }
    }, 15000);

    const cleanup = () => {
      clearInterval(heartbeatInterval);
      this.unsubscribe(projectId, client);
    };

    res.on('close', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);

    return cleanup;
  }

  private unsubscribe(projectId: string, client: SseClient): void {
    const clients = this.projectClients.get(projectId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.projectClients.delete(projectId);
      }
    }
  }

  /**
   * Broadcasts an operational or incident event to all connected clients authorized for this project.
   */
  publish(projectId: string, event: { type: string; [key: string]: any }): void {
    const clients = this.projectClients.get(projectId);
    if (!clients || clients.size === 0) {
      return;
    }

    const sseEvent: RealtimeEvent = {
      type: event.type,
      projectId,
      timestamp: new Date().toISOString(),
      payload: { ...event },
    };

    for (const client of Array.from(clients)) {
      try {
        this.sendSseMessage(client.res, sseEvent);
      } catch {
        this.unsubscribe(projectId, client);
      }
    }
  }

  private sendSseMessage(res: Response, data: any): void {
    const eventId = `evt_${uuidv4().substring(0, 8)}`;
    res.write(`id: ${eventId}\n`);
    res.write(`event: message\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Returns active client count for a project workspace.
   */
  getActiveClientCount(projectId: string): number {
    return this.projectClients.get(projectId)?.size || 0;
  }
}

export const realtimeService = new RealtimeService();
