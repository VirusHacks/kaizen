"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Users } from "lucide-react";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-sm text-white mb-2">{data.name}</p>
        <p className="text-sm font-bold text-pink-400">{data.value} customers</p>
        <p className="text-xs text-gray-400 mt-1">
          {((data.value / data.payload.total) * 100).toFixed(1)}% of total
        </p>
      </div>
    );
  }
  return null;
};

const COLORS = {
  "Champions": "#10b981",
  "Loyal Customers": "#3b82f6",
  "Potential Loyalists": "#f59e0b",
  "New Customers": "#8b5cf6",
  "At-Risk": "#ef4444",
  "Lost Customers": "#6b7280",
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
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function RFMRadialChart() {
  const { rfmDistribution } = useDashboardDataContext();
  const rawData = rfmDistribution || [];
  const total = rawData.reduce((sum: number, item: any) => sum + item.count, 0);
  const data = rawData.map((item: any) => ({ ...item, total }));

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  const totalCustomers = data.reduce((sum, item) => sum + item.count, 0);
  const largestSegment = data.reduce((max, item) => item.count > max.count ? item : max, data[0]);

  return (
    <Card className="bg-[#0a0a0a] border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-400" />
              RFM Customer Segmentation
            </CardTitle>
            <CardDescription className="mt-1 text-gray-400 text-sm">
              {largestSegment.segment} is largest ({largestSegment.count} customers) • Total: {totalCustomers} customers
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-black rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.segment as keyof typeof COLORS] || "#8b5cf6"} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: "#999", fontSize: "12px" }}
                iconType="circle"
                formatter={(value) => <span className="text-gray-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

