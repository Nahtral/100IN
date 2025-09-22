import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Clock, CheckCircle, XCircle, Eye, Plus } from "lucide-react";

// Mock data for outreach campaigns
const outreachCampaigns = [
  {
    id: '1',
    subject: 'Student Inquiry - John Smith',
    institution: 'Duke University',
    contact: 'Coach Mike Smith',
    status: 'sent',
    sentAt: '2024-01-15T10:00:00Z',
    playersCount: 1,
    opened: true,
    replied: false,
  },
  {
    id: '2',
    subject: 'Recruit Introduction - Sarah Johnson - Class of 2025',
    institution: 'UNC Chapel Hill',
    contact: 'Coach Lisa Brown',
    status: 'queued',
    scheduledFor: '2024-01-16T14:00:00Z',
    playersCount: 1,
    opened: false,
    replied: false,
  },
  {
    id: '3',
    subject: 'Team Update - Winter Showcase',
    institution: 'Wake Forest University',
    contact: 'Assistant Coach Tom Wilson',
    status: 'sent',
    sentAt: '2024-01-14T09:30:00Z',
    playersCount: 3,
    opened: true,
    replied: true,
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return <Badge variant="default">Sent</Badge>;
    case 'queued':
      return <Badge variant="secondary">Queued</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'bounced':
      return <Badge variant="destructive">Bounced</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const OutreachDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for delivery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">
              75% open rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replies</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">
              25% reply rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Create and manage outreach campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Compose New Message
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Sequence
            </Button>
            <Button variant="outline">
              Import Contact List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Outreach */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Outreach</CardTitle>
          <CardDescription>
            Latest outreach campaigns and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outreachCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div className="font-medium">{campaign.subject}</div>
                  </TableCell>
                  <TableCell>{campaign.institution}</TableCell>
                  <TableCell>{campaign.contact}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{campaign.playersCount} player{campaign.playersCount !== 1 ? 's' : ''}</Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(campaign.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {campaign.opened && (
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Opened
                        </Badge>
                      )}
                      {campaign.replied && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Replied
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {campaign.sentAt 
                        ? new Date(campaign.sentAt).toLocaleDateString()
                        : campaign.scheduledFor 
                          ? `Scheduled: ${new Date(campaign.scheduledFor).toLocaleDateString()}`
                          : '-'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};