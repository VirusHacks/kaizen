'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Users, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AIFeaturesCardProps {
  projectId: string;
}

export default function AIFeaturesCard({ projectId }: AIFeaturesCardProps) {
  return (
    <Card className="col-span-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Powered Features</CardTitle>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            New
          </Badge>
        </div>
        <CardDescription>
          Leverage AI for intelligent project insights and delivery predictions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Agent Collaboration Feature */}
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="font-semibold text-lg">Agent Collaboration</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Multi-agent AI system optimizes workload, detects burnout, and proposes task reassignments
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      7 AI Agents
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Workload Balancing
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Burnout Detection
                    </Badge>
                  </div>
                  <Link href={`/projects/${projectId}/project-manager/agent-collaboration`}>
                    <Button className="w-full mt-4 group">
                      Open Agent Dashboard
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Delivery Engine Feature */}
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="font-semibold text-lg">Predictive Delivery Engine</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Monte Carlo simulations provide 90% confidence delivery predictions for sales commitments
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      90% Confidence
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      What-If Scenarios
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Dependency Analysis
                    </Badge>
                  </div>
                  <Link href={`/projects/${projectId}/project-manager/delivery-engine`}>
                    <Button className="w-full mt-4 group">
                      Open Delivery Engine
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">7</p>
            <p className="text-xs text-muted-foreground">AI Agents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">10K</p>
            <p className="text-xs text-muted-foreground">Monte Carlo Runs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">90%</p>
            <p className="text-xs text-muted-foreground">Prediction Confidence</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
