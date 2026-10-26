import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ClipboardList, CheckCircle } from "lucide-react";
import { auth, db } from "../../config/firebaseSetup";
import EvaluationForm, { type EvaluationSubmission } from "./EvaluationForm";
import { scoreResponse, type RaterType } from "../lib/evaluation";

interface EvalRequest {
  id: string;
  periodId: string;
  periodLabel: string;
  subjectEmpId: string;
  subjectName: string;
  type: RaterType;
  reviewerEmpId: string;
}

/** Self/peer evaluations a manager has asked the signed-in user to complete. */
export default function PendingEvaluations({ employeeId }: { employeeId: string }) {
  const [pending, setPending] = useState<EvalRequest[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [active, setActive] = useState<EvalRequest | null>(null);

  const load = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !employeeId) return;
    try {
      const [reqSnap, resSnap] = await Promise.all([
        getDocs(query(collection(db, "evaluation_requests"), where("reviewerEmpId", "==", employeeId))),
        getDocs(query(collection(db, "evaluation_responses"), where("reviewerUid", "==", uid))),
      ]);
      const answered = new Set(resSnap.docs.map((d) => d.id));
      const requests = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EvalRequest));
      setPending(requests.filter((r) => !answered.has(r.id)).sort((a, b) => (a.type === "self" ? -1 : b.type === "self" ? 1 : 0)));
      setDoneCount(requests.length - requests.filter((r) => !answered.has(r.id)).length);
    } catch (e) {
      console.error("Failed to load pending evaluations:", e);
    }
  };

  useEffect(() => { load(); }, [employeeId]);

  const submit = async (req: EvalRequest, data: EvaluationSubmission) => {
    const { categoryScores, score } = scoreResponse(data.answers);
    // Same ID as the request: firestore.rules only accepts it if that request exists.
    await setDoc(doc(db, "evaluation_responses", req.id), {
      periodId: req.periodId,
      periodLabel: req.periodLabel,
      subjectEmpId: req.subjectEmpId,
      subjectName: req.subjectName,
      type: req.type,
      reviewerEmpId: employeeId,
      reviewerUid: auth.currentUser!.uid,
      answers: data.answers,
      categoryScores,
      score,
      strengths: data.strengths,
      improvement: data.improvement,
      submittedAt: serverTimestamp(),
    });
    setActive(null);
    await load();
  };

  if (pending.length === 0 && doneCount === 0) return null;

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-[#fce8e8] text-[#810100] p-2.5 rounded-xl"><ClipboardList className="w-5 h-5" /></div>
        <div>
          <h2 className="text-lg font-black text-[#1B1717] uppercase tracking-tight">Evaluations to Complete</h2>
          <p className="text-xs text-gray-500 font-medium">Requested by HR for the 360° review. Each can be submitted once.</p>
        </div>
      </div>

      {pending.length === 0 ? (
        <p className="flex items-center gap-2 text-sm font-bold text-green-700"><CheckCircle className="w-4 h-4" /> All done — thank you!</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl">
          {pending.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-black text-[#1B1717]">{r.type === "self" ? "Self-evaluation" : `Peer evaluation: ${r.subjectName}`}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{r.periodLabel}</p>
              </div>
              <button onClick={() => setActive(r)} className="px-5 py-2.5 bg-[#810100] text-white rounded-xl font-bold text-sm hover:bg-[#630000] shrink-0">
                Start
              </button>
            </div>
          ))}
        </div>
      )}

      {active && (
        <EvaluationForm
          raterType={active.type}
          subjectName={active.subjectName}
          periodLabel={active.periodLabel}
          onClose={() => setActive(null)}
          onSubmit={(data) => submit(active, data)}
        />
      )}
    </div>
  );
}
