"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

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
      <div className="bg-card border-2 border-primary/50 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <p className="text-primary font-bold text-lg">
          {`Total Spent: ${formatCurrency(value)}`}
        </p>
      </div>
    );
  }
  return null;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary))",
  "hsl(var(--primary))",
  "hsl(var(--primary))",
  "hsl(var(--primary))",
];

export default function TopCustomers() {
  const [data, setData] = useState<{ customerId: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/analytics?type=top-customers")
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
          <CardTitle>Top Customers by Spending</CardTitle>
          <CardDescription>Your most valuable customers</CardDescription>
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
          <CardTitle>Top Customers by Spending</CardTitle>
          <CardDescription>Your most valuable customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    customer: `#${item.customerId}`,
    revenue: item.revenue,
    rank: index + 1,
  }));

  const topCustomer = data[0];
  const totalSpent = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Customers by Spending</CardTitle>
        <CardDescription>
          Top 10 VIP customers • Customer #{topCustomer.customerId} leads with {formatCurrency(topCustomer.revenue)} • Total: {formatCurrency(totalSpent)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-card rounded-lg p-4 border border-border">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis 
                dataKey="customer" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#8b5cf6" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

