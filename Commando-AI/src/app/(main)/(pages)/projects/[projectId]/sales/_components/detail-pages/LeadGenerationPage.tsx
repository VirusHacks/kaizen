"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, MapPin, Globe, TrendingUp, Target, Zap, MessageSquare, Linkedin, Search, Mail, Users, Calendar, Lightbulb, ArrowRight, Filter, Download, FileText, BarChart3, RefreshCw, Plus, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Chatbot from "./Chatbot";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface LeadAnalysis {
  summary: string;
  topGeographicOpportunities: Array<{
    country: string;
    reason: string;
    potentialLeads: string;
    strategy: string;
    confidence?: "High" | "Medium" | "Low";
    estimatedRevenue?: string;
  }>;
  topChannels: Array<{
    channel: string;
    priority: "High" | "Medium" | "Low";
    reason: string;
    expectedROI: string;
    actionSteps: string[];
    budgetRecommendation?: string;
    timeline?: string;
  }>;
  bestTiming: {
    dayOfWeek: string;
    timeOfDay: string;
    seasonalTrends: string;
    recommendation: string;
  };
  targetAudience: {
    industry: string;
    companySize: string;
    geographicFocus: string;
    persona: string;
    similarityScore?: string;
  };
  leadGenerationStrategies: Array<{
    strategy: string;
    description: string;
    channels: string[];
    expectedResults: string;
    implementationDifficulty: "Easy" | "Medium" | "Hard";
    cost?: string;
    timeline?: string;
  }>;
  quickWins: Array<{
    action: string;
    impact: string;
    effort: "Low" | "Medium" | "High";
    timeline: string;
    priority?: "High" | "Medium" | "Low";
  }>;
  insights: string[];
  leadScoringCriteria?: {
    highValue?: string;
    mediumValue?: string;
    lowValue?: string;
  };
  recommendedActions?: Array<{
    action: string;
    reason: string;
    expectedOutcome: string;
    nextSteps: string[];
  }>;
}

interface RawData {
  topCountries: Array<{
    country: string;
    transactionCount: number;
    totalRevenue: number;
    avgRevenue: number;
    uniqueCustomers?: number;
    avgRevenuePerCustomer?: number;
  }>;
  topIndustries: Array<{
    segment: string;
    customerCount: number;
    totalSpent: number;
    avgSpent: number;
  }>;
  timingPatterns: {
    bestDay: string;
    bestHour: number;
    bestMonth: string;
    dayDistribution?: Record<string, number>;
    hourDistribution?: Record<number, number>;
  };
  customerProfile: {
    avgSpent: number;
    avgRecency: number;
    avgIntent: number;
    topSegment: string;
    totalCustomers: number;
  };
  conversionMetrics?: {
    avgOrderValue: number;
    avgLTV: number;
    repeatRate: number;
    avgOrdersPerCustomer: number;
  };
  leadQualityScore?: number;
  channelPerformance?: Array<{
    channel: string;
    performance: string;
    recommendation: string;
  }>;
  growthTrends?: {
    recentGrowth: number;
    topGrowingMarket: string;
    seasonalPattern: string;
  };
  totalTransactions?: number;
  totalCustomers?: number;
}

const getChannelIcon = (channel: string) => {
  const lower = channel.toLowerCase();
  if (lower.includes("linkedin")) return Linkedin;
  if (lower.includes("google") || lower.includes("ads") || lower.includes("search")) return Search;
  if (lower.includes("email") || lower.includes("mail")) return Mail;
  if (lower.includes("social") || lower.includes("facebook") || lower.includes("twitter")) return MessageSquare;
  return Users;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-500/20 text-red-400 border-red-500/50";
    case "Medium":
      return "bg-amber-500/20 text-amber-400 border-amber-500/50";
    case "Low":
      return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Easy":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    case "Medium":
      return "bg-amber-500/20 text-amber-400 border-amber-500/50";
    case "Hard":
      return "bg-red-500/20 text-red-400 border-red-500/50";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
};

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function LeadGenerationPage() {
  const [analysis, setAnalysis] = useState<LeadAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<RawData | null>(null);
  
  // Filters
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("all");
  
  // Lead Generation
  const [generatedLeads, setGeneratedLeads] = useState<any[]>([]);
  const [isGeneratingLeads, setIsGeneratingLeads] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadCount, setLeadCount] = useState(50);
  const [leadStats, setLeadStats] = useState<any>(null);

  useEffect(() => {
    analyzeLeadSources();
  }, [selectedCountry, selectedSegment, selectedTimeRange]);

  const analyzeLeadSources = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/leads/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisType: "comprehensive",
          country: selectedCountry !== "all" ? selectedCountry : undefined,
          segment: selectedSegment !== "all" ? selectedSegment : undefined,
          timeRange: selectedTimeRange !== "all" ? selectedTimeRange : undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAnalysis(result.analysis);
        setRawData(result.rawData);
        toast.success("Lead generation analysis completed!");
      } else {
        throw new Error(result.error || "Failed to analyze");
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze lead sources");
    } finally {
      setLoading(false);
    }
  };

  const exportRecommendations = () => {
    if (!analysis) return;
    
    const exportData = {
      generatedAt: new Date().toISOString(),
      summary: analysis.summary,
      topGeographicOpportunities: analysis.topGeographicOpportunities,
      topChannels: analysis.topChannels,
      bestTiming: analysis.bestTiming,
      targetAudience: analysis.targetAudience,
      leadGenerationStrategies: analysis.leadGenerationStrategies,
      quickWins: analysis.quickWins,
      insights: analysis.insights,
      rawData: rawData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-generation-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Recommendations exported!");
  };

  const handleGenerateLeads = async () => {
    setIsGeneratingLeads(true);
    try {
      const response = await fetch("/api/leads/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: leadCount,
          country: selectedCountry !== "all" ? selectedCountry : undefined,
          segment: selectedSegment !== "all" ? selectedSegment : undefined,
          useAI: true,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setGeneratedLeads(result.leads);
        setLeadStats(result.stats);
        toast.success(`Successfully generated ${result.leads.length} leads!`);
      } else {
        throw new Error(result.error || "Failed to generate leads");
      }
    } catch (error: any) {
      console.error("Lead generation error:", error);
      toast.error(error.message || "Failed to generate leads");
    } finally {
      setIsGeneratingLeads(false);
    }
  };

  const exportLeadsToCSV = () => {
    if (generatedLeads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    // Convert leads to CSV format
    const headers = ["Name", "Company", "Email", "Phone", "Industry", "Company Size", "Country", "Job Title", "Website", "Lead Score", "Estimated Value", "Match Reason"];
    const csvRows = [
      headers.join(","),
      ...generatedLeads.map(lead =>
        [
          `"${lead.name || ""}"`,
          `"${lead.company || ""}"`,
          `"${lead.email || ""}"`,
          `"${lead.phone || ""}"`,
          `"${lead.industry || ""}"`,
          `"${lead.companySize || ""}"`,
          `"${lead.country || ""}"`,
          `"${lead.jobTitle || ""}"`,
          `"${lead.website || ""}"`,
          lead.leadScore || "0",
          `"${lead.estimatedValue || ""}"`,
          `"${lead.matchReason || ""}"`
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Leads exported to CSV!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing your data and generating AI-powered recommendations...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const countryChartData = rawData?.topCountries?.slice(0, 10).map(c => ({
    name: c.country,
    revenue: c.totalRevenue,
    transactions: c.transactionCount,
    customers: c.uniqueCustomers || 0,
  })) || [];

  const segmentChartData = rawData?.topIndustries?.slice(0, 8).map(s => ({
    name: s.segment,
    customers: s.customerCount,
    revenue: s.totalSpent,
  })) || [];

  const dayDistributionData = rawData?.timingPatterns?.dayDistribution 
    ? Object.entries(rawData.timingPatterns.dayDistribution).map(([day, count]) => ({
        day,
        count,
      }))
    : [];

  const hourDistributionData = rawData?.timingPatterns?.hourDistribution
    ? Object.entries(rawData.timingPatterns.hourDistribution).map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      })).sort((a, b) => a.hour - b.hour)
    : [];

  const availableCountries = rawData?.topCountries?.map(c => c.country) || [];
  const availableSegments = rawData?.topIndustries?.map(s => s.segment) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full">
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent px-6 py-4">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Target className="h-8 w-8 text-purple-400" />
                Lead Generation Hub
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-powered insights to find and convert the best leads
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportRecommendations}
                disabled={!analysis}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLeadModal(true)}
                disabled={!analysis || !rawData}
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Leads
              </Button>
              <Button
                variant="outline"
                onClick={analyzeLeadSources}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-400" />
                Filters
              </CardTitle>
              <CardDescription>Filter analysis by country, segment, or time range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {availableCountries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="segment">Customer Segment</Label>
                  <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                    <SelectTrigger id="segment">
                      <SelectValue placeholder="All Segments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Segments</SelectItem>
                      {availableSegments.map((segment) => (
                        <SelectItem key={segment} value={segment}>
                          {segment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timeRange">Time Range</Label>
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger id="timeRange">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics - Horizontal Layout */}
          {rawData && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <Users className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Customers</div>
                      <div className="text-2xl font-bold">{rawData.totalCustomers || 0}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Customer Value</div>
                      <div className="text-2xl font-bold">${(rawData.customerProfile?.avgSpent || 0).toFixed(0)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-emerald-500/10">
                      <Target className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Lead Quality Score</div>
                      <div className="text-2xl font-bold">
                        {rawData.leadQualityScore ? `${rawData.leadQualityScore.toFixed(1)}/10` : "N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <BarChart3 className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Transactions</div>
                      <div className="text-2xl font-bold">{rawData.totalTransactions || 0}</div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowLeadModal(true)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Leads
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lead Generation Modal */}
          <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-400" />
                  Generate Leads
                </DialogTitle>
                <DialogDescription>
                  Generate leads based on your best customer profiles and analysis
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="leadCount">Number of Leads</Label>
                    <Input
                      id="leadCount"
                      type="number"
                      min={10}
                      max={500}
                      value={leadCount}
                      onChange={(e) => setLeadCount(parseInt(e.target.value) || 50)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Target Country</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {availableCountries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Target Segment</Label>
                    <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Segments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Segments</SelectItem>
                        {availableSegments.map((segment) => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateLeads}
                  disabled={isGeneratingLeads}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  {isGeneratingLeads ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Leads...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {leadCount} Leads
                    </>
                  )}
                </Button>

                {leadStats && (
                  <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Leads</div>
                      <div className="text-lg font-bold">{leadStats.totalLeads}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg Lead Score</div>
                      <div className="text-lg font-bold">{leadStats.avgLeadScore.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">High Value</div>
                      <div className="text-lg font-bold text-emerald-400">{leadStats.highValueLeads}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Est. Total Value</div>
                      <div className="text-lg font-bold text-purple-400">${leadStats.estimatedTotalValue.toFixed(0)}</div>
                    </div>
                  </div>
                )}

                        {generatedLeads.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-bold">Generated Leads ({generatedLeads.length})</h3>
                              <Button
                                variant="outline"
                                onClick={exportLeadsToCSV}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                              </Button>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Industry</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>Lead Score</TableHead>
                                    <TableHead>Est. Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {generatedLeads.map((lead, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium">{lead.name}</TableCell>
                                      <TableCell>{lead.company}</TableCell>
                                      <TableCell>{lead.email}</TableCell>
                                      <TableCell>{lead.phone}</TableCell>
                                      <TableCell>{lead.industry}</TableCell>
                                      <TableCell>{lead.country}</TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className={
                                            parseInt(lead.leadScore) >= 70
                                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                                              : parseInt(lead.leadScore) >= 50
                                              ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                                              : "bg-gray-500/20 text-gray-400 border-gray-500/50"
                                          }
                                        >
                                          {lead.leadScore}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="font-semibold text-emerald-400">{lead.estimatedValue}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

          {/* Visualizations */}
          {rawData && (countryChartData.length > 0 || segmentChartData.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {countryChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Markets by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={countryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              
              {segmentChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Segments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={segmentChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="customers"
                        >
                          {segmentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {dayDistributionData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Activity by Day of Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dayDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" name="Transactions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {hourDistributionData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Activity by Hour of Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={hourDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Transactions" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* AI Summary */}
          {analysis && (
            <Card className="bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  AI-Powered Lead Generation Insights
                </CardTitle>
                <CardDescription>Personalized recommendations based on your customer data</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed mb-4">{analysis.summary}</p>
                {rawData?.conversionMetrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                      <div className="text-xs text-muted-foreground">Avg Order Value</div>
                      <div className="text-lg font-bold">${(rawData.conversionMetrics.avgOrderValue || 0).toFixed(0)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                      <div className="text-xs text-muted-foreground">Avg LTV</div>
                      <div className="text-lg font-bold">${(rawData.conversionMetrics.avgLTV || 0).toFixed(0)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                      <div className="text-xs text-muted-foreground">Repeat Rate</div>
                      <div className="text-lg font-bold">{((rawData.conversionMetrics.repeatRate || 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                      <div className="text-xs text-muted-foreground">Orders/Customer</div>
                      <div className="text-lg font-bold">{(rawData.conversionMetrics.avgOrdersPerCustomer || 0).toFixed(1)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Wins */}
          {analysis && analysis.quickWins && analysis.quickWins.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  Quick Wins
                </CardTitle>
                <CardDescription>High-impact actions you can take immediately</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysis.quickWins.map((win, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{win.action}</h4>
                        {win.priority && (
                          <Badge
                            variant="outline"
                            className={
                              win.priority === "High"
                                ? "bg-red-500/20 text-red-400 border-red-500/50"
                                : win.priority === "Medium"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/50"
                            }
                          >
                            {win.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{win.impact}</p>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={
                            win.effort === "Low"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                              : win.effort === "Medium"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                              : "bg-red-500/20 text-red-400 border-red-500/50"
                          }
                        >
                          {win.effort} Effort
                        </Badge>
                        <p className="text-xs text-muted-foreground">Timeline: {win.timeline}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="geographic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="geographic" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Geographic
              </TabsTrigger>
              <TabsTrigger value="channels" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Channels
              </TabsTrigger>
              <TabsTrigger value="strategies" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Strategies
              </TabsTrigger>
              <TabsTrigger value="assistant" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Assistant
              </TabsTrigger>
            </TabsList>

            {/* Geographic Opportunities */}
            <TabsContent value="geographic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-purple-400" />
                    Top Geographic Opportunities
                  </CardTitle>
                  <CardDescription>Countries and regions with highest lead potential</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis && analysis.topGeographicOpportunities ? (
                    <div className="space-y-4">
                      {analysis.topGeographicOpportunities.map((opp, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Globe className="h-5 w-5 text-purple-400" />
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{opp.country}</h3>
                                <p className="text-sm text-muted-foreground">{opp.potentialLeads} potential leads</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {opp.confidence && (
                                <Badge variant="outline" className={
                                  opp.confidence === "High"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                                    : opp.confidence === "Medium"
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                                    : "bg-blue-500/20 text-blue-400 border-blue-500/50"
                                }>
                                  {opp.confidence} Confidence
                                </Badge>
                              )}
                              {opp.estimatedRevenue && (
                                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                                  {opp.estimatedRevenue}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm mb-2">{opp.reason}</p>
                          <div className="mt-3 p-3 rounded-lg bg-background/50 border border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Strategy:</p>
                            <p className="text-sm">{opp.strategy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No geographic data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timing Insights */}
              {analysis && analysis.bestTiming && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-400" />
                      Best Timing for Lead Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="text-sm text-muted-foreground mb-1">Best Day</div>
                        <div className="text-xl font-bold">{analysis.bestTiming.dayOfWeek}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="text-sm text-muted-foreground mb-1">Best Time</div>
                        <div className="text-xl font-bold">{analysis.bestTiming.timeOfDay}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="text-sm text-muted-foreground mb-1">Seasonal Trend</div>
                        <div className="text-xl font-bold">{analysis.bestTiming.seasonalTrends}</div>
                      </div>
                    </div>
                    <div className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-sm font-medium">💡 Recommendation:</p>
                      <p className="text-sm mt-1">{analysis.bestTiming.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Channel Recommendations */}
            <TabsContent value="channels" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    Recommended Lead Generation Channels
                  </CardTitle>
                  <CardDescription>Best channels to reach your target audience</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis && analysis.topChannels ? (
                    <div className="space-y-4">
                      {analysis.topChannels.map((channel, index) => {
                        const Icon = getChannelIcon(channel.channel);
                        return (
                          <div
                            key={index}
                            className="p-6 rounded-lg bg-gradient-to-r from-card to-card/80 border border-border/50 hover:border-purple-500/40 transition-all"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                  <Icon className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-xl">{channel.channel}</h3>
                                  <p className="text-sm text-muted-foreground">{channel.reason}</p>
                                </div>
                              </div>
                              <Badge className={getPriorityColor(channel.priority)}>
                                {channel.priority} Priority
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                <div className="text-xs text-muted-foreground mb-1">Expected ROI</div>
                                <div className="text-sm font-semibold text-emerald-400">{channel.expectedROI}</div>
                              </div>
                              {channel.budgetRecommendation && (
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                  <div className="text-xs text-muted-foreground mb-1">Budget</div>
                                  <div className="text-sm font-semibold">{channel.budgetRecommendation}</div>
                                </div>
                              )}
                              {channel.timeline && (
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                  <div className="text-xs text-muted-foreground mb-1">Timeline</div>
                                  <div className="text-sm font-semibold">{channel.timeline}</div>
                                </div>
                              )}
                            </div>

                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2">Action Steps:</p>
                              <ul className="space-y-2">
                                {channel.actionSteps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start gap-2 text-sm">
                                    <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No channel recommendations available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Target Audience */}
              {analysis && analysis.targetAudience && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-400" />
                      Target Audience Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="text-sm text-muted-foreground mb-1">Industry Focus</div>
                        <div className="text-lg font-bold">{analysis.targetAudience.industry}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="text-sm text-muted-foreground mb-1">Company Size</div>
                        <div className="text-lg font-bold">{analysis.targetAudience.companySize}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="text-sm text-muted-foreground mb-1">Geographic Focus</div>
                        <div className="text-lg font-bold">{analysis.targetAudience.geographicFocus}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50 md:col-span-2">
                        <div className="text-sm text-muted-foreground mb-1">Ideal Customer Persona</div>
                        <div className="text-sm">{analysis.targetAudience.persona}</div>
                        {analysis.targetAudience.similarityScore && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Similarity Score: {analysis.targetAudience.similarityScore}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lead Scoring Criteria */}
              {analysis && analysis.leadScoringCriteria && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-400" />
                      Lead Scoring Criteria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.leadScoringCriteria.highValue && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <div className="text-sm font-medium text-emerald-400 mb-1">High Value Leads</div>
                          <div className="text-sm">{analysis.leadScoringCriteria.highValue}</div>
                        </div>
                      )}
                      {analysis.leadScoringCriteria.mediumValue && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="text-sm font-medium text-amber-400 mb-1">Medium Value Leads</div>
                          <div className="text-sm">{analysis.leadScoringCriteria.mediumValue}</div>
                        </div>
                      )}
                      {analysis.leadScoringCriteria.lowValue && (
                        <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                          <div className="text-sm font-medium text-gray-400 mb-1">Low Value Leads</div>
                          <div className="text-sm">{analysis.leadScoringCriteria.lowValue}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Strategies */}
            <TabsContent value="strategies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-purple-400" />
                    Lead Generation Strategies
                  </CardTitle>
                  <CardDescription>Comprehensive strategies to grow your lead pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis && analysis.leadGenerationStrategies ? (
                    <div className="space-y-4">
                      {analysis.leadGenerationStrategies.map((strategy, index) => (
                        <div
                          key={index}
                          className="p-6 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-xl">{strategy.strategy}</h3>
                            <Badge className={getDifficultyColor(strategy.implementationDifficulty)}>
                              {strategy.implementationDifficulty}
                            </Badge>
                          </div>
                          <p className="text-sm mb-4">{strategy.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Channels:</p>
                              <div className="flex flex-wrap gap-2">
                                {strategy.channels.map((channel, chIndex) => (
                                  <Badge key={chIndex} variant="outline" className="text-xs">
                                    {channel}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Expected Results:</p>
                              <p className="text-sm font-semibold text-emerald-400">{strategy.expectedResults}</p>
                            </div>
                            {strategy.cost && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Cost:</p>
                                <p className="text-sm font-semibold">{strategy.cost}</p>
                              </div>
                            )}
                            {strategy.timeline && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Timeline:</p>
                                <p className="text-sm font-semibold">{strategy.timeline}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No strategies available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              {analysis && analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-400" />
                      Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.recommendedActions.map((action, index) => (
                        <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                          <h4 className="font-semibold mb-2">{action.action}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{action.reason}</p>
                          <div className="p-2 rounded bg-background/50 mb-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Expected Outcome:</p>
                            <p className="text-sm font-semibold text-emerald-400">{action.expectedOutcome}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Next Steps:</p>
                            <ul className="space-y-1">
                              {action.nextSteps.map((step, stepIndex) => (
                                <li key={stepIndex} className="flex items-start gap-2 text-sm">
                                  <ArrowRight className="h-3 w-3 text-purple-400 mt-1 flex-shrink-0" />
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Insights */}
              {analysis && analysis.insights && analysis.insights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-400" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysis.insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* AI Assistant */}
            <TabsContent value="assistant" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-400" />
                    Lead Generation Assistant
                  </CardTitle>
                  <CardDescription>Ask questions about lead generation strategies and get AI-powered answers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Chatbot
                    systemMessage={`You are an expert lead generation strategist. Help users find the best ways to generate leads for their business. Use the following context:

${analysis ? `
Current Analysis:
- Summary: ${analysis.summary}
- Top Countries: ${analysis.topGeographicOpportunities?.map(o => o.country).join(", ") || "N/A"}
- Top Channels: ${analysis.topChannels?.map(c => c.channel).join(", ") || "N/A"}
- Best Timing: ${analysis.bestTiming?.recommendation || "N/A"}
- Target Audience: ${analysis.targetAudience?.persona || "N/A"}
- Lead Quality Score: ${rawData?.leadQualityScore ? rawData.leadQualityScore.toFixed(1) : "N/A"}/10
- Conversion Metrics: Avg Order Value: $${rawData?.conversionMetrics?.avgOrderValue ? rawData.conversionMetrics.avgOrderValue.toFixed(0) : "N/A"}, LTV: $${rawData?.conversionMetrics?.avgLTV ? rawData.conversionMetrics.avgLTV.toFixed(0) : "N/A"}, Repeat Rate: ${rawData?.conversionMetrics?.repeatRate ? (rawData.conversionMetrics.repeatRate * 100).toFixed(1) : "N/A"}%
` : "No analysis data available yet."}

Provide actionable, specific advice. Focus on:
- Data-driven recommendations
- Practical implementation steps
- Multiple channel options
- Realistic expectations
- ROI considerations`}
                    contextData={analysis || {}}
                    pageTitle="Lead Generation"
                    isOpen={true}
                    onClose={() => {}}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
