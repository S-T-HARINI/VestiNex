import { test, expect } from '@playwright/test';

test.describe('VestiNex Platform E2E Tests', () => {
  test('Landing page loads and displays brand tagline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Every failure leaves a trace.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Open Platform|Launch Live Investigation/i }).first()).toBeVisible();
  });

  test('Sign-in via fast demo credentials navigates to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Platform Lead/i }).click();

    // Verify redirected to dashboard
    await page.waitForURL(/.*dashboard/);
    await expect(page.getByText('Engineering Observability Dashboard')).toBeVisible();
    await expect(page.getByText(/Open Incidents/i).first()).toBeVisible();
  });

  test('Navigate to Incident Investigation Workspace', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Platform Lead/i }).click();
    await page.waitForURL(/.*dashboard/);

    // Click on Checkout & Payment Engine project
    await page.getByText('Checkout & Payment Engine').first().click();

    // Verify Project Dashboard
    await expect(page.getByText('Recurring Incident Patterns')).toBeVisible();

    // Navigate to Incidents
    await page.getByRole('link', { name: /Incident Workspace/i }).click();
    await page.waitForURL(/.*\/incidents$/);
    await expect(page.getByText('Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint')).toBeVisible({ timeout: 10000 });

    // Open Incident Detail
    await page.getByText('Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint').click();
    await page.waitForURL(/.*\/incidents\/.+/);

    // Verify Investigation Workspace components with generous timeout for Next.js first-time compilation
    await expect(page.getByText('Chronological Failure Reconstruction Timeline')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Deployment Correlation Leads')).toBeVisible();
    await expect(page.getByText('Evidence Policy')).toBeVisible();
  });

  test('Unauthenticated access to protected routes redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/.*login/);
    await expect(page.getByRole('button', { name: /Sign In to Workspace/i })).toBeVisible();
  });

  test('User authentication lifecycle: Fast demo login and subsequent sign-out', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Platform Lead/i }).click();
    await page.waitForURL(/.*dashboard/);

    // Click User menu avatar and sign out
    await page.getByRole('img', { name: /Sarah Chen/i }).click();
    await page.getByRole('button', { name: /Sign Out/i }).click();

    // Verify redirected back to login page
    await page.waitForURL(/.*login/);
    await expect(page.getByRole('button', { name: /Sign In to Workspace/i })).toBeVisible();
  });

  test('Project Chronological Timeline displays reconstructed events and latency filters', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Platform Lead/i }).click();
    await page.waitForURL(/.*dashboard/);

    // Open project
    await page.getByText('Checkout & Payment Engine').first().click();
    await expect(page.getByText('Recurring Incident Patterns')).toBeVisible();

    // Navigate to Chronological Timeline
    await page.getByRole('link', { name: /Chronological Timeline/i }).click();
    await page.waitForURL(/.*\/timeline/);

    // Verify timeline header and explanation
    await expect(page.getByText('Unified Chronological Event Timeline')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Reconstructing true event occurrence')).toBeVisible();
  });
});
