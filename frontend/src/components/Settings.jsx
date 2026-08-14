import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Key, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getSettings, updateSettings } from '../lib/api';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      setConfig(res.config);
      setIsGeminiConfigured(res.is_gemini_configured);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: parseInt(value, 10) || 0
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      await updateSettings(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-spin text-primary">⟳</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      <header className="shrink-0 px-8 py-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-foreground">SETTINGS</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Configure Detection Rules & AI Integrations</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl space-y-8">
          
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* AI Configuration */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">AI Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Gemini API Key</h3>
                  <p className="text-xs text-muted-foreground">Powers the NL2SQL Query Engine and Alert Explanation features.</p>
                </div>
                <div className="flex items-center gap-2">
                  {isGeminiConfigured ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-semibold tracking-wider uppercase">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-semibold tracking-wider uppercase">Missing</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detection Rules Configuration */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Detection Engine Thresholds</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-2 gap-8 p-4 rounded-lg border border-border bg-background/50">
                <div className="col-span-2 pb-2 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Brute Force Rule</h3>
                  <p className="text-xs text-muted-foreground">Detects repeated failed logins from a single IP address.</p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Failure Threshold</label>
                  <Input 
                    type="number" 
                    name="brute_force_threshold" 
                    value={config.brute_force_threshold} 
                    onChange={handleChange}
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">Number of failed attempts required to trigger an alert.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Time Window (Minutes)</label>
                  <Input 
                    type="number" 
                    name="brute_force_window_minutes" 
                    value={config.brute_force_window_minutes} 
                    onChange={handleChange}
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">Rolling time window to observe the failures.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 p-4 rounded-lg border border-border bg-background/50">
                <div className="col-span-2 pb-2 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Credential Stuffing Rule</h3>
                  <p className="text-xs text-muted-foreground">Detects a successful login immediately following multiple failures.</p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prior Failures Threshold</label>
                  <Input 
                    type="number" 
                    name="credential_stuffing_threshold" 
                    value={config.credential_stuffing_threshold} 
                    onChange={handleChange}
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">Failed attempts required before a successful login.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Time Window (Minutes)</label>
                  <Input 
                    type="number" 
                    name="credential_stuffing_window_minutes" 
                    value={config.credential_stuffing_window_minutes} 
                    onChange={handleChange}
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">Rolling time window to observe the prior failures.</p>
                </div>
              </div>

            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            {saveSuccess && (
              <span className="text-xs font-bold text-green-500 uppercase tracking-widest flex items-center gap-2 anim-fade-up">
                <CheckCircle2 className="w-4 h-4" /> Configuration Saved
              </span>
            )}
            <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
              {saving ? <span className="animate-spin">⟳</span> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
}
