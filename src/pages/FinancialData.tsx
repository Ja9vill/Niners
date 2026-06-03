import React from 'react';
import { DollarSign } from 'lucide-react';

export const FinancialData = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <DollarSign className="text-[#D4AF37]" size={24} />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Financial Data</h2>
      </div>
      <div className="bg-[#1A1A28] border border-[#D4AF37]/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
        <p className="text-[#A09E9A] text-sm italic">Financial data tracking coming soon.</p>
      </div>
    </div>
  );
};
