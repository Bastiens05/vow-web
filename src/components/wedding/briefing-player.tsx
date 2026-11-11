"use client";

import { useEffect, useState } from "react";

export function BriefingPlayer({ text, weddingId }: { text: string; weddingId: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const [showText, setShowText] = useState(false);
  const key = `vow-briefing-${weddingId}`;

  useEffect(() => {
    window.localStorage.setItem(key, text);
  }, [key, text]);

  function speak(from: string) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(from);
    utterance.lang = "fr-FR";
    utterance.rate = rate;
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="rounded-3xl border border-line p-5">
      <button
        type="button"
        className="w-full rounded-2xl bg-ink px-4 py-4 text-lg text-paper"
        onClick={() => {
          if (speaking) {
            window.speechSynthesis.pause();
            setSpeaking(false);
            return;
          }
          speak(text);
        }}
      >
        {speaking ? "Pause" : "Écouter le briefing"}
      </button>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" className="rounded-full border border-line px-3 py-1" onClick={() => speak(text)}>−15 s</button>
        <button type="button" className="rounded-full border border-line px-3 py-1" onClick={() => { if (speaking) window.speechSynthesis.resume(); }}>
          Reprendre
        </button>
        <button type="button" className="rounded-full border border-line px-3 py-1" onClick={() => speak(text.slice(Math.min(80, text.length)))}>+15 s</button>
        {[1, 1.25, 1.5].map((value) => (
          <button key={value} type="button" className="rounded-full border border-line px-3 py-1" onClick={() => setRate(value)}>
            ×{value}
          </button>
        ))}
        <button type="button" className="rounded-full border border-line px-3 py-1" onClick={() => setShowText((value) => !value)}>
          Lire le texte
        </button>
      </div>
      {showText ? <p className="mt-4 text-sm leading-6">{text}</p> : null}
    </div>
  );
}
