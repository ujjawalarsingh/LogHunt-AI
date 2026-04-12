import { Radar, LayoutDashboard, FileUp, BarChart2, Settings, Database, Cpu, RefreshCw } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Log Ingestion', icon: FileUp },
  { name: 'LLM Analysis', icon: Cpu },
  { name: 'SQL Query Lab', icon: Database },
  { name: 'Analytics', icon: BarChart2 },
  { name: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate, onLanding }) {
  return (
    <aside className="w-[220px] shrink-0 bg-[#0B0707] border-r border-[#281414] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <button
        onClick={onLanding}
        className="flex items-center gap-3 px-6 py-5 border-b border-[#281414] hover:bg-[rgba(128,0,0,0.03)] transition-colors w-full text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[rgba(128,0,0,0.08)] border border-[rgba(128,0,0,0.18)] flex items-center justify-center shrink-0">
          <Radar className="w-4 h-4 text-[#800000]" strokeWidth={2} />
        </div>
        <div>
          <div className="font-display text-[13px] font-bold tracking-[0.08em] text-white leading-none">
            LOGHUNT <span className="text-[#800000]">AI</span>
          </div>
          <div className="text-[8px] text-[#665656] tracking-[0.14em] uppercase mt-1">Hunt threats. Decode logs.</div>
        </div>
      </button>

      {/* Model status pill */}
      <div className="mx-4 mt-4 mb-2 px-3 py-2 rounded-lg bg-[rgba(128,0,0,0.05)] border border-[rgba(128,0,0,0.12)]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-display font-bold text-[#5A0B0B] tracking-[0.15em] uppercase">Model Status</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#A39D82]" style={{boxShadow:'0 0 6px #A39D82'}}></div>
        </div>
        <div className="text-[10px] font-display text-[#F0EBEB] font-bold">LoRA-Fine-Tuned</div>
        <div className="text-[9px] text-[#665656] mt-0.5 font-mono">r=16 · α=32 · 4-bit</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ name, icon: Icon }) => {
          const active = activePage === name;
          return (
            <button
              key={name}
              onClick={() => onNavigate(name)}
              className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition-all
                ${active ? 'nav-active font-semibold' : 'text-[#918282]'}`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {name}
            </button>
          );
        })}
      </nav>

      {/* LoRA Weights toggle */}
      <div className="mx-4 mb-4 p-4 rounded-xl border border-[#281414] bg-[#120A0A]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-display font-bold text-[#918282] tracking-[0.1em] uppercase">LoRA Adaptation Weights</span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Q-projection', val: 87 },
            { label: 'V-projection', val: 73 },
            { label: 'Output', val: 61 },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="flex justify-between text-[9px] font-mono text-[#665656] mb-1">
                <span>{label}</span><span>{val}%</span>
              </div>
              <div className="h-1 bg-[#281414] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${val}%`,
                    background: `linear-gradient(90deg, #5A0B0B, #800000)`,
                    boxShadow: '0 0 6px rgba(128,0,0,0.4)',
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Scan */}
      <div className="px-4 pb-5">
        <button className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-display font-bold tracking-[0.1em]">
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} /> NEW SCAN
        </button>
      </div>
    </aside>
  );
}
