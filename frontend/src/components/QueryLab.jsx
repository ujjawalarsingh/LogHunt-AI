import { useState } from 'react';
import { Activity, Database, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { runQuery } from '../lib/api';

export default function QueryLab() {
  const [query, setQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setAnalyzing(true);
    setGeneratedSQL('');
    setQueryError(null);
    setQueryResults(null);
    try {
      const res = await runQuery(query);
      setGeneratedSQL(res.sql);
      setQueryResults(res.results);
    } catch (e) {
      setQueryError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      <header className="shrink-0 px-8 py-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-foreground">SQL QUERY LAB</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Natural Language to SQL Engine</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 gap-6 anim-fade-up">
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" strokeWidth={1.8} />
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">
                  AI Threat Query Engine
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-foreground/80 mb-4">Ask in natural language to query your database.</p>
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
              <div className="flex flex-wrap gap-2 mt-auto pt-4">
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
              <div className="flex-1 bg-background border border-border rounded-lg p-4 font-mono text-[11px] leading-[1.8] min-h-[300px] flex flex-col">
                {analyzing ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground h-full min-h-[250px]">
                    <span className="animate-pulse">▍</span> Translating to SQL and querying DB…
                  </div>
                ) : queryError ? (
                  <div className="flex flex-col items-center justify-center text-center h-full min-h-[250px] text-destructive">
                    <AlertTriangle className="w-5 h-5 mb-2" />
                    <span className="font-sans font-semibold">Query Failed</span>
                    <span className="opacity-80 mt-1 max-w-sm">{queryError}</span>
                  </div>
                ) : !generatedSQL ? (
                  <div className="flex items-center justify-center h-full min-h-[250px]">
                    <span className="text-muted-foreground/50">// SQL and results will appear here</span>
                  </div>
                ) : (
                  <>
                    <pre className="text-primary whitespace-pre-wrap shrink-0 pb-3 border-b border-border/50 mb-3">{generatedSQL}</pre>
                    <div className="flex-1 overflow-auto max-h-[400px]">
                      {queryResults && queryResults.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr>
                              {Object.keys(queryResults[0]).map((k) => (
                                <th key={k} className="p-2 border-b border-border/50 text-muted-foreground font-semibold uppercase">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResults.map((r, i) => (
                              <tr key={i} className="hover:bg-muted/30">
                                {Object.values(r).map((v, j) => (
                                  <td key={j} className="p-2 border-b border-border/10 text-foreground/80 truncate max-w-[200px]" title={String(v)}>
                                    {String(v ?? 'NULL')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-muted-foreground/50 italic py-2">No rows returned.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
