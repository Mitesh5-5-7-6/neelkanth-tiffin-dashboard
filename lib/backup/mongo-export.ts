import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import type { CollectionStats } from '@/types/backup.type';

// Collections to include in the backup — sessions and temp data are excluded
const BACKUP_COLLECTIONS = [
    'users',
    'customers',
    'tiffin_entries',
    'payments',
    'expenses',
    'daily_menus',
    'blogs',
    'settings',
] as const;

export type BackupCollectionName = (typeof BACKUP_COLLECTIONS)[number];

export interface ExportResult {
    collections: Record<string, unknown[]>;
    stats: CollectionStats;
    errors: Record<string, string>;
    database: string;
}

export async function exportCollections(): Promise<ExportResult> {
    await dbConnect();

    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection established but db instance is unavailable');

    const database = db.databaseName;
    const collections: Record<string, unknown[]> = {};
    const stats: CollectionStats = {};
    const errors: Record<string, string> = {};

    // Export each collection independently — a failure in one does not abort others
    await Promise.allSettled(
        BACKUP_COLLECTIONS.map(async (name) => {
            try {
                const docs = await db.collection(name).find({}).toArray();
                collections[name] = docs;
                stats[name] = docs.length;
            } catch (e) {
                errors[name] = e instanceof Error ? e.message : String(e);
                collections[name] = [];
                stats[name] = 0;
            }
        })
    );

    return { collections, stats, errors, database };
}
