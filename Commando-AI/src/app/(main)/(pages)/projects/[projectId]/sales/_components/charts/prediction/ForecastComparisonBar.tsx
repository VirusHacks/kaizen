"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

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
    return (
      <div className="bg-background/95 backdrop-blur-md border-2 border-purple-500/50 rounded-xl p-4 shadow-2xl">
        <p className="font-bold text-lg text-foreground mb-3 border-b border-border pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {item.dataKey === "revenue" ? formatCurrency(item.value) : Math.round(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function ForecastComparisonBar() {
  const { revenueForecast, ordersForecast } = useDashboardDataContext();

  if (!revenueForecast || !ordersForecast || revenueForecast.error || ordersForecast.error) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-purple-500/30 backdrop-blur-sm shadow-xl">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl font-bold">Historical vs Forecast Comparison</CardTitle>
          <CardDescription>Side-by-side comparison</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[450px] flex items-center justify-center">
            <p className="text-muted-foreground">No comparison data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get last 3 months of historical and first 3 months of forecast
  const revenueHistorical = revenueForecast.historical?.slice(-3) || [];
  const revenueForecastData = revenueForecast.forecast?.slice(0, 3) || [];
  const ordersHistorical = ordersForecast.historical?.slice(-3) || [];
  const ordersForecastData = ordersForecast.forecast?.slice(0, 3) || [];

  // Combine data
  const comparisonData = [];
  const maxLength = Math.max(
    revenueHistorical.length,
    revenueForecastData.length,
    ordersHistorical.length,
    ordersForecastData.length
  );

  for (let i = 0; i < maxLength; i++) {
    comparisonData.push({
      month: revenueForecastData[i]?.month || revenueHistorical[i]?.month || `Month ${i + 1}`,
      historicalRevenue: revenueHistorical[i]?.value || 0,
      forecastRevenue: revenueForecastData[i]?.value || 0,
      historicalOrders: ordersHistorical[i]?.value || 0,
      forecastOrders: ordersForecastData[i]?.value || 0,
    });
  }

  const data = comparisonData;

  if (!data || data.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-purple-500/30 backdrop-blur-sm shadow-xl">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl font-bold">Historical vs Forecast Comparison</CardTitle>
          <CardDescription>Side-by-side comparison</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[450px] flex items-center justify-center">
            <p className="text-muted-foreground">No comparison data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-purple-500/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Historical vs Forecast Comparison
            </CardTitle>
            <CardDescription className="mt-2">
              Compare recent performance with predicted values
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-gradient-to-br from-background/50 to-background/30 rounded-xl p-4 border border-purple-500/20">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis 
                dataKey="month" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                yAxisId="left"
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                iconType="circle"
              />
              <Bar yAxisId="left" dataKey="historicalRevenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Historical Revenue" />
              <Bar yAxisId="left" dataKey="forecastRevenue" fill="#a78bfa" radius={[8, 8, 0, 0]} name="Forecast Revenue" />
              <Bar yAxisId="right" dataKey="historicalOrders" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Historical Orders" />
              <Bar yAxisId="right" dataKey="forecastOrders" fill="#60a5fa" radius={[8, 8, 0, 0]} name="Forecast Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

