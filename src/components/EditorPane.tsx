import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { useRef, useEffect } from "react";
import { EditorView } from "@codemirror/view";

interface EditorPaneProps {
    code: string;
    onChange: (value: string | undefined) => void;

    onMount?: (insertFn: (text: string, offset?: number) => void) => void;
    fontSize?: number;
    settings?: {
        lineNumbers: boolean;
        wordWrap: boolean;
    };
}

export const EditorPane = ({ code, onChange, onMount, fontSize = 16, settings }: EditorPaneProps) => {
    const editorRef = useRef<ReactCodeMirrorRef>(null);

    useEffect(() => {
        // ... (keep useEffect content)
        if (onMount && editorRef.current?.view) {
            onMount((text: string, offset: number = 0) => {
                const view = editorRef.current?.view;
                if (!view) return;

                const { state, dispatch } = view;
                const ranges = state.selection.ranges;

                if (ranges.length > 0) {
                    const range = ranges[0];
                    dispatch({
                        changes: { from: range.from, to: range.to, insert: text },
                        selection: { anchor: range.from + text.length - offset },
                        scrollIntoView: true
                    });
                    view.focus();
                }
            });
        }
    }, [onMount, editorRef.current]);

    return (
        <div className="h-full w-full overflow-hidden" style={{ fontSize: `${fontSize}px` }}>
            <CodeMirror
                ref={editorRef}
                value={code}
                height="100%"
                theme={oneDark}
                extensions={[
                    markdown({ base: markdownLanguage, codeLanguages: languages }),
                    settings?.wordWrap ? EditorView.lineWrapping : []
                ]}
                onChange={onChange}
                className="h-full"
                basicSetup={{
                    lineNumbers: settings?.lineNumbers ?? true,
                    highlightActiveLineGutter: true,
                    highlightSpecialChars: true,
                    history: true,
                    foldGutter: true,
                    drawSelection: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    syntaxHighlighting: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    rectangularSelection: true,
                    crosshairCursor: true,
                    highlightActiveLine: true,
                    highlightSelectionMatches: true,
                    closeBracketsKeymap: true,
                    defaultKeymap: true,
                    searchKeymap: true,
                    historyKeymap: true,
                    foldKeymap: true,
                    completionKeymap: true,
                    lintKeymap: true,
                }}
            />
        </div>
    );
};

