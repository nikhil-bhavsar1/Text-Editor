import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidBlock } from './MermaidBlock';

interface PreviewPaneProps {
    code: string;
    settings: {
        gfm: boolean;
        frontmatter: boolean;
        math: boolean;
    };
    isDark?: boolean;
}

export const PreviewPane = ({ code, settings, isDark = true }: PreviewPaneProps) => {
    const remarkPlugins = useMemo(() => {
        const plugins = [];
        if (settings.gfm) plugins.push(remarkGfm);
        if (settings.math) plugins.push(remarkMath);
        if (settings.frontmatter) plugins.push(remarkFrontmatter);
        return plugins;
    }, [settings.math, settings.gfm, settings.frontmatter]);

    const rehypePlugins = useMemo(() => {
        const plugins = [];
        if (settings.math) plugins.push(rehypeKatex);
        return plugins;
    }, [settings.math]);

    return (
        <div className="preview-scroll-container">
            <div className={`markdown-preview ${!isDark ? 'light-mode' : ''}`}>
                <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={{
                        code({ node, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const lang = match ? match[1] : '';
                            const isMermaid = lang === 'mermaid';

                            if (isMermaid) {
                                return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
                            }

                            return match ? (
                                <SyntaxHighlighter
                                    {...props}
                                    children={String(children).replace(/\n$/, '')}
                                    style={oneDark}
                                    language={lang}
                                    PreTag="div"
                                    customStyle={{ margin: 0, borderRadius: '0.5rem' }}
                                />
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {code}
                </ReactMarkdown>
            </div>
        </div >
    );
};
