import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { parseGitHubRepoUrl, codeChangeService } from '../src/services/codeChange.service';
import { pgDb } from '../src/lib/postgres';

describe('GitHub Commit Ingestion & SSRF Security', () => {
  describe('parseGitHubRepoUrl', () => {
    it('correctly parses standard GitHub repository URLs', () => {
      expect(parseGitHubRepoUrl('https://github.com/expressjs/express.git')).toEqual({
        owner: 'expressjs',
        repo: 'express',
      });
      expect(parseGitHubRepoUrl('https://github.com/expressjs/express')).toEqual({
        owner: 'expressjs',
        repo: 'express',
      });
      expect(parseGitHubRepoUrl('https://github.com/expressjs/express/')).toEqual({
        owner: 'expressjs',
        repo: 'express',
      });
      expect(parseGitHubRepoUrl('https://github.com/S-T-HARINI/VestiNex.git')).toEqual({
        owner: 'S-T-HARINI',
        repo: 'VestiNex',
      });
      expect(parseGitHubRepoUrl('  https://github.com/foo-bar/my_repo.v2.git  ')).toEqual({
        owner: 'foo-bar',
        repo: 'my_repo.v2',
      });
    });

    it('rejects SSRF vectors, invalid protocols, and non-GitHub hosts', () => {
      // Non-https
      expect(parseGitHubRepoUrl('http://github.com/expressjs/express')).toBeNull();
      expect(parseGitHubRepoUrl('ftp://github.com/expressjs/express')).toBeNull();

      // Non-GitHub hosts (SSRF attempts)
      expect(parseGitHubRepoUrl('https://gitlab.com/expressjs/express')).toBeNull();
      expect(parseGitHubRepoUrl('https://bitbucket.org/expressjs/express')).toBeNull();
      expect(parseGitHubRepoUrl('https://169.254.169.254/expressjs/express')).toBeNull();
      expect(parseGitHubRepoUrl('https://localhost/expressjs/express')).toBeNull();
      expect(parseGitHubRepoUrl('https://github.com.attacker.com/expressjs/express')).toBeNull();
      expect(parseGitHubRepoUrl('https://attacker.com/github.com/expressjs/express')).toBeNull();

      // URLs with credentials or custom ports
      expect(parseGitHubRepoUrl('https://user:pass@github.com/expressjs/express')).toBeNull();
      expect(parseGitHubRepoUrl('https://github.com:8443/expressjs/express')).toBeNull();

      // Directory traversal and invalid path structures
      expect(parseGitHubRepoUrl('https://github.com/../evil/repo')).toBeNull();
      expect(parseGitHubRepoUrl('https://github.com/expressjs/express/tree/main')).toBeNull();
      expect(parseGitHubRepoUrl('https://github.com/expressjs')).toBeNull();
      expect(parseGitHubRepoUrl('https://github.com/')).toBeNull();
      expect(parseGitHubRepoUrl('')).toBeNull();
      expect(parseGitHubRepoUrl(null as any)).toBeNull();
      expect(parseGitHubRepoUrl(undefined as any)).toBeNull();
    });
  });

  describe('POST /api/projects/:projectId/code-changes/sync integration', () => {
    let authCookie: string;
    let testProjectId: string;
    let emptyRepoProjectId: string;
    let invalidRepoProjectId: string;

    beforeEach(async () => {
      // Login as admin
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@vestinex.io', password: 'password123' });
      authCookie = loginRes.headers['set-cookie'][0];

      // Create test project with GitHub repo
      const p1 = await request(app)
        .post('/api/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'GitHub Sync Test Project',
          repoUrl: 'https://github.com/expressjs/express.git',
          environment: 'PRODUCTION',
        });
      testProjectId = p1.body.project.id;

      // Create test project with no repoUrl
      const p2 = await request(app)
        .post('/api/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'Empty Repo Test Project',
          repoUrl: '',
          environment: 'PRODUCTION',
        });
      emptyRepoProjectId = p2.body.project.id;

      // Create test project with invalid repoUrl
      const p3 = await request(app)
        .post('/api/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'Invalid Repo Test Project',
          repoUrl: 'https://gitlab.com/some/repo',
          environment: 'PRODUCTION',
        });
      invalidRepoProjectId = p3.body.project.id;
    });

    it('rejects sync if project has no repoUrl (HTTP 400)', async () => {
      const res = await request(app)
        .post(`/api/projects/${emptyRepoProjectId}/code-changes/sync`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No repository URL configured');
    });

    it('rejects sync if project has non-GitHub or invalid repoUrl (HTTP 400)', async () => {
      const res = await request(app)
        .post(`/api/projects/${invalidRepoProjectId}/code-changes/sync`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid GitHub repository URL');
    });

    it('rejects sync for non-existent or unauthorized project (HTTP 403 access denied)', async () => {
      const res = await request(app)
        .post('/api/projects/prj_non_existent_999/code-changes/sync')
        .set('Cookie', authCookie);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('enforces RBAC - unauthenticated requests are rejected (HTTP 401)', async () => {
      const res = await request(app).post(`/api/projects/${testProjectId}/code-changes/sync`);
      expect(res.status).toBe(401);
    });

    it('handles GitHub rate limit (HTTP 429) gracefully', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 403,
        statusText: 'Forbidden',
        ok: false,
        headers: new Headers({ 'x-ratelimit-remaining': '0' }),
      } as any);

      try {
        const res = await request(app)
          .post(`/api/projects/${testProjectId}/code-changes/sync`)
          .set('Cookie', authCookie);

        expect(res.status).toBe(429);
        expect(res.body.error).toContain('rate limit exceeded');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles GitHub repository not found (HTTP 404) gracefully', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 404,
        statusText: 'Not Found',
        ok: false,
        headers: new Headers(),
      } as any);

      try {
        const res = await request(app)
          .post(`/api/projects/${testProjectId}/code-changes/sync`)
          .set('Cookie', authCookie);

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('not found or is private');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('successfully imports commits idempotently without duplicates', async () => {
      const mockCommits = [
        {
          sha: '1111111111111111111111111111111111111111',
          commit: {
            message: 'feat: add express router optimization',
            author: {
              name: 'Jane Developer',
              email: 'jane@example.com',
              date: '2026-10-10T12:00:00Z',
            },
          },
          html_url: 'https://github.com/expressjs/express/commit/1111111111111111111111111111111111111111',
        },
        {
          sha: '2222222222222222222222222222222222222222',
          commit: {
            message: 'fix: patch memory leak in body parser',
            author: {
              name: 'John SRE',
              email: 'john@example.com',
              date: '2026-10-11T14:30:00Z',
            },
          },
          html_url: 'https://github.com/expressjs/express/commit/2222222222222222222222222222222222222222',
        },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Headers(),
        json: async () => mockCommits,
      } as any);

      try {
        // First sync: imports 2 commits
        const res1 = await request(app)
          .post(`/api/projects/${testProjectId}/code-changes/sync`)
          .set('Cookie', authCookie);

        expect(res1.status).toBe(200);
        expect(res1.body.success).toBe(true);
        expect(res1.body.newlyImported).toBe(2);
        expect(res1.body.totalFetched).toBe(2);

        // Verify commits are in the list
        const listRes = await request(app)
          .get(`/api/projects/${testProjectId}/code-changes`)
          .set('Cookie', authCookie);
        expect(listRes.status).toBe(200);
        expect(listRes.body.codeChanges.length).toBe(2);
        expect(listRes.body.codeChanges[0].commitSha).toBe('2222222222222222222222222222222222222222');

        // Second sync: idempotent, 0 newly imported
        const res2 = await request(app)
          .post(`/api/projects/${testProjectId}/code-changes/sync`)
          .set('Cookie', authCookie);

        expect(res2.status).toBe(200);
        expect(res2.body.newlyImported).toBe(0);
        expect(res2.body.totalFetched).toBe(2);
        expect(res2.body.message).toContain('already up to date');

        // Confirm database still contains exactly 2 commits
        const listRes2 = await request(app)
          .get(`/api/projects/${testProjectId}/code-changes`)
          .set('Cookie', authCookie);
        expect(listRes2.body.codeChanges.length).toBe(2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
