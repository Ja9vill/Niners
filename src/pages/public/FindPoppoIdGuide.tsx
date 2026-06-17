import React, { useEffect, useState } from 'react';
import { useSEO } from '../../hooks/useSEO';
import { FirebaseService } from '../../lib/firebaseService';
import { Search, CheckCircle } from 'lucide-react';

export const FindPoppoIdGuide = () => {
  const [assets, setAssets] = useState<Record<string, string>>({});

  useSEO({
    title: 'How to Find Your Poppo ID | Nine Dashboard',
    description: 'A quick guide on locating your unique numeric Poppo ID for registration and login purposes.'
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
            <Search size={14} />
            Official Guide
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Poppo ID</span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            Your Poppo ID is a unique numeric identifier used for your Nine Dashboard login and payroll tracking.
          </p>
        </div>

        <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 sm:p-12 shadow-[0_0_20px_rgba(212,175,55,0.1)] prose prose-invert max-w-none">
          
          <div className="space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#D4AF37]" /> Open Your Profile
              </h3>
              <p className="text-[#A09E9A] text-sm">
                Open the Poppo Live app and navigate to your profile tab on the bottom right corner. Underneath your display name and profile picture, you will see an "ID:" followed by an 8 or 9 digit number.
              </p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#D4AF37]" /> Copy the ID
              </h3>
              <p className="text-[#A09E9A] text-sm mb-4">
                You can tap the small "copy" icon next to the number to copy it directly to your clipboard.
              </p>
              {assets['poppo_id_location'] ? (
                <img src={assets['poppo_id_location']} alt="Poppo ID Location" className="w-full max-w-md rounded-xl border border-white/10 mt-2" />
              ) : (
                <div className="w-full max-w-md aspect-video bg-black/40 border border-dashed border-[#D4AF37]/50 rounded-2xl flex items-center justify-center text-[#D4AF37]/50 mt-4">
                  <span className="text-sm font-bold uppercase tracking-widest">Pending Asset Upload</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
