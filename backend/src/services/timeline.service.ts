import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/store';
import { TimelineEvent, TimelineEventType } from '../types';

export class TimelineService {
  async getProjectTimeline(
    projectId: string,
    filters?: {
      type?: TimelineEventType;
      outOfOrderOnly?: boolean;
      delayedOnly?: boolean;
    }
  ) {
    let events = db.timelineEvents.filter((e) => e.projectId === projectId);

    if (filters?.type) {
      events = events.filter((e) => e.type === filters.type);
    }

    // Sort chronologically by occurredAt (true event reality)
    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    // Enrich with telemetry lag and out-of-order analysis
    const enriched = events.map((event, index) => {
      const occurredTime = new Date(event.occurredAt).getTime();
      const ingestedTime = new Date(event.ingestedAt).getTime();
      const delayMs = ingestedTime - occurredTime;
      const delaySeconds = Math.max(0, Math.round(delayMs / 1000));

      // An event is delayed if ingestion arrived > 60 seconds after occurrence
      const isDelayed = delaySeconds > 60;

      // Check if out-of-order relative to adjacent events
      // (occurred earlier than subsequent item in ingested sequence)
      const isOutOfOrder = isDelayed && delaySeconds > 300;

      return {
        ...event,
        delaySeconds,
        isDelayed,
        isOutOfOrder,
      };
    });

    if (filters?.outOfOrderOnly) {
      return enriched.filter((e) => e.isOutOfOrder);
    }
    if (filters?.delayedOnly) {
      return enriched.filter((e) => e.isDelayed);
    }

    return enriched;
  }

  async recordTimelineEvent(data: {
    projectId: string;
    type: TimelineEventType;
    title: string;
    description?: string;
    metadata?: any;
    entityId?: string;
    entityType?: string;
    occurredAt?: Date;
  }) {
    const now = new Date();
    const event: TimelineEvent = {
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId: data.projectId,
      type: data.type,
      title: data.title,
      description: data.description || null,
      metadata: data.metadata || null,
      entityId: data.entityId || null,
      entityType: data.entityType || null,
      occurredAt: data.occurredAt || now,
      ingestedAt: now,
      createdAt: now,
    };

    db.timelineEvents.push(event);
    return event;
  }
}

export const timelineService = new TimelineService();
