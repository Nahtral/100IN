import React from 'react';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Layout from '@/components/layout/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Analytics = () => {
  const { currentUser } = useCurrentUser();
  const { 
    playerDistribution, 
    performanceData, 
    attendanceData, 
    keyMetrics, 
    recentActivity, 
    loading, 
    error 
  } = useAnalyticsData();

  if (loading) {
    return (
      <RoleProtectedRoute allowedRoles={['super_admin']}>
        <Layout currentUser={currentUser}>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Layout>
      </RoleProtectedRoute>
    );
  }

  if (error) {
    return (
      <RoleProtectedRoute allowedRoles={['super_admin']}>
        <Layout currentUser={currentUser}>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            </div>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </Layout>
      </RoleProtectedRoute>
    );
  }

  return (
    <RoleProtectedRoute allowedRoles={['super_admin']}>
      <Layout currentUser={currentUser}>
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive performance and team analytics
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Monthly wins vs losses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="wins" fill="#22c55e" />
                  <Bar dataKey="losses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Trend</CardTitle>
              <CardDescription>Weekly attendance percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Player Status</CardTitle>
              <CardDescription>Current player distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={playerDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {playerDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-4">
                {playerDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-muted-foreground">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{keyMetrics.winRate}%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{keyMetrics.avgAttendance}%</div>
                  <div className="text-sm text-muted-foreground">Avg Attendance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{keyMetrics.avgShootingPercentage}%</div>
                  <div className="text-sm text-muted-foreground">Shooting %</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{keyMetrics.injuryRate}%</div>
                  <div className="text-sm text-muted-foreground">Injury Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">{keyMetrics.avgHealthScore}</div>
                  <div className="text-sm text-muted-foreground">Health Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{keyMetrics.totalSessions}</div>
                  <div className="text-sm text-muted-foreground">Training Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: activity.color }}
                    ></div>
                    <span className="text-sm">{activity.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </Layout>
    </RoleProtectedRoute>
  );
};

export default Analytics;