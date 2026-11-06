import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, login, logout } from "./helpers";

test.describe("Dasbor instruktur", () => {
  test("instruktur langsung masuk ke dasbor khusus dan menu manajemen disembunyikan", async ({ page }) => {
    await login(page, "instruktur");

    await expect(page).toHaveURL(/\/instruktur/);
    await expect(page.getByRole("heading", { name: "Selamat datang", exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Jadwal mengajar hari ini" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aksi cepat" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mata kuliah yang Anda ampu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Riwayat sesi absensi" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Peta lab hari ini" })).toBeVisible();
    await expect(page.locator(".ops-strip .ops-stat")).toHaveCount(4);

    await expect(page.locator('.rail-link[href="/instruktur"]')).toContainText("Dasbor Instruktur");
    await expect(page.locator('.rail-link[href="/instruktur/matakuliah"]')).toContainText("Mata Kuliah Saya");
    await expect(page.locator('.rail-link[href="/inventory"]')).toHaveCount(0);
    await expect(page.locator('.rail-link[href="/staff"]')).toHaveCount(0);
    await expect(page.locator('.rail-link[href="/recruitment"]')).toHaveCount(0);

    await assertNoHorizontalOverflow(page);
    await logout(page);
  });

  test("pengguna non-instruktur dialihkan dari dasbor instruktur", async ({ page }) => {
    await login(page, "mahasiswa");
    await page.goto("/instruktur");
    await expect(page).toHaveURL(/\/dashboard\?denied=1/);
    await logout(page);
  });
});
