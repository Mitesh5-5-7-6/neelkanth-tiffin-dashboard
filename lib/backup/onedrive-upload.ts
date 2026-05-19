import type { OneDriveDriveItem, OneDriveTokenResponse, OneDriveUploadResult } from '@/types/backup.type';

// Microsoft Graph chunk size must be a multiple of 320 KiB.
// 3,276,800 bytes = 10 × 320 KiB — safe ceiling well below the 60 MiB session limit.
const CHUNK_SIZE = 10 * 320 * 1024;

// Files smaller than 4 MB can be uploaded in a single PUT request.
const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024;

async function getAccessToken(): Promise<string> {
    const clientId = process.env.ONEDRIVE_CLIENT_ID;
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
    const refreshToken = process.env.ONEDRIVE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error(
            'Missing OneDrive credentials. Set ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, and ONEDRIVE_REFRESH_TOKEN.'
        );
    }

    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access',
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`OneDrive token refresh failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as OneDriveTokenResponse;
    return data.access_token;
}

/**
 * Encodes each path segment individually so folder slashes are preserved
 * while special characters inside segment names are safely encoded.
 */
function encodeDrivePath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
}

async function simpleUpload(
    token: string,
    buffer: Uint8Array,
    remotePath: string
): Promise<OneDriveUploadResult> {
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeDrivePath(remotePath)}:/content`;

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
        },
        body: buffer,
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`OneDrive simple upload failed (${res.status}): ${body}`);
    }

    const item = (await res.json()) as OneDriveDriveItem;
    return { web_url: item.webUrl, size: item.size };
}

async function chunkedUpload(
    token: string,
    buffer: Uint8Array,
    remotePath: string
): Promise<OneDriveUploadResult> {
    // Create an upload session so the server holds state between chunk PUTs
    const sessionUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeDrivePath(remotePath)}:/createUploadSession`;

    const sessionRes = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            item: { '@microsoft.graph.conflictBehavior': 'replace' },
        }),
    });

    if (!sessionRes.ok) {
        const body = await sessionRes.text();
        throw new Error(`Failed to create OneDrive upload session (${sessionRes.status}): ${body}`);
    }

    const { uploadUrl } = (await sessionRes.json()) as { uploadUrl: string };
    const totalSize = buffer.length;
    let offset = 0;
    let lastJson: OneDriveDriveItem | null = null;

    while (offset < totalSize) {
        const end = Math.min(offset + CHUNK_SIZE, totalSize);
        const chunk = buffer.subarray(offset, end);

        const chunkRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
                'Content-Length': String(chunk.length),
            },
            body: chunk,
        });

        // 202 = chunk accepted, more chunks expected; 200/201 = upload complete
        if (!chunkRes.ok && chunkRes.status !== 202) {
            const body = await chunkRes.text();
            throw new Error(
                `OneDrive chunk upload failed at bytes ${offset}-${end - 1} (${chunkRes.status}): ${body}`
            );
        }

        if (chunkRes.status !== 202) {
            lastJson = (await chunkRes.json()) as OneDriveDriveItem;
        }

        offset = end;
    }

    if (!lastJson) throw new Error('OneDrive chunked upload completed without a final item response');
    return { web_url: lastJson.webUrl, size: lastJson.size };
}

/**
 * Uploads a buffer to OneDrive at the given path.
 * Automatically selects simple PUT for files < 4 MB and a resumable
 * upload session for larger payloads.
 *
 * remotePath example: "backups/2026/05/backup-2026-05-15.zip"
 */
export async function uploadToOneDrive(
    buffer: Uint8Array,
    remotePath: string
): Promise<OneDriveUploadResult> {
    const token = await getAccessToken();

    if (buffer.length <= SIMPLE_UPLOAD_LIMIT) {
        return simpleUpload(token, buffer, remotePath);
    }

    return chunkedUpload(token, buffer, remotePath);
}

/**
 * Downloads a file from OneDrive and returns its raw bytes.
 * The Graph API follows redirects automatically; the final response body
 * is the file content.
 *
 * remotePath example: "backups/2026/05/backup-2026-05-15.zip"
 */
export async function downloadFromOneDrive(remotePath: string): Promise<Uint8Array> {
    const token = await getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeDrivePath(remotePath)}:/content`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'follow',
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`OneDrive download failed (${res.status}): ${body}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}
