import { db } from "@/lib/db";
import { onAuthenticateUser } from "@/actions/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await onAuthenticateUser();
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete cached forecast data to force recalculation
    if (db && db.forecastAnalytics) {
      try {
        await db.forecastAnalytics.deleteMany({
          where: { userId: user.user.id },
        });
      } catch (error) {
        // Ignore if record doesn't exist or model not available
        console.warn("[Forecast Refresh] Error clearing cache:", error);
      }
    } else {
      console.warn("[Forecast Refresh] forecastAnalytics model not available");
    }

    return NextResponse.json({
      success: true,
      message: "Forecast cache cleared. Forecasts will be recalculated on next request.",
    });
  } catch (error) {
    console.error("Error clearing forecast cache:", error);
    return NextResponse.json(
      { error: "Failed to clear forecast cache" },
      { status: 500 }
    );
  }
}

