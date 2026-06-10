import React, { useEffect, useState } from 'react';
import { useSEO } from '../../hooks/useSEO';
import { FirebaseService } from '../../lib/firebaseService';
import { Users, CheckCircle } from 'lucide-react';

export const AgentRegistrationGuide = () => {
  const [assets, setAssets] = useState<Record<string, string>>({});

  useSEO({
    title: 'How to Register as an Agent | Nine Dashboard',
    description: 'A complete guide to registering your own Poppo Live agency under Nine Dashboard.'
  });

  useEffect(() => {
    const fetchAssets = async () => {
      const data = await FirebaseService.getPublicPageAssets();
      const map: Record<string, string> = {};
      data.forEach(a => { map[a.slotId] = a.imageUrl; });
      setAssets(map);
    };
    fetchAssets();
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center px-4 pt-4 pb-24 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <Users size={14} />
            Official Guide
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Agent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Registration</span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            Build your own team and start earning commission by becoming a registered Poppo Live Agent.
          </p>
        </div>

        <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 sm:p-12 shadow-[0_0_20px_rgba(212,175,55,0.1)] prose prose-invert max-w-none">
          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">Why Become an Agent?</h2>
          <ul className="list-disc list-inside text-[#A09E9A] leading-relaxed space-y-2 mb-8">
            <li><strong className="text-white">Passive Income:</strong> Earn a percentage of your recruits' earnings.</li>
            <li><strong className="text-white">Team Building:</strong> Build a supportive community of hosts.</li>
            <li><strong className="text-white">Growth:</strong> Access to exclusive agency events and rewards.</li>
          </ul>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">Step-by-Step Registration</h2>
          
          <div className="space-y-6 mt-6">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#D4AF37]" /> Step 1: Open the Portal
              </h3>
              <p className="text-[#A09E9A] text-sm">
                Click our <a href="https://invite-poppo.com/6CxF5E" target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:underline">Official Registration Link</a> to access the fast-track agency portal.
              </p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#D4AF37]" /> Step 2: Bind Phone Number
              </h3>
              <p className="text-[#A09E9A] text-sm mb-4">
                Enter your phone number and verify it using the SMS OTP code sent to your device.
              </p>
              {assets['agent_registration_proof'] && (
                <img src={assets['agent_registration_proof']} alt="Registration Portal" className="w-full max-w-md rounded-xl border border-white/10 mt-2" />
              )}
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#D4AF37]" /> Step 3: Confirmation
              </h3>
              <p className="text-[#A09E9A] text-sm">
                Once verified, your agency dashboard will be activated immediately. You can now start generating your own invitation links to recruit hosts!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
