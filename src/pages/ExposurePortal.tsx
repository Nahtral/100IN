import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstitutionsBrowser } from '@/components/exposure/InstitutionsBrowser';
import { OutreachDashboard } from '@/components/exposure/OutreachDashboard';
import { ContactLists } from '@/components/exposure/ContactLists';
import { DataConnectors } from '@/components/exposure/DataConnectors';
import { useRequireSuperAdmin } from '@/hooks/useRequireRole';
import { LoadingState } from '@/components/ui/LoadingState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Users, Send, Database } from "lucide-react";

const ExposurePortal = () => {
  const { loading, authorized } = useRequireSuperAdmin();
  const [activeTab, setActiveTab] = useState('institutions');

  if (loading) {
    return <LoadingState />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Exposure Portal</h2>
        <p className="text-muted-foreground">
          Connect players with verified school contacts through AI-powered outreach
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="institutions" className="flex items-center gap-2">
            <School className="h-4 w-4" />
            Institutions
          </TabsTrigger>
          <TabsTrigger value="outreach" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Outreach
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contact Lists
          </TabsTrigger>
          <TabsTrigger value="connectors" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Sources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="institutions">
          <InstitutionsBrowser />
        </TabsContent>

        <TabsContent value="outreach">
          <OutreachDashboard />
        </TabsContent>

        <TabsContent value="lists">
          <ContactLists />
        </TabsContent>

        <TabsContent value="connectors">
          <DataConnectors />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExposurePortal;