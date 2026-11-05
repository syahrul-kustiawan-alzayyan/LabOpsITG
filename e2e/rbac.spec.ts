import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Kontrol akses berbasis peran", () => {
  test("mahasiswa dialihkan dari halaman pengguna", async ({ page }) => {
    await login(page, "mahasiswa");
    await page.goto("/users");
    await expect(page).toHaveURL(/\/dashboard\?denied=1/);
    await expect(page.locator("h1.page-title")).toContainText(/selamat datang/i);
  });

  test("dosen tidak dapat membuka laporan internal", async ({ page }) => {
    await login(page, "dosen");
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/dashboard\?denied=1/);
  });

  test("koordinator dapat membuka jejak audit dan manajemen pengguna", async ({ page }) => {
    await login(page, "koordinator");
    await page.goto("/audit");
    await expect(page.locator("h1.page-title")).toContainText(/jejak audit/i);
    await expect(page.locator(".table")).toBeVisible();

    await page.goto("/users");
    await expect(page.locator("h1.page-title")).toContainText(/pengguna/i);
    await expect(page.getByRole("button", { name: /tambah pengguna/i })).toBeVisible();
  });

  test("prodi dapat membuka rekap absensi tetapi tidak manajemen pengguna", async ({ page }) => {
    await login(page, "prodi");
    await page.goto("/attendance/admin");
    await expect(page.locator("h1.page-title")).toContainText(/admin absensi/i);

    await page.goto("/users");
    await expect(page).toHaveURL(/\/dashboard\?denied=1/);
  });

  test("admin dapat mengelola pengguna", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/users");
    await expect(page.locator("h1.page-title")).toContainText(/pengguna/i);
    await expect(page.getByRole("button", { name: /tambah pengguna/i })).toBeVisible();
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });
});
