import { test, expect } from '@playwright/test';

test.describe('VestiNex Platform E2E Tests', () => {
  async function loginAsAdmin(page: any) {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@vestinex.io');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /Sign In to Workspace/i }).click();
    await page.waitForURL(/.*dashboard/);
  }

  test('Landing page loads and displays brand, about section, and auth actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'VestiNex', level: 1 })).toBeVisible();
    await expect(page.getByText(/VestiNex is an incident intelligence and deployment monitoring platform/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Login$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Account/i }).first()).toBeVisible();
  });

  test('Sign-in via credentials navigates to dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText('Engineering Observability Dashboard')).toBeVisible();
    await expect(page.getByText(/Monitored Software Projects/i).first()).toBeVisible();
  });

  test('Navigate to Incident Investigation Workspace', async ({ page }) => {
    await loginAsAdmin(page);

    // Click on Checkout & Payment Engine project
    await expect(page.getByText('Checkout & Payment Engine').first()).toBeVisible({ timeout: 15000 });
    await page.getByText('Checkout & Payment Engine').first().click();
    await page.waitForURL(/.*\/projects\/.+/);

    // Verify Project Dashboard
    await expect(page.getByText('Operational Activity')).toBeVisible();

    // Navigate to Incidents
    await page.getByRole('link', { name: /Incident Workspace/i }).click();
    await page.waitForURL(/.*\/incidents$/);
    await expect(page.getByText('Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint')).toBeVisible({ timeout: 10000 });

    // Open Incident Detail
    await page.getByText('Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint').click();
    await page.waitForURL(/.*\/incidents\/.+/);

    // Verify Investigation Workspace components
    await expect(page.getByText('Chronological Failure Reconstruction Timeline')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Deployment Correlation Leads')).toBeVisible();
    await expect(page.getByText('Evidence Policy')).toBeVisible();

    // Regression test: Submit new activity note and verify immediate display with accurate relative timestamp
    const noteText = `SRE hypothesis note logged at ${Date.now()}`;
    await page.getByPlaceholder(/Add technical hypothesis, runbook step, or log snippet/i).fill(noteText);
    await page.getByRole('button', { name: /Send/i }).click();

    // Verify note is rendered immediately in the activity stream
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10000 });

    // Verify relative timestamp shows 'just now' or '\ds ago' and does NOT display '5h ago'
    const noteContainer = page.locator('div').filter({ hasText: noteText }).last();
    await expect(noteContainer.getByText(/just now|\d+s ago/i)).toBeVisible();
    await expect(noteContainer.getByText(/5h ago/i)).not.toBeVisible();

    // Regression test: Verify Assigned Lead SRE dropdown displays only workspace members and never leaks test accounts
    const assigneeSelect = page.locator('select').filter({ has: page.locator('option[value="unassigned"]') });
    await expect(assigneeSelect).toBeVisible();
    const optionTexts = await assigneeSelect.locator('option').allInnerTexts();
    // Options must not contain test domain accounts or non-members
    expect(optionTexts.some((text: string) => text.includes('@vestinex-test.io'))).toBe(false);
    expect(optionTexts.some((text: string) => text.includes('Alice Engineer'))).toBe(false);
    expect(optionTexts.some((text: string) => text.includes('Bob Architect'))).toBe(false);
    expect(optionTexts.some((text: string) => text.includes('Jordan Taylor'))).toBe(false);
    // Options must contain Unassigned and legitimate workspace member(s)
    expect(optionTexts.some((text: string) => text.includes('Unassigned'))).toBe(true);
    expect(optionTexts.some((text: string) => text.includes('Alex Rivera') || text.includes('Sarah Chen'))).toBe(true);

    // Verify eligible project member count is visible
    await expect(page.getByText(/\d+ eligible project member/i)).toBeVisible();

    // Verify there is exactly one Invite Member action (no duplicates)
    const inviteBtns = page.getByRole('button', { name: /Invite Member/i });
    await expect(inviteBtns).toHaveCount(1);
    await expect(inviteBtns.first()).toBeVisible();

    // Verify Invite Member opens the invitation dialog
    await inviteBtns.first().click();
    await expect(page.getByText('Invite Member to Project Workspace')).toBeVisible();
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByText('Invite Member to Project Workspace')).not.toBeVisible();
  });

  test('Unauthenticated access to protected routes redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/.*login/);
    await expect(page.getByRole('button', { name: /Sign In to Workspace/i })).toBeVisible();
  });

  test('User authentication lifecycle: login and subsequent sign-out', async ({ page }) => {
    await loginAsAdmin(page);

    // Click User menu avatar and sign out
    await page.getByRole('img', { name: /Sarah Chen/i }).click();
    await page.getByRole('button', { name: /Sign Out/i }).click();

    // Verify redirected back to login page
    await page.waitForURL(/.*login/);
    await expect(page.getByRole('button', { name: /Sign In to Workspace/i })).toBeVisible();
  });

  test('Project Chronological Timeline displays reconstructed events and latency filters', async ({ page }) => {
    await loginAsAdmin(page);

    // Open project
    await page.getByText('Checkout & Payment Engine').first().click();
    await page.waitForURL(/.*\/projects\/.+/);

    // Navigate to Chronological Timeline
    await page.getByRole('link', { name: /Chronological Timeline/i }).click();
    await page.waitForURL(/.*\/timeline/);

    // Verify timeline header and explanation
    await expect(page.getByText('Unified Chronological Event Timeline')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Reconstructing true event occurrence')).toBeVisible();
  });

  test('New user registration starts with clean workspace onboarding state', async ({ page }) => {
    const uniqueEmail = `onboarding_${Date.now()}@vestinex-test.io`;

    // 1. Navigate to register
    await page.goto('/register');
    await page.fill('input[type="text"]', 'Jordan Taylor');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /Complete Registration/i }).click();

    // 2. Redirected to dashboard with clean empty state
    await page.waitForURL(/.*dashboard/);
    await expect(page.getByText('Welcome to Your Clean Engineering Workspace')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Every failure leaves a trace.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Your First Project/i })).toBeVisible();

    // 3. Click Create Your First Project
    await page.getByRole('button', { name: /Create Your First Project/i }).click();
    await page.waitForURL(/.*\/projects\/new/);

    // 4. Fill in generic project details
    await page.fill('input[placeholder*="Customer Portal API"]', 'Customer Portal API');
    await page.fill('textarea', 'REST and GraphQL services for client accounts.');
    await page.getByRole('button', { name: /Initialize Project/i }).click();

    // 5. Redirected to fresh project dashboard with zero-state guidance
    await page.waitForURL(/.*\/projects\/.+/);
    await expect(page.getByText('Project Initialized — Ready for Telemetry & Monitoring')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('All systems operating normally')).toBeVisible();
    await expect(page.getByText('No deployments logged yet')).toBeVisible();

    // 6. Navigate to projects list and verify strict isolation
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: /Customer Portal API/i })).toBeVisible();
    await expect(page.getByText('Checkout & Payment Engine')).not.toBeVisible();
  });

  test('Multi-User Privacy: User A and User B maintain completely isolated workspaces', async ({ page }) => {
    const emailA = `alice_${Date.now()}@vestinex-test.io`;
    const emailB = `bob_${Date.now()}@vestinex-test.io`;

    // 1. Register User A
    await page.goto('/register');
    await page.fill('input[type="text"]', 'Alice Engineer');
    await page.fill('input[type="email"]', emailA);
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /Complete Registration/i }).click();
    await page.waitForURL(/.*dashboard/);

    // User A creates Project Alpha
    await page.goto('/projects/new');
    await page.fill('input[placeholder*="Customer Portal API"]', 'Alpha Microservice');
    await page.fill('textarea', 'Private backend service for User A');
    await page.getByRole('button', { name: /Initialize Project/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/projects/') && !url.pathname.endsWith('/new'));
    const urlAlpha = page.url();

    // User A signs out via user menu
    await page.goto('/dashboard');
    await page.getByRole('img', { name: /Alice/i }).click();
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await page.waitForURL(/.*login/);

    // 2. Register User B independently
    await page.goto('/register');
    await page.fill('input[type="text"]', 'Bob Architect');
    await page.fill('input[type="email"]', emailB);
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /Complete Registration/i }).click();
    await page.waitForURL(/.*dashboard/);

    // Verify User B sees clean empty onboarding and 0 projects
    await expect(page.getByText('Welcome to Your Clean Engineering Workspace')).toBeVisible();
    await page.goto('/projects');
    await expect(page.getByText('No Projects Configured')).toBeVisible();
    await expect(page.getByText('Alpha Microservice')).not.toBeVisible();
    await expect(page.getByText('Checkout & Payment Engine')).not.toBeVisible();

    // Verify User B cannot access User A project URL directly
    await page.goto(urlAlpha);
    await expect(page.getByText('Project not found or access denied.')).toBeVisible({ timeout: 10000 });
  });

  test('GitHub Commit Ingestion: Project with GitHub repository syncs real commits into UI', async ({ page }) => {
    // 1. Sign in as demo admin
    await loginAsAdmin(page);

    // 2. Create project with GitHub repo URL
    await page.goto('/projects/new');
    const projectName = `GitHub Express Test ${Date.now()}`;
    await page.fill('input[placeholder*="Customer Portal API"]', projectName);
    await page.fill('input[placeholder*="github.com"]', 'https://github.com/expressjs/express.git');
    await page.getByRole('button', { name: /Initialize Project/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/projects/') && !url.pathname.endsWith('/new'));

    // 3. Navigate to Git Commits & Code Changes
    const projectUrl = page.url();
    await page.goto(`${projectUrl}/code-changes`);

    await expect(page.getByText('Git Commits & Code Changes')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Sync GitHub Commits/i })).toBeVisible();

    // 4. Click Sync GitHub Commits
    await page.getByRole('button', { name: /Sync GitHub Commits/i }).click();

    // 5. Verify success feedback and imported commits
    await expect(page.getByText(/Successfully imported|already up to date/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('main').first()).toBeVisible({ timeout: 10000 });
  });

  test('Top Navigation Jump Menu and single Record Deploy action in shared header', async ({ page }) => {
    await loginAsAdmin(page);

    // Open first project
    await page.getByText('Checkout & Payment Engine').first().click();
    await page.waitForURL(/.*\/projects\/.+/);

    // Verify exactly one "Record Deploy" button is present in the dashboard header area
    const recordDeployBtns = page.getByRole('button', { name: /Record Deploy/i });
    await expect(recordDeployBtns).toHaveCount(1);
    await expect(recordDeployBtns.first()).toBeVisible();

    // Verify clicking Record Deploy opens the new deployment form
    await recordDeployBtns.first().click();
    await page.waitForURL(/.*\/deployments\/new/);
    await expect(page.getByText('Record New Deployment')).toBeVisible();

    // Verify Top Navigation Jump Menu works to jump to Chronological Timeline
    const jumpBtn = page.getByRole('button', { name: /Jump to section/i });
    await expect(jumpBtn).toBeVisible();
    await jumpBtn.click();

    // Click Chronological Timeline in Jump menu
    await page.getByRole('menuitem', { name: /Chronological Timeline/i }).click();
    await page.waitForURL(/.*\/timeline/);
    await expect(page.getByText('Unified Chronological Event Timeline')).toBeVisible();

    // Jump to Incident Workspace via Jump Menu
    await page.getByRole('button', { name: /Jump to section/i }).click();
    await page.getByRole('menuitem', { name: /Incident Workspace/i }).click();
    await page.waitForURL(/.*\/incidents/);
    await expect(page.getByText('Incident Investigation Log')).toBeVisible();
  });
});

