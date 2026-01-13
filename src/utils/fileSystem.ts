export async function openFile() {
    try {
        if (!('showOpenFilePicker' in window)) {
            alert('Your browser does not support the File System Access API.');
            return null;
        }
        const [fileHandle] = await (window as any).showOpenFilePicker({
            types: [
                {
                    description: 'Markdown & Text',
                    accept: {
                        'text/markdown': ['.md', '.markdown'],
                        'text/plain': ['.txt'],
                    },
                },
            ],
            multiple: false,
        });
        const file = await fileHandle.getFile();
        const contents = await file.text();
        return { name: file.name, content: contents, handle: fileHandle };
    } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
            console.error(err);
        }
        return null;
    }
}

export async function saveFile(handle: any, content: string) {
    try {
        if (handle) {
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            return handle;
        } else {
            return saveFileAs(content);
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

export async function saveFileAs(content: string) {
    try {
        if (!('showSaveFilePicker' in window)) {
            alert('Your browser does not support the File System Access API.');
            return null;
        }
        const handle = await (window as any).showSaveFilePicker({
            types: [
                {
                    description: 'Markdown File',
                    accept: { 'text/markdown': ['.md'] },
                },
                {
                    description: 'LaTeX File',
                    accept: { 'application/x-tex': ['.tex'] },
                },
                {
                    description: 'Text File',
                    accept: { 'text/plain': ['.txt'] },
                },
            ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return handle;
    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            console.error(err);
        }
        return null;
    }
}
