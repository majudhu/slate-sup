import { useState } from "react";
import RichTextEditor from "./RichTextEditor";

function App() {
  const [value, setValue] = useState([
    { type: "paragraph", children: [{ text: "" }] },
  ]);
  
  return (
    <div>
      <RichTextEditor value={value} setValue={setValue} />
    </div>
  );
}

export default App;
