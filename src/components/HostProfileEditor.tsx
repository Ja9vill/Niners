import React, { useState, useEffect } from 'react';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';
import { 
  User, CheckCircle2, AlertCircle, Save, Plus, Trash2, Facebook, Instagram, Phone, Music, Clock, FileText, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const HostProfileEditor = () => {
  const authState = Storage.getAuthState();
  const poppoId = authState.poppo_id || authState.name; // Use poppo_id or name if poppo_id is not set
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    fb: '',
    ig: '',
    tiktok: '',
    whatsapp: ''
  });
  const [streamingHours, setStreamingHours] = useState<{from: string, to: string}[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const users = await FirebaseService.getAllRoleMetadata();
      const myProfile = users.find(u => (u.poppo_id === poppoId || u.id === poppoId)) as Host;
      
      if (myProfile) {
        setBio(myProfile.bio || '');
        setSocialLinks({
          fb: myProfile.social_links?.fb || '',
          ig: myProfile.social_links?.ig || '',
          tiktok: myProfile.social_links?.tiktok || '',
          whatsapp: myProfile.social_links?.whatsapp || ''
        });
        setStreamingHours(myProfile.streaming_hours || []);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
      setErrorMsg("Failed to load your profile data.");
    } finally {
      setIsLoading(false);
    }
  };

  const addTimeSlot = () => {
    setStreamingHours([...streamingHours, { from: '', to: '' }]);
  };

  const removeTimeSlot = (index: number) => {
    const newHours = [...streamingHours];
    newHours.splice(index, 1);
    setStreamingHours(newHours);
  };

  const updateTimeSlot = (index: number, field: 'from' | 'to', value: string) => {
    const newHours = [...streamingHours];
    newHours[index][field] = value;
    setStreamingHours(newHours);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      // Clean up empty time slots
      const validHours = streamingHours.filter(h => h.from.trim() !== '' || h.to.trim() !== '');
      
      await FirebaseService.updateUser(poppoId, {
        bio: bio.trim(),
        social_links: {
          fb: socialLinks.fb.trim(),
          ig: socialLinks.ig.trim(),
          tiktok: socialLinks.tiktok.trim(),
          whatsapp: socialLinks.whatsapp.trim()
        },
        streaming_hours: validHours
      });
      
      setStreamingHours(validHours); // Update local state to reflect removal of empty slots
      setSuccessMsg("Profile updated successfully! It will now appear on your public roster page.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[#A09E9A] animate-pulse">
        Loading profile data...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-[#F0EFE8]">My Profile</h1>
        <p className="text-[#A09E9A] mt-2 text-sm max-w-xl">Customize your public presence on the Nine roster. These details will be visible to everyone when they click your card.</p>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
            <p className="text-sm font-bold text-emerald-400">{successMsg}</p>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
            <AlertCircle className="text-red-400 shrink-0" size={18} />
            <p className="text-sm font-bold text-red-400">{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Bio & Socials */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Bio Section */}
          <div className="p-6 rounded-3xl bg-[#11111A] border border-white/5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <FileText size={16} className="text-indigo-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[#F0EFE8]">Profile Bio</h2>
            </div>
            
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself, your streams, and what makes you unique..."
              className="w-full h-32 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F0EFE8] placeholder:text-[#A09E9A]/50 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
              maxLength={300}
            />
            <div className="text-right text-[10px] text-[#A09E9A] uppercase font-bold tracking-wider">
              {bio.length} / 300 characters
            </div>
          </div>

          {/* Social Links Section */}
          <div className="p-6 rounded-3xl bg-[#11111A] border border-white/5 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                <LinkIcon size={16} className="text-pink-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[#F0EFE8]">Social Links</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] flex items-center gap-2">
                  <Facebook size={12} className="text-blue-500" /> Facebook Profile URL
                </label>
                <input
                  type="text"
                  value={socialLinks.fb}
                  onChange={(e) => setSocialLinks({...socialLinks, fb: e.target.value})}
                  placeholder="https://facebook.com/..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F0EFE8] focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] flex items-center gap-2">
                  <Instagram size={12} className="text-pink-500" /> Instagram Username / URL
                </label>
                <input
                  type="text"
                  value={socialLinks.ig}
                  onChange={(e) => setSocialLinks({...socialLinks, ig: e.target.value})}
                  placeholder="@username or url"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F0EFE8] focus:outline-none focus:border-pink-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] flex items-center gap-2">
                  <Music size={12} className="text-[#00f2fe]" /> TikTok Username / URL
                </label>
                <input
                  type="text"
                  value={socialLinks.tiktok}
                  onChange={(e) => setSocialLinks({...socialLinks, tiktok: e.target.value})}
                  placeholder="@username or url"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F0EFE8] focus:outline-none focus:border-[#00f2fe]/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] flex items-center gap-2">
                  <Phone size={12} className="text-green-500" /> WhatsApp Link / Number
                </label>
                <input
                  type="text"
                  value={socialLinks.whatsapp}
                  onChange={(e) => setSocialLinks({...socialLinks, whatsapp: e.target.value})}
                  placeholder="Number or wa.me link"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F0EFE8] focus:outline-none focus:border-green-500/50"
                />
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column: Streaming Hours */}
        <div className="space-y-8">
          <div className="p-6 rounded-3xl bg-[#11111A] border border-white/5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock size={16} className="text-amber-400" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-[#F0EFE8]">Streaming Hours</h2>
              </div>
              <button 
                onClick={addTimeSlot}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-[#F0EFE8] rounded-md transition-colors"
                title="Add Timeslot"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {streamingHours.length === 0 && (
                <div className="text-center py-8 text-[#A09E9A]/50 text-xs italic">
                  No streaming hours added yet. Click + to add one.
                </div>
              )}
              
              <AnimatePresence>
                {streamingHours.map((slot, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5"
                  >
                    <div className="flex-1 space-y-1">
                      <input 
                        type="text"
                        placeholder="From (e.g. 8:00 PM)"
                        value={slot.from}
                        onChange={(e) => updateTimeSlot(index, 'from', e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#F0EFE8] focus:outline-none placeholder:text-[#A09E9A]/40 px-1"
                      />
                      <div className="h-px w-full bg-white/5" />
                      <input 
                        type="text"
                        placeholder="To (e.g. 10:00 PM)"
                        value={slot.to}
                        onChange={(e) => updateTimeSlot(index, 'to', e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#F0EFE8] focus:outline-none placeholder:text-[#A09E9A]/40 px-1"
                      />
                    </div>
                    <button 
                      onClick={() => removeTimeSlot(index)}
                      className="p-2 text-[#A09E9A] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-4 border-t border-white/5">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] hover:bg-[#F0EFE8] text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(240,239,232,0.5)] disabled:opacity-50"
        >
          {isSaving ? <CheckCircle2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Saving...' : 'Update Profile'}
        </button>
      </div>

    </div>
  );
};
