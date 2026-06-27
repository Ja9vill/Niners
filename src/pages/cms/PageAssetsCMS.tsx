import React, { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FirebaseService } from '../../lib/firebaseService';
import { Storage } from '../../lib/storage';
import { PublicPageAsset } from '../../types';

// Pre-defined slots based on the 19 HTML files that might need images
const PAGE_ASSET_SLOTS = [
  { id: 'home_hero_bg', name: 'Homepage Hero Background', description: 'Main background image for the public homepage.' },
  { id: 'withdraw_guide_step1', name: 'Withdraw Guide - Step 1', description: 'Screenshot of the Epay/Payoneer binding screen.' },
  { id: 'withdraw_guide_step2', name: 'Withdraw Guide - Step 2', description: 'Screenshot of the cash out confirmation.' },
  { id: 'pk_battles_banner', name: 'PK Battles Guide Banner', description: 'Header image for PK Battles guide.' },
  { id: 'agent_registration_proof', name: 'Agent Reg - Proof of Concept', description: 'Screenshot of a successful agency dashboard.' },
  { id: 'poppo_id_location', name: 'Find Poppo ID', description: 'Screenshot highlighting where the Poppo ID is located on the profile.' },
  { id: 'usa_region_banner', name: 'USA Region Banner', description: 'Hero image for the USA regional page.' },
  { id: 'philippines_region_banner', name: 'Philippines Region Banner', description: 'Hero image for the Philippines regional page.' },
];

export const PageAssetsCMS = () => {
  const [assets, setAssets] = useState<Record<string, PublicPageAsset>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const authState = Storage.getAuthState();

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const data = await FirebaseService.getPublicPageAssets();
      const assetMap: Record<string, PublicPageAsset> = {};
      data.forEach(a => { assetMap[a.slotId] = a; });
      setAssets(assetMap);
    } catch (error) {
      console.error('[PageAssetsCMS] Failed to load assets:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load page assets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleSaveAsset = async (slotId: string, imageUrl: string) => {
    setIsProcessing(slotId);
    try {
      const assetData: Partial<PublicPageAsset> = {
        id: slotId, // use slotId as document ID
        slotId,
        imageUrl,
        updatedBy: authState.nickname || authState.name || 'Admin',
      };
      await FirebaseService.savePublicPageAsset(assetData);
      setAssets(prev => ({ ...prev, [slotId]: { ...prev[slotId], ...assetData } as PublicPageAsset }));
      await FirebaseService.logSystemActivity(`Admin updated public page asset: "${slotId}"`, 'Info');
    } catch (error) {
      console.error('[PageAssetsCMS] Failed to save asset:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save asset.');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F0EFE8] uppercase tracking-widest">Page Assets CMS</h1>
          <p className="text-[#A09E9A] text-sm mt-1">Manage screenshots and banner images for public guides and regional pages.</p>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          Failed to load page assets: {loadError}
        </div>
      )}

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {saveError}
        </div>
      )}

      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PAGE_ASSET_SLOTS.map((slot) => {
            const currentAsset = assets[slot.id];
            
            return (
              <div key={slot.id} className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-all hover:border-[#D4AF37]/50">
                {/* Image Preview */}
                <div className="aspect-video bg-[#0D0D14] flex items-center justify-center relative border-b border-white/10 group">
                  {currentAsset?.imageUrl ? (
                    <img src={currentAsset.imageUrl} alt={slot.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/20">
                      <ImageIcon size={32} />
                      <span className="text-xs font-bold uppercase tracking-wider">No Image Set</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-[#D4AF37] text-sm mb-1">{slot.name}</h3>
                  <p className="text-[10px] text-[#A09E9A] mb-4 flex-1">{slot.description}</p>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Direct Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        id={`input-${slot.id}`}
                        defaultValue={currentAsset?.imageUrl || ''}
                        className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                        placeholder="https://..."
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`input-${slot.id}`) as HTMLInputElement;
                          handleSaveAsset(slot.id, input.value);
                        }}
                        disabled={isProcessing === slot.id}
                        className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                      >
                        {isProcessing === slot.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  {currentAsset?.updatedBy && (
                    <p className="text-[8px] text-white/30 uppercase tracking-widest mt-3">
                      Last updated by {currentAsset.updatedBy}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
