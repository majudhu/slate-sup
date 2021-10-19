import { useMemo } from "react";
import { createEditor } from "slate";
import { Editable, Slate, withReact } from "slate-react";

export default function RichTextEditor({ value, setValue }) {
  const editor = useMemo(() => withReact(createEditor()), []);

  return (
    <Slate editor={editor} value={value} onChange={setValue}>
      <Editable />
    </Slate>
  );
}
