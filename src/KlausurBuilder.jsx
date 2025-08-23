import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  GripVertical,
  Type,
  ListChecks,
  CheckSquare,
  AlignLeft,
  FileText,
  Layers,
  BookOpen,
  Upload,
  X,
  Settings,
  HelpCircle,
  Clock,
  Info,
  Play,
  Save,
  Download,
  Sparkles,
  Target,
  Plus,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./AuthContext";
import RichTextEditor from "./RichTextEditor";

// Frage-Typen mit erweiterten Icons und Beschreibungen
const QUESTION_TYPES = [
  { 
    value: "short-text", 
    label: "Kurzantwort", 
    icon: Type,
    description: "Kurze Textantworten",
    color: "blue",
    category: "Text"
  },
  { 
    value: "long-text", 
    label: "Langantwort", 
    icon: AlignLeft,
    description: "Ausführliche Textantworten",
    color: "green",
    category: "Text"
  },
  { 
    value: "multiple-choice", 
    label: "Multiple Choice", 
    icon: ListChecks,
    description: "Mehrere Antworten möglich",
    color: "purple",
    category: "Auswahl"
  },
  { 
    value: "single-choice", 
    label: "Single Choice", 
    icon: CheckSquare,
    description: "Eine Antwort auswählen",
    color: "indigo",
    category: "Auswahl"
  },
  { 
    value: "true-false", 
    label: "Wahr/Falsch", 
    icon: CheckSquare,
    description: "Richtig oder falsch",
    color: "orange",
    category: "Auswahl"
  },
  { 
    value: "cloze", 
    label: "Lückentext", 
    icon: FileText,
    description: "Lücken im Text ausfüllen",
    color: "teal",
    category: "Text"
  },
  { 
    value: "steps", 
    label: "Schritte", 
    icon: Layers,
    description: "Schritt-für-Schritt Anleitung",
    color: "pink",
    category: "Strukturiert"
  },
  { 
    value: "flashcard", 
    label: "Karteikarte", 
    icon: BookOpen,
    description: "Vorder- und Rückseite",
    color: "yellow",
    category: "Lernen"
  },
];

// Zwischenelement-Typen
const ELEMENT_TYPES = [
  { 
    value: "info-block", 
    label: "Informations-Block", 
    icon: Info,
    description: "Text mit Formatierung",
    color: "blue",
    category: "Inhalt"
  },
  { 
    value: "youtube-embed", 
    label: "YouTube Video", 
    icon: Play,
    description: "Video einbetten",
    color: "red",
    category: "Media"
  },
];

// Helper
const uuid = () =>
  crypto?.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const nowIso = () => new Date().toISOString();

export default function KlausurBuilder() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [questions, setQuestions] = useState([]);
  const [message, setMessage] = useState("");

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");

  // Hinweis Modal
  const [showHintModal, setShowHintModal] = useState(false);
  const [activeHintQuestion, setActiveHintQuestion] = useState(null);
  const [tempHint, setTempHint] = useState("");

  // Einleitung + Dateien
  const [introText, setIntroText] = useState("");
  const [files, setFiles] = useState([]);

  // Kollektionen und Tags State
  const [collections, setCollections] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [showElementModal, setShowElementModal] = useState(false);

  const textareaRefs = useRef({});
  const dropdownRef = useRef(null);

  // Click outside handler für Modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowElementModal(false);
      }
    };

    if (showElementModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showElementModal]);

  // Kollektionen und Tags Funktionen
  const loadCollections = async () => {
    const { data, error } = await supabase
      .from("exams_collections")
      .select("*")
      .eq("created_by", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fehler beim Laden der Kollektionen:", error);
    } else {
      setCollections(data || []);
    }
  };

  const loadTags = async () => {
    const { data, error } = await supabase
      .from("exams_tags")
      .select("*")
      .eq("created_by", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fehler beim Laden der Tags:", error);
    } else {
      setTags(data || []);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    const { data, error } = await supabase
      .from("exams_collections")
      .insert([
        {
          collection_name: newCollectionName.trim(),
          created_by: user?.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Fehler beim Erstellen der Kollektion:", error);
      setMessage("❌ Fehler beim Erstellen der Kollektion");
    } else {
      setCollections([data, ...collections]);
      setSelectedCollection(data);
      setNewCollectionName("");
      setShowNewCollectionInput(false);
      setMessage("✅ Kollektion erstellt!");
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    const { data, error } = await supabase
      .from("exams_tags")
      .insert([
        {
          tag_name: newTagName.trim(),
          created_by: user?.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Fehler beim Erstellen des Tags:", error);
      setMessage("❌ Fehler beim Erstellen des Tags");
    } else {
      setTags([data, ...tags]);
      setSelectedTags([...selectedTags, data]);
      setNewTagName("");
      setShowNewTagInput(false);
      setMessage("✅ Tag erstellt!");
    }
  };

  const toggleTagSelection = (tag) => {
    setSelectedTags(prev => 
      prev.find(t => t.id === tag.id)
        ? prev.filter(t => t.id !== tag.id)
        : [...prev, tag]
    );
  };

  // Lade Kollektionen und Tags beim Öffnen der Settings
  const handleOpenSettings = () => {
    setShowSettings(true);
    loadCollections();
    loadTags();
  };

  // Fragen und Elemente Logik
  const addElement = (elementType = "short-text") => {
    const baseElement = {
      id: Date.now(),
      hint: "",
      timeLimit: "",
    };

    let newElement;

    if (ELEMENT_TYPES.find(t => t.value === elementType)) {
      // Zwischenelement
      switch (elementType) {
        case "info-block":
          newElement = {
            ...baseElement,
            type: "info-block",
            title: "",
            content: "",
            isCollapsible: false,
          };
          break;
        case "youtube-embed":
          newElement = {
            ...baseElement,
            type: "youtube-embed",
            videoId: "",
            title: "",
            description: "",
          };
          break;
        default:
          newElement = {
            ...baseElement,
            type: "info-block",
            title: "",
            content: "",
            isCollapsible: false,
          };
      }
    } else {
      // Frage
      newElement = {
        ...baseElement,
        type: elementType,
        question: "",
        answer: "",
        choices: [],
        correct: [],
        correctAnswer: null, // Für True/False Fragen
        steps: [],
        front: "",
        back: "",
        answers: {},
      };
    }

    setQuestions([...questions, newElement]);
  };

  const addQuestion = () => {
    addElement("short-text");
  };

  const updateQuestion = (id, patch) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  };

  const insertClozeGap = (q) => {
    const ta = textareaRefs.current[q.id];
    if (!ta) return;
    const cursor = ta.selectionStart;
    
    // Finde alle existierenden Lücken im Text
    const gapMatches = q.question.match(/\{\{(\d+)\}\}/g) || [];
    const existingGaps = gapMatches.map(match => parseInt(match.replace(/\{\{|\}\}/g, '')));
    const nextIndex = existingGaps.length > 0 ? Math.max(...existingGaps) + 1 : 1;
    
    const insert = `{{${nextIndex}}}`;
    const newPrompt =
      q.question.slice(0, cursor) + insert + q.question.slice(cursor);
    updateQuestion(q.id, {
      question: newPrompt,
      answers: { ...q.answers, [nextIndex]: "" },
    });
  };

  // YouTube Video ID extrahieren
  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // File Upload
  const handleFileUpload = (e) => {
    const selected = Array.from(e.target.files);
    const valid = selected.filter((f) => f.size <= 5 * 1024 * 1024);
    if (valid.length !== selected.length) {
      alert("❌ Eine Datei war größer als 5 MB und wurde ignoriert!");
    }
    setFiles([...files, ...valid]);
  };
  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));

  // Export als JSON
  const exportExam = () => {
    const exam = {
      id: uuid(),
      title: title.trim(),
      description: desc.trim(),
      introText: introText.trim(),
      files: files.map((f) => f.name),
      created_at: nowIso(),
      updated_at: nowIso(),
      questions,
    };
    const blob = new Blob([JSON.stringify(exam, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exam.title || "klausur"}-${exam.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("✅ Klausur exportiert!");
  };

  // Speichern in Supabase
  const saveExam = async () => {
    const exam = {
      id: uuid(),
      title: title.trim(),
      description: desc.trim(),
      introText: introText.trim(),
      files: files.map((f) => f.name),
      created_at: nowIso(),
      updated_at: nowIso(),
      questions,
    };

    // Bereite die Daten für die exams Tabelle vor
    const examData = {
      title: exam.title,
      description: exam.description,
      introduction_text: introText.trim(), // Neue Spalte für Rich Text Einleitung
      created_at: exam.created_at,
      updated_at: exam.updated_at,
      content: exam, // JSONB Column
      created_by: user?.id || null, // <<--- User wird gespeichert
    };

    // Füge collection_id hinzu, falls eine Kollektion ausgewählt wurde
    if (selectedCollection) {
      examData.collection_id = selectedCollection.id;
    }

    // Füge tag_ids hinzu, falls Tags ausgewählt wurden
    if (selectedTags.length > 0) {
      examData.tag_ids = selectedTags.map(tag => tag.id);
    }

    // Speichere die Klausur mit collection_id und tag_ids
    const { data: savedExam, error: examError } = await supabase
      .from("exams")
      .insert([examData])
      .select()
      .single();

    if (examError) {
      console.error(examError);
      setMessage("❌ Fehler beim Speichern in Supabase");
    } else {
      setMessage("✅ Klausur erfolgreich gespeichert!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Klausur Builder</h1>
                  <p className="text-sm text-gray-600">Erstelle interaktive Lerninhalte</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                  <Target className="h-4 w-4" />
                  <span>{questions.length} Elemente</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full">
                  <Clock className="h-4 w-4" />
                  <span>Draft</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenSettings}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={exportExam}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={saveExam}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl"
              >
                <Save className="h-4 w-4" />
                Speichern
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Titel + Beschreibung */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel der Klausur..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-xl font-semibold placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Beschreibung der Klausur..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        {/* Fragen */}
        <div className="space-y-6">
          <AnimatePresence>
          {questions.map((q, idx) => {
            const TypeIcon =
              QUESTION_TYPES.find((t) => t.value === q.type)?.icon || Type;
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-xl bg-white shadow p-5 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                    <h3 className="font-semibold text-gray-700">
                      {ELEMENT_TYPES.find(t => t.value === q.type) ? 
                        `Element ${idx + 1} (${ELEMENT_TYPES.find(t => t.value === q.type)?.label})` :
                        `Frage ${idx + 1} (${QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type})`
                      }
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setActiveHintQuestion(q.id);
                        setTempHint(q.hint || "");
                        setShowHintModal(true);
                      }}
                      className={`flex items-center gap-1 text-sm ${
                        q.hint
                          ? "text-green-600 hover:text-green-700"
                          : "text-gray-500 hover:text-indigo-600"
                      }`}
                    >
                      <HelpCircle className="h-4 w-4" />
                      Hinweis
                    </button>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                {/* Typ Auswahl */}
                <div className="flex items-center gap-2">
                  <select
                    value={q.type}
                    onChange={(e) =>
                      updateQuestion(q.id, { type: e.target.value })
                    }
                    className="rounded-lg border px-3 py-2"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <TypeIcon className="h-5 w-5 text-gray-400" />
                </div>

                {/* Frage Text (nicht für Flashcards und Zwischenelemente) */}
                {q.type !== "flashcard" && !ELEMENT_TYPES.find(t => t.value === q.type) && (
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) =>
                      updateQuestion(q.id, { question: e.target.value })
                    }
                    placeholder="Fragetext eingeben..."
                    className="w-full rounded-lg border px-3 py-2"
                  />
                )}

                {/* Antworten je nach Typ */}
                {q.type === "short-text" || q.type === "long-text" ? (
                  <input
                    type="text"
                    value={q.answer}
                    onChange={(e) =>
                      updateQuestion(q.id, { answer: e.target.value })
                    }
                    placeholder="Musterantwort..."
                    className="w-full rounded-lg border px-3 py-2"
                  />
                ) : q.type === "multiple-choice" || q.type === "single-choice" ? (
                  <div className="space-y-2">
                    {(q.choices || []).map((choice, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 border rounded-lg px-2 py-1"
                      >
                        <input
                          type="text"
                          value={choice}
                          onChange={(e) => {
                            const newChoices = [...q.choices];
                            newChoices[i] = e.target.value;
                            updateQuestion(q.id, { choices: newChoices });
                          }}
                          className="flex-1 border-none focus:ring-0"
                        />
                        <input
                          type={
                            q.type === "single-choice" ? "radio" : "checkbox"
                          }
                          checked={q.correct.includes(i)}
                          onChange={() => {
                            let newCorrect;
                            if (q.type === "single-choice") {
                              newCorrect = [i];
                            } else {
                              newCorrect = q.correct.includes(i)
                                ? q.correct.filter((c) => c !== i)
                                : [...q.correct, i];
                            }
                            updateQuestion(q.id, { correct: newCorrect });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        updateQuestion(q.id, { choices: [...q.choices, ""] })
                      }
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      + Option hinzufügen
                    </button>
                  </div>
                ) : q.type === "true-false" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`true-false-${q.id}`}
                          checked={q.correctAnswer === true}
                          onChange={() => updateQuestion(q.id, { correctAnswer: true })}
                          className="rounded"
                        />
                        <span className="text-sm">Wahr</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`true-false-${q.id}`}
                          checked={q.correctAnswer === false}
                          onChange={() => updateQuestion(q.id, { correctAnswer: false })}
                          className="rounded"
                        />
                        <span className="text-sm">Falsch</span>
                      </label>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Korrekte Antwort: <strong>{q.correctAnswer === true ? "Wahr" : q.correctAnswer === false ? "Falsch" : "Nicht ausgewählt"}</strong></p>
                    </div>
                  </div>
                ) : q.type === "cloze" ? (
                  <div className="space-y-2">
                    <textarea
                      ref={(el) => (textareaRefs.current[q.id] = el)}
                      value={q.question}
                      onChange={(e) =>
                        updateQuestion(q.id, { question: e.target.value })
                      }
                      rows={4}
                      className="w-full rounded-lg border p-2"
                      placeholder="Text mit {{1}}, {{2}} für Lücken..."
                    />
                    <button
                      onClick={() => insertClozeGap(q)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      + Lücke einfügen
                    </button>
                    
                    {/* Vorschau mit ausgefüllten Antworten */}
                    {(() => {
                      let previewText = q.question;
                      const gapMatches = q.question.match(/\{\{(\d+)\}\}/g) || [];
                      
                      gapMatches.forEach(match => {
                        const gapNumber = match.replace(/\{\{|\}\}/g, '');
                        const answer = q.answers?.[gapNumber] || `[Lücke ${gapNumber}]`;
                        previewText = previewText.replace(match, answer);
                      });
                      
                      return previewText !== q.question && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Vorschau:</h4>
                          <p className="text-sm text-gray-800">{previewText}</p>
                        </div>
                      );
                    })()}
                    
                    {/* Eingaben für Antworten */}
                    <div className="space-y-1 mt-2">
                      {(() => {
                        // Extrahiere alle Lücken aus dem Text
                        const gapMatches = q.question.match(/\{\{(\d+)\}\}/g) || [];
                        const gapNumbers = gapMatches.map(match => 
                          parseInt(match.replace(/\{\{|\}\}/g, ''))
                        ).sort((a, b) => a - b);
                        
                        return gapNumbers.map((gapNumber) => (
                          <input
                            key={gapNumber}
                            type="text"
                            value={q.answers?.[gapNumber] || ""}
                            onChange={(e) =>
                              updateQuestion(q.id, {
                                answers: { 
                                  ...q.answers, 
                                  [gapNumber]: e.target.value 
                                },
                              })
                            }
                            placeholder={`Antwort für Lücke ${gapNumber}`}
                            className="w-full rounded-lg border px-2 py-1 text-sm"
                          />
                        ));
                      })()}
                    </div>
                  </div>
                ) : q.type === "steps" ? (
                  <div className="space-y-2">
                    {(q.steps || []).map((step, i) => (
                      <input
                        key={i}
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const newSteps = [...q.steps];
                          newSteps[i] = e.target.value;
                          updateQuestion(q.id, { steps: newSteps });
                        }}
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder={`Schritt ${i + 1}`}
                      />
                    ))}
                    <button
                      onClick={() =>
                        updateQuestion(q.id, { steps: [...q.steps, ""] })
                      }
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      + Schritt hinzufügen
                    </button>
                  </div>
                ) : q.type === "flashcard" ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={q.front}
                      onChange={(e) =>
                        updateQuestion(q.id, { front: e.target.value })
                      }
                      placeholder="Vorderseite"
                      className="w-full rounded-lg border px-3 py-2"
                    />
                    <input
                      type="text"
                      value={q.back}
                      onChange={(e) =>
                        updateQuestion(q.id, { back: e.target.value })
                      }
                      placeholder="Rückseite"
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </div>
                ) : q.type === "info-block" ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={q.title || ""}
                      onChange={(e) =>
                        updateQuestion(q.id, { title: e.target.value })
                      }
                      placeholder="Titel des Informationsblocks..."
                      className="w-full rounded-lg border px-3 py-2 font-medium"
                    />
                    <RichTextEditor
                      value={q.content || ""}
                      onChange={(content) =>
                        updateQuestion(q.id, { content })
                      }
                      placeholder="Inhalt des Informationsblocks..."
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`collapsible-${q.id}`}
                        checked={q.isCollapsible || false}
                        onChange={(e) =>
                          updateQuestion(q.id, { isCollapsible: e.target.checked })
                        }
                        className="rounded"
                      />
                      <label htmlFor={`collapsible-${q.id}`} className="text-sm text-gray-600">
                        Einklappbar machen
                      </label>
                    </div>
                  </div>
                ) : q.type === "youtube-embed" ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={q.title || ""}
                      onChange={(e) =>
                        updateQuestion(q.id, { title: e.target.value })
                      }
                      placeholder="Titel des Videos..."
                      className="w-full rounded-lg border px-3 py-2 font-medium"
                    />
                    <input
                      type="text"
                      value={q.videoId || ""}
                      onChange={(e) => {
                        const videoId = extractYouTubeId(e.target.value) || e.target.value;
                        updateQuestion(q.id, { videoId });
                      }}
                      placeholder="YouTube URL oder Video ID..."
                      className="w-full rounded-lg border px-3 py-2"
                    />
                    <textarea
                      value={q.description || ""}
                      onChange={(e) =>
                        updateQuestion(q.id, { description: e.target.value })
                      }
                      rows={3}
                      placeholder="Beschreibung des Videos..."
                      className="w-full rounded-lg border px-3 py-2"
                    />
                    {/* Vorschau des Videos */}
                    {q.videoId && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Vorschau:</h4>
                        <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${q.videoId}`}
                            title={q.title || "YouTube Video"}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Zeitlimit */}
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    value={q.timeLimit || ""}
                    onChange={(e) =>
                      updateQuestion(q.id, { timeLimit: e.target.value })
                    }
                    placeholder="Zeitlimit in Sekunden"
                    className="w-40 rounded-lg border px-2 py-1 text-sm"
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add Element Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowElementModal(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-white shadow hover:bg-indigo-700"
          >
            <PlusCircle className="h-5 w-5" />
            Element hinzufügen
          </button>
        </div>
      </div>

      {message && (
        <div className="text-center text-sm text-gray-600 mt-4">{message}</div>
      )}

      {/* Settings Modal mit Sidebar + X */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-5xl h-[80vh] flex relative">
            {/* Close */}
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Sidebar */}
            <div className="w-48 border-r bg-gray-50 p-4 space-y-2">
              {["settings", "intro", "files"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-3 py-2 rounded-lg ${
                    activeTab === tab
                      ? "bg-indigo-100 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab === "settings"
                    ? "Settings"
                    : tab === "intro"
                    ? "Einleitung"
                    : "Dateien"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === "intro" && (
                <div>
                  <h3 className="font-medium mb-4">Einleitungstext</h3>
                  <RichTextEditor
                    value={introText}
                    onChange={setIntroText}
                    placeholder="Einleitungstext hier einfügen..."
                  />
                </div>
              )}

              {activeTab === "files" && (
                <div>
                  <h3 className="font-medium mb-2">Dateien hochladen</h3>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-indigo-400">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-gray-500">
                      Dateien hier ablegen oder klicken
                    </span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>

                  <ul className="mt-4 space-y-2">
                    {files.map((file, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFile(idx)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Entfernen
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6">
                  {/* Kollektionen */}
                  <div>
                    <h3 className="font-medium mb-3">Kollektion</h3>
                    <div className="space-y-3">
                      {/* Bestehende Kollektionen */}
                      <div className="space-y-2">
                        <label className="text-sm text-gray-600">Kollektion auswählen:</label>
                        <select
                          value={selectedCollection?.id || ""}
                          onChange={(e) => {
                            const collection = collections.find(c => c.id === e.target.value);
                            setSelectedCollection(collection || null);
                          }}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        >
                          <option value="">Keine Kollektion</option>
                          {collections.map((collection) => (
                            <option key={collection.id} value={collection.id}>
                              {collection.collection_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Neue Kollektion erstellen */}
                      <div className="space-y-2">
                        {!showNewCollectionInput ? (
                          <button
                            onClick={() => setShowNewCollectionInput(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Neue Kollektion erstellen
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newCollectionName}
                              onChange={(e) => setNewCollectionName(e.target.value)}
                              placeholder="Kollektion Name"
                              className="flex-1 rounded-lg border px-3 py-2 text-sm"
                              onKeyPress={(e) => e.key === 'Enter' && createCollection()}
                            />
                            <button
                              onClick={createCollection}
                              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                            >
                              Erstellen
                            </button>
                            <button
                              onClick={() => {
                                setShowNewCollectionInput(false);
                                setNewCollectionName("");
                              }}
                              className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                            >
                              Abbrechen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="font-medium mb-3">Tags</h3>
                    <div className="space-y-3">
                      {/* Bestehende Tags */}
                      <div className="space-y-2">
                        <label className="text-sm text-gray-600">Tags auswählen:</label>
                        <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                          {tags.length === 0 ? (
                            <p className="text-sm text-gray-500">Keine Tags vorhanden</p>
                          ) : (
                            tags.map((tag) => (
                              <label key={tag.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedTags.some(t => t.id === tag.id)}
                                  onChange={() => toggleTagSelection(tag)}
                                  className="rounded"
                                />
                                <span className="text-sm">{tag.tag_name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Neue Tags erstellen */}
                      <div className="space-y-2">
                        {!showNewTagInput ? (
                          <button
                            onClick={() => setShowNewTagInput(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Neuen Tag erstellen
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="Tag Name"
                              className="flex-1 rounded-lg border px-3 py-2 text-sm"
                              onKeyPress={(e) => e.key === 'Enter' && createTag()}
                            />
                            <button
                              onClick={createTag}
                              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                            >
                              Erstellen
                            </button>
                            <button
                              onClick={() => {
                                setShowNewTagInput(false);
                                setNewTagName("");
                              }}
                              className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                            >
                              Abbrechen
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Ausgewählte Tags anzeigen */}
                      {selectedTags.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600">Ausgewählte Tags:</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedTags.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                              >
                                {tag.tag_name}
                                <button
                                  onClick={() => toggleTagSelection(tag)}
                                  className="text-indigo-600 hover:text-indigo-800"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hinweis Modal */}
      {showHintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-lg p-6 space-y-4">
            <h3 className="font-medium">Hinweis hinzufügen</h3>
            <textarea
              rows={6}
              className="w-full border rounded-lg p-3 text-sm"
              placeholder="Hinweis eingeben..."
              value={tempHint}
              onChange={(e) => setTempHint(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowHintModal(false)}
                className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  updateQuestion(activeHintQuestion, { hint: tempHint });
                  setShowHintModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Element Auswahl Modal */}
      {showElementModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl w-[95%] max-w-6xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white">
                  <Plus className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Element hinzufügen</h2>
                  <p className="text-gray-600">Wähle den Typ des Elements aus</p>
                </div>
              </div>
              <button
                onClick={() => setShowElementModal(false)}
                className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {/* Fragen */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-indigo-600" />
                  Fragen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {QUESTION_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => {
                          addElement(type.value);
                          setShowElementModal(false);
                        }}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                            <Icon className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-medium text-gray-800 group-hover:text-indigo-700">
                              {type.label}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {type.value === "short-text" && "Kurze Textantwort"}
                              {type.value === "long-text" && "Lange Textantwort"}
                              {type.value === "multiple-choice" && "Mehrere Antworten möglich"}
                              {type.value === "single-choice" && "Eine Antwort auswählen"}
                              {type.value === "true-false" && "Wahr oder Falsch"}
                              {type.value === "cloze" && "Lückentext ausfüllen"}
                              {type.value === "steps" && "Schritte in Reihenfolge"}
                              {type.value === "flashcard" && "Karteikarte mit Vorder- und Rückseite"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Zwischenelemente */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-green-600" />
                  Zwischenelemente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ELEMENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => {
                          addElement(type.value);
                          setShowElementModal(false);
                        }}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                            <Icon className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-medium text-gray-800 group-hover:text-green-700">
                              {type.label}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {type.value === "info-block" && "Informationsblock mit Text"}
                              {type.value === "youtube-embed" && "YouTube Video einbetten"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
}
