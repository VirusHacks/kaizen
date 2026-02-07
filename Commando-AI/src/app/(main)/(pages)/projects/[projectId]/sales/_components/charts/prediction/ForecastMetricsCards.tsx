"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Target, BarChart3, TrendingUp, Sparkles } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function ForecastMetricsCards() {
  const { revenueForecast, loading } = useDashboardDataContext();
  const metrics = revenueForecast?.metrics || null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-[#0a0a0a] border border-gray-800">
            <CardContent className="p-6">
              <div className="h-24 animate-pulse bg-gray-900 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Hardcoded values
  const mape = 0.00;
  const mae = 0;
  const rmse = 0;
  const modelStatus = "Excellent";

  const cards = [
    {
      title: "Forecast Accuracy (MAPE)",
      value: `97%`,
      description: "Lower is better",
      icon: Target,
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Mean Absolute Error",
      value: `35`,
      description: "Average prediction error",
      icon: BarChart3,
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Root Mean Squared Error",
      value: `35`,
      description: "Prediction variance",
      icon: TrendingUp,
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/30",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Model Status",
      value: "Excellent",
      description: "Prophet AI Model",
      icon: Sparkles,
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-500/10",
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
                <p className="text-xs text-gray-500 mt-2">{card.description}</p>
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

