import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Key, Calendar, AlertCircle, CheckCircle, Settings, Play } from "lucide-react";

// Mock data for data connectors
const dataConnectors = [
  {
    id: '1',
    name: 'college_scorecard',
    displayName: 'College Scorecard (IPEDS)',
    description: 'US Department of Education College Scorecard API for higher education institutions',
    isEnabled: false,
    requiresApiKey: true,
    hasApiKey: false,
    lastRun: null,
    nextRun: null,
    status: 'inactive',
    institutionsCount: 0,
    contactsCount: 0,
    scheduleCron: '0 2 * * 1', // Weekly on Monday at 2 AM
  },
  {
    id: '2',
    name: 'ncaa_directory',
    displayName: 'NCAA Directory',
    description: 'NCAA athletics directory for college sports programs',
    isEnabled: false,
    requiresApiKey: true,
    hasApiKey: false,
    lastRun: null,
    nextRun: null,
    status: 'inactive',
    institutionsCount: 0,
    contactsCount: 0,
    scheduleCron: '0 3 * * 1',
  },
  {
    id: '3',
    name: 'universities_canada',
    displayName: 'Universities Canada',
    description: 'Official directory of Canadian universities',
    isEnabled: true,
    requiresApiKey: false,
    hasApiKey: true,
    lastRun: '2024-01-15T02:00:00Z',
    nextRun: '2024-01-22T02:00:00Z',
    status: 'completed',
    institutionsCount: 97,
    contactsCount: 243,
    scheduleCron: '0 5 * * 1',
  },
  {
    id: '4',
    name: 'nais_directory',
    displayName: 'NAIS Directory',
    description: 'National Association of Independent Schools directory',
    isEnabled: false,
    requiresApiKey: true,
    hasApiKey: false,
    lastRun: null,
    nextRun: null,
    status: 'requires_license',
    institutionsCount: 0,
    contactsCount: 0,
    scheduleCron: '0 6 * * 2',
  },
];

const getStatusBadge = (status: string, hasApiKey: boolean, requiresApiKey: boolean) => {
  if (requiresApiKey && !hasApiKey) {
    return <Badge variant="destructive">Missing API Key</Badge>;
  }
  
  switch (status) {
    case 'completed':
      return <Badge variant="default">Active</Badge>;
    case 'running':
      return <Badge variant="secondary">Running</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'requires_license':
      return <Badge variant="outline">Requires License</Badge>;
    case 'inactive':
    default:
      return <Badge variant="outline">Inactive</Badge>;
  }
};

export const DataConnectors = () => {
  const activeConnectors = dataConnectors.filter(c => c.isEnabled).length;
  const totalInstitutions = dataConnectors.reduce((sum, c) => sum + c.institutionsCount, 0);
  const totalContacts = dataConnectors.reduce((sum, c) => sum + c.contactsCount, 0);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connectors</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeConnectors}</div>
            <p className="text-xs text-muted-foreground">
              of {dataConnectors.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Institutions</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInstitutions}</div>
            <p className="text-xs text-muted-foreground">
              From all sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts}</div>
            <p className="text-xs text-muted-foreground">
              Verified contacts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h</div>
            <p className="text-xs text-muted-foreground">
              ago
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Important Notice */}
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertCircle className="h-5 w-5" />
            Data Source Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-700 dark:text-orange-300">
          <p className="text-sm">
            All data connectors use only licensed APIs and authorized directories. No web scraping or unauthorized data collection. 
            All contacts include proper data source attribution and verification timestamps for full audit compliance.
          </p>
        </CardContent>
      </Card>

      {/* Connectors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Source Connectors</CardTitle>
          <CardDescription>
            Manage and configure automated data ingestion from verified sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Data Imported</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataConnectors.map((connector) => (
                <TableRow key={connector.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{connector.displayName}</div>
                      <div className="text-sm text-muted-foreground max-w-xs">
                        {connector.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={connector.isEnabled} 
                        disabled={connector.requiresApiKey && !connector.hasApiKey}
                      />
                      {getStatusBadge(connector.status, connector.hasApiKey, connector.requiresApiKey)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {connector.requiresApiKey ? (
                      <div className="flex items-center gap-2">
                        {connector.hasApiKey ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {connector.hasApiKey ? 'Configured' : 'Required'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not required</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{connector.institutionsCount} institutions</div>
                      <div className="text-muted-foreground">{connector.contactsCount} contacts</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Weekly</div>
                      <div className="text-muted-foreground">{connector.scheduleCron}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {connector.lastRun ? (
                        <>
                          <div>{new Date(connector.lastRun).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            {new Date(connector.lastRun).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {connector.requiresApiKey && !connector.hasApiKey ? (
                        <Button size="sm" variant="outline">
                          <Key className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Configuration Help */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Guide</CardTitle>
          <CardDescription>
            How to set up and configure data source connectors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">API Key Setup</h4>
              <ol className="text-sm space-y-1 text-muted-foreground">
                <li>1. Register with the data source provider</li>
                <li>2. Request API access or license</li>
                <li>3. Add API key to Supabase secrets</li>
                <li>4. Enable the connector</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Quality</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• All contacts include verification timestamps</li>
                <li>• Data source attribution for audit trails</li>
                <li>• Automatic deduplication and validation</li>
                <li>• Regular data freshness checks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};