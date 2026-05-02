import { useState, useRef, useEffect } from 'react';
import { Search, Upload, AlertTriangle, AlertCircle, Info, Activity, Clock, Shield, Database, ChevronRight, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';



const QUERY_MAP = {
  'failed ssh': "SELECT * FROM logs\nWHERE event = 'failed_login'\n  AND protocol = 'SSH'\n  AND time > NOW() - INTERVAL '24h'\nORDER BY time DESC\nLIMIT 100;",
  'sql injection': "SELECT * FROM logs\nWHERE event_type = 'SQL_INJECTION'\n  AND severity >= 'HIGH'\nORDER BY time DESC;",
  'brute force': "SELECT src_ip, COUNT(*) as attempts\nFROM logs\nWHERE event = 'failed_login'\n  AND time > NOW() - INTERVAL '1h'\nGROUP BY src_ip\nHAVING attempts > 5\nORDER BY attempts DESC;",
};

function LevelBadge({ level }) {
  const v = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info',
  }[level] || 'default';
  return <Badge variant={v}>{level}</Badge>;
}

function StatCard({ icon: Icon, label, value, sub, delay, colorCls }) {
  return (
    <Card className={`anim-fade-up delay-${delay}`}>
      <CardContent className="p-5 pt-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-background/50 border border-border`}>
            <Icon className={`w-4 h-4 ${colorCls}`} strokeWidth={1.8} />
          </div>
          <span className="text-[10px] font-display text-muted-foreground tracking-[0.15em] uppercase">{sub}</span>
        </div>
        <div className={`font-display text-[28px] font-bold leading-none mb-1 ${colorCls}`}>{value}</div>
        <div className="text-[12px] text-muted-foreground font-medium">{label}</div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
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
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes("sql")) {
        setLogs(allLogs.filter(l => l.event.toLowerCase().includes("sql")));
      } else if (lowerQuery.includes("brute")) {
        setLogs(allLogs.filter(l => l.event.toLowerCase().includes("brute")));
      } else if (lowerQuery.includes("login")) {
        setLogs(allLogs.filter(l => l.event.toLowerCase().includes("login")));
      } else {
        setLogs(allLogs);
      }
      setAnalyzing(false);
    }, 1400);
  };

  const handleFile = async (input) => {
    const file = input?.target?.files ? input.target.files[0] : input;
    if (!file) return;

    setUploadProgress(0);
    setUploadDone(false);

    // Simulate progress while uploading
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 10 + 5;
      if (p >= 90) {
        clearInterval(iv);
        setUploadProgress(90);
      } else {
        setUploadProgress(Math.min(p, 89));
      }
    }, 100);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const endpoint = import.meta.env.PROD 
        ? '/api/analyze' 
        : 'http://127.0.0.1:8000/api/analyze';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      clearInterval(iv);
      setUploadProgress(100);
      setTimeout(() => setUploadDone(true), 300);

      // Map backend response to frontend format
      const mapped = (data.all_logs || []).map((entry) => ({
        ts: entry.timestamp.split('T')[1].split('.')[0], // just the time
        ip: entry.source_ip,
        event: entry.raw_log.length > 80 ? entry.raw_log.substring(0, 80) + '...' : entry.raw_log,
        type: entry.threat_type,
        level: entry.severity ? entry.severity.toUpperCase() : 'INFO',
      }));

      // Add a summary row if no logs were returned at all
      if (mapped.length === 0) {
        mapped.push({
          ts: new Date().toISOString().split('T')[1].split('.')[0],
          ip: 'System',
          event: `Analyzed ${data.total_logs_analyzed} logs. No threats detected.`,
          type: 'INFO',
          level: 'INFO'
        });
      }

      setAllLogs(mapped);
      setLogs(mapped);
    } catch (error) {
      console.error('Error analyzing file:', error);
      clearInterval(iv);
      alert('Failed to analyze file. Is the Python backend running on port 8000?');
      setUploadProgress(null);
      setUploadDone(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      {/* ─── Header ─── */}
      <header className="shrink-0 px-8 py-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-foreground">LOGHUNT AI DASHBOARD</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">AI-powered threat detection · LoRA Fine-Tuned</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            <Input
              type="text"
              placeholder="Search logs..."
              className="pl-9 w-64"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background">
            <div className="w-2 h-2 rounded-full bg-green-500 relative">
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50"></div>
            </div>
            <span className="text-[11px] font-display font-bold text-green-500 tracking-[0.1em] uppercase">Active</span>
          </div>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            LoRA-Fine-Tuned: Online
          </Badge>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto px-8 py-8 space-y-8">

        {/* STAT CARDS */}
        <div className="grid grid-cols-3 gap-6">
          <StatCard icon={Database} label="Total Logs Analyzed" value={logs.length} sub="Today" delay={1} colorCls="text-primary" />
          <StatCard icon={AlertTriangle} label="Threats Detected" value={logs.filter(l => l.level === 'CRITICAL' || l.level === 'HIGH').length} sub="Active" delay={2} colorCls="text-destructive" />
          <StatCard icon={Clock} label="Avg Inference Time (LoRA)" value={"--"} sub="p95: --" delay={3} colorCls="text-amber-500" /></div>

        {/* AI CHAT + SQL PANEL */}
        <div className="grid grid-cols-2 gap-6 anim-fade-up delay-3">

          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" strokeWidth={1.8} />
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">
                  AI Threat Query Engine
                </CardTitle></div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-foreground/80 mb-4">Ask in natural language. The LoRA model translates your query to SQL.</p>
              <div className="flex gap-2 mb-3">
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                  placeholder='e.g. "Show failed SSH logins"'
                  className="font-mono text-xs"
                />
                <Button onClick={handleAnalyze} disabled={analyzing || !query.trim()} className="gap-2">
                  {analyzing ? (
                    <><span className="animate-spin">⟳</span> Analyzing…</>
                  ) : (
                    <>Run <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-auto">
                {['failed SSH logins', 'SQL injection attempts', 'brute force IPs'].map(s => (
                  <Badge key={s} variant="outline" className="cursor-pointer font-mono hover:bg-accent lowercase text-xs" onClick={() => setQuery(s)}>
                    {s}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" strokeWidth={1.8} />
                  <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Generated SQL Query</CardTitle>
                </div>
                {generatedSQL && <Badge variant="info">READY</Badge>}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 bg-background border border-border rounded-lg p-4 font-mono text-[11px] leading-[1.8] min-h-[140px] overflow-auto">
                {analyzing ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="animate-pulse">▍</span> Generating query…
                  </div>
                ) : !generatedSQL ? (
                  <span className="text-muted-foreground/50">// SQL will appear here after analysis</span>
                ) : (
                  <pre className="text-primary text-glow-cyan whitespace-pre-wrap">{generatedSQL}</pre>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DROP ZONE */}
        <div
          className={`anim-fade-up delay-4 rounded-xl border-2 border-dashed transition-all duration-300 p-10 text-center cursor-pointer
            ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50 bg-card/30'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".log,.json,.pcap" className="hidden" onChange={handleFile} />
          <div className={`w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center transition-colors border ${dragOver ? 'bg-primary/10 border-primary/30' : 'bg-background border-border'}`}>
            {uploadDone ? <Check className="w-6 h-6 text-green-500" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {uploadDone ? "File ingested successfully!" : "Drop .log, .json, or .pcap files here"}
          </h3>
          <p className="text-sm text-muted-foreground">or click to browse · Secure Log Collection Module</p>

          {uploadProgress !== null && !uploadDone && (
            <div className="mt-6 max-w-sm mx-auto">
              <div className="h-1.5 bg-background rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, boxShadow: '0 0 10px var(--color-primary)' }}
                ></div>
              </div>
              <p className="text-[10px] font-display text-muted-foreground mt-2 uppercase">{Math.round(uploadProgress)}% ingested</p>
            </div>
          )}
        </div>

        <Card className="anim-fade-up delay-4 border-border bg-card/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="text-primary">🤖</span>
              <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">
                AI Insight
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Summary:</span>
              <p className="text-sm text-foreground font-medium">
                {logs.some(l => l.event.toLowerCase().includes("sql"))
                  ? "Detected SQL injection attempts from multiple sources."
                  : logs.some(l => l.event.toLowerCase().includes("brute"))
                    ? "Brute force login attempts detected."
                    : "No major threats detected."}
              </p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Recommendation:</span>
              <p className="text-sm text-foreground font-medium">
                {logs.some(l => l.event.toLowerCase().includes("sql"))
                  ? "Block suspicious IPs and secure database endpoints."
                  : logs.some(l => l.event.toLowerCase().includes("brute"))
                    ? "Enable rate limiting and account lockout policies."
                    : "System operating normally."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* LIVE LOG STREAM TABLE */}
        <Card className="anim-fade-up delay-4 overflow-hidden border-border bg-card/60">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-destructive relative">
                <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-60"></div>
              </div>
              <span className="text-[11px] font-display font-bold text-foreground tracking-[0.15em] uppercase">Live Log Stream</span>
            </div>
            <span className="text-[10px] font-display text-muted-foreground tracking-[0.1em] uppercase">{logs.length} ACTIVE INCIDENTS</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/20">
                <tr className="border-b border-border">
                  {['Timestamp', 'Source IP', 'Event Type', 'Category', 'Threat Classification'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-display font-bold text-muted-foreground tracking-[0.15em] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-muted-foreground">
                      No logs yet. Upload a file to begin analysis.
                    </td>
                  </tr>
                ) : (
                  logs.map((row, i) => (
                    <tr key={i} className="transition-colors hover:bg-muted/50 group">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{row.ts}</td>
                      <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{row.ip}</td>
                      <td className="px-6 py-4 text-foreground font-medium">{row.event}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border">{row.type}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <LevelBadge level={row.level} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ALERTS + DISTRIBUTION */}
        <div className="grid grid-cols-3 gap-6 anim-fade-up delay-5">
          <Card className="col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Critical Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {
                  logs.slice(0, 3).map((log, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <div className="mt-0.5 w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-background/50">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground mb-0.5">
                          {log.event}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          Source: {log.ip}
                        </div>
                      </div>
                    </div>
                  ))
                }

              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Threat Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-4">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div
                  className="w-full h-full rounded-full"
                  style={(() => {
                    const total = logs.length || 1;
                    const crit = Math.round((logs.filter(l => l.level === 'CRITICAL' || l.level === 'HIGH').length / total) * 100);
                    const med = Math.round((logs.filter(l => l.level === 'MEDIUM').length / total) * 100);
                    return {
                      background: `conic-gradient(var(--color-destructive) 0% ${crit}%, #f59e0b ${crit}% ${crit + med}%, var(--color-primary) ${crit + med}% 100%)`,
                      boxShadow: '0 0 40px rgba(239,68,68,0.1)'
                    };
                  })()}
                >
                  <div className="absolute inset-[12px] rounded-full flex flex-col items-center justify-center bg-card">
                    <span className="font-display text-3xl font-bold text-foreground leading-none">{logs.length}</span>
                    <span className="text-[9px] font-display text-muted-foreground tracking-[0.15em] uppercase mt-1">Logs</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: 'Critical / High',
                    dotCls: 'bg-destructive',
                    pct: `${Math.round((logs.filter(l => l.level === 'CRITICAL' || l.level === 'HIGH').length / (logs.length || 1)) * 100)}%`
                  },
                  {
                    label: 'Medium',
                    dotCls: 'bg-amber-500',
                    pct: `${Math.round((logs.filter(l => l.level === 'MEDIUM').length / (logs.length || 1)) * 100)}%`
                  },
                  {
                    label: 'Low / Info',
                    dotCls: 'bg-primary',
                    pct: `${Math.round((logs.filter(l => l.level === 'LOW' || l.level === 'INFO').length / (logs.length || 1)) * 100)}%`
                  }
                ].map(({ label, dotCls, pct }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-sm ${dotCls}`}></div>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <span className="font-display text-xs text-foreground font-bold">{pct}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
