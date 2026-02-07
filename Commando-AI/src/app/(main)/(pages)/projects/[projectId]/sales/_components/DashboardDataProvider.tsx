"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useDashboardData } from "./hooks/useDashboardData";
import { ChartConfig } from "@/lib/charts/chartConfigSchema";

interface GeneratedChart {
  config: ChartConfig;
  data: any[];
}

interface DashboardDataContextType {
  monthlySales: any[];
  aovTrend: any[];
  topCountries: any[];
  topProducts: any[];
  topCustomers: any[];
  rfmDistribution: any[];
  revenueByDay: any[];
  revenueByHour: any[];
  revenueForecast: any;
  aovForecast: any;
  ordersForecast: any;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
  updateDataDirectly: (analytics: any) => void;
  generatedCharts: GeneratedChart[];
  addGeneratedChart: (config: ChartConfig, data: any[]) => void;
  removeGeneratedChart: (id: string) => void;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [generatedCharts, setGeneratedCharts] = useState<GeneratedChart[]>([]);
  const data = useDashboardData();

  // Load generated charts from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("generatedCharts");
      if (saved) {
        try {
          setGeneratedCharts(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load saved charts:", e);
        }
      }
    }
  }, []);

  // Save generated charts to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && mounted) {
      localStorage.setItem("generatedCharts", JSON.stringify(generatedCharts));
    }
  }, [generatedCharts, mounted]);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const addGeneratedChart = (config: ChartConfig, chartData: any[]) => {
    setGeneratedCharts((prev) => [...prev, { config, data: chartData }]);
  };

  const removeGeneratedChart = (id: string) => {
    setGeneratedCharts((prev) => prev.filter((chart) => chart.config.id !== id));
  };

  // Return loading state during SSR
  if (!mounted) {
    return (
      <DashboardDataContext.Provider
        value={{
          monthlySales: [],
          aovTrend: [],
          topCountries: [],
          topProducts: [],
          topCustomers: [],
          rfmDistribution: [],
          revenueByDay: [],
          revenueByHour: [],
          revenueForecast: null,
          aovForecast: null,
          ordersForecast: null,
          loading: true,
          error: null,
          refreshData: () => {},
          updateDataDirectly: () => {},
          generatedCharts: [],
          addGeneratedChart: () => {},
          removeGeneratedChart: () => {},
        }}
      >
        {children}
      </DashboardDataContext.Provider>
    );
  }

  return (
    <DashboardDataContext.Provider
      value={{
        ...data,
        generatedCharts,
        addGeneratedChart,
        removeGeneratedChart,
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardDataContext() {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error("useDashboardDataContext must be used within DashboardDataProvider");
  }
  return context;
}

