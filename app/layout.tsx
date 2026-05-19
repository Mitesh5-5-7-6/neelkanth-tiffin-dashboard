import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import SessionWrapper from "@/components/SessionWrapper";
import { TooltipProvider } from "@/components/ui/tooltip";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Neelkanth Tiffin - Admin Dashboard",
  description: "A modern admin dashboard, showcasing authentication, protected routes, and dynamic data visualization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", sora.className)}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SessionWrapper>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
