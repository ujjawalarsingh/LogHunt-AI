import { useState, useEffect } from 'react';
import { Radar, Zap, Search, TrendingUp, Lock, Globe, ChevronRight, Terminal, ArrowRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const FEATURES = [
  {
    icon: Terminal,
    title: 'LoRA Fine-Tuned LLM',
    desc: 'Parameter-efficient fine-tuning on cybersecurity corpora. The model adapts to your environment in real-time.',
    accentCls: 'text-primary',
    bgCls: 'bg-primary/10',
    borderCls: 'border-primary/20 hover:border-primary/50'
  },
  {
    icon: Search,
    title: 'Natural Language → SQL',
    desc: 'Ask in plain English. Translates threat queries directly into optimized database queries.',
    accentCls: 'text-amber-500',
    bgCls: 'bg-amber-500/10',
    borderCls: 'border-amber-500/20 hover:border-amber-500/50'
  },
  {
    icon: Zap,
    title: 'Real-Time Ingestion',
    desc: 'Sub-100ms log ingestion via streaming pipeline. Drop files or connect a live endpoint.',
    accentCls: 'text-primary',
    bgCls: 'bg-primary/10',
    borderCls: 'border-primary/20 hover:border-primary/50'
  },
  {
    icon: Globe,
    title: 'Threat Intelligence Fusion',
    desc: 'Correlates internal telemetry with live threat feeds. Context your analysts need, instantly.',
    accentCls: 'text-destructive',
    bgCls: 'bg-destructive/10',
    borderCls: 'border-destructive/20 hover:border-destructive/50'
  },
  {
    icon: TrendingUp,
    title: 'Adaptive Baselines',
    desc: 'Behavioral baselining that evolves with your network. Anomaly detection without false-positive fatigue.',
    accentCls: 'text-primary',
    bgCls: 'bg-primary/10',
    borderCls: 'border-primary/20 hover:border-primary/50'
  },
  {
    icon: Lock,
    title: 'Air-Gap Ready',
    desc: 'All inference runs on-premises. No telemetry leaves the perimeter. SOC2 Type II controls baked in.',
    accentCls: 'text-green-500',
    bgCls: 'bg-green-500/10',
    borderCls: 'border-green-500/20 hover:border-green-500/50'
  },
];

const STATS = [
  { value: '< 80ms', label: 'Avg. Inference Time' },
  { value: '99.3%', label: 'Threat Detection Rate' },
  { value: '0.2%', label: 'False Positive Rate' },
  { value: '∞', label: 'Log Sources' },
];

function useTyping(lines, speed = 55) {
  const [display, setDisplay] = useState('');
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (lineIdx >= lines.length) return;
    if (charIdx < lines[lineIdx].length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), speed + Math.random() * 30);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDisplay(d => d + lines[lineIdx] + '\n');
        setLineIdx(i => i + 1);
        setCharIdx(0);
      }, 380);
      return () => clearTimeout(t);
    }
  }, [charIdx, lineIdx, lines, speed]);

  const current = lineIdx < lines.length ? lines[lineIdx].slice(0, charIdx) : '';
  return display + current;
}

const TERMINAL_LINES = [
  '$ SENTINEL ANALYZE --MODE=DEEP',
  '> [INFO] LORA WEIGHTS LOADED (4-BIT, R=16)',
  '> [INFO] SCANNING 847,291 LOG ENTRIES...',
  '> [WARN] ANOMALY DETECTED: 45.231.1.22',
  '> [CRIT] BRUTE-FORCE PATTERN — SSH PORT 22',
  '> [INFO] SQL GENERATED. QUERY DISPATCHED.',
  '> [OK]   REPORT READY. 5 THREATS FLAGGED.',
];

export default function LandingPage({ onEnter }) {
  const typed = useTyping(TERMINAL_LINES, 45);

  return (
    <div className="min-h-screen bg-background hero-mesh grid-pattern relative overflow-hidden text-foreground">
      {/* ─── NAV ─── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Radar className="w-4 h-4 text-primary" strokeWidth={2} />
          </div>
          <span className="font-display text-[15px] font-bold tracking-[0.08em]">
            LOGHUNT <span className="text-primary">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-[13px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors font-medium">Product</span>
          <span className="text-[13px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors font-medium">Research</span>
          <span className="text-[13px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors font-medium">Docs</span>
          <Button onClick={onEnter}>
            LAUNCH DEMO
          </Button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-28 pb-20 flex items-start gap-16">
        <div className="flex-1 max-w-[580px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8 anim-fade-up">
            <div className="w-1.5 h-1.5 rounded-full bg-primary relative pulse-dot"></div>
            <span className="text-[11px] font-display font-bold text-primary tracking-[0.15em] uppercase">
              LoRA v2.1 · System Online
            </span>
          </div>

          <h1 className="font-display text-[56px] leading-[1.05] font-semibold mb-6 anim-fade-up delay-1 tracking-tight uppercase">
            THREAT INTELLIGENCE,<br />
            <span className="text-primary text-glow-cyan">SUPERCHARGED</span><br />
            BY FINE-TUNED AI
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-[480px] anim-fade-up delay-2">
            LogHunt AI combines a LoRA-fine-tuned language model with your security logs — delivering natural-language threat queries, real-time anomaly detection, and auto-generated SQL reports.
          </p>

          <div className="flex items-center gap-4 anim-fade-up delay-3">
            <Button onClick={onEnter} size="lg" className="h-12 px-8 text-[14px] gap-2">
              OPEN DASHBOARD <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-[14px] gap-2 border-border text-muted-foreground">
              Watch Demo <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-0 mt-16 border border-border rounded-xl bg-card/30 backdrop-blur-sm overflow-hidden anim-fade-up delay-4">
            {STATS.map((s, i) => (
              <div key={i} className={`px-5 py-5 ${i < STATS.length - 1 ? 'border-r border-border' : ''}`}>
                <div className="font-display text-xl font-bold text-primary text-glow-cyan">{s.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="flex-shrink-0 w-[460px] anim-fade-up delay-2">
          <Card
            className="overflow-hidden border-border shadow-2xl"
            style={{ backgroundColor: 'rgba(15, 18, 24, 0.65)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-3 text-[11px] font-display text-muted-foreground uppercase tracking-wider">LOGHUNT AI — analysis engine</span>
            </div>
            <div className="p-5 font-mono text-xs leading-[2] min-h-[260px]">
              {typed.split('\n').filter(Boolean).map((line, i) => {
                let colorCls = 'text-muted-foreground';
                if (line.includes('[CRIT]')) colorCls = 'text-destructive';
                else if (line.includes('[WARN]')) colorCls = 'text-amber-500';
                else if (line.includes('[OK]')) colorCls = 'text-green-500';
                else if (line.includes('[INFO]')) colorCls = 'text-primary';
                else if (line.startsWith('$')) colorCls = 'text-foreground font-bold';

                return <div key={i} className={colorCls}>{line}</div>;
              })}
              <span className="inline-block w-2 h-4 bg-primary cursor-blink ml-0.5 align-bottom"></span>
            </div>
          </Card>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-24 border-t border-border/40">
        <div className="mb-14 anim-fade-up">
          <p className="text-[11px] font-display font-bold text-primary tracking-[0.2em] uppercase mb-3">Architecture</p>
          <h2 className="font-display text-4xl font-bold ">
            BUILT FOR THE MODERN SOC.
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card
                key={i}
                className={`anim-fade-up delay-${i % 4 + 1} transition-colors ${f.borderCls}`}
                style={{ backgroundColor: 'rgba(18, 22, 28, 0.7)', backdropFilter: 'blur(12px)' }}
              >
                <CardContent className="p-7 pt-7">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-5 border ${f.bgCls} border-current/20 ${f.accentCls}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-28">
        <Card
          className="p-16 text-center border-primary/20 shadow-[0_4px_40px_rgba(78,205,196,0.05)]"
          style={{ backgroundColor: 'rgba(9, 9, 11, 0.15)', backdropFilter: 'blur(40px)' }}
        >
          <p className="text-[11px] font-display font-bold text-primary tracking-[0.2em] uppercase mb-4">Ready to see it live?</p>
          <h2 className="font-display text-4xl font-bold mb-7 tracking-tight">
            YOUR LOGS. YOUR MODEL.<br />ZERO COMPROMISE.
          </h2>
          <p className="text-base text-muted-foreground mb-10 max-w-[440px] mx-auto">
            Open the dashboard and run a live threat analysis — no configuration required.
          </p>
          <Button onClick={onEnter} size="lg" className="h-14 px-10 text-[15px] gap-3">
            OPEN DASHBOARD <ArrowRight className="w-5 h-5" />
          </Button>
        </Card>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 px-8 py-8 flex items-center justify-between max-w-7xl mx-auto">
        <span className="font-display text-xs text-muted-foreground tracking-widest font-bold">LOGHUNT AI © 2026</span>
        <span className="font-display text-xs text-muted-foreground tracking-widest uppercase">Hunt threats. Decode logs.</span>
      </footer>
    </div>
  );
}
