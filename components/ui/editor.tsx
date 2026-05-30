import * as React from "react";

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  mode?: "html" | "text";
  height?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Simple code editor component for HTML/text content
 * Can be replaced with a full WYSIWYG editor (TinyMCE, CKEditor, etc.)
 */
export const Editor = React.forwardRef<HTMLDivElement, EditorProps>(
  (
    {
      value,
      onChange,
      mode = "html",
      height = "400px",
      placeholder = "Enter content here...",
      disabled = false,
    },
    ref
  ) => {
    return (
      <div ref={ref} className="flex flex-col gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-input bg-(--input-bg) p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted/40"
          style={{ height }}
          spellCheck={mode === "text"}
        />
        {mode === "html" && (
          <div className="rounded border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
            <p>Tip: Use HTML tags like &lt;h1&gt;, &lt;p&gt;, &lt;a&gt;, etc.</p>
            <p>Variables: ${"{VARIABLE_NAME}"} will be replaced at send time</p>
          </div>
        )}
      </div>
    );
  }
);

Editor.displayName = "Editor";
