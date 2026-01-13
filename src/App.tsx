import { useState, useDeferredValue, useRef } from 'react';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { FormattingToolbar } from './components/FormattingToolbar';
import { openFile, saveFile, saveFileAs } from './utils/fileSystem';
import { FileUp, Save, FilePlus, LayoutTemplate, Columns, Download, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function App() {
    const [code, setCode] = useState(String.raw`# Welcome to M/L Editor

This is a **live** markdown editor with full LaTeX support.

## Math Example
The lift equation:

$$
L = \frac{1}{2} \rho v^2 S C_L
$$

## Features
- [x] Live Preview
- [x] Syntax Highlighting
- [x] LaTeX Support
- [x] Local File System Access
- [x] Offline Capable

## Code Examples

### Python
\`\`\`python
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

# Example usage
print(fibonacci(10))
\`\`\`

### JavaScript
\`\`\`javascript
const greet = (name) => {
    return \`Hello, \${name}!\`;
};

console.log(greet("World"));
\`\`\`
`);

    const [fileHandle, setFileHandle] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(true);
    const deferredCode = useDeferredValue(code);
    const [fontSize, setFontSize] = useState(16);
    const settings = {
        gfm: true,
        frontmatter: true,
        math: true,
        lineNumbers: true,
        wordWrap: true
    };
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
        // Ensure preview is visible for printing
        if (!showPreview) setShowPreview(true);
        // Small delay to allow render if preview was hidden
        setTimeout(() => window.print(), 100);
    };



    return (
        <div className="app-container">

            {/* Toolbar */}
            <header className="toolbar">
                <div className="toolbar-brand">
                    <span>M/L Editor</span>
                </div>

                <div className="toolbar-actions">
                    <ToolbarButton icon={<FilePlus size={18} />} onClick={() => { setCode(''); setFileHandle(null); }} label="New" />
                    <ToolbarButton icon={<FileUp size={18} />} onClick={handleOpen} label="Open" />
                    <ToolbarButton icon={<Save size={18} />} onClick={handleSave} label="Save" />
                    <ToolbarButton icon={<Download size={18} />} onClick={handleSaveAs} label="Save As" />
                    <ToolbarButton icon={<Printer size={18} />} onClick={handlePrint} label="Export PDF" />

                    <div className="toolbar-divider" />
                    <ToolbarButton
                        icon={showPreview ? <LayoutTemplate size={18} /> : <Columns size={18} />}
                        onClick={() => setShowPreview(!showPreview)}
                        label={showPreview ? "Hide Preview" : "Show Preview"}
                        active={showPreview}
                    />
                </div>
            </header>

            {/* Main Area */}
            <main className="main-area">
                <div className="editor-container flex flex-col h-full">
                    <FormattingToolbar
                        onInsert={(text, offset) => {
                            if (insertRef.current) insertRef.current(text, offset);
                        }}
                        onFontSizeChange={(delta) => setFontSize(prev => Math.max(10, Math.min(30, prev + delta)))}
                    />
                    <div className="flex-1 overflow-hidden relative border-r border-white/10">
                        <EditorPane
                            code={code}
                            onChange={(val) => setCode(val || '')}
                            onMount={(fn) => { insertRef.current = fn; }}
                            fontSize={fontSize}
                            settings={settings}
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {showPreview && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="preview-container"
                        >
                            <PreviewPane code={deferredCode} settings={settings} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

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
