import { useState, useEffect } from "react";
import {
  Target, TrendingUp, Star, Users, Calendar, FileText, Download, Search, Plus, Eye, 
  CheckCircle, Clock, X, ClipboardList, UserCheck, Award, TrendingDown, MessageSquare, Briefcase
} from "lucide-react";
import { collection, getDocs, addDoc, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../config/firebaseSetup";

// --- INTERFACES ---
interface PerformanceRecord {
  id?: string;
  employeeId: string;
  customEmployeeId: string;
  employeeName: string;
  department: string;
  reviewPeriod: string;
  evaluator: string;
  evaluatorId?: string; // Add evaluator ID
  dateEvaluated: string;

  ratings: {
    workQuality: number;
    productivity: number;
    attendance: number;
    teamwork: number;
    communication: number;
    problemSolving: number;
  };

  averageScore: number;
  interpretation: string;
  strengths: string;
  improvement: string;
  finalDecision: "Promotion" | "Salary Increase" | "Training" | "Warning" | "None";
  status: "Finalized";
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
}

export default function Performance() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<PerformanceRecord[]>([]);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentEvaluator, setCurrentEvaluator] = useState<{ name: string; id: string }>({ name: "", id: "" });

  const initialFormState = {
    employeeId: "",
    reviewPeriod: "Q1 2026",
    evaluator: "", // Will be set from current user
    ratings: {
      workQuality: 5,
      productivity: 5,
      attendance: 5,
      teamwork: 5,
      communication: 5,
      problemSolving: 5
    },
    strengths: "",
    improvement: "",
    finalDecision: "None" as any
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch current user info
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const evaluatorName = userData.name || userData.displayName || user.email || "Unknown Evaluator";
            setCurrentEvaluator({
              name: evaluatorName,
              id: user.uid
            });
            setFormData(prev => ({
              ...prev,
              evaluator: evaluatorName
            }));
          } else {
            setCurrentEvaluator({
              name: user.email || "Unknown Evaluator",
              id: user.uid
            });
            setFormData(prev => ({
              ...prev,
              evaluator: user.email || "Unknown Evaluator"
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };
    
    getCurrentUser();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empSnap = await getDocs(collection(db, "employees"));
      const employeesData = empSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
      setEmployees(employeesData);
      console.log("Fetched employees:", employeesData);
      
      const evalQuery = query(collection(db, "performance_evaluations"), orderBy("dateEvaluated", "desc"));
      const evalSnap = await getDocs(evalQuery);
      const evaluationsData = evalSnap.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceRecord));
      setEvaluations(evaluationsData);
      console.log("Fetched evaluations:", evaluationsData);
    } catch (e) { 
      console.error("Error fetching data:", e); 
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- LOGIC: SCORE & INTERPRETATION ---
  const getInterpretation = (score: number) => {
    if (score >= 4.5) return "Excellent";
    if (score >= 3.5) return "Very Good";
    if (score >= 2.5) return "Good";
    if (score >= 1.5) return "Needs Improvement";
    return "Poor";
  };

  const calculateAverage = () => {
    const r = formData.ratings;
    const sum = r.workQuality + r.productivity + r.attendance + r.teamwork + r.communication + r.problemSolving;
    return (sum / 6).toFixed(1);
  };

  // --- INTEGRATION LOGIC (SAVE EVALUATION + NOTIFY + TRAINING) ---
  const handleSaveEval = async () => {
    if (!formData.employeeId) return alert("Please select an employee first.");
    
    const avgScore = parseFloat(calculateAverage());
    const interpretation = getInterpretation(avgScore);
    const selectedEmp = employees.find(e => e.id === formData.employeeId);

    // FIX: Ensure we have all the necessary data with proper fallbacks
    const safeCustomEmpId = selectedEmp?.employeeId || "NO-ID-ASSIGNED";
    const safeEmpName = selectedEmp?.name || "Unknown Employee";
    const safeDepartment = selectedEmp?.department || "Unassigned";
    const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    const finalData: PerformanceRecord = {
      ...formData,
      // Store BOTH employeeId fields for maximum compatibility
      employeeId: safeCustomEmpId,
      customEmployeeId: safeCustomEmpId,
      employeeName: safeEmpName,
      department: safeDepartment,
      averageScore: avgScore,
      interpretation: interpretation,
      dateEvaluated: currentDate,
      status: "Finalized",
      evaluatorId: currentEvaluator.id // Store the evaluator's UID
    };

    console.log("Saving evaluation with data:", finalData);

    try {
      // 1. SAVE EVALUATION RECORD
      const docRef = await addDoc(collection(db, "performance_evaluations"), finalData);
      console.log("Evaluation saved with ID:", docRef.id);

      // 2. SEND SYSTEM NOTIFICATION TO THE EMPLOYEE
      await addDoc(collection(db, "notifications"), {
        title: `Performance Review Completed (${formData.reviewPeriod})`,
        message: `Your performance evaluation has been finalized by ${formData.evaluator}. You received an average score of ${avgScore.toFixed(1)} (${interpretation}). Decision: ${formData.finalDecision}.`,
        type: 'System',
        date: currentDate,
        isRead: false,
        employeeId: safeCustomEmpId,
        employeeName: safeEmpName
      });

      // 3. CONDITIONALLY ASSIGN TRAINING
      if (formData.finalDecision === "Training") {
        const dueDateObj = new Date();
        dueDateObj.setDate(dueDateObj.getDate() + 30);
        const formattedDueDate = dueDateObj.toISOString().split('T')[0];

        await addDoc(collection(db, "trainings"), {
          employeeId: safeCustomEmpId,
          employeeName: safeEmpName,
          title: `Performance Improvement Plan: ${formData.reviewPeriod}`,
          description: `Required training assigned following your recent performance review to address areas of improvement: ${formData.improvement}`,
          status: 'Pending',
          dueDate: formattedDueDate,
          link: '' 
        });
      }

      // Cleanup & Refresh
      setShowEvalModal(false);
      setFormData({
        ...initialFormState,
        evaluator: currentEvaluator.name // Keep the evaluator name
      });
      await fetchData(); // Wait for data to refresh
      alert("Evaluation successfully recorded and notifications sent.");

    } catch (e) { 
      console.error("Error saving evaluation:", e);
      alert("Error saving evaluation. Please check the console log."); 
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] tracking-tight">Performance Tracker</h1>
          <p className="text-gray-500 font-medium">Evaluate employee quality, productivity, and behavior</p>
          {currentEvaluator.name && (
            <p className="text-xs text-gray-400 mt-1">Logged in as: {currentEvaluator.name}</p>
          )}
        </div>
        <button onClick={() => setShowEvalModal(true)} className="bg-[#810100] text-white px-8 py-3.5 rounded-2xl flex items-center gap-2 hover:bg-[#630000] shadow-xl shadow-red-900/20 transition-all font-black uppercase text-xs tracking-widest">
          <Plus className="w-5 h-5" /> Evaluate Employee
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
          <p className="text-4xl font-black text-[#1B1717]">{evaluations.filter(e => e.averageScore >= 4.5).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Needs Review</p>
          <p className="text-4xl font-black text-[#1B1717]">{evaluations.filter(e => e.averageScore < 2.5).length}</p>
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
            <input 
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
                <th className="px-8 py-5">Evaluator</th>
                <th className="px-8 py-5">Decision</th>
                <th className="px-8 py-5 text-right">Date</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {evaluations.filter(e => e.employeeName.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
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
                  <td className="px-8 py-5 text-sm font-mono text-gray-500">{item.evaluator}</td>
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

      {/* EVALUATION MODAL */}
      {showEvalModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md p-8 border-b flex justify-between items-center z-20">
              <h2 className="text-2xl font-black text-[#1B1717] uppercase tracking-tighter">Evaluation Form</h2>
              <button onClick={() => setShowEvalModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-10 space-y-12">
              {/* Step 1 & 2: Review Info & Select Employee */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-3xl">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Select Employee</label>
                  <select 
                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-bold focus:border-[#810100] outline-none" 
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    value={formData.employeeId}
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</option>
                    ))}
                  </select>
                  {employees.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">No employees found. Please add employees first.</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Review Period</label>
                  <input 
                    type="text" 
                    value={formData.reviewPeriod} 
                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-[#810100]" 
                    onChange={(e) => setFormData({...formData, reviewPeriod: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Evaluator</label>
                  <input 
                    type="text" 
                    value={formData.evaluator} 
                    disabled
                    className="w-full p-3 bg-gray-100 border-2 border-gray-100 rounded-xl font-bold text-gray-600 cursor-not-allowed" 
                  />
                  <p className="text-xs text-gray-400 mt-1">Automatically set to current user</p>
                </div>
              </div>

              {/* Step 3 & 4: Criteria Rating System */}
              <div className="space-y-6">
                <h3 className="text-sm font-black text-[#810100] uppercase tracking-widest flex items-center gap-2">
                  <Star className="w-4 h-4" /> Performance Ratings (1-5)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {Object.keys(formData.ratings).map((criteria) => (
                    <div key={criteria} className="bg-white p-5 border-2 border-gray-50 rounded-2xl hover:border-[#810100]/20 transition-all">
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-3 block tracking-widest">{criteria.replace(/([A-Z])/g, ' $1')}</label>
                      <input 
                        type="range" min="1" max="5" step="1" 
                        value={(formData.ratings as any)[criteria]}
                        className="w-full accent-[#810100] mb-2"
                        onChange={(e) => setFormData({...formData, ratings: {...formData.ratings, [criteria]: Number(e.target.value)}})}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-black text-[#1B1717]">{(formData.ratings as any)[criteria]}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase italic">
                          {(formData.ratings as any)[criteria] === 5 ? "Excellent" : 
                           (formData.ratings as any)[criteria] === 4 ? "Very Good" :
                           (formData.ratings as any)[criteria] === 3 ? "Good" :
                           (formData.ratings as any)[criteria] === 2 ? "Needs Improvement" : "Poor"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 5: Score Computation Display */}
              <div className="bg-[#1B1717] p-8 rounded-[32px] text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Calculated Average Score</p>
                  <p className="text-6xl font-black tracking-tighter">{calculateAverage()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Interpretation</p>
                  <p className="text-3xl font-black text-[#EDEBDD] tracking-tight">{getInterpretation(parseFloat(calculateAverage()))}</p>
                </div>
              </div>

              {/* Step 6: Admin Feedback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Key Strengths</h3>
                  <textarea 
                    className="w-full p-5 bg-gray-50 border-none rounded-2xl h-32 outline-none focus:ring-2 focus:ring-[#810100]/20 font-medium" 
                    placeholder="Coding skills, problem solving, etc." 
                    onChange={(e) => setFormData({...formData, strengths: e.target.value})}
                  ></textarea>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /> Areas for Improvement</h3>
                  <textarea 
                    className="w-full p-5 bg-gray-50 border-none rounded-2xl h-32 outline-none focus:ring-2 focus:ring-[#810100]/20 font-medium" 
                    placeholder="Team communication, etc." 
                    onChange={(e) => setFormData({...formData, improvement: e.target.value})}
                  ></textarea>
                </div>
              </div>

              {/* Step 7: Final Decision */}
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4 text-[#810100]" /> Final Recommendation</h3>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {["None", "Promotion", "Salary Increase", "Training", "Warning"].map(decision => (
                      <button 
                        key={decision} 
                        onClick={() => setFormData({...formData, finalDecision: decision as any})}
                        className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                          formData.finalDecision === decision ? "bg-[#810100] text-white border-[#810100] shadow-lg" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        {decision}
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-gray-50 border-t flex justify-end gap-4 sticky bottom-0 z-20">
              <button onClick={() => setShowEvalModal(false)} className="px-8 py-3 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={handleSaveEval} className="px-12 py-3 bg-[#1B1717] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-black transition-all">Record Evaluation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}