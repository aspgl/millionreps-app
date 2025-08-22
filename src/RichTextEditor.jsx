import { useState, useRef, useEffect } from "react";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image,
  Code,
  Quote
} from "lucide-react";

export default function RichTextEditor({ value, onChange, placeholder = "Text eingeben..." }) {
  const editorRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisiere den Editor nur einmal
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value || '';
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  // Aktualisiere den Inhalt nur wenn sich der externe Wert ändert
  useEffect(() => {
    if (editorRef.current && isInitialized && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, isInitialized]);

  const execCommand = (command, value = null) => {
    if (!editorRef.current) return;
    
    // Stelle sicher, dass der Editor fokussiert ist
    editorRef.current.focus();
    
    // Spezielle Behandlung für Headings
    if (command === 'formatBlock') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // Finde das aktuelle Element
        let currentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        while (currentElement && currentElement !== editorRef.current && !currentElement.matches('h1, h2, h3, p, div')) {
          currentElement = currentElement.parentElement;
        }
        
        if (currentElement && currentElement !== editorRef.current) {
          // Erstelle das neue Heading-Element
          const newElement = document.createElement(value.replace(/[<>]/g, ''));
          newElement.innerHTML = currentElement.innerHTML;
          
          // Ersetze das alte Element
          currentElement.parentNode.replaceChild(newElement, currentElement);
          
          // Setze die Auswahl auf das neue Element
          const newRange = document.createRange();
          newRange.selectNodeContents(newElement);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Fallback: Verwende execCommand
          document.execCommand(command, false, value);
        }
      }
    } else {
      // Führe den normalen Befehl aus
      document.execCommand(command, false, value);
    }
    
    // Aktualisiere den Wert
    updateValue();
  };

  const updateValue = () => {
    if (onChange && editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // Füge nur reinen Text ein
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
    }
    
    updateValue();
  };

  const insertLink = () => {
    const url = prompt('URL eingeben:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertImage = () => {
    const url = prompt('Bild-URL eingeben:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const handleInput = () => {
    updateValue();
  };

  const handleKeyDown = (e) => {
    // Verhindere Enter bei Buttons
    if (e.target.tagName === 'BUTTON') {
      e.preventDefault();
    }
  };

  const ToolbarButton = ({ icon: Icon, onClick, title, active = false }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`p-2 rounded hover:bg-gray-200 transition-colors ${
        active ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b p-2 flex flex-wrap gap-1">
        <div className="flex gap-1 border-r pr-2 mr-2">
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="Fett" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="Kursiv" />
          <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} title="Unterstrichen" />
        </div>

        <div className="flex gap-1 border-r pr-2 mr-2">
          <ToolbarButton icon={Heading1} onClick={() => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              if (range.collapsed) {
                // Wenn nichts ausgewählt ist, erstelle ein neues H1-Element
                const h1 = document.createElement('h1');
                h1.innerHTML = '<br>';
                range.insertNode(h1);
                range.selectNodeContents(h1);
                selection.removeAllRanges();
                selection.addRange(range);
              } else {
                execCommand('formatBlock', '<h1>');
              }
            }
          }} title="Überschrift 1" />
          <ToolbarButton icon={Heading2} onClick={() => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              if (range.collapsed) {
                // Wenn nichts ausgewählt ist, erstelle ein neues H2-Element
                const h2 = document.createElement('h2');
                h2.innerHTML = '<br>';
                range.insertNode(h2);
                range.selectNodeContents(h2);
                selection.removeAllRanges();
                selection.addRange(range);
              } else {
                execCommand('formatBlock', '<h2>');
              }
            }
          }} title="Überschrift 2" />
          <ToolbarButton icon={Heading3} onClick={() => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              if (range.collapsed) {
                // Wenn nichts ausgewählt ist, erstelle ein neues H3-Element
                const h3 = document.createElement('h3');
                h3.innerHTML = '<br>';
                range.insertNode(h3);
                range.selectNodeContents(h3);
                selection.removeAllRanges();
                selection.addRange(range);
              } else {
                execCommand('formatBlock', '<h3>');
              }
            }
          }} title="Überschrift 3" />
        </div>

        <div className="flex gap-1 border-r pr-2 mr-2">
          <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} title="Aufzählungsliste" />
          <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} title="Nummerierte Liste" />
        </div>

        <div className="flex gap-1 border-r pr-2 mr-2">
          <ToolbarButton icon={AlignLeft} onClick={() => execCommand('justifyLeft')} title="Linksbündig" />
          <ToolbarButton icon={AlignCenter} onClick={() => execCommand('justifyCenter')} title="Zentriert" />
          <ToolbarButton icon={AlignRight} onClick={() => execCommand('justifyRight')} title="Rechtsbündig" />
        </div>

        <div className="flex gap-1 border-r pr-2 mr-2">
          <ToolbarButton icon={Link} onClick={insertLink} title="Link einfügen" />
          <ToolbarButton icon={Image} onClick={insertImage} title="Bild einfügen" />
        </div>

        <div className="flex gap-1">
          <ToolbarButton icon={Code} onClick={() => execCommand('formatBlock', '<pre>')} title="Code-Block" />
          <ToolbarButton icon={Quote} onClick={() => execCommand('formatBlock', '<blockquote>')} title="Zitat" />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
        style={{
          minHeight: '200px',
          outline: 'none',
          direction: 'ltr', // Verhindert RTL-Schreiben
          textAlign: 'left'
        }}
        suppressContentEditableWarning={true}
      />
    </div>
  );
}
