export type ChartType = 
  | "bar" 
  | "line" 
  | "area" 
  | "pie" 
  | "scatter" 
  | "composed"
  | "radial"
  | "radar";

export interface DataSource {
  type: "monthlySales" | "topProducts" | "topCountries" | 
        "topCustomers" | "rfmDistribution" | "revenueByDay" | 
        "revenueByHour" | "aovTrend" | "custom";
  filters?: {
    limit?: number;
    dateRange?: { start: string; end: string };
    category?: string;
  };
  transformations?: {
    aggregate?: "sum" | "avg" | "max" | "min";
    groupBy?: string;
    sortBy?: string;
    order?: "asc" | "desc";
  };
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  dataSource: DataSource;
  dataMapping: {
    xAxis: string;
    yAxis: string;
    series?: string[];
    groupBy?: string;
  };
  styling: {
    color: string;
    height: number;
    showLegend: boolean;
    showGrid: boolean;
    colors?: string[];
  };
  chartProps?: Record<string, any>;
}

export interface ProcessedChartData {
  config: ChartConfig;
  data: any[];
  explanation: string;
}

// Color palette for charts
export const CHART_COLORS = [
  "#8b5cf6", // Primary purple
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#a78bfa", // Light purple
  "#60a5fa", // Light blue
  "#34d399", // Light green
  "#fbbf24", // Light amber
];

