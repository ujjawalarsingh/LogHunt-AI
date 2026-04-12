import { useState, useRef } from 'react';
import { Search, Upload, AlertTriangle, AlertCircle, Info, Activity, Clock, Shield, Database, ChevronRight, Check } from 'lucide-react';

const MOCK_LOGS = [
  { ts: '14:23:05.12', ip: '192.168.1.105', event: 'SQL Injection Attempt', type: 'ATTACK', level: 'CRITICAL' },
  { ts: '14:22:58.44', ip: '45.231.1.22',   event: 'Brute Force Detected',  type: 'ATTACK', level: 'HIGH' },
  { ts: '14:21:12.01', ip: '203.0.113.88',  event: 'Port Scan Activity',    type: 'RECON',  level: 'MEDIUM' },
  { ts: '14:19:45.33', ip: '10.0.0.12',     event: 'Unauthorized Login',    type: 'AUTH',   level: 'MEDIUM' },
  { ts: '14:18:02.99', ip: '172.16.254.1',  event: 'Anomalous Traffic Spike',type:'ANOMALY',level: 'LOW' },
  { ts: '14:16:30.11', ip: '8.8.4.4',       event: 'DNS Tunneling Detected', type:'EXFIL',  level: 'HIGH' },
  { ts: '14:14:18.55', ip: '192.168.0.250', event: 'Successful Login',       type:'AUTH',   level: 'INFO' },
];

const QUERY_MAP = {
  'failed ssh': "SELECT * FROM logs\nWHERE event = 'failed_login'\n  AND protocol = 'SSH'\n  AND time > NOW() - INTERVAL '24h'\nORDER BY time DESC\nLIMIT 100;",
  'sql injection': "SELECT * FROM logs\nWHERE event_type = 'SQL_INJECTION'\n  AND severity >= 'HIGH'\nORDER BY time DESC;",
  'brute force': "SELECT src_ip, COUNT(*) as attempts\nFROM logs\nWHERE event = 'failed_login'\n  AND time > NOW() - INTERVAL '1h'\nGROUP BY src_ip\nHAVING attempts > 5\nORDER BY attempts DESC;",
};

function LevelBadge({ level }) {
  const cls = {
    CRITICAL: 'badge-critical',
    HIGH:     'badge-high',
    MEDIUM:   'badge-medium',
    LOW:      'badge-low',
    INFO:     'badge-normal',
  }[level] || 'badge-normal';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-display font-bold tracking-[0.12em] ${cls}`}>
      {level}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent, delay }) {
  return (
    <div className={`glass rounded-2xl p-5 anim-fade-up delay-${delay}`} style={{ borderColor: accent + '22' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + '14', border: `1px solid ${accent}28` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={1.8} />
        </div>
        <span className="text-[10px] font-display text-[#665656] tracking-[0.15em] uppercase">{sub}</span>
      </div>
      <div className="font-display text-[28px] font-bold leading-none mb-1" style={{ color: accent, textShadow: `0 0 18px ${accent}55` }}>{value}</div>
      <div className="text-[12px] text-[#918282] font-medium">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [query, setQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadDone, setUploadDone] = useState(false);
  const fileRef = useRef();

  const handleAnalyze = () => {
    if (!query.trim()) return;
    setAnalyzing(true);
    setGeneratedSQL('');
    setTimeout(() => {
      const key = Object.keys(QUERY_MAP).find(k => query.toLowerCase().includes(k));
      const sql = key
        ? QUERY_MAP[key]
        : `SELECT * FROM logs\nWHERE event ILIKE '%${query.replace(/'/g, '')}%'\n  AND time > NOW() - INTERVAL '24h'\nORDER BY time DESC\nLIMIT 200;`;
      setGeneratedSQL(sql);
      setAnalyzing(false);
    }, 1400);
  };

  const handleFile = () => {
    setUploadProgress(0);
    setUploadDone(false);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) {
        clearInterval(iv);
        setUploadProgress(100);
        setTimeout(() => setUploadDone(true), 300);
      } else {
        setUploadProgress(Math.min(p, 99));
      }
    }, 120);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050303]">
      {/* ─── Header ─── */}
      <header className="shrink-0 px-8 py-4 border-b border-[#281414] bg-[#0B0707]/80 backdrop-blur flex items-center justify-between">
        <div>
          <h1 className="font-display text-[22px] font-bold text-white tracking-tight leading-none">LogHunt AI Dashboard</h1>
          <p className="text-[12px] text-[#665656] mt-1 font-medium">AI-powered threat detection · LoRA Fine-Tuned</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#665656]" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search logs..."
              className="bg-[#120A0A] border border-[#281414] rounded-lg pl-9 pr-4 py-2 text-[12px] text-[#918282] placeholder:text-[#665656] outline-none focus:border-[rgba(128,0,0,0.3)] transition-colors w-52"
            />
          </div>
          {/* Health */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#281414] bg-[#120A0A]">
            <div className="w-2 h-2 rounded-full bg-[#A39D82] relative" style={{boxShadow:'0 0 8px #A39D82'}}>
              <div className="absolute inset-0 rounded-full bg-[#A39D82] animate-ping opacity-50"></div>
            </div>
            <span className="text-[11px] font-display font-bold text-[#A39D82] tracking-[0.1em]">ACTIVE</span>
          </div>
          {/* Model badge */}
          <div className="px-3 py-2 rounded-lg border border-[rgba(128,0,0,0.18)] bg-[rgba(128,0,0,0.06)]">
            <span className="text-[10px] font-display font-bold text-[#5A0B0B] tracking-[0.1em]">LoRA-Fine-Tuned: Online</span>
          </div>
        </div>
      </header>

      {/* ─── Scrollable content ─── */}
      <main className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-3 gap-5">
          <StatCard icon={Database} label="Total Logs Analyzed" value="847,291" sub="Today" accent="#800000" delay={1} />
          <StatCard icon={AlertTriangle} label="Threats Detected" value="12" sub="Active" accent="#E31B1B" delay={2} />
          <StatCard icon={Clock} label="Avg Inference Time (LoRA)" value="78ms" sub="p95: 112ms" accent="#CC7A33" delay={3} />
        </div>

        {/* ── AI CHAT + SQL PANEL ── */}
        <div className="grid grid-cols-2 gap-5 anim-fade-up delay-3">
          {/* Chat */}
          <div className="glass rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-[#5A0B0B]" strokeWidth={1.8} />
              <span className="text-[11px] font-display font-bold text-[#918282] tracking-[0.15em] uppercase">AI Chat & Query</span>
            </div>
            <p className="text-[12px] text-[#665656] mb-4">Ask in natural language. The LoRA model translates your query to SQL.</p>
            <div className="flex gap-2 mb-2">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder='e.g. "Show failed SSH logins"'
                className="flex-1 bg-[#120A0A] border border-[#281414] rounded-xl px-4 py-3 text-[13px] text-[#F0EBEB] placeholder:text-[#665656] outline-none focus:border-[rgba(128,0,0,0.3)] transition-colors font-mono text-[12px]"
              />
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !query.trim()}
                className="btn-primary px-5 py-3 rounded-xl text-[12px] font-display font-bold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {analyzing ? (
                  <><span className="animate-spin inline-block">⟳</span> Analyzing…</>
                ) : (
                  <>Run <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} /></>
                )}
              </button>
            </div>
            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {['failed SSH logins', 'SQL injection attempts', 'brute force IPs'].map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); }}
                  className="px-2.5 py-1 rounded-md bg-[#120A0A] border border-[#281414] text-[10px] font-mono text-[#665656] hover:text-[#5A0B0B] hover:border-[rgba(128,0,0,0.2)] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Output */}
          <div className="glass rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Database className="w-4 h-4 text-[#5A0B0B]" strokeWidth={1.8} />
              <span className="text-[11px] font-display font-bold text-[#918282] tracking-[0.15em] uppercase">Generated SQL Query</span>
              {generatedSQL && (
                <span className="ml-auto text-[9px] font-display font-bold text-[#A39D82] bg-[rgba(163,157,130,0.1)] border border-[rgba(163,157,130,0.2)] px-2 py-0.5 rounded tracking-widest">READY</span>
              )}
            </div>
            <div className="flex-1 bg-[#050303] border border-[#281414] rounded-xl p-4 font-display text-[11px] leading-[1.9] min-h-[120px] relative overflow-auto">
              {analyzing && (
                <div className="flex items-center gap-2 text-[#665656]">
                  <span className="animate-pulse">▍</span> Generating query…
                </div>
              )}
              {!analyzing && !generatedSQL && (
                <span className="text-[#3D1C1C]">// SQL will appear here after analysis</span>
              )}
              {!analyzing && generatedSQL && (
                <pre className="text-[#800000] text-glow-maroon whitespace-pre-wrap">{generatedSQL}</pre>
              )}
            </div>
          </div>
        </div>

        {/* ── DROP ZONE ── */}
        <div
          className={`anim-fade-up delay-4 rounded-2xl border-2 border-dashed transition-all duration-200 p-8 text-center cursor-pointer
            ${dragOver
              ? 'border-[#800000] bg-[rgba(128,0,0,0.05)]'
              : 'border-[#281414] hover:border-[#3D1C1C] bg-[#0B0707]'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".log,.json,.pcap" className="hidden" onChange={handleFile} />
          <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center transition-all ${dragOver ? 'bg-[rgba(128,0,0,0.12)] border-[rgba(128,0,0,0.3)]' : 'bg-[#120A0A] border-[#281414]'} border`}>
            {uploadDone
              ? <Check className="w-5 h-5 text-[#A39D82]" strokeWidth={2.5} />
              : <Upload className="w-5 h-5 text-[#665656]" strokeWidth={1.8} />
            }
          </div>
          {uploadDone ? (
            <p className="text-[14px] font-semibold text-[#A39D82] mb-1">File ingested successfully!</p>
          ) : (
            <p className="text-[14px] font-semibold text-[#918282] mb-1">Drop .log, .json, or .pcap files here</p>
          )}
          <p className="text-[11px] text-[#665656]">or click to browse · Log Collection Module</p>

          {uploadProgress !== null && !uploadDone && (
            <div className="mt-5 max-w-xs mx-auto">
              <div className="h-1.5 bg-[#281414] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg, #5A0B0B, #800000)',
                    boxShadow: '0 0 10px rgba(128,0,0,0.5)',
                  }}
                ></div>
              </div>
              <p className="text-[10px] font-display text-[#665656] mt-2">{Math.round(uploadProgress)}% ingested</p>
            </div>
          )}
        </div>

        {/* ── LIVE LOG STREAM TABLE ── */}
        <div className="glass rounded-2xl overflow-hidden anim-fade-up delay-4">
          {/* Table header */}
          <div className="px-6 py-4 border-b border-[#281414] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#E31B1B] relative" style={{boxShadow:'0 0 8px #E31B1B'}}>
                <div className="absolute inset-0 rounded-full bg-[#E31B1B] animate-ping opacity-60"></div>
              </div>
              <span className="text-[11px] font-display font-bold text-white tracking-[0.15em] uppercase">Live Log Stream</span>
            </div>
            <span className="text-[10px] font-display text-[#665656] tracking-[0.1em]">{logs.length} ACTIVE INCIDENTS</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#281414]">
                  {['Timestamp', 'Source IP', 'Event Type', 'Category', 'Threat Classification'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[9px] font-display font-bold text-[#665656] tracking-[0.18em] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((row, i) => (
                  <tr key={i} className="tbl-row">
                    <td className="px-6 py-4 font-display text-[11px] text-[#665656]">{row.ts}</td>
                    <td className="px-6 py-4 font-display text-[12px] text-[#5A0B0B] font-bold">{row.ip}</td>
                    <td className="px-6 py-4 text-[13px] text-[#F0EBEB] font-medium">{row.event}</td>
                    <td className="px-6 py-4">
                      <span className="font-display text-[9px] font-bold text-[#918282] bg-[#120A0A] border border-[#281414] px-2 py-1 rounded tracking-widest">{row.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <LevelBadge level={row.level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Alerts + Distribution Row ─── */}
        <div className="grid grid-cols-3 gap-5 anim-fade-up delay-5">
          {/* Critical Alerts */}
          <div className="col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <AlertCircle className="w-4 h-4 text-[#E31B1B]" strokeWidth={1.8} />
              <span className="text-[11px] font-display font-bold text-[#918282] tracking-[0.15em] uppercase">Critical Alerts</span>
            </div>
            <div className="space-y-3">
              {[
                { icon: AlertCircle, color: '#E31B1B', bg: 'rgba(227,27,27,0.08)', border: 'rgba(227,27,27,0.2)', title: 'Database Breach Attempt', sub: 'Vector: Internal API Endpoint · 14:23 UTC' },
                { icon: AlertTriangle, color: '#CC7A33', bg: 'rgba(204,122,51,0.08)', border: 'rgba(204,122,51,0.2)', title: 'DDoS Threshold Reached', sub: 'Origin: multiple clusters (RU) · 14:21 UTC' },
                { icon: Info, color: '#5A0B0B', bg: 'rgba(128,0,0,0.06)', border: 'rgba(128,0,0,0.15)', title: 'Unusual Data Exfiltration Volume', sub: 'Destination: 45.231.0.0/16 · 14:18 UTC' },
              ].map(({ icon: Icon, color, bg, border, title, sub }, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
                    <Icon className="w-4 h-4" style={{ color }} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-white mb-0.5">{title}</div>
                    <div className="text-[11px] font-mono text-[#665656]">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threat Distribution */}
          <div className="glass rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-4 h-4 text-[#5A0B0B]" strokeWidth={1.8} />
              <span className="text-[11px] font-display font-bold text-[#918282] tracking-[0.15em] uppercase">Threat Distribution</span>
            </div>

            {/* Donut */}
            <div className="relative w-36 h-36 mx-auto mb-6">
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: 'conic-gradient(#E31B1B 0% 40%, #CC7A33 40% 74%, #A39D82 74% 100%)',
                  boxShadow: '0 0 30px rgba(227,27,27,0.15)',
                }}
              >
                <div
                  className="absolute inset-[14px] rounded-full flex flex-col items-center justify-center"
                  style={{ background: '#0B0707' }}
                >
                  <span className="font-display text-[26px] font-bold text-white leading-none">847</span>
                  <span className="text-[9px] font-display text-[#665656] tracking-[0.15em] uppercase mt-1">K Logs</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-auto">
              {[
                { label: 'Critical / High', color: '#E31B1B', pct: '40%' },
                { label: 'Medium', color: '#CC7A33', pct: '34%' },
                { label: 'Low / Info', color: '#A39D82', pct: '26%' },
              ].map(({ label, color, pct }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: color, boxShadow: `0 0 6px ${color}88` }}></div>
                    <span className="text-[12px] text-[#918282]">{label}</span>
                  </div>
                  <span className="font-display text-[12px] text-[#F0EBEB] font-bold">{pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
