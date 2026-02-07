"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Coins, Users, TrendingUp, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  creditsEarned: number;
  clientsConverted: number;
  conversionRate: number;
};

export default function CreditsStats({
  creditsEarned,
  clientsConverted,
  conversionRate,
}: Props) {
  const [animatedCredits, setAnimatedCredits] = useState(0);
  const [animatedClients, setAnimatedClients] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = creditsEarned / steps;
    const clientIncrement = clientsConverted / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setAnimatedCredits(Math.min(increment * currentStep, creditsEarned));
      setAnimatedClients(
        Math.min(clientIncrement * currentStep, clientsConverted)
      );

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedCredits(creditsEarned);
        setAnimatedClients(clientsConverted);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [creditsEarned, clientsConverted]);

  const stats = [
    {
      label: "Credits Earned",
      value: Math.floor(animatedCredits),
      icon: Coins,
      color: "text-purple-400",
      description: "Total credits from conversions",
      trend: "+12.5%",
    },
    {
      label: "Clients Converted",
      value: Math.floor(animatedClients),
      icon: Users,
      color: "text-purple-400",
      description: "Successful conversions",
      trend: "+8.2%",
    },
    {
      label: "Conversion Rate",
      value: conversionRate.toFixed(1),
      icon: TrendingUp,
      color: "text-emerald-400",
      description: "Overall success rate",
      suffix: "%",
      trend: "+5.1%",
    },
  ];

  return (
    <div className="flex items-center gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="cursor-pointer flex-1"
        >
          <Card className="bg-[#0a0a0a] border border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                  <ArrowUpRight className="h-3 w-3" />
                  {stat.trend}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-2xl font-bold ${stat.color} tracking-tight`}
                  >
                    {stat.value.toLocaleString()}
                  </span>
                  {stat.suffix && (
                    <span
                      className={`text-sm font-semibold ${stat.color} opacity-80`}
                    >
                      {stat.suffix}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-tight">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
