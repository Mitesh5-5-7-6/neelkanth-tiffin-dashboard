"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin() {
        setLoading(true);
        setError("");

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (res?.ok) {
            const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
            router.push(callbackUrl);
            router.refresh();
        } else {
            setError("Invalid email or password.");
        }
    }

    async function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") await handleLogin();
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg">
            <div className="bg-card border border-border p-6 rounded-xl w-full max-w-sm">
                <h2 className="text-xl font-semibold mb-4 text-text">
                    Login
                </h2>

                <div className="space-y-3">
                    <Input
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="username"
                    />

                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="current-password"
                    />

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}

                    <Button
                        onClick={handleLogin}
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
