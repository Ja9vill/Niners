import React, { useEffect, useState } from 'react';
import { useSEO } from '../../hooks/useSEO';
import { FirebaseService } from '../../lib/firebaseService';
import { DollarSign, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { PublicPageAsset } from '../../types';

export const WithdrawGuide = () => {
  const [assets, setAssets] = useState<Record<string, string>>({});

  useSEO({
    title: 'How to Withdraw Earnings on Poppo | Nine Dashboard',
    description: 'A step-by-step guide to binding Epay/Payoneer and withdrawing your points into real cash.'
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

  const AssetPlaceholder = ({ slotId, label }: { slotId: string, label: string }) => {
    if (assets[slotId]) {
      return <img src={assets[slotId]} alt={label} className="w-full h-auto rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(212,175,55,0.1)] mt-4" />;
    }
    return (
      <div className="w-full aspect-video bg-black/40 border border-dashed border-[#D4AF37]/50 rounded-2xl flex items-center justify-center text-[#D4AF37]/50 mt-4">
        <span className="text-sm font-bold uppercase tracking-widest">{label} (Pending Asset Upload)</span>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center px-4 pt-4 pb-24 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <DollarSign size={14} />
            Official Guide
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            How to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Withdraw</span> Earnings
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            A complete step-by-step guide to binding your payment method and cashing out your points on Poppo Live.
          </p>
        </div>

        <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 sm:p-12 shadow-[0_0_20px_rgba(212,175,55,0.1)] space-y-12">
          
          {/* Important Note */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 flex gap-4">
            <AlertTriangle className="text-blue-400 shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-blue-400 mb-2">10,000 Points = $1 USD</h3>
              <p className="text-[#A09E9A] text-sm">
                Before withdrawing, ensure you have reached the minimum withdrawal threshold. Poppo's withdrawal threshold is 100,000 points ($10 USD).
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-sm">1</span>
                Navigate to Earnings
              </h3>
              <p className="text-[#A09E9A] pl-11">Open the Poppo Live app, go to your Profile tab (bottom right), and tap on <strong>Points</strong>. This will open your earnings wallet.</p>
              <div className="pl-11">
                <AssetPlaceholder slotId="withdraw_guide_step1" label="Screenshot: Earnings Menu" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-sm">2</span>
                Bind Payment Method
              </h3>
              <p className="text-[#A09E9A] pl-11">Tap on <strong>Withdraw</strong>. You will be prompted to bind a payment method. We highly recommend using <strong>Epay</strong> or <strong>Payoneer</strong> for the lowest fees and fastest processing times.</p>
              <div className="pl-11">
                <ul className="space-y-2 mt-4 text-[#A09E9A] text-sm">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#D4AF37]" /> Create an Epay account if you don't have one.</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#D4AF37]" /> Enter the exact email associated with your Epay/Payoneer.</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#D4AF37]" /> Double check for typos before confirming!</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-sm">3</span>
                Confirm Cash Out
              </h3>
              <p className="text-[#A09E9A] pl-11">Enter the amount of points you wish to withdraw and hit Confirm. The funds typically arrive in your bound account within 24-48 hours.</p>
              <div className="pl-11">
                <AssetPlaceholder slotId="withdraw_guide_step2" label="Screenshot: Withdraw Confirmation" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
