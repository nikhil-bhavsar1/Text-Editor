import { X, Package, Check, Plus, Search, BookOpen, Layers, Type, Cloud, ExternalLink, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TexPackage {
    id: string;
    name: string;
    description: string;
    category: 'math' | 'graphics' | 'layout' | 'fonts' | 'biblio' | 'online';
    snippet: string;
    requires?: string[];
    url?: string;
}

const AVAILABLE_PACKAGES: TexPackage[] = [
    // Math
    { id: 'amsmath', name: 'amsmath', category: 'math', description: 'Advanced math extensions', snippet: '\\usepackage{amsmath}' },
    { id: 'amssymb', name: 'amssymb', category: 'math', description: 'Mathematical symbols', snippet: '\\usepackage{amssymb}' },
    { id: 'amsthm', name: 'amsthm', category: 'math', description: 'Theorem environments', snippet: '\\usepackage{amsthm}' },
    { id: 'physics', name: 'physics', category: 'math', description: 'Physics notation', snippet: '\\usepackage{physics}' },
    { id: 'siunitx', name: 'siunitx', category: 'math', description: 'SI units support', snippet: '\\usepackage{siunitx}' },

    // Graphics
    { id: 'graphicx', name: 'graphicx', category: 'graphics', description: 'Enhanced support for graphics', snippet: '\\usepackage{graphicx}' },
    { id: 'tikz', name: 'TikZ', category: 'graphics', description: 'Create graphics programmatically', snippet: '\\usepackage{tikz}' },
    { id: 'xcolor', name: 'xcolor', category: 'graphics', description: 'Driver-independent color extensions', snippet: '\\usepackage{xcolor}' },
    { id: 'pgfplots', name: 'pgfplots', category: 'graphics', description: 'Create normal/logarithmic plots', snippet: '\\usepackage{pgfplots}' },

    // Layout
    { id: 'geometry', name: 'geometry', category: 'layout', description: 'Flexible page geometry', snippet: '\\usepackage[margin=1in]{geometry}' },
    { id: 'fancyhdr', name: 'fancyhdr', category: 'layout', description: 'Headers and footers', snippet: '\\usepackage{fancyhdr}' },
    { id: 'multicol', name: 'multicol', category: 'layout', description: 'Intermix single and multiple columns', snippet: '\\usepackage{multicol}' },
    { id: 'float', name: 'float', category: 'layout', description: 'Improved interface for floating objects', snippet: '\\usepackage{float}' },

    // Fonts
    { id: 'fontspec', name: 'fontspec', category: 'fonts', description: 'Advanced font selection (XeLaTeX/LuaLaTeX)', snippet: '\\usepackage{fontspec}' },
    { id: 'babel', name: 'babel', category: 'fonts', description: 'Multilingual support', snippet: '\\usepackage[english]{babel}' },
    { id: 'microtype', name: 'microtype', category: 'fonts', description: 'Subliminal refinements towards typographical perfection', snippet: '\\usepackage{microtype}' },

    // Bibliography & Others
    { id: 'biblatex', name: 'biblatex', category: 'biblio', description: 'Sophisticated bibliographies', snippet: '\\usepackage{biblatex}' },
    { id: 'hyperref', name: 'hyperref', category: 'biblio', description: 'Extensive support for hypertext', snippet: '\\usepackage{hyperref}' },
    { id: 'listings', name: 'listings', category: 'biblio', description: 'Typeset source code listings', snippet: '\\usepackage{listings}' },
];

interface TexLiveManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (text: string) => void;
    code: string;
}

// Inline styles
const styles: Record<string, CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
    },
    modalWrapper: {
        position: 'relative',
        width: '100%',
        maxWidth: '672px',
        height: '80vh',
        zIndex: 10,
        pointerEvents: 'auto',
    },
    modal: {
        backgroundColor: '#1e1e1e',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: '#252525',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    iconBox: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        padding: '8px',
        borderRadius: '8px',
        color: '#60a5fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: '20px',
        fontWeight: 600,
        color: 'white',
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: '#a1a1aa',
        margin: 0,
    },
    closeBtn: {
        padding: '8px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: '#a1a1aa',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controls: {
        padding: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '16px',
        backgroundColor: '#1e1e1e',
        flexWrap: 'wrap',
    },
    searchWrapper: {
        position: 'relative',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        minWidth: '200px',
    },
    searchIcon: {
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#71717a',
    },
    searchInput: {
        width: '100%',
        backgroundColor: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        paddingLeft: '40px',
        paddingRight: '16px',
        paddingTop: '8px',
        paddingBottom: '8px',
        fontSize: '14px',
        color: 'white',
        outline: 'none',
    },
    categoryTabs: {
        display: 'flex',
        backgroundColor: '#18181b',
        borderRadius: '8px',
        padding: '4px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        flexWrap: 'wrap',
        gap: '2px',
    },
    categoryBtn: {
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    categoryBtnActive: {
        backgroundColor: '#2563eb',
        color: 'white',
    },
    categoryBtnInactive: {
        backgroundColor: 'transparent',
        color: '#a1a1aa',
    },
    list: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    packageCard: {
        backgroundColor: 'rgba(24, 24, 27, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '16px',
        transition: 'all 0.2s',
    },
    packageHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
    },
    packageName: {
        fontWeight: 600,
        color: '#e4e4e7',
        margin: 0,
        fontSize: '15px',
    },
    packageBadge: {
        padding: '2px 6px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#71717a',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 500,
    },
    installedBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '10px',
        color: '#4ade80',
    },
    packageDesc: {
        fontSize: '14px',
        color: '#a1a1aa',
        margin: '4px 0 0 0',
        lineHeight: 1.5,
    },
    packageSnippet: {
        display: 'block',
        marginTop: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#52525b',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        padding: '4px 8px',
        borderRadius: '4px',
        width: 'fit-content',
    },
    addBtn: {
        flexShrink: 0,
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s',
    },
    addBtnActive: {
        backgroundColor: '#2563eb',
        color: 'white',
    },
    addBtnDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '#71717a',
        cursor: 'not-allowed',
    },
    searchCtanBtn: {
        marginLeft: '8px',
        padding: '8px 16px',
        backgroundColor: '#2563eb',
        color: 'white',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#71717a',
    },
    ctanLink: {
        marginTop: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: '#60a5fa',
        textDecoration: 'none',
    },
    errorState: {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#f87171',
    },
};

export const TexLiveManager = ({ isOpen, onClose, onInsert, code }: TexLiveManagerProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [onlinePackages, setOnlinePackages] = useState<TexPackage[]>([]);
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);
    const [onlineError, setOnlineError] = useState<string | null>(null);
    const [detectedPackages, setDetectedPackages] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isOpen || !code) return;
        try {
            const newDetected = new Set<string>();
            const regex = /\\usepackage(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
            let match;
            let iterations = 0;
            const MAX_ITERATIONS = 1000;
            while ((match = regex.exec(code)) !== null && iterations < MAX_ITERATIONS) {
                iterations++;
                const pkgNames = match[1].split(',').map(s => s.trim());
                pkgNames.forEach(name => newDetected.add(name));
            }
            setDetectedPackages(newDetected);
        } catch (e) {
            console.error("Error parsing packages:", e);
        }
    }, [code, isOpen]);

    const filteredPackages = (() => {
        let baseList = AVAILABLE_PACKAGES;
        if (activeCategory === 'installed') {
            baseList = Array.from(detectedPackages).map(id => {
                const found = AVAILABLE_PACKAGES.find(p => p.id === id);
                return found || {
                    id,
                    name: id,
                    category: 'math' as const,
                    description: 'Detected in code',
                    snippet: `\\usepackage{${id}}`
                };
            });
        }
        return baseList.filter(pkg => {
            const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
            if (activeCategory === 'installed') return matchesSearch;
            if (activeCategory === 'all') return matchesSearch;
            return matchesSearch && pkg.category === activeCategory;
        });
    })();

    const downloadAndCachePackage = async (pkgId: string) => {
        const mirrors = [
            `https://mirrors.ctan.org/macros/latex/contrib/${pkgId}/${pkgId}.sty`,
            `https://mirrors.ctan.org/macros/latex/base/${pkgId}.sty`,
            `https://mirrors.ctan.org/macros/latex/required/${pkgId}/${pkgId}.sty`,
            `https://mirrors.ctan.org/macros/latex/contrib/${pkgId}/${pkgId}.cls`
        ];
        let content = '';
        let found = false;
        for (const url of mirrors) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    content = await res.text();
                    found = true;
                    break;
                }
            } catch (e) {
                console.warn(`Failed to fetch from ${url}`, e);
            }
        }
        if (found) {
            try {
                localStorage.setItem(`tex_package_${pkgId}`, content);
            } catch (e) {
                console.error("Storage quota exceeded", e);
            }
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${pkgId}.sty`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        }
        return false;
    };

    const handleInstall = async (pkg: TexPackage) => {
        if (isInstalled(pkg.id)) return;
        if (pkg.category === 'online') {
            await downloadAndCachePackage(pkg.id);
        }
        onInsert(`${pkg.snippet}\n`);
    };

    const isInstalled = (pkgId: string) => detectedPackages.has(pkgId);

    const handleOnlineSearch = async () => {
        if (!searchQuery.trim()) {
            setOnlinePackages([]);
            setOnlineError(null);
            return;
        }
        setIsSearchingOnline(true);
        setOnlineError(null);
        setActiveCategory('online');

        try {
            // Use CTAN search API for fuzzy/partial matching
            const ctanSearchUrl = `https://www.ctan.org/search/json?phrase=${encodeURIComponent(searchQuery.trim())}&PKG=true&max=20`;

            // List of CORS proxies to try
            const corsProxies = [
                (url: string) => url, // Direct (might work in some environments)
                (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
                (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            ];

            let response: Response | null = null;
            let lastError: Error | null = null;

            for (const proxyFn of corsProxies) {
                try {
                    const proxyUrl = proxyFn(ctanSearchUrl);
                    const res = await fetch(proxyUrl, {
                        signal: AbortSignal.timeout(8000) // 8 second timeout per attempt
                    });
                    if (res.ok) {
                        response = res;
                        break;
                    }
                } catch (e) {
                    lastError = e as Error;
                    continue; // Try next proxy
                }
            }

            if (!response) {
                throw lastError || new Error('All CTAN API proxies failed');
            }

            const data = await response.json();

            if (!data.hits || data.hits.length === 0) {
                throw new Error(`No packages found matching "${searchQuery.trim()}"`);
            }

            // Filter to only package results and transform to TexPackage format
            const packages: TexPackage[] = data.hits
                .filter((hit: any) => hit.path?.startsWith('/pkg/'))
                .slice(0, 15) // Limit to 15 results
                .map((hit: any) => {
                    const pkgKey = hit.path.replace('/pkg/', '');
                    return {
                        id: pkgKey,
                        name: hit.title?.replace('Package ', '') || pkgKey,
                        category: 'online' as const,
                        description: hit.text || 'No description available',
                        snippet: `\\usepackage{${pkgKey}}`,
                        url: `https://ctan.org${hit.path}`
                    };
                });

            if (packages.length === 0) {
                throw new Error(`No packages found matching "${searchQuery.trim()}"`);
            }

            setOnlinePackages(packages);
        } catch (e: any) {
            console.error("Error searching CTAN:", e);
            setOnlineError(e.message || "Could not connect to CTAN (CORS or network issue).");
            setOnlinePackages([]);
        } finally {
            setIsSearchingOnline(false);
        }
    };

    // Debounced search for Online tab
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedOnlineSearch = useCallback((query: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        if (!query.trim()) {
            setOnlinePackages([]);
            setOnlineError(null);
            return;
        }
        searchTimeoutRef.current = setTimeout(() => {
            handleOnlineSearch();
        }, 500); // 500ms debounce
    }, [searchQuery]);

    // Auto-search when query changes in Online mode
    useEffect(() => {
        if (activeCategory === 'online' && searchQuery.trim()) {
            debouncedOnlineSearch(searchQuery);
        }
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, activeCategory]);

    const categories = [
        { id: 'all', label: 'All', icon: null },
        { id: 'installed', label: 'Installed', icon: <Check size={14} /> },
        { id: 'math', label: 'Math', icon: <Layers size={14} /> },
        { id: 'graphics', label: 'Graphics', icon: <Package size={14} /> },
        { id: 'layout', label: 'Layout', icon: <BookOpen size={14} /> },
        { id: 'fonts', label: 'Fonts', icon: <Type size={14} /> },
        { id: 'online', label: 'Online', icon: <Cloud size={14} /> },
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={styles.overlay}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={styles.backdrop}
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    style={styles.modalWrapper}
                >
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={styles.header}>
                            <div style={styles.headerLeft}>
                                <div style={styles.iconBox}>
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h2 style={styles.title}>TeX Live Manager</h2>
                                    <p style={styles.subtitle}>Manage packages and features</p>
                                </div>
                            </div>
                            <button style={styles.closeBtn} onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Controls */}
                        <div style={styles.controls}>
                            <div style={styles.searchWrapper}>
                                <Search style={styles.searchIcon} size={16} />
                                <input
                                    type="text"
                                    placeholder="Search packages..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={styles.searchInput}
                                />
                                {activeCategory === 'online' && isSearchingOnline && (
                                    <Loader2 size={20} style={{ marginLeft: '8px', color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                                )}
                            </div>
                            <div style={styles.categoryTabs}>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setActiveCategory(cat.id);
                                            if (cat.id !== 'online') {
                                                setOnlinePackages([]);
                                                setOnlineError(null);
                                            }
                                        }}
                                        style={{
                                            ...styles.categoryBtn,
                                            ...(activeCategory === cat.id ? styles.categoryBtnActive : styles.categoryBtnInactive),
                                        }}
                                    >
                                        {cat.icon}
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div style={styles.list}>
                            {activeCategory === 'online' ? (
                                <>
                                    {isSearchingOnline && (
                                        <div style={styles.emptyState}>
                                            <Loader2 size={48} style={{ margin: '0 auto 16px', opacity: 0.5, animation: 'spin 1s linear infinite' }} />
                                            <p>Searching CTAN for "{searchQuery}"...</p>
                                        </div>
                                    )}
                                    {onlineError && !isSearchingOnline && (
                                        <div style={styles.errorState}>
                                            <Cloud size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                            <p>{onlineError}</p>
                                            <p style={{ fontSize: '14px', marginTop: '8px', color: '#fca5a5' }}>
                                                CTAN API might have CORS restrictions or the package name is incorrect.
                                            </p>
                                        </div>
                                    )}
                                    {!isSearchingOnline && !onlineError && onlinePackages.length === 0 && searchQuery.trim() && (
                                        <div style={styles.emptyState}>
                                            <Cloud size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                            <p>No online packages found for "{searchQuery}".</p>
                                        </div>
                                    )}
                                    {!isSearchingOnline && !onlineError && onlinePackages.length === 0 && !searchQuery.trim() && (
                                        <div style={styles.emptyState}>
                                            <Cloud size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                            <p>Enter a package name and click "Search CTAN" to find packages online.</p>
                                        </div>
                                    )}
                                    {onlinePackages.map(pkg => (
                                        <div key={pkg.id} style={styles.packageCard}>
                                            <div style={styles.packageHeader}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <h3 style={styles.packageName}>{pkg.name}</h3>
                                                        <span style={styles.packageBadge}>{pkg.category}</span>
                                                        {isInstalled(pkg.id) && (
                                                            <span style={styles.installedBadge}>
                                                                <Check size={10} /> Installed
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p style={styles.packageDesc}>{pkg.description}</p>
                                                    <code style={styles.packageSnippet}>{pkg.snippet}</code>
                                                    {pkg.url && (
                                                        <a href={pkg.url} target="_blank" rel="noopener noreferrer" style={styles.ctanLink}>
                                                            View on CTAN <ExternalLink size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleInstall(pkg)}
                                                    style={{
                                                        ...styles.addBtn,
                                                        ...(isInstalled(pkg.id) ? styles.addBtnDisabled : styles.addBtnActive),
                                                    }}
                                                    disabled={isInstalled(pkg.id)}
                                                >
                                                    {isInstalled(pkg.id) ? (
                                                        <><Check size={16} /> Added</>
                                                    ) : (
                                                        <><Plus size={16} /> Add Package</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {filteredPackages.map(pkg => (
                                        <div key={pkg.id} style={styles.packageCard}>
                                            <div style={styles.packageHeader}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <h3 style={styles.packageName}>{pkg.name}</h3>
                                                        <span style={styles.packageBadge}>{pkg.category}</span>
                                                        {isInstalled(pkg.id) && (
                                                            <span style={styles.installedBadge}>
                                                                <Check size={10} /> Installed
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p style={styles.packageDesc}>{pkg.description}</p>
                                                    <code style={styles.packageSnippet}>{pkg.snippet}</code>
                                                </div>
                                                <button
                                                    onClick={() => handleInstall(pkg)}
                                                    style={{
                                                        ...styles.addBtn,
                                                        ...(isInstalled(pkg.id) ? styles.addBtnDisabled : styles.addBtnActive),
                                                    }}
                                                    disabled={isInstalled(pkg.id)}
                                                >
                                                    {isInstalled(pkg.id) ? (
                                                        <><Check size={16} /> Added</>
                                                    ) : (
                                                        <><Plus size={16} /> Add Package</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredPackages.length === 0 && (
                                        <div style={styles.emptyState}>
                                            <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                            <p>No packages found matching your criteria</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
