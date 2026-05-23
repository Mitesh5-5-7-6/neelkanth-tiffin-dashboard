import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { authOptions } from "@/lib/authOptions"
import AppShell from "@/components/AppShell"

export default async function PrivateLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)
    if (!session) {
        const hdrs = await headers()
        const path = hdrs.get("x-pathname") ?? "/dashboard"
        redirect(`/login?callbackUrl=${encodeURIComponent(path)}`)
    }

    return <AppShell>{children}</AppShell>
}
