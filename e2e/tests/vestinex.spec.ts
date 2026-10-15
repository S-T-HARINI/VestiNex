import { test, expect } from '@playwright/test';

test.describe('VestiNex Platform E2E Tests', () => {
  test('Landing page loads and displays brand tagline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Every failure leaves a trace.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Open Platform|Launch Live Investigation/i })).toBeVisible();
  });

  test('Sign-in via fast demo credentials navigates to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Platform Lead/i }).click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Engineering Observability Dashboard')).toBeVisible();
    await expect(page.getByText('Open Incidents')).toBeVisible();
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
    await expect(page.getByText('Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint')).toBeVisible();

    // Open Incident Detail
    await page.getByText('Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint').click();

    // Verify Investigation Workspace components
    await expect(page.getByText('Chronological Failure Reconstruction Timeline')).toBeVisible();
    await expect(page.getByText('Deployment Correlation Leads')).toBeVisible();
    await expect(page.getByText('Evidence Policy')).toBeVisible();
  });
});
