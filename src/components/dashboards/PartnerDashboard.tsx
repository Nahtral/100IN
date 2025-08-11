
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Handshake, 
  TrendingUp, 
  Calendar, 
  Users,
  DollarSign,
  Award,
  Target,
  MessageSquare,
  Trophy,
  Eye,
  Contact
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PartnerData {
  totalInvestment: number;
  activeTeams: number;
  sponsorships: any[];
  partnerInfo: any;
}

interface TeamPerformance {
  teamName: string;
  record: string;
  ranking: string;
  performance: string;
  sponsorshipAmount: number;
}

const PartnerDashboard = () => {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamPerformance | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchPartnerData();
  }, []);

  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      
      // Fetch partner organizations
      const { data: partners, error: partnersError } = await supabase
        .from('partner_organizations')
        .select('*')
        .eq('partnership_status', 'active');

      if (partnersError) throw partnersError;

      // Fetch sponsorships with team information
      const { data: sponsorships, error: sponsorshipsError } = await supabase
        .from('partner_team_sponsorships')
        .select(`
          *,
          partner_organizations!inner(name, partnership_type),
          teams!inner(name, age_group, season)
        `)
        .eq('status', 'active');

      if (sponsorshipsError) throw sponsorshipsError;

      // Calculate metrics
      const totalInvestment = sponsorships?.reduce((sum, s) => sum + (s.sponsorship_amount || 0), 0) || 0;
      const activeTeams = new Set(sponsorships?.map(s => s.team_id)).size || 0;

      // Generate team performance data (simulated since we don't have actual game data)
      const teamPerformanceData: TeamPerformance[] = sponsorships?.map(sponsorship => ({
        teamName: sponsorship.teams.name + ' ' + sponsorship.teams.age_group,
        record: generateRecord(),
        ranking: generateRanking(),
        performance: getPerformanceLevel(),
        sponsorshipAmount: sponsorship.sponsorship_amount || 0
      })) || [];

      setPartnerData({
        totalInvestment,
        activeTeams,
        sponsorships: sponsorships || [],
        partnerInfo: partners?.[0] || null
      });
      
      setTeamPerformance(teamPerformanceData);
    } catch (error) {
      console.error('Error fetching partner data:', error);
      toast({
        title: "Error",
        description: "Failed to load partner data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for generating sample performance data
  const generateRecord = () => {
    const wins = Math.floor(Math.random() * 15) + 5;
    const losses = Math.floor(Math.random() * 8) + 1;
    return `${wins}-${losses}`;
  };

  const generateRanking = () => {
    const rank = Math.floor(Math.random() * 10) + 1;
    return `#${rank} League`;
  };

  const getPerformanceLevel = () => {
    const performances = ['Excellent', 'Good', 'Average'];
    return performances[Math.floor(Math.random() * performances.length)];
  };

  const handleViewDetails = (team: TeamPerformance) => {
    setSelectedTeam(team);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <Layout currentUser={currentUser}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl mb-4 animate-pulse">
              <Handshake className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Partner Dashboard</h2>
            <p className="text-gray-600">Loading partnership data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentUser={currentUser}>
      <div className="mobile-section">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mobile-title text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Partner Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 mobile-text">
              Welcome back, {currentUser.name}! Monitor your partnership.
            </p>
          </div>
        </div>
        {/* Partnership Overview */}
        <div className="metrics-grid">
          <Card className="border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{partnerData?.activeTeams || 0}</div>
              <p className="text-xs text-muted-foreground">
                Under sponsorship
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(partnerData?.totalInvestment || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                This season
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Brand Exposure</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4M</div>
              <p className="text-xs text-muted-foreground">
                Estimated impressions
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.2x</div>
              <p className="text-xs text-muted-foreground">
                Estimated return
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="card-grid">
          {/* Sponsored Teams Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Sponsored Teams Performance
              </CardTitle>
              <CardDescription>
                How your teams are performing this season
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamPerformance.length > 0 ? teamPerformance.map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-medium">{team.teamName}</p>
                      <p className="text-sm text-gray-600">{team.record} • {team.ranking}</p>
                      <p className="text-xs text-gray-500">Sponsorship: ${team.sponsorshipAmount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        team.performance === 'Excellent' ? 'default' :
                        team.performance === 'Good' ? 'secondary' : 'outline'
                      }>
                        {team.performance}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewDetails(team)}
                        className="mobile-btn-sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-gray-500 py-4">No team data available</p>
                )}
              </div>
              <Button className="w-full mt-4 mobile-btn bg-gradient-to-r from-yellow-500 to-yellow-600">
                View Detailed Reports
              </Button>
            </CardContent>
          </Card>

          {/* Marketing Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Marketing Impact
              </CardTitle>
              <CardDescription>
                Brand visibility and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Game Attendance</span>
                    <span className="font-medium">+15%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{width: '85%'}}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Social Media Reach</span>
                    <span className="font-medium">+32%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{width: '78%'}}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Brand Recognition</span>
                    <span className="font-medium">+28%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{width: '72%'}}></div>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-4 mobile-btn bg-gradient-to-r from-green-500 to-green-600">
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Communication Center */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Communication Center
            </CardTitle>
            <CardDescription>
              Direct communication with teams and management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button className="mobile-btn bg-gradient-to-r from-blue-500 to-blue-600">
                <Contact className="h-4 w-4 mr-2" />
                Message Team Managers
              </Button>
              <Button className="mobile-btn bg-gradient-to-r from-green-500 to-green-600">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Partnership Review
              </Button>
              <Button className="mobile-btn bg-gradient-to-r from-purple-500 to-purple-600">
                <Award className="h-4 w-4 mr-2" />
                Request Performance Report
              </Button>
              <Button className="mobile-btn bg-gradient-to-r from-orange-500 to-orange-600">
                <DollarSign className="h-4 w-4 mr-2" />
                Discuss Renewal Terms
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Team Details: {selectedTeam?.teamName}
              </DialogTitle>
            </DialogHeader>
            {selectedTeam && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Record:</span>
                          <span className="font-medium">{selectedTeam.record}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">League Ranking:</span>
                          <span className="font-medium">{selectedTeam.ranking}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Performance Level:</span>
                          <Badge variant={
                            selectedTeam.performance === 'Excellent' ? 'default' :
                            selectedTeam.performance === 'Good' ? 'secondary' : 'outline'
                          }>
                            {selectedTeam.performance}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Sponsorship</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Amount:</span>
                          <span className="font-medium">${selectedTeam.sponsorshipAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Type:</span>
                          <span className="font-medium">Financial</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button className="mobile-btn-sm" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message Team
                  </Button>
                  <Button className="mobile-btn-sm" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                  <Button className="mobile-btn-sm" variant="outline">
                    <Trophy className="h-4 w-4 mr-2" />
                    View Full Stats
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PartnerDashboard;
