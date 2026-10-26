import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Star, Award, Loader2, CheckCircle, TrendingDown, Clock, ShieldAlert, Users, UserCheck } from 'lucide-react';
import { auth, db } from '../../../config/firebaseSetup';
import { collection, getDocs, doc, getDoc, query, where, or } from 'firebase/firestore';
import PendingEvaluations from '../../components/PendingEvaluations';

interface PerformanceRecord {
  id: string;
  reviewPeriod: string;
  evaluator: string;
  evaluatorId?: string;
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
  employeeId?: string;
  customEmployeeId?: string;
  employeeName?: string;
  department?: string;
  finalDecision?: string;
}

const MyEvaluation: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<PerformanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'as_employee' | 'as_evaluator'>('as_employee');
  const [userName, setUserName] = useState<string>('');
  const [userEmployeeId, setUserEmployeeId] = useState<string>('');

  useEffect(() => {
    const fetchMyEvaluations = async () => {
      try {
        const currentUser = auth.currentUser;
        console.log('Current user UID:', currentUser?.uid);
        
        if (!currentUser) {
          setLoading(false);
          setError("No user logged in");
          return;
        }

        // Get the user data from users collection
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (!userDoc.exists()) {
          setLoading(false);
          setError("User profile not found");
          return;
        }
        
        const userData = userDoc.data();
        console.log('Full user data:', userData);
        
        // Get user's name - PRIORITIZE NAME OVER EMAIL
        const name = userData.name || 
                    userData.displayName || 
                    userData.fullName || 
                    userData.employeeName ||
                    `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        
        const finalUserName = name && name.trim() !== "" 
          ? name 
          : (currentUser.email ? currentUser.email.split('@')[0] : "User");
        
        setUserName(finalUserName);
        
        // Get employee ID if this user is also an employee
        const empId = userData.employeeId || 
                     userData.customEmployeeId || 
                     userData.employeeNumber || 
                     userData.empId;
        
        setUserEmployeeId(empId || '');
        
        console.log('User Name (from DB):', finalUserName);
        console.log('User Employee ID:', empId);
        
        // Managers may read every evaluation; employees only their own
        // (firestore.rules rejects an unfiltered query from an employee).
        const evaluationsRef = collection(db, "performance_evaluations");
        const isManager = ['admin', 'hr', 'supervisor'].includes(String(userData.role || '').toLowerCase());
        const evaluationsSnapshot = await getDocs(
          isManager
            ? evaluationsRef
            : query(evaluationsRef, or(where('employeeId', '==', empId || '__none__'), where('customEmployeeId', '==', empId || '__none__')))
        );
        
        console.log('Total evaluations in DB:', evaluationsSnapshot.size);
        
        // Filter evaluations
        const evaluationsWhereImEmployee: PerformanceRecord[] = [];
        const evaluationsWhereImEvaluator: PerformanceRecord[] = [];
        
        evaluationsSnapshot.forEach((doc) => {
          const evalData = doc.data();
          console.log('Checking evaluation:', {
            id: doc.id,
            employeeName: evalData.employeeName,
            evaluator: evalData.evaluator,
            employeeId: evalData.employeeId,
            customEmployeeId: evalData.customEmployeeId
          });
          
          // Check if this user is the EMPLOYEE (evaluation is about them)
          let isEmployee = false;
          
          if (empId) {
            if (evalData.employeeId === empId || evalData.customEmployeeId === empId) {
              isEmployee = true;
              console.log(`✅ User is EMPLOYEE for evaluation ${doc.id} (matched by ID)`);
            }
          }
          
          // Match by employee name (case-insensitive)
          if (!isEmployee && evalData.employeeName) {
            const normalizedEvalName = evalData.employeeName.toLowerCase().trim();
            const normalizedUserName = finalUserName.toLowerCase().trim();
            
            if (normalizedEvalName === normalizedUserName) {
              isEmployee = true;
              console.log(`✅ User is EMPLOYEE for evaluation ${doc.id} (matched by exact name)`);
            } else if (normalizedEvalName.includes(normalizedUserName) || normalizedUserName.includes(normalizedEvalName)) {
              // Only match if the names are very similar (to avoid false positives)
              if (normalizedEvalName.length > 3 && normalizedUserName.length > 3) {
                isEmployee = true;
                console.log(`✅ User is EMPLOYEE for evaluation ${doc.id} (matched by partial name)`);
              }
            }
          }
          
          // Check if this user is the EVALUATOR (they conducted this evaluation)
          let isEvaluator = false;
          
          if (evalData.evaluator) {
            const normalizedEvalName = evalData.evaluator.toLowerCase().trim();
            const normalizedUserName = finalUserName.toLowerCase().trim();
            
            if (normalizedEvalName === normalizedUserName) {
              isEvaluator = true;
              console.log(`✅ User is EVALUATOR for evaluation ${doc.id} (matched by exact name)`);
            } else if (normalizedEvalName.includes(normalizedUserName) || normalizedUserName.includes(normalizedEvalName)) {
              // Partial match for names like "Jasmine Michaela Espiritu" and "Jasmine Michaela"
              if (normalizedEvalName.length > 5 && normalizedUserName.length > 5) {
                isEvaluator = true;
                console.log(`✅ User is EVALUATOR for evaluation ${doc.id} (matched by partial name)`);
              }
            }
          }
          
          // Also match by evaluatorId if stored
          if (!isEvaluator && evalData.evaluatorId === currentUser.uid) {
            isEvaluator = true;
            console.log(`✅ User is EVALUATOR for evaluation ${doc.id} (matched by UID)`);
          }
          
          // Transform the data
          const ratings = {
            workQuality: evalData.workQuality || evalData.ratings?.workQuality || 0,
            productivity: evalData.productivity || evalData.ratings?.productivity || 0,
            attendance: evalData.attendance || evalData.ratings?.attendance || 0,
            teamwork: evalData.teamwork || evalData.ratings?.teamwork || 0,
            communication: evalData.communication || evalData.ratings?.communication || 0,
            problemSolving: evalData.problemSolving || evalData.ratings?.problemSolving || 0,
          };
          
          const reviewPeriod = evalData.reviewPeriod || 
            (evalData.dateEvaluated ? 
              `Q${Math.floor(new Date(evalData.dateEvaluated).getMonth() / 3) + 1} ${new Date(evalData.dateEvaluated).getFullYear()}` : 
              'Periodic Review');
          
          const performanceRecord: PerformanceRecord = {
            id: doc.id,
            reviewPeriod: reviewPeriod,
            evaluator: evalData.evaluator || "Unknown",
            evaluatorId: evalData.evaluatorId,
            dateEvaluated: evalData.dateEvaluated || "",
            ratings: ratings,
            averageScore: Number(evalData.averageScore ?? evalData.rating ?? 0),
            interpretation: evalData.interpretation || "No rating",
            strengths: evalData.strengths || evalData.comments || "No strengths highlighted.",
            improvement: evalData.improvement || "No improvement areas highlighted.",
            employeeId: evalData.employeeId,
            customEmployeeId: evalData.customEmployeeId,
            employeeName: evalData.employeeName,
            department: evalData.department,
            finalDecision: evalData.finalDecision,
          };
          
          if (isEmployee) {
            evaluationsWhereImEmployee.push(performanceRecord);
          }
          
          if (isEvaluator) {
            evaluationsWhereImEvaluator.push(performanceRecord);
          }
        });
        
        // Sort by date (newest first)
        evaluationsWhereImEmployee.sort((a, b) => 
          new Date(b.dateEvaluated).getTime() - new Date(a.dateEvaluated).getTime()
        );
        evaluationsWhereImEvaluator.sort((a, b) => 
          new Date(b.dateEvaluated).getTime() - new Date(a.dateEvaluated).getTime()
        );
        
        console.log('Evaluations where user is employee:', evaluationsWhereImEmployee.length);
        console.log('Evaluations where user is evaluator:', evaluationsWhereImEvaluator.length);
        
        // Determine which view to show
        if (evaluationsWhereImEmployee.length > 0) {
          setViewType('as_employee');
          setEvaluations(evaluationsWhereImEmployee);
        } else if (evaluationsWhereImEvaluator.length > 0) {
          setViewType('as_evaluator');
          setEvaluations(evaluationsWhereImEvaluator);
        } else {
          setEvaluations([]);
        }
        
        setLoading(false);
        
        if (evaluationsWhereImEmployee.length === 0 && evaluationsWhereImEvaluator.length === 0) {
          setError(`No evaluations found for your account.
          
📋 Your Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Name: ${finalUserName}
🆔 Employee ID: ${empId || 'Not assigned'}
📝 Total evaluations in system: ${evaluationsSnapshot.size}

💡 Note: If you are an evaluator (HR/Manager), evaluations you conduct will appear here.`);
        } else {
          setError(null);
        }
        
      } catch (error) {
        console.error("Error fetching evaluations:", error);
        setError(`Failed to load evaluations: ${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    };

    fetchMyEvaluations();
  }, []);

  // Function to mask evaluator name
  const maskEvaluatorName = (name: string) => {
    if (!name) return "Anonymous Evaluator";
    return name.split(' ').map(word => {
        if (word.length <= 1) return word;
        return word[0] + '*'.repeat(word.length - 1);
    }).join(' ');
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#810100] w-10 h-10"/>
        </div>
        <div className="mt-4 text-center text-gray-500 text-sm">
          Loading your evaluations...
        </div>
      </div>
    );
  }

  if (error && evaluations.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-[32px] p-8 text-center">
          <ShieldAlert className="text-red-500 w-12 h-12 mx-auto mb-4" />
          <h3 className="text-xl font-black text-red-700 mb-2">No Evaluations Found</h3>
          <div className="text-red-600 mb-4 whitespace-pre-wrap text-left bg-red-100 p-4 rounded-xl font-mono text-sm overflow-auto max-h-96">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-[#1B1717] tracking-tight uppercase">
          {viewType === 'as_employee' ? 'My Performance Reviews' : 'Evaluations I Conducted'}
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          {viewType === 'as_employee' 
            ? 'Review your performance evaluations and feedback from your managers.' 
            : `View all performance evaluations you have conducted for employees.`}
        </p>
        {viewType === 'as_evaluator' && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 inline-flex items-center gap-1 px-3 py-1 rounded-full">
            <UserCheck className="w-3 h-3" /> Viewing as Evaluator
          </div>
        )}
      </div>

      {userEmployeeId && <PendingEvaluations employeeId={userEmployeeId} />}

      {evaluations.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-gray-100 p-16 text-center shadow-sm">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-gray-200">
             <ShieldAlert className="text-gray-300 w-10 h-10" />
           </div>
           <h3 className="text-xl font-black text-[#1B1717] uppercase tracking-tight mb-2">No Evaluations Yet</h3>
           <p className="text-gray-500 font-medium max-w-md mx-auto">
             {viewType === 'as_employee' 
               ? "You haven't received any performance evaluations yet. Check back later."
               : "You haven't conducted any performance evaluations yet. Use the Performance Tracker to evaluate employees."}
           </p>
        </div>
      ) : (
        <div className="space-y-12">
            {evaluations.map((evalRecord) => (
                <div key={evalRecord.id} className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-[#1B1717] p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            {viewType === 'as_evaluator' && evalRecord.employeeName && (
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-2">
                                  <Users className="w-3 h-3" /> Employee: {evalRecord.employeeName} • {evalRecord.department || 'No Department'}
                              </p>
                            )}
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Reviewed on {evalRecord.dateEvaluated}
                            </p>
                            <h2 className="text-3xl font-black tracking-tight">{evalRecord.reviewPeriod} Review</h2>
                            {viewType === 'as_employee' && (
                              <p className="text-sm text-gray-300 mt-2 flex items-center gap-2">
                                  Evaluator: <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{maskEvaluatorName(evalRecord.evaluator)}</span>
                              </p>
                            )}
                            {evalRecord.finalDecision && evalRecord.finalDecision !== "None" && (
                              <p className="text-sm text-gray-300 mt-1 flex items-center gap-2">
                                Decision: <span className="font-bold bg-white/10 px-2 py-0.5 rounded">{evalRecord.finalDecision}</span>
                              </p>
                            )}
                        </div>
                        <div className="text-right bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Final Score</p>
                            <div className="flex items-end gap-3 justify-end">
                                <p className="text-6xl font-black leading-none">{evalRecord.averageScore.toFixed(1)}</p>
                                <p className={`text-sm font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1 ${
                                    evalRecord.interpretation === "Excellent" ? "bg-green-500/20 text-green-400" :
                                    evalRecord.interpretation === "Very Good" ? "bg-blue-500/20 text-blue-400" :
                                    evalRecord.interpretation === "Good" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                                }`}>
                                    {evalRecord.interpretation}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-8">
                            <h3 className="text-sm font-black text-[#810100] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-4">
                                <Star className="w-5 h-5" /> Detailed Ratings Breakdown
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(evalRecord.ratings).map(([key, value]) => (
                                    <div key={key} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-xs font-black uppercase text-gray-500 tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</p>
                                            <p className="text-2xl font-black text-[#1B1717]">{value} <span className="text-[10px] text-gray-400">/ 5</span></p>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className="bg-[#810100] h-2.5 rounded-full" style={{ width: `${(value / 5) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-8">
                             <h3 className="text-sm font-black text-[#810100] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-4">
                                <Target className="w-5 h-5" /> Evaluator Feedback
                            </h3>
                            
                            <div className="space-y-6">
                                <div className="bg-green-50 border border-green-100 p-6 rounded-3xl">
                                    <h4 className="text-[10px] font-black uppercase text-green-700 tracking-widest flex items-center gap-2 mb-3">
                                        <CheckCircle className="w-4 h-4" /> Key Strengths
                                    </h4>
                                    <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {evalRecord.strengths || "No strengths highlighted."}
                                    </p>
                                </div>

                                <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
                                    <h4 className="text-[10px] font-black uppercase text-orange-700 tracking-widest flex items-center gap-2 mb-3">
                                        <TrendingDown className="w-4 h-4" /> Areas for Improvement
                                    </h4>
                                    <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {evalRecord.improvement || "No improvement areas highlighted."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default MyEvaluation;