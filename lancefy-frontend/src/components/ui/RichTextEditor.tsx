import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
} from "lucide-react";
import { cn } from "@/utils/cn";

type RichTextEditorProps = {
  value: string; // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

function execCmd(cmd: string, arg?: string) {
  // execCommand is deprecated but universally supported for basic formatting
  document.execCommand(cmd, false, arg ?? "");
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "เขียนรายละเอียดงาน...",
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // Track whether the last update came from us (to avoid cursor reset)
  const skipSync = useRef(false);

  useEffect(() => {
    if (!editorRef.current) return;
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    skipSync.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const cmd = (command: string, arg?: string) => {
    execCmd(command, arg);
    editorRef.current?.focus();
    skipSync.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-gray-50/80 flex-wrap">
        <ToolbarBtn onClick={() => cmd("bold")} title="Bold (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => cmd("italic")} title="Italic (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => cmd("underline")} title="Underline (Ctrl+U)">
          <Underline className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={() => cmd("formatBlock", "h2")} title="Heading 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => cmd("formatBlock", "h3")} title="Heading 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => cmd("formatBlock", "p")} title="Paragraph">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={() => cmd("insertUnorderedList")} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => cmd("insertOrderedList")} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarBtn onClick={() => cmd("justifyCenter")} title="Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[160px] max-h-96 overflow-y-auto px-4 py-3 text-sm text-foreground outline-none bg-input",
          // Empty state placeholder
          "[&:empty]:before:content-[attr(data-placeholder)]",
          "[&:empty]:before:text-text-muted",
          "[&:empty]:before:pointer-events-none",
          "[&:empty]:before:block",
          // Prose styles
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2",
          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
          "[&_li]:mb-0.5",
          "[&_strong]:font-bold",
          "[&_em]:italic",
          "[&_u]:underline",
          "[&_p]:mb-2"
        )}
      />

      {/* Character hint */}
      <div className="px-4 py-1.5 border-t border-border bg-gray-50/50 flex items-center justify-between">
        <span className="text-[10px] text-text-muted">
          รองรับการจัดรูปแบบข้อความ · เก็บเป็น HTML
        </span>
        <span className="text-[10px] text-text-muted">
          {editorRef.current?.textContent?.length ?? 0} ตัวอักษร
        </span>
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onClick();
      }}
      className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
    >
      {children}
    </button>
  );
}
