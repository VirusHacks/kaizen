"use client";

import { ChartConfig } from "@/lib/charts/chartConfigSchema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

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
    return (
      <div className="bg-background/95 backdrop-blur-md border-2 border-primary/50 rounded-xl p-4 shadow-2xl">
        <p className="font-bold text-lg text-foreground mb-3 border-b border-border pb-2">{`${label}`}</p>
        <div className="space-y-2">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {typeof item.value === "number" && item.value > 1000
                  ? formatCurrency(item.value)
                  : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface DynamicChartProps {
  config: ChartConfig;
  data: any[];
  onRemove?: () => void;
  compact?: boolean;
}

export default function DynamicChart({ config, data, onRemove, compact = false }: DynamicChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 backdrop-blur-sm shadow-xl">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl font-bold">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    switch (config.type) {
      case "radar":
        // Radar chart for multi-dimensional data (e.g., RFM scores)
        return (
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(var(--muted-foreground))" opacity={0.3} />
            <PolarAngleAxis
              dataKey={config.dataMapping.xAxis}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
            />
            {config.dataMapping.series && config.dataMapping.series.length > 0 ? (
              config.dataMapping.series.map((seriesKey: string, index: number) => (
                <Radar
                  key={seriesKey}
                  name={seriesKey}
                  dataKey={seriesKey}
                  stroke={config.styling.colors?.[index] || config.styling.color}
                  fill={config.styling.colors?.[index] || config.styling.color}
                  fillOpacity={0.6}
                />
              ))
            ) : (
              <Radar
                name={config.dataMapping.yAxis}
                dataKey={config.dataMapping.yAxis}
                stroke={config.styling.color}
                fill={config.styling.color}
                fillOpacity={0.6}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {config.styling.showLegend && (
              <Legend
                wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                iconType="circle"
              />
            )}
          </RadarChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            {config.styling.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            )}
            <XAxis
              dataKey={config.dataMapping.xAxis}
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickFormatter={(value) => (value > 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`)}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            {config.styling.showLegend && (
              <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} iconType="circle" />
            )}
            <Bar dataKey={config.dataMapping.yAxis} fill={config.styling.color} radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={config.styling.colors?.[index % config.styling.colors.length] || config.styling.color} />
              ))}
            </Bar>
          </BarChart>
        );

      case "line":
        return (
          <LineChart {...commonProps}>
            {config.styling.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            )}
            <XAxis
              dataKey={config.dataMapping.xAxis}
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickFormatter={(value) => (value > 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`)}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            {config.styling.showLegend && (
              <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} iconType="circle" />
            )}
            <Line
              type="monotone"
              dataKey={config.dataMapping.yAxis}
              stroke={config.styling.color}
              strokeWidth={3}
              dot={{ fill: config.styling.color, r: 5, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 8, fill: config.styling.color, stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`colorArea-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.styling.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={config.styling.color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            {config.styling.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            )}
            <XAxis
              dataKey={config.dataMapping.xAxis}
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickFormatter={(value) => (value > 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`)}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            {config.styling.showLegend && (
              <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} iconType="circle" />
            )}
            <Area
              type="monotone"
              dataKey={config.dataMapping.yAxis}
              stroke={config.styling.color}
              strokeWidth={3}
              fill={`url(#colorArea-${config.id})`}
              dot={{ fill: config.styling.color, r: 5, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 8, fill: config.styling.color, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey={config.dataMapping.yAxis}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={config.styling.colors?.[index % config.styling.colors.length] || config.styling.color}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {config.styling.showLegend && (
              <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} iconType="circle" />
            )}
          </PieChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            {config.styling.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            )}
            <XAxis
              dataKey={config.dataMapping.xAxis}
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            {config.styling.showLegend && (
              <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} iconType="circle" />
            )}
            <Scatter dataKey={config.dataMapping.yAxis} fill={config.styling.color} />
          </ScatterChart>
        );

      case "composed":
        return (
          <ComposedChart {...commonProps}>
            {config.styling.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            )}
            <XAxis
              dataKey={config.dataMapping.xAxis}
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
              tickFormatter={(value) => (value > 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`)}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            {config.styling.showLegend && (
              <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} iconType="circle" />
            )}
            <Bar dataKey={config.dataMapping.yAxis} fill={config.styling.color} radius={[8, 8, 0, 0]} />
            <Line
              type="monotone"
              dataKey={config.dataMapping.yAxis}
              stroke={config.styling.colors?.[1] || "#3b82f6"}
              strokeWidth={2}
            />
          </ComposedChart>
        );

      case "radial":
        // Check if we have multiple series for radar chart, otherwise use radial bar
        if (config.dataMapping.series && config.dataMapping.series.length > 0) {
          // Radar chart for multi-dimensional data (e.g., RFM scores)
          return (
            <RadarChart data={data}>
              <PolarGrid stroke="hsl(var(--muted-foreground))" opacity={0.3} />
              <PolarAngleAxis
                dataKey={config.dataMapping.xAxis}
                tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
              />
              {config.dataMapping.series.map((seriesKey: string, index: number) => (
                <Radar
                  key={seriesKey}
                  name={seriesKey}
                  dataKey={seriesKey}
                  stroke={config.styling.colors?.[index] || config.styling.color}
                  fill={config.styling.colors?.[index] || config.styling.color}
                  fillOpacity={0.6}
                />
              ))}
              <Tooltip content={<CustomTooltip />} />
              {config.styling.showLegend && (
                <Legend
                  wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  iconType="circle"
                />
              )}
            </RadarChart>
          );
        }
        // Radial bar chart for single series
        return (
          <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={data}>
            <RadialBar
              dataKey={config.dataMapping.yAxis}
              cornerRadius={10}
              fill={config.styling.color}
            />
            <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} iconType="circle" />
            <Tooltip content={<CustomTooltip />} />
          </RadialBarChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Unsupported chart type: {config.type}</p>
          </div>
        );
    }
  };

  if (compact) {
    // Compact version for modal display - with more height
    return (
      <div className="w-full">
        <ResponsiveContainer width="100%" height={config.styling.height || 600}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {config.title}
            </CardTitle>
            <CardDescription className="mt-2">{config.description}</CardDescription>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="ml-4 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-gradient-to-br from-background/50 to-background/30 rounded-xl p-4 border border-border/30">
          <ResponsiveContainer width="100%" height={config.styling.height}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

