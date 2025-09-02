import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  Type,
  Zap,
  Plus,
  X,
  Save,
  Eye,
  Download,
  Share2,
  Settings,
  Users,
  History,
  BarChart3,
  ArrowLeft,
  Sparkles,
  Star,
  Bookmark,
  Tag,
  FolderOpen,
  Clock,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Revolutionary TipTap Editor Component
const TipTapEditor = ({ document, onSave, onClose }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('actions');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommands, setSlashCommands] = useState([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: 'Beginne mit dem Schreiben oder tippe "/" für Befehle...',
      }),
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight: createLowlight(common),
      })
    ],
    content: document?.content || '',
    onUpdate: ({ editor }) => {
      // Auto-save functionality
      const content = editor.getHTML();
      console.log('Content updated:', content);
      
      // Check for slash commands
      const { from, to } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from);
      const lastChar = textBefore.slice(-1);
      
      if (lastChar === '/') {
        const commands = [
          { title: 'Große Überschrift', icon: Heading1, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).setNode('heading', { level: 1 }).run() },
          { title: 'Mittlere Überschrift', icon: Heading2, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).setNode('heading', { level: 2 }).run() },
          { title: 'Kleine Überschrift', icon: Heading3, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).setNode('heading', { level: 3 }).run() },
          { title: 'Text', icon: Type, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).setParagraph().run() },
          { title: 'Aufzählungsliste', icon: List, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).toggleBulletList().run() },
          { title: 'Nummerierte Liste', icon: ListOrdered, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).toggleOrderedList().run() },
          { title: 'Aufgabenliste', icon: CheckSquare, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).toggleTaskList().run() },
          { title: 'Zitat', icon: Quote, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).toggleBlockquote().run() },
          { title: 'Code Block', icon: Code, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).toggleCodeBlock().run() },
          { title: 'Tabelle', icon: TableIcon, command: () => editor.chain().focus().deleteRange({ from: from - 1, to }).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
          { title: 'Bild', icon: ImageIcon, command: () => {
            editor.chain().focus().deleteRange({ from: from - 1, to }).run();
            const url = window.prompt('Bild-URL eingeben:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
        ];
        setSlashCommands(commands);
        setShowSlashCommands(true);
        setSelectedCommandIndex(0);
      } else {
        setShowSlashCommands(false);
      }
    },
  });

  // Load document content when document changes
  useEffect(() => {
    if (editor && document?.content) {
      editor.commands.setContent(document.content);
    }
  }, [editor, document]);

  // Keyboard navigation for slash commands
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!showSlashCommands) return;
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedCommandIndex((prev) => (prev + 1) % slashCommands.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedCommandIndex((prev) => (prev - 1 + slashCommands.length) % slashCommands.length);
          break;
        case 'Enter':
          event.preventDefault();
          if (slashCommands[selectedCommandIndex]) {
            slashCommands[selectedCommandIndex].command();
            setShowSlashCommands(false);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowSlashCommands(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSlashCommands, slashCommands, selectedCommandIndex]);

  const handleSave = () => {
    if (editor && onSave) {
      const content = editor.getHTML();
      onSave(content);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const addImage = () => {
    const url = window.prompt('Bild-URL eingeben:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const url = window.prompt('Link-URL eingeben:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const sidebarTabs = [
    {
      id: 'actions',
      label: 'Aktionen',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <button
            onClick={handleSave}
            className="w-full flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Speichern</span>
          </button>
          
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{showPreview ? 'Bearbeiten' : 'Vorschau'}</span>
          </button>
          
          <button
            onClick={() => {/* Export functionality */}}
            className="w-full flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportieren</span>
          </button>
          
          <button
            onClick={() => {/* Share functionality */}}
            className="w-full flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Teilen</span>
          </button>
        </div>
      )
    },
    {
      id: 'properties',
      label: 'Eigenschaften',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titel
            </label>
            <input
              type="text"
              defaultValue={document?.title || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Dokumenttitel..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Allgemein</option>
              <option>Arbeit</option>
              <option>Persönlich</option>
              <option>Projekte</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tag1, Tag2, Tag3..."
            />
          </div>
        </div>
      )
    },
    {
      id: 'collaboration',
      label: 'Zusammenarbeit',
      icon: Users,
      content: (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">
              Kollaborations-Features werden bald verfügbar sein!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'history',
      label: 'Verlauf',
      icon: History,
      content: (
        <div className="space-y-4">
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">
              Versionsverlauf wird bald verfügbar sein!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">
              Analytics werden bald verfügbar sein!
            </p>
          </div>
        </div>
      )
    }
  ];

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {document?.title || 'Neues Dokument'}
            </h1>
            <p className="text-sm text-gray-500">
              {showPreview ? 'Vorschau' : 'Bearbeitung'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{showPreview ? 'Bearbeiten' : 'Vorschau'}</span>
          </button>
          
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Speichern</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-gray-200">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mx-auto mb-1" />
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Sidebar Content */}
            <div className="flex-1 overflow-auto p-4">
              {sidebarTabs.find(tab => tab.id === activeTab)?.content}
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center space-x-2 flex-wrap">
              {/* Text Formatting */}
              <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('bold')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('italic')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Italic className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('underline')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <UnderlineIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('strike')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Strikethrough className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleHighlight().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('highlight')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                </button>
              </div>

              {/* Headings */}
              <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('heading', { level: 1 })
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Heading1 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('heading', { level: 2 })
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('heading', { level: 3 })
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Heading3 className="w-4 h-4" />
                </button>
              </div>

              {/* Lists */}
              <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('bulletList')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('orderedList')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleTaskList().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('taskList')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
              </div>

              {/* Alignment */}
              <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
                <button
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive({ textAlign: 'left' })
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive({ textAlign: 'center' })
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive({ textAlign: 'right' })
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive({ textAlign: 'justify' })
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
              </div>

              {/* Insert */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={setLink}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('link')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={addImage}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('codeBlock')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Code className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`p-2 rounded transition-colors ${
                    editor.isActive('blockquote')
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Quote className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-8">
              {showPreview ? (
                <div className="prose prose-lg max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
                </div>
              ) : (
                <EditorContent 
                  editor={editor} 
                  className="prose prose-lg max-w-none focus:outline-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slash Commands Menu */}
      {showSlashCommands && (
        <div className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-w-sm">
          <div className="p-2 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-700">Befehle</div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {slashCommands.map((command, index) => (
              <button
                key={index}
                onClick={() => {
                  command.command();
                  setShowSlashCommands(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                  index === selectedCommandIndex ? 'bg-blue-50' : ''
                }`}
                onMouseEnter={() => setSelectedCommandIndex(index)}
              >
                <command.icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{command.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TipTapEditor;
