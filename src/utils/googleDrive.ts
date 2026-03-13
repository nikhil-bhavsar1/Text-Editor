/**
 * Google Drive Utility
 * Save to and sync from Google Drive using the Google API client library.
 *
 * Requires:
 *  - <script src="https://apis.google.com/js/api.js"> in index.html
 *  - <script src="https://accounts.google.com/gsi/client"> in index.html
 *  - VITE_GOOGLE_CLIENT_ID in .env
 */

declare const gapi: any;
declare const google: any;

let tokenClient: any = null;
let gapiInitialized = false;
let accessToken: string | null = null;

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

/**
 * Initialize gapi client (called once on app load).
 */
export async function initGoogleDrive(): Promise<boolean> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your_google_client_id_here') {
        console.warn('Google Drive: VITE_GOOGLE_CLIENT_ID not configured.');
        return false;
    }

    try {
        // Load gapi client
        await new Promise<void>((resolve, reject) => {
            if (typeof gapi === 'undefined') { reject(new Error('gapi not loaded')); return; }
            gapi.load('client', { callback: resolve, onerror: reject });
        });

        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });

        // Initialize GIS token client
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: () => { }, // Will be overridden per-call
        });

        gapiInitialized = true;
        return true;
    } catch (err) {
        console.error('Google Drive init failed:', err);
        return false;
    }
}

/**
 * Request an access token from the user (shows consent popup if needed).
 */
export function requestDriveAccess(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Drive not initialized. Call initGoogleDrive() first.'));
            return;
        }

        tokenClient.callback = (response: any) => {
            if (response.error) {
                reject(new Error(response.error));
                return;
            }
            accessToken = response.access_token;
            resolve(response.access_token);
        };

        if (accessToken) {
            // Already have a token, just resolve
            resolve(accessToken);
        } else {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        }
    });
}

/**
 * Check if Google Drive is available (scripts loaded + client ID configured).
 */
export function isDriveAvailable(): boolean {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    return !!(clientId && clientId !== 'your_google_client_id_here' && typeof gapi !== 'undefined');
}

/**
 * Save a file to Google Drive. Creates a new file or updates existing.
 */
export async function saveToGoogleDrive(
    fileName: string,
    content: string,
    folderId?: string,
    existingFileId?: string
): Promise<{ id: string; name: string; webViewLink: string }> {
    if (!gapiInitialized) await initGoogleDrive();
    await requestDriveAccess();

    const metadata: any = {
        name: fileName,
        mimeType: 'text/plain',
    };

    if (folderId && !existingFileId) {
        metadata.parents = [folderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
        content +
        closeDelimiter;

    const url = existingFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`;

    const method = existingFileId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartRequestBody,
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to save to Google Drive');
    }

    return await res.json();
}

/**
 * Sync (download) a file's content from Google Drive.
 */
export async function syncFromGoogleDrive(fileId: string): Promise<string> {
    if (!gapiInitialized) await initGoogleDrive();
    await requestDriveAccess();

    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!res.ok) {
        throw new Error('Failed to download file from Google Drive');
    }

    return await res.text();
}

/**
 * List files in a Drive folder (or root).
 */
export async function listDriveFiles(
    folderId?: string
): Promise<Array<{ id: string; name: string; mimeType: string }>> {
    if (!gapiInitialized) await initGoogleDrive();
    await requestDriveAccess();

    let query = "mimeType != 'application/vnd.google-apps.folder' and trashed = false";
    if (folderId) {
        query = `'${folderId}' in parents and ${query}`;
    }

    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&orderBy=modifiedTime desc&pageSize=20`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!res.ok) {
        throw new Error('Failed to list Google Drive files');
    }

    const data = await res.json();
    return data.files || [];
}
