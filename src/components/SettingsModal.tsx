import { X, Sparkles, Sliders, ChevronRight, Save, Key, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorSettings {
    gfm: boolean;
    frontmatter: boolean;
    math: boolean;
    lineNumbers: boolean;
    wordWrap: boolean;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    apiBaseUrl: string;
    setApiBaseUrl: (url: string) => void;
    aiEnabled: boolean;
    setAiEnabled: (enabled: boolean) => void;
    editorSettings: EditorSettings;
    setEditorSettings: (val: EditorSettings) => void;
    onTexManagerClick?: () => void;
}

export const SettingsModal = ({
    isOpen,
    onClose,
    apiKey,
    setApiKey,
    apiBaseUrl,
    setApiBaseUrl,
    aiEnabled,
    setAiEnabled,
    editorSettings,
    setEditorSettings,
    onTexManagerClick
}: SettingsModalProps) => {
    // Local state for buffering changes
    const [localKey, setLocalKey] = useState(apiKey);
    const [localApiBaseUrl, setLocalApiBaseUrl] = useState(apiBaseUrl);
    const [localEnabled, setLocalEnabled] = useState(aiEnabled);
    const [localSettings, setLocalSettings] = useState<EditorSettings>(editorSettings);

    // Section expansion state
    const [expandedSection, setExpandedSection] = useState<string | null>('ai');

    useEffect(() => {
        if (isOpen) {
            setLocalKey(apiKey);
            setLocalApiBaseUrl(apiBaseUrl);
            setLocalEnabled(aiEnabled);
            setLocalSettings(editorSettings);
        }
    }, [isOpen, apiKey, apiBaseUrl, aiEnabled, editorSettings]);

    const handleSave = () => {
        setApiKey(localKey);
        setApiBaseUrl(localApiBaseUrl);
        setAiEnabled(localEnabled);
        setEditorSettings(localSettings);
        onClose();
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const toggleSetting = (key: keyof EditorSettings) => {
        setLocalSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="settings-overlay-backdrop"
                    />

                    {/* Sliding Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="settings-slide-panel"
                        style={{ display: 'flex', flexDirection: 'column' }}
                    >
                        {/* Header */}
                        <div className="settings-header">
                            <h2 className="settings-title">Settings</h2>
                            <button
                                onClick={onClose}
                                className="settings-close-btn"
                                aria-label="Close settings"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="settings-content custom-scrollbar">

                            {/* AI Assistant Section */}
                            <div className="settings-section">
                                <button
                                    onClick={() => toggleSection('ai')}
                                    className="settings-section-btn group"
                                >
                                    <div className="settings-section-label">
                                        <div className="section-icon-wrapper blue">
                                            <Sparkles size={18} />
                                        </div>
                                        <h3 className="section-title">AI Assistant</h3>
                                    </div>
                                    <ChevronRight
                                        size={18}
                                        className={`section-arrow ${expandedSection === 'ai' ? 'expanded' : ''}`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {expandedSection === 'ai' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="settings-section-details"
                                        >

                                            {/* Enable Toggle */}
                                            <div className="settings-toggle-row">
                                                <div className="settings-toggle-label">
                                                    <span className="toggle-title">Enable AI Features</span>
                                                    <span className="toggle-subtitle">Code help & diagrams</span>
                                                </div>
                                                <button
                                                    onClick={() => setLocalEnabled(!localEnabled)}
                                                    className={`settings-toggle-switch ${localEnabled ? 'active' : ''}`}
                                                >
                                                    <span className={`settings-toggle-thumb ${localEnabled ? 'active' : ''}`} />
                                                </button>
                                            </div>

                                            {/* API Key Input */}
                                            {localEnabled && (
                                                <>
                                                    <div className="settings-input-group animate-in">
                                                        <label className="input-label">
                                                            <Key size={12} />
                                                            API Key
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={localKey}
                                                            onChange={(e) => setLocalKey(e.target.value)}
                                                            placeholder="sk-..."
                                                            className="settings-input"
                                                        />
                                                        <p className="input-hint">
                                                            Supports OpenAI, Anthropic, Gemini. Saved in cache for the session only.
                                                        </p>
                                                    </div>

                                                    <div className="settings-input-group animate-in">
                                                        <label className="input-label">
                                                            <Key size={12} />
                                                            API Base URL (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={localApiBaseUrl}
                                                            onChange={(e) => setLocalApiBaseUrl(e.target.value)}
                                                            placeholder="https://api.openai.com/v1"
                                                            className="settings-input"
                                                        />
                                                        <p className="input-hint">
                                                            Override for proxies or compatible providers (e.g. OpenRouter).
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="settings-divider" />

                            {/* Preferences Section */}
                            <div className="settings-section">
                                <button
                                    onClick={() => toggleSection('preferences')}
                                    className="settings-section-btn group"
                                >
                                    <div className="settings-section-label">
                                        <div className="section-icon-wrapper green">
                                            <Sliders size={18} />
                                        </div>
                                        <h3 className="section-title">Preferences</h3>
                                    </div>
                                    <ChevronRight
                                        size={18}
                                        className={`section-arrow ${expandedSection === 'preferences' ? 'expanded' : ''}`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {expandedSection === 'preferences' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="settings-section-details"
                                        >
                                            <div className="preference-item">
                                                <span className="pref-label">Line Numbers</span>
                                                <button
                                                    onClick={() => toggleSetting('lineNumbers')}
                                                    className={`settings-toggle-switch scale-75 origin-right ${localSettings.lineNumbers ? 'active' : ''}`}
                                                >
                                                    <span className={`settings-toggle-thumb ${localSettings.lineNumbers ? 'active' : ''}`} />
                                                </button>
                                            </div>
                                            <div className="preference-item">
                                                <span className="pref-label">Word Wrap</span>
                                                <button
                                                    onClick={() => toggleSetting('wordWrap')}
                                                    className={`settings-toggle-switch scale-75 origin-right ${localSettings.wordWrap ? 'active' : ''}`}
                                                >
                                                    <span className={`settings-toggle-thumb ${localSettings.wordWrap ? 'active' : ''}`} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="settings-divider" />

                            {/* TeX Packages Section */}
                            <div className="settings-section">
                                <button
                                    onClick={onTexManagerClick}
                                    className="settings-section-btn group"
                                >
                                    <div className="settings-section-label">
                                        <div className="section-icon-wrapper purple">
                                            <Package size={18} />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <h3 className="section-title">TeX Packages</h3>
                                            <span className="text-xs text-zinc-500">Manage LaTeX packages and features</span>
                                        </div>
                                    </div>
                                    <ChevronRight
                                        size={18}
                                        className="section-arrow"
                                    />
                                </button>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="settings-footer">
                            <button
                                onClick={handleSave}
                                className="settings-save-btn"
                            >
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
