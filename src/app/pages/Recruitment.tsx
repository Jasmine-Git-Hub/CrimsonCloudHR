import { useState, useEffect } from "react";
import { buildJobDescription, buildJobRequirements } from "../lib/jobTemplates";
import {
  Briefcase,
  Users,
  Calendar,
  Star,
  Plus,
  X,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  Edit,
} from "lucide-react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebaseSetup";
import toast from 'react-hot-toast';

// ==================== SALARY GUIDE MATRIX (PH) ====================
const salaryGuide: Record<string, Record<string, string>> = {
  "Human Resources (HR)": { Entry: "₱18k - ₱25k", Mid: "₱30k - ₱60k", Senior: "₱70k - ₱120k+" },
  "Information Technology (IT)": { Entry: "₱30k - ₱40k", Mid: "₱50k - ₱80k", Senior: "₱100k - ₱150k+" },
  "Finance / Accounting": { Entry: "₱18k - ₱25k", Mid: "₱40k - ₱60k", Senior: "₱80k - ₱100k+" },
  "Sales": { Entry: "₱15k - ₱30k", Mid: "₱30k - ₱100k", Senior: "₱100k+" },
  "Marketing": { Entry: "₱20k - ₱30k", Mid: "₱40k - ₱60k", Senior: "₱70k - ₱120k+" },
  "Operations": { Entry: "₱18k - ₱25k", Mid: "₱30k - ₱50k", Senior: "₱60k - ₱100k" },
  "Customer Service / Support": { Entry: "₱20k - ₱25k", Mid: "₱30k - ₱50k", Senior: "₱60k - ₱120k" },
  "Engineering / Product Dev": { Entry: "₱20k - ₱30k", Mid: "₱40k - ₱60k", Senior: "₱70k - ₱120k+" },
  "Admin / Legal": { Entry: "₱15k - ₱25k", Mid: "₱30k - ₱50k", Senior: "₱60k - ₱100k" },
};

// ==================== SPECIFIC ROLES PER DEPARTMENT ====================
const departmentRoles: Record<string, string[]> = {
  "Human Resources (HR)": ["HR Assistant", "HR Generalist", "Recruitment Specialist", "Payroll Officer", "HR Manager", "HR Director"],
  "Information Technology (IT)": ["IT Support Specialist", "Frontend Developer", "Backend Developer", "Full Stack Software Engineer", "Systems Administrator", "IT Project Manager", "CTO"],
  "Finance / Accounting": ["Accounting Assistant", "Junior Accountant", "Senior Accountant", "Financial Analyst", "Finance Manager", "CFO"],
  "Sales": ["Sales Representative", "Account Executive", "Business Development Manager", "Sales Manager", "VP of Sales"],
  "Marketing": ["Marketing Assistant", "Social Media Specialist", "SEO Specialist", "Content Writer", "Marketing Manager", "CMO"],
  "Operations": ["Operations Assistant", "Operations Analyst", "Logistics Coordinator", "Operations Manager", "COO"],
  "Customer Service / Support": ["Customer Service Representative", "Technical Support Specialist", "Customer Success Manager", "BPO Team Lead"],
  "Engineering / Product Dev": ["QA Engineer", "DevOps Engineer", "Product Manager", "UI/UX Designer", "Engineering Manager"],
  "Admin / Legal": ["Administrative Assistant", "Executive Assistant", "Legal Counsel", "Compliance Officer", "Admin Manager"],
};

const departments = Object.keys(salaryGuide);

// Description/requirements follow the selected role until the recruiter edits them.
const jobTemplateText = (f: Partial<Job>) => {
  const level = f.level || "Entry";
  const title = f.jobTitle || "";
  return {
    description: buildJobDescription(title, f.department || "", level, f.employmentType || "Full-time"),
    requirements: buildJobRequirements(title, level),
  };
};

const withJobTemplate = (next: Partial<Job>, prev: Partial<Job>): Partial<Job> => {
  const before = jobTemplateText(prev);
  const after = jobTemplateText(next);
  return {
    ...next,
    description: !prev.description || prev.description === before.description ? after.description : next.description,
    requirements: !prev.requirements || prev.requirements === before.requirements ? after.requirements : next.requirements,
  };
};

const defaultJobForm = (): Partial<Job> => {
  const base: Partial<Job> = {
    department: departments[0],
    jobTitle: departmentRoles[departments[0]][0],
    level: "Entry",
    employmentType: "Full-time",
    salaryRange: salaryGuide[departments[0]]["Entry"],
    status: "Open",
  };
  return { ...base, ...jobTemplateText(base) };
};

// ==================== INTERFACES ====================
interface Job {
  id?: string;
  jobTitle: string;
  department: string;
  level: "Entry" | "Mid" | "Senior";
  description: string;
  requirements: string;
  employmentType: "Full-time" | "Part-time" | "Contract" | "Internship";
  salaryRange?: string; 
  status: "Open" | "Closed";
  datePosted: string;
}

interface Applicant {
  id?: string;
  name: string;
  email: string;
  phone: string;
  jobApplied: string;
  jobTitle?: string;
  resumeURL: string; 
  applicationDate: string;
  status: "Applied" | "Shortlisted" | "Interview Scheduled" | "Rejected" | "Hired";
}

interface Interview {
  id?: string;
  applicantId: string;
  applicantName: string;
  jobId: string;
  jobTitle: string;
  interviewer: string;
  date: string;
  type: "Online" | "Onsite";
  notes: string;
  status: "Scheduled" | "Completed" | "Cancelled";
}

interface Evaluation {
  id?: string;
  applicantId: string;
  applicantName: string;
  jobId: string;
  interviewer: string;
  communication: number;
  technical: number;
  experience: number;
  overall: number;
  feedback: string;
  recommendation: "Hire" | "Consider" | "Reject";
  date: string;
}

interface HiringDecision {
  id?: string;
  applicantId: string;
  applicantName: string;
  jobId: string;
  jobTitle: string;
  offerSalary: number;
  startDate: string;
  decision: "Hired" | "Rejected" | "On Hold";
  decisionDate: string;
}

// ✅ Add Employee interface
interface EmployeeData {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  email: string;
  phone: string;
  status: "Active" | "On Leave" | "Inactive";
  hireDate: string;
  basicSalary?: number;
}

// ==================== MAIN COMPONENT ====================
export default function Recruitment() {
  const [activeTab, setActiveTab] = useState("Jobs");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Data states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [hiringDecisions, setHiringDecisions] = useState<HiringDecision[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]); // ✅ Add employees state

  // Form states
  const [jobForm, setJobForm] = useState<Partial<Job>>(defaultJobForm);

  const [applicantForm, setApplicantForm] = useState<Partial<Applicant>>({
    name: "",
    email: "",
    phone: "",
    jobApplied: "",
    resumeURL: "",
    status: "Applied",
  });

  const [interviewForm, setInterviewForm] = useState<Partial<Interview>>({
    applicantId: "",
    interviewer: "",
    date: "",
    type: "Online",
    notes: "",
    status: "Scheduled",
  });

  const [evaluationForm, setEvaluationForm] = useState<Partial<Evaluation>>({
    communication: 5,
    technical: 5,
    experience: 5,
    feedback: "",
    recommendation: "Consider",
  });

  const [hiringForm, setHiringForm] = useState<Partial<HiringDecision>>({
    offerSalary: 0,
    startDate: "",
    decision: "Hired",
  });

  const tabs = [
    { id: "Jobs", label: "Job Management", icon: Briefcase },
    { id: "Applicants", label: "Applicants", icon: Users },
    { id: "Interviews", label: "Interviews", icon: Calendar },
    { id: "Evaluations", label: "Evaluations", icon: Star },
    { id: "Hiring", label: "Hiring Decisions", icon: CheckCircle },
  ];

  // Debug: log hiringDecisions whenever they change
  useEffect(() => {
    console.log("Current hiringDecisions:", hiringDecisions);
  }, [hiringDecisions]);

  // Fetch all data (including employees)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [jobsSnap, applicantsSnap, interviewsSnap, evaluationsSnap, hiringSnap, employeesSnap] = await Promise.all([
          getDocs(collection(db, "jobs")),
          getDocs(collection(db, "applicants")),
          getDocs(collection(db, "interviews")),
          getDocs(collection(db, "evaluations")),
          getDocs(collection(db, "hiringDecisions")),
          getDocs(collection(db, "employees")), // ✅ Fetch employees
        ]);

        setJobs(jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
        setApplicants(applicantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Applicant)));
        setInterviews(interviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interview)));
        setEvaluations(evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation)));
        setHiringDecisions(hiringSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HiringDecision)));
        setEmployees(employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeData))); // ✅ Set employees
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ==================== HELPER: Check if applicant has pending interviews ====================
  const hasPendingInterview = (applicantId: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return interviews.some(interview => {
      if (interview.applicantId !== applicantId) return false;
      if (interview.status !== "Scheduled") return false;

      const interviewDate = new Date(interview.date);
      interviewDate.setHours(0, 0, 0, 0);
      return interviewDate > today;
    });
  };

  // ==================== JOB FUNCTIONS ====================
  const handleJobSubmit = async () => {
    setIsSubmitting(true);
    try {
      const newJob = {
        ...jobForm,
        datePosted: new Date().toISOString().split('T')[0],
      };
      await addDoc(collection(db, "jobs"), newJob);
      toast.success("Job posted successfully!");
      setShowAddModal(false);
      resetForm();
      refreshData("jobs");
    } catch (error) {
      console.error("Error adding job:", error);
      toast.error("Failed to add job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJobDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      try {
        await deleteDoc(doc(db, "jobs", id));
        toast.success("Job deleted");
        refreshData("jobs");
      } catch (error) {
        console.error("Error deleting job:", error);
        toast.error("Failed to delete job");
      }
    }
  };

  const handleJobStatusToggle = async (job: Job) => {
    try {
      await updateDoc(doc(db, "jobs", job.id!), {
        status: job.status === "Open" ? "Closed" : "Open",
      });
      toast.success(`Job ${job.status === "Open" ? "closed" : "opened"}`);
      refreshData("jobs");
    } catch (error) {
      console.error("Error updating job status:", error);
      toast.error("Failed to update status");
    }
  };

  // ==================== APPLICANT FUNCTIONS ====================
  const handleApplicantSubmit = async () => {
    setIsSubmitting(true);
    try {
      const selectedJob = jobs.find(j => j.id === applicantForm.jobApplied);
      const newApplicant = {
        ...applicantForm,
        jobTitle: selectedJob?.jobTitle,
        applicationDate: new Date().toISOString().split('T')[0],
      };
      await addDoc(collection(db, "applicants"), newApplicant);
      toast.success("Applicant added successfully!");
      setShowAddModal(false);
      resetForm();
      refreshData("applicants");
    } catch (error) {
      console.error("Error adding applicant:", error);
      toast.error("Failed to add applicant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplicantStatusUpdate = async (id: string, status: Applicant["status"]) => {
    try {
      await updateDoc(doc(db, "applicants", id), { status });
      toast.success(`Status updated to ${status}`);
      refreshData("applicants");
    } catch (error) {
      console.error("Error updating applicant status:", error);
      toast.error("Failed to update status");
    }
  };

  // ==================== INTERVIEW FUNCTIONS ====================
  const handleInterviewSubmit = async () => {
    setIsSubmitting(true);
    try {
      const applicant = applicants.find(a => a.id === interviewForm.applicantId);
      if (!applicant) {
        toast.error("Please select an applicant.");
        return;
      }

      const existingScheduledInterview = interviews.find(
        i => i.applicantId === applicant.id && i.status === "Scheduled"
      );

      if (existingScheduledInterview) {
        toast.error(
          "This applicant already has a scheduled interview. Please complete or cancel the existing one first."
        );
        return;
      }

      const selectedDate = new Date(interviewForm.date!);
      const now = new Date();
      if (selectedDate < now) {
        toast.error("Cannot schedule interview in the past.");
        return;
      }

      const job = jobs.find(j => j.id === applicant.jobApplied);
      const newInterview = {
        ...interviewForm,
        applicantName: applicant.name,
        jobId: applicant.jobApplied,
        jobTitle: job?.jobTitle,
      };
      
      await addDoc(collection(db, "interviews"), newInterview);
      await updateDoc(doc(db, "applicants", applicant.id!), { status: "Interview Scheduled" });
      
      toast.success("Interview scheduled successfully!");
      setShowAddModal(false);
      resetForm();
      refreshData(["interviews", "applicants"]);
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast.error("Failed to schedule interview");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterviewUpdate = async () => {
    setIsSubmitting(true);
    try {
      if (!selectedItem?.id) {
        toast.error("No interview selected.");
        return;
      }

      const selectedDate = new Date(interviewForm.date!);
      const now = new Date();
      if (selectedDate < now) {
        toast.error("Cannot set interview to a past date.");
        return;
      }

      const updatedInterview = {
        ...interviewForm,
        applicantName: selectedItem.applicantName,
        jobId: selectedItem.jobId,
        jobTitle: selectedItem.jobTitle,
      };

      await updateDoc(doc(db, "interviews", selectedItem.id), updatedInterview);
      
      toast.success("Interview updated successfully!");
      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();
      refreshData("interviews");
    } catch (error) {
      console.error("Error updating interview:", error);
      toast.error("Failed to update interview");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterviewDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this interview?")) return;
    
    try {
      const interview = interviews.find(i => i.id === id);
      await deleteDoc(doc(db, "interviews", id));
      
      if (interview) {
        await updateDoc(doc(db, "applicants", interview.applicantId), { status: "Shortlisted" });
        toast.success("Interview deleted, applicant reverted to Shortlisted");
      } else {
        toast.success("Interview deleted");
      }
      
      refreshData(["interviews", "applicants"]);
    } catch (error) {
      console.error("Error deleting interview:", error);
      toast.error("Failed to delete interview");
    }
  };

  // ✅ UPDATED: Interview Status Update
  const handleInterviewStatusUpdate = async (id: string, status: Interview["status"]) => {
    try {
      const interview = interviews.find(i => i.id === id);
      await updateDoc(doc(db, "interviews", id), { status });
      
      if (interview) {
        if (status === "Completed") {
          // ✅ When interview is completed, move applicant to Shortlisted (ready for evaluation)
          await updateDoc(doc(db, "applicants", interview.applicantId), { status: "Shortlisted" });
          toast.success("Interview completed! Applicant is now ready for evaluation.");
        } else if (status === "Cancelled") {
          await updateDoc(doc(db, "applicants", interview.applicantId), { status: "Shortlisted" });
          toast.success("Interview cancelled, applicant status reverted to Shortlisted");
        }
      }
      
      refreshData(["interviews", "applicants"]);
    } catch (error) {
      console.error("Error updating interview status:", error);
      toast.error("Failed to update status");
    }
  };

  // ==================== EVALUATION FUNCTIONS ====================
  // ✅ UPDATED: Evaluation Submit
  const handleEvaluationSubmit = async () => {
    setIsSubmitting(true);
    try {
      const applicant = selectedItem;
      if (!applicant) {
        toast.error("Please select an applicant.");
        return;
      }

      const overall = Math.round(
        (evaluationForm.communication! + evaluationForm.technical! + evaluationForm.experience!) / 3
      );
      
      const newEvaluation = {
        ...evaluationForm,
        applicantId: applicant.id,
        applicantName: applicant.name,
        jobId: applicant.jobApplied,
        overall,
        date: new Date().toISOString().split('T')[0],
      };
      
      await addDoc(collection(db, "evaluations"), newEvaluation);
      
      if (evaluationForm.recommendation === "Reject") {
        await updateDoc(doc(db, "applicants", applicant.id!), { status: "Rejected" });
        toast.success("Applicant rejected.");
      } else if (evaluationForm.recommendation === "Hire") {
        // ✅ When recommendation is "Hire", keep as Shortlisted (ready for hiring decision)
        await updateDoc(doc(db, "applicants", applicant.id!), { status: "Shortlisted" });
        toast.success("Evaluation submitted! You can now proceed to Hiring Decision.");
      } else {
        toast.success("Evaluation submitted!");
      }
      
      setShowAddModal(false);
      setSelectedItem(null);
      refreshData(["evaluations", "applicants"]);
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      toast.error("Failed to submit evaluation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== HIRING FUNCTIONS ====================
  // ✅ UPDATED: Hiring Submit with Auto-Employee Creation
  const handleHiringSubmit = async () => {
    setIsSubmitting(true);
    try {
      const applicant = selectedItem;
      if (!applicant) {
        toast.error("Please select an applicant.");
        return;
      }

      if (hasPendingInterview(applicant.id)) {
        toast.error(
          "Cannot hire this applicant. They have a scheduled interview that hasn't been completed yet."
        );
        return;
      }

      const job = jobs.find(j => j.id === applicant.jobApplied);

      // ✅ FIX 1: Linisin ang Data (Nilagyan natin ng fallback para iwas 'undefined' at 'NaN')
      const newHiring = {
        ...hiringForm,
        applicantId: applicant.id || "",
        applicantName: applicant.name || "Unknown Applicant",
        jobId: applicant.jobApplied || "",
        jobTitle: applicant.jobTitle || "N/A", // <-- Ito yung madalas mag-cause ng error
        offerSalary: hiringForm.offerSalary || 0, // <-- Iwas NaN
        decisionDate: new Date().toISOString().split('T')[0],
      };
      await addDoc(collection(db, "hiringDecisions"), newHiring);

      if (hiringForm.decision === "Hired") {
        await updateDoc(doc(db, "applicants", applicant.id!), { status: "Hired" });
        
        // AUTO-GENERATE EMPLOYEE ID 
        const year = new Date().getFullYear();
        const prefix = `EMP-${year}-`;
        
        const idNumbers = employees
          .map(emp => emp.employeeId || "")
          .filter(id => id.startsWith(prefix))
          .map(id => parseInt(id.replace(prefix, ""), 10))
          .filter(num => !isNaN(num));

        const highestId = idNumbers.length > 0 ? Math.max(...idNumbers) : 0;
        const nextNumber = (highestId + 1).toString().padStart(4, '0');
        const generatedEmployeeId = `${prefix}${nextNumber}`;

        // ✅ FIX 2: Linisin din ang Employee Data 
        const newEmployee = {
          name: applicant.name || "Unknown",
          employeeId: generatedEmployeeId,
          department: job?.department || "General",
          jobTitle: applicant.jobTitle || "New Hire",
          email: applicant.email || "", 
          phone: applicant.phone || "", 
          status: "Active",
          hireDate: hiringForm.startDate || new Date().toISOString().split('T')[0],
          basicSalary: hiringForm.offerSalary || 0,
        };
        
        await addDoc(collection(db, "employees"), newEmployee);

        // CREATE TRAINING MODULES
        const trainingModules = [{
          title: `Onboarding: ${applicant.jobTitle || 'New Hire'} Essentials`,
          description: `Welcome! This module covers your core responsibilities as a ${applicant.jobTitle || 'New Hire'}.`,
          status: 'Pending',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          employeeId: generatedEmployeeId,
          link: "https://crimsoncloud-hr.com/training/start"
        }];

        for (const module of trainingModules) {
          await addDoc(collection(db, "trainings"), module);
        }
        
        toast.success(`${applicant.name} has been hired! Employee ID: ${generatedEmployeeId}`);

      } else if (hiringForm.decision === "Rejected") {
        await updateDoc(doc(db, "applicants", applicant.id!), { status: "Rejected" });
        toast.success(`${applicant.name} has been rejected.`);
      } else {
        toast.success(`Decision for ${applicant.name} set to ${hiringForm.decision}.`);
      }

      setShowAddModal(false);
      setSelectedItem(null);
      resetForm();
      refreshData(["hiringDecisions", "applicants", "employees", "trainings"]);
      
    } catch (error) {
      console.error("Error making hiring decision:", error);
      toast.error("Failed to process hiring decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
  const refreshData = async (collections: string | string[]) => {
    const cols = Array.isArray(collections) ? collections : [collections];
    for (const col of cols) {
      const snap = await getDocs(collection(db, col));
      switch (col) {
        case "jobs": setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job))); break;
        case "applicants": setApplicants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Applicant))); break;
        case "interviews": setInterviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Interview))); break;
        case "evaluations": setEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation))); break;
        case "hiringDecisions": 
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HiringDecision));
          setHiringDecisions(data);
          console.log("Refreshed hiringDecisions:", data);
          break;
        case "employees":
          const empData = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeData));
          setEmployees(empData);
          console.log("Refreshed employees:", empData);
          break;
        default: break;
      }
    }
  };

  const resetForm = () => {
    setJobForm(defaultJobForm());
    setApplicantForm({
      name: "",
      email: "",
      phone: "",
      jobApplied: "",
      resumeURL: "",
      status: "Applied",
    });
    setInterviewForm({
      applicantId: "",
      interviewer: "",
      date: "",
      type: "Online",
      notes: "",
      status: "Scheduled",
    });
    setEvaluationForm({
      communication: 5,
      technical: 5,
      experience: 5,
      feedback: "",
      recommendation: "Consider",
    });
    setHiringForm({
      offerSalary: 0,
      startDate: "",
      decision: "Hired",
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Applied: "bg-blue-100 text-blue-700",
      Shortlisted: "bg-purple-100 text-purple-700",
      "Interview Scheduled": "bg-yellow-100 text-yellow-700",
      Rejected: "bg-red-100 text-red-700",
      Hired: "bg-green-100 text-green-700",
      Open: "bg-green-100 text-green-700",
      Closed: "bg-gray-100 text-gray-700",
      Scheduled: "bg-blue-100 text-blue-700",
      Completed: "bg-green-100 text-green-700",
      Cancelled: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-black uppercase tracking-wider ${colors[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>;
  };

  // Filtered data
  const filteredJobs = (jobs || []).filter(j => 
    j.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.department?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(j => !filterStatus || j.status === filterStatus);

  const filteredApplicants = (applicants || []).filter(a =>
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(a => !filterStatus || a.status === filterStatus);

  const filteredInterviews = (interviews || []).filter(i =>
    i.applicantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.interviewer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary Cards Data
  const totalApplicantsCount = applicants.length;
  const openJobsCount = jobs.filter(j => j.status === "Open").length;
  const interviewsScheduledCount = interviews.filter(i => i.status === "Scheduled").length;
  const candidatesHiredCount = applicants.filter(a => a.status === "Hired").length;

  // ==================== RENDER ====================
  return (
    <div className="p-8 space-y-6 bg-[#f8f9fa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] tracking-tight mb-1">Recruitment</h1>
          <p className="text-gray-500 font-medium">
            Manage job postings, applicants, interviews, and hiring decisions
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-[#810100] text-white px-6 py-3 rounded-xl hover:bg-[#630000] transition-colors shadow-md font-bold active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add {activeTab === "Jobs" ? "Job" : activeTab === "Applicants" ? "Applicant" : "New"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Applicants</h3>
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Users className="w-5 h-5" /></div>
          </div>
          <p className="text-4xl font-black text-[#1B1717]">{totalApplicantsCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Open Positions</h3>
            <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><Briefcase className="w-5 h-5" /></div>
          </div>
          <p className="text-4xl font-black text-[#1B1717]">{openJobsCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Upcoming Interviews</h3>
            <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><Calendar className="w-5 h-5" /></div>
          </div>
          <p className="text-4xl font-black text-[#1B1717]">{interviewsScheduledCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-[#810100]/60 uppercase tracking-widest">Hired Candidates</h3>
            <div className="bg-[#fce8e8] text-[#810100] p-2.5 rounded-xl"><CheckCircle className="w-5 h-5" /></div>
          </div>
          <p className="text-4xl font-black text-[#810100]">{candidatesHiredCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-100 px-4 rounded-t-2xl shadow-sm">
        <nav className="flex space-x-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#810100] text-[#810100]"
                  : "border-transparent text-gray-500 hover:text-[#810100] hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-b-2xl shadow-sm mb-6 border border-gray-100 border-t-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input autoComplete="off"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#810100] font-bold text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#810100] font-bold text-sm bg-white"
        >
          <option value="">All Statuses</option>
          {activeTab === "Jobs" && (
            <>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </>
          )}
          {activeTab === "Applicants" && (
            <>
              <option value="Applied">Applied</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </>
          )}
          {activeTab === "Interviews" && (
            <>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </>
          )}
        </select>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#810100]" />
        </div>
      ) : (
        <>
          {/* JOBS TAB */}
          {activeTab === "Jobs" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EDEBDD] border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Job Details</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Salary Matrix</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Date Posted</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1B1717]">{job.jobTitle}</div>
                        <div className="text-xs font-medium text-gray-500 mt-1">{job.department} • {job.employmentType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-green-700">{job.salaryRange}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mt-1">{job.level} Level</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-600">{job.datePosted}</td>
                      <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setSelectedItem(job); setShowViewModal(true); }} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleJobStatusToggle(job)} className="p-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-600 hover:text-white transition-colors" title="Toggle Status (Open/Close)">
                            <Clock className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleJobDelete(job.id!)} className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors" title="Delete Job">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredJobs.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center font-bold text-gray-400 uppercase tracking-widest text-sm">No jobs found. Create a new job posting to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* APPLICANTS TAB */}
          {activeTab === "Applicants" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EDEBDD] border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Name & Contact</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Applied Position</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Applied Date</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredApplicants.map((applicant) => (
                    <tr key={applicant.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1B1717]">{applicant.name}</div>
                        <div className="text-xs font-medium text-gray-500 mt-1">{applicant.email} • {applicant.phone}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#810100]">{applicant.jobTitle}</td>
                      <td className="px-6 py-4 font-bold text-gray-600">{applicant.applicationDate}</td>
                      <td className="px-6 py-4">{getStatusBadge(applicant.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setSelectedItem(applicant); setShowViewModal(true); }} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="View Applicant">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedItem(applicant); setActiveTab("Interviews"); setShowAddModal(true); }} className="p-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-600 hover:text-white transition-colors" title="Schedule Interview">
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedItem(applicant); setActiveTab("Evaluations"); setShowAddModal(true); }} className="p-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-600 hover:text-white transition-colors" title="Evaluate Candidate">
                            <Star className="w-4 h-4" />
                          </button>
                          {/* Make Hiring Decision button - disabled if pending interview */}
                          <button
                            onClick={() => {
                              if (hasPendingInterview(applicant.id!)) {
                                toast.error("Cannot hire: applicant has pending interview(s).");
                                return;
                              }
                              setSelectedItem(applicant);
                              setActiveTab("Hiring");
                              setShowAddModal(true);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              hasPendingInterview(applicant.id!)
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-green-50 text-green-700 hover:bg-green-600 hover:text-white"
                            }`}
                            title={
                              hasPendingInterview(applicant.id!)
                                ? "Cannot hire: pending interview"
                                : "Make Hiring Decision"
                            }
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <select
                            onChange={(e) => handleApplicantStatusUpdate(applicant.id!, e.target.value as Applicant["status"])}
                            className="text-xs border-2 border-gray-100 rounded-lg shadow-sm focus:border-[#810100] outline-none font-bold py-1.5 px-2 bg-white"
                            value={applicant.status}
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interview Scheduled">Interview Scheduled</option>
                            <option value="Hired">Hired</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredApplicants.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center font-bold text-gray-400 uppercase tracking-widest text-sm">No applicants found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* INTERVIEWS TAB */}
          {activeTab === "Interviews" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EDEBDD] border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Applicant & Position</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Schedule Details</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Interviewer</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInterviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                         <div className="font-bold text-[#1B1717]">{interview.applicantName}</div>
                         <div className="text-xs font-medium text-gray-500 mt-1">{interview.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-blue-700">{interview.date.replace('T', ' ')}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{interview.type}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-600">{interview.interviewer}</td>
                      <td className="px-6 py-4">
                        <select
                          value={interview.status}
                          onChange={(e) => handleInterviewStatusUpdate(interview.id!, e.target.value as Interview["status"])}
                          className="text-xs border-2 border-gray-100 rounded-lg shadow-sm focus:border-[#810100] outline-none font-bold py-1.5 px-2 bg-white"
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(interview);
                              setInterviewForm({
                                applicantId: interview.applicantId,
                                interviewer: interview.interviewer,
                                date: interview.date,
                                type: interview.type,
                                notes: interview.notes,
                                status: interview.status,
                              });
                              setShowEditModal(true);
                            }}
                            className="p-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-600 hover:text-white transition-colors"
                            title="Edit Interview"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleInterviewDelete(interview.id!)}
                            className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                            title="Delete Interview"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedItem(interview); setShowViewModal(true); }}
                            className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInterviews.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center font-bold text-gray-400 uppercase tracking-widest text-sm">No interviews scheduled yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* EVALUATIONS TAB */}
          {activeTab === "Evaluations" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                 <thead className="bg-[#EDEBDD] border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Applicant</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Interviewer</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest text-center">Overall Score</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Recommendation</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {evaluations.map((evalItem) => (
                    <tr key={evalItem.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1B1717]">{evalItem.applicantName}</div>
                        <div className="text-xs font-medium text-gray-500 mt-1">{evalItem.date}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-600">{evalItem.interviewer}</td>
                      <td className="px-6 py-4 text-center">
                         <span className="bg-[#810100] text-white px-3 py-1 rounded-full font-black">{evalItem.overall}/10</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          evalItem.recommendation === "Hire" ? "bg-green-100 text-green-700" :
                          evalItem.recommendation === "Consider" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {evalItem.recommendation}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => { setSelectedItem(evalItem); setShowViewModal(true); }} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {evaluations.length === 0 && (
                     <tr><td colSpan={5} className="px-6 py-16 text-center font-bold text-gray-400 uppercase tracking-widest text-sm">No evaluations recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* HIRING DECISIONS TAB */}
          {activeTab === "Hiring" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EDEBDD] border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Applicant & Position</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Offer Salary</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Start Date</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-600 tracking-widest">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hiringDecisions.map((decision) => (
                    <tr key={decision.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1B1717]">{decision.applicantName}</div>
                        <div className="text-xs font-medium text-gray-500 mt-1">{decision.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-green-700">₱{decision.offerSalary?.toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-gray-600">{decision.startDate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          decision.decision === "Hired" ? "bg-green-100 text-green-700" :
                          decision.decision === "Rejected" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {decision.decision}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {hiringDecisions.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-16 text-center font-bold text-gray-400 uppercase tracking-widest text-sm">No hiring decisions recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 bg-[#810100] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">
                {activeTab === "Jobs" ? "Create Job Posting" : 
                 activeTab === "Applicants" ? "Add Applicant" : 
                 activeTab === "Interviews" ? "Schedule Interview" : 
                 activeTab === "Evaluations" ? "Evaluate Candidate" : "Record Hiring Decision"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-white">
              {/* Job Form */}
              {activeTab === "Jobs" && (
                <div className="grid grid-cols-2 gap-5">
                  
                  {/* DEPARTMENT SELECTOR */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Department *</label>
                    <select
                      value={jobForm.department}
                      onChange={(e) => {
                        const dept = e.target.value;
                        const lvl = jobForm.level || "Entry";
                        setJobForm(withJobTemplate({ 
                          ...jobForm, 
                          department: dept, 
                          jobTitle: departmentRoles[dept][0],
                          salaryRange: salaryGuide[dept][lvl] 
                        }, jobForm));
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                    >
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* DYNAMIC JOB TITLE SELECTOR */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Specific Role / Position *</label>
                    <select
                      value={jobForm.jobTitle}
                      onChange={(e) => setJobForm(withJobTemplate({ ...jobForm, jobTitle: e.target.value }, jobForm))}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                    >
                      {departmentRoles[jobForm.department || departments[0]].map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  {/* LEVEL SELECTOR */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Level *</label>
                    <select
                      value={jobForm.level}
                      onChange={(e) => {
                        const lvl = e.target.value as "Entry" | "Mid" | "Senior";
                        const dept = jobForm.department || departments[0];
                        setJobForm(withJobTemplate({ ...jobForm, level: lvl, salaryRange: salaryGuide[dept][lvl] }, jobForm));
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                    >
                      <option value="Entry">Entry Level</option>
                      <option value="Mid">Mid Level</option>
                      <option value="Senior">Senior Level</option>
                    </select>
                  </div>

                  {/* AUTO-FILLED SALARY RANGE */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-[#810100] uppercase tracking-widest mb-1">Base Salary Range (Matrix)</label>
                    <div className="w-full px-4 py-3 bg-[#fce8e8] border border-[#810100]/20 rounded-xl font-black text-sm text-[#810100]">
                      {jobForm.salaryRange}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Employment Type *</label>
                    <select
                      value={jobForm.employmentType}
                      onChange={(e) => setJobForm(withJobTemplate({ ...jobForm, employmentType: e.target.value as any }, jobForm))}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                   <div className="col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Job Description *</label>
                      <button type="button" onClick={() => setJobForm({ ...jobForm, description: jobTemplateText(jobForm).description })} className="text-[10px] font-black text-[#810100] uppercase tracking-widest hover:underline">↻ Regenerate</button>
                    </div>
                    <textarea
                      rows={7}
                      value={jobForm.description}
                      onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-medium text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Requirements *</label>
                      <button type="button" onClick={() => setJobForm({ ...jobForm, requirements: jobTemplateText(jobForm).requirements })} className="text-[10px] font-black text-[#810100] uppercase tracking-widest hover:underline">↻ Regenerate</button>
                    </div>
                    <textarea
                      rows={7}
                      value={jobForm.requirements}
                      onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-medium text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Applicant Form */}
              {activeTab === "Applicants" && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Applicant Name *</label>
                    <input autoComplete="off"
                      type="text"
                      value={applicantForm.name}
                      onChange={(e) => setApplicantForm({ ...applicantForm, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Email *</label>
                    <input autoComplete="off"
                      type="email"
                      value={applicantForm.email}
                      onChange={(e) => setApplicantForm({ ...applicantForm, email: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Phone Number *</label>
                    <input autoComplete="off"
                      type="tel"
                      value={applicantForm.phone}
                      onChange={(e) => setApplicantForm({ ...applicantForm, phone: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Applied Position *</label>
                    <select
                      value={applicantForm.jobApplied}
                      onChange={(e) => setApplicantForm({ ...applicantForm, jobApplied: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                    >
                      <option value="">Select a Job Position</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.jobTitle} - {job.level}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                     <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Resume Link (PDF/DOCX URL) *</label>
                    <input autoComplete="off"
                      type="url"
                      value={applicantForm.resumeURL}
                      onChange={(e) => setApplicantForm({ ...applicantForm, resumeURL: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                      placeholder="Link to Drive or Storage"
                    />
                  </div>
                </div>
              )}

              {/* Interview Form */}
              {activeTab === "Interviews" && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Applicant *</label>
                    <select
                      value={interviewForm.applicantId}
                      onChange={(e) => {
                        const applicant = applicants.find(a => a.id === e.target.value);
                        setInterviewForm({ 
                          ...interviewForm, 
                          applicantId: e.target.value,
                          applicantName: applicant?.name || "",
                          jobId: applicant?.jobApplied || "",
                          jobTitle: applicant?.jobTitle || ""
                        });
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                      required
                    >
                      <option value="">Select an Applicant</option>
                      {applicants
                        .filter(applicant => {
                          const hasScheduledInterview = interviews.some(
                            i => i.applicantId === applicant.id && i.status === "Scheduled"
                          );
                          return !hasScheduledInterview;
                        })
                        .map(applicant => (
                          <option key={applicant.id} value={applicant.id}>
                            {applicant.name} - {applicant.jobTitle} ({applicant.status})
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      * Only applicants without scheduled interviews are shown.
                    </p>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interviewer Name *</label>
                    <input autoComplete="off"
                      type="text"
                      value={interviewForm.interviewer}
                      onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interview Date & Time *</label>
                    <input autoComplete="off"
                      type="datetime-local"
                      value={interviewForm.date}
                      onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interview Type *</label>
                    <select
                      value={interviewForm.type}
                      onChange={(e) => setInterviewForm({ ...interviewForm, type: e.target.value as any })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                    >
                      <option value="Online">Online</option>
                      <option value="Onsite">On-site</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Notes</label>
                    <textarea
                      rows={3}
                      value={interviewForm.notes}
                      onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-medium text-sm"
                      placeholder="Meeting link or office instructions..."
                    />
                  </div>
                </div>
              )}

              {/* Evaluation Form */}
              {activeTab === "Evaluations" && (
                <div className="space-y-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Applicant *</label>
                    <select
                      value={selectedItem?.id || ""}
                      onChange={(e) => {
                        const applicant = applicants.find(a => a.id === e.target.value);
                        setSelectedItem(applicant);
                        setEvaluationForm({ 
                          ...evaluationForm, 
                          applicantId: e.target.value,
                          applicantName: applicant?.name || "",
                          jobId: applicant?.jobApplied || ""
                        });
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                      required
                    >
                      <option value="">Select an Applicant</option>
                      {applicants.map(applicant => (
                        <option key={applicant.id} value={applicant.id}>
                          {applicant.name} - {applicant.jobTitle} ({applicant.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedItem && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Evaluating Candidate</p>
                        <p className="font-black text-xl text-[#1B1717]">{selectedItem.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 border-2 border-gray-100 rounded-xl">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Communication</label>
                      <div className="flex items-center gap-3">
                         <input autoComplete="off" type="range" min="1" max="10" value={evaluationForm.communication} onChange={(e) => setEvaluationForm({ ...evaluationForm, communication: parseInt(e.target.value) })} className="w-full accent-[#810100]"/>
                         <span className="font-black text-lg w-6 text-center">{evaluationForm.communication}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Technical Skills</label>
                      <div className="flex items-center gap-3">
                         <input autoComplete="off" type="range" min="1" max="10" value={evaluationForm.technical} onChange={(e) => setEvaluationForm({ ...evaluationForm, technical: parseInt(e.target.value) })} className="w-full accent-[#810100]"/>
                         <span className="font-black text-lg w-6 text-center">{evaluationForm.technical}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Experience</label>
                      <div className="flex items-center gap-3">
                         <input autoComplete="off" type="range" min="1" max="10" value={evaluationForm.experience} onChange={(e) => setEvaluationForm({ ...evaluationForm, experience: parseInt(e.target.value) })} className="w-full accent-[#810100]"/>
                         <span className="font-black text-lg w-6 text-center">{evaluationForm.experience}</span>
                      </div>
                    </div>
                  </div>

                   <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interviewer Name</label>
                    <input autoComplete="off"
                      type="text"
                      value={evaluationForm.interviewer}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, interviewer: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Comments</label>
                    <textarea
                      rows={3}
                      value={evaluationForm.feedback}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-medium text-sm"
                      placeholder="Provide detailed feedback about the candidate..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Recommendation *</label>
                    <select
                      value={evaluationForm.recommendation}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, recommendation: e.target.value as any })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                    >
                      <option value="Hire">Hire</option>
                      <option value="Consider">Consider</option>
                      <option value="Reject">Reject</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Hiring Form */}
              {activeTab === "Hiring" && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Applicant *</label>
                    <select
                      value={selectedItem?.id || ""}
                      onChange={(e) => {
                        const applicant = applicants.find(a => a.id === e.target.value);
                        setSelectedItem(applicant);
                        setHiringForm({ 
                          ...hiringForm, 
                          applicantId: e.target.value,
                          applicantName: applicant?.name || "",
                          jobId: applicant?.jobApplied || "",
                          jobTitle: applicant?.jobTitle || ""
                        });
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                      required
                    >
                      <option value="">Select an Applicant</option>
                      {applicants
                        .filter(a => !hasPendingInterview(a.id!))
                        .map(applicant => (
                          <option key={applicant.id} value={applicant.id}>
                            {applicant.name} - {applicant.jobTitle} ({applicant.status})
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      * Only applicants without pending interviews are shown.
                    </p>
                  </div>

                  {selectedItem && (
                    <div className="col-span-2 bg-[#fce8e8] p-5 rounded-xl border border-[#810100]/20 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-[#810100]/70 uppercase tracking-widest mb-1">Final Decision For</p>
                        <p className="font-black text-xl text-[#1B1717]">{selectedItem.name}</p>
                        <p className="text-sm font-bold text-[#810100]">{selectedItem.jobTitle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-[#810100]/70 uppercase tracking-widest mb-1">Budget Matrix</p>
                        <p className="font-black text-lg text-[#1B1717]">
                          {jobs.find(j => j.id === selectedItem.jobApplied)?.salaryRange || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Offer Salary (PHP) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                      <input autoComplete="off"
                        type="number"
                        value={hiringForm.offerSalary}
                        onChange={(e) => setHiringForm({ ...hiringForm, offerSalary: parseInt(e.target.value) || 0 })}
                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Start Date *</label>
                    <input autoComplete="off"
                      type="date"
                      value={hiringForm.startDate}
                      onChange={(e) => setHiringForm({ ...hiringForm, startDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Decision Status *</label>
                    <select
                      value={hiringForm.decision}
                      onChange={(e) => setHiringForm({ ...hiringForm, decision: e.target.value as any })}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                    >
                      <option value="Hired">Hired</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl mt-auto">
              <button onClick={() => setShowAddModal(false)} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (activeTab === "Jobs") handleJobSubmit();
                  else if (activeTab === "Applicants") handleApplicantSubmit();
                  else if (activeTab === "Interviews") handleInterviewSubmit();
                  else if (activeTab === "Evaluations") handleEvaluationSubmit();
                  else if (activeTab === "Hiring") handleHiringSubmit();
                }}
                disabled={isSubmitting}
                className="px-6 py-3 bg-[#810100] text-white font-black rounded-xl hover:bg-[#630000] transition-transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save Record"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL for Interviews */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 bg-[#810100] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">Edit Interview</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedItem(null); resetForm(); }} className="hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-white">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Applicant</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm">
                    {selectedItem.applicantName} - {selectedItem.jobTitle}
                  </div>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interviewer Name *</label>
                  <input autoComplete="off"
                    type="text"
                    value={interviewForm.interviewer}
                    onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interview Date & Time *</label>
                  <input autoComplete="off"
                    type="datetime-local"
                    value={interviewForm.date}
                    onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interview Type *</label>
                  <select
                    value={interviewForm.type}
                    onChange={(e) => setInterviewForm({ ...interviewForm, type: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                  >
                    <option value="Online">Online</option>
                    <option value="Onsite">On-site</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={interviewForm.notes}
                    onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-medium text-sm"
                    placeholder="Meeting link or office instructions..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</label>
                  <select
                    value={interviewForm.status}
                    onChange={(e) => setInterviewForm({ ...interviewForm, status: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm bg-white"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
              <button onClick={() => { setShowEditModal(false); setSelectedItem(null); resetForm(); }} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleInterviewUpdate}
                disabled={isSubmitting}
                className="px-6 py-3 bg-[#810100] text-white font-black rounded-xl hover:bg-[#630000] transition-transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                  </span>
                ) : (
                  "Update Interview"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
             <div className="flex items-center justify-between p-6 bg-[#810100] text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">
                {activeTab === "Jobs" ? "Job Details" : 
                 activeTab === "Interviews" ? "Interview Details" : 
                 activeTab === "Evaluations" ? "Evaluation Details" : "Record Details"}
              </h3>
              <button onClick={() => setShowViewModal(false)} className="hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="space-y-6">
                {/* JOBS VIEW */}
                {activeTab === "Jobs" && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h4 className="text-lg font-black text-[#1B1717] mb-4">Job Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Job Title</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.jobTitle}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Department</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.department}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Level</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.level} Level</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Employment Type</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.employmentType}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Salary Range</span>
                          <span className="text-sm font-medium text-green-700">{selectedItem.salaryRange}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${selectedItem.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {selectedItem.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Date Posted</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.datePosted}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h4 className="text-lg font-black text-[#1B1717] mb-4">Job Description</h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedItem.description}</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h4 className="text-lg font-black text-[#1B1717] mb-4">Requirements</h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedItem.requirements}</p>
                    </div>
                  </div>
                )}

                {/* INTERVIEWS VIEW */}
                {activeTab === "Interviews" && (
                  <div className="space-y-6">
                    {/* Find applicant details */}
                    {(() => {
                      const applicant = applicants.find(a => a.id === selectedItem.applicantId);
                      return applicant ? (
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                          <h4 className="text-lg font-black text-[#1B1717] mb-4">Applicant Information</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Name</span>
                              <span className="text-sm font-medium text-[#1B1717]">{applicant.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Email</span>
                              <span className="text-sm font-medium text-[#1B1717]">{applicant.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Phone</span>
                              <span className="text-sm font-medium text-[#1B1717]">{applicant.phone}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Position Applied</span>
                              <span className="text-sm font-medium text-[#1B1717]">{applicant.jobTitle}</span>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h4 className="text-lg font-black text-[#1B1717] mb-4">Interview Details</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Applicant</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.applicantName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Position</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.jobTitle}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Interviewer</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.interviewer}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Date & Time</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.date.replace('T', ' ')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Type</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.type}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${selectedItem.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : selectedItem.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedItem.status}
                          </span>
                        </div>
                        {selectedItem.notes && (
                          <div className="mt-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">Notes</span>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border">{selectedItem.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* EVALUATIONS VIEW */}
                {activeTab === "Evaluations" && (
                  <div className="space-y-6">
                    {/* Find applicant details */}
                    {(() => {
                      const applicant = applicants.find(a => a.id === selectedItem.applicantId);
                      return applicant ? (
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                          <h4 className="text-lg font-black text-[#1B1717] mb-4">Applicant Information</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Name</span>
                              <span className="text-sm font-medium text-[#1B1717]">{applicant.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Email</span>
                              <span className="text-sm font-medium text-[#1B1717]">{applicant.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Phone</span>
                              <span className="text-sm font-medium text-[#1B1717]">{applicant.phone}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Position</span>
                              <span className="text-sm font-medium text-[#1B1717]">{applicant.jobTitle}</span>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h4 className="text-lg font-black text-[#1B1717] mb-4">Evaluation Details</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Applicant</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.applicantName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Interviewer</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.interviewer}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Date</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.date}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="text-center">
                            <div className="text-2xl font-black text-blue-600">{selectedItem.communication}/10</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Communication</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-green-600">{selectedItem.technical}/10</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Technical</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-purple-600">{selectedItem.experience}/10</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Experience</div>
                          </div>
                        </div>
                        <div className="flex justify-center mt-4">
                          <div className="text-center">
                            <div className="text-3xl font-black text-[#810100]">{selectedItem.overall}/10</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Score</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Recommendation</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${selectedItem.recommendation === 'Hire' ? 'bg-green-100 text-green-700' : selectedItem.recommendation === 'Consider' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedItem.recommendation}
                          </span>
                        </div>
                        {selectedItem.feedback && (
                          <div className="mt-4">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">Feedback</span>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border">{selectedItem.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* APPLICANTS VIEW - Keep existing */}
                {activeTab === "Applicants" && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h4 className="text-lg font-black text-[#1B1717] mb-4">Personal Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Name</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Email</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Phone</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.phone}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h4 className="text-lg font-black text-[#1B1717] mb-4">Application Details</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Position Applied</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.jobTitle}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Application Date</span>
                          <span className="text-sm font-medium text-[#1B1717]">{selectedItem.applicationDate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${selectedItem.status === 'Applied' ? 'bg-blue-100 text-blue-700' : selectedItem.status === 'Shortlisted' ? 'bg-purple-100 text-purple-700' : selectedItem.status === 'Interview Scheduled' ? 'bg-yellow-100 text-yellow-700' : selectedItem.status === 'Hired' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedItem.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Resume</span>
                          <a href={selectedItem.resumeURL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#810100] hover:text-[#630000] underline">View Resume</a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
             <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setShowViewModal(false)} className="px-6 py-3 bg-[#1B1717] text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-black transition-colors shadow-md">
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}