'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import {
  getProjectCommitments,
  getCommitmentHealthDashboard,
  getProjectDependencyChains,
  getProjectPredictions,
  generateAllPredictions,
} from '../../_actions/delivery-engine-actions';

interface DeliveryEngineDashboardClientProps {
  projectId: string;
}

export default function DeliveryEngineDashboardClient({ projectId }: DeliveryEngineDashboardClientProps) {
  const [activeTab, setActiveTab] = useState('predictions');
  const [loading, setLoading] = useState(false);
  const [commitmentHealth, setCommitmentHealth] = useState<any>(null);

  useEffect(() => {
    loadCommitmentHealth();
  }, [projectId]);

  const loadCommitmentHealth = async () => {
    const result = await getCommitmentHealthDashboard(projectId);
    if (result.success && result.dashboard) {
      setCommitmentHealth(result.dashboard);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Predictive Delivery Engine</h1>
        <p className="text-base text-muted-foreground mt-2">
          AI-powered delivery predictions with 90%+ confidence for sales commitments
        </p>
      </div>

      {/* Key Metrics */}
      {commitmentHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Delivery Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{commitmentHealth.deliveryRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {commitmentHealth.delivered} of {commitmentHealth.total} commitments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">At Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{commitmentHealth.atRisk}</div>
              <p className="text-xs text-muted-foreground">commitments need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Avg Delivery</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {commitmentHealth.avgDaysEarly > 0 ? '+' : ''}
                {commitmentHealth.avgDaysEarly} days
              </div>
              <p className="text-xs text-muted-foreground">
                {commitmentHealth.avgDaysEarly > 0 ? 'ahead of schedule' : 'behind schedule'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Revenue at Risk</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(commitmentHealth.atRiskRevenue / 1000).toFixed(0)}K
              </div>
              <p className="text-xs text-muted-foreground">
                of ${(commitmentHealth.totalRevenue / 1000).toFixed(0)}K total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="scenarios">What-If Scenarios</TabsTrigger>
          <TabsTrigger value="commitments">Commitments</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <PredictionsView projectId={projectId} />
        </TabsContent>

        {/* What-If Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <WhatIfScenariosView projectId={projectId} />
        </TabsContent>

        {/* Commitments Tab */}
        <TabsContent value="commitments" className="space-y-4">
          <CommitmentsView projectId={projectId} />
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-4">
          <DependenciesView projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================
// PREDICTIONS VIEW
// ==========================================

function PredictionsView({ projectId }: { projectId: string }) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing predictions on mount
  useEffect(() => {
    loadPredictions();
  }, [projectId]);

  const loadPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProjectPredictions(projectId);
      if (result.success && result.predictions) {
        setPredictions(result.predictions);
      }
    } catch (err) {
      setError('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePredictions = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateAllPredictions(projectId);
      if (result.success) {
        // Reload predictions after generating
        await loadPredictions();
      } else {
        setError(result.error || 'Failed to generate predictions');
      }
    } catch (err) {
      setError('Failed to generate predictions');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors: Record<string, string> = {
      VERY_HIGH: 'bg-green-500',
      HIGH: 'bg-blue-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-red-500',
    };
    return (
      <Badge className={colors[confidence] || 'bg-gray-500'}>
        {confidence?.replace('_', ' ') || 'PENDING'}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Delivery Predictions</CardTitle>
          <CardDescription>
            Monte Carlo simulations provide probabilistic delivery dates based on 10,000 simulation runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading predictions...
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No predictions yet. Click "Generate Predictions" to run Monte Carlo simulations.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predictions.map((prediction) => (
                  <Card key={prediction.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{prediction.targetTitle || 'Untitled'}</CardTitle>
                          <CardDescription className="text-xs">
                            {prediction.targetType} • {prediction.simulationRuns?.toLocaleString() || '10,000'} runs
                          </CardDescription>
                        </div>
                        {getConfidenceBadge(prediction.confidence)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-green-500/10">
                          <p className="text-xs text-muted-foreground">P50 (50%)</p>
                          <p className="text-sm font-medium text-green-400">
                            {prediction.p50Date ? formatDate(prediction.p50Date) : 'N/A'}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-blue-500/10">
                          <p className="text-xs text-muted-foreground">P70 (70%)</p>
                          <p className="text-sm font-medium text-blue-400">
                            {prediction.p70Date ? formatDate(prediction.p70Date) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="p-2 rounded bg-yellow-500/10">
                        <p className="text-xs text-muted-foreground">P90 (90%) - Safe Commitment</p>
                        <p className="text-sm font-bold text-yellow-400">
                          {prediction.p90Date ? formatDate(prediction.p90Date) : 'N/A'}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Velocity:</span>
                          <span>{prediction.historicalVelocity?.toFixed(1)} pts/week</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Updated:</span>
                          <span>{prediction.calculatedAt ? formatDate(prediction.calculatedAt) : 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button 
                variant="default" 
                onClick={handleGeneratePredictions}
                disabled={generating}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {generating ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Running Simulations...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Generate Predictions
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prediction Details */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Confidence Intervals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">P50 (50%)</Badge>
              <span>Median outcome - most balanced estimate</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500">P70 (70%)</Badge>
              <span>Conservative estimate - includes typical delays</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500">P90 (90%)</Badge>
              <span>Safe commitment date - accounts for major risks</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// WHAT-IF SCENARIOS VIEW
// ==========================================

function WhatIfScenariosView({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>What-If Scenario Analysis</CardTitle>
          <CardDescription>
            Simulate different scenarios to optimize delivery dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scenario templates */}
            <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg">Add Developers</CardTitle>
                <CardDescription>See impact of adding team members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Typical impact: 20-40% faster delivery
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg">Reduce Scope</CardTitle>
                <CardDescription>Impact of cutting features</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Direct correlation: 10% scope = ~10% time savings
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg">Remove Blockers</CardTitle>
                <CardDescription>Unblock critical dependencies</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  High impact on critical path tasks
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg">Custom Scenario</CardTitle>
                <CardDescription>Build your own what-if analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Combine multiple changes for complex scenarios
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// COMMITMENTS VIEW
// ==========================================

function CommitmentsView({ projectId }: { projectId: string }) {
  const [commitments, setCommitments] = useState<any[]>([]);

  useEffect(() => {
    loadCommitments();
  }, [projectId]);

  const loadCommitments = async () => {
    const result = await getProjectCommitments(projectId);
    if (result.success && result.commitments) {
      setCommitments(result.commitments);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DELIVERED: 'bg-green-500',
      ON_TRACK: 'bg-blue-500',
      PENDING: 'bg-gray-500',
      AT_RISK: 'bg-yellow-500',
      DELAYED: 'bg-orange-500',
      MISSED: 'bg-red-500',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-500'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Commitments Tracker</CardTitle>
            <CardDescription>Track promises vs. actual delivery</CardDescription>
          </div>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            New Commitment
          </Button>
        </CardHeader>
        <CardContent>
          {commitments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No commitments yet</p>
              <p className="text-sm">Create a commitment to start tracking delivery promises</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commitments.map((commitment) => (
                <Card key={commitment.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{commitment.targetTitle}</h4>
                        <p className="text-sm text-muted-foreground">
                          Committed to: {commitment.committedTo}
                        </p>
                      </div>
                      {getStatusBadge(commitment.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Committed Date</p>
                        <p className="font-medium">
                          {new Date(commitment.committedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-medium">
                          {(commitment.currentConfidence * 100).toFixed(0)}%
                        </p>
                      </div>
                      {commitment.revenueImpact && (
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-medium">
                            ${(commitment.revenueImpact / 1000).toFixed(0)}K
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// DEPENDENCIES VIEW
// ==========================================

function DependenciesView({ projectId }: { projectId: string }) {
  const [chains, setChains] = useState<any[]>([]);

  useEffect(() => {
    loadDependencyChains();
  }, [projectId]);

  const loadDependencyChains = async () => {
    const result = await getProjectDependencyChains(projectId);
    if (result.success && result.chains) {
      setChains(result.chains);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dependency Chain Analysis</CardTitle>
          <CardDescription>
            Identify critical paths and delay cascade risks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No dependency chains analyzed yet</p>
              <Button className="mt-4" variant="outline">
                Analyze Dependencies
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {chains.slice(0, 10).map((chain) => (
                <Card key={chain.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{chain.rootIssueTitle}</h4>
                        <p className="text-sm text-muted-foreground">
                          {chain.chainLength} dependent tasks • {chain.totalDaysAtRisk} days at risk
                        </p>
                      </div>
                      <Badge
                        className={
                          chain.riskScore > 70
                            ? 'bg-red-500'
                            : chain.riskScore > 40
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }
                      >
                        Risk: {chain.riskScore}
                      </Badge>
                    </div>
                    {chain.criticalPath && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-red-500 border-red-500">
                          ⚠️ On Critical Path
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
