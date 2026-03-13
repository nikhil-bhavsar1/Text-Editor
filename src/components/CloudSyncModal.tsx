import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, UploadCloud, RefreshCw, Check } from 'lucide-react';
import { saveToGitHub, syncFromGitHub } from '../utils/githubSync';
import { saveToGoogleDrive, syncFromGoogleDrive, isDriveAvailable, initGoogleDrive, requestDriveAccess } from '../utils/googleDrive';
import toast from 'react-hot-toast';

export interface WorkspaceConfig {
    githubRepo: string;
    githubFolder: string;
    githubAutoSync: boolean;
    driveFolder: string;
    driveFileId: string;
    driveAutoSync: boolean;
}

interface CloudSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    githubToken: string | null;
    documentContent: string;
    onContentSync: (content: string) => void;
    workspace: WorkspaceConfig;
    onWorkspaceChange: (ws: WorkspaceConfig) => void;
}

/* ── Shared inline-style helpers ── */
const cardBg = '#0f0d1e';
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13,
    color: '#fff', background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(255,255,255,0.08)', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6,
    color: 'rgba(196,181,253,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' as const,
};
const btnPrimary: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
    color: '#fff', cursor: 'pointer', border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
    boxShadow: '0 4px 14px rgba(99,102,241,0.2)',
};
const btnOutline: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
    color: '#c4b5fd', cursor: 'pointer',
    background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(139,92,246,0.15)',
};

/* ── Google Drive Icon (inline SVG) ── */
const DriveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47" />
        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335" />
        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
        <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.5h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
);

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
    isOpen, onClose, githubToken, documentContent, onContentSync, workspace, onWorkspaceChange,
}) => {
    const [activeTab, setActiveTab] = useState<'github' | 'drive'>('github');
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // GitHub fields
    const [ghRepo, setGhRepo] = useState(workspace.githubRepo);
    const [ghPath, setGhPath] = useState(workspace.githubFolder);
    const [ghCommitMsg, setGhCommitMsg] = useState('Update from M/L Editor');

    // Drive fields
    const [driveFileName, setDriveFileName] = useState('document.md');
    const [driveFolderId, setDriveFolderId] = useState(workspace.driveFolder);
    const [driveFileId, setDriveFileId] = useState(workspace.driveFileId);
    const [driveAvailable, setDriveAvailable] = useState(false);

    useEffect(() => {
        setDriveAvailable(isDriveAvailable());
    }, []);

    // Sync local state with workspace prop changes
    useEffect(() => {
        setGhRepo(workspace.githubRepo);
        setGhPath(workspace.githubFolder);
        setDriveFolderId(workspace.driveFolder);
        setDriveFileId(workspace.driveFileId);
    }, [workspace]);

    if (!isOpen) return null;

    /* ── GitHub handlers ── */
    const handleGitHubSave = async () => {
        if (!githubToken) { toast.error('Not authenticated with GitHub. Log in first.'); return; }
        if (!ghRepo || !ghPath) { toast.error('Repository and file path are required.'); return; }
        setIsSaving(true);
        const t = toast.loading('Saving to GitHub...');
        try {
            await saveToGitHub(githubToken, ghRepo, ghPath, documentContent, ghCommitMsg);
            // Persist workspace config
            onWorkspaceChange({ ...workspace, githubRepo: ghRepo, githubFolder: ghPath });
            toast.success('Saved to GitHub!', { id: t });
        } catch (err: any) {
            toast.error(err.message || 'GitHub save failed', { id: t });
        } finally { setIsSaving(false); }
    };

    const handleGitHubSync = async () => {
        if (!githubToken) { toast.error('Not authenticated with GitHub.'); return; }
        if (!ghRepo || !ghPath) { toast.error('Repository and file path are required.'); return; }
        setIsSyncing(true);
        const t = toast.loading('Syncing from GitHub...');
        try {
            const result = await syncFromGitHub(githubToken, ghRepo, ghPath);
            onContentSync(result.content);
            onWorkspaceChange({ ...workspace, githubRepo: ghRepo, githubFolder: ghPath });
            toast.success('Synced from GitHub!', { id: t });
        } catch (err: any) {
            toast.error(err.message || 'GitHub sync failed', { id: t });
        } finally { setIsSyncing(false); }
    };

    /* ── Google Drive handlers ── */
    const handleDriveSave = async () => {
        setIsSaving(true);
        const t = toast.loading('Saving to Google Drive...');
        try {
            await initGoogleDrive();
            await requestDriveAccess();
            const result = await saveToGoogleDrive(driveFileName, documentContent, driveFolderId || undefined, driveFileId || undefined);
            setDriveFileId(result.id);
            onWorkspaceChange({ ...workspace, driveFolder: driveFolderId, driveFileId: result.id });
            toast.success('Saved to Google Drive!', { id: t });
        } catch (err: any) {
            toast.error(err.message || 'Google Drive save failed', { id: t });
        } finally { setIsSaving(false); }
    };

    const handleDriveSync = async () => {
        if (!driveFileId) { toast.error('No file to sync. Save first.'); return; }
        setIsSyncing(true);
        const t = toast.loading('Syncing from Google Drive...');
        try {
            await initGoogleDrive();
            await requestDriveAccess();
            const content = await syncFromGoogleDrive(driveFileId);
            onContentSync(content);
            toast.success('Synced from Google Drive!', { id: t });
        } catch (err: any) {
            toast.error(err.message || 'Google Drive sync failed', { id: t });
        } finally { setIsSyncing(false); }
    };

    const tabs = [
        { id: 'github' as const, label: 'GitHub', icon: <Github size={15} /> },
        { id: 'drive' as const, label: 'Google Drive', icon: <DriveIcon /> },
    ];

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 flex items-center justify-center"
                style={{ zIndex: 9999, padding: 16 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
                {/* overlay */}
                <div className="absolute inset-0" onClick={onClose}
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }} />

                {/* card */}
                <motion.div
                    initial={{ opacity: 0, y: 28, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.97 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    className="relative"
                    style={{ zIndex: 10, width: '100%', maxWidth: 480 }}
                >
                    <div style={{
                        borderRadius: 20, overflow: 'hidden', background: cardBg,
                        border: '1px solid rgba(139,92,246,0.12)',
                        boxShadow: '0 28px 56px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.25)',
                    }}>
                        {/* header accent */}
                        <div style={{
                            height: 2,
                            background: 'linear-gradient(90deg, transparent, #818cf8 30%, #a78bfa 50%, #818cf8 70%, transparent)',
                        }} />

                        {/* header row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <UploadCloud size={20} style={{ color: '#a78bfa' }} />
                                Cloud Save & Sync
                            </h2>
                            <motion.button
                                onClick={onClose}
                                style={{ padding: 7, borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', display: 'flex' }}
                                whileHover={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                                whileTap={{ scale: 0.93 }}
                            >
                                <X size={15} />
                            </motion.button>
                        </div>

                        {/* tab bar */}
                        <div style={{ display: 'flex', margin: '16px 24px 0', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                            <motion.div
                                layout
                                style={{
                                    position: 'absolute', top: 4, bottom: 4, width: 'calc(50% - 4px)', borderRadius: 9,
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                                    border: '1px solid rgba(139,92,246,0.2)',
                                    boxShadow: '0 2px 8px rgba(99,102,241,0.1)',
                                }}
                                animate={{ left: activeTab === 'github' ? 4 : 'calc(50%)' }}
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600,
                                        border: 'none', cursor: 'pointer', background: 'transparent', position: 'relative', zIndex: 1,
                                        color: activeTab === tab.id ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* body */}
                        <div style={{ padding: '24px 24px 28px' }}>
                            <AnimatePresence mode="wait">
                                {activeTab === 'github' ? (
                                    <motion.div key="gh" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                                        {!githubToken ? (
                                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                                <div style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', padding: '14px 20px', borderRadius: 12, fontSize: 13, marginBottom: 16 }}>
                                                    You must be logged in with GitHub to use this feature.
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                <div>
                                                    <label style={labelStyle}>Repository <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(owner/repo)</span></label>
                                                    <input style={inputStyle} value={ghRepo} onChange={e => setGhRepo(e.target.value)} placeholder="username/my-notes" onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.06)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }} />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>File Path <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(e.g. docs/notes.md)</span></label>
                                                    <input style={inputStyle} value={ghPath} onChange={e => setGhPath(e.target.value)} placeholder="docs/document.md" onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.06)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }} />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Commit Message</label>
                                                    <input style={inputStyle} value={ghCommitMsg} onChange={e => setGhCommitMsg(e.target.value)} placeholder="Update document" onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.06)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }} />
                                                </div>
                                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                                    <motion.button onClick={handleGitHubSave} disabled={isSaving} style={{ ...btnPrimary, opacity: isSaving ? 0.5 : 1 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                                                        <UploadCloud size={15} /> {isSaving ? 'Saving...' : 'Save'}
                                                    </motion.button>
                                                    <motion.button onClick={handleGitHubSync} disabled={isSyncing} style={{ ...btnOutline, opacity: isSyncing ? 0.5 : 1 }} whileHover={{ background: 'rgba(255,255,255,0.06)' }} whileTap={{ scale: 0.99 }}>
                                                        <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}
                                                    </motion.button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div key="drive" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                                        {!driveAvailable ? (
                                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                                <div style={{ background: 'rgba(234,179,8,0.08)', color: '#fbbf24', padding: '14px 20px', borderRadius: 12, fontSize: 13, marginBottom: 16 }}>
                                                    Google Drive is not configured. Add <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>VITE_GOOGLE_CLIENT_ID</code> to your .env file and add the Google API scripts to index.html.
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                <div>
                                                    <label style={labelStyle}>File Name</label>
                                                    <input style={inputStyle} value={driveFileName} onChange={e => setDriveFileName(e.target.value)} placeholder="document.md" onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.06)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }} />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Folder ID <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optional — saves to root if empty)</span></label>
                                                    <input style={inputStyle} value={driveFolderId} onChange={e => setDriveFolderId(e.target.value)} placeholder="Leave blank for root" onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.06)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }} />
                                                </div>
                                                {driveFileId && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(34,197,94,0.8)' }}>
                                                        <Check size={14} /> Linked to Drive file
                                                        <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11 }}>{driveFileId.slice(0, 12)}…</span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                                    <motion.button onClick={handleDriveSave} disabled={isSaving} style={{ ...btnPrimary, opacity: isSaving ? 0.5 : 1 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                                                        <UploadCloud size={15} /> {isSaving ? 'Saving...' : 'Save'}
                                                    </motion.button>
                                                    <motion.button onClick={handleDriveSync} disabled={isSyncing || !driveFileId} style={{ ...btnOutline, opacity: (isSyncing || !driveFileId) ? 0.5 : 1 }} whileHover={{ background: 'rgba(255,255,255,0.06)' }} whileTap={{ scale: 0.99 }}>
                                                        <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}
                                                    </motion.button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
