"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4"
      >
        <p className="font-bold text-sm text-white mb-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data.name === "Converted" ? "bg-emerald-400" : "bg-gray-500"}`} />
          {data.name}
        </p>
        <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {data.value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-400 mt-1">leads</p>
        {data.name === "Converted" && (
          <p className="text-xs text-emerald-400 mt-2 font-semibold">
            {((data.value / data.total) * 100).toFixed(1)}% conversion rate
          </p>
        )}
      </motion.div>
    );
  }
  return null;
};

export default function ConversionRateChart({ totalLeads, convertedLeads, conversionRate }: Props) {
  const notConverted = totalLeads - convertedLeads;
  
  const data = [
    {
      name: "Converted",
      value: convertedLeads,
      color: "#10b981",
      gradient: "url(#convertedGradient)",
      total: totalLeads,
    },
    {
      name: "Not Converted",
      value: notConverted,
      color: "#4b5563",
      gradient: "url(#notConvertedGradient)",
      total: totalLeads,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="bg-[#0a0a0a] border border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <div>
                <CardTitle className="text-lg font-semibold text-white">
                  Lead Conversion Rate
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm mt-1">
                  {convertedLeads} out of {totalLeads} leads converted
                </CardDescription>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-[#0a0a0a] border border-gray-800 rounded-lg">
              <span className="text-lg font-bold text-emerald-400">{conversionRate.toFixed(1)}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <defs>
                  <linearGradient id="convertedGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="notConvertedGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4b5563" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" opacity={0.3} />
                <XAxis 
                  type="number" 
                  stroke="#4b5563"
                  tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "#374151" }}
                  axisLine={{ stroke: "#374151" }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  stroke="#4b5563"
                  tick={{ fill: "#d1d5db", fontSize: 12, fontWeight: 600 }}
                  tickLine={{ stroke: "#374151" }}
                  axisLine={{ stroke: "#374151" }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.1)" }} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 12, 12, 0]}
                  animationDuration={1000}
                  animationBegin={0}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.gradient}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(value: number) => `${value.toLocaleString()}`}
                    style={{ fill: "#d1d5db", fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

