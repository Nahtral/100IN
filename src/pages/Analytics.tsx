
import React from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';

const Analytics = () => {
  const currentUser = {
    name: "Alex Johnson",
    role: "Coach",
    avatar: "AJ"
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Performance metrics and insights</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Analytics dashboard will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Analytics;
