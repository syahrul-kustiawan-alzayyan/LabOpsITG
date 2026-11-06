import { expect, test } from "@playwright/test";

test.describe("Halaman publik", () => {
  test("landing page menampilkan identitas lab dan tautan masuk", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Laboratorium Ilmu Komputer Institut Teknologi Garut/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Masuk", exact: true })).toBeVisible();
    await expect(page.getByText("LabOps").first()).toBeVisible();
    await expect(page.locator("#fasilitas")).toBeVisible();
    await expect(page.locator("#menu")).toBeVisible();
    // Halaman awal hanya memuat profil laboratorium, bukan detail layanan.
    await expect(page.locator("#jadwal")).toHaveCount(0);
    await expect(page.locator("#rekrutmen")).toHaveCount(0);
    await expect(page.locator(".landing-nav-link", { hasText: "Jadwal Lab" })).toHaveAttribute(
      "href",
      "/informasi/jadwal",
    );
  });

  test("peta jadwal publik dapat difilter per lab", async ({ page }) => {
    await page.goto("/informasi/jadwal");
    const labFilter = page.locator("#landing-lab");
    await expect(labFilter).toBeVisible();
    const optionCount = await labFilter.locator("option").count();
    expect(optionCount).toBeGreaterThan(1);
    await labFilter.selectOption({ index: 1 });
    await expect(page.locator(".timetable, .schedule-grid").first()).toBeVisible();
  });

  test("halaman terproteksi mengarahkan ke login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    await expect(page.getByRole("heading", { name: "Masuk ke LabOps" })).toBeVisible();
  });

  test("tombol akun demo mengisi formulir", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Admin", exact: true }).click();
    await expect(page.locator("#email")).toHaveValue("admin@labops.local");
    await expect(page.locator("#password")).toHaveValue("admin123");
  });
});
