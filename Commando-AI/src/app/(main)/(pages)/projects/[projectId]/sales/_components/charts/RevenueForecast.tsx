"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { Loader2 } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border-2 border-primary/50 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{`Month: ${label}`}</p>
        <p className={`font-bold text-lg ${data.type === 'forecast' ? 'text-purple-400' : 'text-primary'}`}>
          {`Revenue: ${formatCurrency(data.value)}`}
        </p>
        {data.type === "forecast" && (
          <div className="mt-2 space-y-1">
            <p className="text-muted-foreground text-sm">
              Upper: {formatCurrency(data.yhat_upper || data.value)}
            </p>
            <p className="text-muted-foreground text-sm">
              Lower: {formatCurrency(data.yhat_lower || data.value)}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function RevenueForecast({ periods }: { periods: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    fetch(`/api/dashboard/forecast?type=revenue&periods=${periods}`)
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          console.error("[RevenueForecast] API error:", data);
          setError(data.error || `HTTP ${res.status}: Failed to load forecast`);
          setLoading(false);
          return;
        }

        if (data.error) {
          console.error("[RevenueForecast] Forecast error:", data.error);
          setError(data.error);
          setLoading(false);
          return;
        }

        if (!data.historical || !data.forecast) {
          console.error("[RevenueForecast] Invalid data structure:", data);
          setError("Invalid forecast data format");
          setLoading(false);
          return;
        }

        if (data.historical.length === 0) {
          console.warn("[RevenueForecast] No historical data");
          setError("No historical data available");
          setLoading(false);
          return;
        }

        console.log("[RevenueForecast] Data loaded from API:", {
          historical: data.historical.length,
          forecast: data.forecast.length,
          metrics: data.metrics,
        });

        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[RevenueForecast] Fetch error:", err);
        setError(`Failed to load forecast: ${err.message}`);
        setLoading(false);
      });
  };

  // Fetch data on mount and when periods change
  useEffect(() => {
    fetchData();
  }, [periods]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast (Prophet Model)</CardTitle>
          <CardDescription>AI-powered revenue predictions using Prophet time series forecasting</CardDescription>
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
          <CardTitle>Revenue Forecast (Prophet Model)</CardTitle>
          <CardDescription>AI-powered revenue predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground text-center px-4">
              {error || data?.error || "No forecast available. Ensure Python forecast service is running."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure we have valid data
  if (!data.historical || data.historical.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast (Prophet Model)</CardTitle>
          <CardDescription>AI-powered revenue predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground text-center px-4">
              No historical data available for forecasting
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [...(data.historical || []), ...(data.forecast || [])];
  const lastHistoricalIndex = data.historical?.length || 0;
  
  // Ensure chartData is valid
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast (Prophet Model)</CardTitle>
          <CardDescription>AI-powered revenue predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground text-center px-4">
              No chart data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Revenue Forecast (Prophet Model)</CardTitle>
            <CardDescription>
              {periods}-month AI forecast • MAPE: {data.metrics?.mape?.toFixed(2) || "N/A"}% • 
              RMSE: {formatCurrency(data.metrics?.rmse || 0)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-card rounded-lg p-4 border border-border">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                </linearGradient>
              </defs>
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
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value) => <span className="text-foreground font-medium">{value}</span>}
              />
              {/* Confidence interval */}
              {data.forecast && data.forecast.length > 0 && (
                <Area
                  type="monotone"
                  dataKey="yhat_upper"
                  stroke="none"
                  fill="url(#colorForecast)"
                  data={chartData.slice(lastHistoricalIndex)}
                  connectNulls
                />
              )}
              {/* Historical line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6 }}
                name="Historical Revenue"
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
                name="Forecasted Revenue"
                data={chartData.slice(lastHistoricalIndex)}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

