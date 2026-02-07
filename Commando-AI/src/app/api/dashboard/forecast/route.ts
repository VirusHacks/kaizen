import { db } from "@/lib/db";
import { onAuthenticateUser } from "@/actions/auth";
import { NextRequest, NextResponse } from "next/server";

const FORECAST_SERVICE_URL = process.env.FORECAST_SERVICE_URL || "http://localhost:4000";
const FORECAST_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  try {
    const user = await onAuthenticateUser();
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forecastType = searchParams.get("type") || "revenue";
    const periods = parseInt(searchParams.get("periods") || "6");
    const forceRefresh = searchParams.get("refresh") === "true"; // Allow forcing refresh
    
    console.log(`\n🔮 [Forecast API] ==========================================`);
    console.log(`[Forecast API] Request: type=${forecastType}, periods=${periods}, forceRefresh=${forceRefresh}`);
    console.log(`[Forecast API] User ID: ${user.user.id}`);

    // Get analytics from database
    const analyticsRecord = await db.dashboardAnalytics.findUnique({
      where: { userId: user.user.id },
    });

    if (!analyticsRecord || !analyticsRecord.monthlySales || (analyticsRecord.monthlySales as any[]).length === 0) {
      console.log(`[Forecast API] ❌ No analytics data found for user ${user.user.id}`);
      console.log(`[Forecast API] Please upload CSV data first via the Upload button`);
      console.log(`[Forecast API] ==========================================\n`);
      return NextResponse.json({
        error: "No analytics data available. Please upload a CSV file.",
        historical: [],
        forecast: [],
        metrics: null
      }, { status: 404 });
    }
    
    console.log(`[Forecast API] ✅ Analytics data found, proceeding with forecast...`);

    // Use monthly sales and AOV data from database
    const monthlySales = analyticsRecord.monthlySales as any[];
    const aovTrend = analyticsRecord.aovTrend as any[];

    // Combine into monthly data array for forecast
    const monthlyDataMap = new Map<string, { revenue: number; aov: number; orders: number }>();
    
    monthlySales.forEach((item: any) => {
      monthlyDataMap.set(item.month, {
        revenue: item.revenue,
        aov: 0,
        orders: 0,
      });
    });

    aovTrend.forEach((item: any) => {
      const existing = monthlyDataMap.get(item.month);
      if (existing) {
        existing.aov = item.aov;
        // Estimate orders from revenue and AOV
        existing.orders = existing.aov > 0 ? Math.round(existing.revenue / existing.aov) : 0;
      }
    });

    const monthlyDataArray = Array.from(monthlyDataMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        orders: data.orders,
        aov: data.aov,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Check if we have enough data
    if (monthlyDataArray.length < 3) {
      return NextResponse.json({
        error: "Insufficient data. Need at least 3 months of historical data for forecasting.",
        historical: monthlyDataArray,
        forecast: [],
        metrics: null
      }, { status: 400 });
    }

    // Check if we have cached forecast data
    // Verify Prisma client has the model
    if (!db || !db.forecastAnalytics) {
      console.warn("[Forecast API] forecastAnalytics model not available, skipping cache check");
      // Continue without cache - will call Python service directly
    }

    let cachedForecast = null;
    if (db && db.forecastAnalytics) {
      try {
        cachedForecast = await db.forecastAnalytics.findUnique({
          where: { userId: user.user.id },
        });
      } catch (error) {
        console.warn("[Forecast API] Error checking cache:", error);
        // Continue without cache
      }
    }

    // Check if cache is valid (same periods and not expired)
    // Skip cache if forceRefresh is true
    const isCacheValid = !forceRefresh && cachedForecast && 
      cachedForecast.periods === periods &&
      (Date.now() - new Date(cachedForecast.lastCalculated).getTime()) < FORECAST_CACHE_DURATION;

    if (isCacheValid && cachedForecast) {
      // Return cached forecast data
      let forecastData: any = null;
      
      if (forecastType === "revenue" && cachedForecast.revenueForecast) {
        forecastData = cachedForecast.revenueForecast as any;
      } else if (forecastType === "aov" && cachedForecast.aovForecast) {
        forecastData = cachedForecast.aovForecast as any;
      } else if (forecastType === "orders" && cachedForecast.ordersForecast) {
        forecastData = cachedForecast.ordersForecast as any;
      }

      if (forecastData && forecastData.historical && forecastData.forecast) {
        console.log(`[Forecast API] Returning cached forecast for ${forecastType}`);
        return NextResponse.json(forecastData);
      }
    }

    // Cache miss or expired - call Python service
    console.log(`\n🐍 [Forecast API] ==========================================`);
    console.log(`[Forecast API] 🚀 Calling Python Forecast Service`);
    console.log(`[Forecast API] URL: ${FORECAST_SERVICE_URL}/forecast`);
    console.log(`[Forecast API] Data points: ${monthlyDataArray.length}, Type: ${forecastType}, Periods: ${periods}`);
    console.log(`[Forecast API] Sample data:`, monthlyDataArray.slice(0, 3));
    console.log(`[Forecast API] ==========================================\n`);
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const requestBody = {
        monthlyData: monthlyDataArray,
        periods,
        type: forecastType,
      };
      
      console.log(`[Forecast API] Request body size: ${JSON.stringify(requestBody).length} bytes`);
      
      const response = await fetch(`${FORECAST_SERVICE_URL}/forecast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[Forecast API] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = "Forecast service error";
        try {
          const text = await response.text();
          if (text) {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (e) {
          errorMessage = response.statusText || `HTTP ${response.status} error`;
        }
        console.error(`[Forecast API] Python service error:`, errorMessage);
        
        // If we have cached data, return it even if expired
        if (cachedForecast) {
          let fallbackData: any = null;
          if (forecastType === "revenue" && cachedForecast.revenueForecast) {
            fallbackData = cachedForecast.revenueForecast as any;
          } else if (forecastType === "aov" && cachedForecast.aovForecast) {
            fallbackData = cachedForecast.aovForecast as any;
          } else if (forecastType === "orders" && cachedForecast.ordersForecast) {
            fallbackData = cachedForecast.ordersForecast as any;
          }
          
          if (fallbackData && fallbackData.historical && fallbackData.forecast) {
            console.log(`[Forecast API] Returning expired cache as fallback`);
            return NextResponse.json(fallbackData);
          }
        }
        
        return NextResponse.json(
          { 
            error: errorMessage, 
            historical: monthlyDataArray,
            forecast: [],
            metrics: null
          },
          { status: response.status }
        );
      }

      const text = await response.text();
      if (!text) {
        console.error(`[Forecast API] Empty response from Python service`);
        throw new Error("Empty response from forecast service");
      }

      let forecastData;
      try {
        forecastData = JSON.parse(text);
      } catch (e) {
        console.error(`[Forecast API] Invalid JSON response from Python service`);
        console.error(`[Forecast API] Response text (first 500 chars):`, text.substring(0, 500));
        throw new Error(`Invalid JSON response from forecast service: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      console.log(`\n✅ [Forecast API] ==========================================`);
      console.log(`[Forecast API] 🎉 Python service response successful!`);
      console.log(`[Forecast API] Historical: ${forecastData.historical?.length || 0} points`);
      console.log(`[Forecast API] Forecast: ${forecastData.forecast?.length || 0} points`);
      console.log(`[Forecast API] ==========================================\n`);
      
      // Validate response structure
      if (!forecastData.historical || !forecastData.forecast) {
        console.error(`[Forecast API] Invalid response structure:`, forecastData);
        return NextResponse.json({
          error: "Invalid forecast response format",
          historical: monthlyDataArray,
          forecast: [],
          metrics: null
        }, { status: 500 });
      }

      // Store forecast in database (cache for future use)
      if (db && db.forecastAnalytics) {
        try {
          const updateData: any = {
            periods,
            lastCalculated: new Date(),
          };

          if (forecastType === "revenue") {
            updateData.revenueForecast = forecastData;
          } else if (forecastType === "aov") {
            updateData.aovForecast = forecastData;
          } else if (forecastType === "orders") {
            updateData.ordersForecast = forecastData;
          }

          await db.forecastAnalytics.upsert({
            where: { userId: user.user.id },
            update: updateData,
            create: {
              userId: user.user.id,
              periods,
              revenueForecast: forecastType === "revenue" ? forecastData : {},
              aovForecast: forecastType === "aov" ? forecastData : {},
              ordersForecast: forecastType === "orders" ? forecastData : {},
              lastCalculated: new Date(),
            },
          });

          console.log(`[Forecast API] Forecast cached in database for ${forecastType}`);
        } catch (dbError) {
          console.error("[Forecast API] Error caching forecast:", dbError);
          // Continue even if caching fails - forecast data is still returned
        }
      } else {
        console.warn("[Forecast API] forecastAnalytics model not available, skipping cache");
      }

      return NextResponse.json(forecastData);
    } catch (error: any) {
      console.error("[Forecast API] Error calling forecast service:", error);
      console.error("[Forecast API] Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 500),
      });
      
      // If we have cached data, return it even if expired
      if (cachedForecast) {
        let fallbackData: any = null;
        if (forecastType === "revenue" && cachedForecast.revenueForecast) {
          fallbackData = cachedForecast.revenueForecast as any;
        } else if (forecastType === "aov" && cachedForecast.aovForecast) {
          fallbackData = cachedForecast.aovForecast as any;
        } else if (forecastType === "orders" && cachedForecast.ordersForecast) {
          fallbackData = cachedForecast.ordersForecast as any;
        }
        
        if (fallbackData && fallbackData.historical && fallbackData.forecast) {
          console.log(`[Forecast API] Returning expired cache as fallback due to error`);
          return NextResponse.json(fallbackData);
        }
      }
      
      // Handle specific error types
      if (error.name === 'AbortError' || error.name === 'TimeoutError' || error.message?.includes('aborted')) {
        return NextResponse.json(
          { 
            error: "Forecast service timeout. The request took too long (60s limit). Please try again.",
            historical: monthlyDataArray,
            forecast: [],
            metrics: null
          },
          { status: 504 }
        );
      }
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
        return NextResponse.json(
          { 
            error: `Forecast service unavailable. Please ensure the Python service is running on ${FORECAST_SERVICE_URL}. Error: ${error.message || 'Connection refused'}`,
            historical: monthlyDataArray,
            forecast: [],
            metrics: null
          },
          { status: 503 }
        );
      }

      // Handle network errors
      if (error.message?.includes('network') || error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        return NextResponse.json(
          { 
            error: `Network error connecting to forecast service at ${FORECAST_SERVICE_URL}. Please check if the Python service is running. Error: ${error.message}`,
            historical: monthlyDataArray,
            forecast: [],
            metrics: null
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { 
          error: `Forecast service error: ${error.message || 'Unknown error'}. Please ensure the Python service is running on ${FORECAST_SERVICE_URL}.`,
          historical: monthlyDataArray,
          forecast: [],
          metrics: null
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error generating forecast:", error);
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
