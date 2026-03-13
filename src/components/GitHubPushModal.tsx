import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Github, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

interface GitHubPushModalProps {
    isOpen: boolean;
    onClose: () => void;
    githubToken: string | null;
    documentContent: string;
}

export const GitHubPushModal: React.FC<GitHubPushModalProps> = ({
    isOpen,
    onClose,
    githubToken,
    documentContent
}) => {
    const [repoName, setRepoName] = useState('');
    const [filePath, setFilePath] = useState('');
    const [commitMessage, setCommitMessage] = useState('Update document from M/L Editor');
    const [isPushing, setIsPushing] = useState(false);

    if (!isOpen) return null;

    const handlePush = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!githubToken) {
            toast.error('Not authenticated with GitHub. Please log in first.');
            return;
        }

        if (!repoName || !filePath) {
            toast.error('Repository name and file path are required.');
            return;
        }

        setIsPushing(true);
        const loadingToast = toast.loading('Pushing to GitHub...');

        try {
            // 1. Prepare content (must be base64 encoded for GitHub API)
            const contentBase64 = btoa(unescape(encodeURIComponent(documentContent)));

            // Clean up repo name (remove domain if user pasted full URL)
            let cleanRepo = repoName.replace('https://github.com/', '').trim();

            // 2. Check if file already exists (to get its SHA, required for updating)
            let sha = null;
            try {
                const getRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${filePath}`, {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (getRes.ok) {
                    const fileData = await getRes.json();
                    sha = fileData.sha;
                }
            } catch (err) {
                // File doesn't exist yet, which is fine
                console.log("File does not exist yet, will create new.");
            }

            // 3. Create or update file
            const body: any = {
                message: commitMessage || 'Update from M/L Editor',
                content: contentBase64,
            };

            if (sha) {
                body.sha = sha;
            }

            const putRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!putRes.ok) {
                const errorData = await putRes.json();
                throw new Error(errorData.message || 'Failed to push to GitHub');
            }

            toast.success('Successfully pushed to GitHub!', { id: loadingToast });
            onClose();
        } catch (error: any) {
            console.error('GitHub Push Error:', error);
            toast.error(error.message || 'Failed to push to GitHub', { id: loadingToast });
        } finally {
            setIsPushing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden"
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Github size={20} />
                        Push to GitHub
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {!githubToken ? (
                        <div className="text-center py-6">
                            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-4">
                                You must be logged in with GitHub to use this feature.
                            </div>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handlePush} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Repository <span className="text-slate-500 font-normal">(e.g., username/repo)</span>
                                </label>
                                <input
                                    type="text"
                                    value={repoName}
                                    onChange={(e) => setRepoName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="octocat/Hello-World"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    File Path <span className="text-slate-500 font-normal">(e.g., notes/document.md)</span>
                                </label>
                                <input
                                    type="text"
                                    value={filePath}
                                    onChange={(e) => setFilePath(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="docs/my-notes.md"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Commit Message
                                </label>
                                <input
                                    type="text"
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Update document"
                                    required
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isPushing}
                                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <UploadCloud size={18} />
                                    {isPushing ? 'Pushing...' : 'Commit & Push File'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
