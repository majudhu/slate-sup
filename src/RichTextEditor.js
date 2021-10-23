import { Button, Dialog, IconButton, TextField } from "@material-ui/core";
import { useMemo, useState } from "react";
import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdFormatUnderlined,
  MdLink,
  MdLinkOff,
  MdLooksOne,
  MdLooksTwo,
  MdRedo,
  MdUndo,
  MdClose,
  MdImage,
} from "react-icons/md";
import {
  createEditor,
  Editor,
  Element as SlateElement,
  Range,
  Transforms,
} from "slate";
import { HistoryEditor, withHistory } from "slate-history";
import {
  Editable,
  Slate,
  useSelected,
  useSlate,
  withReact,
  useSlateStatic,
} from "slate-react";
const LIST_TYPES = ["numbered-list", "bulleted-list"];

export default function RichTextEditor({ value, setValue }) {
  const editor = useMemo(() => {
    const editor = withReact(withHistory(createEditor()));

    const { isInline, isVoid } = editor;

    editor.isVoid = (element) => {
      return element.type === "image" ? true : isVoid(element);
    };

    editor.isInline = (element) => {
      return element.type === "link" ? true : isInline(element);
    };

    return editor;
  }, []);

  return (
    <Slate editor={editor} value={value} onChange={setValue}>
      <div className="d-flex align-items-center">
        <IconButton
          size="small"
          className="text-dark"
          disabled={!editor.history.undos.length}
          onClick={() => HistoryEditor.undo(editor)}
        >
          <MdUndo />
        </IconButton>
        <IconButton
          size="small"
          className="text-dark"
          disabled={!editor.history.redos.length}
          onClick={() => HistoryEditor.redo(editor)}
        >
          <MdRedo />
        </IconButton>
        <MarkButton format="bold" icon={<MdFormatBold />} />
        <MarkButton format="italic" icon={<MdFormatItalic />} />
        <MarkButton format="underline" icon={<MdFormatUnderlined />} />
        <BlockButton format="heading-one" icon={<MdLooksOne />} />
        <BlockButton format="heading-two" icon={<MdLooksTwo />} />
        <BlockButton format="block-quote" icon={<MdFormatQuote />} />
        <BlockButton format="numbered-list" icon={<MdFormatListNumbered />} />
        <BlockButton format="bulleted-list" icon={<MdFormatListBulleted />} />
        <LinkButton />
        <ImageButton />
      </div>
      <Editable renderElement={Element} renderLeaf={Leaf} />
    </Slate>
  );
}

function toggleBlock(editor, format) {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type),
    split: true,
  });
  const newProperties = {
    type: isActive ? "paragraph" : isList ? "list-item" : format,
  };
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
}

function isBlockActive(editor, format) {
  if (!editor.selection) return false;

  const [match] = Editor.nodes(editor, {
    at: Editor.unhangRange(editor, editor.selection),
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  });

  return !!match;
}

function Element({ attributes, children, element }) {
  const selected = useSelected();
  console.log({ attributes, children, element });

  switch (element.type) {
    case "block-quote":
      return <blockquote {...attributes}>{children}</blockquote>;
    case "bulleted-list":
      return (
        <ul className="list-disc" {...attributes}>
          {children}
        </ul>
      );
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "numbered-list":
      return (
        <ol className="list-decimal" {...attributes}>
          {children}
        </ol>
      );

    case "link":
      return (
        <a
          {...attributes}
          href={element.url}
          className={selected ? "bg-warning" : ""}
        >
          {children}
        </a>
      );

    case "image":
      return (
        <div {...attributes} className="w-100">
          {children}
          <img
            contentEditable={false}
            className="img-fluid w-100"
            src={element.url}
          />
        </div>
      );

    default:
      return <p {...attributes}>{children}</p>;
  }
}

function Leaf({ attributes, children, leaf }) {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  if (leaf.italic) {
    children = <em>{children}</em>;
  }
  if (leaf.underline) {
    children = <u>{children}</u>;
  }
  return <span {...attributes}>{children}</span>;
}

function MarkButton({ format, icon }) {
  const editor = useSlate();
  const isMarked = Editor.marks(editor)?.[format];
  return (
    <IconButton
      size="small"
      className={isMarked ? "text-dark" : "text-muted"}
      onClick={() =>
        isMarked
          ? Editor.removeMark(editor, format)
          : Editor.addMark(editor, format, true)
      }
    >
      {icon}
    </IconButton>
  );
}

function BlockButton({ format, icon }) {
  const editor = useSlate();
  return (
    <IconButton
      size="small"
      className={isBlockActive(editor, format) ? "text-dark" : "text-muted"}
      onClick={() => toggleBlock(editor, format)}
    >
      {icon}
    </IconButton>
  );
}

function isLinkActive(editor) {
  const [link] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "link",
  });
  return !!link;
}

function unwrapLink(editor) {
  if (isLinkActive(editor)) {
    Transforms.unwrapNodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "link",
    });
  }
}

function wrapLink(editor, url) {
  unwrapLink(editor);

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);
  const link = {
    type: "link",
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  }
}

function LinkButton() {
  const editor = useSlate();
  const [showDialog, setShowDialog] = useState(false);
  const [text, setText] = useState("");

  function submit(e) {
    e.preventDefault();
    wrapLink(editor, text);
    setShowDialog(false);
    setText("");
  }

  return (
    <>
      <IconButton
        size="small"
        className="text-dark"
        onClick={() =>
          isLinkActive(editor) ? unwrapLink(editor) : setShowDialog(true)
        }
      >
        {isLinkActive(editor) ? <MdLinkOff /> : <MdLink />}
      </IconButton>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={showDialog}
        onClose={() => setShowDialog(false)}
      >
        <h4 className="mx-3 mt-2 mb-0 d-flex align-items-center">
          Insert a link
          <IconButton className="ms-auto" onClick={() => setShowDialog(false)}>
            <MdClose />
          </IconButton>
        </h4>
        <form onSubmit={submit} className="mx-3 mb-3">
          <TextField
            fullWidth
            autoFocus
            required
            label="Enter URL"
            className="mb-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button variant="contained" color="primary" type="submit">
            Insert link
          </Button>
        </form>
      </Dialog>
    </>
  );
}
function ImageButton() {
  const editor = useSlateStatic();
  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState("");

  function submit(e) {
    e.preventDefault();
    Transforms.insertNodes(editor, {
      type: "image",
      url,
      children: [{ text: "" }],
    });
    setShowDialog(false);
    setUrl("");
  }

  return (
    <>
      <IconButton
        size="small"
        className="text-dark"
        onClick={() => setShowDialog(true)}
      >
        <MdImage />
      </IconButton>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={showDialog}
        onClose={() => setShowDialog(false)}
      >
        <h4 className="mx-3 mt-2 mb-0 d-flex align-items-center">
          Insert a image
          <IconButton className="ms-auto" onClick={() => setShowDialog(false)}>
            <MdClose />
          </IconButton>
        </h4>
        <form onSubmit={submit} className="mx-3 mb-3">
          <TextField
            fullWidth
            autoFocus
            required
            label="Enter URL"
            className="mb-2"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button variant="contained" color="primary" type="submit">
            Insert image
          </Button>
        </form>
      </Dialog>
    </>
  );
}
