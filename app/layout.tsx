import type { Metadata } from "next";
import NewsroomGlobalChassis from "@/components/newsroom-global-chassis";
import "./globals.css";
import "./municipal.css";
import "./newsroom-shell.css";
import "./newsroom-workspace.css";
import "./newsroom-context.css";
import "./transcripts.css";
import "./newsroom-rail-fix.css";
import "./newsroom-icon-render-fix.css";
import "./newsroom-rail-layout-fix.css";

export const metadata: Metadata = {
  title: "Optical Lift Newsroom",
  description: "Source-grounded reporting intelligence for human newsrooms."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <NewsroomGlobalChassis />
      </body>
    </html>
  );
}
