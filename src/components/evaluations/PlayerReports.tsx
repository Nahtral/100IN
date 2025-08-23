import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, User, TrendingUp, Target, Activity } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';

interface PlayerReportsProps {
  evaluations: any[];
  players: any[];
  language: Language;
}

export const PlayerReports: React.FC<PlayerReportsProps> = ({ evaluations, players, language }) => {
  const { t } = useTranslation(language);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [reportType, setReportType] = useState<'individual' | 'comparison'>('individual');

  const getPlayerEvaluations = (playerId: string) => {
    return evaluations.filter(e => e.player_id === playerId && e.analysis_status === 'completed');
  };

  const generateScoutingReport = (playerId: string) => {
    const playerEvals = getPlayerEvaluations(playerId);
    if (playerEvals.length === 0) return null;

    const latest = playerEvals[0];
    const avgScores = {
      shooting: playerEvals.reduce((sum, e) => sum + (e.shooting_score || 0), 0) / playerEvals.length,
      passing: playerEvals.reduce((sum, e) => sum + (e.passing_score || 0), 0) / playerEvals.length,
      dribbling: playerEvals.reduce((sum, e) => sum + (e.dribbling_score || 0), 0) / playerEvals.length,
      movement: playerEvals.reduce((sum, e) => sum + (e.movement_score || 0), 0) / playerEvals.length,
    };

    return {
      player: latest.players,
      averageScores: avgScores,
      latestEvaluation: latest,
      evaluationCount: playerEvals.length,
      strengths: Object.entries(avgScores)
        .filter(([_, score]) => score >= 75)
        .map(([skill, _]) => skill),
      weaknesses: Object.entries(avgScores)
        .filter(([_, score]) => score < 60)
        .map(([skill, _]) => skill)
    };
  };

  const selectedPlayerReport = selectedPlayer ? generateScoutingReport(selectedPlayer) : null;

  const exportReport = () => {
    if (!selectedPlayerReport) return;
    
    const reportData = {
      player: selectedPlayerReport.player.profiles.full_name,
      generated: new Date().toISOString(),
      scores: selectedPlayerReport.averageScores,
      strengths: selectedPlayerReport.strengths,
      weaknesses: selectedPlayerReport.weaknesses,
      recommendations: selectedPlayerReport.latestEvaluation.development_plan
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedPlayerReport.player.profiles.full_name}_report.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={`Select ${t('player').toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {players.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                {player.profiles.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={reportType === 'individual' ? 'default' : 'outline'}
            onClick={() => setReportType('individual')}
            className="btn-panthers"
          >
            Individual Report
          </Button>
          <Button
            variant={reportType === 'comparison' ? 'default' : 'outline'}
            onClick={() => setReportType('comparison')}
            className="btn-panthers"
          >
            {t('compare')}
          </Button>
        </div>
      </div>

      {selectedPlayerReport && (
        <div className="space-y-6">
          {/* Player Header */}
          <Card className="mobile-card gradient-primary text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedPlayerReport.player.profiles.full_name}
                    </h2>
                    <p className="text-white/80">
                      {selectedPlayerReport.evaluationCount} {t('recentEvaluations')}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={exportReport}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Skill Analysis */}
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-panther-blue" />
                <span>{t('skillAnalysis')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{t('shootingAccuracy')}</span>
                      <span className="text-sm text-muted-foreground">
                        {selectedPlayerReport.averageScores.shooting.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={selectedPlayerReport.averageScores.shooting} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{t('passingPrecision')}</span>
                      <span className="text-sm text-muted-foreground">
                        {selectedPlayerReport.averageScores.passing.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={selectedPlayerReport.averageScores.passing} className="h-3" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{t('dribblingControl')}</span>
                      <span className="text-sm text-muted-foreground">
                        {selectedPlayerReport.averageScores.dribbling.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={selectedPlayerReport.averageScores.dribbling} className="h-3" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{t('movement')}</span>
                      <span className="text-sm text-muted-foreground">
                        {selectedPlayerReport.averageScores.movement.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={selectedPlayerReport.averageScores.movement} className="h-3" />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Strengths */}
                  <div>
                    <h4 className="font-semibold mb-2 text-green-600">Strengths</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlayerReport.strengths.map((strength, index) => (
                        <Badge key={index} className="bg-green-100 text-green-800">
                          {t(strength as any)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Areas for Improvement */}
                  <div>
                    <h4 className="font-semibold mb-2 text-yellow-600">Areas for Improvement</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlayerReport.weaknesses.map((weakness, index) => (
                        <Badge key={index} className="bg-yellow-100 text-yellow-800">
                          {t(weakness as any)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div>
                    <h4 className="font-semibold mb-2">Risk Assessment</h4>
                    <Badge 
                      className={
                        selectedPlayerReport.latestEvaluation.injury_risk_level === 'low' 
                          ? 'bg-green-100 text-green-800'
                          : selectedPlayerReport.latestEvaluation.injury_risk_level === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {t(selectedPlayerReport.latestEvaluation.injury_risk_level as any)} Risk
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Development Plan */}
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-panther-gold" />
                <span>{t('developmentPlan')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground mb-4">
                  {selectedPlayerReport.latestEvaluation.development_plan || 'No development plan available.'}
                </p>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-semibold mb-2">AI Recommendations:</h5>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlayerReport.latestEvaluation.feedback || 'No specific feedback available.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedPlayer && (
        <Card className="mobile-card">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Player</h3>
            <p className="text-muted-foreground">
              Choose a player from the dropdown to generate detailed reports and analysis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};