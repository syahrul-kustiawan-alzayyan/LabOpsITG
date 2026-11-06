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

  test("koordinator hanya melihat enam menu utama di dasbor koordinator", async ({ page }) => {
    await login(page, "koordinator");

    await expect(page).toHaveURL(/\/koordinator/);
    await expect(page.locator(".rail")).toContainText("Dasbor Koordinator");

    for (const label of [
      "Mata Kuliah",
      "Jadwal",
      "Peminjaman",
      "Kendala",
      "Inventaris",
      "Rekrutmen",
      "Lab",
    ]) {
      await expect(page.locator(".rail")).toContainText(label);
    }

    // Menu luar cakupan koordinator tidak boleh muncul di rail. Lab sengaja
    // dimasukkan ke cakupan koordinator (kelola data lab dan fasilitas).
    await expect(page.locator('.rail-link[href="/audit"]')).toHaveCount(0);
    await expect(page.locator('.rail-link[href="/users"]')).toHaveCount(0);
    await expect(page.locator('.rail-link[href="/attendance"]')).toHaveCount(0);

    await logout(page);
  });

  test("akun instruktur dapat dipilih cepat dari halaman login", async ({ page }) => {
    await page.goto("/login");
    await page.locator("summary", { hasText: "Akun instruktur" }).click();
    await page.locator(".credential-item", { hasText: "instruktur04" }).click();

    await expect(page.locator("#email")).toHaveValue("instruktur04");
    await expect(page.locator("#password")).toHaveValue("siti123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/instruktur/, { timeout: 20_000 });
    await expect(page.locator(".rail")).toContainText("Dasbor Instruktur");
    await expect(page.locator(".rail")).toContainText("Absensi");

    // Menu khusus manajemen tidak boleh muncul untuk instruktur/asdos.
    await expect(page.locator('.rail-link[href="/inventory"]')).toHaveCount(0);
    await expect(page.locator('.rail-link[href="/staff"]')).toHaveCount(0);
    await expect(page.locator('.rail-link[href="/recruitment"]')).toHaveCount(0);
    await expect(page.locator('.rail-link[href="/bookings"]')).toHaveCount(0);
    await expect(page.locator('.rail-link[href="/issues"]')).toHaveCount(0);
  });

  test("admin sistem melihat menu pengguna", async ({ page }) => {
    await login(page, "admin");
    await expect(page.locator(".rail")).toContainText("Pengguna");
    const name = await page.locator(".user-name").innerText();
    expect(name.length).toBeGreaterThan(0);
  });
});
