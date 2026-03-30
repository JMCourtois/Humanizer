import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Humanizer Lab",
  description:
    "A small educational Next.js app that demonstrates a MiniMax-powered multi-agent text humanizing workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
