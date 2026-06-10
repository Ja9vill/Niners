import React from 'react';
import { useSEO } from '../../hooks/useSEO';
import { LogIn, CheckCircle } from 'lucide-react';

export const LoginSetup = () => {
  useSEO({
    title: 'Login Setup Guide | Nine Dashboard',
    description: 'How to login to Nine Dashboard securely using your Poppo ID and password.'
  });

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center px-4 pt-4 pb-24 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <LogIn size={14} />
            Official Guide
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Login Setup</span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            Learn how to access your Nine Agency dashboard using your provided credentials.
          </p>
        </div>

        <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 sm:p-12 shadow-[0_0_20px_rgba(212,175,55,0.1)] prose prose-invert max-w-none">
          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">Your Credentials</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            When you join Nine Agency, your manager will provide you with a temporary password and register your Poppo ID in our system. You will use your Poppo ID as your username.
          </p>

          <div className="space-y-6 mt-6">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#D4AF37]" /> Step 1: Access Login Page
              </h3>
              <p className="text-[#A09E9A] text-sm">
                Navigate to the <a href="/login" className="text-[#D4AF37] hover:underline">Login Page</a> via the top right corner of the website.
              </p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#D4AF37]" /> Step 2: Enter Details
              </h3>
              <p className="text-[#A09E9A] text-sm">
                Enter your numeric <strong>Poppo ID</strong> and your temporary password. Once logged in, you will be prompted to change your password for security purposes.
              </p>
            </div>
            
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#D4AF37]" /> Step 3: Forgotten Passwords
              </h3>
              <p className="text-[#A09E9A] text-sm">
                If you forget your password, click "Forgot Password" on the login screen. It will send a reset request directly to the Director's Operations dashboard to issue you a new temporary password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
