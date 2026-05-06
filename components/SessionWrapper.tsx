"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useState } from "react";
import { SessionSyncer } from "./SessionStorage";

interface SessionWrapperProps {
    children: ReactNode;
}

export default function SessionWrapper({ children }: SessionWrapperProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1 * 60 * 1000,
                        retry: 1,
                        refetchOnWindowFocus: true,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <SessionSyncer />
                {children}
            </SessionProvider>
        </QueryClientProvider>
    );
}
