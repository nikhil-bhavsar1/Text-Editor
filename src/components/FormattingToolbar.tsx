import {
    Heading1, Heading2, Heading3,
    Bold, Italic, List, ListOrdered, Code, Quote, Link, Image,
    Table, Sigma, FunctionSquare, Activity,
    Strikethrough, Underline, Highlighter, ZoomIn, ZoomOut
} from 'lucide-react';
import { ReactNode } from 'react';

interface FormattingToolbarProps {
    onInsert: (template: string, offset?: number) => void;
    onFontSizeChange?: (delta: number) => void;
    onTexManagerClick?: () => void;
}

type ToolbarItem = {
    icon: ReactNode;
    label: string;
    action: () => void;
    separator?: never;
} | {
    separator: true;
    icon?: never;
    label?: never;
    action?: never;
};

export const FormattingToolbar = ({ onInsert, onFontSizeChange }: FormattingToolbarProps) => {
    const tools: ToolbarItem[] = [
        { icon: <Heading1 size={16} />, label: "H1", action: () => onInsert("# ", 0) },
        { icon: <Heading2 size={16} />, label: "H2", action: () => onInsert("## ", 0) },
        { icon: <Heading3 size={16} />, label: "H3", action: () => onInsert("### ", 0) },
        { separator: true },
        { icon: <Bold size={16} />, label: "Bold", action: () => onInsert("**Bold Text**", 2) },
        { icon: <Italic size={16} />, label: "Italic", action: () => onInsert("*Italic Text*", 1) },
        { icon: <Strikethrough size={16} />, label: "Strikethrough", action: () => onInsert("~~Strikethrough~~", 2) },
        { icon: <Underline size={16} />, label: "Underline", action: () => onInsert("<u>Underline</u>", 4) },
        { icon: <Highlighter size={16} />, label: "Highlight", action: () => onInsert("==Highlight==", 2) },
        { icon: <Code size={16} />, label: "Code", action: () => onInsert("`code`", 1) },
        { icon: <Quote size={16} />, label: "Quote", action: () => onInsert("> ", 0) },
        { separator: true },
        { icon: <List size={16} />, label: "List", action: () => onInsert("- ", 0) },
        { icon: <ListOrdered size={16} />, label: "Numbered List", action: () => onInsert("1. ", 0) },
        { icon: <Table size={16} />, label: "Table", action: () => onInsert("| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |", 0) },
        { separator: true },
        { icon: <Link size={16} />, label: "Link", action: () => onInsert("[Link Title](url)", 1) },
        { icon: <Image size={16} />, label: "Image", action: () => onInsert("![Alt Text](url)", 2) },
        { separator: true },
        { icon: <Sigma size={16} />, label: "Inline Math", action: () => onInsert("$E=mc^2$", 1) },
        { icon: <FunctionSquare size={16} />, label: "Block Math", action: () => onInsert("\n$$\n\\frac{1}{2}\n$$\n", 4) },

        { icon: <Activity size={16} />, label: "Mermaid", action: () => onInsert("\n```mermaid\ngraph TD;\n    A-->B;\n```\n", 0) },
        { separator: true },
        { icon: <ZoomIn size={16} />, label: "Increase Font", action: () => onFontSizeChange?.(1) },
        { icon: <ZoomOut size={16} />, label: "Decrease Font", action: () => onFontSizeChange?.(-1) },
    ];

    return (
        <div className="formatting-toolbar">
            {tools.map((tool, index) => (
                tool.separator ? (
                    <div key={index} className="separator" />
                ) : (
                    <button
                        key={index}
                        type="button"
                        onClick={tool.action}
                        title={tool.label}
                    >
                        {tool.icon}
                    </button>
                )
            ))}
        </div>
    );
};
