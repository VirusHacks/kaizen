"use client";

import { useState } from "react";
import { useDashboardDataContext } from "../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, DollarSign, Calendar, BarChart3, Bot, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import Chatbot from "./Chatbot";
import { Loader2 } from "lucide-react";
import { REVENUE_SYSTEM_MESSAGE } from "@/lib/ai/systemMessages";

export default function RevenueDetailPage() {
  const router = useRouter();
  const { monthlySales, aovTrend, revenueByDay, revenueByHour, revenueForecast, loading } = useDashboardDataContext();
  const [isChatbotOpen, setIsChatbotOpen] = useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // Calculate summary metrics
  const totalRevenue = monthlySales?.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0) || 0;
  const avgMonthlyRevenue = monthlySales?.length > 0 ? totalRevenue / monthlySales.length : 0;
  const peakMonth = monthlySales?.reduce((max: any, item: any) => 
    (item.revenue || 0) > (max.revenue || 0) ? item : max, monthlySales[0]
  );
  const growthRate = monthlySales && monthlySales.length >= 2
    ? ((monthlySales[monthlySales.length - 1]?.revenue || 0) - (monthlySales[0]?.revenue || 0)) / (monthlySales[0]?.revenue || 1) * 100
    : 0;

  // Combine historical and forecast data
  const forecastData = revenueForecast ? [
    ...(revenueForecast.historical || []).map((item: any) => ({
      month: item.month,
      revenue: item.value,
      type: "Historical",
    })),
    ...(revenueForecast.forecast || []).map((item: any) => ({
      month: item.month,
      revenue: item.value,
      type: "Forecast",
      yhat_lower: item.yhat_lower,
      yhat_upper: item.yhat_upper,
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
              <DollarSign className="h-8 w-8 text-purple-400" />
              Revenue Analytics
            </h1>
            <p className="text-gray-400 text-sm">
              Comprehensive revenue insights and trends
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
                <DollarSign className="h-4 w-4 text-purple-400" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-400 mb-1">${(totalRevenue / 1000).toFixed(1)}k</div>
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
              <div className="text-3xl font-bold text-purple-400 mb-1">${(avgMonthlyRevenue / 1000).toFixed(1)}k</div>
              <p className="text-xs text-gray-400">Per month</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Growth Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className={`text-3xl font-bold flex items-center gap-1 mb-1 ${growthRate >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
                <TrendingUp className={`h-5 w-5 ${growthRate >= 0 ? "text-emerald-400" : "text-red-400 rotate-180"}`} />
              </div>
              <p className="text-xs text-gray-400">Period over period</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-400" />
                Peak Month
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-400 mb-1">${peakMonth ? (peakMonth.revenue / 1000).toFixed(1) : 0}k</div>
              <p className="text-xs text-gray-400">{peakMonth?.month || "N/A"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Revenue Trend */}
        <Card className="bg-[#0a0a0a] border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              Monthly Revenue Trend
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm mt-1">Historical revenue performance over time</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={450}>
                  <AreaChart data={monthlySales || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
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
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      labelStyle={{ fontWeight: 600, marginBottom: "8px", color: "#ffffff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#a78bfa"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

        {/* Revenue Forecast */}
        {forecastData.length > 0 && (
          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                Revenue Forecast (Prophet AI)
              </CardTitle>
              <CardDescription className="text-gray-400 text-sm mt-1">AI-powered revenue predictions with confidence intervals</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={450}>
                    <AreaChart data={forecastData}>
                      <defs>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
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
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          padding: "12px",
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                        labelStyle={{ fontWeight: 600, marginBottom: "8px", color: "#ffffff" }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#a78bfa"
                        fillOpacity={1}
                        fill="url(#colorForecast)"
                        name="Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

        {/* Revenue by Day of Week and Hour - Side by Side */}
        {revenueByDay && revenueByDay.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#0a0a0a] border border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  Revenue by Day of Week
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm mt-1">Weekly revenue patterns</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.3} />
                      <XAxis
                        dataKey="day"
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
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          padding: "12px",
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                        labelStyle={{ fontWeight: 600, marginBottom: "8px", color: "#ffffff" }}
                      />
                      <Bar dataKey="revenue" fill="#a78bfa" radius={[8, 8, 0, 0]} opacity={0.9} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            {/* Revenue by Hour */}
            {revenueByHour && revenueByHour.length > 0 && (
              <Card className="bg-[#0a0a0a] border border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    Revenue by Hour of Day
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm mt-1">Hourly revenue distribution</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={revenueByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.3} />
                    <XAxis
                      dataKey="hour"
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
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      labelStyle={{ fontWeight: 600, marginBottom: "8px", color: "#ffffff" }}
                    />
                      <Bar dataKey="revenue" fill="#a78bfa" radius={[8, 8, 0, 0]} opacity={0.9} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Chatbot Sidebar - Fixed to Right */}
      {isChatbotOpen && (
        <div className="w-[28rem] flex-shrink-0">
          <div className="fixed right-0 top-0 h-screen z-50">
            <Chatbot
              systemMessage={REVENUE_SYSTEM_MESSAGE}
              contextData={{
                monthlySales,
                aovTrend,
                revenueByDay,
                revenueByHour,
                revenueForecast,
                totalRevenue,
                avgMonthlyRevenue,
                peakMonth,
                growthRate,
              }}
              pageTitle="Revenue Analytics"
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

