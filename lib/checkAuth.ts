import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';
import { unauthorized } from './apiResponse';
import type { Session } from 'next-auth';
import type { NextResponse } from 'next/server';

type AuthOk = { session: Session; error: null };
type AuthFail = { session: null; error: ReturnType<typeof NextResponse.json> };

export async function checkAuth(): Promise<AuthOk | AuthFail> {
    const session = await getServerSession(authOptions);
    if (!session) return { session: null, error: unauthorized() };
    return { session, error: null };
}
