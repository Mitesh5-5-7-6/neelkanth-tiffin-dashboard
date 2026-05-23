import { zipSync, strToU8 } from 'fflate';
import { EJSON } from 'bson';
import type { BackupPayload } from '@/types/backup.type';

// EJSON preserves MongoDB types (ObjectId, Date, Decimal128, etc.) so the
// archive can be round-tripped through restore without losing type fidelity.
// relaxed: false ensures every BSON type is represented canonically.
export function generateBackupZip(zipFilename: string, payload: BackupPayload): Uint8Array {
    const jsonFilename = zipFilename.replace(/\.zip$/i, '.json');
    const jsonBytes = strToU8(EJSON.stringify(payload, undefined, 2, { relaxed: false }));
    return zipSync({ [jsonFilename]: [jsonBytes, { level: 6 }] });
}
