import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  FileText, 
  Calendar, 
  Target, 
  Activity, 
  Settings,
  Globe
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { EvaluationDashboard } from './EvaluationDashboard';
import { PlayerReports } from './PlayerReports';
import { HealthLoadManagement } from './HealthLoadManagement';
import { useTranslation, Language } from '@/lib/i18n';

interface EvaluationResultsProps {
  evaluations: any[];
  players: any[];
}

export const EvaluationResults: React.FC<EvaluationResultsProps> = ({ evaluations, players }) => {
  const { isSuperAdmin, hasRole, canAccessMedical } = useUserRole();
  const { isTestMode, effectiveIsSuperAdmin, testHasRole, testCanAccessMedical } = useRoleSwitcher();
  const [language, setLanguage] = useState<Language>('en');
  const { t } = useTranslation(language);
  
  // Use effective roles when in test mode
  const currentIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin;
  const currentHasRole = (role: string) => isTestMode ? testHasRole(role) : hasRole(role);
  const currentCanAccessMedical = isTestMode ? testCanAccessMedical() : canAccessMedical();

  // Mock game log and drill plan data
  const gameLogData = [
    {
      id: 1,
      date: '2024-01-15',
      opponent: 'Thunder Bolts',
      result: 'W 89-76',
      performance: {
        shooting: 78,
        passing: 82,
        dribbling: 75,
        movement: 88
      }
    },
    {
      id: 2,
      date: '2024-01-10',
      opponent: 'Lightning Strikes',
      result: 'L 72-85',
      performance: {
        shooting: 65,
        passing: 78,
        dribbling: 72,
        movement: 80
      }
    }
  ];

  const drillPlanData = [
    {
      category: 'Shooting',
      drills: [
        { name: 'Form Shooting', duration: '15 min', focus: 'Mechanics' },
        { name: 'Spot Shooting', duration: '20 min', focus: 'Accuracy' },
        { name: 'Game Shots', duration: '15 min', focus: 'Game Simulation' }
      ]
    },
    {
      category: 'Ball Handling',
      drills: [
        { name: 'Stationary Dribbling', duration: '10 min', focus: 'Control' },
        { name: 'Cone Weaving', duration: '15 min', focus: 'Agility' },
        { name: 'Two-Ball Drills', duration: '10 min', focus: 'Coordination' }
      ]
    }
  ];

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
        <TabsContent value="dashboard">
          <EvaluationDashboard 
            evaluations={evaluations} 
            language={language}
          />
        </TabsContent>

        {/* Player Reports Tab */}
        <TabsContent value="reports">
          <PlayerReports 
            evaluations={evaluations} 
            players={players}
            language={language}
          />
        </TabsContent>

        {/* Game Log Tab */}
        <TabsContent value="gameLog">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{t('gameLog')}</h3>
              <Button className="btn-panthers">Add Game</Button>
            </div>
            
            <div className="space-y-4">
              {gameLogData.map((game) => (
                <div key={game.id} className="mobile-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{game.opponent}</h4>
                      <p className="text-sm text-muted-foreground">{game.date}</p>
                    </div>
                    <Badge variant={game.result.startsWith('W') ? 'default' : 'destructive'}>
                      {game.result}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{game.performance.shooting}%</div>
                      <div className="text-xs text-muted-foreground">{t('shootingAccuracy')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{game.performance.passing}%</div>
                      <div className="text-xs text-muted-foreground">{t('passingPrecision')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{game.performance.dribbling}%</div>
                      <div className="text-xs text-muted-foreground">{t('dribblingControl')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{game.performance.movement}%</div>
                      <div className="text-xs text-muted-foreground">{t('movement')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Drill Plan Tab */}
        <TabsContent value="drillPlan">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{t('personalizedTraining')}</h3>
              <Button className="btn-panthers">{t('generate')} New Plan</Button>
            </div>
            
            <div className="card-grid">
              {drillPlanData.map((category, index) => (
                <div key={index} className="mobile-card">
                  <div className="mobile-card-header">
                    <h4 className="font-semibold">{category.category}</h4>
                  </div>
                  <div className="space-y-3">
                    {category.drills.map((drill, drillIndex) => (
                      <div key={drillIndex} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{drill.name}</p>
                          <p className="text-xs text-muted-foreground">{drill.focus}</p>
                        </div>
                        <Badge variant="outline">{drill.duration}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Health & Load Tab */}
        {currentCanAccessMedical && (
          <TabsContent value="health">
            <HealthLoadManagement 
              evaluations={evaluations} 
              players={players}
              language={language}
            />
          </TabsContent>
        )}

        {/* Admin Tab */}
        {currentIsSuperAdmin && (
          <TabsContent value="admin">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">{t('systemManagement')}</h3>
              
              <div className="card-grid">
                <div className="mobile-card">
                  <div className="mobile-card-header">
                    <h4 className="font-semibold">System Settings</h4>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Configure AI Models
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Analysis Parameters
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Export Settings
                    </Button>
                  </div>
                </div>

                <div className="mobile-card">
                  <div className="mobile-card-header">
                    <h4 className="font-semibold">User Management</h4>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Manage Permissions
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Role Assignment
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Access Logs
                    </Button>
                  </div>
                </div>

                <div className="mobile-card">
                  <div className="mobile-card-header">
                    <h4 className="font-semibold">Data Management</h4>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Backup System
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Data Export
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Analytics Reports
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};