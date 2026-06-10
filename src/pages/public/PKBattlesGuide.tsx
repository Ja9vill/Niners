import React, { useEffect, useState } from 'react';
import { useSEO } from '../../hooks/useSEO';
import { FirebaseService } from '../../lib/firebaseService';
import { Swords } from 'lucide-react';

export const PKBattlesGuide = () => {
  const [assets, setAssets] = useState<Record<string, string>>({});

  useSEO({
    title: 'How PK Battles Work | Nine Dashboard',
    description: 'Learn how to initiate and win PK Battles on Poppo Live to increase your earnings and engagement.'
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
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <Swords size={14} />
            Official Guide
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Mastering <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">PK Battles</span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            Everything you need to know about PK (Player Kill) Battles on Poppo Live.
          </p>
        </div>

        <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 sm:p-12 shadow-[0_0_20px_rgba(212,175,55,0.1)] prose prose-invert max-w-none">
          {assets['pk_battles_banner'] && (
            <img src={assets['pk_battles_banner']} alt="PK Battles Banner" className="w-full h-auto rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(212,175,55,0.1)] mb-8" />
          )}

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">What is a PK Battle?</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            A PK (Player Kill) Battle is a competitive feature where two hosts stream side-by-side. Viewers send gifts to their favorite host, and the host with the most gift points at the end of the timer (usually 5-10 minutes) wins the battle.
          </p>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">Types of PKs</h2>
          <ul className="list-disc list-inside text-[#A09E9A] leading-relaxed space-y-2 mb-8">
            <li><strong>Random PK:</strong> The system matches you with a random host of similar level. This is a great way to meet new viewers.</li>
            <li><strong>Friendly PK:</strong> You invite a friend or agency teammate to battle.</li>
            <li><strong>Official Event PK:</strong> Scheduled battles arranged by the agency or official platform with specific rewards.</li>
          </ul>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">How to Win</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            Engage your audience! Count down the timer, thank gifters enthusiastically, and set a fun "punishment" for the loser (e.g., drawing on their face, doing a dance) to incentivize your gifters to push you to victory.
          </p>
        </div>
      </div>
    </div>
  );
};
