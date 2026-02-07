import { db } from "@/lib/db";
import { onAuthenticateUser } from "@/actions/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await onAuthenticateUser();
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chartType = searchParams.get("type");

    // Get analytics from database
    // Ensure Prisma client is properly initialized
    if (!db) {
      console.error("Prisma client not initialized");
      return NextResponse.json(
        { error: "Database service unavailable" },
        { status: 503 }
      );
    }

    const analyticsRecord = await db.dashboardAnalytics.findUnique({
      where: { userId: user.user.id },
    });

    if (!analyticsRecord) {
      return NextResponse.json({ error: "No analytics data available. Please upload a CSV file." }, { status: 404 });
    }

    // Parse JSON fields
    const analytics = {
      monthlySales: analyticsRecord.monthlySales as any,
      aovTrend: analyticsRecord.aovTrend as any,
      topCountries: analyticsRecord.topCountries as any,
      topProducts: analyticsRecord.topProducts as any,
      topCustomers: analyticsRecord.topCustomers as any,
      rfmDistribution: analyticsRecord.rfmDistribution as any,
      revenueByDay: analyticsRecord.revenueByDay as any,
      revenueByHour: analyticsRecord.revenueByHour as any,
    };

    switch (chartType) {
      case "monthly-sales":
        return NextResponse.json(analytics.monthlySales);
      case "top-countries":
        return NextResponse.json(analytics.topCountries);
      case "top-products":
        return NextResponse.json(analytics.topProducts);
      case "top-customers":
        return NextResponse.json(analytics.topCustomers);
      case "rfm-distribution":
        return NextResponse.json(analytics.rfmDistribution);
      case "aov-trend":
        return NextResponse.json(analytics.aovTrend);
      case "revenue-by-day":
        return NextResponse.json(analytics.revenueByDay);
      case "revenue-by-hour":
        return NextResponse.json(analytics.revenueByHour);
      default:
        return NextResponse.json({ error: "Invalid chart type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
