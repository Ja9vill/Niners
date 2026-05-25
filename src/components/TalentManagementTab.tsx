import React, { useState } from 'react';
import { BookOpen, HelpCircle, FileText, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

export const TalentManagementTab = () => {
  const [loading, setLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      });

      const data = await response.json();
      setAuthMsg(`Authentication Verified: Logged in as ${data.email || result.user.email || "user"}`);
    } catch (error: any) {
      setAuthMsg(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAuthMsg("Logged out");
  };

  const glossaries = [
    { term: 'DATA MASTERSHEET', desc: 'The absolute master document representing total registered anchors, tier allocations, managers, levels, status lists, and financial references.' },
    { term: 'ROSTER REPORTING', desc: 'The reporting and submission log workbook comprising the five official operational templates, logs, and authorized personnel directory.' },
    { term: 'FINANCIAL DATA SHEET', desc: 'The audited ledger that manages cumulative historical outcomes, payouts, platform commission calculations, and Super Salaries.' },
    { term: 'Role Model Ratio', desc: 'A custom frontend representation of user performance. Calculated as a lifetime attendance percentage derived from Exposure Reporting event entries.' },
    { term: 'Base Salary', desc: 'An underlying level-dependent policy structure categorized into Star Host, S Idol, Esports Host or Rocket styles.' }
  ];

  const sourceSpecs = [
    { name: 'DATA MASTERSHEET', usage: 'Source of truth for profile biography, PK, exposure history, and overall roster status lists.' },
    { name: 'ROSTER REPORTING', usage: 'Grounds recent updates, submission logs, direct note historical logs, and the five operational forms.' },
    { name: 'FINANCIAL DATA SHEET', usage: 'Holds exclusive month-over-month ledger entries, commissions rates, super ranks, and platform hour multipliers.' }
  ];

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Nine Talent Management</h2>
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          Official Operations Directory, Resource Lexicon & Sheet-Backed Grounding Specifications.
        </p>
      </div>

      {/* Grounding Source Rules */}
      <section className="space-y-6">
        <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2">
          <FileText size={14} className="text-indigo-400" />
          I. Approved Spreadsheets Grounding
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sourceSpecs.map((spec, i) => (
            <div key={i} className="glass border-white/5 p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[60px] rounded-full group-hover:bg-indigo-500/10 transition-colors" />
              <h4 className="font-bold text-white text-md tracking-tight">{spec.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-2">{spec.usage}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lexicon / Glossary */}
      <section className="space-y-6">
        <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2">
          <BookOpen size={14} className="text-indigo-400" />
          II. Lexicon & Operational Glossary
        </h3>
        <div className="glass-card divide-y divide-white/5 p-2 overflow-hidden">
          {glossaries.map((g, i) => (
            <div key={i} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8 hover:bg-white/5 transition-all">
              <div className="sm:w-1/4 font-black font-mono text-xs uppercase text-indigo-400 tracking-wider">
                {g.term}
              </div>
              <div className="sm:flex-1 text-slate-300 text-xs leading-relaxed">
                {g.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Auth Verification Bypass Tools */}
      <section className="space-y-6">
        <div className="p-6 bg-[#161a29]/50 border border-indigo-500/20 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 md:max-w-md">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Key size={14} className="text-indigo-400" />
              III. Firebase OAuth Integration Portal
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Required for synchronizing financial data sheets from Google Drive. Authorized accounts can use the prompt login window to request credentials cache.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-indigo-500 transition-all active:scale-95 flex items-center gap-1"
            >
              {loading ? 'Opening popup...' : 'Sign in with Google'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-all active:scale-95"
            >
              Disconnect Token
            </button>
          </div>
        </div>
        {authMsg && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 font-mono text-xs text-center animate-fade-in">
            {authMsg}
          </div>
        )}
      </section>
    </div>
  );
};
