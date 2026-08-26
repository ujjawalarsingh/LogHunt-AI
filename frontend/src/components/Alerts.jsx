import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, RefreshCw, X, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getAlerts, explainAlert, recommendAlert } from '../lib/api';
import ReactMarkdown from 'react-markdown';

function fmt(ts) {
  if (!ts) return 'N/A';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function alertTypeLabel(type) {
  if (!type) return 'Unknown';
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

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters (Server-side)
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [aiData, setAiData] = useState({ explain: null, recommend: null });

  const fetchAlertsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Clean up empty filters
      const params = { limit: 500 };
      if (severityFilter) params.severity = severityFilter;
      if (typeFilter) params.alert_type = typeFilter;
      
      const res = await getAlerts(params);
      setAlerts(res.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, typeFilter]);

  useEffect(() => {
    fetchAlertsData();
  }, [fetchAlertsData]);

  // AI Actions
  const handleExplain = async () => {
    if (!selectedAlert || aiData.explain) return;
    setAiData(prev => ({ ...prev, explain: { loading: true } }));
    try {
      const res = await explainAlert(selectedAlert.id);
      setAiData(prev => ({ ...prev, explain: { loading: false, text: res.explanation } }));
    } catch (e) {
      setAiData(prev => ({ ...prev, explain: { loading: false, error: e.message } }));
    }
  };

  const handleRecommend = async () => {
    if (!selectedAlert || aiData.recommend) return;
    setAiData(prev => ({ ...prev, recommend: { loading: true } }));
    try {
      const res = await recommendAlert(selectedAlert.id);
      setAiData(prev => ({ ...prev, recommend: { loading: false, text: res.recommendation } }));
    } catch (e) {
      setAiData(prev => ({ ...prev, recommend: { loading: false, error: e.message } }));
    }
  };

  const closeDetail = () => {
    setSelectedAlert(null);
    setAiData({ explain: null, recommend: null });
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-destructive animate-spin" />
          <p className="text-sm text-muted-foreground font-display uppercase tracking-widest">Loading alerts…</p>
        </div>
      </div>
    );
  }

  if (error && alerts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-foreground">
        <Shield className="w-8 h-8 text-destructive mb-4" />
        <p className="text-sm font-semibold text-foreground">Failed to load alerts</p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchAlertsData}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground relative">
      {/* Header */}
      <header className="shrink-0 px-8 py-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-foreground">SECURITY ALERTS</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Review {alerts.length} detected incidents</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border border-border bg-background rounded-lg p-1">
             <Filter className="w-4 h-4 text-muted-foreground ml-2" />
             <select 
               className="bg-transparent text-sm text-foreground outline-none px-2 py-1 cursor-pointer border-r border-border"
               value={severityFilter}
               onChange={e => setSeverityFilter(e.target.value)}
             >
               <option value="">All Severities</option>
               <option value="critical">Critical</option>
               <option value="high">High / Error</option>
               <option value="medium">Medium / Warning</option>
               <option value="info">Info / Notice</option>
             </select>
             <select 
               className="bg-transparent text-sm text-foreground outline-none px-2 py-1 cursor-pointer"
               value={typeFilter}
               onChange={e => setTypeFilter(e.target.value)}
             >
               <option value="">All Types</option>
               <option value="brute_force">Brute Force</option>
               <option value="credential_stuffing">Credential Stuffing</option>
               <option value="privilege_escalation">Privilege Escalation</option>
             </select>
          </div>
          <button onClick={fetchAlertsData} className="p-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {alerts.length === 0 ? (
           <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center anim-fade-up max-w-2xl mx-auto mt-10">
             <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
             <p className="text-sm font-semibold text-foreground mb-1">No alerts found</p>
             <p className="text-xs text-muted-foreground">Your systems appear secure based on the current filters.</p>
           </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Alert Type</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alerts.map(alert => (
                  <tr 
                    key={alert.id} 
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedAlert(alert);
                      setAiData({ explain: null, recommend: null });
                    }}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(alert.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><SeverityBadge severity={alert.severity} /></td>
                    <td className="px-4 py-3 font-medium text-foreground">{alertTypeLabel(alert.alert_type)}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{alert.source || '-'}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {alert.confidence_score ? `${(alert.confidence_score * 100).toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-background/80 backdrop-blur-sm anim-fade-in">
          <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border-border bg-card relative">
            <Button 
              variant="ghost" 
              className="absolute right-4 top-4 w-8 h-8 p-0 rounded-full bg-muted/50 hover:bg-muted"
              onClick={closeDetail}
            >
              <X className="w-4 h-4 text-foreground" />
            </Button>
            
            <CardHeader className="border-b border-border/50 pb-4 pr-16 shrink-0">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <CardTitle className="font-display tracking-tight text-lg">Alert Detail #{selectedAlert.id}</CardTitle>
                <SeverityBadge severity={selectedAlert.severity} />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Timestamp</div>
                  <div className="text-sm font-medium">{fmt(selectedAlert.created_at)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Alert Type</div>
                  <div className="text-sm font-medium">{alertTypeLabel(selectedAlert.alert_type)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Source</div>
                  <div className="text-sm font-mono">{selectedAlert.source || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Confidence</div>
                  <div className="text-sm font-mono">
                    {selectedAlert.confidence_score ? `${(selectedAlert.confidence_score * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Triggering Log ID</div>
                  <div className="text-sm font-medium">{selectedAlert.log_id}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Description / Evidence</div>
                <div className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg border border-border/50 whitespace-pre-wrap font-mono">
                  {selectedAlert.description}
                </div>
              </div>

              {/* AI Controls */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Button onClick={handleExplain} disabled={aiData.explain?.loading || !!aiData.explain?.text} className="gap-2">
                    <Shield className="w-4 h-4" /> Explain Incident
                  </Button>
                  <Button onClick={handleRecommend} disabled={aiData.recommend?.loading || !!aiData.recommend?.text} variant="secondary" className="gap-2">
                    Recommend Mitigation
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Explain Render */}
                  {(aiData.explain?.loading || aiData.explain?.text || aiData.explain?.error) && (
                    <div className="bg-muted/20 border border-border rounded-lg p-4 anim-fade-up">
                      <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                        {aiData.explain.loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        AI Explanation
                      </h4>
                      {aiData.explain.error ? (
                         <div className="text-destructive text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {aiData.explain.error}</div>
                      ) : aiData.explain.text ? (
                        <div className="text-sm markdown-content">
                          <ReactMarkdown components={{
                            p: ({node, ...props}) => <p className="mb-2 text-foreground/90 leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 text-foreground/90" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                            code: ({node, inline, ...props}) => inline ? <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono" {...props} /> : <pre className="bg-muted p-2 rounded text-[10px] font-mono overflow-x-auto mb-2"><code {...props} /></pre>,
                          }}>
                            {aiData.explain.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Analyzing threat vectors...</div>
                      )}
                    </div>
                  )}

                  {/* Recommend Render */}
                  {(aiData.recommend?.loading || aiData.recommend?.text || aiData.recommend?.error) && (
                    <div className="bg-muted/20 border border-border rounded-lg p-4 anim-fade-up">
                      <h4 className="font-semibold text-green-500 mb-2 flex items-center gap-2">
                        {aiData.recommend.loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        Recommended Mitigation
                      </h4>
                      {aiData.recommend.error ? (
                         <div className="text-destructive text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {aiData.recommend.error}</div>
                      ) : aiData.recommend.text ? (
                        <div className="text-sm markdown-content">
                          <ReactMarkdown components={{
                            p: ({node, ...props}) => <p className="mb-2 text-foreground/90 leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 text-foreground/90" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 text-foreground/90" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-sm font-bold mt-3 mb-1 text-foreground" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-sm font-bold mt-3 mb-1 text-foreground" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-xs font-bold mt-2 mb-1 text-foreground" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                            code: ({node, inline, ...props}) => inline ? <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono" {...props} /> : <pre className="bg-muted p-2 rounded text-[10px] font-mono overflow-x-auto mb-2"><code {...props} /></pre>,
                          }}>
                            {aiData.recommend.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Generating response actions...</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
