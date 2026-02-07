"use client";

import { useDashboardDataContext } from "./DashboardDataProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import ForecastMetricsCards from "./charts/prediction/ForecastMetricsCards";
import RevenueForecastAreaChart from "./charts/prediction/RevenueForecastAreaChart";
import AOVForecastLineChart from "./charts/prediction/AOVForecastLineChart";
import OrdersForecastAreaChart from "./charts/prediction/OrdersForecastAreaChart";
import ForecastConfidenceRadial from "./charts/prediction/ForecastConfidenceRadial";
import ForecastComparisonBar from "./charts/prediction/ForecastComparisonBar";

export default function PredictionDashboard() {
  const { loading, refreshData, revenueForecast, aovForecast, ordersForecast } = useDashboardDataContext();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear forecast cache
      await fetch("/api/dashboard/forecast/refresh", { method: "POST" });
      // Refresh all data (this will trigger new forecast calculations)
      await refreshData();
    } catch (error) {
      console.error("Error refreshing forecasts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        {/* Metrics Cards Skeleton */}
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
        {[1, 2, 3].map((row) => (
          <div key={row} className={row === 3 ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
            {row === 3 ? (
              <Card className="bg-[#0a0a0a] border border-gray-800">
                <CardContent className="p-6">
                  <div className="h-[450px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              [1, 2].map((col) => (
                <Card key={col} className="bg-[#0a0a0a] border border-gray-800">
                  <CardContent className="p-6">
                    <div className="h-[450px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with Refresh and Store Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Forecast Dashboard</h2>
          <p className="text-gray-400 mt-1 text-sm">
            Prophet AI-powered predictions based on historical data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
            className="gap-2 border-purple-500/30 hover:bg-purple-500/10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Forecasts"}
          </Button>
        </div>
      </div>

      {/* Forecast Metrics Cards */}
      <ForecastMetricsCards />

      {/* Main Forecast Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueForecastAreaChart periods={6} />
        <AOVForecastLineChart periods={6} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrdersForecastAreaChart periods={6} />
        <ForecastConfidenceRadial />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ForecastComparisonBar />
      </div>
    </div>
  );
}

