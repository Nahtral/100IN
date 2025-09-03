import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, RotateCcw, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole } from '@/hooks/useUserRole';

interface TeamGridSettings {
  id: string;
  default_view: string;
  visible_columns: string[];
  sort_by: string;
  sort_direction: string;
  page_size: number;
  allow_manual_players: boolean;
  allow_bulk_import: boolean;
  enable_archived_filter: boolean;
  accent_color: string;
}

const DEFAULT_SETTINGS: Omit<TeamGridSettings, 'id'> = {
  default_view: 'grid',
  visible_columns: ['name', 'team', 'role', 'status', 'age', 'contact', 'attendance'],
  sort_by: 'name',
  sort_direction: 'asc',
  page_size: 25,
  allow_manual_players: true,
  allow_bulk_import: true,
  enable_archived_filter: false,
  accent_color: '#0066cc'
};

const AVAILABLE_COLUMNS = [
  { value: 'name', label: 'Name' },
  { value: 'team', label: 'Team' },
  { value: 'role', label: 'Role' },
  { value: 'status', label: 'Status' },
  { value: 'age', label: 'Age' },
  { value: 'contact', label: 'Contact' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'position', label: 'Position' },
  { value: 'jersey_number', label: 'Jersey Number' },
  { value: 'created_at', label: 'Created Date' }
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'team', label: 'Team' },
  { value: 'created_at', label: 'Created Date' },
  { value: 'updated_at', label: 'Updated Date' },
  { value: 'status', label: 'Status' }
];

const TeamGridSettings = () => {
  const [settings, setSettings] = useState<TeamGridSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const { isSuperAdmin } = useUserRole();

  // Redirect if not super admin
  useEffect(() => {
    if (currentUser && !isSuperAdmin) {
      navigate('/');
      toast({
        title: 'Access Denied',
        description: 'You are not authorized to access this page',
        variant: 'destructive'
      });
    }
  }, [currentUser, isSuperAdmin, navigate, toast]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSettings();
    }
  }, [isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('teamgrid_settings')
        .select('*')
        .single();

      if (fetchError) throw fetchError;

      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching teamgrid settings:', error);
      setError(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from('teamgrid_settings')
        .update({
          default_view: settings.default_view,
          visible_columns: settings.visible_columns,
          sort_by: settings.sort_by,
          sort_direction: settings.sort_direction,
          page_size: settings.page_size,
          allow_manual_players: settings.allow_manual_players,
          allow_bulk_import: settings.allow_bulk_import,
          enable_archived_filter: settings.enable_archived_filter,
          accent_color: settings.accent_color,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (updateError) throw updateError;

      toast({
        title: 'Settings Saved',
        description: 'TeamGrid settings have been updated successfully'
      });
    } catch (error: any) {
      console.error('Error saving teamgrid settings:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (!settings) return;

    setSettings({
      ...settings,
      ...DEFAULT_SETTINGS
    });

    toast({
      title: 'Reset to Defaults',
      description: 'Settings have been reset to default values. Click Save to apply.'
    });
  };

  const handleColumnToggle = (columnValue: string, checked: boolean) => {
    if (!settings) return;

    const updatedColumns = checked
      ? [...settings.visible_columns, columnValue]
      : settings.visible_columns.filter(col => col !== columnValue);

    setSettings({
      ...settings,
      visible_columns: updatedColumns
    });
  };

  if (!isSuperAdmin) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <Layout currentUser={currentUser}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">TeamGrid Settings</h1>
              <p className="text-muted-foreground">Configure TeamGrid display options</p>
            </div>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading settings...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentUser={currentUser}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">TeamGrid Settings</h1>
              <p className="text-muted-foreground">Configure TeamGrid display options</p>
            </div>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchSettings}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!settings) return null;

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Settings className="h-8 w-8" />
                TeamGrid Settings
              </h1>
              <p className="text-muted-foreground">Configure TeamGrid display options and behavior</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Default View */}
              <div className="space-y-2">
                <Label htmlFor="default_view">Default View</Label>
                <Select
                  value={settings.default_view}
                  onValueChange={(value) => setSettings({ ...settings, default_view: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid View</SelectItem>
                    <SelectItem value="table">Table View</SelectItem>
                    <SelectItem value="card">Card View</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_by">Sort By</Label>
                  <Select
                    value={settings.sort_by}
                    onValueChange={(value) => setSettings({ ...settings, sort_by: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_direction">Sort Direction</Label>
                  <Select
                    value={settings.sort_direction}
                    onValueChange={(value) => setSettings({ ...settings, sort_direction: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Page Size */}
              <div className="space-y-2">
                <Label htmlFor="page_size">Page Size</Label>
                <Input
                  id="page_size"
                  type="number"
                  min="10"
                  max="200"
                  value={settings.page_size}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    page_size: parseInt(e.target.value) || 25 
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Number of items per page (10-200)
                </p>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label htmlFor="accent_color">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent_color"
                    type="color"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="w-16 h-10 p-1 rounded"
                  />
                  <Input
                    type="text"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    placeholder="#0066cc"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Column Visibility */}
          <Card>
            <CardHeader>
              <CardTitle>Visible Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AVAILABLE_COLUMNS.map((column) => (
                  <div key={column.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={column.value}
                      checked={settings.visible_columns.includes(column.value)}
                      onCheckedChange={(checked) => 
                        handleColumnToggle(column.value, checked as boolean)
                      }
                    />
                    <Label htmlFor={column.value} className="cursor-pointer">
                      {column.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Feature Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_manual_players">Allow Manual Players</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable adding players without user accounts
                    </p>
                  </div>
                  <Switch
                    id="allow_manual_players"
                    checked={settings.allow_manual_players}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, allow_manual_players: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_bulk_import">Allow Bulk Import</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable CSV/Excel import functionality
                    </p>
                  </div>
                  <Switch
                    id="allow_bulk_import"
                    checked={settings.allow_bulk_import}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, allow_bulk_import: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_archived_filter">Enable Archived Filter</Label>
                    <p className="text-sm text-muted-foreground">
                      Show filter for archived players
                    </p>
                  </div>
                  <Switch
                    id="enable_archived_filter"
                    checked={settings.enable_archived_filter}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, enable_archived_filter: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default TeamGridSettings;