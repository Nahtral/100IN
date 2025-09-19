import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Users, Search, X, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: string;
  name: string;
}

interface QuickFiltersProps {
  onFiltersChange: (filters: any) => void;
  activeFilters: any;
  onClearFilters: () => void;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  onFiltersChange,
  activeFilters,
  onClearFilters
}) => {
  const [searchTerm, setSearchTerm] = useState(activeFilters.search || '');
  const [selectedEventType, setSelectedEventType] = useState(activeFilters.event_type || '');
  const [selectedTeam, setSelectedTeam] = useState(activeFilters.team_ids?.[0] || '');
  const [selectedLocation, setSelectedLocation] = useState(activeFilters.location || '');
  const [teams, setTeams] = useState<Team[]>([]);

  const eventTypes = [
    'practice', 'game', 'scrimmage', 'tournament', 
    'training', 'meeting', 'FNL', 'DBL', 'Team Building'
  ];

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const newFilters = { ...activeFilters, search: value };
    if (!value) delete newFilters.search;
    onFiltersChange(newFilters);
  };

  const handleEventTypeChange = (value: string) => {
    const newValue = value === 'all' ? '' : value;
    setSelectedEventType(newValue);
    const newFilters = { ...activeFilters, event_type: newValue };
    if (!newValue) delete newFilters.event_type;
    onFiltersChange(newFilters);
  };

  const handleTeamChange = (value: string) => {
    const newValue = value === 'all' ? '' : value;
    setSelectedTeam(newValue);
    const newFilters = { ...activeFilters };
    if (newValue) {
      newFilters.team_ids = [newValue];
    } else {
      delete newFilters.team_ids;
    }
    onFiltersChange(newFilters);
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    const newFilters = { ...activeFilters, location: value };
    if (!value) delete newFilters.location;
    onFiltersChange(newFilters);
  };

  const handleDateFilter = (type: 'week' | 'month') => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (type === 'week') {
      // This week
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      endDate = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    } else {
      // This month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const newFilters = {
      ...activeFilters,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedEventType('');
    setSelectedTeam('');
    setSelectedLocation('');
    onClearFilters();
  };

  const hasActiveFilters = searchTerm || selectedEventType || selectedTeam || selectedLocation || activeFilters.date_range;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search events, opponents, or descriptions..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Event Type Filter */}
            <Select value={selectedEventType || 'all'} onValueChange={handleEventTypeChange}>
              <SelectTrigger className="w-auto min-w-[120px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {eventTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Team Filter */}
            <Select value={selectedTeam || 'all'} onValueChange={handleTeamChange}>
              <SelectTrigger className="w-auto min-w-[120px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Location..."
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="pl-10 w-32"
              />
            </div>

            {/* Date Quick Filters */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateFilter('week')}
              className={activeFilters.date_range ? 'bg-primary/10' : ''}
            >
              <Calendar className="h-4 w-4 mr-2" />
              This Week
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateFilter('month')}
              className={activeFilters.date_range ? 'bg-primary/10' : ''}
            >
              <Calendar className="h-4 w-4 mr-2" />
              This Month
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchTerm}"
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleSearchChange('')}
                  />
                </Badge>
              )}
              {selectedEventType && (
                <Badge variant="secondary" className="gap-1">
                  Type: {selectedEventType}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleEventTypeChange('all')}
                  />
                </Badge>
              )}
              {selectedTeam && (
                <Badge variant="secondary" className="gap-1">
                  Team: {teams.find(t => t.id === selectedTeam)?.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleTeamChange('all')}
                  />
                </Badge>
              )}
              {selectedLocation && (
                <Badge variant="secondary" className="gap-1">
                  Location: {selectedLocation}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleLocationChange('')}
                  />
                </Badge>
              )}
              {activeFilters.date_range && (
                <Badge variant="secondary" className="gap-1">
                  Date Filter Active
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ ...activeFilters, date_range: undefined })}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickFilters;