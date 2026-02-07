"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, Loader2, BarChart3, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useDashboardDataContext } from "./DashboardDataProvider";
import AnalysisDashboard from "./AnalysisDashboard";
import PredictionDashboard from "./PredictionDashboard";
import GenerativeChartChatbot from "./GenerativeChartChatbot";

function DashboardContentInner() {
  const { loading, refreshData, updateDataDirectly, monthlySales, addGeneratedChart } = useDashboardDataContext();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<any>(null);
  const [hasData, setHasData] = useState(false);

  // Check if data exists on mount
  useEffect(() => {
    if (!loading && monthlySales && monthlySales.length > 0) {
      setHasData(true);
    } else if (!loading) {
      setHasData(false);
    }
  }, [loading, monthlySales]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/dashboard/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload CSV");
      }

      setUploadStats(data.stats);
      
      // If analytics are returned, update the data context directly (no API call needed)
      if (data.analytics) {
        updateDataDirectly(data.analytics);
        setHasData(true);
        toast.success("CSV uploaded and processed successfully!");
      } else {
        // Fallback: refresh data from API
        refreshData();
        setHasData(true);
        toast.success("CSV uploaded and processed successfully!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload CSV");
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="w-full min-h-screen bg-black space-y-8 pb-12">
      {/* Minimal Header */}
      <div className="relative">
        <h1 className="text-3xl font-bold text-white mb-2">
          Retail Sales Analytics & Forecasting
        </h1>
        <p className="text-gray-400 text-sm">
          Comprehensive insights and AI-powered predictions for your business
        </p>
      </div>

      {/* Upload Section */}
      <Card className="bg-[#0a0a0a] border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Upload className="h-4 w-4 text-purple-400" />
            Upload Sales Data
          </CardTitle>
          <CardDescription className="text-gray-400 text-sm">
            Upload a CSV file with sales transactions to begin analysis and forecasting
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label htmlFor="csv-upload">
              <Button
                asChild
                variant="outline"
                className="cursor-pointer h-10 px-4 text-sm font-medium bg-[#0a0a0a] border-gray-700 text-white hover:bg-gray-900 hover:border-purple-500/50 transition-all"
                disabled={isUploading}
              >
                <span>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose CSV File
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            {uploadStats && (
              <div className="flex items-center gap-2 text-sm font-medium text-gray-400 bg-[#0a0a0a] border border-gray-800 px-4 py-2 rounded-lg">
                <FileText className="h-4 w-4" />
                <span>
                  Processed: <span className="font-bold text-white">{uploadStats.processed}</span> rows
                  {uploadStats.returns > 0 && (
                    <span className="ml-2">
                      • <span className="text-orange-400">{uploadStats.returns}</span> returns
                    </span>
                  )}
                  {uploadStats.creditNotes > 0 && (
                    <span className="ml-2">
                      • <span className="text-red-400">{uploadStats.creditNotes}</span> credit notes
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasData ? (
        <Tabs defaultValue="analysis" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-3xl grid-cols-3 h-12 bg-[#0a0a0a] border border-gray-800 rounded-lg p-1">
              <TabsTrigger 
                value="analysis" 
                className="flex items-center justify-center gap-2 text-sm font-medium data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border data-[state=active]:border-purple-500/30 text-gray-400 transition-all rounded-md"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analysis</span>
              </TabsTrigger>
              <TabsTrigger 
                value="prediction" 
                className="flex items-center justify-center gap-2 text-sm font-medium data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border data-[state=active]:border-purple-500/30 text-gray-400 transition-all rounded-md"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Prediction</span>
              </TabsTrigger>
              <TabsTrigger 
                value="generator" 
                className="flex items-center justify-center gap-2 text-sm font-medium data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border data-[state=active]:border-purple-500/30 text-gray-400 transition-all rounded-md"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Generator</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analysis" className="mt-0 space-y-6">
            <AnalysisDashboard />
          </TabsContent>

          <TabsContent value="prediction" className="mt-0 space-y-6">
            <PredictionDashboard />
          </TabsContent>

          <TabsContent value="generator" className="mt-0 space-y-6">
            <GenerativeChartChatbot onChartGenerated={addGeneratedChart} embeddedMode={true} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="bg-[#0a0a0a] border border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-600 mb-4" />
            <p className="text-gray-400 text-center">
              No data available. Please upload a CSV file to view analytics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DashboardContent() {
  return <DashboardContentInner />;
}