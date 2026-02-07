"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

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
    const value = payload[0].value as number;
    return (
      <div className="bg-card border-2 border-primary/50 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <p className="text-primary font-bold text-lg">
          {`Revenue: ${formatCurrency(value)}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function RevenueByHour() {
  const [data, setData] = useState<{ hour: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/analytics?type=revenue-by-hour")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Hour of Day</CardTitle>
          <CardDescription>Find peak shopping hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Hour of Day</CardTitle>
          <CardDescription>Find peak shopping hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    hour: `${String(item.hour).padStart(2, "0")}:00`,
    hourLabel: item.hour < 12 ? `${item.hour} AM` : item.hour === 12 ? "12 PM" : `${item.hour - 12} PM`,
    revenue: item.revenue,
    hourNum: item.hour,
  }));

  const bestHour = data.reduce((max, item) => item.revenue > max.revenue ? item : max, data[0]);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Hour of Day</CardTitle>
        <CardDescription>
          Peak shopping times • Best hour: {String(bestHour.hour).padStart(2, "0")}:00 ({formatCurrency(bestHour.revenue)}) • Total: {formatCurrency(totalRevenue)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-card rounded-lg p-4 border border-border">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis 
                dataKey="hour" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 500 }}
                interval={1}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.hourNum === bestHour.hour ? "#8b5cf6" : "#a78bfa"}
                    opacity={entry.hourNum === bestHour.hour ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

