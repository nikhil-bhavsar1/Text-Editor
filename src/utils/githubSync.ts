/**
 * GitHub Sync Utility
 * Save to and sync from GitHub repositories via the GitHub REST API.
 */

interface GitHubFileResult {
    content: string;
    sha: string;
    path: string;
    name: string;
}

interface GitHubSaveResult {
    sha: string;
    url: string;
}

/**
 * Save (create or update) a file in a GitHub repository.
 */
export async function saveToGitHub(
    token: string,
    repo: string,
    path: string,
    content: string,
    commitMessage: string = 'Update from M/L Editor'
): Promise<GitHubSaveResult> {
    const cleanRepo = repo.replace('https://github.com/', '').replace(/\/$/, '').trim();
    const cleanPath = path.replace(/^\//, '').trim();
    const contentBase64 = btoa(unescape(encodeURIComponent(content)));

    // Check if file already exists to get SHA
    let sha: string | null = null;
    try {
        const getRes = await fetch(
            `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`,
            {
                headers: {
                    Authorization: `token ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            }
        );
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }
    } catch {
        // File doesn't exist yet
    }

    const body: any = { message: commitMessage, content: contentBase64 };
    if (sha) body.sha = sha;

    const putRes = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`,
        {
            method: 'PUT',
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        }
    );

    if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message || 'Failed to save to GitHub');
    }

    const result = await putRes.json();
    return { sha: result.content.sha, url: result.content.html_url };
}

/**
 * Pull (sync) a file's content from a GitHub repository.
 */
export async function syncFromGitHub(
    token: string,
    repo: string,
    path: string
): Promise<GitHubFileResult> {
    const cleanRepo = repo.replace('https://github.com/', '').replace(/\/$/, '').trim();
    const cleanPath = path.replace(/^\//, '').trim();

    const res = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`,
        {
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        }
    );

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to fetch file from GitHub');
    }

    const data = await res.json();
    const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));

    return {
        content: decoded,
        sha: data.sha,
        path: data.path,
        name: data.name,
    };
}

/**
 * List files in a directory of a GitHub repository.
 */
export async function listRepoContents(
    token: string,
    repo: string,
    path: string = ''
): Promise<Array<{ name: string; path: string; type: string; sha: string }>> {
    const cleanRepo = repo.replace('https://github.com/', '').replace(/\/$/, '').trim();

    const res = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/${path}`,
        {
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        }
    );

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to list repository contents');
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [{ name: data.name, path: data.path, type: data.type, sha: data.sha }];

    return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        sha: item.sha,
    }));
}
