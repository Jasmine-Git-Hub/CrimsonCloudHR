import React, { useState } from 'react';
import { UserCheck, Lock, Mail, BadgeInfo, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { auth, db } from '../../config/firebaseSetup'; // I-adjust ang path kung kailangan
import { createUserWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc, limit } from 'firebase/firestore';

export default function ClaimAccount({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [step, setStep] = useState(1); // Step 1: Verify, Step 2: Set Password, Step 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form Data
  const [formData, setFormData] = useState({
    email: '',
    employeeId: '',
    password: '',
    confirmPassword: ''
  });

  // Employee Data from Firestore (pag na-verify na)
  const [verifiedEmployee, setVerifiedEmployee] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error pag nagta-type
  };

  // 🟢 STEP 1: Basic checks only. The real match against the "employees"
  // record happens AFTER sign-up (step 2), because reading employees while
  // logged out would require that collection to be public.
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^EMP-\d{4}-\d{4}$/i.test(formData.employeeId.trim())) {
      setError("Employee ID format should look like EMP-2026-0001.");
      return;
    }
    setStep(2);
  };

  // 🟢 STEP 2: Create Auth account → verify against employees → link profile
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError('');
    const email = formData.email.trim().toLowerCase();
    const employeeId = formData.employeeId.trim().toUpperCase();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      const user = userCredential.user;

      // Rules allow reading an employees doc only when its email == your login email.
      const snap = await getDocs(query(
        collection(db, "employees"),
        where("email", "==", email),
        where("employeeId", "==", employeeId),
        limit(1)
      ));

      if (snap.empty) {
        await deleteUser(user); // don't leave orphan Auth accounts behind
        setError("We couldn't find a record matching this Email and Employee ID. Please check with HR.");
        setStep(1);
        return;
      }

      const empDoc = snap.docs[0];
      const empData = empDoc.data();
      setVerifiedEmployee(empData);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email,
        name: empData.name,
        employeeId: empData.employeeId,
        employeeDocId: empDoc.id, // firestore.rules uses this to verify the link
        position: empData.jobTitle, // 🔥 ITO YUNG MAHALAGA PARA SA TRAINING PAGE
        department: empData.department,
        role: "employee",
        status: "Enabled",
        createdAt: new Date().toISOString()
      });

      await signOut(auth); // they still have to log in (and pass OTP) normally
      setStep(3);

    } catch (err: any) {
      console.error("Account creation error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("An account already exists for this email. Please try logging in.");
      } else {
        setError("Failed to create account. Please try again or contact HR.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-in fade-in zoom-in duration-300">
      
      {/* ── Header ── */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#fce8e8] text-[#810100] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          {step === 3 ? <CheckCircle className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
        </div>
        <h2 className="text-2xl font-black text-[#1B1717] uppercase tracking-tight">
          {step === 1 ? 'Claim Your Account' : step === 2 ? 'Set Your Password' : 'Account Ready!'}
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          {step === 1 ? 'Enter your details provided by HR.' : step === 2 ? `Choose a password for ${formData.email}` : 'You can now log in to the portal.'}
        </p>
      </div>

      {/* ── Error Message ── */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-100 text-center">
          {error}
        </div>
      )}

      {/* ── STEP 1: Verify Form ── */}
      {step === 1 && (
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Company Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm text-[#1B1717]"
                placeholder="you@company.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Employee ID</label>
            <div className="relative">
              <BadgeInfo className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm text-[#1B1717] uppercase"
                placeholder="EMP-2026-XXXX"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#810100] text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-[#630000] transition-colors shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'} 
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      )}

      {/* ── STEP 2: Set Password Form ── */}
      {step === 2 && (
        <form onSubmit={handleCreateAccount} className="space-y-5">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Employee ID</p>
            <p className="font-bold text-[#1B1717]">{formData.employeeId.toUpperCase()}</p>
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Create Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm text-[#1B1717]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#810100] outline-none font-bold text-sm text-[#1B1717]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#810100] text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-[#630000] transition-colors shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Setup'}
          </button>
        </form>
      )}

      {/* ── STEP 3: Success ── */}
      {step === 3 && (
        <div className="text-center space-y-6">
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-bold">
            Your account has been successfully created and linked to your employee profile!
          </div>
          <button
            onClick={onBackToLogin}
            className="w-full py-3.5 bg-[#1B1717] text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-black transition-colors shadow-lg"
          >
            Go to Login Page
          </button>
        </div>
      )}

      {/* ── Footer Link ── */}
      {step !== 3 && (
        <div className="mt-8 text-center">
          <button 
            onClick={onBackToLogin}
            className="text-[11px] font-black text-gray-400 hover:text-[#810100] transition-colors uppercase tracking-widest"
          >
            Cancel & Return to Login
          </button>
        </div>
      )}
    </div>
  );
}