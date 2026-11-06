import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

const MENU = [
  { label: "Mata kuliah", href: "/courses" },
  { label: "Jadwal", href: "/schedules" },
  { label: "Peminjaman lab", href: "/bookings" },
  { label: "Kendala", href: "/issues" },
  { label: "Inventaris aset per ruangan", href: "/inventory" },
  { label: "Buat lowongan instruktur/asdos", href: "/recruitment?tab=kelola" },
  { label: "Lab", href: "/labs" },
];

test.describe("Dasbor koordinator", () => {
  test("koordinator langsung masuk ke dasbor khusus dengan enam menu utama", async ({ page }) => {
    await login(page, "koordinator");

    await expect(page).toHaveURL(/\/koordinator/);
    await expect(page.getByRole("heading", { name: "Selamat datang", exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Menu utama koordinator" })).toBeVisible();
    await expect(page.locator(".rail")).toContainText("Dasbor Koordinator");

    for (const item of MENU) {
      const card = page
        .locator(".coord-menu-card")
        .filter({ has: page.getByRole("heading", { name: item.label, exact: true }) });
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("href", item.href);
    }

    await expect(page.locator(".ops-strip .ops-stat")).toHaveCount(4);
    await expect(page.getByRole("heading", { name: "Aset per ruangan", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lowongan instruktur & asdos", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sesi laboratorium hari ini", exact: true })).toBeVisible();

    await logout(page);
  });

  test("tautan buat lowongan membuka tab kelola rekrutmen", async ({ page }) => {
    await login(page, "koordinator");
    await page.getByRole("link", { name: /buat lowongan/i }).first().click();

    await expect(page).toHaveURL(/\/recruitment\?tab=kelola/);
    await expect(page.getByRole("heading", { name: "Buka periode rekrutmen" })).toBeVisible();
    await expect(page.locator(".chip.is-active", { hasText: "Kelola" })).toBeVisible();

    await logout(page);
  });

  test("pengguna non-koordinator dialihkan dari dasbor koordinator", async ({ page }) => {
    await login(page, "mahasiswa");
    await page.goto("/koordinator");
    await expect(page).toHaveURL(/\/dashboard\?denied=1/);
    await logout(page);
  });
});
