import { useState, useDeferredValue, useRef, useEffect } from 'react';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { FormattingToolbar } from './components/FormattingToolbar';
import { openFile, saveFile, saveFileAs } from './utils/fileSystem';
import { FileUp, FilePlus, LayoutTemplate, Columns, Download, Printer, Maximize2, Minimize2, Sun, Moon, Settings, Sparkles, Save, User, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

import { LatexPreview } from './components/LatexPreview';
import { SettingsModal } from './components/SettingsModal';
import { AIAssistant } from './components/AIAssistant';
import { TexLiveManager } from './components/TexLiveManager';
import { AuthModal } from './components/AuthModal';
import { GitHubPushModal } from './components/GitHubPushModal';
import { Toaster } from 'react-hot-toast';

// Default LaTeX template with proper structure (compatible with latex.js)
const LATEX_TEMPLATE = String.raw`\documentclass{article}
\usepackage{amsmath}

\begin{document}

\section*{Welcome to LaTeX Mode}

This is a sample LaTeX document demonstrating various features available in the M/L Editor's TeX mode.

\subsection*{Mathematical Equations}

\textbf{Inline Math:} The famous equation $E = mc^2$ revolutionized physics.

\textbf{Display Math:} The quadratic formula:
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

\textbf{More Equations:}
$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$

$$\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}$$

\subsection*{Lists}

\textbf{Itemized List:}
\begin{itemize}
    \item First item with \textbf{bold text}
    \item Second item with \textit{italic text}
    \item Third item with regular text
\end{itemize}

\textbf{Enumerated List:}
\begin{enumerate}
    \item First numbered item
    \item Second numbered item
    \item Third numbered item
\end{enumerate}

\subsection*{Conclusion}

This template demonstrates the power of LaTeX for professional document typesetting. You can edit this content and see real-time preview on the right.

\end{document}
`;

// Helper function to load from local storage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
        console.warn(`Failed to load ${key} from storage`, e);
        return defaultValue;
    }
};

// Helper function to load from session storage
const loadFromSession = <T,>(key: string, defaultValue: T): T => {
    try {
        const saved = sessionStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
        console.warn(`Failed to load ${key} from session`, e);
        return defaultValue;
    }
};

function App() {
    const [code, setCode] = useState(String.raw`# Welcome to M/L Editor

## Mermaid Diagram Example
${"```"}mermaid
graph TD
    A[Start Process] --> B{Is Data Valid?}
    B -- Yes --> C[Process Data]
    B -- No --> D[Log Error]
    C --> E[Save to Database]
    D --> E
    E --> F([End])
    
    style B fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#333,stroke-width:2px
${"```"}

## LaTeX Equation Example
The Schrödinger equation:

$$
i\hbar \frac{\partial}{\partial t} \Psi(\mathbf{r},t) = \left [ - \frac{\hbar^2}{2m} \nabla^2 + V(\mathbf{r},t) \right ] \Psi(\mathbf{r},t)
$$
`);

    const [fileHandle, setFileHandle] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isLatexMode, setIsLatexMode] = useState(false);
    const [savedMarkdownContent, setSavedMarkdownContent] = useState<string | null>(null);
    const [savedLatexContent, setSavedLatexContent] = useState<string | null>(null);

    // Handle mode toggle with content switching
    const handleModeToggle = () => {
        if (isLatexMode) {
            // Switching from LaTeX to Markdown
            setSavedLatexContent(code);
            setCode(savedMarkdownContent || code);
            setIsLatexMode(false);
        } else {
            // Switching from Markdown to LaTeX
            setSavedMarkdownContent(code);
            setCode(savedLatexContent || LATEX_TEMPLATE);
            setIsLatexMode(true);
        }
    };
    const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

    // Auth State
    const [user, setUser] = useState<any>(null);
    const [githubToken, setGithubToken] = useState<string | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

    // Persistent State
    const [isDarkPaper, setIsDarkPaper] = useState(() => loadFromStorage('isDarkPaper', true));
    const deferredCode = useDeferredValue(code);
    const [fontSize, setFontSize] = useState(() => loadFromStorage('fontSize', 16));

    // Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTexManagerOpen, setIsTexManagerOpen] = useState(false);
    const [apiKey, setApiKey] = useState(() => loadFromSession('apiKey', ''));
    const [apiBaseUrl, setApiBaseUrl] = useState(() => loadFromStorage('apiBaseUrl', ''));
    const [aiEnabled, setAiEnabled] = useState(() => loadFromStorage('aiEnabled', false));
    const [editorSettings, setEditorSettings] = useState(() => loadFromStorage('editorSettings', {
        gfm: true,
        frontmatter: true,
        math: true,
        lineNumbers: true,
        wordWrap: true
    }));

    // Persist settings changes
    useEffect(() => {
        localStorage.setItem('isDarkPaper', JSON.stringify(isDarkPaper));
        localStorage.setItem('fontSize', JSON.stringify(fontSize));
        sessionStorage.setItem('apiKey', JSON.stringify(apiKey));
        localStorage.setItem('apiBaseUrl', JSON.stringify(apiBaseUrl));
        localStorage.setItem('aiEnabled', JSON.stringify(aiEnabled));
        localStorage.setItem('editorSettings', JSON.stringify(editorSettings));
    }, [isDarkPaper, fontSize, apiKey, apiBaseUrl, aiEnabled, editorSettings]);

    const insertRef = useRef<((text: string, offset?: number) => void) | null>(null);

    const handleOpen = async () => {
        const result = await openFile();
        if (result) {
            setCode(result.content);
            setFileHandle(result.handle);
        }
    };

    const handleSave = async () => {
        const handle = await saveFile(fileHandle, code);
        if (handle) {
            setFileHandle(handle);
        }
    };

    const handleSaveAs = async () => {
        const handle = await saveFileAs(code);
        if (handle) {
            setFileHandle(handle);
        }
    };

    const handlePrint = () => {
        if (!showPreview) setShowPreview(true);
        setTimeout(() => window.print(), 100);
    };

    return (
        <>
            <div className="app-container">
                <header className="toolbar">
                    <div className="toolbar-brand">
                        <span>M/L Editor</span>
                    </div>

                    <div className="toolbar-actions">
                        {/* View Controls remain in header */}
                        <button
                            onClick={handleModeToggle}
                            className={`toolbar-btn ${isLatexMode ? 'active' : ''} font-mono text-xs`}
                            title="Toggle Full LaTeX Mode"
                        >
                            <span className="font-bold">TEX</span>
                            <span>{isLatexMode ? "LaTeX Mode" : "Markdown"}</span>
                        </button>

                        <button
                            onClick={() => setIsDarkPaper(!isDarkPaper)}
                            className="toolbar-btn"
                            title={isDarkPaper ? "Switch to Light Paper" : "Switch to Dark Paper"}
                        >
                            {isDarkPaper ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <div className="toolbar-divider" />

                        {/* AI Assist Button (Visible if enabled) */}
                        {aiEnabled && (
                            <button
                                className={`toolbar-btn text-blue-400 hover:text-blue-300 transition-colors ${isAiAssistantOpen ? 'bg-blue-500/10' : ''}`}
                                title="Toggle AI Assistant"
                                onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
                            >
                                <Sparkles size={18} />
                                <span className="hidden sm:inline">Assist</span>
                            </button>
                        )}

                        <ToolbarButton
                            icon={showPreview ? <LayoutTemplate size={18} /> : <Columns size={18} />}
                            onClick={() => {
                                if (isFullScreen) {
                                    setIsFullScreen(false);
                                } else {
                                    setShowPreview(!showPreview);
                                }
                            }}
                            label={showPreview && !isFullScreen ? "Hide Preview" : "Show Preview"}
                            active={showPreview && !isFullScreen}
                        />
                        <ToolbarButton
                            icon={isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            onClick={() => {
                                const newFullScreen = !isFullScreen;
                                setIsFullScreen(newFullScreen);
                                if (newFullScreen) setShowPreview(true);
                            }}
                            label={isFullScreen ? "Exit Full Screen" : "Full Screen Preview"}
                            active={isFullScreen}
                        />
                        <ToolbarButton
                            icon={user ? (
                                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email || 'U'}`} alt="User" className="w-[18px] h-[18px] rounded-full" />
                            ) : (
                                <User size={18} />
                            )}
                            onClick={() => {
                                if (user) {
                                    // Normally you'd want a dropdown here to logout, but for simplicity we'll just open AuthModal or handle logout
                                    // For now, let's just make it a toggle
                                    setIsAuthModalOpen(true);
                                } else {
                                    setIsAuthModalOpen(true);
                                }
                            }}
                            label={user ? (user.displayName || "Profile") : "Login"}
                        />
                        <ToolbarButton
                            icon={<Settings size={18} />}
                            onClick={() => setIsSettingsOpen(true)}
                            label="Settings"
                        />
                    </div>
                </header>

                <main className="main-area">
                    {!isFullScreen && (
                        <div className="editor-container flex flex-col h-full">
                            <FormattingToolbar
                                onInsert={(text, offset) => {
                                    if (insertRef.current) insertRef.current(text, offset);
                                }}
                                onFontSizeChange={(delta) => setFontSize(prev => Math.max(10, Math.min(30, prev + delta)))}
                                onTexManagerClick={() => setIsTexManagerOpen(true)}
                            />
                            <div className="flex-1 overflow-hidden relative border-r border-white/10">
                                <EditorPane
                                    code={code}
                                    onChange={(val) => setCode(val || '')}
                                    onMount={(fn) => { insertRef.current = fn; }}
                                    fontSize={fontSize}
                                    settings={editorSettings}
                                />
                            </div>
                        </div>
                    )}

                    <AnimatePresence>
                        {showPreview && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="preview-container"
                            >
                                {isLatexMode ? (
                                    <LatexPreview code={deferredCode} paperMode={isDarkPaper ? 'dark' : 'light'} />
                                ) : (
                                    <PreviewPane code={deferredCode} settings={editorSettings} isDark={isDarkPaper} />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main >

                {/* Speed Dial Menu */}
                <FileSpeedDial
                    onNew={() => { setCode(''); setFileHandle(null); }}
                    onOpen={handleOpen}
                    onSave={handleSave}
                    onSaveAs={handleSaveAs}
                    onExport={handlePrint}
                    onPushGitHub={() => setIsGitHubModalOpen(true)}
                />
            </div >

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                apiKey={apiKey}
                setApiKey={setApiKey}
                apiBaseUrl={apiBaseUrl}
                setApiBaseUrl={setApiBaseUrl}
                aiEnabled={aiEnabled}
                setAiEnabled={setAiEnabled}
                editorSettings={editorSettings}
                setEditorSettings={setEditorSettings}
                onTexManagerClick={() => {
                    setIsSettingsOpen(false);
                    setIsTexManagerOpen(true);
                }}
            />

            <AIAssistant
                isOpen={isAiAssistantOpen}
                onClose={() => setIsAiAssistantOpen(false)}
                apiKey={apiKey}
                apiBaseUrl={apiBaseUrl}
                code={deferredCode}
            />

            <TexLiveManager
                isOpen={isTexManagerOpen}
                onClose={() => setIsTexManagerOpen(false)}
                onInsert={(text) => {
                    if (insertRef.current) insertRef.current(text, 0);
                }}
                code={code}
            />

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onLoginSuccess={(u: any, token?: string) => {
                    setUser(u);
                    if (token) setGithubToken(token);
                }}
            />

            <GitHubPushModal
                isOpen={isGitHubModalOpen}
                onClose={() => setIsGitHubModalOpen(false)}
                githubToken={githubToken}
                documentContent={code}
            />

            <Toaster position="bottom-right" />
        </>
    );
}

const FileSpeedDial = ({ onNew, onOpen, onSave, onSaveAs, onExport, onPushGitHub }: any) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    const menuItems = [
        { icon: <Github size={20} />, label: "Push to GitHub", onClick: onPushGitHub },
        { icon: <Printer size={20} />, label: "Export PDF", onClick: onExport },
        { icon: <Download size={20} />, label: "Save As", onClick: onSaveAs },
        { icon: <Save size={20} />, label: "Save", onClick: onSave },
        { icon: <FileUp size={20} />, label: "Open File", onClick: onOpen },
        { icon: <FilePlus size={20} />, label: "New File", onClick: onNew },
    ];
    // ... rest of component

    return (
        <div className="speed-dial-container">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="speed-dial-menu-wrapper"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                    >
                        {menuItems.map((item, index) => (
                            <motion.div
                                key={item.label}
                                custom={index}
                                variants={{
                                    hidden: { opacity: 0, y: 20, scale: 0.8 },
                                    visible: (i) => ({
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            delay: i * 0.05,
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 20
                                        }
                                    })
                                }}
                                className="speed-dial-item group"
                            >
                                <span className="speed-dial-label">
                                    {item.label}
                                </span>
                                <button
                                    onClick={() => { item.onClick(); setIsOpen(false); }}
                                    className="speed-dial-action-btn"
                                    title={item.label}
                                >
                                    {item.icon}
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={toggleOpen}
                animate={{ rotate: isOpen ? 45 : 0 }}
                className="speed-dial-main-btn"
                title="File Actions"
            >
                <Download size={28} strokeWidth={2.5} />
            </motion.button>
        </div>
    );
};

const ToolbarButton = ({ icon, onClick, label, active = false }: any) => (
    <button
        onClick={onClick}
        className={`toolbar-btn ${active ? 'active' : ''}`}
        title={label}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export default App;
