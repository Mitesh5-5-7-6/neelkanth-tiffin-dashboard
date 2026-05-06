"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function SessionSyncer() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (session) {
            localStorage.setItem("session", JSON.stringify(session));
        } else {
            localStorage.removeItem("session");
        }
    }, [session]);

    useEffect(() => {
        if (status === "loading") return;

        if (status === "authenticated") {
            router.push("/dashboard");
        } else {
            router.push("/login");
        }
    }, [status, router]);

    return null;
}
