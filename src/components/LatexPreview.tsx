
import { useEffect, useRef, useState } from 'react';

// Helper for robust LaTeX command parsing (handles nested braces)
const replaceLatexCommand = (
    code: string,
    commandName: string,
    numArgs: number,
    replacer: (args: string[]) => string
): string => {
    let result = code;
    let searchIndex = 0;
    let iterations = 0;

    while (iterations++ < 5000) {
        const cmdIndex = result.indexOf(commandName, searchIndex);
        if (cmdIndex === -1) break;

        // Ensure it's the start of a command (not part of another word)
        // e.g. \textcolor vs \mytextcolor. \ is required at start of commandName.
        // Assuming commandName starts with '\'
        // We also check previous char to avoid false positives if we needed to.

        let currentIndex = cmdIndex + commandName.length;

        // Skip whitespace
        while (currentIndex < result.length && /\s/.test(result[currentIndex])) currentIndex++;

        // Handle Optional Argument []
        if (result[currentIndex] === '[') {
            let bracketDepth = 1;
            currentIndex++;
            while (currentIndex < result.length && bracketDepth > 0) {
                if (result[currentIndex] === '[') bracketDepth++;
                else if (result[currentIndex] === ']') bracketDepth--;
                currentIndex++;
            }
        }

        const args: string[] = [];
        let parseError = false;
        let matchEnd = currentIndex;

        for (let i = 0; i < numArgs; i++) {
            while (currentIndex < result.length && /\s/.test(result[currentIndex])) currentIndex++;

            if (currentIndex >= result.length || result[currentIndex] !== '{') {
                parseError = true;
                break;
            }

            const startArg = currentIndex + 1;
            let braceDepth = 1;
            currentIndex++;

            while (currentIndex < result.length && braceDepth > 0) {
                if (result[currentIndex] === '{') braceDepth++;
                else if (result[currentIndex] === '}') braceDepth--;
                currentIndex++;
            }

            if (braceDepth !== 0) {
                parseError = true; // Unbalanced
                break;
            }

            args.push(result.substring(startArg, currentIndex - 1));
            matchEnd = currentIndex;
        }

        if (parseError) {
            searchIndex = cmdIndex + 1; // Skip this char
            continue;
        }

        // Apply replacement
        const replacement = replacer(args);
        const before = result.substring(0, cmdIndex);
        const after = result.substring(matchEnd);

        result = before + replacement + after;

        // Resume search after replacement
        searchIndex = cmdIndex + replacement.length;
    }
    return result;
};

// Helper to robustly remove LaTeX commands with specific signatures
// signature: string of 'M' (Mandatory {}) and 'O' (Optional [])
// e.g. "MOOM" means {}{}[]{}
const removeLatexCommand = (code: string, cmdName: string, signature: string): string => {
    let result = code;
    // We loop because regex global replacement is hard with balanced nested braces
    let iterations = 0;
    while (iterations++ < 1000) {
        const cmdIndex = result.indexOf(cmdName);
        if (cmdIndex === -1) break;

        // Safety: verify strictly at start of command (preceded by non-letter or is start) -- simplified for now

        let currentIndex = cmdIndex + cmdName.length;
        let scanIndex = currentIndex;
        let matchFailed = false;

        // Skip initial whitespace
        while (scanIndex < result.length && /\s/.test(result[scanIndex])) scanIndex++;

        // Scan arguments according to signature
        for (const type of signature) {
            // Skip whitespace between args
            while (scanIndex < result.length && /\s/.test(result[scanIndex])) scanIndex++;

            if (scanIndex >= result.length) { matchFailed = true; break; }

            const char = result[scanIndex];

            if (type === 'M') {
                if (char !== '{') { matchFailed = true; break; }
                let depth = 1;
                scanIndex++;
                while (scanIndex < result.length && depth > 0) {
                    if (result[scanIndex] === '{') depth++;
                    else if (result[scanIndex] === '}') depth--;
                    scanIndex++;
                }
            } else if (type === 'O') {
                if (char !== '[') {
                    // Optional arg not present, continue to next arg type without advancing scanIndex (except whitespace)
                    continue;
                }
                let depth = 1;
                scanIndex++;
                while (scanIndex < result.length && depth > 0) {
                    if (result[scanIndex] === '[') depth++;
                    else if (result[scanIndex] === ']') depth--;
                    scanIndex++;
                }
            }
        }

        if (matchFailed || scanIndex > result.length) {
            // If we failed to match the structure, we can't safely remove it. 
            // We skip this occurrence by replacing the command name with a unique placeholder temporarily
            // OR we just break. But breaking leaves it there.
            // Better: just strip the command keyword to avoid infinite loop, but this might break things.
            // Safest: assume it's not the command we are looking for (e.g. \titleformat* vs \titleformat)
            // For now, let's just abort this replacement to avoid hanging.
            break;
        }

        // Remove the command and its consumed arguments
        result = result.substring(0, cmdIndex) + result.substring(scanIndex);
    }
    return result;
};

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

            const logError = (msg: string, details?: any) => {
                console.warn('[LaTeX Preview]', msg, details || '');
            };

            const tryParseWithFallback = (latexCode: string, latexjs: any, attempt: number = 1): { doc?: any; error?: string } => {
                const { parse, HtmlGenerator } = latexjs.default || latexjs;

                try {
                    const generator = new HtmlGenerator({ hyphenate: false });
                    const doc = parse(latexCode, { generator: generator });
                    return { doc };
                } catch (e: any) {
                    const errorMsg = e.message || String(e);
                    logError(`Parse attempt ${attempt} failed:`, errorMsg);

                    // Fallback strategy 1: Remove complex structures and retry
                    if (attempt === 1) {
                        if (errorMsg.includes('Expected') || errorMsg.includes('unexpected')) {
                            let simplified = latexCode;

                            // Remove complex environments that might cause issues
                            const complexEnvs = ['figure', 'table', 'minipage', 'wrapfigure', 'subfigure'];
                            complexEnvs.forEach(env => {
                                const regex = new RegExp(`\\\\begin\\{${env}\\}[\\s\\S]*?\\\\end\\{${env}\\}`, 'gi');
                                simplified = simplified.replace(regex, '');
                            });

                            // Remove problematic commands
                            simplified = simplified
                                .replace(/\\newcommand\{[^}]*\}(?:\[[^\]]*\])?\{[^}]*\}/g, '')
                                .replace(/\\renewcommand\{[^}]*\}(?:\[[^\]]*\])?\{[^}]*\}/g, '')
                                .replace(/\\def[^{]*\{[^}]*\}/g, '')
                                .replace(/\\DeclareMathOperator\{[^}]*\}\{[^}]*\}/g, '');

                            if (simplified !== latexCode) {
                                return tryParseWithFallback(simplified, latexjs, 2);
                            }
                        }
                    }

                    // Fallback strategy 2: Extract and render only document body
                    if (attempt === 2) {
                        const docBodyMatch = latexCode.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
                        if (docBodyMatch) {
                            const bodyContent = docBodyMatch[1].trim();
                            const simpleDoc = `\\documentclass{article}\n\\begin{document}\n${bodyContent}\n\\end{document}`;
                            return tryParseWithFallback(simpleDoc, latexjs, 3);
                        }
                    }

                    // Fallback strategy 3: Render as plain text with basic formatting
                    if (attempt === 3) {
                        const plainText = latexCode
                            .replace(/\\[a-zA-Z]+/g, '')
                            .replace(/\{|\}/g, '')
                            .replace(/\$+/g, '')
                            .replace(/&/g, '')
                            .replace(/\\\\/g, '\n')
                            .replace(/\n\s*\n/g, '\n\n')
                            .trim();

                        if (plainText.length > 10) {
                            const minimalDoc = `\\documentclass{article}\n\\begin{document}\n${plainText}\n\\end{document}`;
                            return tryParseWithFallback(minimalDoc, latexjs, 4);
                        }
                    }

                    return { error: errorMsg };
                }
            };

            try {
                // Dynamic import
                const latexjs = await import('latex.js');

                // --- ROBUST PRE-PROCESSING START ---
                let processedCode = code;
                const fixesApplied: string[] = [];

                if (fixesApplied.length > 0) {
                    logError('Applied automatic fixes:', fixesApplied.join(', '));
                }

                // 0. EXTENSIVE DOCUMENTCLASS SANITIZATION
                const originalDocClass = processedCode.match(/\\documentclass(?:\*)?(\[[^\]]*\])?\{([^}]+)\}/);
                processedCode = processedCode.replace(/\\documentclass(?:\*)?(\[[^\]]*\])?\{([^}]+)\}/g, (_match, _options, docType) => {
                    const baseType = docType.trim() || 'article';
                    return `\\documentclass{${baseType}}`;
                });
                if (originalDocClass) fixesApplied.push('Sanitized documentclass options');

                // 0.5. FIX COMMON SYNTAX ERRORS
                // Fix missing \\ before document
                if (processedCode.includes('documentclass') && !processedCode.includes('\\documentclass')) {
                    processedCode = processedCode.replace(/documentclass/g, '\\documentclass');
                    fixesApplied.push('Added missing backslash to documentclass');
                }
                // Fix missing backslash on begin/end
                processedCode = processedCode.replace(/\nbegin\{/g, '\n\\begin{');
                processedCode = processedCode.replace(/\nend\{/g, '\n\\end{');

                // 1. Ensure minimal preamble
                if (processedCode.includes('\\begin{document}') && !processedCode.includes('\\documentclass')) {
                    processedCode = `\\documentclass{article}\n\\usepackage[margin=1in]{geometry}\n` + processedCode;
                    fixesApplied.push('Added missing documentclass');
                } else if (!processedCode.includes('\\begin{document}')) {
                    const usepackageRegex = /\\usepackage(?:\[[^\]]*\])?\s*\{[^}]+\}/g;
                    const usepackages = processedCode.match(usepackageRegex) || [];
                    const contentWithoutPackages = processedCode.replace(usepackageRegex, '').trim();
                    const preamblePackages = usepackages.join('\n');

                    let documentBody = contentWithoutPackages;
                    if (!documentBody) {
                        documentBody = '\\vspace{1cm}\\begin{center}\\textbf{Document preview ready}\\\\\\small Add content between \\texttt{\\textbackslash begin\{document\}} and \\texttt{\\textbackslash end\{document\}}\\end{center}';
                        fixesApplied.push('Added placeholder content');
                    }

                    processedCode = `\\documentclass{article}\n\\usepackage[margin=1in]{geometry}\n${preamblePackages}\n\\begin{document}\n${documentBody}\n\\end{document}`;
                    fixesApplied.push('Wrapped content in document environment');
                }

                // 1.5. CHECK DOCUMENT STRUCTURE
                const beginDocCount = (processedCode.match(/\\begin\{document\}/g) || []).length;
                const endDocCount = (processedCode.match(/\\end\{document\}/g) || []).length;

                if (beginDocCount > 1) {
                    processedCode = processedCode.replace(/\\begin\{document\}(?![\s\S]*\\end\{document\})/g, '');
                    fixesApplied.push('Removed duplicate \\begin{document}');
                }
                if (endDocCount > 1) {
                    processedCode = processedCode.replace(/\\end\{document\}(?!$)/g, '');
                    fixesApplied.push('Removed duplicate \\end{document}');
                }
                if (beginDocCount !== endDocCount) {
                    if (!processedCode.endsWith('\\end{document}')) {
                        processedCode = processedCode.trim() + '\n\\end{document}';
                        fixesApplied.push('Added missing \\end{document}');
                    }
                }

                // 2. PARSE CUSTOM COLORS (Before stripping)
                const customColors: Record<string, string> = {};
                const defineColorRegex = /\\definecolor\{([^}]+)\}\{(RGB|HTML)\}\{([^}]+)\}/gi;
                let match;
                while ((match = defineColorRegex.exec(processedCode)) !== null) {
                    const [_, name, model, spec] = match;
                    if (model.toUpperCase() === 'RGB') {
                        const [r, g, b] = spec.split(',').map(s => s.trim());
                        customColors[name] = `rgb(${r},${g},${b})`;
                    } else if (model.toUpperCase() === 'HTML') {
                        customColors[name] = `#${spec}`;
                    }
                }

                const colorletRegex = /\\colorlet\{([^}]+)\}\{([^}]+)\}/gi;
                while ((match = colorletRegex.exec(processedCode)) !== null) {
                    const [_, name, source] = match;
                    const baseColor = source.split('!')[0].trim();
                    if (customColors[baseColor]) {
                        customColors[name] = customColors[baseColor];
                    } else {
                        customColors[name] = baseColor;
                    }
                }

                // 3. STRIP PACKAGES (Extensive List)
                const ignoredPackages = [
                    'fullpage', 'titlesec', 'marvosym', 'verbatim', 'enumitem',
                    'tabularx', 'fontawesome5', 'hyperref', 'xcolor', 'graphicx',
                    'amssymb', 'geometry', 'fancyhdr', 'multicol', 'float',
                    'fontspec', 'babel', 'microtype', 'biblatex', 'listings',
                    'tikz', 'pgfplots', 'siunitx', 'physics', 'inputenc',
                    'color', 'latexsym', 'mathptmx', 'fontenc', 'ulem', 'framed'
                ];
                ignoredPackages.forEach(pkg => {
                    const regex = new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\s*\\{${pkg}\\}`, 'g');
                    processedCode = processedCode.replace(regex, '');
                });

                // 3.5. STRIP ALL \newcommand AND \renewcommand DEFINITIONS
                // These are complex multi-line definitions that latex.js cannot parse
                // We need to handle nested braces correctly
                const stripCommandDefinition = (code: string, cmdName: string): string => {
                    let result = code;
                    let iterations = 0;
                    while (iterations++ < 500) {
                        const cmdIndex = result.indexOf(cmdName);
                        if (cmdIndex === -1) break;

                        let currentIndex = cmdIndex + cmdName.length;
                        let braceDepth = 0;
                        let started = false;
                        let endIndex = currentIndex;

                        // Skip to find all the braces of the command definition
                        while (currentIndex < result.length) {
                            const char = result[currentIndex];
                            if (char === '{') {
                                braceDepth++;
                                started = true;
                            } else if (char === '}') {
                                braceDepth--;
                            }
                            currentIndex++;
                            if (started && braceDepth === 0) {
                                endIndex = currentIndex;
                                // Check if there's another argument (for \newcommand{cmd}[args]{def})
                                let lookAhead = currentIndex;
                                while (lookAhead < result.length && /\s/.test(result[lookAhead])) lookAhead++;
                                if (result[lookAhead] === '[' || result[lookAhead] === '{') {
                                    // Continue parsing
                                    continue;
                                }
                                break;
                            }
                        }

                        result = result.substring(0, cmdIndex) + result.substring(endIndex);
                    }
                    return result;
                };

                processedCode = stripCommandDefinition(processedCode, '\\newcommand');
                processedCode = stripCommandDefinition(processedCode, '\\renewcommand');
                processedCode = stripCommandDefinition(processedCode, '\\def');

                // 4. CLEAN PREAMBLE COMMANDS
                processedCode = processedCode
                    .replace(/\\input\{[^}]*\}/g, '') // Remove \input{...} (e.g. glyphtounicode)
                    .replace(/\\pagestyle\{[^}]*\}/g, '')
                    // Replace tabularx with tabular (ignore width)
                    .replace(/\\begin\{tabularx\}\{[^}]*\}\{([^}]*)\}/g, (_match, cols) => {
                        // Replace X columns with l (left align) as fallback
                        const newCols = cols.replace(/X/g, 'l');
                        return `\\begin{tabular}{${newCols}}`;
                    })
                    .replace(/\\end\{tabularx\}/g, '\\end{tabular}')
                    // Replace tabular* with simple tabular (strip width and @{} specs)
                    .replace(/\\begin\{tabular\*\}\{[^}]*\}(?:\[[^\]]*\])?\{([^}]*)\}/g, (_match, cols) => {
                        // Clean up column spec: remove @{...} specs
                        const cleanCols = cols.replace(/@\{[^}]*\}/g, '').replace(/[^lcr|]/g, '');
                        return `\\begin{tabular}{${cleanCols || 'll'}}`;
                    })
                    .replace(/\\end\{tabular\*\}/g, '\\end{tabular}');

                // --- RESUME TEMPLATE CLEANUP ---
                // titlesec commands (latex.js does not support these)
                // We remove them to prevent crashes using robust parser.

                processedCode = removeLatexCommand(processedCode, '\\titleformat', 'OMOOMOO'); // Up to 7 mixed args, usually {}{}{}{}[.]
                processedCode = removeLatexCommand(processedCode, '\\titlespacing', 'OMMMO'); // Optional star * handled by generic string replace first? 

                // titlespacing sometimes has star *, so we strip that first
                processedCode = processedCode.replace(/\\titlespacing\*/g, '\\titlespacing');
                processedCode = removeLatexCommand(processedCode, '\\titlespacing', 'OMMMO');

                processedCode = processedCode
                    // Common resume garbage
                    .replace(/\\input\{gl[^}]*\}/g, '') // glyphtounicode
                    .replace(/\\pdfgentounicode=[0-1]/g, '')
                    .replace(/\\urlstyle\{[^}]*\}/g, '')
                    // Strip \vcenter and \hbox commands (used in bullet definitions)
                    .replace(/\$\\vcenter\{\\hbox\{[^}]*\}\}\$/g, '•')
                    .replace(/\\vcenter\{[^}]*\}/g, '')
                    .replace(/\\hbox\{[^}]*\}/g, '')
                    // Strip custom resume commands that won't be defined
                    .replace(/\\resumeItem\{/g, '\\item{')
                    .replace(/\\resumeSubItem\{/g, '\\item{')
                    .replace(/\\resumeSubheading\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g,
                        '\\textbf{$1} \\hfill $2 \\\\ \\textit{$3} \\hfill \\textit{$4}')
                    .replace(/\\resumeProjectHeading\{([^}]*)\}\{([^}]*)\}/g, '$1 \\hfill \\textbf{$2}')
                    .replace(/\\resumeSubHeadingListStart/g, '\\begin{itemize}')
                    .replace(/\\resumeSubHeadingListEnd/g, '\\end{itemize}')
                    .replace(/\\resumeItemListStart/g, '\\begin{itemize}')
                    .replace(/\\resumeItemListEnd/g, '\\end{itemize}')
                    // Strip \classesList
                    .replace(/\\classesList\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g, '$1 $2 $3 $4')

                    // Dimensions usually break things in HTML mode
                    .replace(/\\addtolength\{[^}]*\}\{[^}]*\}/g, '')
                    .replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, '');

                // 5. STRIP UNSUPPORTED COMMANDS (instead of injecting polyfills)
                // latex.js does not support \providecommand, so we strip commands that would need polyfilling
                processedCode = processedCode
                    .replace(/\\fancyhf\{[^}]*\}/g, '')
                    .replace(/\\fancyhead(?:\[[^\]]*\])?\{[^}]*\}/g, '')
                    .replace(/\\fancyfoot(?:\[[^\]]*\])?\{[^}]*\}/g, '')
                    .replace(/\\cfoot\{[^}]*\}/g, '')
                    .replace(/\\rhead\{[^}]*\}/g, '')
                    .replace(/\\lhead\{[^}]*\}/g, '')
                    .replace(/\\rfoot\{[^}]*\}/g, '')
                    .replace(/\\lfoot\{[^}]*\}/g, '')
                    .replace(/\\raggedbottom/g, '')
                    .replace(/\\raggedright/g, '')
                    .replace(/\\empty/g, '')
                    // Convert \href{url}{text} to just the text
                    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
                    // Convert \url{...} to just the URL text
                    .replace(/\\url\{([^}]*)\}/g, '$1');



                // 6. COLOR MARKERS (Robust Parsing)
                const colorMarkers: { id: string; color: string; text: string; type: 'text' | 'bg' }[] = [];
                let markerId = 0;

                // \textcolor{color}{text}
                processedCode = replaceLatexCommand(processedCode, '\\textcolor', 2, (args) => {
                    const [color, text] = args;
                    const id = `CLRMARK${markerId++}END`;
                    colorMarkers.push({ id, color, text, type: 'text' });
                    return text + id;
                });

                // \colorbox{color}{text}
                processedCode = replaceLatexCommand(processedCode, '\\colorbox', 2, (args) => {
                    const [color, text] = args;
                    const id = `BGMARK${markerId++}END`;
                    colorMarkers.push({ id, color, text, type: 'bg' });
                    return text + id;
                });

                // \fcolorbox{frame}{bg}{text}
                processedCode = replaceLatexCommand(processedCode, '\\fcolorbox', 3, (args) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [_frame, bg, text] = args;
                    const id = `BGMARK${markerId++}END`;
                    colorMarkers.push({ id, color: bg, text, type: 'bg' });
                    return text + id;
                });

                // 7. RULE MARKERS
                const ruleMarkers: { id: string; width: string; height: string }[] = [];
                processedCode = processedCode.replace(
                    /\\rule\{([^}]+)\}\{([^}]+)\}/g,
                    (_, width, height) => {
                        const id = `RULEMARK${markerId++}END`;
                        ruleMarkers.push({ id, width, height });
                        return id;
                    }
                );

                // 8. FINAL CLEANUP
                processedCode = processedCode
                    .replace(/\\title\{[^}]*\}/g, '')
                    .replace(/\\author\{[^}]*\}/g, '')
                    .replace(/\\date\{[^}]*\}/g, '')
                    .replace(/\\maketitle/g, '')
                    .replace(/\\today/g, '')
                    .replace(/\\LaTeX\{\}/g, 'LaTeX')
                    .replace(/\\LaTeX(?![a-zA-Z])/g, 'LaTeX')
                    .replace(/\\definecolor\{[^}]*\}\{[^}]*\}\{[^}]*\}/g, '')
                    .replace(/\\colorlet\{[^}]*\}\{[^}]*\}/g, '')
                    .replace(/\\pagecolor\{[^}]*\}/g, '')
                    .replace(/\\color\{[^}]*\}/g, '');

                // --- PROCESSING END ---

                if (!processedCode.trim()) {
                    if (isMounted && iframeRef.current) {
                        const iframe = iframeRef.current;
                        const docFrame = iframe.contentDocument || iframe.contentWindow?.document;
                        if (docFrame) {
                            const root = docFrame.getElementById('latex-root');
                            if (root) {
                                root.innerHTML = '<div style="padding: 2rem; text-align: center; color: #888;">Empty document</div>';
                            }
                        }
                    }
                    return;
                }

                const parseResult = tryParseWithFallback(processedCode, latexjs);

                if (parseResult.error) {
                    throw new Error(`LaTeX compilation failed: ${parseResult.error}`);
                }

                const doc = parseResult.doc;

                if (isMounted && iframeRef.current) {
                    const iframe = iframeRef.current;
                    const docFrame = iframe.contentDocument || iframe.contentWindow?.document;
                    if (docFrame) {
                        const root = docFrame.getElementById('latex-root');
                        if (root) {
                            root.innerHTML = '';
                            const fragment = doc.domFragment();
                            if (fragment) {
                                root.appendChild(docFrame.adoptNode(fragment));

                                let html = root.innerHTML;

                                // Color Resolver
                                const staticColorMap: Record<string, string> = {
                                    'red': '#ff0000', 'green': '#008000', 'blue': '#0000ff',
                                    'cyan': '#00ffff', 'magenta': '#ff00ff', 'yellow': '#ffff00',
                                    'black': '#000000', 'white': '#ffffff', 'gray': '#808080',
                                    'grey': '#808080', 'lightgray': '#d3d3d3', 'darkgray': '#a9a9a9',
                                    'orange': '#ffa500', 'purple': '#800080', 'brown': '#a52a2a',
                                    'lime': '#00ff00', 'olive': '#808000', 'pink': '#ffc0cb',
                                    'teal': '#008080', 'violet': '#ee82ee', 'maroon': '#800000',
                                    'navy': '#000080', 'forestgreen': '#228b22', 'darkorchid': '#9932cc',
                                    'royalblue': '#4169e1', 'gold': '#ffd700', 'crimson': '#dc143c',
                                    'firebrick': '#b22222', 'salmon': '#fa8072', 'seagreen': '#2e8b57',
                                    'limegreen': '#32cd32', 'chocolate': '#d2691e', 'sienna': '#a0522d',
                                    'silver': '#c0c0c0', 'olivedrab': '#6b8e23'
                                };

                                const resolveColor = (colorSpec: string): string => {
                                    const base = colorSpec.split('!')[0].trim();
                                    if (customColors[base]) {
                                        const val = customColors[base];
                                        if (val.startsWith('#') || val.startsWith('rgb')) return val;
                                        if (staticColorMap[val.toLowerCase()]) return staticColorMap[val.toLowerCase()];
                                        return val;
                                    }
                                    if (staticColorMap[base.toLowerCase()]) return staticColorMap[base.toLowerCase()];
                                    if (base.includes(',')) {
                                        const rgb = base.replace(/\s/g, '').split(',').map(Number);
                                        if (rgb.length === 3) return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
                                    }
                                    return base;
                                };

                                // Apply Rule Markers
                                ruleMarkers.forEach(m => {
                                    const regex = new RegExp(m.id, 'g');
                                    let cssWidth = '50px';
                                    let cssHeight = '1px';
                                    // Basic helper to convert cm/mm/pt to px
                                    const toPx = (v: string) => {
                                        if (v.includes('cm')) return parseFloat(v) * 37.8 + 'px';
                                        if (v.includes('mm')) return parseFloat(v) * 3.78 + 'px';
                                        if (v.includes('pt')) return parseFloat(v) * 1.33 + 'px';
                                        if (v.includes('in')) return parseFloat(v) * 96 + 'px';
                                        return v;
                                    }
                                    cssWidth = toPx(m.width);
                                    cssHeight = toPx(m.height);

                                    html = html.replace(regex, `<span style="display:inline-block; width:${cssWidth}; height:${cssHeight}; background-color:currentColor; vertical-align:middle;"></span>`);
                                });

                                // Apply Color Markers
                                colorMarkers.forEach(marker => {
                                    const cssColor = resolveColor(marker.color);
                                    const escapedText = marker.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    const escapedId = marker.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    const regex = new RegExp(`(${escapedText})\\s*${escapedId}`, 'g');

                                    if (marker.type === 'text') {
                                        html = html.replace(regex, `<span style="color: ${cssColor}">$1</span>`);
                                    } else {
                                        html = html.replace(regex, `<span style="background-color: ${cssColor}; padding: 2px 4px; border-radius: 2px;">$1</span>`);
                                    }
                                });

                                // Clean markers
                                html = html.replace(/CLRMARK\d+END/g, '')
                                    .replace(/BGMARK\d+END/g, '')
                                    .replace(/RULEMARK\d+END/g, '');

                                root.innerHTML = html;
                            }
                        }
                    }
                }

            } catch (e: any) {
                console.error("LaTeX Rendering Error:", e);
                if (isMounted) {
                    let msg = e.message || "Unknown error";
                    if (msg.includes("Expected")) msg = "Syntax Error: " + msg;
                    setError(msg);
                }
            }
        };

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
