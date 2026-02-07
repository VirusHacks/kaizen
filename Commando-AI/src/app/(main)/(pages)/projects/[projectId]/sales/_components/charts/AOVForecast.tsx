"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border-2 border-primary/50 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{`Month: ${label}`}</p>
        <p className={`font-bold text-lg ${data.type === 'forecast' ? 'text-purple-400' : 'text-primary'}`}>
          {`AOV: ${formatCurrency(data.value)}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function AOVForecast({ periods }: { periods: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    fetch(`/api/dashboard/forecast?type=aov&periods=${periods}`)
      .then(async (res) => {
        const data = await res.json();
        
        if (!res.ok || data.error) {
          console.error("[AOVForecast] Error:", data.error || `HTTP ${res.status}`);
          setError(data.error || "Failed to load forecast");
          setLoading(false);
          return;
        }
        
        if (!data.historical || !data.forecast) {
          setError("Invalid forecast data format");
          setLoading(false);
          return;
        }
        
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[AOVForecast] Fetch error:", err);
        setError(`Failed to load forecast: ${err.message}`);
        setLoading(false);
      });
  }, [periods]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AOV Forecast (Prophet Model)</CardTitle>
          <CardDescription>AI-powered average order value predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || data.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AOV Forecast (Prophet Model)</CardTitle>
          <CardDescription>AI-powered average order value predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground text-center px-4">
              {error || data?.error || "No forecast available"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [...(data.historical || []), ...(data.forecast || [])];
  const lastHistoricalIndex = data.historical?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>AOV Forecast (Prophet Model)</CardTitle>
        <CardDescription>
          {periods}-month AI forecast • MAPE: {data.metrics?.mape?.toFixed(2) || "N/A"}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-card rounded-lg p-4 border border-border">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value) => <span className="text-foreground font-medium">{value}</span>}
              />
              {/* Historical line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6 }}
                name="Historical AOV"
                data={data.historical}
              />
              {/* Forecast line (dashed) */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#a78bfa"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={{ fill: "#a78bfa", r: 4 }}
                name="Forecasted AOV"
                data={chartData.slice(lastHistoricalIndex)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

