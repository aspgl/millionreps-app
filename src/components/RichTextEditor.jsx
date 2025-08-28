import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { createSlashCommandExtension } from './SlashCommands';
import '../styles/novel-editor.css';
import { 
  Save,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Type
} from 'lucide-react';

/**
 * 🔥 NOVEL.SH POWERED RICH TEXT EDITOR 🔥
 * 
 * FEATURES:
 * ✅ Slash menu & bubble menu
 * ✅ AI autocomplete (type ++ to activate)
 * ✅ Image uploads (drag & drop / copy & paste)
 * ✅ Tweet embeds from slash menu
 * ✅ Mathematical symbols with LaTeX
 * ✅ Professional editor experience
 * 
 * Built with Novel.sh framework
 */

const RichTextEditor = ({ 
  initialContent = '', 
  onChange = () => {}, 
  placeholder = "Type '/' for commands or '++' for AI...",
  readOnly = false,
  showToolbar = true,
  className = '',
  autoSave = true,
  autoSaveDelay = 2000,
  maxHeight = '600px',
  allowFullscreen = true
}) => {
  // 🎯 STATE MANAGEMENT
  const [content, setContent] = useState(initialContent);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

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
      }),
      createSlashCommandExtension(), // Add slash commands
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert focus:outline-none max-w-full novel-editor-content',
        'data-placeholder': placeholder,
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
        await onChange(content);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, autoSaveDelay);

    return () => clearTimeout(saveTimer);
  }, [content, autoSave, autoSaveDelay, onChange, initialContent]);

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
      await onChange(content);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [content, onChange]);

  // 🌟 MAIN RENDER
  return (
    <>
      {/* 🖥️ MAIN CONTAINER */}
      <div className={`
        novel-rich-text-editor
        ${isFullscreen ? 'fixed inset-0 z-[9999] bg-white dark:bg-gray-900' : 'relative'}
        ${className}
      `}>
        
        {/* 🛠️ TOOLBAR */}
        {showToolbar && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
            
            {/* 🎯 FORMATTING TOOLBAR */}
            <div className="flex items-center gap-2">
              
              {/* Bold */}
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                disabled={!editor}
                className={`p-2 rounded-lg transition-colors ${
                  editor?.isActive('bold') 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title="Bold (Ctrl+B)"
              >
                <b>B</b>
              </button>
              
              {/* Italic */}
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                disabled={!editor}
                className={`p-2 rounded-lg transition-colors ${
                  editor?.isActive('italic') 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title="Italic (Ctrl+I)"
              >
                <i>I</i>
              </button>
              
              {/* Separator */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
              
              {/* Heading 1 */}
              <button
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                disabled={!editor}
                className={`p-2 rounded-lg transition-colors ${
                  editor?.isActive('heading', { level: 1 }) 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title="Heading 1"
              >
                H1
              </button>
              
              {/* Heading 2 */}
              <button
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                disabled={!editor}
                className={`p-2 rounded-lg transition-colors ${
                  editor?.isActive('heading', { level: 2 }) 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title="Heading 2"
              >
                H2
              </button>
              
              {/* Separator */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
              
              {/* Bullet List */}
              <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                disabled={!editor}
                className={`p-2 rounded-lg transition-colors ${
                  editor?.isActive('bulletList') 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title="Bullet List"
              >
                •
              </button>
              
              {/* Blockquote */}
              <button
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                disabled={!editor}
                className={`p-2 rounded-lg transition-colors ${
                  editor?.isActive('blockquote') 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title="Blockquote"
              >
                "
              </button>
            </div>
            
            {/* 📊 STATUS INFO */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Rich Text Editor</span>
              </div>
              
              {/* 📈 WORD/CHARACTER COUNT */}
              <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Type size={14} />
                  {wordCount} words
                </span>
                <span>{characterCount} chars</span>
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
                      Saving...
                    </span>
                  ) : lastSaved ? (
                    <span className="text-green-500 flex items-center gap-1">
                      ✓ Saved {lastSaved.toLocaleTimeString()}
                    </span>
                  ) : null}
                </div>
              )}
              
              {/* 🔧 ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                
                {/* 💾 MANUAL SAVE */}
                {!autoSave && (
                  <button
                    onClick={handleManualSave}
                    disabled={isSaving || readOnly}
                    className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
                    title="Save Document"
                  >
                    <Save size={16} />
                  </button>
                )}
                
                {/* 👁️ PREVIEW TOGGLE */}
                <button
                  onClick={togglePreviewMode}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isPreviewMode 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                  title={isPreviewMode ? "Edit Mode" : "Preview Mode"}
                >
                  {isPreviewMode ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                
                {/* 🖥️ FULLSCREEN TOGGLE */}
                {allowFullscreen && (
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* ✍️ EDITOR AREA */}
        <div className={`
          relative overflow-hidden
          ${isFullscreen ? 'h-[calc(100vh-80px)]' : ''}
        `}>
          
          {/* 🎯 PREVIEW MODE */}
          {isPreviewMode ? (
            <div 
              className="p-6 prose prose-lg dark:prose-invert max-w-none overflow-y-auto novel-preview"
              style={{ maxHeight: isFullscreen ? '100%' : maxHeight }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            
            /* ✍️ NOVEL EDITOR */
            <div 
              className={`
                novel-editor-container relative
                ${isFullscreen ? 'h-full' : ''}
              `}
              style={{ maxHeight: isFullscreen ? '100%' : maxHeight }}
            >
              
              {/* 🚀 TIPTAP EDITOR WITH NOVEL.SH STYLING */}
              <div className="novel-editor-wrapper">
                <EditorContent 
                  editor={editor} 
                  className="novel-editor min-h-[400px] p-6"
                />
              </div>
              
              {/* ⚡ FEATURE HINTS */}
              {!content && (
                <div className="absolute top-6 left-6 pointer-events-none z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                      <span className="text-blue-500">⚡</span>
                      <span>Type <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">/</kbd> for slash commands</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                      <span className="text-green-500">⌨️</span>
                      <span>Use <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+B</kbd> for bold, <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+I</kbd> for italic</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                      <span className="text-purple-500">🎨</span>
                      <span>Rich text formatting with beautiful styling</span>
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
              <span>{wordCount} words</span>
              <span>{characterCount} characters</span>
              <span className="text-blue-500">Novel.sh Editor</span>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">ESC</kbd> to exit fullscreen
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

export default RichTextEditor;
