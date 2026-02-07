"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value as number;
    return (
      <div className="bg-card border-2 border-primary/50 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <p className="text-primary font-bold text-lg">
          {`${value} ${value === 1 ? 'Customer' : 'Customers'}`}
        </p>
      </div>
    );
  }
  return null;
};

const getSegmentColor = (segment: string) => {
  const colors: Record<string, string> = {
    "Champions": "#10b981", // Bright Green
    "Loyal Customers": "#3b82f6", // Bright Blue
    "Potential Loyalists": "#f59e0b", // Bright Yellow/Orange
    "New Customers": "#8b5cf6", // Purple
    "At-Risk": "#ef4444", // Bright Red
    "Lost Customers": "#6b7280", // Gray
  };
  return colors[segment] || "#8b5cf6";
};

export default function RFMDistribution() {
  const [data, setData] = useState<{ segment: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/analytics?type=rfm-distribution")
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
          <CardTitle>RFM Customer Segmentation</CardTitle>
          <CardDescription>Understand your customer base by behavior</CardDescription>
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
          <CardTitle>RFM Customer Segmentation</CardTitle>
          <CardDescription>Understand your customer base by behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCustomers = data.reduce((sum, item) => sum + item.count, 0);
  const largestSegment = data.reduce((max, item) => item.count > max.count ? item : max, data[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>RFM Customer Segmentation</CardTitle>
        <CardDescription>
          Customer distribution by segment • {largestSegment.segment} is largest ({largestSegment.count} customers) • Total: {totalCustomers} customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-card rounded-lg p-4 border border-border">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis 
                dataKey="segment" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSegmentColor(entry.segment)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

