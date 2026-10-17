'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { InvestigationWorkspace } from '@/components/investigation/InvestigationWorkspace';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

export default function IncidentWorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;
  const incidentId = params.incidentId as string;

  const [incident, setIncident] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [incRes, membersRes] = await Promise.all([
        api.getIncident(incidentId),
        api.getProjectMembers(projectId),
      ]);

      if (incRes.incident) setIncident(incRes.incident);
      if (membersRes?.members) {
        const eligibleUsers = membersRes.members.map((m: any) => m.user).filter(Boolean);
        // If current assignee exists and isn't in eligible list, include them to preserve existing assignment
        if (incRes?.incident?.assignedTo && !eligibleUsers.some((u: any) => u.id === incRes.incident.assignedTo.id)) {
          eligibleUsers.unshift(incRes.incident.assignedTo);
        }
        setUsers(eligibleUsers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) loadData();
  }, [incidentId]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <Link
          href={`/projects/${projectId}/incidents`}
          className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Incidents</span>
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-md" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-96 lg:col-span-2 rounded-md" />
              <Skeleton className="h-96 rounded-md" />
            </div>
          </div>
        ) : !incident ? (
          <div className="p-8 text-center text-xs text-foreground-muted">
            Incident not found or access denied.
          </div>
        ) : (
          <InvestigationWorkspace
            incident={incident}
            onRefresh={loadData}
            users={users}
            projectId={projectId}
          />
        )}
      </div>
    </AppLayout>
  );
}
