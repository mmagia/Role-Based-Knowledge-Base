import {test, expect} from '@playwright/test';

test.describe('App', () => {
    test('should load the application and show auth page', async ({page}) => {
        await page.goto('/');

        await expect(page.locator('.auth-panel')).toBeVisible();
        await expect(page.locator('.brand-header')).toContainText('Role-Based Knowledge Base');
        await expect(page.locator('.auth-tabs')).toBeVisible();
        await expect(page.locator('.auth-tabs')).toContainText('Login');
        await expect(page.locator('.auth-tabs')).toContainText('Register');
        await expect(page.locator('.auth-tabs')).toContainText('Admin');
    });

    test('should show login form by default', async ({page}) => {
        await page.goto('/');

        await expect(page.locator('input[name="nickname"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('form button[type="submit"]')).toBeVisible();
    });

    test('should switch to register tab', async ({page}) => {
        await page.goto('/');

        await page.locator('.auth-tabs button', {hasText: 'Register'}).click();
        await expect(page.locator('h1')).toContainText('Register');
        await expect(page.getByRole('button', {name: 'Create account'})).toBeVisible();
    });

    test('should switch to admin tab', async ({page}) => {
        await page.goto('/');

        await page.locator('.auth-tabs button', {hasText: 'Admin'}).click();
        await expect(page.locator('h1')).toContainText('Admin');
        await expect(page.locator('input[name="nickname"]')).toHaveAttribute('placeholder', /admin/);
        await expect(page.getByRole('button', {name: 'Enter admin'})).toBeVisible();
    });
});
