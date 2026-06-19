import React from 'react';
import { Star } from 'lucide-react';
import poppoLogo from '../poppo-logo.jpg';
import { PoppoSEOArticle } from '../components/PoppoSEOArticle';

export const PoppoLivePage = () => {
  return (
    <div className="w-full flex flex-col items-center min-h-[100dvh] bg-transparent selection:bg-[#D4AF37]/30">
      
      {/* 1. Hero Section */}
      <section className="relative w-full pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center overflow-hidden border-b border-white/5">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#D4AF37]/10 to-transparent blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center space-y-6">
          <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-[0_0_40px_rgba(212,175,55,0.3)] border-2 border-[#D4AF37]/30">
            <img src={poppoLogo} alt="Poppo Live Logo" className="w-full h-full object-cover" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
            Join <span className="text-[#D4AF37]">Poppo Live</span>
          </h1>
          
          <p className="text-[#A09E9A] text-lg md:text-xl leading-relaxed max-w-2xl">
            Start your broadcasting journey with Nine Talent Management. Download the app to your device and fill out the agency application below to get officially rostered.
          </p>

          <div className="w-full pt-6 flex justify-center">
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative w-full max-w-[400px] aspect-square">
              {/* Loading Indicator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#A09E9A] -z-10">
                <div className="w-8 h-8 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Loading...</span>
              </div>
              
              <iframe 
                src="https://static.vshowapi.com/inviteNew/share/?c=poppo&link_id=8521785&user_id=19157913&temp_type=1&sys_temp_id=0" 
                title="Download Poppo Live"
                className="w-full h-full border-none outline-none relative z-10 bg-transparent"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Embedded Application Form Section */}
      <section className="w-full max-w-screen-xl mx-auto px-4 py-20 flex flex-col items-center">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mx-auto">
            <Star size={14} className="text-[#D4AF37]" />
            <span>Official Application</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Become An Agent / Host</h2>
          <p className="text-[#A09E9A]">Complete the form below to link your Poppo account with Nine Talent Management.</p>
        </div>

        {/* Iframe Container with Mobile Scrolling Optimization */}
        <div className="w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative" style={{ minHeight: '800px', WebkitOverflowScrolling: 'touch' }}>
          
          {/* Loading Indicator (shows behind iframe until it loads) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#A09E9A] -z-10">
            <div className="w-10 h-10 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Loading Application Form...</span>
          </div>

          <iframe 
            src="https://invite-poppo.com/6CxF5E" 
            title="Poppo Live Application Form"
            className="w-full h-[800px] border-none outline-none relative z-10 bg-transparent"
            loading="lazy"
            allow="camera; microphone"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </section>

      {/* 3. SEO Research Report Section */}
      <PoppoSEOArticle />

    </div>
  );
};
