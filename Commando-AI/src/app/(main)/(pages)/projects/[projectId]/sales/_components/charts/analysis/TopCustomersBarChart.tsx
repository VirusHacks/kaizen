"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users } from "lucide-react";

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
        <p className="text-sm font-bold text-amber-400">{formatCurrency(value)}</p>
      </div>
    );
  }
  return null;
};

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#6366f1", "#a855f7", "#14b8a6"];

export default function TopCustomersBarChart() {
  const { topCustomers } = useDashboardDataContext();
  const router = useRouter();
  const data = topCustomers || [];

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  const chartData = data.map((item, index) => ({
    customer: `#${item.customerId}`,
    revenue: item.revenue,
    rank: index + 1,
  }));

  const topCustomer = data[0];
  const totalSpent = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card className="bg-[#0a0a0a] border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              Top Customers by Spending
            </CardTitle>
            <CardDescription className="mt-1 text-gray-400 text-sm">
              Customer #{topCustomer.customerId} leads with {formatCurrency(topCustomer.revenue)} • Total: {formatCurrency(totalSpent)}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/customers")}
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
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.5} />
              <XAxis 
                dataKey="customer" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                stroke="#666"
                tick={{ fill: "#999", fontSize: 11 }}
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
                {chartData.map((entry, index) => (
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

