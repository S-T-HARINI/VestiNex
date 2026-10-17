// API Base URL - empty string routes through Next.js rewrites to Express backend
const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  issues?: any[];

  constructor(message: string, status: number, issues?: any[]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends cookies
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'An error occurred', res.status, data.issues);
  }

  return data;
}

function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      clean[k] = String(v);
    }
  }
  const q = new URLSearchParams(clean).toString();
  return q ? `?${q}` : '';
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  getMe: () => request<any>('/auth/me'),
  updateProfile: (data: any) => request<any>(`/auth/profile`, { method: 'PATCH', body: JSON.stringify(data) }),
  getUsers: () => request<any>('/auth/users'),

  // Projects
  getProjects: () => request<any>('/projects'),
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) => request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archiveProject: (id: string) => request<any>(`/projects/${id}/archive`, { method: 'POST' }),
  getProjectMembers: (id: string) => request<any>(`/projects/${id}/members`),
  addProjectMember: (id: string, data: any) => request<any>(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
  updateProjectMemberRole: (projectId: string, userId: string, role: string) =>
    request<any>(`/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeProjectMember: (projectId: string, userId: string) =>
    request<any>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),

  // Deployments
  getDeployments: (projectId: string, filters?: { environment?: string; status?: string }) => {
    return request<any>(`/projects/${projectId}/deployments${toQueryString(filters)}`);
  },
  getDeployment: (id: string) => request<any>(`/deployments/${id}`),
  createDeployment: (projectId: string, data: any) => request<any>(`/projects/${projectId}/deployments`, { method: 'POST', body: JSON.stringify(data) }),
  updateDeploymentStatus: (id: string, status: string, note?: string) =>
    request<any>(`/deployments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),

  // Code Changes
  getCodeChanges: (projectId: string) => request<any>(`/projects/${projectId}/code-changes`),
  getCodeChange: (id: string) => request<any>(`/code-changes/${id}`),
  recordCodeChange: (projectId: string, data: any) => request<any>(`/projects/${projectId}/code-changes`, { method: 'POST', body: JSON.stringify(data) }),
  syncCodeChanges: (projectId: string) => request<any>(`/projects/${projectId}/code-changes/sync`, { method: 'POST' }),

  // Incidents
  getIncidents: (projectId: string, filters?: { severity?: string; status?: string }) => {
    return request<any>(`/projects/${projectId}/incidents${toQueryString(filters)}`);
  },
  getIncident: (id: string) => request<any>(`/incidents/${id}`),
  createIncident: (projectId: string, data: any) => request<any>(`/projects/${projectId}/incidents`, { method: 'POST', body: JSON.stringify(data) }),
  updateIncident: (id: string, data: any) => request<any>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateIncidentStatus: (id: string, status: string, note?: string, resolutionNote?: string) =>
    request<any>(`/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note, resolutionNote }) }),
  assignIncident: (id: string, assignedToId: string | null) =>
    request<any>(`/incidents/${id}/assign`, { method: 'POST', body: JSON.stringify({ assignedToId }) }),
  linkDeployment: (id: string, deploymentId: string, confidence: string, note?: string) =>
    request<any>(`/incidents/${id}/link-deployment`, { method: 'POST', body: JSON.stringify({ deploymentId, confidence, note }) }),
  unlinkDeployment: (id: string, deploymentId: string) =>
    request<any>(`/incidents/${id}/link-deployment/${deploymentId}`, { method: 'DELETE' }),
  addComment: (id: string, content: string) =>
    request<any>(`/incidents/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Timeline & Dashboard
  getProjectTimeline: (projectId: string, filters?: { type?: string; outOfOrderOnly?: boolean; delayedOnly?: boolean }) => {
    return request<any>(`/projects/${projectId}/timeline${toQueryString(filters)}`);
  },
  getProjectDashboard: (projectId: string) => request<any>(`/projects/${projectId}/dashboard`),
  getGlobalOverview: () => request<any>('/dashboard/overview'),
  getAuditLogs: (filters?: { entityType?: string; entityId?: string }) => {
    return request<any>(`/dashboard/audit${toQueryString(filters)}`);
  },
  getProjectAuditLogs: (projectId: string, filters?: { entityType?: string; entityId?: string }) => {
    return request<any>(`/projects/${projectId}/audit${toQueryString(filters)}`);
  },
};
