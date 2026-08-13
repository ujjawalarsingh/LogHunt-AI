/* eslint-disable no-unused-vars */
import { Shield, Radar, LayoutDashboard, FileUp, BarChart2, Settings, Database, Cpu, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';


const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard },
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

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


      {/* New Scan */}
      <div className="px-4 pb-6">
        <Button className="w-full gap-2" size="lg">
          <RefreshCw className="w-4 h-4" /> NEW SCAN
        </Button>
      </div>
    </aside>
  );
}
