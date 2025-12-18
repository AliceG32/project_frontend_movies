import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('Отображение ошибки при неверных данных', async ({ page }) => {
        await page.goto('/');
        await page.fill('input[placeholder="user"]', 'wronguser');
        await page.fill('input[type="password"]', 'wrongpass');
        await page.click('button[type="submit"]');
        await expect(page.locator('.alert-danger')).toBeVisible();
        await expect(page.locator('.alert-danger')).toContainText(/ошибка|Неверное/i);
    });

    test('Перенаправление на логин при отсутствии авторизации', async ({ page }) => {
        
        await page.goto('/movies');
        await expect(page).toHaveURL(/.*login/);
        await expect(page.locator('h2:has-text("Вход в систему")')).toBeVisible();
    });
});