import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  FileText, 
  Calendar, 
  Target, 
  Activity, 
  Settings,
  Globe,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { EvaluationDashboard } from './EvaluationDashboard';
import { PlayerReports } from './PlayerReports';
import { HealthLoadManagement } from './HealthLoadManagement';
import { GameLogUpload } from './GameLogUpload';
import { useTranslation, Language } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface EvaluationResultsProps {
  evaluations: any[];
  players: any[];
}

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({ evaluations, players }) => {
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const { isTestMode, effectiveIsSuperAdmin, testHasRole, testCanAccessMedical } = useRoleSwitcher();
  const [language, setLanguage] = useState<Language>('en');
  const { t } = useTranslation(language);
  const [gameLogData, setGameLogData] = useState<any[]>([]);
  const [drillPlanData, setDrillPlanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use effective roles when in test mode
  const currentIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin;
  const currentHasRole = (role: string) => isTestMode ? testHasRole(role) : hasRole(role);
  const currentCanAccessMedical = isTestMode ? testCanAccessMedical() : (isSuperAdmin() || hasRole('medical'));

  useEffect(() => {
    fetchGameLogs();
    fetchDrillPlans();
  }, []);

  const fetchGameLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('game_logs')
        .select(`
          *,
          players(
            id,
            first_name,
            last_name,
            user_id
          )
        `)
        .order('game_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching game logs:', error);
        return;
      }

      setGameLogData(data || []);
    } catch (error) {
      console.error('Error fetching game logs:', error);
    }
  };

  const handleRefresh = () => {
    fetchGameLogs();
    fetchDrillPlans();
  };

  const fetchDrillPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('drill_plans')
        .select(`
          *,
          players!inner(
            user_id,
            profiles!inner(full_name)
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching drill plans:', error);
        return;
      }

      setDrillPlanData(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching drill plans:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Language Selector */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">AI-Powered Evaluation Results</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis and development tracking system
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Role Badge */}
          {isTestMode && (
            <Badge variant="outline" className="border-yellow-400 text-yellow-600">
              Test Mode
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard')}</span>
          </TabsTrigger>
          
          <TabsTrigger value="reports" className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('playerReports')}</span>
          </TabsTrigger>
          
          <TabsTrigger value="gameLog" className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t('gameLog')}</span>
          </TabsTrigger>
          
          <TabsTrigger value="drillPlan" className="flex items-center space-x-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">{t('drillPlan')}</span>
          </TabsTrigger>
          
          {currentCanAccessMedical && (
            <TabsTrigger value="health" className="flex items-center space-x-1">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">{t('healthLoad')}</span>
            </TabsTrigger>
          )}
          
          {currentIsSuperAdmin && (
            <TabsTrigger value="admin" className="flex items-center space-x-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin')}</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <EvaluationDashboard evaluations={evaluations} language={language} />
        </TabsContent>

        {/* Player Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <PlayerReports evaluations={evaluations} players={players} language={language} />
        </TabsContent>

        {/* Game Log Tab */}
        <TabsContent value="gameLog" className="space-y-6">
          <GameLogUpload onStatsExtracted={handleRefresh} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{t('gameLog')}</span>
              </CardTitle>
              <CardDescription>
                {t('trackGamePerformance')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : gameLogData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No game logs available. Game performance data will appear here once games are recorded.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>{t('opponent')}</TableHead>
                      <TableHead>{t('result')}</TableHead>
                      <TableHead>{t('points')}</TableHead>
                      <TableHead>{t('rebounds')}</TableHead>
                      <TableHead>{t('assists')}</TableHead>
                      <TableHead>{t('rating')}</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameLogData.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>{format(new Date(game.game_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          {game.players?.first_name} {game.players?.last_name}
                        </TableCell>
                        <TableCell>{game.opponent}</TableCell>
                        <TableCell>
                          <Badge variant={game.result.startsWith('W') ? 'default' : 'secondary'}>
                            {game.result}
                          </Badge>
                        </TableCell>
                        <TableCell>{game.points}</TableCell>
                        <TableCell>{game.rebounds}</TableCell>
                        <TableCell>{game.assists}</TableCell>
                        <TableCell>{game.game_rating}</TableCell>
                        <TableCell>
                          <Badge variant={game.upload_method === 'screenshot' ? 'outline' : 'secondary'}>
                            {game.upload_method === 'screenshot' ? 'AI' : 'Manual'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drill Plan Tab */}
        <TabsContent value="drillPlan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>{t('drillPlan')}</span>
              </CardTitle>
              <CardDescription>
                {t('personalizedTrainingPlans')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : drillPlanData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No drill plans available. AI-recommended and custom training plans will appear here.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {drillPlanData.map((plan) => (
                    <Card key={plan.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{plan.category}</Badge>
                          <Badge variant={plan.ai_recommended ? 'default' : 'secondary'}>
                            {plan.ai_recommended ? 'AI' : 'Manual'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <strong>Player:</strong> {plan.players?.profiles?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm">
                            <strong>Duration:</strong> {plan.duration_minutes} minutes
                          </div>
                          <div className="text-sm">
                            <strong>Level:</strong> {plan.difficulty_level}
                          </div>
                          <div className="text-sm">
                            <strong>Focus Areas:</strong> {plan.focus_areas?.join(', ') || 'General'}
                          </div>
                        </div>
                        <Progress value={plan.completion_percentage || 0} className="mt-2" />
                        <div className="text-xs text-muted-foreground">
                          {plan.completion_percentage || 0}% Complete
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health & Load Management Tab */}
        {currentCanAccessMedical && (
          <TabsContent value="health" className="space-y-6">
            <HealthLoadManagement evaluations={evaluations} players={players} language={language} />
          </TabsContent>
        )}

        {/* Admin Tab */}
        {currentIsSuperAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>{t('adminSettings')}</span>
                </CardTitle>
                <CardDescription>
                  {t('systemConfiguration')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('dataManagement')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        {t('exportEvaluations')}
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        {t('importPlayers')}
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        {t('backupData')}
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('systemSettings')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        {t('configureAI')}
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        {t('managePermissions')}
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        {t('viewLogs')}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};