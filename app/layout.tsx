import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BF3 Server Stats",
  description: "Track live Battlefield 3 server activity, players, maps, and rankings."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
