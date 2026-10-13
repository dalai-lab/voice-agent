"use client";

import { json } from "@codemirror/lang-json";
import CodeMirror, {
  EditorView,
  oneDark,
  ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";

import { formatJsonString, FormatResult } from "./formatJson";

export interface CodeEditorRef {
  /** Formats the document JSON with 2-space indentation */
  formatDocument: () => FormatResult;
  /** Focuses the editor */
  focus: () => void;
  /** Jumps cursor to specified line and column */
  jumpToLine: (line: number, column?: number) => void;
  /** Access to the raw CodeMirror EditorView */
  getView: () => EditorView | undefined;
}

export interface CodeEditorSurfaceProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const CodeEditorSurfaceInternal = forwardRef<
  CodeEditorRef,
  CodeEditorSurfaceProps
>(function CodeEditorSurfaceInternal(
  {
    value,
    onChange,
    readOnly = false,
    height = "100%",
    minHeight = "360px",
    maxHeight,
    placeholder = "{\n  \"nodes\": [],\n  \"edges\": []\n}",
    className = "",
    autoFocus = false,
  },
  ref
) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Expose imperative methods for formatting, focusing, and navigation
  useImperativeHandle(
    ref,
    () => ({
      formatDocument: () => {
        const result = formatJsonString(value);
        if (result.changed && onChange) {
          onChange(result.formatted);
        }
        return result;
      },
      focus: () => {
        editorRef.current?.view?.focus();
      },
      jumpToLine: (line: number, column: number = 1) => {
        const view = editorRef.current?.view;
        if (!view) return;
        try {
          const doc = view.state.doc;
          if (line < 1 || line > doc.lines) return;
          const lineInfo = doc.line(line);
          const pos = Math.min(
            lineInfo.from + Math.max(0, column - 1),
            lineInfo.to
          );
          view.dispatch({
            selection: { anchor: pos, head: pos },
            scrollIntoView: true,
          });
          view.focus();
        } catch {
          // Gracefully ignore out-of-bounds positions
        }
      },
      getView: () => editorRef.current?.view,
    }),
    [value, onChange]
  );

  const extensions = useMemo(() => {
    return [
      json(),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          fontSize: "13px",
          fontFamily:
            "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        },
        ".cm-scroller": {
          fontFamily:
            "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          lineHeight: "1.6",
        },
        ".cm-content": {
          padding: "8px 0",
        },
        ".cm-gutters": {
          borderRight: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
          backgroundColor: "transparent",
          color: "var(--muted-foreground, #888)",
        },
        ".cm-lineNumbers .cm-gutterElement": {
          padding: "0 10px 0 16px",
          minWidth: "40px",
        },
        ".cm-activeLine": {
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.04)"
            : "rgba(0, 0, 0, 0.04)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "transparent",
          color: isDark ? "#fff" : "#000",
        },
      }),
    ];
  }, [isDark]);

  const handleChange = useCallback(
    (val: string) => {
      if (onChange) {
        onChange(val);
      }
    },
    [onChange]
  );

  return (
    <div
      className={`relative w-full rounded-md border border-border/60 bg-background overflow-hidden ${className}`}
      style={{ minHeight, maxHeight }}
    >
      <CodeMirror
        ref={editorRef}
        value={value}
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        theme={isDark ? oneDark : "light"}
        extensions={extensions}
        onChange={handleChange}
        editable={!readOnly}
        readOnly={readOnly}
        placeholder={placeholder}
        autoFocus={autoFocus}
        basicSetup={{
          lineNumbers: true,
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
          crosshairCursor: false,
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
});

export default CodeEditorSurfaceInternal;
