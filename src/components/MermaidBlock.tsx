import { useRef, useEffect } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
    chart: string;
}

export const MermaidBlock = ({ chart }: MermaidProps) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            mermaid.initialize({
                startOnLoad: true,
                theme: 'dark',
                securityLevel: 'loose',
            });
            mermaid.contentLoaded();

            const render = async () => {
                try {
                    const { svg } = await mermaid.render(`mermaid-${Date.now()}`, chart);
                    if (ref.current) {
                        ref.current.innerHTML = svg;
                    }
                } catch (error) {
                    console.error("Mermaid parsing error:", error);
                    if (ref.current) ref.current.innerHTML = `<div class="error">Invalid Mermaid Syntax</div>`;
                }
            };

            render();
        }
    }, [chart]);

    return <div ref={ref} className="mermaid-container my-4 p-4 bg-tertiary rounded-lg overflow-x-auto flex justify-center" />;
};
