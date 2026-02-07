"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
    return (
      <div className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-sm text-white mb-2 border-b border-gray-800 pb-2">{`Month: ${label}`}</p>
        <div className="space-y-2">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-gray-400">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-blue-400">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function AOVTrendLineChart() {
  const { aovTrend } = useDashboardDataContext();
  const router = useRouter();
  const data = aovTrend || [];

  // Don't render if no data
  if (data.length === 0) {
    return (
      <Card className="bg-[#0a0a0a] border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-lg font-semibold text-white">Average Order Value Trend</CardTitle>
          <CardDescription className="text-gray-400 text-sm">Customer spending patterns</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-gray-500">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgAOV = data.reduce((sum, item) => sum + item.aov, 0) / data.length;
  const maxAOV = Math.max(...data.map(item => item.aov));
  const minAOV = Math.min(...data.map(item => item.aov));

  return (
    <Card className="bg-[#0a0a0a] border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-white">
              Average Order Value Trend
            </CardTitle>
            <CardDescription className="mt-1 text-gray-400 text-sm">
              Average: {formatCurrency(avgAOV)} • Range: {formatCurrency(minAOV)} - {formatCurrency(maxAOV)}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/orders")}
            className="ml-4 border-purple-500/30 hover:bg-purple-500/10"
          >
            View Details
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-black rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.5} />
              <XAxis 
                dataKey="month" 
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
                tickLine={{ stroke: "#333" }}
              />
              <YAxis 
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tickLine={{ stroke: "#333" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: "#999", fontSize: "12px" }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="aov"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 8, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                name="Average Order Value"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

