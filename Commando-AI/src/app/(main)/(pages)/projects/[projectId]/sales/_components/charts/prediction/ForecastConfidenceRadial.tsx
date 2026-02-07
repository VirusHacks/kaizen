"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Target } from "lucide-react";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-background/95 backdrop-blur-md border-2 border-purple-500/50 rounded-xl p-4 shadow-2xl">
        <p className="font-bold text-lg text-foreground mb-2">{data.name}</p>
        <p className="text-xl font-bold text-purple-400">{data.value}%</p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-sm font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ForecastConfidenceRadial() {
  const { revenueForecast } = useDashboardDataContext();
  const metrics = revenueForecast?.metrics || null;

  if (!metrics) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-purple-500/30 backdrop-blur-sm shadow-xl">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl font-bold">Forecast Confidence</CardTitle>
          <CardDescription>Model accuracy distribution</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[450px] flex items-center justify-center">
            <p className="text-muted-foreground">No metrics available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate confidence levels based on MAPE
  const mape = metrics.mape || 0;
  let confidenceLevel = "Excellent";
  let confidenceColor = "#10b981";
  let confidencePercent = 95;

  if (mape < 10) {
    confidenceLevel = "Excellent";
    confidenceColor = "#10b981";
    confidencePercent = 95;
  } else if (mape < 20) {
    confidenceLevel = "Good";
    confidenceColor = "#3b82f6";
    confidencePercent = 80;
  } else if (mape < 30) {
    confidenceLevel = "Fair";
    confidenceColor = "#f59e0b";
    confidencePercent = 65;
  } else {
    confidenceLevel = "Needs Improvement";
    confidenceColor = "#ef4444";
    confidencePercent = 50;
  }

  const data = [
    { name: "Confidence", value: confidencePercent, color: confidenceColor },
    { name: "Uncertainty", value: 100 - confidencePercent, color: "#6b7280" },
  ];

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-purple-500/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Forecast Confidence
            </CardTitle>
            <CardDescription className="mt-2">
              {confidenceLevel} • MAPE: {mape.toFixed(2)}%
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-gradient-to-br from-background/50 to-background/30 rounded-xl p-4 border border-purple-500/20">
          <ResponsiveContainer width="100%" height={450}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={140}
                fill="#8884d8"
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                iconType="circle"
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-2xl font-bold" style={{ color: confidenceColor }}>
              {confidencePercent}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Confidence Level</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

