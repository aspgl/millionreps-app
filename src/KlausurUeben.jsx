// KlausurUeben.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { useAuth } from "./AuthContext";
import { ArrowLeft, ArrowRight, Check, Rocket, Info, Play, FileText, Star, Trophy, Target, Clock, Award, Zap } from "lucide-react";

// Musterlösung je Fragetyp ermitteln
const getSolutionText = (question) => {
  switch (question.type) {
    case "short-text":
    case "long-text":
      return question.answer || "Keine Musterlösung";
    case "flashcard":
      return question.back || "Keine Musterlösung";
    case "cloze":
      return JSON.stringify(question.answers || {});
    case "steps":
      return (question.steps || []).join(" → ");
    case "multiple-choice":
    case "single-choice":
      if (!question.correct || question.correct.length === 0) return "Keine Lösung";
      return (question.correct || [])
        .map((i) => question.choices?.[i])
        .join(", ");
    case "true-false":
      return question.correctAnswer === true ? "Wahr" : question.correctAnswer === false ? "Falsch" : "Nicht definiert";
    default:
      return "Keine Lösung";
  }
};

export default function KlausurUeben() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exam, setExam] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = Landing Page, "review" = Bewertung
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [autoNext, setAutoNext] = useState(false);
  const [activeTab, setActiveTab] = useState("intro"); // "intro" oder "questions"

  // Gesamtzeit
  const [totalTime, setTotalTime] = useState(0);
  const [startedAt, setStartedAt] = useState(null); // ISO string

  // Self-Assessment:
  // level 0..4 (0/4 .. 4/4), points computed automatically
  const [levels, setLevels] = useState({}); // { [questionId]: 0..4 }
  const [points, setPoints] = useState({}); // { [questionId]: number }

  // Klausur laden
  useEffect(() => {
    const loadExam = async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("content, title, description, introduction_text")
        .eq("id", examId)
        .single();

      if (error) {
        console.error("Fehler beim Laden:", error);
      } else {
        setExam({
          ...data.content,
          title: data.title,
          description: data.description,
          introduction_text: data.introduction_text
        });
      }
    };
    loadExam();
  }, [examId]);

  // Gesamtzeit hochzählen, nur während der Übung (nicht Landing, nicht Review)
  useEffect(() => {
    if (currentIndex < 0 || currentIndex === "review") return;
    const interval = setInterval(() => setTotalTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  // Timer-Logik pro Frage
  useEffect(() => {
    if (currentIndex < 0 || !exam || currentIndex === "review") return;
    const q = exam.questions[currentIndex];
    if (!q?.timeLimit) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(Number(q.timeLimit));
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          clearInterval(interval);
          setAutoNext(true);
          return null;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, exam]);

  // AutoNext bei Zeitablauf
  useEffect(() => {
    if (autoNext) {
      setAutoNext(false);
      handleNext(true);
    }
  }, [autoNext]);

  if (!exam) {
    return <div className="text-center py-10">⏳ Klausur wird geladen...</div>;
  }

  const allElements = exam.questions || [];
  const questions = allElements.filter(q => 
    !["info-block", "youtube-embed"].includes(q.type)
  );
  const q =
    typeof currentIndex === "number" && currentIndex >= 0
      ? allElements[currentIndex]
      : null;

  const pointsPerQuestion =
    questions.length > 0 ? 100 / questions.length : 0;

  const handleInput = (val) => {
    if (!q) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: val,
    }));
  };

  const handleNext = (auto = false) => {
    if (q && answers[q.id] === undefined && auto) {
      // leere Antwort speichern bei Auto-Next
      setAnswers((prev) => ({ ...prev, [q.id]: "" }));
    }

    if (typeof currentIndex === "number" && currentIndex < allElements.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex("review");
    }
  };

  // Bewertung abschließen & Activity speichern
  const handleFinish = async () => {
    // Punkte automatisch aus Levels berechnen
    const computedPoints = {};
    questions.forEach((question) => {
      const lvl = levels[question.id] || 0;
      const pts = Math.round((lvl / 4) * pointsPerQuestion);
      computedPoints[question.id] = pts;
    });
  
    const totalPoints = Object.values(computedPoints).reduce((a, b) => a + b, 0);
    const correctQuestions = Object.entries(levels).filter(([_, lvl]) => (lvl || 0) === 4).length;
    const partiallyCorrectQuestions = Object.entries(levels).filter(([_, lvl]) => (lvl || 0) >= 2 && (lvl || 0) < 4).length;
  
    const finishedAtIso = new Date().toISOString();
    const durationSeconds =
      startedAt ? Math.max(1, Math.round((new Date(finishedAtIso) - new Date(startedAt)) / 1000)) : totalTime;
  
    const evaluation = {
      levels,
      per_question_points: computedPoints,
      points_per_question_max: pointsPerQuestion,
    };
  
    const device = typeof navigator !== "undefined" ? navigator.userAgent : null;
  
    const payload = {
      user_id: user?.id || null,
      exam_id: examId,
      started_at: startedAt || new Date(Date.now() - durationSeconds * 1000).toISOString(),
      finished_at: finishedAtIso,
      duration_seconds: durationSeconds,
      total_score: Math.round(totalPoints),
      total_questions: questions.length,
      correct_questions: correctQuestions,
      raw_answers: answers,
      evaluation,
      device,
      ip_address: null,
    };
  
    // 1. Speichern der Aktivität
    const { error } = await supabase.from("exam_activity").insert([payload]);
    if (error) {
      console.error("Fehler beim Speichern:", error);
      alert("❌ Fehler beim Speichern der Aktivität!");
      return;
    }
  
    // 2. XP des Users laden
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", user.id)
      .single();
  
    if (profileError) {
      console.error("Fehler beim Laden des Profils:", profileError);
      alert("⚠️ Aktivität gespeichert, aber XP konnten nicht geladen werden");
      return;
    }
  
    // 3. Neue XP berechnen und speichern
    const newXp = (profile?.xp || 0) + Math.round(totalPoints);
  
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ xp: newXp })
      .eq("id", user.id);
  
    if (updateError) {
      console.error("Fehler beim XP-Update:", updateError);
      alert("⚠️ Aktivität gespeichert, aber XP konnten nicht aktualisiert werden");
      return;
    }
  
    alert(`✅ Bewertung gespeichert! Gesamt: ${Math.round(totalPoints)} / 100\n🎉 Neue XP: ${newXp}`);
    navigate("/meine-lerninhalte");
  };
  
  

  // Fragen-Renderer
  const renderQuestion = () => {
    switch (q.type) {
      case "short-text":
        return (
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Antwort eingeben..."
            value={answers[q.id] || ""}
            onChange={(e) => handleInput(e.target.value)}
          />
        );
      case "long-text":
        return (
          <textarea
            rows={6}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Antwort eingeben..."
            value={answers[q.id] || ""}
            onChange={(e) => handleInput(e.target.value)}
          />
        );
      case "multiple-choice":
        return (
          <div className="space-y-2">
            {q.choices.map((choice, i) => (
              <label
                key={i}
                className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(answers[q.id] || []).includes(i)}
                  onChange={(e) => {
                    const current = answers[q.id] || [];
                    if (e.target.checked) {
                      handleInput([...current, i]);
                    } else {
                      handleInput(current.filter((c) => c !== i));
                    }
                  }}
                />
                {choice}
              </label>
            ))}
          </div>
        );
      case "single-choice":
        return (
          <div className="space-y-2">
            {q.choices.map((choice, i) => (
              <label
                key={i}
                className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={answers[q.id] === i}
                  onChange={() => handleInput(i)}
                />
                {choice}
              </label>
            ))}
          </div>
        );
      case "true-false":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`true-false-${q.id}`}
                  checked={answers[q.id] === true}
                  onChange={() => handleInput(true)}
                  className="rounded"
                />
                <span>Wahr</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`true-false-${q.id}`}
                  checked={answers[q.id] === false}
                  onChange={() => handleInput(false)}
                  className="rounded"
                />
                <span>Falsch</span>
              </label>
            </div>
          </div>
        );
      case "cloze":
        const parts = q.question.split(/(\{\{\d+\}\})/g);
        return (
          <p className="flex flex-wrap gap-2">
            {parts.map((part, idx) => {
              const match = part.match(/\{\{(\d+)\}\}/);
              if (match) {
                const gapIndex = match[1];
                return (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Lücke ${gapIndex}`}
                    className="border-b border-gray-400 focus:border-indigo-500 outline-none px-2"
                    value={answers[q.id]?.[gapIndex] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: {
                          ...(prev[q.id] || {}),
                          [gapIndex]: e.target.value,
                        },
                      }))
                    }
                  />
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </p>
        );
      case "steps":
        return (
          <div className="space-y-2">
            {(q.steps || []).map((_, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Schritt ${i + 1}`}
                className="w-full border rounded-lg px-3 py-2"
                value={answers[q.id]?.[i] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q.id]: {
                      ...(prev[q.id] || {}),
                      [i]: e.target.value,
                    },
                  }))
                }
              />
            ))}
          </div>
        );
      case "flashcard":
        return (
          <div className="p-6 border rounded-xl bg-indigo-50 text-center">
            <p className="font-semibold text-lg mb-3">{q.front}</p>
            <input
              type="text"
              placeholder="Antwort..."
              className="w-full border rounded-lg px-3 py-2"
              value={answers[q.id] || ""}
              onChange={(e) => handleInput(e.target.value)}
            />
          </div>
        );
      case "info-block":
        return (
          <div className="p-6 border rounded-xl bg-white">
            {q.title && <h3 className="font-semibold text-lg mb-3 text-gray-800">{q.title}</h3>}
            <div 
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: q.content || "" }}
            />
          </div>
        );
      case "youtube-embed":
        return (
          <div className="p-6 border rounded-xl bg-white">
            {q.title && <h3 className="font-semibold text-lg mb-3 text-gray-800">{q.title}</h3>}
            {q.description && <p className="text-gray-700 mb-4">{q.description}</p>}
            {q.videoId && (
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${q.videoId}`}
                  title={q.title || "YouTube Video"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        );
      default:
        return <p>⚠️ Unbekannter Fragetyp</p>;
    }
  };

  // Landing Page mit Tabs
  if (currentIndex === -1) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b">
            <Rocket className="mx-auto h-12 w-12 text-indigo-600" />
            <h1 className="text-2xl font-bold mt-4">{exam.title}</h1>
            <p className="text-gray-600 mt-2">{exam.description}</p>
            <p className="text-gray-500 mt-2">📘 {questions.length} Fragen</p>
          </div>

          {/* Nur Einleitung Tab auf Landing Page */}
          <div className="border-b">
            <div className="px-6 py-4 text-center font-medium bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700">
              📖 Einleitung
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            <div className="space-y-6">
              {exam.introduction_text ? (
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: exam.introduction_text }}
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FileText className="mx-auto h-12 w-12 mb-4" />
                  <p>Keine Einleitung vorhanden</p>
                </div>
              )}
              
              <div className="text-center pt-6">
                <button
                  onClick={() => {
                    setStartedAt(new Date().toISOString());
                    setCurrentIndex(0);
                    setActiveTab("questions"); // Direkt zum Aufgaben-Tab springen
                  }}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
                >
                  🚀 Übung starten
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Review Mode (Self-Assessment mit 5 Stufen: 0-4)
  if (currentIndex === "review") {
    const totalPoints = Object.values(points).reduce((a, b) => a + b, 0);
    const maxPoints = questions.length * pointsPerQuestion;
    const percentage = Math.round((totalPoints / maxPoints) * 100);
    
    // Performance Level basierend auf Prozent
    const getPerformanceLevel = (percent) => {
      if (percent >= 90) return { level: "Ausgezeichnet", color: "text-emerald-600", bg: "bg-emerald-50", icon: Trophy };
      if (percent >= 75) return { level: "Sehr gut", color: "text-blue-600", bg: "bg-blue-50", icon: Star };
      if (percent >= 60) return { level: "Gut", color: "text-yellow-600", bg: "bg-yellow-50", icon: Target };
      if (percent >= 40) return { level: "Befriedigend", color: "text-orange-600", bg: "bg-orange-50", icon: Award };
      return { level: "Verbesserungsbedarf", color: "text-red-600", bg: "bg-red-50", icon: Zap };
    };

    const performance = getPerformanceLevel(percentage);
    const PerformanceIcon = performance.icon;

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-safe">
        {/* Header mit Statistiken */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">🎯 Selbstbewertung abgeschlossen!</h1>
            <p className="text-indigo-100">Zeit für eine ehrliche Einschätzung deiner Leistung</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")}</div>
              <div className="text-indigo-200 text-sm">Benötigte Zeit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{questions.length}</div>
              <div className="text-indigo-200 text-sm">Fragen beantwortet</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(totalPoints)}/{Math.round(maxPoints)}</div>
              <div className="text-indigo-200 text-sm">Punkte erreicht</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{percentage}%</div>
              <div className="text-indigo-200 text-sm">Erfolgsquote</div>
            </div>
          </div>
        </div>

        {/* Performance Level */}
        <div className={`${performance.bg} rounded-xl p-6 border-l-4 border-l-current ${performance.color}`}>
          <div className="flex items-center gap-4">
            <PerformanceIcon className="h-8 w-8" />
            <div>
              <h2 className="text-xl font-bold">Leistungsniveau: {performance.level}</h2>
              <p className="text-gray-600">Du hast {percentage}% der maximalen Punkte erreicht</p>
            </div>
          </div>
        </div>

        {/* Fragen-Bewertung */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-600" />
            Einzelne Fragen bewerten
          </h2>
          
          {questions.map((question, idx) => {
            const lvl = levels[question.id] || 0;
            const autoPoints = Math.round((lvl / 4) * pointsPerQuestion);
            const maxPointsForQuestion = Math.round(pointsPerQuestion);
            
            // Level Beschreibungen
            const levelDescriptions = {
              0: { text: "Komplett falsch", color: "text-red-600", bg: "bg-red-50" },
              1: { text: "Teilweise richtig", color: "text-orange-600", bg: "bg-orange-50" },
              2: { text: "Halb richtig", color: "text-yellow-600", bg: "bg-yellow-50" },
              3: { text: "Meistens richtig", color: "text-blue-600", bg: "bg-blue-50" },
              4: { text: "Vollständig richtig", color: "text-emerald-600", bg: "bg-emerald-50" }
            };

            const currentLevel = levelDescriptions[lvl];

            return (
              <div key={question.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Question Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-800">Frage {idx + 1}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Punkte:</span>
                      <span className="font-bold text-indigo-600">{autoPoints}/{maxPointsForQuestion}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Question Content */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Frage:</h4>
                      <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                        {question.type === "true-false" 
                          ? "Wahr/Falsch Frage"
                          : question.question || question.front || question.title || <em className="text-gray-400">Keine Frage angegeben</em>}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Deine Antwort:</h4>
                        <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-l-blue-400">
                          {typeof answers[question.id] === "object"
                            ? JSON.stringify(answers[question.id])
                            : answers[question.id] || <em className="text-gray-400">Keine Antwort</em>}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Musterlösung:</h4>
                        <div className="bg-green-50 rounded-lg p-3 border-l-4 border-l-green-400">
                          {getSolutionText(question)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rating Section */}
                  <div className="border-t pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-700">
                          Bewertung (0/4 – 4/4)
                        </label>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${currentLevel.bg} ${currentLevel.color}`}>
                          {currentLevel.text}
                        </div>
                      </div>
                      
                      {/* Rating Slider */}
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="4"
                          step="1"
                          value={lvl}
                          onChange={(e) => {
                            const newLevel = Number(e.target.value);
                            setLevels((prev) => ({ ...prev, [question.id]: newLevel }));
                            setPoints((prev) => ({
                              ...prev,
                              [question.id]: Math.round((newLevel / 4) * pointsPerQuestion),
                            }));
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        
                        {/* Rating Labels */}
                        <div className="flex justify-between text-xs text-gray-500">
                          <span className="text-center">
                            <div className="font-bold">0/4</div>
                            <div>Falsch</div>
                          </span>
                          <span className="text-center">
                            <div className="font-bold">1/4</div>
                            <div>Teilweise</div>
                          </span>
                          <span className="text-center">
                            <div className="font-bold">2/4</div>
                            <div>Halb</div>
                          </span>
                          <span className="text-center">
                            <div className="font-bold">3/4</div>
                            <div>Meistens</div>
                          </span>
                          <span className="text-center">
                            <div className="font-bold">4/4</div>
                            <div>Richtig</div>
                          </span>
                        </div>
                      </div>

                      {/* Quick Rating Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {[0, 1, 2, 3, 4].map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setLevels((prev) => ({ ...prev, [question.id]: level }));
                              setPoints((prev) => ({
                                ...prev,
                                [question.id]: Math.round((level / 4) * pointsPerQuestion),
                              }));
                            }}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                              lvl === level
                                ? `${levelDescriptions[level].bg} ${levelDescriptions[level].color} border-2 border-current`
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {level}/4
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-gray-800">📊 Zusammenfassung</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{Math.round(totalPoints)}</div>
                <div className="text-sm text-gray-600">Gesamtpunkte</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Object.entries(levels).filter(([_, lvl]) => (lvl || 0) === 4).length}</div>
                <div className="text-sm text-gray-600">Vollständig richtig</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Object.entries(levels).filter(([_, lvl]) => (lvl || 0) >= 2 && (lvl || 0) < 4).length}</div>
                <div className="text-sm text-gray-600">Teilweise richtig</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{Object.entries(levels).filter(([_, lvl]) => (lvl || 0) <= 1).length}</div>
                <div className="text-sm text-gray-600">Verbesserungsbedarf</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setCurrentIndex(allElements.length - 1)}
            className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-xl shadow hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="inline-block mr-2 h-4 w-4" />
            Zurück zur letzten Frage
          </button>
          <button
            onClick={handleFinish}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105"
          >
            <Check className="inline-block mr-2 h-4 w-4" />
            Ergebnisse speichern & XP erhalten
          </button>
        </div>
      </div>
    );
  }

  // Timer-Farbe
  let timerColor = "text-green-600";
  if (timeLeft !== null && q?.timeLimit) {
    const ratio = timeLeft / q.timeLimit;
    if (ratio < 0.2) timerColor = "text-red-600";
    else if (ratio < 0.5) timerColor = "text-yellow-600";
  }

  // Frage-Viewer mit Tabs
  return (
    <div className="max-w-4xl mx-auto pb-safe">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header mit Tabs */}
        <div className="border-b">
          <div className="flex justify-between items-center p-6">
            <h2 className="text-xl font-bold">
              {q.type === "info-block" || q.type === "youtube-embed" 
                ? `Element ${currentIndex + 1} von ${allElements.length}`
                : `Frage ${currentIndex + 1} von ${allElements.length}`
              }
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-500">
                ⏱ {Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")}
              </span>
              {timeLeft !== null && (
                <div className={`font-semibold ${timerColor}`}>⏳ {timeLeft}s</div>
              )}
              {q?.hint && <Info className="h-5 w-5 text-blue-500" title={q.hint} />}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("intro")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === "intro"
                  ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              📖 Einleitung
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === "questions"
                  ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              ❓ Aufgaben ({allElements.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "intro" && (
            <div className="space-y-6">
              {exam.introduction_text ? (
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: exam.introduction_text }}
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FileText className="mx-auto h-12 w-12 mb-4" />
                  <p>Keine Einleitung vorhanden</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "questions" && (
            <div className="space-y-6">
              {/* Aktuelle Frage/Element */}
              <div className="mb-6">
                {q.type === "info-block" || q.type === "youtube-embed" ? (
                  <div className="mb-4">
                    {/* Zwischenelemente haben keine Frage */}
                  </div>
                ) : (
                  <p className="text-gray-700 mb-4">{q.question}</p>
                )}
                {renderQuestion()}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurück
                </button>
                {currentIndex < allElements.length - 1 ? (
                  <button
                    onClick={() => handleNext(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Weiter
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex("review")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                    Zur Bewertung
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
