import React, { useState } from 'react';
import AdvancedRichTextEditor from './components/AdvancedRichTextEditor';

const EditorDemo = () => {
  const [content, setContent] = useState(`
    <h1>🚀 Willkommen beim Advanced Rich Text Editor!</h1>
    
    <p>Dieser Editor kombiniert die besten Features von <strong>Google Docs</strong> und <strong>Notion</strong> in einer modernen, benutzerfreundlichen Oberfläche.</p>
    
    <h2>✨ Verfügbare Features:</h2>
    
    <ul>
      <li><strong>Vollständige Formatierung:</strong> Fett, Kursiv, Unterstrichen, Überschriften</li>
      <li><strong>Listen:</strong> Aufzählungslisten, nummerierte Listen, Aufgabenlisten</li>
      <li><strong>Text-Ausrichtung:</strong> Links, Zentriert, Rechts, Blocksatz</li>
      <li><strong>Spezielle Elemente:</strong> Zitate, Code-Blöcke, Links, Bilder</li>
      <li><strong>Tabellen:</strong> Vollständige Tabellenunterstützung mit anpassbarer Größe</li>
      <li><strong>Vollbild-Modus:</strong> Fokus auf das Schreiben</li>
      <li><strong>Vorschau-Modus:</strong> Sieh dein Dokument ohne Toolbar</li>
      <li><strong>Auto-Save:</strong> Automatisches Speichern alle 3 Sekunden</li>
      <li><strong>Keyboard Shortcuts:</strong> Schnelle Bedienung</li>
    </ul>
    
    <h2>🎯 Probier es aus:</h2>
    
    <p>Wähle Text aus und nutze die Toolbar-Buttons oder die Keyboard Shortcuts:</p>
    
    <ul>
      <li><kbd>Ctrl+B</kbd> für <strong>Fett</strong></li>
      <li><kbd>Ctrl+I</kbd> für <em>Kursiv</em></li>
      <li><kbd>Ctrl+U</kbd> für <u>Unterstrichen</u></li>
      <li><kbd>F11</kbd> für Vollbild-Modus</li>
      <li><kbd>Ctrl+Shift+P</kbd> für Vorschau-Modus</li>
    </ul>
    
    <h2>📊 Beispiel-Tabelle:</h2>
    
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Beschreibung</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Rich Text</td>
          <td>Vollständige Textformatierung</td>
          <td>✅ Aktiv</td>
        </tr>
        <tr>
          <td>Tabellen</td>
          <td>Anpassbare Tabellen</td>
          <td>✅ Aktiv</td>
        </tr>
        <tr>
          <td>Bilder</td>
          <td>Bild-Upload und -Verwaltung</td>
          <td>✅ Aktiv</td>
        </tr>
      </tbody>
    </table>
    
    <h2>💡 Tipps:</h2>
    
    <blockquote>
      <p>Nutze den Vollbild-Modus für maximale Konzentration beim Schreiben. Alle Features bleiben verfügbar, aber du hast mehr Platz für deinen Inhalt.</p>
    </blockquote>
    
    <p>Der Editor speichert automatisch deine Änderungen. Du kannst aber auch manuell mit <kbd>Ctrl+S</kbd> speichern.</p>
  `);

  const handleContentChange = (newContent) => {
    setContent(newContent);
    console.log('Content changed:', newContent);
  };

  const handleSave = async (contentToSave) => {
    // Simuliere einen Save-Vorgang
    console.log('Saving content:', contentToSave);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Content saved successfully!');
        resolve();
      }, 1000);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Advanced Rich Text Editor Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Eine perfekte Mischung aus Google Docs und Notion - mit TipTap Framework
          </p>
        </div>
      </div>

      {/* Editor Container */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <AdvancedRichTextEditor
            initialContent={content}
            onChange={handleContentChange}
            onSave={handleSave}
            autoSave={true}
            autoSaveDelay={3000}
            allowFullscreen={true}
            placeholder="Beginne mit dem Schreiben... Nutze die Toolbar für alle Formatierungsoptionen!"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            📝 Editor-Informationen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">🎯 Features</h4>
              <ul className="space-y-1">
                <li>• Vollständige Rich Text Formatierung</li>
                <li>• Tabellen mit anpassbarer Größe</li>
                <li>• Bild- und Link-Einfügung</li>
                <li>• Aufgabenlisten und Checkboxen</li>
                <li>• Code-Blöcke mit Syntax-Highlighting</li>
                <li>• Vollbild-Modus für maximale Konzentration</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">⌨️ Shortcuts</h4>
              <ul className="space-y-1">
                <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+B</kbd> Fett</li>
                <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+I</kbd> Kursiv</li>
                <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+U</kbd> Unterstrichen</li>
                <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">F11</kbd> Vollbild</li>
                <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+S</kbd> Speichern</li>
                <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+Shift+P</kbd> Vorschau</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorDemo;
