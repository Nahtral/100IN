
import React from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Medical = () => {
  const currentUser = {
    name: "Dr. Sarah Wilson",
    role: "Medical Team",
    avatar: "SW"
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical</h1>
            <p className="text-gray-600">Health and injury management</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Medical Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Medical management interface will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Medical;
