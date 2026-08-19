import React, { useState, useRef } from 'react';

interface NodePos {
  x: number;
  y: number;
}

export const BrainSection: React.FC = () => {
  // Initial positions for Vapi flow nodes on canvas (exact canvas pixel coordinates)
  const [positions, setPositions] = useState<Record<string, NodePos>>({
    start: { x: 50, y: 140 },
    agent: { x: 330, y: 110 },
    logic: { x: 630, y: 140 },
    end: { x: 910, y: 125 }
  });

  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState<string>('agent');
  const [isAutoConnecting] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Node Dragging Handlers (Smooth relative delta calculation)
  const handleMouseDown = (e: React.MouseEvent, nodeKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveNode(nodeKey);
    setDraggingNode(nodeKey);
    const pos = positions[nodeKey];
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setPositions(prev => ({
      ...prev,
      [draggingNode]: { x: newX, y: newY }
    }));
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  // Helper to generate smooth SVG Bezier curve wire path
  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.max(50, Math.abs(x2 - x1) * 0.45);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  // Pin Output/Input coordinates (Center of pin dots)
  const p1Out = { x: positions.start.x + 230, y: positions.start.y + 70 };
  const p2In  = { x: positions.agent.x, y: positions.agent.y + 70 };
  const p2Out = { x: positions.agent.x + 250, y: positions.agent.y + 70 };
  const p3In  = { x: positions.logic.x, y: positions.logic.y + 70 };
  const p3Out = { x: positions.logic.x + 240, y: positions.logic.y + 70 };
  const p4In  = { x: positions.end.x, y: positions.end.y + 70 };

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-16 bg-[#FFFFFF] text-slate-900 border-t border-slate-200 overflow-hidden" id="brain">
      
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center font-sans">
        
        {/* Section Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/80 border border-slate-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-600"></span>
          <span className="text-xs text-slate-700 font-semibold">
            06 • Custom Voice Architecture
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-slate-900 mb-4">
          Tailored Call Logic. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">Built & Managed For You.</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal mb-14">
          We architect multi-turn decision trees, intent filters, transfer rules, and CRM actions tailored specifically to your business operations.
        </p>

        {/* INNER WORKFLOW CANVAS (VAPI-STYLE NODE FLOW STUDIO SCREENSHOT MOCKUP) */}
        <div className="w-full max-w-6xl bg-[#0F172A] rounded-t-3xl rounded-b-none border border-b-0 border-slate-800 shadow-2xl overflow-hidden text-left text-white select-none max-h-[460px] relative">
          
          {/* Studio Top Control Toolbar */}
          <div className="bg-[#1E293B] px-6 py-4 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                <span className="w-3 h-3 rounded-full bg-[#27C93F]"></span>
              </div>
              <span className="h-4 w-px bg-slate-700 mx-1"></span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">Talkar Assistant Canvas</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded font-sans">
                  Agent Studio
                </span>
              </div>
            </div>

            {/* Canvas Actions */}
            <div className="flex items-center gap-3 text-xs">
              <div 
                className="px-3.5 py-1.5 bg-white/5 border border-white/10 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Optimized by Talkar</span>
              </div>

              <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg shadow">
                Deployed to Production
              </div>
            </div>
          </div>

          {/* Interactive Drag & Connect Canvas Area */}
          <div 
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative h-[480px] w-full bg-[#0F172A] overflow-x-auto overflow-y-hidden cursor-crosshair"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* DYNAMIC SVG BEZIER WIRE CONNECTORS OVERLAY */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="wire1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#F97316" />
                </linearGradient>
                <linearGradient id="wire2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
                <linearGradient id="wire3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>

              {/* Wire 1: Start -> Agent */}
              <path 
                d={getBezierPath(p1Out.x, p1Out.y, p2In.x, p2In.y)} 
                stroke="url(#wire1)" 
                strokeWidth="3" 
                fill="none" 
                className="drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" 
              />
              
              {/* Wire 2: Agent -> Logic */}
              <path 
                d={getBezierPath(p2Out.x, p2Out.y, p3In.x, p3In.y)} 
                stroke="url(#wire2)" 
                strokeWidth="3" 
                fill="none" 
                className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
              />

              {/* Wire 3: Logic -> End */}
              <path 
                d={getBezierPath(p3Out.x, p3Out.y, p4In.x, p4In.y)} 
                stroke="url(#wire3)" 
                strokeWidth="3" 
                fill="none" 
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
              />
            </svg>

            {/* 1. START NODE */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'start')}
              style={{
                transform: `translate3d(${positions.start.x}px, ${positions.start.y}px, 0)`,
                transition: isAutoConnecting ? 'transform 0.5s ease-out' : 'none'
              }}
              className={`absolute top-0 left-0 w-[230px] bg-[#1E293B] rounded-2xl border p-4 shadow-xl cursor-grab active:cursor-grabbing z-10 ${
                activeNode === 'start' 
                  ? 'border-blue-400 bg-[#334155] shadow-2xl scale-[1.02]' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-700 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    ⚡
                  </div>
                  <span className="text-xs font-bold text-white">Start Node</span>
                </div>
                <span className="text-[10px] text-slate-300 font-medium">Trigger</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-700 space-y-1">
                  <div className="text-[10px] text-slate-400">Inbound Channel</div>
                  <div className="text-white font-mono font-semibold text-[11px]">+1 (800) TALKAR</div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 px-1">
                  <span>Channel Type:</span>
                  <span className="text-slate-200">Voice Trunk</span>
                </div>
              </div>

              {/* Node Output Pin */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-[#0F172A] shadow"></div>
            </div>

            {/* 2. AGENTIC NODE */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'agent')}
              style={{
                transform: `translate3d(${positions.agent.x}px, ${positions.agent.y}px, 0)`,
                transition: isAutoConnecting ? 'transform 0.5s ease-out' : 'none'
              }}
              className={`absolute top-0 left-0 w-[250px] bg-[#1E293B] rounded-2xl border p-4 shadow-xl cursor-grab active:cursor-grabbing z-10 ${
                activeNode === 'agent' 
                  ? 'border-orange-400 bg-[#334155] shadow-2xl scale-[1.02]' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Node Input Pin */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full border-2 border-[#0F172A] shadow"></div>

              <div className="flex items-center justify-between border-b border-slate-700 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    🤖
                  </div>
                  <span className="text-xs font-bold text-white">Voice Agent Node</span>
                </div>
                <span className="text-[10px] text-orange-400 font-medium">Agent Nova</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-700 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Voice Engine:</span>
                    <span className="text-orange-400 font-bold">Natural Voice AI</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Voice Persona:</span>
                    <span className="text-white font-medium">Atlas Commercial</span>
                  </div>
                </div>
                <div className="bg-[#0F172A] border border-slate-700 p-2 rounded-lg text-[10px] text-slate-300">
                  Prompt: "Qualify commercial service intent & extract address"
                </div>
              </div>

              {/* Node Output Pin */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-orange-500 border-2 border-[#0F172A] shadow"></div>
            </div>

            {/* 3. LOGIC / BRANCH NODE */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'logic')}
              style={{
                transform: `translate3d(${positions.logic.x}px, ${positions.logic.y}px, 0)`,
                transition: isAutoConnecting ? 'transform 0.5s ease-out' : 'none'
              }}
              className={`absolute top-0 left-0 w-[240px] bg-[#1E293B] rounded-2xl border p-4 shadow-xl cursor-grab active:cursor-grabbing z-10 ${
                activeNode === 'logic' 
                  ? 'border-purple-400 bg-[#334155] shadow-2xl scale-[1.02]' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Node Input Pin */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-500 rounded-full border-2 border-[#0F172A] shadow"></div>

              <div className="flex items-center justify-between border-b border-slate-700 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    🔀
                  </div>
                  <span className="text-xs font-bold text-white">Logic Node</span>
                </div>
                <span className="text-[10px] text-slate-300 font-medium">Condition</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded-lg bg-[#0F172A] text-white border border-slate-700 text-[11px] font-medium flex items-center justify-between">
                  <span>If Urgent Lead</span>
                  <span className="text-[9px] text-emerald-400 font-bold">True</span>
                </div>
                <div className="p-2 rounded-lg bg-[#0F172A] text-slate-400 border border-slate-700 text-[11px] flex items-center justify-between">
                  <span>If General Inquiry</span>
                  <span className="text-[9px] text-slate-500">False</span>
                </div>
              </div>

              {/* Node Output Pin */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0F172A] shadow"></div>
            </div>

            {/* 4. END NODE */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'end')}
              style={{
                transform: `translate3d(${positions.end.x}px, ${positions.end.y}px, 0)`,
                transition: isAutoConnecting ? 'transform 0.5s ease-out' : 'none'
              }}
              className={`absolute top-0 left-0 w-[230px] bg-[#1E293B] rounded-2xl border p-4 shadow-xl cursor-grab active:cursor-grabbing z-10 ${
                activeNode === 'end' 
                  ? 'border-emerald-400 bg-[#334155] shadow-2xl scale-[1.02]' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Node Input Pin */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0F172A] shadow"></div>

              <div className="flex items-center justify-between border-b border-slate-700 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    🎯
                  </div>
                  <span className="text-xs font-bold text-white">End Node</span>
                </div>
                <span className="text-[10px] text-slate-300 font-medium">Dispatch</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-700 space-y-1">
                  <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span>✓</span> Calendar Booked
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span>✓</span> Salesforce CRM Synced
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
                  <span>Speed:</span>
                  <span className="text-emerald-400 font-bold">&lt; 15s</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar Controls */}
          <div className="bg-[#1E293B] text-slate-300 px-6 py-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-orange-400 font-semibold">Active Node:</span>
              <span className="text-white capitalize font-bold bg-slate-700 px-2.5 py-0.5 rounded border border-slate-600">
                {activeNode} Node
              </span>
            </div>
            <div className="text-slate-400 font-medium">
              Talkar Visual Workflow Architecture
            </div>
          </div>

          {/* Smooth Bottom Screenshot Gradient Fade */}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/80 to-transparent pointer-events-none z-20"></div>

        </div>

      </div>
    </section>
  );
};
