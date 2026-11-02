import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

test.describe("Autentikasi", () => {
  test("kredensial salah ditolak dengan pesan jelas", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "bukan.user@labops.local");
    await page.fill("#password", "salah-sekali");
    await page.locator('button[type="submit"]').click();

    const alert = page.locator(".alert-danger");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/email|kata sandi|kredensial|gagal|tidak/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("mahasiswa masuk dan melihat menu operasional", async ({ page }) => {
    await login(page, "mahasiswa");
    await expect(page.locator(".topbar-title")).toBeVisible();
    await expect(page.locator(".rail")).toContainText("Jadwal");
    await expect(page.locator(".rail")).toContainText("Absensi");
    await expect(page.locator(".rail")).not.toContainText("Pengguna");
    await logout(page);
  });

  test("koordinator melihat menu manajemen", async ({ page }) => {
    await login(page, "koordinator");
    await expect(page.locator(".rail")).toContainText("Lab");
    await expect(page.locator(".rail")).toContainText("Jejak Audit");
    await expect(page.locator(".rail")).not.toContainText("Pengguna");
    await logout(page);
  });

  test("admin sistem melihat menu pengguna", async ({ page }) => {
    await login(page, "admin");
    await expect(page.locator(".rail")).toContainText("Pengguna");
    const name = await page.locator(".user-name").innerText();
    expect(name.length).toBeGreaterThan(0);
  });
});
