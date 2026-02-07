"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
      <div className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-sm text-white mb-2 border-b border-gray-800 pb-2">{`${label}`}</p>
        <div className="space-y-2">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-gray-400">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-purple-400">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function MonthlySalesAreaChart() {
  const { monthlySales } = useDashboardDataContext();
  const router = useRouter();
  const data = monthlySales || [];

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / data.length;
  const growth = data.length > 1 ? ((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue) * 100 : 0;

  return (
    <Card className="bg-[#0a0a0a] border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Monthly Revenue Trend
            </CardTitle>
            <CardDescription className="mt-1 text-gray-400 text-sm">
              Total: {formatCurrency(totalRevenue)} • Avg: {formatCurrency(avgRevenue)}/month
              {growth !== 0 && (
                <span className={`ml-2 ${growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {growth > 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/revenue")}
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
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
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
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#colorRevenue)"
                name="Revenue"
                dot={{ fill: "#8b5cf6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 8, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

