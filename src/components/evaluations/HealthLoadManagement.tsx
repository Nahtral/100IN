import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Activity, Heart, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface HealthLoadProps {
  evaluations: any[];
  players: any[];
  language: Language;
}

export const HealthLoadManagement: React.FC<HealthLoadProps> = ({ evaluations, players, language }) => {
  const { t } = useTranslation(language);
  const [selectedMetric, setSelectedMetric] = useState<'injury' | 'load' | 'biomechanics'>('injury');

  // Mock data for demonstration - in production this would come from real biomechanics analysis
  const injuryRiskData = evaluations.map((evaluation, index) => ({
    date: new Date(evaluation.created_at).toLocaleDateString(),
    riskScore: Math.random() * 100,
    playerName: evaluation.players?.profiles?.full_name || 'Unknown',
    bodyAlignment: evaluation.body_alignment_score || Math.random() * 100,
    movement: evaluation.movement_score || Math.random() * 100
  }));

  const loadManagementData = [
    { week: 'Week 1', training: 85, recovery: 90, fatigue: 15 },
    { week: 'Week 2', training: 78, recovery: 85, fatigue: 22 },
    { week: 'Week 3', training: 82, recovery: 88, fatigue: 18 },
    { week: 'Week 4', training: 90, recovery: 75, fatigue: 35 }
  ];

  const biomechanicsAnalysis = {
    shootingMechanics: {
      releaseAngle: 45.2,
      releaseHeight: 2.1,
      footAlignment: 87,
      shoulderPosition: 92
    },
    movementPatterns: {
      lateralMovement: 78,
      acceleration: 85,
      deceleration: 72,
      changeOfDirection: 88
    }
  };

  const getInjuryPrediction = () => {
    const highRiskPlayers = evaluations.filter(e => e.injury_risk_level === 'high').length;
    const mediumRiskPlayers = evaluations.filter(e => e.injury_risk_level === 'medium').length;
    const lowRiskPlayers = evaluations.filter(e => e.injury_risk_level === 'low').length;
    
    return { high: highRiskPlayers, medium: mediumRiskPlayers, low: lowRiskPlayers };
  };

  const injuryPrediction = getInjuryPrediction();

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex space-x-2">
        <Button
          variant={selectedMetric === 'injury' ? 'default' : 'outline'}
          onClick={() => setSelectedMetric('injury')}
          className="btn-panthers"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {t('injuryPrevention')}
        </Button>
        <Button
          variant={selectedMetric === 'load' ? 'default' : 'outline'}
          onClick={() => setSelectedMetric('load')}
          className="btn-panthers"
        >
          <Activity className="h-4 w-4 mr-2" />
          {t('loadManagement')}
        </Button>
        <Button
          variant={selectedMetric === 'biomechanics' ? 'default' : 'outline'}
          onClick={() => setSelectedMetric('biomechanics')}
          className="btn-panthers"
        >
          <Heart className="h-4 w-4 mr-2" />
          {t('biomechanicsAnalysis')}
        </Button>
      </div>

      {/* Injury Prevention */}
      {selectedMetric === 'injury' && (
        <div className="space-y-6">
          {/* Risk Overview */}
          <div className="metrics-grid">
            <Card className="mobile-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('high')} Risk Players</p>
                    <p className="text-2xl font-bold text-red-600">{injuryPrediction.high}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="mobile-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('medium')} Risk Players</p>
                    <p className="text-2xl font-bold text-yellow-600">{injuryPrediction.medium}</p>
                  </div>
                  <Shield className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="mobile-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('low')} Risk Players</p>
                    <p className="text-2xl font-bold text-green-600">{injuryPrediction.low}</p>
                  </div>
                  <Heart className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Trend Chart */}
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle>Injury Risk Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={injuryRiskData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="riskScore" 
                    stroke="hsl(var(--panthers-red))" 
                    strokeWidth={2}
                    name="Risk Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* High Risk Players Alert */}
          <Card className="mobile-card border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>High Risk Players Requiring Attention</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {evaluations
                  .filter(e => e.injury_risk_level === 'high')
                  .slice(0, 3)
                  .map((evaluation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium">{evaluation.players?.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Body alignment: {evaluation.body_alignment_score}% | 
                          Movement: {evaluation.movement_score}%
                        </p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">Immediate Action</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Load Management */}
      {selectedMetric === 'load' && (
        <div className="space-y-6">
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle>Weekly Training Load Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={loadManagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="training" fill="hsl(var(--panther-blue))" name="Training Load" />
                  <Bar dataKey="recovery" fill="hsl(var(--panther-gold))" name="Recovery Score" />
                  <Bar dataKey="fatigue" fill="hsl(var(--panthers-red))" name="Fatigue Level" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="card-grid">
            <Card className="mobile-card">
              <CardHeader>
                <CardTitle className="text-lg">Training Intensity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Current Week</span>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Recommended</span>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Reduce intensity by 10%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="mobile-card">
              <CardHeader>
                <CardTitle className="text-lg">Recovery Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sleep Quality</span>
                    <Badge className="bg-green-100 text-green-800">Good</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Heart Rate Variability</span>
                    <Badge className="bg-green-100 text-green-800">Normal</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Muscle Soreness</span>
                    <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Biomechanics Analysis */}
      {selectedMetric === 'biomechanics' && (
        <div className="space-y-6">
          <div className="card-grid">
            <Card className="mobile-card">
              <CardHeader>
                <CardTitle className="text-lg">Shooting Mechanics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Release Angle</span>
                      <span className="text-sm font-medium">{biomechanicsAnalysis.shootingMechanics.releaseAngle}°</span>
                    </div>
                    <Progress value={90} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Release Height</span>
                      <span className="text-sm font-medium">{biomechanicsAnalysis.shootingMechanics.releaseHeight}m</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Foot Alignment</span>
                      <span className="text-sm font-medium">{biomechanicsAnalysis.shootingMechanics.footAlignment}%</span>
                    </div>
                    <Progress value={biomechanicsAnalysis.shootingMechanics.footAlignment} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Shoulder Position</span>
                      <span className="text-sm font-medium">{biomechanicsAnalysis.shootingMechanics.shoulderPosition}%</span>
                    </div>
                    <Progress value={biomechanicsAnalysis.shootingMechanics.shoulderPosition} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mobile-card">
              <CardHeader>
                <CardTitle className="text-lg">Movement Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Lateral Movement</span>
                      <span className="text-sm font-medium">{biomechanicsAnalysis.movementPatterns.lateralMovement}%</span>
                    </div>
                    <Progress value={biomechanicsAnalysis.movementPatterns.lateralMovement} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Acceleration</span>
                      <span className="text-sm font-medium">{biomechanicsAnalysis.movementPatterns.acceleration}%</span>
                    </div>
                    <Progress value={biomechanicsAnalysis.movementPatterns.acceleration} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Deceleration</span>
                      <span className="text-sm font-medium">{biomechanicsAnalysis.movementPatterns.deceleration}%</span>
                    </div>
                    <Progress value={biomechanicsAnalysis.movementPatterns.deceleration} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Change of Direction</span>
                      <span className="text-sm font-medium">{biomechanicsAnalysis.movementPatterns.changeOfDirection}%</span>
                    </div>
                    <Progress value={biomechanicsAnalysis.movementPatterns.changeOfDirection} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendations */}
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle>AI Biomechanics Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <h4 className="font-semibold text-blue-800 mb-2">Shooting Form Optimization</h4>
                  <p className="text-sm text-blue-700">
                    Analysis shows slight inconsistency in release point. Focus on core stability exercises 
                    and repetitive shooting drills with consistent follow-through.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <h4 className="font-semibold text-yellow-800 mb-2">Movement Efficiency</h4>
                  <p className="text-sm text-yellow-700">
                    Deceleration mechanics need improvement. Recommend plyometric exercises 
                    focusing on eccentric control and landing mechanics.
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <h4 className="font-semibold text-green-800 mb-2">Injury Prevention</h4>
                  <p className="text-sm text-green-700">
                    Excellent lateral movement patterns. Continue current mobility routine 
                    and add rotational core strengthening exercises.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};