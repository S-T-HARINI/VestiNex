import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
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
    let sql = 'SELECT * FROM timeline_events WHERE project_id = $1';
    const params: any[] = [projectId];

    if (filters?.type) {
      params.push(filters.type);
      sql += ` AND type = $${params.length}`;
    }

    sql += ' ORDER BY occurred_at DESC, ingested_at DESC, id DESC;';

    const rows = await pgDb.query<any>(sql, params);

    // Compute telemetry lag & out-of-order analysis
    const enriched = rows.map((event) => {
      const occurredTime = new Date(event.occurred_at).getTime();
      const ingestedTime = new Date(event.ingested_at).getTime();
      const delayMs = ingestedTime - occurredTime;
      const delaySeconds = Math.max(0, Math.round(delayMs / 1000));

      // An event is delayed if ingestion lag exceeds 60 seconds
      const isDelayed = delaySeconds > 60;

      // An event is out-of-order if delayed significantly (>300s) relative to timeline
      const isOutOfOrder = isDelayed && delaySeconds > 300;

      return {
        id: event.id,
        projectId: event.project_id,
        type: event.type,
        title: event.title,
        description: event.description,
        metadata: event.metadata,
        entityId: event.entity_id,
        entityType: event.entity_type,
        occurredAt: event.occurred_at,
        ingestedAt: event.ingested_at,
        createdAt: event.created_at,
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
    const id = `tle_${uuidv4().substring(0, 8)}`;
    const now = new Date();
    const occurredAt = data.occurredAt || now;

    await pgDb.query(
      `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
      [
        id,
        data.projectId,
        data.type,
        data.title,
        data.description || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.entityId || null,
        data.entityType || null,
        occurredAt,
        now,
        now,
      ]
    );

    return {
      id,
      projectId: data.projectId,
      type: data.type,
      title: data.title,
      description: data.description || null,
      metadata: data.metadata || null,
      entityId: data.entityId || null,
      entityType: data.entityType || null,
      occurredAt,
      ingestedAt: now,
      createdAt: now,
    };
  }
}

export const timelineService = new TimelineService();
