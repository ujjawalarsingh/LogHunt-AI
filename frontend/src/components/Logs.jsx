import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Database, RefreshCw, X, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { getLogs } from '../lib/api';

function fmt(ts) {
  if (!ts) return 'N/A';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
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

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLogs({ limit: 500 });
      setLogs(res.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogsData();
  }, [fetchLogsData]);

  // Maps dropdown values to the actual DB severity strings they should match.
  // A single dropdown option can match multiple DB values (e.g. 'error' covers
  // both 'error' and 'high' in case either is stored).
  const SEVERITY_MAP = {
    all: null,
    critical: ['critical'],
    error: ['error', 'high'],
    warning: ['warning', 'medium'],
    info: ['info', 'notice', 'debug'],
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (severityFilter !== 'all') {
        const logSev = log.severity?.toLowerCase() || '';
        const allowed = SEVERITY_MAP[severityFilter] ?? [severityFilter];
        if (!allowed.includes(logSev)) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const searchable = `${log.raw_log} ${log.source_ip || ''} ${log.event_type || ''} ${log.username || ''}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [logs, searchTerm, severityFilter]);

  if (loading && logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-display uppercase tracking-widest">Loading logs…</p>
        </div>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-foreground">
        <Database className="w-8 h-8 text-destructive mb-4" />
        <p className="text-sm font-semibold text-foreground">Failed to load logs</p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchLogsData}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground relative">
      {/* Header */}
      <header className="shrink-0 px-8 py-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-foreground">LOG INVESTIGATION</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Inspect {logs.length} recently ingested events</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border border-border bg-background rounded-lg p-1">
             <Filter className="w-4 h-4 text-muted-foreground ml-2" />
             <select 
               className="bg-transparent text-sm text-foreground outline-none px-2 py-1 cursor-pointer"
               value={severityFilter}
               onChange={e => setSeverityFilter(e.target.value)}
             >
               <option value="all">All Severities</option>
               <option value="critical">Critical</option>
               <option value="error">High / Error</option>
               <option value="warning">Medium / Warning</option>
               <option value="info">Info / Notice</option>
             </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            <Input 
              type="text" 
              placeholder="Search logs..." 
              className="pl-9 w-64" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchLogsData} className="p-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {filteredLogs.length === 0 ? (
           <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center anim-fade-up max-w-2xl mx-auto mt-10">
             <Database className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
             <p className="text-sm font-semibold text-foreground mb-1">No logs found</p>
             <p className="text-xs text-muted-foreground">Adjust your filters or upload more data.</p>
           </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Event Type</th>
                  <th className="px-4 py-3 font-medium">Source IP</th>
                  <th className="px-4 py-3 font-medium">Format</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map(log => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(log.timestamp)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><SeverityBadge severity={log.severity} /></td>
                    <td className="px-4 py-3 font-medium text-foreground">{log.event_type || '-'}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{log.source_ip || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.source_format || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-background/80 backdrop-blur-sm anim-fade-in">
          <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border-border bg-card relative">
            <Button 
              variant="ghost" 
              className="absolute right-4 top-4 w-8 h-8 p-0 rounded-full bg-muted/50 hover:bg-muted"
              onClick={() => setSelectedLog(null)}
            >
              <X className="w-4 h-4 text-foreground" />
            </Button>
            
            <CardHeader className="border-b border-border/50 pb-4 pr-16">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-primary shrink-0" />
                <CardTitle className="font-display tracking-tight text-lg">Log Detail #{selectedLog.id}</CardTitle>
                <SeverityBadge severity={selectedLog.severity} />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Timestamp</div>
                  <div className="text-sm font-medium">{fmt(selectedLog.timestamp)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Event Type</div>
                  <div className="text-sm font-medium">{selectedLog.event_type || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Source IP</div>
                  <div className="text-sm font-mono">{selectedLog.source_ip || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Username</div>
                  <div className="text-sm font-mono">{selectedLog.username || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Format</div>
                  <div className="text-sm font-medium">{selectedLog.source_format || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Project ID</div>
                  <div className="text-sm font-medium">{selectedLog.project_id || 'N/A'}</div>
                </div>
              </div>

              {selectedLog.message && (
                <div className="space-y-2">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Parsed Message</div>
                  <div className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg border border-border/50">
                    {selectedLog.message}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Raw Log Payload</div>
                <pre className="text-xs font-mono text-muted-foreground bg-[#0a0a0a] p-4 rounded-lg border border-border overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.raw_log}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
