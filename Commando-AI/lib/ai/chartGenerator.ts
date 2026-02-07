import { ChartConfig, ProcessedChartData, CHART_COLORS } from "@/lib/charts/chartConfigSchema";

export function generateChartId(): string {
  return `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function validateChartConfig(config: Partial<ChartConfig>): boolean {
  if (!config.type || !config.title || !config.dataSource || !config.dataMapping) {
    return false;
  }

  const validTypes = ["bar", "line", "area", "pie", "scatter", "composed", "radial", "radar"];
  if (!validTypes.includes(config.type)) {
    return false;
  }

  const validDataSources = [
    "monthlySales", "topProducts", "topCountries", "topCustomers",
    "rfmDistribution", "revenueByDay", "revenueByHour", "aovTrend", "custom"
  ];
  if (!validDataSources.includes(config.dataSource.type)) {
    return false;
  }

  return true;
}

export function processDataForChart(
  rawData: any,
  config: ChartConfig
): any[] {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return [];
  }

  let processedData = [...rawData];

  // Apply filters
  if (config.dataSource.filters?.limit) {
    processedData = processedData.slice(0, config.dataSource.filters.limit);
  }

  // Apply transformations
  if (config.dataSource.transformations) {
    const { sortBy, order = "desc", aggregate, groupBy } = config.dataSource.transformations;

    if (sortBy) {
      processedData.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (order === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    if (groupBy && aggregate) {
      // Group and aggregate data
      const grouped = processedData.reduce((acc: any, item: any) => {
        const key = item[groupBy];
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {});

      processedData = Object.entries(grouped).map(([key, items]: [string, any]) => {
        const values = items.map((item: any) => item[config.dataMapping.yAxis]);
        let aggregatedValue = 0;
        
        if (aggregate === "sum") {
          aggregatedValue = values.reduce((a: number, b: number) => a + b, 0);
        } else if (aggregate === "avg") {
          aggregatedValue = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        } else if (aggregate === "max") {
          aggregatedValue = Math.max(...values);
        } else if (aggregate === "min") {
          aggregatedValue = Math.min(...values);
        }

        return {
          [config.dataMapping.xAxis]: key,
          [config.dataMapping.yAxis]: aggregatedValue,
        };
      });
    }
  }

  // Ensure data has required fields and map correctly
  return processedData.map((item) => {
    const processed: any = {};
    
    // Map xAxis - try exact match first, then case-insensitive, then partial match
    const xAxisKey = config.dataMapping.xAxis;
    if (item[xAxisKey] !== undefined) {
      processed[xAxisKey] = item[xAxisKey];
    } else {
      const keys = Object.keys(item);
      const xKey = keys.find(k => 
        k.toLowerCase() === xAxisKey.toLowerCase() || 
        k.toLowerCase().includes(xAxisKey.toLowerCase()) ||
        xAxisKey.toLowerCase().includes(k.toLowerCase())
      );
      if (xKey) {
        processed[xAxisKey] = item[xKey];
      } else {
        // Use first available key as fallback
        processed[xAxisKey] = item[keys[0]] || "";
      }
    }

    // Map yAxis - try exact match first, then case-insensitive, then partial match
    const yAxisKey = config.dataMapping.yAxis;
    if (item[yAxisKey] !== undefined) {
      processed[yAxisKey] = item[yAxisKey];
    } else {
      const keys = Object.keys(item);
      const yKey = keys.find(k => 
        k.toLowerCase() === yAxisKey.toLowerCase() || 
        k.toLowerCase().includes(yAxisKey.toLowerCase()) ||
        yAxisKey.toLowerCase().includes(k.toLowerCase())
      );
      if (yKey) {
        processed[yAxisKey] = item[yKey];
      } else {
        // Use second available key (usually the value) as fallback
        processed[yAxisKey] = item[keys[1]] || item[keys[0]] || 0;
      }
    }

    // Copy other fields for tooltip/legend
    Object.keys(item).forEach(key => {
      if (key !== xAxisKey && key !== yAxisKey && !processed[key]) {
        processed[key] = item[key];
      }
    });

    return processed;
  }).filter(item => {
    // Filter out items with invalid data
    const xVal = item[config.dataMapping.xAxis];
    const yVal = item[config.dataMapping.yAxis];
    return xVal !== undefined && xVal !== null && xVal !== "" &&
           yVal !== undefined && yVal !== null && !isNaN(Number(yVal));
  });
}

export function parseAIResponse(aiResponse: string): ChartConfig | null {
  try {
    // Try to extract JSON from the response (in case it's wrapped in markdown)
    let jsonString = aiResponse.trim();
    
    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    
    // Try to find JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonString);
    
    if (!parsed.chartConfig) {
      return null;
    }

    const config: ChartConfig = {
      id: generateChartId(),
      type: parsed.chartConfig.type || "bar",
      title: parsed.chartConfig.title || "Generated Chart",
      description: parsed.chartConfig.description || "",
      dataSource: parsed.chartConfig.dataSource || { type: "monthlySales" },
      dataMapping: parsed.chartConfig.dataMapping || { xAxis: "month", yAxis: "revenue" },
      styling: {
        color: parsed.chartConfig.styling?.color || CHART_COLORS[0],
        height: parsed.chartConfig.styling?.height || 400,
        showLegend: parsed.chartConfig.styling?.showLegend ?? true,
        showGrid: parsed.chartConfig.styling?.showGrid ?? true,
        colors: parsed.chartConfig.styling?.colors || CHART_COLORS.slice(0, 3),
      },
      chartProps: parsed.chartConfig.chartProps || {},
    };

    if (!validateChartConfig(config)) {
      return null;
    }

    return config;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return null;
  }
}

