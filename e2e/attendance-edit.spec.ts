import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

const API_URL = process.env.E2E_API_URL || "http://localhost:4000";

test.describe("Koreksi riwayat absensi", () => {
  test("instruktur dapat mengedit absensi sebelum validasi dan terkunci setelah validasi KM", async ({ page }) => {
    await login(page, "instruktur");
    await page.goto("/attendance");
    await expect(page.locator("h1.page-title")).toContainText(/absensi instruktur/i);
    await expect(page.locator("#instruktur-course")).toBeVisible();

    const warning = page.locator(".alert-warning", { hasText: /tidak ada jadwal/i });
    const options = page.locator("#instruktur-course option");
    const total = await options.count();
    let picked = false;

    for (let i = 1; i < total; i++) {
      await page.locator("#instruktur-course").selectOption({ index: i });
      await page.waitForTimeout(300);
      if (!(await warning.isVisible().catch(() => false))) {
        picked = true;
        break;
      }
    }
    test.skip(!picked, "Tidak ada mata kuliah instruktur yang berjadwal hari ini.");

    await expect(page.locator("#instruktur-kelas")).not.toHaveValue("");
    const materi = `E2E koreksi ${Date.now()}`;
    await page.locator("#instruktur-materi").fill(materi);

    const createPromise = page.waitForResponse(
      (r) => r.url().includes("/attendance/instruktur/session") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /generate qr code/i }).click();
    const created = await (await createPromise).json();
    expect(created.qrToken).toBeTruthy();
    await expect(page.locator('img[alt="QR code absensi"]')).toBeVisible({ timeout: 20_000 });

    // Tutup panel QR, lalu buka editor dari tautan Edit di dasbor instruktur.
    await page.getByRole("button", { name: /buat baru/i }).click();
    await page.goto("/instruktur");
    const dashItem = page
      .locator(".room-row")
      .filter({ hasText: created.sesi.mataKuliah })
      .filter({ hasText: `Pertemuan ${created.pertemuanKe}` });
    await expect(dashItem).toBeVisible();
    const editLink = dashItem.getByRole("link", { name: "Edit", exact: true });
    await expect(editLink).toBeVisible();
    await editLink.click();
    await expect(page).toHaveURL(/\/attendance/);

    const item = page.locator(".notif").filter({ hasText: materi });
    await expect(item).toBeVisible();
    await expect(item).toContainText("Menunggu KM");
    await expect(item.getByText(/edit absensi/i).first()).toBeVisible();

    await expect(item.getByText(/edit absensi/i).first()).toBeVisible();
    await item.locator(".team-member-row select").first().selectOption("IZIN");
    await page.getByRole("button", { name: /simpan perubahan/i }).click();
    await expect(page.locator(".alert-success").first()).toContainText(/diperbarui/i);
    await expect(page.locator(".notif").filter({ hasText: materi })).toContainText(/izin/i);

    // KM memindai dan mengonfirmasi validasi lewat API dengan sesi login yang sama.
    const validate = await page.request.post(`${API_URL}/attendance/validate`, { data: { qrToken: created.qrToken } });
    expect(validate.ok()).toBeTruthy();
    const confirm = await page.request.post(`${API_URL}/attendance/validate/confirm`, { data: { qrToken: created.qrToken } });
    expect(confirm.ok()).toBeTruthy();

    await page.reload();
    const validated = page.locator(".notif").filter({ hasText: materi });
    await expect(validated).toBeVisible();
    await expect(validated).toContainText("Tervalidasi KM");
    await expect(validated).toContainText("Hanya dapat dilihat");
    await expect(validated.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);

    // Backend juga harus menolak koreksi setelah validasi.
    const history = await (await page.request.get(`${API_URL}/attendance/instruktur/sessions`)).json();
    const target = history.find((h: any) => h.materi === materi);
    expect(target).toBeTruthy();
    const patch = await page.request.patch(`${API_URL}/attendance/instruktur/sessions/${created.sesi.id}`, {
      data: {
        tanggal: target.tanggal,
        pertemuanKe: target.pertemuanKe,
        materi: target.materi,
        records: target.members.map((m: any) => ({ id: m.attendanceId, status: "HADIR" })),
      },
    });
    expect(patch.status()).toBe(400);

    await logout(page);
  });
});
