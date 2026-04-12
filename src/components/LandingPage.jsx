import { useState, useEffect } from 'react';
import { Radar, Zap, Search, TrendingUp, Lock, Globe, ChevronRight, Terminal, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Terminal,
    title: 'LoRA Fine-Tuned LLM',
    desc: 'Parameter-efficient fine-tuning on cybersecurity corpora. The model adapts to your environment in real-time, not generic threat intelligence.',
    accent: '#800000',
  },
  {
    icon: Search,
    title: 'Natural Language → SQL',
    desc: 'Ask in plain English. The Text-to-SQL engine translates threat queries directly into optimized database queries across your log stores.',
    accent: '#A39D82',
  },
  {
    icon: Zap,
    title: 'Real-Time Ingestion',
    desc: 'Sub-100ms log ingestion via streaming pipeline. Drop .log, .json, or .pcap files — or connect a live endpoint via Syslog/Kafka.',
    accent: '#CC7A33',
  },
  {
    icon: Globe,
    title: 'Threat Intelligence Fusion',
    desc: 'Correlates internal telemetry with live threat feeds (VirusTotal, Shodan, MITRE ATT&CK). Context your analysts need, instantly.',
    accent: '#E31B1B',
  },
  {
    icon: TrendingUp,
    title: 'Adaptive Baselines',
    desc: 'Behavioral baselining that evolves with your network. Anomaly detection without false-positive fatigue.',
    accent: '#800000',
  },
  {
    icon: Lock,
    title: 'Air-Gap Ready',
    desc: 'All inference runs on-premises. No telemetry leaves the perimeter. SOC2 Type II controls baked in from day one.',
    accent: '#A39D82',
  },
];

const STATS = [
  { value: '< 80ms', label: 'Avg. Inference Time' },
  { value: '99.3%', label: 'Threat Detection Rate' },
  { value: '0.2%', label: 'False Positive Rate' },
  { value: '∞', label: 'Log Sources' },
];

// Typing animation hook
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
  '$ sentinel analyze --mode=deep',
  '> [INFO] LoRA weights loaded (4-bit, r=16)',
  '> [INFO] Scanning 847,291 log entries...',
  '> [WARN] Anomaly detected: 45.231.1.22',
  '> [CRIT] Brute-force pattern — SSH port 22',
  '> [INFO] SQL generated. Query dispatched.',
  '> [OK]   Report ready. 5 threats flagged.',
];

export default function LandingPage({ onEnter }) {
  const typed = useTyping(TERMINAL_LINES, 45);

  return (
    <div className="min-h-screen hero-mesh-maroon grid-pattern relative overflow-hidden">
      {/* ─── NAV ─── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-[#281414]/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[rgba(128,0,0,0.1)] border border-[rgba(128,0,0,0.2)] flex items-center justify-center">
            <Radar className="w-4 h-4 text-[#800000]" strokeWidth={2} />
          </div>
          <span className="font-display text-[15px] font-bold tracking-[0.08em] text-white">
            LOGHUNT <span className="text-[#800000]">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-[13px] text-[#918282] hover:text-white cursor-pointer transition-colors">Product</span>
          <span className="text-[13px] text-[#918282] hover:text-white cursor-pointer transition-colors">Research</span>
          <span className="text-[13px] text-[#918282] hover:text-white cursor-pointer transition-colors">Docs</span>
          <button
            onClick={onEnter}
            className="btn-primary px-5 py-2 rounded-lg text-[13px] font-semibold font-display tracking-wide"
          >
            LAUNCH DEMO
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-28 pb-20 flex items-start gap-16">
        {/* Left: Text */}
        <div className="flex-1 max-w-[580px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(128,0,0,0.2)] bg-[rgba(128,0,0,0.05)] mb-8 anim-fade-up">
            <div className="w-1.5 h-1.5 rounded-full bg-[#800000] relative pulse-dot" style={{color:'#800000'}}></div>
            <span className="text-[11px] font-display font-bold text-[#5A0B0B] tracking-[0.15em] uppercase">
              LoRA v2.1 · System Online
            </span>
          </div>

          <h1 className="font-display text-[58px] leading-[1.05] font-bold text-white mb-6 anim-fade-up delay-1" style={{letterSpacing: '-0.02em'}}>
            Threat Intelligence,<br />
            <span className="text-[#800000] text-glow-maroon">Supercharged</span><br />
            by Fine-Tuned AI
          </h1>

          <p className="text-[17px] text-[#918282] leading-relaxed mb-10 max-w-[480px] anim-fade-up delay-2">
            LogHunt AI combines a LoRA-fine-tuned language model with your security logs — delivering natural-language threat queries, real-time anomaly detection, and auto-generated SQL reports.
          </p>

          <div className="flex items-center gap-4 anim-fade-up delay-3">
            <button
              onClick={onEnter}
              className="btn-primary flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[14px] font-display font-bold tracking-wide"
            >
              OPEN DASHBOARD <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#281414] text-[14px] font-semibold text-[#918282] hover:border-[#3D1C1C] hover:text-white transition-all">
              Watch Demo <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-0 mt-16 border border-[#281414] rounded-2xl overflow-hidden anim-fade-up delay-4">
            {STATS.map((s, i) => (
              <div key={i} className={`px-5 py-5 ${i < STATS.length - 1 ? 'border-r border-[#281414]' : ''}`}>
                <div className="font-display text-[22px] font-bold text-[#800000] text-glow-maroon">{s.value}</div>
                <div className="text-[11px] text-[#665656] mt-1 font-medium uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="flex-shrink-0 w-[460px] anim-fade-up delay-2">
          <div className="rounded-2xl border border-[#281414] overflow-hidden glow-maroon bg-[#0B0707]">
            {/* Terminal title bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#120A0A] border-b border-[#281414]">
              <div className="w-3 h-3 rounded-full bg-[#E31B1B]"></div>
              <div className="w-3 h-3 rounded-full bg-[#CC7A33]"></div>
              <div className="w-3 h-3 rounded-full bg-[#A39D82]"></div>
              <span className="ml-3 text-[11px] font-display text-[#665656]">sentinel — analysis engine</span>
            </div>
            {/* Terminal body */}
            <div className="p-5 font-display text-[12px] leading-[1.9] min-h-[260px]">
              {typed.split('\n').filter(Boolean).map((line, i) => {
                let color = '#918282';
                if (line.includes('[CRIT]')) color = '#E31B1B';
                else if (line.includes('[WARN]')) color = '#CC7A33';
                else if (line.includes('[OK]')) color = '#A39D82';
                else if (line.includes('[INFO]')) color = '#5A0B0B';
                else if (line.startsWith('$')) color = '#F0EBEB';
                else if (line.startsWith('>')) color = '#918282';
                return <div key={i} style={{color}}>{line}</div>;
              })}
              <span className="inline-block w-2 h-4 bg-[#800000] cursor-blink ml-0.5 align-bottom"></span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-24 border-t border-[#281414]/40">
        <div className="mb-14 anim-fade-up">
          <p className="text-[11px] font-display font-bold text-[#5A0B0B] tracking-[0.2em] uppercase mb-3">Architecture</p>
          <h2 className="font-display text-[36px] font-bold text-white" style={{letterSpacing: '-0.02em'}}>
            Built for the modern SOC.
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={`glass rounded-2xl p-7 group cursor-default anim-fade-up delay-${i % 4 + 1}`}
                style={{ transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = f.accent + '44';
                  e.currentTarget.style.boxShadow = `0 0 24px ${f.accent}14`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: f.accent + '14', border: `1px solid ${f.accent}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color: f.accent }} strokeWidth={1.8} />
                </div>
                <h3 className="font-display text-[14px] font-bold text-white mb-2 tracking-tight">{f.title}</h3>
                <p className="text-[13px] text-[#918282] leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-28">
        <div className="glass rounded-3xl p-14 text-center" style={{ borderColor: 'rgba(128,0,0,0.12)', boxShadow: '0 0 80px rgba(128,0,0,0.05)' }}>
          <p className="text-[11px] font-display font-bold text-[#5A0B0B] tracking-[0.2em] uppercase mb-4">Ready to see it live?</p>
          <h2 className="font-display text-[40px] font-bold text-white mb-5" style={{letterSpacing:'-0.02em'}}>
            Your logs. Your model.<br />Zero compromise.
          </h2>
          <p className="text-[15px] text-[#918282] mb-10 max-w-[440px] mx-auto leading-relaxed">
            Open the dashboard and run a live threat analysis — no configuration required.
          </p>
          <button
            onClick={onEnter}
            className="btn-primary inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-[15px] font-display font-bold tracking-wide"
          >
            OPEN DASHBOARD <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#281414]/40 px-8 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <span className="font-display text-[12px] text-[#665656] tracking-widest">LOGHUNT AI © 2026</span>
        <span className="text-[12px] text-[#665656]">Hunt threats. Decode logs.</span>
      </footer>
    </div>
  );
}
