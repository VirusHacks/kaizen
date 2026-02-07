"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar } from "lucide-react";

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
        <p className="text-sm font-bold text-cyan-400">{formatCurrency(value)}</p>
      </div>
    );
  }
  return null;
};

export default function RevenueByDayBarChart() {
  const { revenueByDay } = useDashboardDataContext();
  const data = revenueByDay || [];

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  const bestDay = data.reduce((max, item) => item.revenue > max.revenue ? item : max, data[0]);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / data.length;

  return (
    <Card className="bg-[#0a0a0a] border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              Revenue by Day of Week
            </CardTitle>
            <CardDescription className="mt-1 text-gray-400 text-sm">
              {bestDay.day} is best ({formatCurrency(bestDay.revenue)}) • Average: {formatCurrency(avgRevenue)}/day
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-black rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.5} />
              <XAxis 
                dataKey="day" 
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
                tickLine={{ stroke: "#333" }}
              />
              <YAxis 
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tickLine={{ stroke: "#333" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.day === bestDay.day ? "#06b6d4" : "#06b6d4"}
                    opacity={entry.day === bestDay.day ? 1 : 0.7}
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

