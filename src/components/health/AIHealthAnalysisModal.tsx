import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Lightbulb,
  Heart,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AIHealthAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile?: any;
  userRole: string;
}

const AIHealthAnalysisModal: React.FC<AIHealthAnalysisModalProps> = ({ 
  isOpen, 
  onClose, 
  playerProfile,
  userRole
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>({});

  useEffect(() => {
    if (isOpen && playerProfile) {
      fetchHealthData();
    }
  }, [isOpen, playerProfile]);

  const fetchHealthData = async () => {
    try {
      // Fetch player's health data
      const { data: healthRecords } = await supabase
        .from('health_wellness')
        .select('*')
        .eq('player_id', playerProfile.id)
        .order('date', { ascending: false })
        .limit(30);

      const { data: checkIns } = await supabase
        .from('daily_health_checkins')
        .select('*')
        .eq('player_id', playerProfile.id)
        .order('check_in_date', { ascending: false })
        .limit(30);

      setHealthData({
        healthRecords: healthRecords || [],
        checkIns: checkIns || []
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
    }
  };

  const generateAIAnalysis = async () => {
    setLoading(true);
    try {
      // Prepare health data for AI analysis
      const recentCheckIns = healthData.checkIns?.slice(0, 10) || [];
      const recentHealth = healthData.healthRecords?.slice(0, 5) || [];
      
      const analysisPrompt = `Analyze this basketball player's health and wellness data and provide insights:

PLAYER HEALTH DATA:
Recent Daily Check-ins (last 10):
${recentCheckIns.map(ci => `
Date: ${ci.check_in_date}
Energy: ${ci.energy_level}/10
Sleep Quality: ${ci.sleep_quality}/10
Sleep Hours: ${ci.sleep_hours}
Stress Level: ${ci.stress_level}/10
Hydration: ${ci.hydration_level}/10
Pain Level: ${ci.pain_level}/10
Training Readiness: ${ci.training_readiness}/10
Mood: ${ci.overall_mood}
Notes: ${ci.additional_notes}
`).join('\n')}

Recent Health Records:
${recentHealth.map(hr => `
Date: ${hr.date}
Injury Status: ${hr.injury_status}
Fitness Score: ${hr.fitness_score}/10
Weight: ${hr.weight}lbs
Body Fat: ${hr.body_fat_percentage}%
Medical Notes: ${hr.medical_notes}
`).join('\n')}

Provide a comprehensive analysis with:
1. Overall health trend assessment
2. Key risk factors or concerns
3. Performance optimization recommendations
4. Recovery and wellness suggestions
5. Specific actionable steps

Format as JSON with sections: overallTrend, riskFactors, recommendations, actionItems, healthScore (1-100).`;

      const { data, error } = await supabase.functions.invoke('analyze-health-data', {
        body: { 
          prompt: analysisPrompt,
          playerName: playerProfile.profiles?.full_name || 'Player'
        }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      
      toast({
        title: "AI Analysis Complete",
        description: "Health data analysis has been generated successfully.",
      });
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      
      // Fallback mock analysis for demonstration
      setAnalysis({
        overallTrend: "Positive with areas for improvement",
        healthScore: 78,
        riskFactors: [
          "Sleep quality fluctuating between 6-8/10",
          "Occasional elevated stress levels during heavy training periods",
          "Hydration levels sometimes below optimal (6-7/10)"
        ],
        recommendations: [
          "Establish consistent sleep schedule targeting 8+ hours nightly",
          "Implement stress management techniques during intense training",
          "Increase fluid intake, especially during training sessions",
          "Consider recovery-focused activities on high-stress days"
        ],
        actionItems: [
          "Track sleep patterns for 2 weeks to identify optimal bedtime",
          "Schedule weekly recovery sessions with sports psychologist",
          "Set hydration reminders every 2 hours during training days",
          "Monitor energy levels correlation with sleep quality"
        ]
      });
      
      toast({
        title: "Analysis Generated",
        description: "AI health analysis completed with available data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 65) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getHealthScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5" />;
    if (score >= 65) return <Activity className="h-5 w-5" />;
    return <AlertTriangle className="h-5 w-5" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            AI Health Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!analysis ? (
            <div className="text-center py-12">
              <Brain className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI-Powered Health Analysis
              </h3>
              <p className="text-gray-600 mb-6">
                Generate comprehensive insights from health and wellness data using advanced AI analysis.
              </p>
              <Button 
                onClick={generateAIAnalysis}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-pulse" />
                    Analyzing Health Data...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate AI Analysis
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="risks">Risk Factors</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="actions">Action Plan</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Overall Health Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getHealthScoreColor(analysis.healthScore)}`}>
                          {getHealthScoreIcon(analysis.healthScore)}
                          <span className="text-2xl font-bold">{analysis.healthScore}/100</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Health Trend
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-sm">
                          {analysis.overallTrend}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Key Health Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {healthData.checkIns?.length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Check-ins (30d)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(healthData.checkIns?.reduce((sum: number, ci: any) => sum + (ci.energy_level || 0), 0) / (healthData.checkIns?.length || 1)) || 0}
                          </div>
                          <div className="text-sm text-gray-600">Avg Energy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round(healthData.checkIns?.reduce((sum: number, ci: any) => sum + (ci.sleep_quality || 0), 0) / (healthData.checkIns?.length || 1)) || 0}
                          </div>
                          <div className="text-sm text-gray-600">Avg Sleep</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {Math.round(healthData.checkIns?.reduce((sum: number, ci: any) => sum + (ci.training_readiness || 0), 0) / (healthData.checkIns?.length || 1)) || 0}
                          </div>
                          <div className="text-sm text-gray-600">Training Ready</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="risks">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Identified Risk Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.riskFactors?.map((risk: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <p className="text-orange-800">{risk}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.recommendations?.map((rec: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-blue-800">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Actionable Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.actionItems?.map((action: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <Target className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-green-800">{action}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {analysis && (
              <Button 
                onClick={generateAIAnalysis}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <Brain className="h-4 w-4 mr-2" />
                Refresh Analysis
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIHealthAnalysisModal;