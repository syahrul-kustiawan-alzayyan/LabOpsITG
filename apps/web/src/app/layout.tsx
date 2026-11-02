import React from "react";
import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Chrome from "@/components/Chrome";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LabOps — Laboratorium Ilmu Komputer ITG",
    template: "%s · LabOps Ilkom ITG",
  },
  description:
    "Sistem informasi operasional Laboratorium Ilmu Komputer Institut Teknologi Garut: jadwal, peminjaman, kendala, absensi, inventaris, dan rekrutmen.",
  manifest: "/manifest.webmanifest",
  applicationName: "LabOps",
  authors: [{ name: "Laboratorium Ilmu Komputer ITG" }],
  openGraph: {
    title: "LabOps — Laboratorium Ilmu Komputer ITG",
    description: "Jadwal, peminjaman, kendala, absensi, dan inventaris laboratorium dalam satu tempat.",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f4c4c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <a href="#konten" className="skip-link">
          Lompat ke konten
        </a>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
