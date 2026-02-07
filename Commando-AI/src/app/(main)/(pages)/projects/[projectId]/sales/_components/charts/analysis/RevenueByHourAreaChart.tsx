"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Clock } from "lucide-react";

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
      <div className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-sm text-white mb-2">{label}</p>
        <p className="text-sm font-bold text-indigo-400">{formatCurrency(value)}</p>
      </div>
    );
  }
  return null;
};

export default function RevenueByHourAreaChart() {
  const { revenueByHour } = useDashboardDataContext();
  const data = revenueByHour || [];

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  const chartData = data.map((item) => ({
    hour: `${String(item.hour).padStart(2, "0")}:00`,
    revenue: item.revenue,
    hourNum: item.hour,
  }));

  const bestHour = data.reduce((max, item) => item.revenue > max.revenue ? item : max, data[0]);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card className="bg-[#0a0a0a] border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-400" />
              Revenue by Hour of Day
            </CardTitle>
            <CardDescription className="mt-1 text-gray-400 text-sm">
              Best hour: {String(bestHour.hour).padStart(2, "0")}:00 ({formatCurrency(bestHour.revenue)}) • Total: {formatCurrency(totalRevenue)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-black rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
              <defs>
                <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.5} />
              <XAxis 
                dataKey="hour" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                stroke="#666"
                tick={{ fill: "#999", fontSize: 10 }}
                tickLine={{ stroke: "#333" }}
                interval={1}
              />
              <YAxis 
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tickLine={{ stroke: "#333" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: "#999", fontSize: "12px" }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#colorHour)"
                name="Revenue"
                dot={{ fill: "#6366f1", r: 4, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

