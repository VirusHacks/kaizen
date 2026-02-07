"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
      <div className="bg-card border-2 border-primary/50 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{`Month: ${label}`}</p>
        <p className="text-primary font-bold text-lg">
          {`Revenue: ${formatCurrency(payload[0].value)}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function MonthlySalesTrend() {
  const [data, setData] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/analytics?type=monthly-sales")
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
          <CardTitle>Monthly Sales Trend</CardTitle>
          <CardDescription>Track your revenue growth over time</CardDescription>
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
          <CardTitle>Monthly Sales Trend</CardTitle>
          <CardDescription>Track your revenue growth over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Sales Trend</CardTitle>
        <CardDescription>
          Track your revenue growth over time • Total: {formatCurrency(totalRevenue)} • Avg: {formatCurrency(avgRevenue)}/month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-card rounded-lg p-4 border border-border">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 7, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                name="Monthly Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

