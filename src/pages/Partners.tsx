
import React from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Handshake, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Partners = () => {
  const currentUser = {
    name: "Mike Chen",
    role: "Partner Manager",
    avatar: "MC"
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partners</h1>
            <p className="text-gray-600">Sponsorship and partnership management</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Active Partnerships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Partnership management interface will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Partners;
