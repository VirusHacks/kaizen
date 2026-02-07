"use client";

import { useState } from "react";
import { useDashboardDataContext } from "../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, TrendingUp, Package, BarChart3, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import Chatbot from "./Chatbot";
import { Loader2 } from "lucide-react";
import { ORDERS_SYSTEM_MESSAGE } from "@/lib/ai/systemMessages";

export default function OrdersDetailPage() {
  const router = useRouter();
  const { monthlySales, aovTrend, ordersForecast, loading } = useDashboardDataContext();
  const [isChatbotOpen, setIsChatbotOpen] = useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // Calculate order metrics from revenue and AOV
  const orderData = monthlySales?.map((sales: any, index: number) => {
    const aov = aovTrend?.[index]?.aov || 0;
    const orders = aov > 0 ? Math.round(sales.revenue / aov) : 0;
    return {
      month: sales.month,
      orders,
      revenue: sales.revenue,
      aov,
    };
  }) || [];

  const totalOrders = orderData.reduce((sum, item) => sum + item.orders, 0);
  const avgOrdersPerMonth = orderData.length > 0 ? totalOrders / orderData.length : 0;
  const peakOrders = orderData.reduce((max, item) => 
    item.orders > max.orders ? item : max, orderData[0] || { orders: 0, month: "" }
  );
  const avgAOV = aovTrend && aovTrend.length > 0
    ? aovTrend.reduce((sum: number, item: any) => sum + (item.aov || 0), 0) / aovTrend.length
    : 0;

  // Combine historical and forecast data for orders
  const forecastData = ordersForecast ? [
    ...(ordersForecast.historical || []).map((item: any) => ({
      month: item.month,
      orders: item.value,
      type: "Historical",
    })),
    ...(ordersForecast.forecast || []).map((item: any) => ({
      month: item.month,
      orders: item.value,
      type: "Forecast",
    })),
  ] : [];

  return (
    <div className="w-full min-h-screen bg-black space-y-8 pb-12">
      {/* Minimal Header */}
      <div className="relative">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="hover:bg-gray-900 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <ShoppingCart className="h-8 w-8 text-purple-400" />
              Orders Analytics
            </h1>
            <p className="text-gray-400 text-sm">
              Comprehensive order volume insights and trends
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-purple-400" />
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-400 mb-1">{totalOrders.toLocaleString()}</div>
              <p className="text-xs text-gray-400">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                Avg Monthly
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-400 mb-1">{Math.round(avgOrdersPerMonth).toLocaleString()}</div>
              <p className="text-xs text-gray-400">Per month</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Peak Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{peakOrders.orders.toLocaleString()}</div>
              <p className="text-xs text-gray-400">{peakOrders.month || "N/A"}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-400" />
                Avg Order Value
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                ${aovTrend && aovTrend.length > 0
                  ? (aovTrend.reduce((sum: number, item: any) => sum + (item.aov || 0), 0) / aovTrend.length).toFixed(0)
                  : 0}
              </div>
              <p className="text-xs text-gray-400">Per order</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Orders Trend */}
        <Card className="bg-[#0a0a0a] border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              Monthly Orders Trend
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm mt-1">Historical order volume over time</CardDescription>
          </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={450}>
                    <AreaChart data={orderData}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      stroke="#4b5563"
                      tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "#374151" }}
                      axisLine={{ stroke: "#374151" }}
                    />
                    <YAxis
                      stroke="#4b5563"
                      tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "#374151" }}
                      axisLine={{ stroke: "#374151" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                      formatter={(value: number) => [value.toLocaleString(), "Orders"]}
                      labelStyle={{ fontWeight: 600, marginBottom: "8px", color: "#ffffff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#a78bfa"
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                  </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        {/* Orders Forecast */}
        {forecastData.length > 0 && (
          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                Orders Forecast (Prophet AI)
              </CardTitle>
              <CardDescription className="text-gray-400 text-sm mt-1">AI-powered order volume predictions</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={450}>
                    <AreaChart data={forecastData}>
                      <defs>
                        <linearGradient id="colorOrdersForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.3} />
                      <XAxis
                        dataKey="month"
                        stroke="#4b5563"
                        tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                        tickLine={{ stroke: "#374151" }}
                        axisLine={{ stroke: "#374151" }}
                      />
                      <YAxis
                        stroke="#4b5563"
                        tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                        tickLine={{ stroke: "#374151" }}
                        axisLine={{ stroke: "#374151" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          padding: "12px",
                        }}
                        formatter={(value: number) => [value.toLocaleString(), "Orders"]}
                        labelStyle={{ fontWeight: 600, marginBottom: "8px", color: "#ffffff" }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="orders"
                        stroke="#a78bfa"
                        fillOpacity={1}
                        fill="url(#colorOrdersForecast)"
                        name="Orders"
                      />
                    </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Orders vs Revenue Correlation */}
        <Card className="bg-[#0a0a0a] border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-400" />
              Orders vs Revenue Correlation
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm mt-1">Relationship between order volume and revenue</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={450}>
                    <LineChart data={orderData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      stroke="#4b5563"
                      tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "#374151" }}
                      axisLine={{ stroke: "#374151" }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#4b5563"
                      tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "#374151" }}
                      axisLine={{ stroke: "#374151" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#4b5563"
                      tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "#374151" }}
                      axisLine={{ stroke: "#374151" }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                      labelStyle={{ fontWeight: 600, marginBottom: "8px", color: "#ffffff" }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="orders"
                      stroke="#a78bfa"
                      name="Orders"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      name="Revenue"
                    />
                  </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chatbot Sidebar - Fixed to Right */}
      {isChatbotOpen && (
        <div className="w-[28rem] flex-shrink-0">
          <div className="fixed right-0 top-0 h-screen z-50">
            <Chatbot
              systemMessage={ORDERS_SYSTEM_MESSAGE}
              contextData={{
                orderData,
                monthlySales,
                aovTrend,
                ordersForecast,
                totalOrders,
                avgOrdersPerMonth,
                peakOrders,
                avgAOV,
              }}
              pageTitle="Orders Analytics"
              isOpen={isChatbotOpen}
              onClose={() => setIsChatbotOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Floating Chat Button - Show when chatbot is closed */}
      {!isChatbotOpen && (
        <Button
          onClick={() => setIsChatbotOpen(true)}
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-[#0a0a0a] border border-gray-700 text-white hover:bg-gray-900 hover:border-purple-500/50 z-40 transition-all"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}

