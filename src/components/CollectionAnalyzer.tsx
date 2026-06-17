import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Activity, AlertTriangle, Trash2, ShieldAlert, BarChart2, Layers } from 'lucide-react';

interface CollectionAnalyzerProps {
  collectionName: string;
  documents: any[];
  executeWithPassword: (callback: () => void) => void;
}

export const CollectionAnalyzer: React.FC<CollectionAnalyzerProps> = ({ collectionName, documents, executeWithPassword }) => {
  const [duplicateField, setDuplicateField] = useState<string>('');
  const [idRule, setIdRule] = useState<string>('');
  const [ruleError, setRuleError] = useState<string>('');

  useEffect(() => {
    // Load rule for this collection
    const savedRule = localStorage.getItem(`id_rule_${collectionName}`);
    if (savedRule) setIdRule(savedRule);
    else setIdRule('');
  }, [collectionName]);

  const handleSaveRule = (newRule: string) => {
    setIdRule(newRule);
    localStorage.setItem(`id_rule_${collectionName}`, newRule);
  };
  
  // 1. Schema Analysis
  const schemaAnalysis = useMemo(() => {
    const fieldStats: Record<string, { count: number, types: Set<string> }> = {};
    const totalDocs = documents.length;

    documents.forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (!fieldStats[key]) fieldStats[key] = { count: 0, types: new Set() };
        fieldStats[key].count++;
        let type: string = typeof doc[key];
        if (doc[key] === null) type = 'null';
        else if (Array.isArray(doc[key])) type = 'array';
        fieldStats[key].types.add(type);
      });
    });

    return Object.entries(fieldStats).map(([field, stats]) => ({
      field,
      count: stats.count,
      percentage: totalDocs === 0 ? 0 : Math.round((stats.count / totalDocs) * 100),
      types: Array.from(stats.types)
    })).sort((a, b) => b.percentage - a.percentage);
  }, [documents]);

  const allFields = schemaAnalysis.map(s => s.field);

  // 2. Duplicate Finder
  const duplicates = useMemo(() => {
    if (!duplicateField) return [];
    const groups: Record<string, any[]> = {};
    documents.forEach(doc => {
      const val = String(doc[duplicateField] || '');
      if (!groups[val]) groups[val] = [];
      groups[val].push(doc);
    });

    return Object.entries(groups)
      .filter(([val, docs]) => docs.length > 1 && val !== '')
      .map(([val, docs]) => ({ value: val, docs }));
  }, [documents, duplicateField]);

  // 3. Anomaly Detection (Missing core fields)
  const coreFields = schemaAnalysis.filter(s => s.percentage > 80 && s.field !== 'id').map(s => s.field);
  const anomalies = useMemo(() => {
    if (coreFields.length === 0) return [];
    return documents.filter(doc => {
      return coreFields.some(field => doc[field] === undefined || doc[field] === null || doc[field] === '');
    });
  }, [documents, coreFields]);

  // 4. ID Format Violations
  const { idViolations, regexError } = useMemo(() => {
    if (!idRule) {
      return { idViolations: [], regexError: '' };
    }
    try {
      const regex = new RegExp(idRule);
      return { idViolations: documents.filter(doc => !regex.test(doc.id)), regexError: '' };
    } catch (err) {
      return { idViolations: [], regexError: 'Invalid Regular Expression' };
    }
  }, [documents, idRule]);

  // Actions
  const handleDeleteField = (field: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the field "${field}" from ALL documents in ${collectionName}? This cannot be undone.`)) return;

    executeWithPassword(async () => {
      try {
        const batch = writeBatch(db);
        documents.forEach(d => {
          if (d[field] !== undefined) {
            batch.update(doc(db, collectionName, d.id), { [field]: null }); // Setting to null, or FieldValue.delete()
          }
        });
        await batch.commit();
        alert(`Field ${field} cleared from all documents.`);
      } catch (err) {
        console.error("Failed to delete field", err);
        alert("Failed to delete field.");
      }
    });
  };

  const handleDeleteDocument = (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete document ${id}?`)) return;
    executeWithPassword(async () => {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (err) {
        console.error("Failed to delete document", err);
        alert("Failed to delete document.");
      }
    });
  };

  if (documents.length === 0) {
    return <div className="p-8 text-center text-[#A09E9A] uppercase tracking-widest text-xs font-bold">No documents to analyze.</div>;
  }

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-6 space-y-8 relative z-0">
      
      {/* ID Formatting Rule Section */}
      <div className="bg-[#0A0500] border border-[#D4AF37]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-2 mb-2">
          <ShieldAlert size={18} /> Document ID Rules
        </h3>
        <p className="text-xs text-[#A09E9A] mb-4">
          Define a Regular Expression (Regex) to enforce how document IDs in <span className="text-white font-mono">{collectionName}</span> should be structured. 
        </p>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={idRule}
              onChange={(e) => handleSaveRule(e.target.value)}
              placeholder="e.g. ^[0-9]+_[A-Za-z]+_.*$" 
              className={`w-full bg-black border ${regexError ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none transition-all`}
            />
            {regexError && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-red-500 font-bold uppercase">{regexError}</span>}
          </div>
          <button 
            onClick={() => handleSaveRule('')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
          >
            Clear
          </button>
        </div>

        {idRule && !regexError && (
          <div className="mt-4">
            {idViolations.length === 0 ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-bold uppercase tracking-wider text-center">
                All {documents.length} document IDs match the rule perfectly.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider">{idViolations.length} IDs violate the formatting rule:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {idViolations.slice(0, 20).map(v => (
                    <div key={v.id} className="bg-red-500/10 border border-red-500/20 p-2 rounded text-[10px] font-mono text-red-300 truncate" title={v.id}>
                      {v.id}
                    </div>
                  ))}
                </div>
                {idViolations.length > 20 && (
                  <p className="text-[10px] text-white/40 uppercase font-bold text-center mt-2">+ {idViolations.length - 20} more violations</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schema Analysis Section */}
      <div className="bg-[#0A0500] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Layers size={100} />
        </div>
        <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-2 mb-6">
          <BarChart2 size={18} /> Schema Health & Field Frequency
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[#A09E9A]">Field Name</th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[#A09E9A]">Presence</th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[#A09E9A]">Data Types Seen</th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[#A09E9A] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {schemaAnalysis.map(s => (
                <tr key={s.field} className="hover:bg-white/[0.02]">
                  <td className="p-3 text-xs font-mono text-white">{s.field}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden w-24">
                        <div 
                          className={`h-full rounded-full ${s.percentage > 80 ? 'bg-emerald-500' : s.percentage > 30 ? 'bg-[#FF8C00]' : 'bg-red-500'}`} 
                          style={{ width: `${s.percentage}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white/70 w-8">{s.percentage}%</span>
                      <span className="text-[10px] text-white/40">({s.count}/{documents.length})</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {s.types.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] uppercase tracking-wider text-white/60">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {s.field !== 'id' && (
                      <button 
                        onClick={() => handleDeleteField(s.field)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-colors inline-flex"
                        title={`Delete ${s.field} from all documents`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duplicate Finder Section */}
      <div className="bg-[#0A0500] border border-white/5 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-2 mb-6">
          <Activity size={18} /> Duplicate Finder
        </h3>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <label className="text-[10px] font-black uppercase tracking-wider text-[#A09E9A]">Select Field to Group By:</label>
          <select 
            value={duplicateField}
            onChange={e => setDuplicateField(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
          >
            <option value="">-- Choose Field --</option>
            {allFields.filter(f => f !== 'id').map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {duplicateField && duplicates.length === 0 && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold uppercase tracking-wider text-center">
            No duplicates found for field "{duplicateField}"!
          </div>
        )}

        {duplicateField && duplicates.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-[#FF8C00] font-bold uppercase tracking-wider">Found {duplicates.length} duplicate groups.</p>
            {duplicates.map((group, idx) => (
              <div key={idx} className="border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-white/5 p-3 border-b border-white/10 flex justify-between items-center">
                  <span className="text-xs font-black text-white">Value: <span className="text-[#D4AF37] font-mono">{group.value}</span></span>
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase font-bold">{group.docs.length} Documents</span>
                </div>
                <div className="overflow-x-auto p-4 bg-black/40">
                  <div className="flex gap-4 pb-2">
                    {group.docs.map(d => (
                      <div key={d.id} className="min-w-[250px] bg-[#140E0A] border border-white/5 rounded-xl p-4 flex flex-col">
                        <div className="text-[10px] text-white/40 font-mono mb-2 border-b border-white/5 pb-2 break-all">ID: {d.id}</div>
                        <div className="flex-1 space-y-1 mb-4 overflow-y-auto max-h-40 custom-scrollbar">
                          {Object.keys(d).filter(k => k !== 'id' && k !== duplicateField).slice(0, 8).map(k => (
                            <div key={k} className="text-[10px] flex justify-between gap-2 border-b border-white/5 border-dashed pb-1">
                              <span className="text-[#A09E9A] truncate max-w-[80px]" title={k}>{k}:</span>
                              <span className="text-white truncate" title={String(d[k])}>{String(d[k])}</span>
                            </div>
                          ))}
                          {Object.keys(d).length > 9 && <div className="text-[9px] text-white/30 text-center pt-1">+ more fields</div>}
                        </div>
                        <button 
                          onClick={() => handleDeleteDocument(d.id)}
                          className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold uppercase tracking-wider text-[10px] rounded transition-colors flex justify-center items-center gap-2 mt-auto"
                        >
                          <Trash2 size={12} /> Delete Doc
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anomaly Detection Section */}
      <div className="bg-[#0A0500] border border-white/5 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
          <ShieldAlert size={18} className="text-[#FF8C00]" /> Anomaly Detection
        </h3>
        <p className="text-xs text-[#A09E9A] mb-6">
          Core fields (present in {'>'}80% of documents): <span className="text-white font-mono">{coreFields.join(', ') || 'None'}</span>
        </p>

        {anomalies.length === 0 ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold uppercase tracking-wider text-center">
            No documents are missing core fields.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-red-400 font-bold uppercase tracking-wider">{anomalies.length} documents are missing one or more core fields.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anomalies.slice(0, 12).map(a => {
                const missingFields = coreFields.filter(f => a[f] === undefined || a[f] === null || a[f] === '');
                return (
                  <div key={a.id} className="bg-white/5 border border-red-500/20 rounded-xl p-4">
                    <div className="text-[10px] text-white/40 font-mono mb-2 truncate">ID: {a.id}</div>
                    <div className="text-[10px] text-[#A09E9A] mb-1">Missing Fields:</div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {missingFields.map(f => (
                        <span key={f} className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded uppercase tracking-wider text-[9px]">{f}</span>
                      ))}
                    </div>
                    <button 
                      onClick={() => handleDeleteDocument(a.id)}
                      className="w-full py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold uppercase tracking-wider text-[10px] rounded transition-colors"
                    >
                      Delete Document
                    </button>
                  </div>
                );
              })}
            </div>
            {anomalies.length > 12 && (
              <p className="text-center text-xs text-white/40 pt-4 font-bold uppercase tracking-wider">
                + {anomalies.length - 12} more anomalies not shown
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
