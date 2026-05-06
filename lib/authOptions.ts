import CredentialsProvider from 'next-auth/providers/credentials';
import { createHash, timingSafeEqual, randomUUID } from 'crypto';
import { registerSession, isActiveSession } from '@/lib/session-store';
import type { NextAuthOptions } from 'next-auth';

function safeCompare(a: string, b: string): boolean {
    const hashA = createHash('sha256').update(a).digest();
    const hashB = createHash('sha256').update(b).digest();
    return timingSafeEqual(hashA, hashB);
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const validEmail = process.env.LOGIN_EMAIL;
                const validPassword = process.env.LOGIN_PASSWORD;
                if (!validEmail || !validPassword) return null;

                const emailOk = safeCompare(credentials.email, validEmail);
                const passwordOk = safeCompare(credentials.password, validPassword);
                if (!emailOk || !passwordOk) return null;

                const sessionId = randomUUID();
                registerSession(sessionId);

                return { id: 'admin', email: validEmail, name: 'Admin', role: 'admin', sessionId } as never;
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
