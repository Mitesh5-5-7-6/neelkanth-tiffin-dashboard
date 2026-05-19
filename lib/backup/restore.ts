import { unzipSync } from 'fflate';
import { EJSON } from 'bson';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { downloadFromOneDrive } from '@/lib/backup/onedrive-upload';
import type { BackupPayload, RestoreCollectionResult, RestoreResult } from '@/types/backup.type';

const VALID_COLLECTIONS = new Set([
    'users',
    'customers',
    'tiffin_entries',
    'payments',
    'expenses',
    'daily_menus',
    'blogs',
    'settings',
]);

function remotePathForDate(dateStr: string): string {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(5, 7);
    return `backups/${year}/${month}/backup-${dateStr}.zip`;
}

/**
 * Downloads a backup ZIP from OneDrive for the given ISO date string (YYYY-MM-DD),
 * unzips it, and parses the EJSON payload back into a BackupPayload with full
 * BSON type fidelity (ObjectId, Date, Decimal128, etc.).
 */
export async function downloadBackup(dateStr: string): Promise<BackupPayload> {
    const remotePath = remotePathForDate(dateStr);
    const zipBuffer = await downloadFromOneDrive(remotePath);

    const files = unzipSync(zipBuffer);
    const jsonFilename = `backup-${dateStr}.json`;
    const jsonBytes = files[jsonFilename];

    if (!jsonBytes) {
        const found = Object.keys(files).join(', ') || '(none)';
        throw new Error(`Expected "${jsonFilename}" inside ZIP. Files found: ${found}`);
    }

    const text = new TextDecoder().decode(jsonBytes);
    return EJSON.parse(text) as BackupPayload;
}

/**
 * Restores a single collection from a parsed backup payload.
 * Existing documents are deleted first to ensure a clean slate;
 * ordered: false allows partial success if any document fails to insert.
 */
export async function restoreCollection(
    payload: BackupPayload,
    collectionName: string
): Promise<RestoreCollectionResult> {
    if (!VALID_COLLECTIONS.has(collectionName)) {
        throw new Error(
            `"${collectionName}" is not a restorable collection. ` +
            `Valid names: ${[...VALID_COLLECTIONS].join(', ')}`
        );
    }

    const docs = payload.collections[collectionName];
    if (docs === undefined) {
        throw new Error(`Collection "${collectionName}" is not present in this backup`);
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection established but db instance is unavailable');

    const col = db.collection(collectionName);
    const dropped = await col.countDocuments();
    await col.deleteMany({});

    let inserted = 0;
    if (docs.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await col.insertMany(docs as any[], { ordered: false });
        inserted = result.insertedCount;
    }

    return { collection: collectionName, inserted, dropped };
}

/**
 * Restores every collection present in the backup payload.
 * Collections are processed in parallel; a failure in one does not abort others.
 */
export async function restoreFullDatabase(payload: BackupPayload): Promise<RestoreResult> {
    const results: Record<string, { inserted: number; dropped: number }> = {};
    const errors: Record<string, string> = {};

    await Promise.allSettled(
        Object.keys(payload.collections).map(async (name) => {
            try {
                const r = await restoreCollection(payload, name);
                results[name] = { inserted: r.inserted, dropped: r.dropped };
            } catch (e) {
                errors[name] = e instanceof Error ? e.message : String(e);
            }
        })
    );

    return {
        backup_date: payload.metadata.backup_date,
        database: payload.metadata.database,
        collections_restored: results,
        errors,
        total_inserted: Object.values(results).reduce((sum, r) => sum + r.inserted, 0),
        restored_at: new Date().toISOString(),
    };
}
