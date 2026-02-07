"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Sparkles, Loader2, X, BarChart3, TrendingUp, AlertCircle, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useDashboardDataContext } from "./DashboardDataProvider";
import { ChartConfig } from "@/lib/charts/chartConfigSchema";
import DynamicChart from "./charts/DynamicChart";

interface GenerativeChartChatbotProps {
  onChartGenerated: (config: ChartConfig, data: any[]) => void;
  embeddedMode?: boolean;
}

const EXAMPLE_REQUESTS = [
  "Show me revenue by month",
  "Top 5 products by revenue",
  "Revenue by day of week",
  "Top countries by sales",
  "Average order value trend",
  "Customer segment distribution",
  "RFM segment comparison",
  "Revenue vs orders over time",
];

export default function GenerativeChartChatbot({ onChartGenerated, embeddedMode = false }: GenerativeChartChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedChart, setGeneratedChart] = useState<{ config: ChartConfig; data: any[] } | null>(null);
  const [isAddedToDashboard, setIsAddedToDashboard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    monthlySales,
    topProducts,
    topCountries,
    topCustomers,
    rfmDistribution,
    revenueByDay,
    revenueByHour,
    aovTrend,
  } = useDashboardDataContext();

  // Check if data is available
  const hasData = monthlySales && monthlySales.length > 0;

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGeneratedChart(null);
      setIsAddedToDashboard(false);
      setError(null);
    }
  }, [isOpen]);

  const handleGenerateChart = async (request?: string) => {
    const userRequest = request || input.trim();
    if (!userRequest || isGenerating) return;

    if (!hasData) {
      toast.error("Please upload a CSV file first to generate charts");
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    if (!request) {
      setInput("");
    }

    try {
      console.log("🤖 [AI Generator] Generating chart for:", userRequest);
      
      // Prepare available data
      const availableData = {
        monthlySales: monthlySales || [],
        topProducts: topProducts || [],
        topCountries: topCountries || [],
        topCustomers: topCustomers || [],
        rfmDistribution: rfmDistribution || [],
        revenueByDay: revenueByDay || [],
        revenueByHour: revenueByHour || [],
        aovTrend: aovTrend || [],
      };

      console.log("📊 [AI Generator] Available data:", Object.keys(availableData).map(k => `${k}: ${(availableData as any)[k]?.length || 0} items`));

      const response = await fetch("/api/generate-chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userRequest,
          availableData,
        }),
      });

      if (!response.ok) {
        // Try to parse JSON error, fallback to text
        let errorMessage = "Failed to generate chart";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          // If JSON parsing fails, get text
          const errorText = await response.text();
          if (errorText.includes("<!DOCTYPE")) {
            errorMessage = `API route error (${response.status}). Please check server logs.`;
          } else {
            errorMessage = errorText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      console.log("✅ [AI Generator] Response received:", { success: result.success, hasConfig: !!result.chartConfig, hasData: !!result.data });

      if (result.success && result.chartConfig && result.data) {
        console.log("🎉 [AI Generator] Chart generated successfully:", result.chartConfig.title);
        // Show chart in modal first
        setGeneratedChart({
          config: result.chartConfig,
          data: result.data,
        });
        setIsAddedToDashboard(false);
        toast.success(`Chart "${result.chartConfig.title}" generated successfully!`);
      } else {
        console.error("❌ [AI Generator] Invalid response structure:", result);
        throw new Error("Invalid response from chart generation API");
      }
    } catch (error: any) {
      console.error("❌ [AI Generator] Chart generation error:", error);
      const errorMessage = error.message || "Failed to generate chart. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerateChart();
    }
  };

  const handleAddToDashboard = () => {
    if (generatedChart) {
      onChartGenerated(generatedChart.config, generatedChart.data);
      setIsAddedToDashboard(true);
      toast.success("Chart added to dashboard!");
    }
  };

  const handleGenerateNew = () => {
    setGeneratedChart(null);
    setIsAddedToDashboard(false);
    setInput("");
    setError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Note: In embedded mode, we render content directly instead of using a dialog

  return (
    <>
      {/* Trigger Button - only show when not in embedded mode */}
      {hasData && !embeddedMode && (
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">AI Chart Generator</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Ask me to create any chart from your data
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => setIsOpen(true)}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg"
                size="lg"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Generate Chart
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Dialog Modal - In embedded mode, render content directly instead of in a dialog */}
      {embeddedMode ? (
        <div className="w-full space-y-6">
          {/* Header Section */}
          <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent rounded-t-lg">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-7 w-7 text-primary" />
              <h2 className="text-3xl font-bold">AI Chart Generator</h2>
            </div>
            <p className="text-lg text-muted-foreground">
              Describe the chart you want to create. For example: "Show me revenue by month" or "Top 5 products"
            </p>
          </div>

          <div className="px-6 pb-6 space-y-8">
            {/* Example Requests - Only show when no chart is generated */}
            {!generatedChart && (
              <div className="space-y-4">
                <p className="text-base font-semibold text-muted-foreground">Try these examples:</p>
                <div className="flex flex-wrap gap-3">
                  {EXAMPLE_REQUESTS.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="default"
                      onClick={() => handleGenerateChart(example)}
                      disabled={isGenerating}
                      className="text-sm px-4 py-2 h-auto"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Card className="bg-destructive/10 border-destructive/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 text-destructive">
                    <AlertCircle className="h-6 w-6" />
                    <p className="text-base font-medium">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Input Section */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Show me revenue by month, Top 10 products, Revenue by day..."
                  disabled={isGenerating || !!generatedChart}
                  className="flex-1 text-lg h-14 px-4"
                />
                {!generatedChart ? (
                  <Button
                    onClick={() => handleGenerateChart()}
                    disabled={isGenerating || !input.trim()}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg h-14 px-8 text-base"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateNew}
                    variant="outline"
                    size="lg"
                    className="border-primary/30 hover:bg-primary/10 h-14 px-8 text-base"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    New Chart
                  </Button>
                )}
              </div>
              {!generatedChart && (
                <p className="text-base text-muted-foreground">
                  Press Enter to generate, or click one of the example requests above
                </p>
              )}
            </div>

            {/* Generated Chart Display */}
            {generatedChart && (
              <div className="space-y-8 mt-6">
                <div className="flex items-center justify-between flex-wrap gap-6">
                  <div className="flex-1 min-w-[400px]">
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      Generated Chart: {generatedChart.config.title}
                    </h3>
                    <p className="text-base text-muted-foreground">
                      {generatedChart.config.description}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    {!isAddedToDashboard ? (
                      <Button
                        onClick={handleAddToDashboard}
                        size="lg"
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg h-14 px-8 text-base"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Add to Dashboard
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 h-14 px-8 text-base"
                        disabled
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Added to Dashboard
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Chart Preview - Full Width with More Space */}
                <div className="w-full border-2 border-primary/20 rounded-xl p-8 bg-gradient-to-br from-background/50 to-background/30 shadow-xl">
                  <DynamicChart
                    config={generatedChart.config}
                    data={generatedChart.data}
                    compact={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-[60vw] w-[60vw] max-h-[85vh] h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-10 pt-8 pb-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <DialogTitle className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-7 w-7 text-primary" />
              AI Chart Generator
            </DialogTitle>
            <DialogDescription className="text-lg mt-3">
              Describe the chart you want to create. For example: "Show me revenue by month" or "Top 5 products"
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8">
            {/* Example Requests - Only show when no chart is generated */}
            {!generatedChart && (
              <div className="space-y-4">
                <p className="text-base font-semibold text-muted-foreground">Try these examples:</p>
                <div className="flex flex-wrap gap-3">
                  {EXAMPLE_REQUESTS.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="default"
                      onClick={() => handleGenerateChart(example)}
                      disabled={isGenerating}
                      className="text-sm px-4 py-2 h-auto"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Card className="bg-destructive/10 border-destructive/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 text-destructive">
                    <AlertCircle className="h-6 w-6" />
                    <p className="text-base font-medium">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Input Section */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Show me revenue by month, Top 10 products, Revenue by day..."
                  disabled={isGenerating || !!generatedChart}
                  className="flex-1 text-lg h-14 px-4"
                />
                {!generatedChart ? (
                  <Button
                    onClick={() => handleGenerateChart()}
                    disabled={isGenerating || !input.trim()}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg h-14 px-8 text-base"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateNew}
                    variant="outline"
                    size="lg"
                    className="border-primary/30 hover:bg-primary/10 h-14 px-8 text-base"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    New Chart
                  </Button>
                )}
              </div>
              {!generatedChart && (
                <p className="text-base text-muted-foreground">
                  Press Enter to generate, or click one of the example requests above
                </p>
              )}
            </div>

            {/* Generated Chart Display */}
            {generatedChart && (
              <div className="space-y-8 mt-6">
                <div className="flex items-center justify-between flex-wrap gap-6">
                  <div className="flex-1 min-w-[400px]">
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      Generated Chart: {generatedChart.config.title}
                    </h3>
                    <p className="text-base text-muted-foreground">
                      {generatedChart.config.description}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    {!isAddedToDashboard ? (
                      <Button
                        onClick={handleAddToDashboard}
                        size="lg"
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg h-14 px-8 text-base"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Add to Dashboard
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 h-14 px-8 text-base"
                        disabled
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Added to Dashboard
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Chart Preview - Full Width with More Space */}
                <div className="w-full border-2 border-primary/20 rounded-xl p-8 bg-gradient-to-br from-background/50 to-background/30 shadow-xl">
                  <DynamicChart
                    config={generatedChart.config}
                    data={generatedChart.data}
                    compact={true}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      )}
    </>
  );
}