export interface BackupMetadata {
    backup_date: string;
    generated_at: string;
    database: string;
    version: string;
    collections_count: number;
    total_records: number;
}

export interface BackupPayload {
    metadata: BackupMetadata;
    collections: Record<string, unknown[]>;
}

export interface CollectionStats {
    [collectionName: string]: number;
}

export interface BackupResult {
    filename: string;
    onedrive_path: string;
    web_url: string;
    size_bytes: number;
    collections: CollectionStats;
    total_records: number;
    export_errors: Record<string, string>;
    duration_ms: number;
    generated_at: string;
}

export interface OneDriveUploadResult {
    web_url: string;
    size: number;
}

export interface OneDriveTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
}

export interface OneDriveDriveItem {
    id: string;
    name: string;
    size: number;
    webUrl: string;
    lastModifiedDateTime: string;
}

export interface RestoreCollectionResult {
    collection: string;
    inserted: number;
    dropped: number;
}

export interface RestoreResult {
    backup_date: string;
    database: string;
    collections_restored: Record<string, { inserted: number; dropped: number }>;
    errors: Record<string, string>;
    total_inserted: number;
    restored_at: string;
}
