import { db } from "@/lib/db";
import { onAuthenticateUser } from "@/actions/auth";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

interface CSVRow {
  Invoice: string;
  StockCode: string;
  Description: string;
  Quantity: string;
  InvoiceDate: string;
  Price: string;
  CustomerID: string;
  Country: string;
}

interface ProcessedTransaction {
  invoice: string;
  stockCode: string;
  description: string;
  quantity: number;
  invoiceDate: Date;
  price: number;
  customerId: number;
  country: string;
  totalPrice: number;
  invoiceMonth: string;
  dayOfWeek: string;
  hourOfDay: number;
  isReturn: boolean;
  isCreditNote: boolean;
}

// No in-memory cache - using database instead

export async function POST(request: NextRequest) {
  try {
    const user = await onAuthenticateUser();
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRow[];

    // Process and clean data in memory
    const processedData: ProcessedTransaction[] = [];
    const returns: ProcessedTransaction[] = [];
    const creditNotes: ProcessedTransaction[] = [];

    for (const row of records) {
      const quantity = parseFloat(row.Quantity) || 0;
      const price = parseFloat(row.Price) || 0;
      const customerId = row.CustomerID ? parseInt(row.CustomerID) : 0;
      
      // Parse date
      let invoiceDate: Date;
      try {
        invoiceDate = new Date(row.InvoiceDate);
        if (isNaN(invoiceDate.getTime())) {
          continue; // Skip invalid dates
        }
      } catch {
        continue; // Skip invalid dates
      }

      const description = row.Description?.trim() || "Unknown Product";
      const totalPrice = quantity * price;

      // Extract derived fields
      const invoiceMonth = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayOfWeek = dayNames[invoiceDate.getDay()];
      const hourOfDay = invoiceDate.getHours();

      const transaction: ProcessedTransaction = {
        invoice: row.Invoice,
        stockCode: row.StockCode,
        description,
        quantity,
        invoiceDate,
        price,
        customerId,
        country: row.Country || "Unknown",
        totalPrice,
        invoiceMonth,
        dayOfWeek,
        hourOfDay,
        isReturn: quantity < 0,
        isCreditNote: price < 0,
      };

      if (quantity < 0) {
        returns.push(transaction);
      } else if (price < 0) {
        creditNotes.push(transaction);
      } else {
        processedData.push(transaction);
      }
    }

    // Remove duplicates based on invoice + stockCode + invoiceDate
    const uniqueMap = new Map<string, boolean>();
    const uniqueData: ProcessedTransaction[] = [];
    for (const item of processedData) {
      const key = `${item.invoice}-${item.stockCode}-${item.invoiceDate.getTime()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, true);
        uniqueData.push(item);
      }
    }

    // Calculate all analytics in memory
    const analytics = calculateAllAnalytics(uniqueData, user.user.id);

    // Verify Prisma client has the model
    if (!db) {
      console.error("Prisma client not initialized");
      return NextResponse.json({
        success: true,
        message: "CSV processed successfully (analytics not saved - Prisma client unavailable)",
        stats: {
          total: records.length,
          processed: uniqueData.length,
          returns: returns.length,
          creditNotes: creditNotes.length,
          duplicates: processedData.length - uniqueData.length,
        },
        analytics,
      });
    }

    // Check if model exists
    if (!db.dashboardAnalytics) {
      console.error("dashboardAnalytics model not found in Prisma client");
      console.error("Available models:", Object.keys(db).filter(k => !k.startsWith('_') && typeof db[k as keyof typeof db] === 'object'));
      // Still return analytics even if we can't save to DB
      return NextResponse.json({
        success: true,
        message: "CSV processed successfully (analytics not saved - model missing. Please restart server.)",
        stats: {
          total: records.length,
          processed: uniqueData.length,
          returns: returns.length,
          creditNotes: creditNotes.length,
          duplicates: processedData.length - uniqueData.length,
        },
        analytics,
      });
    }

    // Store analytics in database (upsert - update if exists, create if not)
    try {
      await db.dashboardAnalytics.upsert({
      where: { userId: user.user.id },
      update: {
        monthlySales: analytics.monthlySales as any,
        aovTrend: analytics.aovTrend as any,
        topCountries: analytics.topCountries as any,
        topProducts: analytics.topProducts as any,
        topCustomers: analytics.topCustomers as any,
        rfmDistribution: analytics.rfmDistribution as any,
        revenueByDay: analytics.revenueByDay as any,
        revenueByHour: analytics.revenueByHour as any,
      },
      create: {
        userId: user.user.id,
        monthlySales: analytics.monthlySales as any,
        aovTrend: analytics.aovTrend as any,
        topCountries: analytics.topCountries as any,
        topProducts: analytics.topProducts as any,
        topCustomers: analytics.topCustomers as any,
        rfmDistribution: analytics.rfmDistribution as any,
        revenueByDay: analytics.revenueByDay as any,
        revenueByHour: analytics.revenueByHour as any,
      },
    });
    } catch (dbError) {
      console.error("Error saving analytics to database:", dbError);
      // Still return analytics even if DB save fails
      return NextResponse.json({
        success: true,
        message: "CSV processed successfully (analytics calculated but not saved)",
        stats: {
          total: records.length,
          processed: uniqueData.length,
          returns: returns.length,
          creditNotes: creditNotes.length,
          duplicates: processedData.length - uniqueData.length,
        },
        analytics,
        warning: "Analytics not saved to database. Please restart the server.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "CSV processed successfully",
      stats: {
        total: records.length,
        processed: uniqueData.length,
        returns: returns.length,
        creditNotes: creditNotes.length,
        duplicates: processedData.length - uniqueData.length,
      },
      analytics, // Return analytics directly
    });
  } catch (error) {
    console.error("Error processing CSV:", error);
    return NextResponse.json(
      { error: "Failed to process CSV", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function calculateAllAnalytics(transactions: ProcessedTransaction[], userId: string) {
  // Filter out returns and credit notes
  const validTransactions = transactions.filter(
    (t) => !t.isReturn && !t.isCreditNote
  );

  // Monthly Sales Trend
  const monthlySales = getMonthlySalesTrend(validTransactions);

  // AOV Trend
  const aovTrend = getAOVTrend(validTransactions);

  // Top Countries
  const topCountries = getTopCountries(validTransactions);

  // Top Products
  const topProducts = getTopProducts(validTransactions);

  // Revenue by Day
  const revenueByDay = getRevenueByDayOfWeek(validTransactions);

  // Revenue by Hour
  const revenueByHour = getRevenueByHour(validTransactions);

  // Calculate RFM
  const rfmData = calculateRFM(validTransactions);
  const topCustomers = getTopCustomers(rfmData);
  const rfmDistribution = getRFMDistribution(rfmData);

  return {
    monthlySales,
    aovTrend,
    topCountries,
    topProducts,
    topCustomers,
    rfmDistribution,
    revenueByDay,
    revenueByHour,
    rfmData, // Include full RFM data for forecast
  };
}

function getMonthlySalesTrend(transactions: ProcessedTransaction[]) {
  const monthlyData = new Map<string, number>();
  
  transactions.forEach((t) => {
    const month = t.invoiceMonth;
    monthlyData.set(month, (monthlyData.get(month) || 0) + t.totalPrice);
  });

  return Array.from(monthlyData.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function getAOVTrend(transactions: ProcessedTransaction[]) {
  const monthlyInvoices = new Map<string, { total: number; count: number }>();
  
  transactions.forEach((t) => {
    const month = t.invoiceMonth;
    if (!monthlyInvoices.has(month)) {
      monthlyInvoices.set(month, { total: 0, count: 0 });
    }
    const data = monthlyInvoices.get(month)!;
    data.total += t.totalPrice;
    data.count += 1;
  });

  return Array.from(monthlyInvoices.entries())
    .map(([month, data]) => ({
      month,
      aov: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function getTopCountries(transactions: ProcessedTransaction[]) {
  const countryData = new Map<string, number>();
  
  transactions.forEach((t) => {
    countryData.set(t.country, (countryData.get(t.country) || 0) + t.totalPrice);
  });

  return Array.from(countryData.entries())
    .map(([country, revenue]) => ({ country, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

function getTopProducts(transactions: ProcessedTransaction[]) {
  const productData = new Map<string, number>();
  
  transactions.forEach((t) => {
    productData.set(t.description, (productData.get(t.description) || 0) + t.totalPrice);
  });

  return Array.from(productData.entries())
    .map(([product, revenue]) => ({ product, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

function getRevenueByDayOfWeek(transactions: ProcessedTransaction[]) {
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayData = new Map<string, number>();
  
  dayOrder.forEach((day) => dayData.set(day, 0));
  
  transactions.forEach((t) => {
    dayData.set(t.dayOfWeek, (dayData.get(t.dayOfWeek) || 0) + t.totalPrice);
  });

  return dayOrder.map((day) => ({
    day,
    revenue: dayData.get(day) || 0,
  }));
}

function getRevenueByHour(transactions: ProcessedTransaction[]) {
  const hourData = new Map<number, number>();
  
  for (let i = 0; i < 24; i++) {
    hourData.set(i, 0);
  }
  
  transactions.forEach((t) => {
    hourData.set(t.hourOfDay, (hourData.get(t.hourOfDay) || 0) + t.totalPrice);
  });

  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    revenue: hourData.get(i) || 0,
  }));
}

function calculateRFM(transactions: ProcessedTransaction[]) {
  // Filter out customerId = 0
  const validTransactions = transactions.filter((t) => t.customerId !== 0);

  // Group by customer
  const customerData = new Map<number, {
    lastOrderDate: Date;
    invoices: Set<string>;
    totalSpent: number;
  }>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const transaction of validTransactions) {
    const customerId = transaction.customerId;
    if (!customerData.has(customerId)) {
      customerData.set(customerId, {
        lastOrderDate: transaction.invoiceDate,
        invoices: new Set(),
        totalSpent: 0,
      });
    }

    const data = customerData.get(customerId)!;
    data.invoices.add(transaction.invoice);
    data.totalSpent += transaction.totalPrice;
    
    if (transaction.invoiceDate > data.lastOrderDate) {
      data.lastOrderDate = transaction.invoiceDate;
    }
  }

  // Calculate RFM metrics
  const rfmData = Array.from(customerData.entries()).map(([customerId, data]) => {
    const lastOrderDate = new Date(data.lastOrderDate);
    lastOrderDate.setHours(0, 0, 0, 0);
    const recency = Math.floor((today.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      customerId,
      recency,
      frequency: data.invoices.size,
      monetary: data.totalSpent,
    };
  });

  if (rfmData.length === 0) {
    return [];
  }

  // Calculate quantiles for scoring (1-5)
  const recencyValues = rfmData.map(d => d.recency).sort((a, b) => a - b);
  const frequencyValues = rfmData.map(d => d.frequency).sort((a, b) => a - b);
  const monetaryValues = rfmData.map(d => d.monetary).sort((a, b) => a - b);

  const getQuantile = (value: number, sortedArray: number[], reverse: boolean = false): number => {
    if (sortedArray.length === 0) return 1;
    
    if (reverse) {
      // For recency: lower days = higher score (recent customers score higher)
      let index = 0;
      for (let i = 0; i < sortedArray.length; i++) {
        if (value >= sortedArray[i]) {
          index = i + 1;
        } else {
          break;
        }
      }
      return Math.max(1, Math.min(5, Math.ceil(((sortedArray.length - index + 1) / sortedArray.length) * 5)));
    } else {
      // For frequency and monetary: higher is better
      let index = 0;
      for (let i = 0; i < sortedArray.length; i++) {
        if (value >= sortedArray[i]) {
          index = i + 1;
        } else {
          break;
        }
      }
      return Math.max(1, Math.min(5, Math.ceil((index / sortedArray.length) * 5)));
    }
  };

  // Calculate scores and segments
  return rfmData.map(data => {
    const rScore = getQuantile(data.recency, recencyValues, true);
    const fScore = getQuantile(data.frequency, frequencyValues, false);
    const mScore = getQuantile(data.monetary, monetaryValues, false);
    const rfmScore = `${rScore}${fScore}${mScore}`;
    
    // Determine segment
    let rfmSegment = "At-Risk";
    if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
      rfmSegment = "Champions";
    } else if (rScore >= 3 && fScore >= 3 && mScore >= 3) {
      rfmSegment = "Loyal Customers";
    } else if (rScore <= 2 && fScore >= 3 && mScore >= 3) {
      rfmSegment = "Potential Loyalists";
    } else if (rScore >= 4 && fScore <= 2 && mScore <= 2) {
      rfmSegment = "New Customers";
    } else if (rScore <= 2 && fScore <= 2 && mScore <= 2) {
      rfmSegment = "Lost Customers";
    } else if (rScore <= 2 && fScore >= 3) {
      rfmSegment = "At-Risk";
    }

    return {
      customerId: data.customerId,
      recency: data.recency,
      frequency: data.frequency,
      monetary: data.monetary,
      rScore,
      fScore,
      mScore,
      rfmScore,
      rfmSegment,
    };
  });
}

function getTopCustomers(rfmData: any[]) {
  return rfmData
    .sort((a, b) => b.monetary - a.monetary)
    .slice(0, 10)
    .map((c) => ({
      customerId: c.customerId,
      revenue: c.monetary,
    }));
}

function getRFMDistribution(rfmData: any[]) {
  const segmentCount = new Map<string, number>();
  
  rfmData.forEach((item) => {
    segmentCount.set(item.rfmSegment, (segmentCount.get(item.rfmSegment) || 0) + 1);
  });

  return Array.from(segmentCount.entries())
    .map(([segment, count]) => ({
      segment,
      count,
    }));
}

