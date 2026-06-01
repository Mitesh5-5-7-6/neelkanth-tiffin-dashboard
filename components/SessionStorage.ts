"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function SessionSyncer() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    // NOTE: Storing the full session object in localStorage is an XSS risk.
    // If cross-tab session persistence is required, store a minimal token
    // and secure it properly. For now, avoid persisting session to localStorage.

    useEffect(() => {
        if (status === "loading") return;

        // Only navigate to dashboard from public entry pages to avoid
        // forcing redirects while the user navigates the app.
        if (status === "authenticated") {
            if (pathname === "/" || pathname === "/login") {
                router.push("/dashboard");
            }
        }
    }, [status, router, pathname]);

    return null;
}
