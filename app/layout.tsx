import type { Metadata } from "next";
import "./globals.css";
import "./municipal.css";

export const metadata: Metadata = {
  title: "Optical Lift Newsroom",
  description: "Source-grounded reporting intelligence for human newsrooms."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
