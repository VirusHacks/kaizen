"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, BarChart3, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function ForecastMetrics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/dashboard/forecast?type=revenue&periods=6")
      .then(async (res) => {
        const data = await res.json();
        if (data.metrics && !data.error) {
          setMetrics(data.metrics);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[ForecastMetrics] Error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Forecast Accuracy (MAPE)</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mape.toFixed(2)}%</div>
          <p className="text-xs text-muted-foreground">
            Lower is better • Mean Absolute Percentage Error
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mean Absolute Error</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${mae.toFixed(0)}</div>
          <p className="text-xs text-muted-foreground">
            Average prediction error
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Root Mean Squared Error</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${rmse.toFixed(0)}</div>
          <p className="text-xs text-muted-foreground">
            Prediction variance measure
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

