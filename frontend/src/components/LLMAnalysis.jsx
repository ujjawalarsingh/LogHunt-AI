import { useState, useEffect } from 'react';
import { Cpu, Activity, AlertTriangle, Shield, CheckCircle, Search, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getLogs, classifyLog } from '../lib/api';

export default function LLMAnalysis() {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  const [selectedLogId, setSelectedLogId] = useState(null);
  
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState(null);
  const [classificationError, setClassificationError] = useState(null);

  useEffect(() => {
    // Fetch some recent logs to populate the dropdown
    async function fetchLogs() {
      try {
        const data = await getLogs({ limit: 20 });
        // The endpoint returns { items: [...], total: ... } based on typical fastapi schemas
        // Check if data is array or object
        const items = Array.isArray(data) ? data : (data.items || data.logs || []);
        setLogs(items);
        if (items.length > 0) {
          setSelectedLogId(items[0].id);
        }
      } catch (e) {
        console.error("Failed to fetch logs for analysis", e);
      } finally {
        setLoadingLogs(false);
      }
    }
    fetchLogs();
  }, []);

  const handleClassify = async () => {
    if (!selectedLogId) return;
    
    setClassifying(true);
    setClassificationError(null);
    setClassificationResult(null);
    
    try {
      const res = await classifyLog(selectedLogId);
      setClassificationResult(res);
    } catch (e) {
      setClassificationError(e.message);
    } finally {
      setClassifying(false);
    }
  };

  const selectedLog = logs.find(l => l.id === Number(selectedLogId));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      {/* ─── Header ─── */}
      <header className="shrink-0 px-8 py-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-foreground">LLM THREAT CLASSIFIER</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Fine-Tuned LoRA Adapter · Evaluation & Live Inference</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
        
        {/* EVALUATION SECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-display font-bold uppercase tracking-widest text-foreground">Model Evaluation Results</h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-3xl">
            These metrics reflect the held-out test set performance from the Phase 6.3 training pipeline. 
            <strong> They are not live predictions.</strong> The classifier is a LoRA adapter (r=16, alpha=32) trained on 
            a subset of the CICIDS2017 dataset.
          </p>

          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-5 flex flex-col gap-1">
                <span className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">Brute Force</span>
                <span className="text-2xl font-display font-bold text-green-500">0.97 <span className="text-xs text-muted-foreground">F1</span></span>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-5 flex flex-col gap-1">
                <span className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">DoS / PortScan</span>
                <span className="text-2xl font-display font-bold text-green-500">1.00 <span className="text-xs text-muted-foreground">F1</span></span>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-5 flex flex-col gap-1">
                <span className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">Normal Traffic</span>
                <span className="text-2xl font-display font-bold text-green-500">0.97 <span className="text-xs text-muted-foreground">F1</span></span>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">SQL Injection</span>
                  <span className="bg-destructive text-destructive-foreground text-[8px] font-bold px-1.5 py-0.5 rounded">WARNING</span>
                </div>
                <span className="text-2xl font-display font-bold text-destructive">0.00 <span className="text-xs text-destructive/70">F1</span></span>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground max-w-3xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>Note on SQL Injection:</strong> The model failed to learn the SQL Injection class (scoring 0.00) because only 17 training examples were available in the CICIDS2017 dataset split. Live predictions for this class are unreliable and should be treated as informational only.
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-border/50 my-8"></div>

        {/* LIVE INFERENCE SECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-display font-bold uppercase tracking-widest text-foreground">Live Inference Playground</h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-3xl mb-6">
            Select a raw log entry from the database and pass it through the LoRA classifier to see the live prediction. 
            The system returns an "Uncertain" label if confidence falls below the internal threshold.
          </p>

          <div className="grid grid-cols-2 gap-6">
            
            {/* INPUT CARD */}
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Select Log</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                {loadingLogs ? (
                  <div className="text-xs text-muted-foreground animate-pulse">Loading logs from database...</div>
                ) : logs.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No logs found in database. Upload some logs first!</div>
                ) : (
                  <>
                    <select 
                      className="w-full bg-background border border-border rounded-md text-sm p-2 mb-4 text-foreground focus:outline-none focus:border-primary"
                      value={selectedLogId || ''}
                      onChange={(e) => setSelectedLogId(e.target.value)}
                    >
                      {logs.map(log => (
                        <option key={log.id} value={log.id}>
                          Log #{log.id} - {log.event_type || 'Unknown'} - {log.source_ip || 'N/A'}
                        </option>
                      ))}
                    </select>

                    <div className="flex-1 bg-muted/30 border border-border/50 rounded-md p-3 mb-4 font-mono text-[10px] text-muted-foreground overflow-y-auto max-h-[200px] whitespace-pre-wrap">
                      {selectedLog ? selectedLog.raw_log : "No log selected"}
                    </div>

                    <Button 
                      onClick={handleClassify} 
                      disabled={classifying || !selectedLogId} 
                      className="w-full gap-2"
                    >
                      {classifying ? (
                        <><span className="animate-spin">⟳</span> Running Inference...</>
                      ) : (
                        <><Cpu className="w-4 h-4" /> Classify Log</>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* OUTPUT CARD */}
            <Card className="flex flex-col h-full bg-card/30 border-dashed">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Model Output</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center min-h-[250px]">
                {!classificationResult && !classificationError && !classifying && (
                  <div className="text-center text-muted-foreground/50 text-xs">
                    Select a log and click classify to view results.
                  </div>
                )}
                
                {classifying && (
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Cpu className="w-8 h-8 animate-pulse text-primary/50" />
                    <span className="text-xs uppercase tracking-widest font-display">Tokenizing & predicting...</span>
                  </div>
                )}

                {classificationError && (
                  <div className="text-center text-destructive flex flex-col items-center gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-sm font-semibold">Inference Failed</span>
                    <span className="text-xs opacity-80">{classificationError}</span>
                  </div>
                )}

                {classificationResult && !classifying && (
                  <div className="flex flex-col h-full">
                    
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <div className="text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-1">Final Label</div>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${classificationResult.label === 'Uncertain' ? 'text-amber-500' : 'text-primary'}`}>
                            {classificationResult.label}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-1">Final Confidence</div>
                        <span className="text-xl font-mono text-foreground">
                          {(classificationResult.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-background/50 p-3 rounded border border-border">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Raw Prediction</div>
                        <div className="font-mono text-xs">{classificationResult.raw_prediction}</div>
                      </div>
                      <div className="bg-background/50 p-3 rounded border border-border">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Raw Confidence</div>
                        <div className="font-mono text-xs">{(classificationResult.raw_confidence * 100).toFixed(1)}%</div>
                      </div>
                    </div>

                    {classificationResult.note && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/90 p-3 rounded text-xs mb-3">
                        {classificationResult.note}
                      </div>
                    )}

                    {classificationResult.warning && (
                      <div className="bg-destructive/10 border border-destructive/20 text-destructive/90 p-3 rounded text-xs">
                        {classificationResult.warning}
                      </div>
                    )}
                    
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </section>

      </main>
    </div>
  );
}
