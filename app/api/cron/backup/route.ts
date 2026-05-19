import { NextResponse, type NextRequest } from 'next/server';
import { exportCollections } from '@/lib/backup/mongo-export';
import { generateBackupZip } from '@/lib/backup/zip-generator';
import { uploadToOneDrive } from '@/lib/backup/onedrive-upload';
import type { BackupPayload, BackupResult } from '@/types/backup.type';

// Keep the function alive for up to 5 minutes on Vercel Pro.
// Hobby plan maximum is 60 — lower this value if on Hobby tier.
export const maxDuration = 300;

// Opt out of static generation: every invocation must run server-side.
export const dynamic = 'force-dynamic';

// Run as a Node.js serverless function — required for Buffer, mongoose, and fflate.
export const runtime = 'nodejs';

function unauthorized() {
    return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
    );
}

function toISTDateString(utcDate: Date): string {
    // IST = UTC + 05:30
    const istMs = utcDate.getTime() + 5.5 * 60 * 60 * 1000;
    return new Date(istMs).toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function GET(request: NextRequest) {
    // ── Security ─────────────────────────────────────────────────────────────
    // Vercel sends the cron secret as a Bearer token in the Authorization header.
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return unauthorized();
    }

    const startedAt = Date.now();
    const now = new Date();

    // ── Derive names from IST date so the backup label matches the local day ──
    const dateStr = toISTDateString(now);            // "2026-05-15"
    const year = dateStr.slice(0, 4);               // "2026"
    const month = dateStr.slice(5, 7);              // "05"
    const filename = `backup-${dateStr}.zip`;        // "backup-2026-05-15.zip"
    const remotePath = `backups/${year}/${month}/${filename}`;

    console.log(`[BACKUP] Starting backup for ${dateStr} → OneDrive:${remotePath}`);

    try {
        // ── Step 1: Export MongoDB collections ────────────────────────────────
        console.log('[BACKUP] Exporting MongoDB collections...');
        const { collections, stats, errors: exportErrors, database } = await exportCollections();

        const totalRecords = Object.values(stats).reduce((sum, n) => sum + n, 0);

        if (Object.keys(exportErrors).length > 0) {
            console.warn('[BACKUP] Some collections had export errors:', exportErrors);
        }

        console.log(`[BACKUP] Exported ${totalRecords} records across ${Object.keys(collections).length} collections`);

        // ── Step 2: Build backup payload ──────────────────────────────────────
        const payload: BackupPayload = {
            metadata: {
                backup_date: dateStr,
                generated_at: now.toISOString(),
                database,
                version: '1.0.0',
                collections_count: Object.keys(collections).length,
                total_records: totalRecords,
            },
            collections,
        };

        // ── Step 3: Compress into ZIP ─────────────────────────────────────────
        console.log('[BACKUP] Generating ZIP archive...');
        const zipBuffer = generateBackupZip(filename, payload);
        console.log(`[BACKUP] ZIP size: ${(zipBuffer.length / 1024).toFixed(1)} KB`);

        // ── Step 4: Upload to OneDrive ────────────────────────────────────────
        console.log(`[BACKUP] Uploading to OneDrive at ${remotePath}...`);
        const { web_url, size } = await uploadToOneDrive(zipBuffer, remotePath);

        const durationMs = Date.now() - startedAt;
        console.log(`[BACKUP] Completed in ${durationMs}ms`);

        const result: BackupResult = {
            filename,
            onedrive_path: remotePath,
            web_url,
            size_bytes: size,
            collections: stats,
            total_records: totalRecords,
            export_errors: exportErrors,
            duration_ms: durationMs,
            generated_at: now.toISOString(),
        };

        return NextResponse.json({ success: true, message: 'Backup completed successfully', data: result });

    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const durationMs = Date.now() - startedAt;

        console.error(`[BACKUP] Fatal error after ${durationMs}ms:`, errorMsg);

        return NextResponse.json(
            {
                success: false,
                message: 'Backup failed',
                error: errorMsg,
                duration_ms: durationMs,
            },
            { status: 500 }
        );
    }
}
