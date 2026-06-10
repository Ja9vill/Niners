import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { FirebaseService } from '../../lib/firebaseService';
import { Globe, Users, Trophy, DollarSign } from 'lucide-react';
import { PublicPageAsset } from '../../types';

const REGION_DATA: Record<string, { name: string, description: string }> = {
  usa: { name: 'USA', description: 'Join the fastest-growing network of top earners in the United States.' },
  india: { name: 'India', description: 'Maximize your potential with the premier Poppo Live agency in India.' },
  indonesia: { name: 'Indonesia', description: 'Bergabunglah dengan agensi Poppo Live terbaik di Indonesia dan tingkatkan penghasilan Anda.' },
  malaysia: { name: 'Malaysia', description: 'Sertai rangkaian agensi teratas di Malaysia dan capai kejayaan bersama kami.' },
  philippines: { name: 'Philippines', description: 'The #1 agency for Filipino talents. Start your streaming journey today.' },
  singapore: { name: 'Singapore', description: 'Elevate your live streaming career with the top agency in Singapore.' },
  thailand: { name: 'Thailand', description: 'เข้าร่วมเอเจนซี่อันดับ 1 ในประเทศไทย และเริ่มต้นการสตรีมเพื่อสร้างรายได้' }
};

export const RegionalLanding = () => {
  const { country } = useParams<{ country: string }>();
  const regionKey = country?.toLowerCase() || '';
  const regionInfo = REGION_DATA[regionKey];

  const [assetUrl, setAssetUrl] = useState<string>('');

  useSEO({
    title: regionInfo ? `Poppo Live Agency ${regionInfo.name} | Nine Dashboard` : 'Regional Hub | Nine Dashboard',
    description: regionInfo?.description || 'Join Nine Agency in your region.'
  });

  useEffect(() => {
    const fetchAsset = async () => {
      const assets = await FirebaseService.getPublicPageAssets();
      const match = assets.find(a => a.slotId === `${regionKey}_region_banner`);
      if (match?.imageUrl) {
        setAssetUrl(match.imageUrl);
      }
    };
    if (regionInfo) fetchAsset();
  }, [regionKey, regionInfo]);

  if (!regionInfo) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center overflow-hidden relative pb-24 pt-4">
      
      {/* Hero Section */}
      <div className="w-full relative bg-[#13131E] border-b border-[#D4AF37]/20 pt-32 pb-20 px-4 flex flex-col items-center justify-center min-h-[60vh] overflow-hidden">
        {assetUrl ? (
          <div className="absolute inset-0 z-0">
            <img src={assetUrl} alt={`Poppo Live ${regionInfo.name}`} className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-[#0A0A0F]" />
          </div>
        ) : (
          <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4AF37]/10 rounded-full blur-[150px] pointer-events-none z-0" />
          </>
        )}

        <div className="relative z-10 max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-xs font-black uppercase tracking-widest text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <Globe size={16} />
            Official Nine Agency
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white uppercase leading-none">
            Poppo Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">{regionInfo.name}</span>
          </h1>
          
          <p className="text-xl text-[#A09E9A] max-w-2xl mx-auto font-medium">
            {regionInfo.description}
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://invite-poppo.com/6CxF5E" target="_blank" rel="noreferrer" className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-8 py-4 rounded-xl font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:-translate-y-1">
              Join as a Host
            </a>
            <a href="/contact" className="w-full sm:w-auto bg-white/5 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-wider transition-all hover:-translate-y-1">
              Contact Support
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto w-full px-4 -mt-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A140A]/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-12 bg-black/50 border border-[#D4AF37]/30 rounded-xl flex items-center justify-center text-[#D4AF37] mb-6">
              <DollarSign size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Maximum Payouts</h3>
            <p className="text-[#A09E9A] text-sm">We ensure you get the highest possible rates and on-time bonuses for your region.</p>
          </div>
          <div className="bg-[#1A140A]/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-12 bg-black/50 border border-[#D4AF37]/30 rounded-xl flex items-center justify-center text-[#D4AF37] mb-6">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Local Support</h3>
            <p className="text-[#A09E9A] text-sm">Get dedicated management and support tailored for hosts in {regionInfo.name}.</p>
          </div>
          <div className="bg-[#1A140A]/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-12 bg-black/50 border border-[#D4AF37]/30 rounded-xl flex items-center justify-center text-[#D4AF37] mb-6">
              <Trophy size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Agency Events</h3>
            <p className="text-[#A09E9A] text-sm">Participate in exclusive regional PK battles, livehouse events, and monthly leaderboards.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
