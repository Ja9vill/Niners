import React, { useState, useEffect, useRef } from 'react';
import { Network, Database, FileText, FileCode2, ChevronRight, X, Activity } from 'lucide-react';
import mapDataRaw from '../data/architecture.json';

export const ArchitectureMap: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mapData = (mapDataRaw as any)?.default || mapDataRaw;
  const nodes = mapData?.nodes || [];
  const edges = mapData?.edges || [];

  const forms = nodes.filter((n: any) => n.type === 'form');
  const collections = nodes.filter((n: any) => n.type === 'collection');

  // Simple hardcoded positioning for two columns
  const getNodePos = (id: string) => {
    const formIndex = forms.findIndex((f: any) => f.id === id);
    if (formIndex !== -1) return { x: 100, y: formIndex * 150 + 100 };
    
    const colIndex = collections.findIndex((c: any) => c.id === id);
    if (colIndex !== -1) return { x: 600, y: colIndex * 100 + 100 };
    
    return { x: 0, y: 0 };
  };

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-fadeIn">
      {/* Mind Map Canvas */}
      <div className="flex-1 bg-[#0A0500] border border-white/5 rounded-2xl relative overflow-hidden shadow-xl" ref={containerRef}>
        <div className="absolute top-0 left-0 right-0 p-4 border-b border-white/5 bg-black/40 z-10 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
            <Network size={16} /> App Architecture Map
          </h2>
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Interactive Data Flow</span>
        </div>

        <div className="w-full h-full overflow-auto custom-scrollbar relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.02] to-transparent">
          <svg className="absolute inset-0 w-[1000px] h-[800px] pointer-events-none">
            {edges.map((edge: any, idx: number) => {
              const srcPos = getNodePos(edge.source);
              const tgtPos = getNodePos(edge.target);
              const isSelected = selectedNode?.id === edge.source || selectedNode?.id === edge.target;
              
              // Bezier curve path
              const d = `M ${srcPos.x + 250} ${srcPos.y + 40} C ${srcPos.x + 400} ${srcPos.y + 40}, ${tgtPos.x - 100} ${tgtPos.y + 40}, ${tgtPos.x} ${tgtPos.y + 40}`;
              
              return (
                <g key={idx}>
                  <path 
                    d={d} 
                    fill="none" 
                    stroke={isSelected ? '#D4AF37' : 'rgba(255,255,255,0.05)'} 
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="transition-all duration-300"
                    strokeDasharray={isSelected ? "5,5" : "none"}
                  >
                    {isSelected && <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.5s" repeatCount="indefinite" />}
                  </path>
                  {isSelected && (
                    <circle cx={tgtPos.x - 10} cy={tgtPos.y + 40} r="4" fill="#D4AF37" />
                  )}
                </g>
              );
            })}
          </svg>

          <div className="relative w-[1000px] h-[800px] pt-16">
            {/* Forms Column */}
            <div className="absolute left-[100px] top-0 bottom-0 w-[250px]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] mb-8 mt-4 text-center">Frontend Forms / Components</h3>
              {forms.map(node => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`absolute w-full p-4 rounded-xl border text-left transition-all ${
                    selectedNode?.id === node.id 
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)] z-10' 
                      : 'bg-[#140E0A] border-white/10 hover:border-white/30 z-0'
                  }`}
                  style={{ top: getNodePos(node.id).y }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className={selectedNode?.id === node.id ? "text-[#D4AF37]" : "text-white/50"} />
                    <span className="text-xs font-bold text-white truncate">{node.label}</span>
                  </div>
                  <div className="text-[10px] text-[#A09E9A] truncate">{node.id}.tsx</div>
                </button>
              ))}
            </div>

            {/* Collections Column */}
            <div className="absolute left-[600px] top-0 bottom-0 w-[250px]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] mb-8 mt-4 text-center">Firestore Collections</h3>
              {collections.map(node => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`absolute w-full p-4 rounded-xl border text-left transition-all ${
                    selectedNode?.id === node.id 
                      ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)] z-10' 
                      : 'bg-[#140E0A] border-white/10 hover:border-white/30 z-0'
                  }`}
                  style={{ top: getNodePos(node.id).y }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Database size={14} className={selectedNode?.id === node.id ? "text-blue-400" : "text-white/50"} />
                    <span className="text-xs font-bold text-white truncate">{node.id}</span>
                  </div>
                  <div className="text-[10px] text-[#A09E9A] truncate">Database Collection</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inspector Panel */}
      <div className={`w-full md:w-80 bg-[#140E0A] border border-white/5 rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-xl transition-all duration-300 ${selectedNode ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 hidden md:flex'}`}>
        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-[#D4AF37]/10 to-transparent flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
            <Activity size={14} />
            Node Inspector
          </h2>
          <button onClick={() => setSelectedNode(null)} className="text-white/50 hover:text-white" title="Close Inspector">
            <X size={16} />
          </button>
        </div>
        
        {selectedNode ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-[#A09E9A] mb-1">Node ID</div>
              <div className="text-sm font-mono text-white break-all bg-black/50 p-2 rounded-lg border border-white/5">{selectedNode.id}</div>
            </div>
            
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-[#A09E9A] mb-1">Description</div>
              <div className="text-xs text-white/80 leading-relaxed">{selectedNode.description}</div>
            </div>

            {selectedNode.type === 'form' && (
              <>
                <div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-[#A09E9A] mb-2">Fields Mapped to Database</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedNode.fields?.map((f: any, idx: number) => {
                      const isObj = typeof f === 'object';
                      const label = isObj ? f.label : f;
                      const dbKey = isObj ? f.key : f;
                      
                      return (
                        <div key={idx} className="flex flex-col bg-black/40 border border-white/5 p-2 rounded text-left">
                          <span className="text-[10px] font-bold text-white/90 truncate">{label}</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[8px] text-white/30 uppercase tracking-widest">Key:</span>
                            <span className="text-[9px] font-mono text-emerald-400 truncate">{dbKey}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-[#A09E9A] mb-2">Database Connections</div>
                  <div className="space-y-2">
                    {edges.filter((e: any) => e.source === selectedNode.id).map((e: any, idx: number) => (
                      <div key={idx} className="bg-black/50 border border-white/5 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-[#D4AF37] uppercase">{e.action}</span>
                          <ChevronRight size={10} className="text-white/30" />
                          <span className="text-xs font-mono text-blue-400">{e.target}</span>
                        </div>
                        <div className="text-[10px] text-white/50">{e.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedNode.type === 'collection' && (
              <div>
                <div className="text-[10px] uppercase font-black tracking-widest text-[#A09E9A] mb-2">Updated By Components</div>
                <div className="space-y-2">
                  {edges.filter((e: any) => e.target === selectedNode.id).map((e: any, idx: number) => (
                    <div key={idx} className="bg-black/50 border border-white/5 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FileCode2 size={12} className="text-[#D4AF37]" />
                        <span className="text-xs font-mono text-white">{e.source}.tsx</span>
                      </div>
                      <div className="text-[10px] text-white/50">{e.description} ({e.action})</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-white/30 text-xs font-bold uppercase tracking-widest">
            Select a node on the map to inspect its data flow.
          </div>
        )}
      </div>
    </div>
  );
};
