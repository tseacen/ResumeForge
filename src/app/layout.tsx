import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeForge",
  description: "Adapt resumes locally without inventing facts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
