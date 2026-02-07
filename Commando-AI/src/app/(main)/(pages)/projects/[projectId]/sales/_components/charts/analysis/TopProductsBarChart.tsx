"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Package } from "lucide-react";

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
      <div className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 shadow-xl max-w-xs">
        <p className="font-semibold text-sm text-white mb-2 break-words">{label}</p>
        <p className="text-sm font-bold text-purple-400">{formatCurrency(value)}</p>
      </div>
    );
  }
  return null;
};

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#6366f1", "#a855f7", "#14b8a6"];

export default function TopProductsBarChart() {
  const { topProducts } = useDashboardDataContext();
  const data = topProducts || [];

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  const truncatedData = data.map((item) => ({
    ...item,
    displayName: item.product.length > 35 ? item.product.substring(0, 35) + "..." : item.product,
    fullName: item.product,
  }));

  const topProduct = data[0];
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card className="bg-[#0a0a0a] border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-400" />
              Top Products by Revenue
            </CardTitle>
            <CardDescription className="mt-1 text-gray-400 text-sm">
              {topProduct.product.length > 50 ? topProduct.product.substring(0, 50) + "..." : topProduct.product} leads with {formatCurrency(topProduct.revenue)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-black rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={truncatedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.5} />
              <XAxis 
                type="number" 
                stroke="#666"
                tick={{ fill: "#999", fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tickLine={{ stroke: "#333" }}
              />
              <YAxis 
                dataKey="displayName" 
                type="category" 
                width={180}
                stroke="#666"
                tick={{ fill: "#999", fontSize: 11 }}
                tickLine={{ stroke: "#333" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                {truncatedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

