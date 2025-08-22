// src/AI.jsx
import { useState } from "react";
import { supabase } from "./lib/supabase";

export default function AI() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Chat Nachricht vom User hinzufügen
    const newMessage = { role: "user", content: prompt };
    setMessages((prev) => [...prev, newMessage]);
    setPrompt("");
    setLoading(true);

    try {
      // Anfrage an OpenAI
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Du bist ein Klausur-Generator.
                Nutze den Input (Unterlagen, Themen, Kapitel) um eine Klausur im JSON-Format zu erstellen.
                Antworte ausschließlich mit JSON im Format:
                {
                  "title": string,
                  "description": string,
                  "questions": [
                    {
                      "id": number,
                      "type": "multiple_choice" | "short_answer" | "true_false" | "fill_in_blank",
                      "question": string,
                      "options"?: [string],
                      "correct_answer": string,
                      "points": number
                    }
                  ]
                }`
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";

      try {
        const parsed = JSON.parse(text);
        setExamData(parsed);

        // Antwort der KI hinzufügen
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Hey. Ich habe dir deine Klausur erstellt, schau gerne mal drüber." }
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "❌ Antwort war kein gültiges JSON." }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Fehler bei der API-Anfrage." }
      ]);
    }

    setLoading(false);
  };

  // Speichern in DB
  const handleSaveExam = async () => {
    if (!examData) return;

    try {
      // 1. Klausur speichern
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert([
          {
            title: examData.title,
            description: examData.description,
          },
        ])
        .select()
        .single();

      if (examError) throw examError;

      // 2. Fragen speichern
      const questions = examData.questions.map((q) => ({
        exam_id: exam.id,
        type: q.type,
        question: q.question,
        options: q.options || null,
        correct_answer: q.correct_answer,
        points: q.points,
      }));

      const { error: questionError } = await supabase
        .from("exam_questions")
        .insert(questions);

      if (questionError) throw questionError;

      alert("✅ Klausur erfolgreich gespeichert!");
      setShowModal(false);
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      alert("❌ Fehler beim Speichern!");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Chat oder Startscreen */}
      <div className="flex-1 max-w-3xl mx-auto w-full p-6 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-3xl font-bold mb-4">🤖 AI Klausur Generator</h1>
            <p className="text-gray-500 mb-6">
              Gib ein Thema oder deine Unterlagen ein und erhalte automatisch eine Klausur im JSON-Format.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl max-w-lg ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white ml-auto"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && examData && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Klausur anzeigen
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <p className="text-center text-gray-500">⏳ Generiere Klausur...</p>
        )}
      </div>

      {/* Input-Feld unten */}
      <form
        onSubmit={handleSubmit}
        className={`max-w-3xl mx-auto w-full flex items-center gap-3 px-4 py-3 bg-white shadow-md transition-all ${
          messages.length > 0 ? "rounded-t-xl" : "rounded-xl mb-10"
        }`}
      >
        <input
          type="text"
          placeholder="📘 Thema oder Unterlagen eingeben..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 outline-none text-gray-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "⏳..." : "Generieren"}
        </button>
      </form>

      {/* Modal */}
      {showModal && examData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">{examData.title}</h2>
            <p className="mb-4 text-gray-600">{examData.description}</p>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {examData.questions.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg">
                  <p className="font-semibold">{q.question}</p>
                  <p className="text-xs text-gray-500 italic">
                    Typ: {q.type}
                  </p>
                  {q.options && (
                    <ul className="list-disc ml-6 mt-2 text-gray-700">
                      {q.options.map((opt, i) => (
                        <li key={i}>{opt}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Richtige Antwort: {q.correct_answer} ({q.points} Punkte)
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Schließen
              </button>
              <button
                onClick={handleSaveExam}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
