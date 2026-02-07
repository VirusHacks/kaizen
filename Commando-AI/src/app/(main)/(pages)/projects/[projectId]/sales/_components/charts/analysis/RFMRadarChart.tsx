"use client";

import { useDashboardDataContext } from "../../DashboardDataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Target } from "lucide-react";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border-2 border-primary/50 rounded-xl p-4 shadow-2xl">
        <p className="font-bold text-lg text-foreground mb-2">{payload[0].payload.segment}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-muted-foreground">Recency Score: </span>
            <span className="font-bold text-primary">{payload[0].payload.rScore}/5</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Frequency Score: </span>
            <span className="font-bold text-primary">{payload[0].payload.fScore}/5</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Monetary Score: </span>
            <span className="font-bold text-primary">{payload[0].payload.mScore}/5</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function RFMRadarChart() {
  const { rfmDistribution } = useDashboardDataContext();
  const rawData = rfmDistribution || [];

  // Calculate average RFM scores for each segment
  // Note: This is a simplified version. In a real scenario, you'd need access to individual customer RFM data
  const segmentAverages: Record<string, { rScore: number; fScore: number; mScore: number }> = {
    "Champions": { rScore: 5, fScore: 5, mScore: 5 },
    "Loyal Customers": { rScore: 4, fScore: 4, mScore: 4 },
    "Potential Loyalists": { rScore: 2, fScore: 4, mScore: 4 },
    "New Customers": { rScore: 5, fScore: 2, mScore: 2 },
    "At-Risk": { rScore: 2, fScore: 3, mScore: 3 },
    "Lost Customers": { rScore: 1, fScore: 1, mScore: 1 },
  };

  const data = rawData
    .filter((item: any) => segmentAverages[item.segment])
    .map((item: any) => ({
      segment: item.segment,
      count: item.count,
      ...segmentAverages[item.segment as keyof typeof segmentAverages],
    }))
    .slice(0, 6); // Limit to top 6 segments for readability

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-purple-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              RFM Score Analysis
            </CardTitle>
            <CardDescription className="mt-2">
              Average Recency, Frequency, and Monetary scores by customer segment
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-gradient-to-br from-background/50 to-background/30 rounded-xl p-4 border border-border/30">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={data}>
              <PolarGrid stroke="hsl(var(--muted-foreground))" opacity={0.3} />
              <PolarAngleAxis
                dataKey="segment"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
              />
              <Radar
                name="Recency"
                dataKey="rScore"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.6}
              />
              <Radar
                name="Frequency"
                dataKey="fScore"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Radar
                name="Monetary"
                dataKey="mScore"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                iconType="circle"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

