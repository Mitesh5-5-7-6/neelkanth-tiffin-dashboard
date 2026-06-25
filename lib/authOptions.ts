import CredentialsProvider from 'next-auth/providers/credentials';
import { randomUUID } from 'crypto';
import { registerSession, isActiveSession } from '@/lib/session-store';
import { validateCredentials } from '@/lib/auth/validateCredentials';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                // Shared single source of truth — same validation as the mobile API.
                const user = validateCredentials(credentials?.email, credentials?.password);
                if (!user) return null;

                const sessionId = randomUUID();
                registerSession(sessionId);

                return { id: 'admin', email: user.email, name: 'Admin', role: 'admin', sessionId } as never;
            },
        }),
    ],
    session: { strategy: 'jwt' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as never as { role: string }).role;
                token.sessionId = (user as never as { sessionId: string }).sessionId;
            }
            if (token.sessionId && !isActiveSession(token.sessionId as string)) {
                token.exp = 0;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.sub ?? '';
            }
            return session;
        },
    },
    pages: { signIn: '/login' },
};
