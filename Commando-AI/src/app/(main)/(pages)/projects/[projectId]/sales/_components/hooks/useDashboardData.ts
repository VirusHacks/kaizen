"use client";

import { useState, useEffect, useCallback } from "react";

interface DashboardData {
  // Analysis data
  monthlySales: any[];
  aovTrend: any[];
  topCountries: any[];
  topProducts: any[];
  topCustomers: any[];
  rfmDistribution: any[];
  revenueByDay: any[];
  revenueByHour: any[];
  
  // Forecast data
  revenueForecast: any;
  aovForecast: any;
  ordersForecast: any;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = "dashboard_data_cache";

// Client-side only cache using localStorage
function getCache(): { data: DashboardData; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore cache errors
  }
  return null;
}

function setCache(data: DashboardData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // Ignore cache errors
  }
}

function clearCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    // Ignore cache errors
  }
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
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
  });

  const [mounted, setMounted] = useState(false);

  // Ensure we only run on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAllData = useCallback(async () => {
    // Only fetch on client
    if (typeof window === "undefined") return;

    console.log("\n🔍 [useDashboardData] fetchAllData called");

    // Check cache first
    const cached = getCache();
    if (cached) {
      console.log("✅ [useDashboardData] Cache found");
      
      // Check if we have forecast data in cache
      const hasForecastData = cached.data.revenueForecast || cached.data.aovForecast || cached.data.ordersForecast;
      const hasAnalyticsData = cached.data.monthlySales && cached.data.monthlySales.length > 0;
      
      if (hasForecastData && hasAnalyticsData) {
        console.log("📊 [useDashboardData] Complete data in cache, using it");
        setData({ ...cached.data, loading: false });
        return;
      } else if (hasAnalyticsData && !hasForecastData) {
        console.log("⚠️ [useDashboardData] Analytics in cache but forecasts missing");
        console.log("🔮 [useDashboardData] Fetching ONLY forecast data...");
        
        // Use cached analytics, but fetch forecasts
        setData({ ...cached.data, loading: false });
        
        // Fetch forecasts separately
        try {
          if (cached.data.monthlySales && cached.data.monthlySales.length >= 3) {
            console.log("📡 [useDashboardData] Making forecast API calls...");
            
            const [revenueRes, aovRes, ordersRes] = await Promise.all([
              fetch("/api/dashboard/forecast?type=revenue&periods=6"),
              fetch("/api/dashboard/forecast?type=aov&periods=6"),
              fetch("/api/dashboard/forecast?type=orders&periods=6"),
            ]);

            const [revenueData, aovData, ordersData] = await Promise.all([
              revenueRes.ok ? revenueRes.json() : null,
              aovRes.ok ? aovRes.json() : null,
              ordersRes.ok ? ordersRes.json() : null,
            ]);

            let revenueForecast = null;
            let aovForecast = null;
            let ordersForecast = null;

            if (revenueData && !revenueData.error && revenueData.historical && revenueData.forecast) {
              revenueForecast = revenueData;
              console.log("✅ [useDashboardData] Revenue forecast loaded");
            } else if (revenueData?.error) {
              console.warn("❌ [useDashboardData] Revenue forecast error:", revenueData.error);
            }

            if (aovData && !aovData.error && aovData.historical && aovData.forecast) {
              aovForecast = aovData;
              console.log("✅ [useDashboardData] AOV forecast loaded");
            } else if (aovData?.error) {
              console.warn("❌ [useDashboardData] AOV forecast error:", aovData.error);
            }

            if (ordersData && !ordersData.error && ordersData.historical && ordersData.forecast) {
              ordersForecast = ordersData;
              console.log("✅ [useDashboardData] Orders forecast loaded");
            } else if (ordersData?.error) {
              console.warn("❌ [useDashboardData] Orders forecast error:", ordersData.error);
            }

            // Update data with forecasts
            const updatedData = {
              ...cached.data,
              revenueForecast,
              aovForecast,
              ordersForecast,
              loading: false,
            };
            
            setData(updatedData);
            setCache(updatedData);
            console.log("🎉 [useDashboardData] Forecast data fetched and cached!");
          }
        } catch (forecastError) {
          console.error("❌ [useDashboardData] Error fetching forecasts:", forecastError);
        }
        return;
      }
    }

    console.log("📡 [useDashboardData] Fetching ALL data from API...");

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // First check if analytics data exists (single lightweight call)
      const checkRes = await fetch("/api/dashboard/analytics?type=monthly-sales");
      
      if (!checkRes.ok || checkRes.status === 404) {
        // No data available, set empty state
        setData({
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
          loading: false,
          error: null,
        });
        return;
      }

      // Data exists, fetch all analysis data in parallel
      const [
        monthlySalesRes,
        aovTrendRes,
        topCountriesRes,
        topProductsRes,
        topCustomersRes,
        rfmDistributionRes,
        revenueByDayRes,
        revenueByHourRes,
      ] = await Promise.all([
        fetch("/api/dashboard/analytics?type=monthly-sales"),
        fetch("/api/dashboard/analytics?type=aov-trend"),
        fetch("/api/dashboard/analytics?type=top-countries"),
        fetch("/api/dashboard/analytics?type=top-products"),
        fetch("/api/dashboard/analytics?type=top-customers"),
        fetch("/api/dashboard/analytics?type=rfm-distribution"),
        fetch("/api/dashboard/analytics?type=revenue-by-day"),
        fetch("/api/dashboard/analytics?type=revenue-by-hour"),
      ]);

      // Parse all responses
      const [
        monthlySales,
        aovTrend,
        topCountries,
        topProducts,
        topCustomers,
        rfmDistribution,
        revenueByDay,
        revenueByHour,
      ] = await Promise.all([
        monthlySalesRes.json(),
        aovTrendRes.json(),
        topCountriesRes.json(),
        topProductsRes.json(),
        topCustomersRes.json(),
        rfmDistributionRes.json(),
        revenueByDayRes.json(),
        revenueByHourRes.json(),
      ]);

      // Fetch forecast data in parallel (only if we have historical data)
      let revenueForecast = null;
      let aovForecast = null;
      let ordersForecast = null;

      if (monthlySales && monthlySales.length >= 3) {
        try {
          console.log("🔮 [useDashboardData] Fetching forecast data from API...");
          
          const [revenueRes, aovRes, ordersRes] = await Promise.all([
            fetch("/api/dashboard/forecast?type=revenue&periods=6"),
            fetch("/api/dashboard/forecast?type=aov&periods=6"),
            fetch("/api/dashboard/forecast?type=orders&periods=6"),
          ]);

          console.log("📥 [useDashboardData] Forecast API responses received");

          const [revenueData, aovData, ordersData] = await Promise.all([
            revenueRes.ok ? revenueRes.json() : null,
            aovRes.ok ? aovRes.json() : null,
            ordersRes.ok ? ordersRes.json() : null,
          ]);

          if (revenueData && !revenueData.error && revenueData.historical && revenueData.forecast) {
            revenueForecast = revenueData;
            console.log("✅ [useDashboardData] Revenue forecast loaded from API");
          } else if (revenueData?.error) {
            console.warn("❌ [useDashboardData] Revenue forecast error:", revenueData.error);
          }

          if (aovData && !aovData.error && aovData.historical && aovData.forecast) {
            aovForecast = aovData;
            console.log("✅ [useDashboardData] AOV forecast loaded from API");
          } else if (aovData?.error) {
            console.warn("❌ [useDashboardData] AOV forecast error:", aovData.error);
          }

          if (ordersData && !ordersData.error && ordersData.historical && ordersData.forecast) {
            ordersForecast = ordersData;
            console.log("✅ [useDashboardData] Orders forecast loaded from API");
          } else if (ordersData?.error) {
            console.warn("❌ [useDashboardData] Orders forecast error:", ordersData.error);
          }
        } catch (forecastError) {
          console.error("❌ [useDashboardData] Forecast data unavailable:", forecastError);
        }
      } else {
        console.log("⚠️ [useDashboardData] Not enough data for forecasts (need 3+ months)");
      }

      const newData: DashboardData = {
        monthlySales,
        aovTrend,
        topCountries,
        topProducts,
        topCustomers,
        rfmDistribution,
        revenueByDay,
        revenueByHour,
        revenueForecast,
        aovForecast,
        ordersForecast,
        loading: false,
        error: null,
      };

      // Update cache
      setCache(newData);

      setData(newData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load dashboard data",
      }));
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchAllData();
    }
  }, [mounted, fetchAllData]);

  const refreshData = useCallback(() => {
    clearCache(); // Clear client-side cache
    // Force refetch by setting loading state
    setData((prev) => ({ ...prev, loading: true }));
    fetchAllData();
  }, [fetchAllData]);

  // Function to update data directly (for upload response)
  const updateDataDirectly = useCallback((analytics: any) => {
    const newData: DashboardData = {
      monthlySales: analytics.monthlySales || [],
      aovTrend: analytics.aovTrend || [],
      topCountries: analytics.topCountries || [],
      topProducts: analytics.topProducts || [],
      topCustomers: analytics.topCustomers || [],
      rfmDistribution: analytics.rfmDistribution || [],
      revenueByDay: analytics.revenueByDay || [],
      revenueByHour: analytics.revenueByHour || [],
      revenueForecast: null, // Will be fetched separately if needed
      aovForecast: null,
      ordersForecast: null,
      loading: false,
      error: null,
    };
    
    // Update cache
    setCache(newData);
    setData(newData);
  }, []);

  return { ...data, refreshData, updateDataDirectly };
}

