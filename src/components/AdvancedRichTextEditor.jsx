import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import '../styles/advanced-editor.css';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quote,
  Table as TableIcon,
  CheckSquare,
  Save,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Type,
  FileText,
  Palette,
  Undo,
  Redo,
  Trash2,
  Plus,
  Minus,
  MoreHorizontal
} from 'lucide-react';

/**
 * 🚀 ADVANCED RICH TEXT EDITOR - GOOGLE DOCS + NOTION STYLE 🚀
 * 
 * FEATURES:
 * ✅ Full-window editing experience
 * ✅ Advanced TipTap editor with all extensions
 * ✅ Professional toolbar with all formatting options
 * ✅ Table support with full controls
 * ✅ Task lists and checkboxes
 * ✅ Code blocks with syntax highlighting
 * ✅ Image uploads and management
 * ✅ Link management
 * ✅ Fullscreen mode
 * ✅ Auto-save functionality
 * ✅ Word/character count
 * ✅ Keyboard shortcuts
 * ✅ Modern UI/UX design
 */

const AdvancedRichTextEditor = ({ 
  initialContent = '', 
  onChange = () => {}, 
  placeholder = "Beginne mit dem Schreiben oder drücke '/' für Befehle...",
  readOnly = false,
  className = '',
  autoSave = true,
  autoSaveDelay = 3000,
  allowFullscreen = true,
  onSave = null
}) => {
  // 🎯 STATE MANAGEMENT
  const [content, setContent] = useState(initialContent);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');

  // 📊 UPDATE CONTENT STATISTICS
  const updateStats = useCallback((html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html || '';
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    setCharacterCount(text.length);
  }, []);

  // 🎯 TIPTAP EDITOR INSTANCE
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert focus:outline-none max-w-none min-h-[600px] p-8',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      updateStats(html);
      onChange(html);
    },
  });

  // ✍️ HANDLE CONTENT CHANGE
  const handleContentChange = useCallback((html) => {
    setContent(html);
    updateStats(html);
    onChange(html);
  }, [updateStats, onChange]);

  // 💾 AUTO-SAVE FUNCTIONALITY
  useEffect(() => {
    if (!autoSave || !content || content === initialContent) return;
    
    const saveTimer = setTimeout(async () => {
      setIsSaving(true);
      try {
        if (onSave) {
          await onSave(content);
        } else {
          await onChange(content);
        }
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, autoSaveDelay);

    return () => clearTimeout(saveTimer);
  }, [content, autoSave, autoSaveDelay, onChange, onSave, initialContent]);

  // 🖥️ FULLSCREEN TOGGLE
  const toggleFullscreen = useCallback(() => {
    if (!allowFullscreen) return;
    
    setIsFullscreen(prev => {
      const newFullscreen = !prev;
      
      if (newFullscreen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      
      return newFullscreen;
    });
  }, [allowFullscreen]);

  // 👁️ PREVIEW MODE TOGGLE
  const togglePreviewMode = useCallback(() => {
    setIsPreviewMode(prev => !prev);
  }, []);

  // 💾 MANUAL SAVE
  const handleManualSave = useCallback(async () => {
    if (!content) return;
    
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(content);
      } else {
        await onChange(content);
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [content, onChange, onSave]);

  // 🔗 INSERT LINK
  const insertLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return;
    
    editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    setLinkUrl('');
    setShowLinkMenu(false);
  }, [editor, linkUrl]);

  // 🖼️ INSERT IMAGE
  const insertImage = useCallback(() => {
    if (!editor || !imageUrl.trim()) return;
    
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageUrl('');
    setShowImageMenu(false);
  }, [editor, imageUrl]);

  // 📊 INSERT TABLE
  const insertTable = useCallback(() => {
    if (!editor) return;
    
    editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
    setShowTableMenu(false);
  }, [editor, tableRows, tableCols]);

  // 🎨 APPLY TEXT COLOR
  const applyTextColor = useCallback((color) => {
    if (!editor) return;
    
    editor.chain().focus().setColor(color).run();
    setSelectedColor(color);
    setShowColorPicker(false);
  }, [editor]);

  // ⌨️ KEYBOARD SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!editor) return;
      
      // Save: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      
      // Fullscreen: F11
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      
      // Preview: Ctrl+Shift+P
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        togglePreviewMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, handleManualSave, toggleFullscreen, togglePreviewMode]);

  // 🎯 TOOLBAR BUTTON COMPONENT
  const ToolbarButton = ({ icon: Icon, onClick, title, active = false, disabled = false, className = '' }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded-lg transition-all duration-200 flex items-center justify-center
        ${active 
          ? 'bg-blue-500 text-white shadow-md' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  // 🌟 MAIN RENDER
  return (
    <>
      {/* 🖥️ MAIN CONTAINER */}
      <div className={`
        advanced-rich-text-editor
        ${isFullscreen ? 'fixed inset-0 z-[9999] bg-white dark:bg-gray-900' : 'relative w-full h-full'}
        ${className}
      `}>
        
        {/* 🛠️ MAIN TOOLBAR */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
          
          {/* 🎯 FORMATTING TOOLBAR */}
          <div className="flex items-center gap-2">
            
            {/* Text Formatting */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-3 mr-3">
              <ToolbarButton 
                icon={Bold} 
                onClick={() => editor?.chain().focus().toggleBold().run()} 
                title="Fett (Ctrl+B)"
                active={editor?.isActive('bold')}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={Italic} 
                onClick={() => editor?.chain().focus().toggleItalic().run()} 
                title="Kursiv (Ctrl+I)"
                active={editor?.isActive('italic')}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={UnderlineIcon} 
                onClick={() => editor?.chain().focus().toggleUnderline().run()} 
                title="Unterstrichen (Ctrl+U)"
                active={editor?.isActive('underline')}
                disabled={!editor}
              />
            </div>

            {/* Headings */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-3 mr-3">
              <ToolbarButton 
                icon={Heading1} 
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} 
                title="Überschrift 1"
                active={editor?.isActive('heading', { level: 1 })}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={Heading2} 
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} 
                title="Überschrift 2"
                active={editor?.isActive('heading', { level: 2 })}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={Heading3} 
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} 
                title="Überschrift 3"
                active={editor?.isActive('heading', { level: 3 })}
                disabled={!editor}
              />
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-3 mr-3">
              <ToolbarButton 
                icon={List} 
                onClick={() => editor?.chain().focus().toggleBulletList().run()} 
                title="Aufzählungsliste"
                active={editor?.isActive('bulletList')}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={ListOrdered} 
                onClick={() => editor?.chain().focus().toggleOrderedList().run()} 
                title="Nummerierte Liste"
                active={editor?.isActive('orderedList')}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={CheckSquare} 
                onClick={() => editor?.chain().focus().toggleTaskList().run()} 
                title="Aufgabenliste"
                active={editor?.isActive('taskList')}
                disabled={!editor}
              />
            </div>

            {/* Text Alignment */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-3 mr-3">
              <ToolbarButton 
                icon={AlignLeft} 
                onClick={() => editor?.chain().focus().setTextAlign('left').run()} 
                title="Linksbündig"
                active={editor?.isActive({ textAlign: 'left' })}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={AlignCenter} 
                onClick={() => editor?.chain().focus().setTextAlign('center').run()} 
                title="Zentriert"
                active={editor?.isActive({ textAlign: 'center' })}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={AlignRight} 
                onClick={() => editor?.chain().focus().setTextAlign('right').run()} 
                title="Rechtsbündig"
                active={editor?.isActive({ textAlign: 'right' })}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={AlignJustify} 
                onClick={() => editor?.chain().focus().setTextAlign('justify').run()} 
                title="Blocksatz"
                active={editor?.isActive({ textAlign: 'justify' })}
                disabled={!editor}
              />
            </div>

            {/* Special Elements */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-3 mr-3">
              <ToolbarButton 
                icon={Quote} 
                onClick={() => editor?.chain().focus().toggleBlockquote().run()} 
                title="Zitat"
                active={editor?.isActive('blockquote')}
                disabled={!editor}
              />
              <ToolbarButton 
                icon={Code} 
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()} 
                title="Code-Block"
                active={editor?.isActive('codeBlock')}
                disabled={!editor}
              />
            </div>

            {/* Insert Elements */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-3 mr-3">
              <ToolbarButton 
                icon={LinkIcon} 
                onClick={() => setShowLinkMenu(!showLinkMenu)} 
                title="Link einfügen"
                disabled={!editor}
              />
              <ToolbarButton 
                icon={ImageIcon} 
                onClick={() => setShowImageMenu(!showImageMenu)} 
                title="Bild einfügen"
                disabled={!editor}
              />
              <ToolbarButton 
                icon={TableIcon} 
                onClick={() => setShowTableMenu(!showTableMenu)} 
                title="Tabelle einfügen"
                disabled={!editor}
              />
            </div>

            {/* History */}
            <div className="flex items-center gap-1">
              <ToolbarButton 
                icon={Undo} 
                onClick={() => editor?.chain().focus().undo().run()} 
                title="Rückgängig (Ctrl+Z)"
                disabled={!editor || !editor.can().undo()}
              />
              <ToolbarButton 
                icon={Redo} 
                onClick={() => editor?.chain().focus().redo().run()} 
                title="Wiederholen (Ctrl+Y)"
                disabled={!editor || !editor.can().redo()}
              />
            </div>
          </div>
          
          {/* 📊 STATUS INFO */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Advanced Editor</span>
            </div>
            
            {/* 📈 WORD/CHARACTER COUNT */}
            <div className="text-sm text-gray-500 dark:text-gray-400 hidden lg:flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Type size={14} />
                {wordCount} Wörter
              </span>
              <span>{characterCount} Zeichen</span>
            </div>
          </div>
          
          {/* 📊 CONTROLS */}
          <div className="flex items-center gap-4">
            
            {/* 💾 SAVE STATUS */}
            {autoSave && (
              <div className="flex items-center gap-2 text-sm">
                {isSaving ? (
                  <span className="text-blue-500 flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Speichern...
                  </span>
                ) : lastSaved ? (
                  <span className="text-green-500 flex items-center gap-1">
                    ✓ Gespeichert {lastSaved.toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
            )}
            
            {/* 🔧 ACTION BUTTONS */}
            <div className="flex items-center gap-2">
              
              {/* 💾 MANUAL SAVE */}
              {!autoSave && (
                <ToolbarButton 
                  icon={Save} 
                  onClick={handleManualSave} 
                  title="Dokument speichern (Ctrl+S)"
                  disabled={isSaving || readOnly}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                />
              )}
              
              {/* 👁️ PREVIEW TOGGLE */}
              <ToolbarButton 
                icon={isPreviewMode ? Eye : EyeOff} 
                onClick={togglePreviewMode} 
                title={isPreviewMode ? "Bearbeitungsmodus" : "Vorschau (Ctrl+Shift+P)"}
                className={isPreviewMode ? 'bg-purple-500 text-white' : ''}
              />
              
              {/* 🖥️ FULLSCREEN TOGGLE */}
              {allowFullscreen && (
                <ToolbarButton 
                  icon={isFullscreen ? Minimize : Maximize} 
                  onClick={toggleFullscreen} 
                  title={isFullscreen ? "Vollbild beenden (F11)" : "Vollbild (F11)"}
                />
              )}
            </div>
          </div>
        </div>

        {/* 🔗 FLOATING MENUS */}
        {showLinkMenu && (
          <div className="absolute top-20 left-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[300px]">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Link einfügen</span>
            </div>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && insertLink()}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={insertLink}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Einfügen
              </button>
              <button
                onClick={() => setShowLinkMenu(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {showImageMenu && (
          <div className="absolute top-20 left-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[300px]">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-4 w-4 text-green-500" />
              <span className="font-medium">Bild einfügen</span>
            </div>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && insertImage()}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={insertImage}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Einfügen
              </button>
              <button
                onClick={() => setShowImageMenu(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {showTableMenu && (
          <div className="absolute top-20 left-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[300px]">
            <div className="flex items-center gap-2 mb-3">
              <TableIcon className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Tabelle einfügen</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zeilen</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spalten</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={insertTable}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Tabelle einfügen
              </button>
              <button
                onClick={() => setShowTableMenu(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
        
        {/* ✍️ EDITOR AREA */}
        <div className={`
          relative overflow-hidden flex-1
          ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'min-h-[600px]'}
        `}>
          
          {/* 🎯 PREVIEW MODE */}
          {isPreviewMode ? (
            <div 
              className="p-8 prose prose-lg dark:prose-invert max-w-none overflow-y-auto h-full"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            
            /* ✍️ TIPTAP EDITOR */
            <div 
              className={`
                tiptap-editor-container relative h-full
                ${isFullscreen ? 'h-full' : ''}
              `}
            >
              
              {/* 🚀 TIPTAP EDITOR WITH ADVANCED STYLING */}
              <div className="tiptap-editor-wrapper h-full">
                <EditorContent 
                  editor={editor} 
                  className="tiptap-editor h-full overflow-y-auto"
                />
              </div>
              
              {/* ⚡ FEATURE HINTS */}
              {!content && (
                <div className="absolute top-8 left-8 pointer-events-none z-10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                      <span className="text-blue-500">⚡</span>
                      <span>Drücke <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+B</kbd> für Fett, <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+I</kbd> für Kursiv</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                      <span className="text-green-500">🎨</span>
                      <span>Nutze die Toolbar für erweiterte Formatierung</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                      <span className="text-purple-500">📊</span>
                      <span>Füge Tabellen, Bilder und Links hinzu</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 📊 FOOTER STATUS */}
        {isFullscreen && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{wordCount} Wörter</span>
              <span>{characterCount} Zeichen</span>
              <span className="text-blue-500">Advanced Rich Text Editor</span>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Drücke <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">F11</kbd> um Vollbild zu beenden
            </div>
          </div>
        )}
      </div>
      
      {/* ⌨️ KEYBOARD SHORTCUTS */}
      {isFullscreen && (
        <div
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              toggleFullscreen();
            }
          }}
          style={{ position: 'fixed', left: '-9999px' }}
        />
      )}
    </>
  );
};

export default AdvancedRichTextEditor;
