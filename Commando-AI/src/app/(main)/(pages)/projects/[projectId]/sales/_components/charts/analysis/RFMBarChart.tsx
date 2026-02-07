"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

const COLORS = {
  "Champions": "#10b981",
  "Loyal Customers": "#3b82f6",
  "Potential Loyalists": "#f59e0b",
  "New Customers": "#8b5cf6",
  "At-Risk": "#ef4444",
  "Lost Customers": "#6b7280",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-background/95 backdrop-blur-md border-2 border-primary/50 rounded-xl p-4 shadow-2xl">
        <p className="font-bold text-lg text-foreground mb-2">{data.payload.segment}</p>
        <p className="text-xl font-bold text-primary">{data.value} customers</p>
        <p className="text-sm text-muted-foreground mt-1">
          {((data.value / data.payload.total) * 100).toFixed(1)}% of total customers
        </p>
      </div>
    );
  }
  return null;
};

export default function RFMBarChart() {
  const { rfmDistribution } = useDashboardDataContext();
  const rawData = rfmDistribution || [];
  const total = rawData.reduce((sum: number, item: any) => sum + item.count, 0);
  const data = rawData
    .map((item: any) => ({ ...item, total }))
    .sort((a: any, b: any) => b.count - a.count); // Sort by count descending

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  const totalCustomers = data.reduce((sum, item) => sum + item.count, 0);
  const largestSegment = data[0]; // Already sorted

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-blue-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              RFM Segment Comparison
            </CardTitle>
            <CardDescription className="mt-2">
              {largestSegment.segment} leads with {largestSegment.count} customers • Total: {totalCustomers} customers
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-gradient-to-br from-background/50 to-background/30 rounded-xl p-4 border border-border/30">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis
                dataKey="segment"
                angle={-45}
                textAnchor="end"
                height={100}
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.segment as keyof typeof COLORS] || "#8b5cf6"}
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

