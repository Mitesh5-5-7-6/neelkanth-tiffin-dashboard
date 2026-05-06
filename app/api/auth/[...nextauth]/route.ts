import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createHash, timingSafeEqual, randomUUID } from 'crypto';
import { registerSession, isActiveSession } from '@/lib/session-store';

// Hash both inputs to the same fixed length before comparing — prevents
// timing leaks caused by differing string lengths.
function safeCompare(a: string, b: string): boolean {
    const hashA = createHash('sha256').update(a).digest();
    const hashB = createHash('sha256').update(b).digest();
    return timingSafeEqual(hashA, hashB);
}

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const validEmail = process.env.LOGIN_EMAIL;
                const validPassword = process.env.LOGIN_PASSWORD;

                if (!validEmail || !validPassword) return null;

                const emailOk = safeCompare(credentials.email, validEmail);
                const passwordOk = safeCompare(credentials.password, validPassword);

                if (!emailOk || !passwordOk) return null;

                // Invalidate any existing session by registering a new ID.
                const sessionId = randomUUID();
                registerSession(sessionId);

                return {
                    id: 'admin',
                    email: validEmail,
                    name: 'Admin',
                    role: 'admin',
                    sessionId,
                } as any;
            }
        })
    ],
    session: { strategy: 'jwt' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.sessionId = (user as any).sessionId;
            }
            // If a newer login has happened, expire this token immediately.
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
        }
    },
    pages: {
        signIn: '/login',
    }
});

export { handler as GET, handler as POST };
