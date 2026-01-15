import { useEffect, useRef, useState } from 'react';

interface LatexPreviewProps {
    code: string;
    paperMode?: 'light' | 'dark';
}

export const LatexPreview = ({ code, paperMode = 'dark' }: LatexPreviewProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [iframeReady, setIframeReady] = useState(false);

    // Initial HTML content with styles
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LaTeX Preview</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/css/katex.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/css/latex.css">
            <script src="https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/js/base.js"></script>
            <style>
                body { 
                    background: transparent;
                    margin: 0; 
                    padding: 2rem; 
                    display: flex; 
                    justify-content: center; 
                    min-height: 100vh;
                    font-family: 'Latin Modern Roman', serif;
                }
                .latex-content { 
                    background: ${paperMode === 'dark' ? '#3b3b3b' : 'white'}; 
                    color: ${paperMode === 'dark' ? '#f0f0f0' : 'black'}; 
                    width: 100%; 
                    max-width: 8.5in; 
                    min-height: 11in; 
                    padding: 0.8in; 
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
                    box-sizing: border-box;
                    word-wrap: break-word;
                    transition: background 0.3s, color 0.3s;
                }
                /* Improve list spacing in resume look */
                .latex-content ul { padding-left: 1.2rem; margin-top: 0.2rem; margin-bottom: 0.2rem; }
                .latex-content li { margin-bottom: 0.1rem; }
                .latex-content h1, .latex-content h2 { border-bottom: 1px solid #ccc; padding-bottom: 0.3rem; margin-top: 1rem; }
            </style>
        </head>
        <body>
            <div id="latex-root" class="latex-content"></div>
        </body>
        </html>
    `;

    useEffect(() => {
        let isMounted = true;

        const renderLatex = async () => {
            if (!iframeReady || !code.trim()) return;
            if (isMounted) setError(null);

            try {
                // Dynamic import to avoid SSR issues if any
                const latexjs = await import('latex.js');
                const { parse, HtmlGenerator } = latexjs.default || latexjs;

                // --- ROBUST PRE-PROCESSING START ---
                let processedCode = code;

                // 1. Ensure minimal preamble exists if documentclass is missing
                if (processedCode.includes('\\begin{document}') && !processedCode.includes('\\documentclass')) {
                    processedCode = `\\documentclass{article}\n\\usepackage[margin=1in]{geometry}\n` + processedCode;
                } else if (!processedCode.includes('\\begin{document}')) {
                    // Wrap raw fragments
                    processedCode = `\\documentclass{article}\n\\begin{document}\n${processedCode}\n\\end{document}`;
                }

                // 2. Aggressively strip unsupported/problematic packages
                const ignoredPackages = [
                    'fullpage', 'titlesec', 'marvosym', 'verbatim', 'enumitem',
                    'fancyhdr', 'geometry', 'xcolor', 'tabularx', 'fontawesome5'
                ];
                ignoredPackages.forEach(pkg => {
                    const regex = new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\s*\\{${pkg}\\}`, 'g');
                    processedCode = processedCode.replace(regex, '');
                });

                // 3. Strip problematic commands
                processedCode = processedCode
                    .replace(/\\input\{[^}]+\}/g, '')
                    .replace(/\\pagestyle\{[^}]+\}/g, '')
                    .replace(/\\fancyhf\{[^}]*\}/g, '')
                    .replace(/\\fancyfoot\{[^}]*\}/g, '');

                // 4. INJECT POLYFILLS for common Resume templates (AwesomeCV, Deedy, etc.)
                // We define these as standard LaTeX macros that map to basic lists/text
                const polyfills = `
                    % Resume Polyfills
                    \\newcommand{\\resumeItem}[1]{\\item #1}
                    \\newcommand{\\resumeSubheading}[4]{\\item \\textbf{#1} \\hfill #2 \\\\ \\textit{#3} \\hfill \\textit{#4}}
                    \\newcommand{\\resumeSubSubheading}[2]{\\item \\textbf{#1} \\hfill #2}
                    \\newcommand{\\resumeProjectHeading}[2]{\\item \\textbf{#1} \\hfill #2}
                    \\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}}
                    \\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
                    \\newcommand{\\resumeItemListStart}{\\begin{itemize}}
                    \\newcommand{\\resumeItemListEnd}{\\end{itemize}}
                    
                    % Layout Polyfills
                    \\newcommand{\\section}[1]{\\subsection*{#1}} 
                    \\newcommand{\\name}[1]{\\section*{#1}}
                    \\providecommand{\\small}{}
                    \\providecommand{\\Huge}{\\huge}
                    \\providecommand{\\href}[2]{\\texttt{#1}}
                `;

                // Insert polyfills right after documentclass
                processedCode = processedCode.replace(/(\\documentclass\[.*?\]\{.*?\})|(\\documentclass\{.*?\})/, '$1$2\n' + polyfills);

                // --- PROCESSING END ---

                const generator = new HtmlGenerator({ hyphenate: false });
                const doc = parse(processedCode, { generator: generator });

                if (!isMounted) return;

                const iframe = iframeRef.current;
                const docFrame = iframe?.contentDocument || iframe?.contentWindow?.document;

                if (docFrame) {
                    const root = docFrame.getElementById('latex-root');
                    if (root) {
                        root.innerHTML = '';
                        // Properly adopt the node
                        const fragment = doc.domFragment();
                        if (fragment) {
                            root.appendChild(docFrame.adoptNode(fragment));
                        }
                    }
                }

            } catch (e: any) {
                console.error("LaTeX Rendering Error:", e);
                if (isMounted) {
                    // Improved error message cleaning
                    let msg = e.message || "Unknown error";
                    if (msg.includes("Expected")) msg = "Syntax Error: " + msg;
                    setError(msg);
                }
            }
        };

        // Debounce rendering
        const timeout = setTimeout(renderLatex, 600);
        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [code, iframeReady, paperMode]);

    return (
        <div className="flex flex-col h-full relative bg-zinc-900 border-l border-white/10">
            {/* Error Banner */}
            {error && (
                <div className="absolute bottom-6 right-6 z-50 max-w-lg w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-red-950/95 backdrop-blur border border-red-500/30 text-red-100 p-4 rounded-xl shadow-2xl flex gap-3 items-start">
                        <div className="bg-red-500/20 p-2 rounded-lg shrink-0 text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-red-200 mb-1">Compilation Failed</h3>
                            <p className="font-mono text-xs opacity-80 break-words leading-relaxed">{error}</p>
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => setError(null)}
                                    className="text-xs bg-red-900/50 hover:bg-red-800/50 text-red-200 px-3 py-1.5 rounded-md transition-colors font-medium"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Frame */}
            <div className="flex-1 overflow-hidden relative">
                {!iframeReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-500 gap-2">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Initializing TeX Engine...</span>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    className={`w-full h-full border-none transition-opacity duration-500 ${iframeReady ? 'opacity-100' : 'opacity-0'}`}
                    title="LaTeX Preview"
                    srcDoc={htmlContent}
                    onLoad={() => setIframeReady(true)}
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
        </div>
    );
};
