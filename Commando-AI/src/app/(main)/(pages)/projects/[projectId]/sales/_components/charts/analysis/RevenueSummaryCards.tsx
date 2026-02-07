"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function RevenueSummaryCards() {
  const { monthlySales, aovTrend, topCustomers, loading } = useDashboardDataContext();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-[#0a0a0a] border border-gray-800">
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-gray-900 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalRevenue = (monthlySales || []).reduce((sum: number, item: any) => sum + item.revenue, 0);
  const avgAOV = (aovTrend || []).length > 0 
    ? (aovTrend || []).reduce((sum: number, item: any) => sum + item.aov, 0) / (aovTrend || []).length 
    : 0;
  const totalOrders = Math.round(totalRevenue / (avgAOV || 1));
  const totalCustomers = (topCustomers || []).length;

  const stats = { totalRevenue, totalOrders, avgAOV, totalCustomers };

  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Average Order Value",
      value: formatCurrency(stats.avgAOV),
      icon: TrendingUp,
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/30",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      iconColor: "text-pink-400",
      borderColor: "border-pink-500/30",
      bgColor: "bg-pink-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={`bg-[#0a0a0a] border ${card.borderColor} hover:border-opacity-60 transition-all duration-300`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-400 mb-2">{card.title}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
              <div className={`${card.iconColor} ${card.bgColor} p-3 rounded-lg`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

