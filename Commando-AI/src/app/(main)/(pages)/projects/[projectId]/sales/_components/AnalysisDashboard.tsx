"use client";

import { useDashboardDataContext } from "./DashboardDataProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import MonthlySalesAreaChart from "./charts/analysis/MonthlySalesAreaChart";
import AOVTrendLineChart from "./charts/analysis/AOVTrendLineChart";
import TopCountriesBarChart from "./charts/analysis/TopCountriesBarChart";
import TopProductsBarChart from "./charts/analysis/TopProductsBarChart";
import TopCustomersBarChart from "./charts/analysis/TopCustomersBarChart";
import RFMRadialChart from "./charts/analysis/RFMRadialChart";
import RFMBarChart from "./charts/analysis/RFMBarChart";
import RFMRadarChart from "./charts/analysis/RFMRadarChart";
import RevenueByDayBarChart from "./charts/analysis/RevenueByDayBarChart";
import RevenueByHourAreaChart from "./charts/analysis/RevenueByHourAreaChart";
import RevenueSummaryCards from "./charts/analysis/RevenueSummaryCards";
import DynamicChart from "./charts/DynamicChart";

export default function AnalysisDashboard() {
  const { loading, generatedCharts, removeGeneratedChart } = useDashboardDataContext();

  if (loading) {
    return (
      <div className="w-full space-y-6">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-[#0a0a0a] border border-gray-800">
              <CardContent className="p-6">
                <div className="h-24 animate-pulse bg-gray-900 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((col) => (
              <Card key={col} className="bg-[#0a0a0a] border border-gray-800">
                <CardContent className="p-6">
                  <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Summary Cards Row */}
      <RevenueSummaryCards />

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 1: Revenue Trends */}
        <MonthlySalesAreaChart />
        <AOVTrendLineChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 2: Top Performers */}
        <TopCountriesBarChart />
        <TopProductsBarChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 3: Customer Analysis */}
        <TopCustomersBarChart />
        <RFMRadialChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 3b: Additional RFM Analysis */}
        <RFMBarChart />
        <RFMRadarChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 4: Time Analysis */}
        <RevenueByDayBarChart />
        <RevenueByHourAreaChart />
      </div>

      {/* AI Generated Charts */}
      {generatedCharts && generatedCharts.length > 0 && (
        <>
          <div className="mt-8 pt-8 border-t border-border/50">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI Generated Charts
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {generatedCharts.map((chart) => (
              <DynamicChart
                key={chart.config.id}
                config={chart.config}
                data={chart.data}
                onRemove={() => removeGeneratedChart(chart.config.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

