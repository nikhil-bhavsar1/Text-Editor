import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { MermaidBlock } from './MermaidBlock';

interface PreviewPaneProps {
    code: string;
    settings: {
        gfm: boolean;
        frontmatter: boolean;
        math: boolean;
    };
}

export const PreviewPane = ({ code, settings }: PreviewPaneProps) => {
    const remarkPlugins = [];
    if (settings.math) remarkPlugins.push(remarkMath);
    if (settings.gfm) remarkPlugins.push(remarkGfm);
    if (settings.frontmatter) remarkPlugins.push(remarkFrontmatter);

    const rehypePlugins = [];
    if (settings.math) rehypePlugins.push(rehypeKatex);

    return (
        <div className="h-full w-full overflow-y-auto bg-secondary custom-scrollbar">
            <div className="markdown-preview">
                <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={{
                        code({ node, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isMermaid = match && match[1] === 'mermaid';

                            if (isMermaid) {
                                return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
                            }

                            return (
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
        </div>
    );
};
