import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Upload, AlertTriangle, AlertCircle, Activity, Shield, Database, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getDashboard, uploadFile, explainAlert } from '../lib/api';



// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return 'N/A';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function alertTypeLabel(type) {
  return {
    brute_force: 'Brute Force',
    credential_stuffing: 'Credential Stuffing',
    privilege_escalation: 'Privilege Escalation',
  }[type] ?? type;
}

function SeverityBadge({ severity }) {
  const v = {
    critical: 'critical',
    error: 'high',
    warning: 'medium',
    info: 'info',
    notice: 'info',
    debug: 'low',
  }[severity?.toLowerCase()] || 'default';
  return <Badge variant={v}>{severity?.toUpperCase() ?? 'UNKNOWN'}</Badge>;
}

function StatCard({ icon: Icon, label, value, sub, delay, colorCls }) {
  return (
    <Card className={`anim-fade-up delay-${delay}`}>
      <CardContent className="p-5 pt-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-background/50 border border-border">
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


// ─── Main Component ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [dragOver, setDragOver] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const [alertExplanations, setAlertExplanations] = useState({});

  const fileRef = useRef();

  // ── Fetch dashboard data ──
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getDashboard();
      setDashData(data);
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Upload handler ──
  const handleFile = async (input) => {
    const file = input?.target?.files ? input.target.files[0] : input;
    if (!file) return;

    setUploadProgress(10);
    setUploadDone(false);
    setUploadError(null);
    setUploadResult(null);

    try {
      setUploadProgress(40);
      const result = await uploadFile(file);
      setUploadProgress(100);
      setUploadResult(result);
      setTimeout(() => setUploadDone(true), 300);
      // Re-fetch so all numbers update immediately
      await fetchDashboard();
    } catch (e) {
      setUploadError(e.message);
      setUploadProgress(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── AI Explanation ──
  const handleExplain = async (alertId) => {
    if (alertExplanations[alertId]) {
      // Toggle off if already open
      setAlertExplanations(prev => {
        const next = { ...prev };
        delete next[alertId];
        return next;
      });
      return;
    }

    setAlertExplanations(prev => ({
      ...prev,
      [alertId]: { loading: true }
    }));

    try {
      const res = await explainAlert(alertId);
      setAlertExplanations(prev => ({
        ...prev,
        [alertId]: { loading: false, text: res.explanation }
      }));
    } catch (e) {
      setAlertExplanations(prev => ({
        ...prev,
        [alertId]: { loading: false, error: e.message }
      }));
    }
  };

  // ── Derived values from dashboard data ──

  const totalLogs = dashData?.total_logs ?? 0;
  const totalAlerts = dashData?.total_alerts ?? 0;
  const alertsByType = dashData?.alerts_by_type ?? {};
  const alertsBySeverity = dashData?.alerts_by_severity ?? {};
  const recentAlerts = dashData?.recent_alerts ?? [];

  const criticalCount = alertsBySeverity['critical'] ?? 0;
  const allTypeLabels = Object.keys(alertsByType);

  // Donut chart percentages from alert type breakdown
  const typeColors = {
    brute_force: 'var(--color-destructive)',
    credential_stuffing: '#f59e0b',
    privilege_escalation: 'var(--color-primary)',
  };
  const buildDonutGradient = () => {
    if (!totalAlerts) return 'conic-gradient(var(--color-border) 0% 100%)';
    let offset = 0;
    const segments = allTypeLabels.map((t) => {
      const pct = Math.round(((alertsByType[t] ?? 0) / totalAlerts) * 100);
      const color = typeColors[t] ?? '#888';
      const seg = `${color} ${offset}% ${offset + pct}%`;
      offset += pct;
      return seg;
    });
    if (offset < 100) segments.push(`var(--color-border) ${offset}% 100%`);
    return `conic-gradient(${segments.join(', ')})`;
  };

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-display uppercase tracking-widest">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <p className="text-sm font-semibold text-foreground">Could not reach backend</p>
          <p className="text-xs text-muted-foreground">{fetchError}</p>
          <Button onClick={fetchDashboard} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = totalLogs === 0 && totalAlerts === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      {/* ─── Header ─── */}
      <header className="shrink-0 px-8 py-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-foreground">LOGHUNT AI DASHBOARD</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">AI-powered threat detection · Rule Engine Active</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            <Input type="text" placeholder="Search logs…" className="pl-9 w-64" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background">
            <div className="w-2 h-2 rounded-full bg-green-500 relative">
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50"></div>
            </div>
            <span className="text-[11px] font-display font-bold text-green-500 tracking-[0.1em] uppercase">Active</span>
          </div>
          <button
            onClick={fetchDashboard}
            className="p-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto px-8 py-8 space-y-8">

        {/* EMPTY STATE BANNER */}
        {isEmpty && (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center anim-fade-up">
            <Database className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No data yet</p>
            <p className="text-xs text-muted-foreground">Upload a log file below to start seeing real detections.</p>
          </div>
        )}

        {/* STAT CARDS */}
        <div className="grid grid-cols-3 gap-6">
          <StatCard
            icon={Database}
            label="Total Logs Ingested"
            value={totalLogs.toLocaleString()}
            sub="All Time"
            delay={1}
            colorCls="text-primary"
          />
          <StatCard
            icon={AlertTriangle}
            label="Alerts Detected"
            value={totalAlerts.toLocaleString()}
            sub="Rule Engine"
            delay={2}
            colorCls="text-destructive"
          />
          <StatCard
            icon={Shield}
            label="Critical Severity Alerts"
            value={criticalCount.toLocaleString()}
            sub="Critical"
            delay={3}
            colorCls="text-amber-500"
          />
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
            {uploadError
              ? 'Upload failed — try again'
              : uploadDone
              ? 'File ingested successfully!'
              : 'Drop .log, .json, or .pcap files here'}
          </h3>
          {uploadError ? (
            <p className="text-sm text-destructive">{uploadError}</p>
          ) : (
            <p className="text-sm text-muted-foreground">or click to browse · Secure Log Collection Module</p>
          )}

          {uploadResult && uploadDone && (
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-[11px] font-mono text-muted-foreground">
              <span>Format: <span className="text-primary font-bold">{uploadResult.format_detected}</span></span>
              <span>Total lines: <span className="text-foreground font-bold">{uploadResult.total_lines}</span></span>
              <span>Parsed: <span className="text-green-500 font-bold">{uploadResult.parsed_successfully}</span></span>
              {uploadResult.failed_lines > 0 && (
                <span>Failed: <span className="text-destructive font-bold">{uploadResult.failed_lines}</span></span>
              )}
            </div>
          )}

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

        {/* RECENT ALERTS */}
        <div className="grid grid-cols-3 gap-6 anim-fade-up delay-5">
          <Card className="col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Recent Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">
                    No alerts yet — upload and run the detection engine to see results here.
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex flex-col p-4 rounded-lg border border-border">
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-background/50">
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{alertTypeLabel(alert.alert_type)}</span>
                            <SeverityBadge severity={alert.severity} />
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">{alert.description}</div>
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(alert.created_at)} · Log #{alert.log_id}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExplain(alert.id)} className="shrink-0 text-xs h-7 px-3">
                          {alertExplanations[alert.id] ? 'Close' : 'Explain'}
                        </Button>
                      </div>

                      {alertExplanations[alert.id] && (
                        <div className="mt-3 pt-3 border-t border-border/50 text-sm anim-fade-up">
                          {alertExplanations[alert.id].loading ? (
                            <div className="flex items-center gap-2 text-muted-foreground py-2">
                              <span className="animate-spin">⟳</span> Analyzing incident with AI...
                            </div>
                          ) : alertExplanations[alert.id].error ? (
                            <div className="text-destructive flex items-center gap-2 py-2">
                              <AlertTriangle className="w-4 h-4" />
                              {alertExplanations[alert.id].error}
                            </div>
                          ) : (
                            <div className="text-foreground/90 leading-relaxed space-y-2 whitespace-pre-wrap font-sans text-xs">
                              {alertExplanations[alert.id].text}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))

                )}
              </div>
            </CardContent>
          </Card>

          {/* ALERT TYPE DISTRIBUTION */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Alert Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-4">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: buildDonutGradient(),
                    boxShadow: totalAlerts > 0 ? '0 0 40px rgba(239,68,68,0.1)' : 'none',
                  }}
                >
                  <div className="absolute inset-[12px] rounded-full flex flex-col items-center justify-center bg-card">
                    <span className="font-display text-3xl font-bold text-foreground leading-none">{totalAlerts}</span>
                    <span className="text-[9px] font-display text-muted-foreground tracking-[0.15em] uppercase mt-1">Alerts</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {allTypeLabels.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">No alerts yet</p>
                ) : (
                  allTypeLabels.map((type) => {
                    const count = alertsByType[type];
                    const pct = totalAlerts ? `${Math.round((count / totalAlerts) * 100)}%` : '0%';
                    const color = typeColors[type] ?? '#888';
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                          <span className="text-xs text-muted-foreground">{alertTypeLabel(type)}</span>
                        </div>
                        <span className="font-display text-xs text-foreground font-bold">{pct}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
