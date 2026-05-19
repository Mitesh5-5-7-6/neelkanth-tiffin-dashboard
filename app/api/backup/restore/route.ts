import { NextResponse, type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/checkAuth';
import { downloadBackup, restoreCollection, restoreFullDatabase } from '@/lib/backup/restore';
import { badRequest, internalServerError } from '@/lib/apiResponse';

// Restore can be slow on large datasets — allow up to 5 minutes.
// Vercel Hobby plan caps functions at 60 s; lower this value if needed.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
    const { error } = await checkAuth();
    if (error) return error;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return badRequest('Request body must be valid JSON');
    }

    if (typeof body !== 'object' || body === null) {
        return badRequest('Request body must be an object');
    }

    const { date, collection } = body as Record<string, unknown>;

    if (typeof date !== 'string' || !DATE_RE.test(date)) {
        return badRequest('date is required and must be in YYYY-MM-DD format');
    }

    if (collection !== undefined && typeof collection !== 'string') {
        return badRequest('collection must be a string when provided');
    }

    const startedAt = Date.now();

    try {
        console.log(`[RESTORE] Downloading backup for ${date}...`);
        const payload = await downloadBackup(date);

        if (collection) {
            console.log(`[RESTORE] Restoring single collection: ${collection}`);
            const result = await restoreCollection(payload, collection);
            return NextResponse.json({
                success: true,
                message: `Collection "${collection}" restored from ${date}`,
                data: result,
                duration_ms: Date.now() - startedAt,
            });
        }

        console.log(`[RESTORE] Restoring full database from ${date}...`);
        const result = await restoreFullDatabase(payload);
        return NextResponse.json({
            success: true,
            message: `Full database restored from ${date}`,
            data: result,
            duration_ms: Date.now() - startedAt,
        });

    } catch (e) {
        const durationMs = Date.now() - startedAt;
        console.error(`[RESTORE] Failed after ${durationMs}ms:`, e);
        return internalServerError(e);
    }
}
