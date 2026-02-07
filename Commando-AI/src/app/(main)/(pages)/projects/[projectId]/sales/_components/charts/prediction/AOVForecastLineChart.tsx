"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign } from "lucide-react";

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
      <div className="bg-background/95 backdrop-blur-md border-2 border-purple-500/50 rounded-xl p-4 shadow-2xl">
        <p className="font-bold text-lg text-foreground mb-3 border-b border-border pb-2">{`Month: ${label}`}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-muted-foreground">AOV:</span>
            <span className={`text-lg font-bold ${data.type === 'forecast' ? 'text-purple-400' : 'text-primary'}`}>
              {formatCurrency(data.value)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function AOVForecastLineChart({ periods }: { periods: number }) {
  const { aovForecast } = useDashboardDataContext();
  const data = aovForecast;
  const error = aovForecast?.error || null;

  if (!data || data.error) {
    const errorMessage = error || data?.error || "No forecast available";
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-purple-500/30 backdrop-blur-sm shadow-xl">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl font-bold">AOV Forecast (Prophet AI)</CardTitle>
          <CardDescription>Average order value predictions</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[450px] flex items-center justify-center">
            <p className="text-muted-foreground text-center px-4">
              {errorMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [...(data.historical || []), ...(data.forecast || [])];
  const lastHistoricalIndex = data.historical?.length || 0;

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-purple-500/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-400" />
              AOV Forecast (Prophet AI)
            </CardTitle>
            <CardDescription className="mt-2">
              {periods}-month projection • MAPE: {data.metrics?.mape?.toFixed(2) || "N/A"}%
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-gradient-to-br from-background/50 to-background/30 rounded-xl p-4 border border-purple-500/20">
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                angle={-45}
                textAnchor="end"
                height={80}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                iconType="circle"
              />
              {/* Historical line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 8, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                name="Historical AOV"
                data={data.historical}
              />
              {/* Forecast line (dashed) */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#a78bfa"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={{ fill: "#a78bfa", r: 5, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 8, fill: "#a78bfa", stroke: "#fff", strokeWidth: 2 }}
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

