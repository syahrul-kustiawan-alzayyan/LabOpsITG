import React from "react";
import "./globals.css";
import Chrome from "@/components/Chrome";

export const metadata = { title: "LabOps Ilkom ITG" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
