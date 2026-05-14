import React from 'react';
import { Book, Tag, TrendingUp, DollarSign, Calendar, ShieldCheck } from 'lucide-react';

export const GlossaryTab = () => {
  const sections = [
    {
      title: 'Host Nickname Prefixes',
      icon: Tag,
      items: [
        { term: '∘๏✪❾', desc: 'Official NINE Agency Tag' },
        { term: 'ᚒ / ᚓ', desc: 'Host role markers' },
        { term: '𝙼𝙽𝙶𝚁', desc: 'Manager marker' },
        { term: '∂мιи', desc: 'Admin marker' },
        { term: 'ᴴᵉᵃᵈ𝙼𝙽𝙶𝚁', desc: 'Head Manager marker' },
      ]
    },
    {
      title: 'Tier Badges',
      icon: TrendingUp,
      items: [
        { term: 'Tier S', desc: 'Elite performer (20M+ pts/month)' },
        { term: 'Tier A', desc: 'Top talent (8-15M pts/month)' },
        { term: 'Tier B', desc: 'Established (4-8M pts/month)' },
        { term: 'Tier X', desc: 'Evaluation Pending / New Host' },
      ]
    },
    {
      title: 'Earnings Categories',
      icon: DollarSign,
      items: [
        { term: 'Pts/Hr', desc: 'Points earned per hour of live streaming efficiency' },
        { term: 'Tips%', desc: 'Percentage of revenue derived from user gifts' },
        { term: 'Live%', desc: 'Percentage of time spent in solo live sessions vs party' },
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {sections.map((section, idx) => (
        <div key={idx} className="glass-card">
           <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded bg-indigo-600/10 flex items-center justify-center">
                 <section.icon className="text-indigo-400" size={20} />
              </div>
              <h4 className="font-bold text-sm uppercase tracking-widest text-slate-200">{section.title}</h4>
           </div>
           <div className="space-y-4">
              {section.items.map((item, i) => (
                 <div key={i} className="flex flex-col gap-1 px-4 py-3 bg-slate-800/20 rounded border border-slate-800/50">
                    <span className="font-mono text-indigo-400 text-xs font-bold">{item.term}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">{item.desc}</span>
                 </div>
              ))}
           </div>
        </div>
      ))}
    </div>
  );
};
