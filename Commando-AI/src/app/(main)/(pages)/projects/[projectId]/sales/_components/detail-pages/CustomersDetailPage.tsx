"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Plus, Upload, Loader2, DollarSign, Calendar, Target, TrendingUp, User, MessageSquare, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import WhatsAppMessageModal from "./WhatsAppMessageModal";

interface Customer {
  id: string;
  customerId: string | null;
  customerName?: string | null;
  phone?: string | null;
  totalSpent: number;
  intentScore: number;
  touchpointsCount: number;
  recency: number;
  promotionalSegmentScore: number | null;
  promotionalSegmentCategory: string;
  clusterLabel: number;
  lastPurchaseDate: Date | null;
  customerData: any;
}

interface ClusterStats {
  count: number;
  totalSpent: number;
  avgSpent: number;
  avgRecency: number;
  segments: Record<string, number>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date: Date | null) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function CustomersDetailPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Record<number, Customer[]>>({});
  const [clusterStats, setClusterStats] = useState<Record<number, ClusterStats>>({});
  const [clusters, setClusters] = useState<number[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  // Fetch customers data
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/segmentation/customers");
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      const data = await response.json();
      
      console.log("[Customers Page] Fetched data:", {
        success: data.success,
        totalCustomers: data.totalCustomers,
        clusters: data.clusters,
        customersCount: Object.keys(data.customers || {}).length,
        statsCount: Object.keys(data.stats || {}).length,
      });
      
      if (data.success) {
        setCustomers(data.customers || {});
        setClusterStats(data.stats || {});
        setClusters(data.clusters || []);
        setTotalCustomers(data.totalCustomers || 0);
        
        console.log("[Customers Page] State updated:", {
          customers: Object.keys(data.customers || {}).length,
          clusters: data.clusters?.length || 0,
          totalCustomers: data.totalCustomers || 0,
        });
      } else {
        console.warn("[Customers Page] API returned success: false");
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setUploading(true);
    setUploadDialogOpen(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/dashboard/segmentation", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process segmentation");
      }

      toast.success(`Successfully segmented ${result.count} customers!`);
      
      // Small delay to ensure cache is set
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh customer data
      await fetchCustomers();
      
      // Scroll to top to show the data
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload and segment CSV");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Calculate overall metrics
  const overallStats = {
    totalCustomers,
    totalSpent: Object.values(clusterStats).reduce((sum, stats) => sum + stats.totalSpent, 0),
    avgSpent: totalCustomers > 0 
      ? Object.values(clusterStats).reduce((sum, stats) => sum + stats.totalSpent, 0) / totalCustomers 
      : 0,
    clusters: clusters.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black space-y-8 pb-12">
      {/* Minimal Header */}
      <div className="relative">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="hover:bg-gray-900 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <Users className="h-8 w-8 text-purple-400" />
              Customer Segmentation
            </h1>
            <p className="text-gray-400 text-sm">
              AI-powered customer clustering and segmentation using fuzzy logic and K-means
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="bg-[#0a0a0a] border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Upload className="h-4 w-4 text-purple-400" />
            Upload Customer Data
          </CardTitle>
          <CardDescription className="text-gray-400 text-sm">
            Upload a CSV file to segment your customers using AI-powered fuzzy logic and K-means clustering
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label htmlFor="csv-upload">
              <Button
                asChild
                variant="outline"
                className="cursor-pointer h-10 px-4 text-sm font-medium bg-[#0a0a0a] border-gray-700 text-white hover:bg-gray-900 hover:border-purple-500/50 transition-all"
                disabled={uploading}
              >
                <span>
                  {uploading ? (
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
              ref={fileInputRef}
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <p className="text-xs text-gray-500">
              CSV should include: last_purchase_date, total_spent, intent_score (optional), touchpoints_count (optional)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {totalCustomers === 0 ? (
          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-12 w-12 text-gray-600 mb-4" />
              <p className="text-gray-400 text-center">
                No customer data available. Please upload a CSV file to view segmentation.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overall Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-[#0a0a0a] border border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    Total Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{overallStats.totalCustomers.toLocaleString()}</div>
                  <p className="text-xs text-gray-400 mt-1">Segmented customers</p>
                </CardContent>
              </Card>

              <Card className="bg-[#0a0a0a] border border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-400" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{formatCurrency(overallStats.totalSpent)}</div>
                  <p className="text-xs text-gray-400 mt-1">From all customers</p>
                </CardContent>
              </Card>

              <Card className="bg-[#0a0a0a] border border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    Avg Customer Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{formatCurrency(overallStats.avgSpent)}</div>
                  <p className="text-xs text-gray-400 mt-1">Per customer</p>
                </CardContent>
              </Card>

              <Card className="bg-[#0a0a0a] border border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-400" />
                    Clusters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{overallStats.clusters}</div>
                  <p className="text-xs text-gray-400 mt-1">Customer groups</p>
                </CardContent>
              </Card>
            </div>

            {/* Cluster Tabs */}
            <Card className="bg-[#0a0a0a] border border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-xl font-bold text-white">Customer Clusters</CardTitle>
                <CardDescription className="text-gray-400 text-sm">Customers grouped by behavioral patterns using K-means clustering</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {clusters.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No clusters found. Please upload a CSV file to segment customers.
                  </div>
                ) : (
                  <Tabs defaultValue={clusters.length > 0 ? `cluster-${clusters[0]}` : undefined} className="w-full">
                    <div className="flex justify-center mb-6">
                      <TabsList 
                        className="grid w-full max-w-4xl bg-[#0a0a0a] border border-gray-800 rounded-lg p-1"
                        style={{ 
                          gridTemplateColumns: `repeat(${Math.min(clusters.length, 4)}, 1fr)` 
                        }}
                      >
                        {clusters.map((cluster) => {
                          const stats = clusterStats[cluster] || { count: 0, totalSpent: 0, avgSpent: 0, avgRecency: 0, segments: {} };
                          return (
                            <TabsTrigger
                              key={cluster}
                              value={`cluster-${cluster}`}
                              className="flex flex-col items-start gap-1 p-4 text-sm font-medium data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border data-[state=active]:border-purple-500/30 text-gray-400 transition-all rounded-md"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <span className="font-bold text-lg">Cluster {cluster}</span>
                                <Badge variant="outline" className="ml-auto border-gray-700 text-gray-300">
                                  {stats.count}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500 text-left w-full">
                                Avg: {formatCurrency(stats.avgSpent)} • Recency: {Math.round(stats.avgRecency)} days
                              </div>
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                    </div>

                    {clusters.map((cluster) => {
                      const clusterCustomers = customers[cluster] || [];
                      const stats = clusterStats[cluster] || { count: 0, totalSpent: 0, avgSpent: 0, avgRecency: 0, segments: {} };
                      
                      return (
                        <TabsContent key={cluster} value={`cluster-${cluster}`} className="space-y-4 mt-0">
                          {/* Cluster Stats - Horizontal Layout */}
                          <Card className="bg-[#0a0a0a] border border-gray-800">
                            <CardContent className="p-6">
                              <div className="flex flex-wrap items-center justify-between gap-6">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-purple-500/20">
                                    <Users className="h-5 w-5 text-purple-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">Customers</p>
                                    <p className="text-2xl font-bold text-white">{stats.count}</p>
                                  </div>
                                </div>
                                <div className="h-12 w-px bg-gray-800" />
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-emerald-500/20">
                                    <DollarSign className="h-5 w-5 text-emerald-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">Total Revenue</p>
                                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalSpent)}</p>
                                  </div>
                                </div>
                                <div className="h-12 w-px bg-gray-800" />
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-blue-500/20">
                                    <TrendingUp className="h-5 w-5 text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">Avg Revenue</p>
                                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.avgSpent)}</p>
                                  </div>
                                </div>
                                <div className="h-12 w-px bg-gray-800" />
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-amber-500/20">
                                    <Calendar className="h-5 w-5 text-amber-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400">Avg Recency</p>
                                    <p className="text-2xl font-bold text-amber-400">{Math.round(stats.avgRecency)} days</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Segments in Cluster */}
                          {Object.keys(stats.segments).length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {Object.entries(stats.segments).map(([segment, count]) => (
                                <Badge key={segment} variant="outline" className="px-3 py-1 border-gray-700 text-gray-300">
                                  {segment}: {count}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Action Bar - Always Visible */}
                          <Card className="bg-[#0a0a0a] border border-gray-800">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="text-sm font-medium">
                                    {selectedCustomers.size > 0 ? (
                                      <span className="text-white">
                                        {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? "s" : ""} selected
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">Select customers to send WhatsApp messages</span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  onClick={() => {
                                    const selected = clusterCustomers.filter((c) => selectedCustomers.has(c.id));
                                    if (selected.length === 0) {
                                      toast.error("Please select at least one customer");
                                      return;
                                    }
                                    setWhatsappModalOpen(true);
                                  }}
                                  disabled={selectedCustomers.size === 0}
                                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                  size="lg"
                                >
                                  <MessageSquare className="h-5 w-5 mr-2" />
                                  Send WhatsApp {selectedCustomers.size > 0 && `(${selectedCustomers.size})`}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Customer Table */}
                          <Card className="bg-[#0a0a0a] border border-gray-800">
                            <CardContent className="p-0">
                              <div className="overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-900/50 border-b border-gray-800">
                                      <TableHead className="w-12">
                                        <Checkbox
                                          checked={clusterCustomers.length > 0 && clusterCustomers.every((c) => selectedCustomers.has(c.id))}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              const newSelected = new Set(selectedCustomers);
                                              clusterCustomers.forEach((c) => newSelected.add(c.id));
                                              setSelectedCustomers(newSelected);
                                            } else {
                                              const newSelected = new Set(selectedCustomers);
                                              clusterCustomers.forEach((c) => newSelected.delete(c.id));
                                              setSelectedCustomers(newSelected);
                                            }
                                          }}
                                          className="border-gray-700"
                                        />
                                      </TableHead>
                                      <TableHead className="font-semibold text-white">Customer Name</TableHead>
                                      <TableHead className="font-semibold text-white">ID</TableHead>
                                      <TableHead className="font-semibold text-white">Total Spent</TableHead>
                                      <TableHead className="font-semibold text-white">Intent Score</TableHead>
                                      <TableHead className="font-semibold text-white">Touchpoints</TableHead>
                                      <TableHead className="font-semibold text-white">Recency</TableHead>
                                      <TableHead className="font-semibold text-white">Last Purchase</TableHead>
                                      <TableHead className="font-semibold text-white">Segment</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {clusterCustomers.length === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                                          No customers in this cluster
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      clusterCustomers.map((customer) => {
                                        // Extract customer name from customerData or use a default
                                        const customerName = customer.customerName || 
                                                           customer.customerData?.name || 
                                                           customer.customerData?.customer_name ||
                                                           customer.customerData?.customerName ||
                                                           `Customer ${customer.customerId || customer.id}`;
                                        
                                        // Extract phone number from customerData
                                        const phone = customer.phone || 
                                                    customer.customerData?.phone ||
                                                    customer.customerData?.phone_number ||
                                                    customer.customerData?.mobile ||
                                                    customer.customerData?.whatsapp ||
                                                    null;
                                        
                                        const isSelected = selectedCustomers.has(customer.id);
                                        
                                        return (
                                          <TableRow 
                                            key={customer.id} 
                                            className={`hover:bg-gray-900/50 transition-colors cursor-pointer border-b border-gray-800 ${isSelected ? 'bg-purple-500/10' : ''}`}
                                            onClick={(e) => {
                                              // Don't navigate if clicking checkbox
                                              if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) {
                                                return;
                                              }
                                              router.push(`/dashboard/customers/${customer.customerId || customer.id}`);
                                            }}
                                          >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                  const newSelected = new Set(selectedCustomers);
                                                  if (checked) {
                                                    newSelected.add(customer.id);
                                                  } else {
                                                    newSelected.delete(customer.id);
                                                  }
                                                  setSelectedCustomers(newSelected);
                                                }}
                                                className="border-gray-700"
                                              />
                                            </TableCell>
                                            <TableCell className="font-medium text-white">
                                              <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                                                  {customerName.charAt(0).toUpperCase()}
                                                </div>
                                                <span>{customerName}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-gray-400 font-mono text-sm">
                                              {customer.customerId || "N/A"}
                                            </TableCell>
                                            <TableCell className="font-semibold text-emerald-400">
                                              {formatCurrency(customer.totalSpent)}
                                            </TableCell>
                                            <TableCell>
                                              <Badge 
                                                variant="outline"
                                                className={
                                                  customer.intentScore > 0.7 
                                                    ? "border-emerald-500 text-emerald-400"
                                                    : customer.intentScore > 0.4
                                                    ? "border-amber-500 text-amber-400"
                                                    : "border-red-500 text-red-400"
                                                }
                                              >
                                                {(customer.intentScore * 100).toFixed(0)}%
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                              <div className="flex items-center gap-1">
                                                <Target className="h-3 w-3 text-gray-500" />
                                                <span>{customer.touchpointsCount}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <span className={
                                                customer.recency < 90 
                                                  ? "text-emerald-400 font-medium" 
                                                  : customer.recency < 180
                                                  ? "text-amber-400 font-medium"
                                                  : "text-red-400 font-medium"
                                              }>
                                                {customer.recency} days
                                              </span>
                                            </TableCell>
                                            <TableCell className="text-gray-400 text-sm">
                                              {formatDate(customer.lastPurchaseDate)}
                                            </TableCell>
                                            <TableCell>
                                              <Badge
                                                variant="outline"
                                                className={
                                                  customer.promotionalSegmentCategory === "High Value Engagement"
                                                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                                                    : customer.promotionalSegmentCategory === "Re-engagement"
                                                    ? "border-orange-500 text-orange-400 bg-orange-500/10"
                                                    : "border-blue-500 text-blue-400 bg-blue-500/10"
                                                }
                                              >
                                                {customer.promotionalSegmentCategory}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* WhatsApp Message Modal */}
      {whatsappModalOpen && (
        <WhatsAppMessageModal
          isOpen={whatsappModalOpen}
          onClose={() => {
            setWhatsappModalOpen(false);
            setSelectedCustomers(new Set());
          }}
          customers={Object.values(customers)
            .flat()
            .filter((c) => selectedCustomers.has(c.id))
            .map((customer) => {
              // Extract phone number
              const phone = customer.phone || 
                          customer.customerData?.phone ||
                          customer.customerData?.phone_number ||
                          customer.customerData?.mobile ||
                          customer.customerData?.whatsapp ||
                          null;
              
              return {
                ...customer,
                phone,
              };
            })}
          clusterInfo={Object.values(clusterStats)[0]}
        />
      )}
    </div>
  );
}
