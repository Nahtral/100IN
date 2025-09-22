import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Edit, Trash2, Send, Download } from "lucide-react";

// Mock data for contact lists
const contactLists = [
  {
    id: '1',
    name: 'D1 Basketball Coaches',
    description: 'Division I basketball coaches and recruiters',
    contactCount: 156,
    lastUpdated: '2024-01-15T10:00:00Z',
    isActive: true,
  },
  {
    id: '2',
    name: 'Elite Academic Institutions',
    description: 'Top academic schools with strong basketball programs',
    contactCount: 43,
    lastUpdated: '2024-01-14T15:30:00Z',
    isActive: true,
  },
  {
    id: '3',
    name: 'Southeast Region Coaches',
    description: 'Basketball coaches in southeastern United States',
    contactCount: 89,
    lastUpdated: '2024-01-13T09:15:00Z',
    isActive: true,
  },
  {
    id: '4',
    name: 'Admissions Directors',
    description: 'Admissions office contacts for academic recruitment',
    contactCount: 72,
    lastUpdated: '2024-01-12T14:20:00Z',
    isActive: false,
  },
];

export const ContactLists = () => {
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Lists Management</CardTitle>
          <CardDescription>
            Organize and manage your contact lists for targeted outreach campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New List
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Import Contacts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lists Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contactLists.length}</div>
            <p className="text-xs text-muted-foreground">
              {contactLists.filter(list => list.isActive).length} active lists
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contactLists.reduce((sum, list) => sum + list.contactCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all lists
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg List Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(contactLists.reduce((sum, list) => sum + list.contactCount, 0) / contactLists.length)}
            </div>
            <p className="text-xs text-muted-foreground">
              Contacts per list
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Lists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Contact Lists</CardTitle>
          <CardDescription>
            Manage and organize your contact lists for effective outreach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>List Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactLists.map((list) => (
                <TableRow key={list.id}>
                  <TableCell>
                    <div className="font-medium">{list.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-xs">
                      {list.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Users className="h-3 w-3" />
                      {list.contactCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={list.isActive ? "default" : "secondary"}>
                      {list.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(list.lastUpdated).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick List Actions</CardTitle>
          <CardDescription>
            Common operations for managing contact lists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Create List</span>
              <span className="text-xs text-muted-foreground text-center">
                Start a new contact list
              </span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Download className="h-6 w-6" />
              <span className="text-sm font-medium">Import CSV</span>
              <span className="text-xs text-muted-foreground text-center">
                Upload contact data
              </span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Send className="h-6 w-6" />
              <span className="text-sm font-medium">Bulk Email</span>
              <span className="text-xs text-muted-foreground text-center">
                Send to entire list
              </span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              <span className="text-sm font-medium">Merge Lists</span>
              <span className="text-xs text-muted-foreground text-center">
                Combine contact lists
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};