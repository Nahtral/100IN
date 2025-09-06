import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Users, Trophy, AlertTriangle, Target } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useTranslation, Language } from '@/lib/i18n';

interface DashboardProps {
  evaluations: any[];
  language: Language;
}

export const EvaluationDashboard: React.FC<DashboardProps> = ({ evaluations, language }) => {
  const { t } = useTranslation(language);
  const { primaryRole, isSuperAdmin } = useOptimizedAuth();

  // Calculate KPIs based on role
  const getKPIs = () => {
    const completedEvaluations = evaluations.filter(e => e.analysis_status === 'completed');
    const totalPlayers = new Set(evaluations.map(e => e.player_id)).size;
    const avgShootingScore = completedEvaluations.reduce((sum, e) => sum + (e.shooting_score || 0), 0) / completedEvaluations.length || 0;
    const highRiskPlayers = completedEvaluations.filter(e => e.injury_risk_level === 'high').length;
    
    if (isSuperAdmin) {
      return [
        { title: t('recentEvaluations'), value: evaluations.length, icon: BarChart3, color: 'text-panther-blue' },
        { title: t('player'), value: totalPlayers, icon: Users, color: 'text-deep-teal' },
        { title: 'Avg Performance', value: `${avgShootingScore.toFixed(1)}%`, icon: Trophy, color: 'text-panther-gold' },
        { title: 'High Risk', value: highRiskPlayers, icon: AlertTriangle, color: 'text-panthers-red' }
      ];
    }
    
    // Role-specific KPIs for coaches, medical staff, etc.
    return [
      { title: 'Team Performance', value: `${avgShootingScore.toFixed(1)}%`, icon: Target, color: 'text-panther-blue' },
      { title: 'Active Players', value: totalPlayers, icon: Users, color: 'text-deep-teal' },
      { title: 'Improvement', value: '+5.2%', icon: TrendingUp, color: 'text-panther-gold' }
    ];
  };

  const kpis = getKPIs();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="metrics-grid">
        {kpis.map((kpi, index) => (
          <Card key={index} className="mobile-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Overview */}
      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-panther-blue" />
            <span>{t('performanceOverview')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {evaluations.slice(0, 5).map((evaluation, index) => (
              <div key={evaluation.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-panther-gold/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-panther-gold">
                      {evaluation.players?.profiles?.full_name?.charAt(0) || 'P'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{evaluation.players?.profiles?.full_name || 'Unknown Player'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(evaluation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={evaluation.analysis_status === 'completed' ? 'default' : 'secondary'}>
                    {t(evaluation.analysis_status as any)}
                  </Badge>
                  {evaluation.shooting_score && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {evaluation.shooting_score}% avg
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="card-grid">
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-lg">Skill Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('shootingAccuracy')}</span>
                  <span>75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('passingPrecision')}</span>
                  <span>82%</span>
                </div>
                <Progress value={82} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('dribblingControl')}</span>
                  <span>68%</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-lg">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('low')} Risk</span>
                <Badge className="bg-green-100 text-green-800">65%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('medium')} Risk</span>
                <Badge className="bg-yellow-100 text-yellow-800">25%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('high')} Risk</span>
                <Badge className="bg-red-100 text-red-800">10%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};