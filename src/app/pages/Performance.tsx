import { useState, useEffect } from "react";
import {
  Star, Search, Plus, X, CheckCircle, Clock, TrendingUp, Briefcase, Users, UserCheck, User, CalendarCheck, Send, Loader2,
} from "lucide-react";
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, addDoc, where, serverTimestamp, writeBatch } from "firebase/firestore";
import { db, auth } from "../../config/firebaseSetup";
import EvaluationForm, { type EvaluationSubmission } from "../components/EvaluationForm";
import {
  RATER_WEIGHTS, RATER_LABELS, quarterLabels, quarterPeriod, evaluationDocId, scoreResponse, attendanceMetric,
  combine360, interpret, type RaterType, type CategoryKey,
} from "../lib/evaluation";
import { manilaDate } from "../schemas/timesheet";

// --- INTERFACES ---
interface PerformanceRecord {
  id?: string;
  employeeId: string;
  customEmployeeId?: string;
  employeeName: string;
  department: string;
  reviewPeriod: string;
  evaluator: string;
  dateEvaluated: string;
  averageScore: number;
  interpretation: string;
  finalDecision: string;
  raterScores?: Partial<Record<RaterType, { score: number; count: number }>>;
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
}

interface EvalRequest { id: string; type: RaterType; reviewerEmpId: string; reviewerName: string }
interface EvalResponse {
  id: string;
  type: RaterType;
  reviewerEmpId: string;
  categoryScores: Record<CategoryKey, number>;
  score: number;
  strengths?: string;
  improvement?: string;
}

type Metric = ReturnType<typeof attendanceMetric>;

const DECISIONS = ["None", "Promotion", "Salary Increase", "Training", "Warning"];
const MAX_PEERS = 5;

export default function Performance() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<PerformanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [me, setMe] = useState<{ name: string; uid: string; empId: string }>({ name: "", uid: "", empId: "" });

  // 360° review panel
  const periodOptions = quarterLabels(manilaDate());
  const [showReview, setShowReview] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [periodLabel, setPeriodLabel] = useState(periodOptions[0]);
  const [requests, setRequests] = useState<EvalRequest[]>([]);
  const [responses, setResponses] = useState<EvalResponse[]>([]);
  const [metric, setMetric] = useState<Metric>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [peerToAdd, setPeerToAdd] = useState("");
  const [sending, setSending] = useState(false);
  const [showSupervisorForm, setShowSupervisorForm] = useState(false);
  const [final, setFinal] = useState({ strengths: "", improvement: "", finalDecision: "None" });
  const [finalizing, setFinalizing] = useState(false);

  const subject = employees.find((e) => e.id === subjectId);
  const period = quarterPeriod(periodLabel);
  const finalId = subject ? `${period.id}__${subject.employeeId}` : "";
  const alreadyFinal = evaluations.some((e) => e.id === finalId);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        const data = snap.data() || {};
        setMe({ name: data.name || data.displayName || user.email || "Unknown Evaluator", uid: user.uid, empId: data.employeeId || "" });
      })
      .catch((error) => console.error("Error fetching user data:", error));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee)));

      const evalSnap = await getDocs(query(collection(db, "performance_evaluations"), orderBy("dateEvaluated", "desc")));
      // Older/seeded records may only have `rating`/`comments`; fill in what the table needs.
      setEvaluations(evalSnap.docs.map((d) => {
        const data = d.data();
        const score = Number(data.averageScore ?? data.rating ?? 0);
        return {
          id: d.id,
          ...data,
          employeeName: data.employeeName || "Unknown Employee",
          department: data.department || "Unassigned",
          reviewPeriod: data.reviewPeriod || "—",
          evaluator: data.evaluator || "Unknown",
          averageScore: score,
          interpretation: data.interpretation || interpret(score),
          finalDecision: data.finalDecision || "None",
        } as PerformanceRecord;
      }));
    } catch (e) {
      console.error("Error fetching data:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Load everything the panel shows for the selected employee + quarter.
  const loadPanel = async () => {
    if (!subject) { setRequests([]); setResponses([]); setMetric(null); return; }
    setPanelLoading(true);
    try {
      const [reqSnap, resSnap, tsSnap, leaveSnap] = await Promise.all([
        getDocs(query(collection(db, "evaluation_requests"), where("periodId", "==", period.id), where("subjectEmpId", "==", subject.employeeId))),
        getDocs(query(collection(db, "evaluation_responses"), where("periodId", "==", period.id), where("subjectEmpId", "==", subject.employeeId))),
        getDocs(query(collection(db, "timesheets"), where("employeeId", "==", subject.employeeId))),
        getDocs(query(collection(db, "leaveRequests"), where("employee_id", "==", subject.employeeId))),
      ]);
      setRequests(reqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EvalRequest)));
      const resps = resSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EvalResponse));
      setResponses(resps);
      setMetric(attendanceMetric(
        tsSnap.docs.map((d) => d.data() as any),
        leaveSnap.docs.map((d) => d.data() as any),
        period.start, period.end, manilaDate(),
      ));
      const sup = resps.find((r) => r.type === "supervisor");
      setFinal((f) => ({ ...f, strengths: f.strengths || sup?.strengths || "", improvement: f.improvement || sup?.improvement || "" }));
    } catch (e) {
      console.error("Error loading review:", e);
    }
    setPanelLoading(false);
  };

  useEffect(() => { if (showReview) loadPanel(); }, [subjectId, periodLabel, showReview]);

  const openReview = () => {
    setSubjectId("");
    setPeriodLabel(periodOptions[0]);
    setFinal({ strengths: "", improvement: "", finalDecision: "None" });
    setShowReview(true);
  };

  const notify = (employeeId: string, employeeName: string, title: string, message: string) =>
    addDoc(collection(db, "notifications"), { title, message, type: "System", date: manilaDate(), isRead: false, employeeId, employeeName });

  // Creates the self request (once) and/or one peer request.
  const sendRequests = async (peer?: Employee) => {
    if (!subject) return;
    setSending(true);
    try {
      const batch = writeBatch(db);
      const toNotify: [Employee, string][] = [];
      const add = (type: "self" | "peer", reviewer: Employee) => {
        const id = evaluationDocId(period.id, subject.employeeId, type, reviewer.employeeId);
        if (requests.some((r) => r.id === id)) return;
        batch.set(doc(db, "evaluation_requests", id), {
          periodId: period.id, periodLabel, subjectEmpId: subject.employeeId, subjectName: subject.name,
          type, reviewerEmpId: reviewer.employeeId, reviewerName: reviewer.name,
          requestedBy: me.uid, createdAt: serverTimestamp(),
        });
        toNotify.push([reviewer, type === "self"
          ? `Please complete your self-evaluation for ${periodLabel} (My Evaluation page).`
          : `You've been asked to evaluate a colleague, ${subject.name}, for ${periodLabel}. Your name won't be shown to them.`]);
      };
      add("self", subject);
      if (peer) add("peer", peer);
      await batch.commit();
      await Promise.all(toNotify.map(([emp, msg]) => notify(emp.employeeId, emp.name, "Evaluation requested", msg)));
      setPeerToAdd("");
      await loadPanel();
    } catch (e) {
      console.error("Error sending requests:", e);
      alert("Couldn't send the evaluation request.");
    }
    setSending(false);
  };

  const submitSupervisor = async (data: EvaluationSubmission) => {
    if (!subject) return;
    const { categoryScores, score } = scoreResponse(data.answers);
    await setDoc(doc(db, "evaluation_responses", evaluationDocId(period.id, subject.employeeId, "supervisor", me.empId)), {
      periodId: period.id, periodLabel, subjectEmpId: subject.employeeId, subjectName: subject.name,
      type: "supervisor", reviewerEmpId: me.empId, reviewerUid: me.uid, reviewerName: me.name,
      answers: data.answers, categoryScores, score, strengths: data.strengths, improvement: data.improvement,
      submittedAt: serverTimestamp(),
    });
    setShowSupervisorForm(false);
    setFinal((f) => ({ ...f, strengths: f.strengths || data.strengths, improvement: f.improvement || data.improvement }));
    await loadPanel();
  };

  const result = combine360(responses, metric?.score ?? null);
  const mySupervisorDone = responses.some((r) => r.type === "supervisor" && r.reviewerEmpId === me.empId);
  const hasSupervisor = responses.some((r) => r.type === "supervisor");

  const finalize = async () => {
    if (!subject || !hasSupervisor) return;
    const missingText = result.missing.length ? `\n\nNo ${result.missing.map((m) => RATER_LABELS[m].toLowerCase()).join(" / ")} responses yet; the remaining weights will be scaled up.` : "";
    if (!confirm(`Finalize ${subject.name}'s ${periodLabel} review with a score of ${result.averageScore.toFixed(1)} (${result.interpretation})?${missingText}\n\nThis can't be changed afterwards.`)) return;
    setFinalizing(true);
    try {
      const today = manilaDate();
      // Deterministic ID: firestore.rules make it create-only, so it's final.
      await setDoc(doc(db, "performance_evaluations", finalId), {
        employeeId: subject.employeeId,
        customEmployeeId: subject.employeeId,
        employeeName: subject.name,
        department: subject.department || "Unassigned",
        reviewPeriod: periodLabel,
        periodId: period.id,
        method: "360",
        evaluator: me.name,
        evaluatorId: me.uid,
        dateEvaluated: today,
        ratings: result.ratings,
        averageScore: result.averageScore,
        interpretation: result.interpretation,
        raterScores: result.raterScores,
        raterWeights: result.effectiveWeights,
        attendanceMetric: metric,
        strengths: final.strengths,
        improvement: final.improvement,
        finalDecision: final.finalDecision,
        status: "Finalized",
      });

      await notify(subject.employeeId, subject.name, `Performance Review Completed (${periodLabel})`,
        `Your 360° evaluation is final: ${result.averageScore.toFixed(1)} (${result.interpretation}). Decision: ${final.finalDecision}.`);

      if (final.finalDecision === "Training") {
        const due = new Date();
        due.setDate(due.getDate() + 30);
        await addDoc(collection(db, "trainings"), {
          employeeId: subject.employeeId,
          employeeName: subject.name,
          title: `Performance Improvement Plan: ${periodLabel}`,
          description: `Required training following your performance review to address: ${final.improvement || "areas identified in your review"}`,
          status: "Pending",
          dueDate: due.toISOString().split("T")[0],
          link: "",
        });
      }

      setShowReview(false);
      await fetchData();
      alert("Evaluation finalized and the employee was notified.");
    } catch (e) {
      console.error("Error finalizing evaluation:", e);
      alert("Couldn't finalize. It may already be finalized for this period.");
    }
    setFinalizing(false);
  };

  const statusPill = (done: boolean) => done
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> Submitted</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase tracking-wider"><Clock className="w-3 h-3" /> Pending</span>;

  const answered = new Set(responses.map((r) => r.id));
  const selfReq = requests.find((r) => r.type === "self");
  const peerReqs = requests.filter((r) => r.type === "peer");
  const peerCandidates = employees.filter((e) => subject && e.employeeId !== subject.employeeId && !peerReqs.some((r) => r.reviewerEmpId === e.employeeId))
    .sort((a, b) => Number(b.department === subject?.department) - Number(a.department === subject?.department) || a.name.localeCompare(b.name));

  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] tracking-tight">Performance Tracker</h1>
          <p className="text-gray-500 font-medium">360° reviews: supervisor {RATER_WEIGHTS.supervisor * 100}% · peers {RATER_WEIGHTS.peer * 100}% · self {RATER_WEIGHTS.self * 100}%, plus attendance from timesheets</p>
        </div>
        <button onClick={openReview} className="bg-[#810100] text-white px-8 py-3.5 rounded-2xl flex items-center gap-2 hover:bg-[#630000] shadow-xl shadow-red-900/20 transition-all font-black uppercase text-xs tracking-widest">
          <Plus className="w-5 h-5" /> 360° Review
        </button>
      </div>

      {/* DASHBOARD SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Evaluated</p>
          <p className="text-4xl font-black text-[#1B1717]">{evaluations.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Top Performers</p>
          <p className="text-4xl font-black text-[#1B1717]">{evaluations.filter((e) => e.averageScore >= 4.5).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Needs Review</p>
          <p className="text-4xl font-black text-[#1B1717]">{evaluations.filter((e) => e.averageScore < 2.5).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-[#810100] uppercase tracking-widest mb-1">Avg. Company Score</p>
          <p className="text-4xl font-black text-[#1B1717]">
            {(evaluations.reduce((acc, curr) => acc + curr.averageScore, 0) / evaluations.length || 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* RECORDS TABLE */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-black text-[#1B1717] uppercase tracking-tight">Evaluation History</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input autoComplete="off"
              type="text"
              placeholder="Search employee..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:border-[#810100] outline-none font-bold"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#EDEBDD] text-gray-600 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Employee</th>
                <th className="px-8 py-5">Period</th>
                <th className="px-8 py-5 text-center">Score</th>
                <th className="px-8 py-5">Interpretation</th>
                <th className="px-8 py-5">Raters</th>
                <th className="px-8 py-5">Decision</th>
                <th className="px-8 py-5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!loading && evaluations.length === 0 && (
                <tr><td colSpan={7} className="px-8 py-16 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">No evaluations yet</td></tr>
              )}
              {evaluations.filter((e) => e.employeeName.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-black text-[#1B1717]">{item.employeeName}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase">{item.department}</div>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-gray-600">{item.reviewPeriod}</td>
                  <td className="px-8 py-5 text-center">
                    <span className="text-2xl font-black text-[#810100]">{item.averageScore.toFixed(1)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      item.interpretation === "Excellent" ? "bg-green-100 text-green-700" :
                      item.interpretation === "Very Good" ? "bg-blue-100 text-blue-700" :
                      item.interpretation === "Good" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>{item.interpretation}</span>
                  </td>
                  <td className="px-8 py-5 text-xs text-gray-500">
                    {item.raterScores ? (
                      (Object.keys(item.raterScores) as RaterType[]).map((t) => (
                        <div key={t}><span className="font-bold">{RATER_LABELS[t]}</span> {item.raterScores![t]!.score.toFixed(1)}{t === "peer" ? ` (${item.raterScores![t]!.count})` : ""}</div>
                      ))
                    ) : (
                      <span className="font-mono">{item.evaluator}</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{item.finalDecision}</span>
                  </td>
                  <td className="px-8 py-5 text-right text-xs font-black text-gray-400">{item.dateEvaluated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 360° REVIEW PANEL */}
      {showReview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center">
              <h2 className="text-2xl font-black text-[#1B1717] uppercase tracking-tighter">360° Performance Review</h2>
              <button onClick={() => setShowReview(false)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto">
              {/* Employee + period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Employee</label>
                  <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setFinal({ strengths: "", improvement: "", finalDecision: "None" }); }}
                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-bold focus:border-[#810100] outline-none">
                    <option value="">-- Choose Employee --</option>
                    {employees.filter((e) => e.employeeId !== me.empId).map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Review Period</label>
                  <select value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)}
                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-bold focus:border-[#810100] outline-none">
                    {periodOptions.map((p) => <option key={p} value={p}>{p} ({quarterPeriod(p).start} – {quarterPeriod(p).end})</option>)}
                  </select>
                </div>
              </div>

              {!me.empId && (
                <p className="text-sm font-bold text-red-600 bg-red-50 p-4 rounded-2xl">Your account has no Employee ID, so you can't submit a supervisor evaluation. Ask an admin to link your account to an employee record.</p>
              )}

              {subject && alreadyFinal && (
                <p className="text-sm font-bold text-green-700 bg-green-50 p-4 rounded-2xl">{subject.name}'s {periodLabel} review is already finalized. See Evaluation History.</p>
              )}

              {subject && !alreadyFinal && (panelLoading ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-[#810100] mx-auto" /></div>
              ) : (
                <>
                  {/* Raters */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-[#810100] uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4" /> Raters</h3>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl">
                      {/* Supervisor */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserCheck className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-black text-[#1B1717]">Supervisor <span className="text-gray-400 font-bold">· {RATER_WEIGHTS.supervisor * 100}%</span></p>
                            <p className="text-xs text-gray-500">{me.name}</p>
                          </div>
                        </div>
                        {mySupervisorDone ? statusPill(true) : (
                          <button disabled={!me.empId} onClick={() => setShowSupervisorForm(true)}
                            className="px-5 py-2.5 bg-[#810100] text-white rounded-xl font-bold text-sm hover:bg-[#630000] disabled:opacity-50">Fill evaluation</button>
                        )}
                      </div>

                      {/* Self */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-black text-[#1B1717]">Self <span className="text-gray-400 font-bold">· {RATER_WEIGHTS.self * 100}%</span></p>
                            <p className="text-xs text-gray-500">{subject.name}</p>
                          </div>
                        </div>
                        {selfReq ? statusPill(answered.has(selfReq.id)) : (
                          <button disabled={sending} onClick={() => sendRequests()}
                            className="px-5 py-2.5 border-2 border-[#810100] text-[#810100] rounded-xl font-bold text-sm hover:bg-[#fce8e8] flex items-center gap-2 disabled:opacity-50"><Send className="w-4 h-4" /> Request</button>
                        )}
                      </div>

                      {/* Peers */}
                      <div className="px-5 py-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-gray-400" />
                          <p className="font-black text-[#1B1717]">Peers <span className="text-gray-400 font-bold">· {RATER_WEIGHTS.peer * 100}% (averaged)</span></p>
                        </div>
                        {peerReqs.map((r) => (
                          <div key={r.id} className="flex items-center justify-between pl-8">
                            <span className="text-sm font-bold text-gray-700">{r.reviewerName}</span>
                            {statusPill(answered.has(r.id))}
                          </div>
                        ))}
                        {peerReqs.length < MAX_PEERS && (
                          <div className="flex gap-3 pl-8">
                            <select value={peerToAdd} onChange={(e) => setPeerToAdd(e.target.value)}
                              className="flex-1 p-2.5 bg-white border-2 border-gray-100 rounded-xl font-bold text-sm focus:border-[#810100] outline-none">
                              <option value="">Add a peer (same department listed first)…</option>
                              {peerCandidates.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.department}</option>)}
                            </select>
                            <button disabled={!peerToAdd || sending} onClick={() => sendRequests(employees.find((e) => e.id === peerToAdd))}
                              className="px-5 py-2.5 border-2 border-[#810100] text-[#810100] rounded-xl font-bold text-sm hover:bg-[#fce8e8] flex items-center gap-2 disabled:opacity-50"><Send className="w-4 h-4" /> Request</button>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 pl-8">Ask 2–3 colleagues who work with them. Requesting a peer also sends the self-evaluation request.</p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance metric */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-[#810100] uppercase tracking-widest flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Attendance & Punctuality (from timesheets)</h3>
                    {metric ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          ["Score", metric.score.toFixed(1)],
                          ["Attendance", `${metric.attendanceRate}%`],
                          ["Punctuality", `${metric.punctualityRate}%`],
                          ["Present / Absent / Late", `${metric.presentDays} / ${metric.absentDays} / ${metric.lateDays}`],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                            <p className="text-xl font-black text-[#1B1717]">{value}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No workdays in this period yet, so attendance isn't counted.</p>
                    )}
                    <p className="text-xs text-gray-400">Approved leave is excused. Time-ins after 9:00 count as late. Attendance is 70% of this score, punctuality 30%.</p>
                  </div>

                  {/* Preview + finalize */}
                  <div className="bg-[#1B1717] p-8 rounded-[32px] text-white space-y-6">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Combined Score {hasSupervisor ? "" : "(waiting for supervisor)"}</p>
                        <p className="text-6xl font-black tracking-tighter">{hasSupervisor ? result.averageScore.toFixed(1) : "—"}</p>
                      </div>
                      <div className="md:text-right space-y-1 text-sm">
                        {(Object.keys(result.raterScores) as RaterType[]).map((t) => (
                          <p key={t}><span className="text-gray-400">{RATER_LABELS[t]} ({result.effectiveWeights[t]}%)</span> <span className="font-black">{result.raterScores[t]!.score.toFixed(1)}</span></p>
                        ))}
                        {metric && <p><span className="text-gray-400">Attendance (1 of 6 categories)</span> <span className="font-black">{metric.score.toFixed(1)}</span></p>}
                        {hasSupervisor && <p className="text-2xl font-black text-[#EDEBDD]">{result.interpretation}</p>}
                      </div>
                    </div>
                    {result.missing.length > 0 && hasSupervisor && (
                      <p className="text-xs text-yellow-300">Waiting on: {result.missing.map((m) => RATER_LABELS[m]).join(", ")}. If you finalize now, the other weights are scaled up.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Key Strengths (shown to employee)</h3>
                      <textarea value={final.strengths} onChange={(e) => setFinal({ ...final, strengths: e.target.value })}
                        className="w-full p-4 bg-gray-50 rounded-2xl h-28 outline-none focus:ring-2 focus:ring-[#810100]/20 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /> Areas for Improvement (shown to employee)</h3>
                      <textarea value={final.improvement} onChange={(e) => setFinal({ ...final, improvement: e.target.value })}
                        className="w-full p-4 bg-gray-50 rounded-2xl h-28 outline-none focus:ring-2 focus:ring-[#810100]/20 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4 text-[#810100]" /> Final Recommendation</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {DECISIONS.map((decision) => (
                        <button key={decision} onClick={() => setFinal({ ...final, finalDecision: decision })}
                          className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                            final.finalDecision === decision ? "bg-[#810100] text-white border-[#810100] shadow-lg" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                          }`}>{decision}</button>
                      ))}
                    </div>
                  </div>
                </>
              ))}
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end gap-4">
              <button onClick={() => setShowReview(false)} className="px-8 py-3 text-gray-500 font-black uppercase text-[10px] tracking-widest">Close</button>
              <button onClick={finalize} disabled={!subject || !hasSupervisor || alreadyFinal || finalizing}
                title={!hasSupervisor ? "The supervisor evaluation is required" : undefined}
                className="px-10 py-3 bg-[#1B1717] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-black transition-all disabled:opacity-40 flex items-center gap-2">
                {finalizing && <Loader2 className="w-4 h-4 animate-spin" />} <Star className="w-4 h-4" /> Finalize Review
              </button>
            </div>
          </div>
        </div>
      )}

      {showSupervisorForm && subject && (
        <EvaluationForm
          raterType="supervisor"
          subjectName={subject.name}
          periodLabel={periodLabel}
          onClose={() => setShowSupervisorForm(false)}
          onSubmit={submitSupervisor}
        />
      )}
    </div>
  );
}
