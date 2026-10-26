import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { RUBRIC, SCALE, ALL_QUESTION_IDS, isComplete, scoreResponse, interpret, RATER_LABELS, type RaterType } from "../lib/evaluation";

export interface EvaluationSubmission {
  answers: Record<string, number>;
  strengths: string;
  improvement: string;
}

interface Props {
  raterType: RaterType;
  subjectName: string;
  periodLabel: string;
  onSubmit: (data: EvaluationSubmission) => Promise<void>;
  onClose: () => void;
}

const INSTRUCTIONS: Record<RaterType, string> = {
  self: "Rate yourself honestly on how often you showed each behaviour this period. Your self-evaluation counts for 20% of the people-rated score.",
  peer: "Rate your colleague on behaviour you have actually observed. Your name is never shown to them. Peer ratings count for 30% of the people-rated score.",
  supervisor: "Rate the employee on behaviour observed this period. The supervisor evaluation counts for 50% of the people-rated score.",
};

export default function EvaluationForm({ raterType, subjectName, periodLabel, onSubmit, onClose }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [strengths, setStrengths] = useState("");
  const [improvement, setImprovement] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const answered = ALL_QUESTION_IDS.filter((id) => answers[id]).length;
  const complete = isComplete(answers);
  const preview = complete ? scoreResponse(answers).score : null;

  const handleSubmit = async () => {
    if (!complete) return setError(`Please answer all ${ALL_QUESTION_IDS.length} statements.`);
    setError("");
    setSaving(true);
    try {
      await onSubmit({ answers, strengths: strengths.trim(), improvement: improvement.trim() });
    } catch (e) {
      console.error("Evaluation submit failed:", e);
      setError("Couldn't submit the evaluation. It may already have been submitted.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 md:p-8 border-b flex justify-between items-start gap-4">
          <div>
            <p className="text-[10px] font-black text-[#810100] uppercase tracking-widest mb-1">
              {RATER_LABELS[raterType]} Evaluation · {periodLabel}
            </p>
            <h2 className="text-2xl font-black text-[#1B1717] tracking-tight">
              {raterType === "self" ? "Self-Evaluation" : subjectName}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 md:p-8 space-y-8 overflow-y-auto">
          <p className="text-sm text-gray-600">{INSTRUCTIONS[raterType]}</p>

          {/* Scale legend */}
          <div className="grid grid-cols-2 md:grid-cols-5 border border-gray-200 rounded-2xl overflow-hidden text-center">
            {SCALE.map((s) => (
              <div key={s.value} className="px-3 py-2 border-gray-100 md:border-r last:border-r-0 bg-gray-50">
                <span className="font-black text-[#810100]">{s.value}</span>
                <span className="text-xs font-bold text-gray-600"> – {s.label}</span>
              </div>
            ))}
          </div>

          {RUBRIC.map((cat) => (
            <div key={cat.key} className="border border-gray-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#EDEBDD]">
                    <th className="text-left px-4 py-3 font-black text-[#1B1717]">{cat.title}</th>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <th key={n} className="w-12 px-2 py-3 font-black text-gray-600 text-center">{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cat.questions.map((q) => (
                    <tr key={q.id} className={answers[q.id] ? "" : "bg-red-50/30"}>
                      <td className="px-4 py-3 text-gray-700 min-w-[220px]">{q.text}</td>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <td key={n} className="text-center px-2 py-3">
                          <input
                            type="radio"
                            name={q.id}
                            value={n}
                            checked={answers[q.id] === n}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                            className="w-5 h-5 accent-[#810100] cursor-pointer"
                            aria-label={`${q.text} – ${n}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Strengths (optional)</label>
              <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={4}
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#810100]/20 text-sm" placeholder="Specific examples help most." />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Areas for improvement (optional)</label>
              <textarea value={improvement} onChange={(e) => setImprovement(e.target.value)} rows={4}
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#810100]/20 text-sm" placeholder="What would help them grow?" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-sm">
            <span className="font-black text-[#1B1717]">{answered}/{ALL_QUESTION_IDS.length}</span>
            <span className="text-gray-500"> answered</span>
            {preview != null && (
              <span className="ml-3 text-gray-500">Average <span className="font-black text-[#810100]">{preview.toFixed(1)}</span> ({interpret(preview)})</span>
            )}
            {error && <p className="text-xs font-bold text-red-600 mt-1">{error}</p>}
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-6 py-3 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-8 py-3 bg-[#810100] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#630000] disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Submit (final)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
