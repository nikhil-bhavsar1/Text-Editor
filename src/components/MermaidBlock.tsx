import { useEffect, useState } from 'react';
import mermaid from 'mermaid';

// Initialize once
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
});

interface MermaidProps {
    chart: string;
}

export const MermaidBlock = ({ chart }: MermaidProps) => {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        const render = async () => {
            if (!chart) return;
            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg: renderedSvg } = await mermaid.render(id, chart);
                setSvg(renderedSvg);
            } catch (error) {
                // Mermaid renders error text to the DOM, so checking console is better for debugging
                // but we can render a simple error message or leave the previous invalid state (which might be confusing)
                // Often mermaid puts error description in the DOM itself if it fails in a specific way,
                // but purely async render failure needs handling.
                console.error("Mermaid rendering failed:", error);
                setSvg(`<div class="text-error italic">Failed to render diagram</div>`);
            }
        };

        render();
    }, [chart]);

    return (
        <div
            className="mermaid-container my-4 p-4 bg-secondary rounded-lg overflow-x-auto flex justify-center border border-white/10"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};
