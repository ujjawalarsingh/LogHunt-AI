import { useState, useEffect } from 'react';
import { BarChart2, PieChart as PieChartIcon, Activity, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { getDashboard } from '../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const dashData = await getDashboard();
        setData(dashData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-spin text-primary">⟳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-destructive">
        Error loading analytics: {error}
      </div>
    );
  }

  // Format data for charts
  const formatLabel = (str) => {
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const typeData = Object.entries(data?.alerts_by_type || {}).map(([key, val]) => ({
    name: formatLabel(key),
    count: val
  }));

  const timeData = Object.entries(data?.alerts_over_time || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      date: key,
      count: val
    }));

  const severityData = Object.entries(data?.alerts_by_severity || {}).map(([key, val]) => ({
    name: key.toUpperCase(),
    count: val
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="text-muted-foreground mb-1">{label}</p>
          <p className="text-foreground font-bold">{payload[0].value} alerts</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      <header className="shrink-0 px-8 py-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-foreground">ANALYTICS</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Historical Trends & Aggregate Data</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        
        {data?.total_alerts === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-card/30 border border-dashed rounded-xl">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mb-4" />
            <h3 className="text-sm font-semibold">No alerts data available</h3>
            <p className="text-xs text-muted-foreground mt-1">Upload logs to generate alerts and populate charts.</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top Row: Types and Severity */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Alerts by Type</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="#2dd4bf" radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-amber-500" />
                    <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Severity Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="40%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="count"
                          stroke="none"
                          isAnimationActive={false}
                        >
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          iconType="square"
                          iconSize={10}
                          formatter={(value, entry) => (
                            <span style={{ color: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}>
                              {entry.payload.name} ({entry.payload.count})
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row: Over Time */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <CardTitle className="text-[11px] font-display text-muted-foreground tracking-[0.15em] uppercase">Alerts Over Time</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#2dd4bf" strokeWidth={3} dot={{ fill: '#09090b', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>
        )}
      </main>
    </div>
  );
}
