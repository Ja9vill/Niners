import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { FileJson, Edit2, Save, X, Lock, Unlock, Database } from 'lucide-react';

interface DocumentSpotlightProps {
  collectionName: string;
  document: any;
  executeWithPassword: (callback: () => void) => void;
  onClose: () => void;
}

export const DocumentSpotlight: React.FC<DocumentSpotlightProps> = ({ collectionName, document, executeWithPassword, onClose }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsEditMode(false);
    setEditData(document);
  }, [document]);

  const handleEnableEdit = () => {
    executeWithPassword(() => {
      setIsEditMode(true);
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditData(document);
  };

  const handleChange = (field: string, value: string) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { id, ...saveData } = editData;
      
      // Attempt to parse arrays or booleans if originally they were not strings
      // For simple inline spotlight editing, we do our best to maintain types.
      const parsedData = { ...saveData };
      Object.keys(parsedData).forEach(key => {
        if (Array.isArray(document[key]) && typeof parsedData[key] === 'string') {
          parsedData[key] = parsedData[key].split(',').map((s: string) => s.trim()).filter((s: string) => s);
        } else if (typeof document[key] === 'boolean' && typeof parsedData[key] === 'string') {
          parsedData[key] = parsedData[key].toLowerCase() === 'true';
        } else if (typeof document[key] === 'number' && typeof parsedData[key] === 'string' && !isNaN(Number(parsedData[key]))) {
          parsedData[key] = Number(parsedData[key]);
        }
      });

      await setDoc(doc(db, collectionName, document.id), parsedData, { merge: true });
      setIsEditMode(false);
    } catch (err) {
      console.error("Failed to save document:", err);
      alert("Failed to save document changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!document) return null;

  const fields = Object.keys(document).filter(k => k !== 'id').sort();

  return (
    <div className="flex flex-col h-full bg-[#0A0500] border-l border-white/5 relative">
      <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#D4AF37]/10 to-transparent flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <FileJson className="text-[#D4AF37]" size={24} />
            Document Spotlight
          </h2>
          <div className="text-xs font-mono text-[#D4AF37] mt-2 opacity-80 flex items-center gap-2">
            <Database size={12} /> {collectionName} / {document.id}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-[#A09E9A] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          title="Close Spotlight"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-[#A09E9A] uppercase tracking-widest flex items-center gap-2">
              {isEditMode ? <Unlock size={16} className="text-[#D4AF37]" /> : <Lock size={16} />}
              {isEditMode ? 'Edit Mode Active' : 'View Mode'}
            </h3>
            {!isEditMode && (
              <button 
                onClick={handleEnableEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-white/10"
              >
                <Edit2 size={14} className="text-[#D4AF37]" /> Enable Editing
              </button>
            )}
          </div>

          <div className="space-y-4">
            {fields.map(field => (
              <div key={field} className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#A09E9A] mb-1.5">
                  {field}
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    title={field}
                    placeholder={`Enter value for ${field}`}
                    value={
                      Array.isArray(editData[field]) 
                        ? editData[field].join(', ') 
                        : typeof editData[field] === 'object'
                          ? JSON.stringify(editData[field])
                          : editData[field] ?? ''
                    }
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="w-full bg-black border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                  />
                ) : (
                  <div className="w-full bg-[#140E0A] border border-white/5 rounded-xl px-4 py-3 text-sm text-white/90 font-mono break-all group-hover:bg-[#1A130E] transition-colors">
                    {Array.isArray(document[field]) 
                        ? document[field].join(', ') 
                        : typeof document[field] === 'object'
                          ? JSON.stringify(document[field])
                          : String(document[field] ?? '')}
                  </div>
                )}
              </div>
            ))}

            {fields.length === 0 && (
              <div className="p-8 text-center text-[#A09E9A] text-xs font-bold uppercase tracking-widest border border-white/5 rounded-xl border-dashed">
                This document has no fields.
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditMode && (
        <div className="p-6 border-t border-white/5 bg-[#140E0A] flex items-center justify-end gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10">
          <button 
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="px-6 py-3 text-xs font-bold text-[#A09E9A] hover:text-white uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            Discard Changes
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Document'}
          </button>
        </div>
      )}
    </div>
  );
};
