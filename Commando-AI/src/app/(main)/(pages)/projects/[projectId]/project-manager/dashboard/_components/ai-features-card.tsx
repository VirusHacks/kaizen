'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Users, Sparkles, ArrowRight, Gauge } from 'lucide-react';
import Link from 'next/link';

interface AIFeaturesCardProps {
  projectId: string;
}

export default function AIFeaturesCard({ projectId }: AIFeaturesCardProps) {
  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">AI-Powered Features</CardTitle>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            New
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Leverage AI for intelligent project insights and delivery predictions
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Agent Collaboration Feature */}
          <Card className="border hover:border-primary/50 transition-all">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-base font-medium">Agent Collaboration</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Multi-agent AI system optimizes workload, detects burnout, and proposes task reassignments
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      7 AI Agents
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Workload Balancing
                    </Badge>
                  </div>
                  <Link href={`/projects/${projectId}/project-manager/agent-collaboration`}>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      Open Agent Dashboard
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Delivery Engine Feature */}
          <Card className="border hover:border-primary/50 transition-all">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-base font-medium">Predictive Delivery Engine</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Monte Carlo simulations provide 90% confidence delivery predictions for sales commitments
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      90% Confidence
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      What-If Scenarios
                    </Badge>
                  </div>
                  <Link href={`/projects/${projectId}/project-manager/delivery-engine`}>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      Open Delivery Engine
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Planning Feature */}
          <Card className="border hover:border-primary/50 transition-all">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  <Gauge className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-base font-medium">Resource Planning</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Thompson Sampling optimizes task assignment with skill matching, burnout modeling, and Pareto scoring
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Gauge className="h-3 w-3 mr-1" />
                      Utilization Heatmap
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Skill Matching
                    </Badge>
                  </div>
                  <Link href={`/projects/${projectId}/project-manager/resource-planning`}>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      Open Resource Planning
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">7</p>
            <p className="text-sm text-muted-foreground">AI Agents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">10K</p>
            <p className="text-sm text-muted-foreground">Monte Carlo Runs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">90%</p>
            <p className="text-sm text-muted-foreground">Confidence</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">Pareto</p>
            <p className="text-sm text-muted-foreground">Optimal Scoring</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
