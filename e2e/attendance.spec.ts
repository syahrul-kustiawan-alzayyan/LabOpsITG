import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Absensi QR sesi", () => {
  test("token tidak dikenal ditolak dengan pesan", async ({ page }) => {
    await login(page, "mahasiswa");
    await page.goto("/attendance");

    await page.locator("#qr").fill("token-palsu-e2e-123");
    await page.getByRole("button", { name: /catat kehadiran/i }).click();

    const alert = page.locator(".alert-danger");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/token|qr|sesi/i);
  });

  test("koordinator membuat token QR sesi dan membuka daftar peserta", async ({ page }) => {
    await login(page, "koordinator");
    const todayResp = page
      .waitForResponse((r) => r.url().includes("/reports/today") && r.status() === 200, { timeout: 15_000 })
      .catch(() => null);
    await page.goto("/attendance");
    await todayResp;

    const empty = page.getByText("Tidak ada sesi hari ini");
    if (await empty.isVisible().catch(() => false)) {
      test.skip(true, "Tidak ada sesi praktikum pada hari ini sehingga token QR sesi tidak dapat dibuat.");
    }

    const qrButton = page.getByRole("button", { name: /^QR$/ }).first();
    await expect(qrButton).toBeVisible();
    await qrButton.click();

    const tokenPanel = page.locator(".panel", { hasText: "QR sesi aktif" });
    await expect(tokenPanel).toBeVisible();
    await expect(tokenPanel).toContainText(/berlaku sampai/i);
    const tokenText = (await tokenPanel.locator("div").nth(1).innerText()).trim();
    expect(tokenText.length).toBeGreaterThan(5);

    await page.getByRole("button", { name: "Peserta", exact: true }).first().click();
    const enrollPanel = page.locator(".panel", { hasText: /^Peserta/ });
    await expect(enrollPanel).toBeVisible();
    await expect(enrollPanel).toContainText(/mahasiswa terdaftar/i);
    await expect(enrollPanel.locator("table")).toBeVisible();
  });
});
