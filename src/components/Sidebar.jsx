import { Shield, Radar, LayoutDashboard, FileUp, BarChart2, Settings, Database, Cpu, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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
    <aside className="w-[240px] shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <button
        onClick={onLanding}
        className="flex items-center gap-3 px-6 py-6 border-b border-border hover:bg-muted/50 transition-colors w-full text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Radar className="w-4 h-4 text-primary" strokeWidth={2} />
        </div>
        <div>
          <div className="font-display text-sm font-bold tracking-widest text-foreground leading-none">
            LOGHUNT <span className="text-primary">AI</span>
          </div>
          <div className="text-[9px] text-muted-foreground tracking-[0.14em] uppercase mt-1">Hunt threats. Decode logs.</div>
        </div>
      </button>

      {/* Model status pill */}
      <div className="mx-4 mt-6 mb-4">
        <Card className="bg-background/50 border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-display font-bold text-muted-foreground tracking-[0.15em] uppercase">Model Status</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]"></div>
            </div>
            <div className="text-[11px] font-display text-foreground font-bold uppercase tracking-wider">LoRA-Fine-Tuned</div>
            <div className="text-[9px] text-muted-foreground mt-1 font-mono">r=16 · α=32 · 4-bit</div>
          </CardContent>
        </Card>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ name, icon: Icon }) => {
          const active = activePage === name;
          return (
            <button
              key={name}
              onClick={() => onNavigate(name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium text-left transition-all
                ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {name}
            </button>
          );
        })}
      </nav>

      {/* LoRA Weights toggle */}
      <div className="mx-4 mb-4">
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[9px] font-display font-bold text-muted-foreground tracking-[0.15em] uppercase">LoRA Weights</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {[
              { label: 'Q-projection', val: 87 },
              { label: 'V-projection', val: 73 },
              { label: 'Output', val: 61 },
            ].map(({ label, val }) => (
              <div key={label}>
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground mb-1.5">
                  <span>{label}</span><span className="text-foreground">{val}%</span>
                </div>
                <div className="h-1 bg-background rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${val}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* New Scan */}
      <div className="px-4 pb-6">
        <Button className="w-full gap-2" size="lg">
          <RefreshCw className="w-4 h-4" /> NEW SCAN
        </Button>
      </div>
    </aside>
  );
}
