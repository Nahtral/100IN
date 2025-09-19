import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, X, Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduleFiltersProps {
  onFiltersChange: (filters: any) => void;
  onClear: () => void;
}

interface Team {
  id: string;
  name: string;
}

const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({ onFiltersChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams for filtering.",
        variant: "destructive",
      });
    }
  };

  const applyFilters = () => {
    const filters: any = {};
    
    if (search.trim()) filters.search = search.trim();
    if (eventType) filters.event_type = eventType;
    if (selectedTeams.length > 0) filters.team_ids = selectedTeams;
    if (location.trim()) filters.location = location.trim();
    if (dateStart && dateEnd) {
      filters.date_range = {
        start: dateStart,
        end: dateEnd + 'T23:59:59'
      };
    }
    
    onFiltersChange(filters);
  };

  const clearAllFilters = () => {
    setSearch('');
    setEventType('');
    setSelectedTeams([]);
    setLocation('');
    setDateStart('');
    setDateEnd('');
    onClear();
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const removeTeam = (teamId: string) => {
    setSelectedTeams(prev => prev.filter(id => id !== teamId));
  };

  const hasActiveFilters = search || eventType || selectedTeams.length > 0 || location || dateStart || dateEnd;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {Object.keys({
                  ...(search && { search: true }),
                  ...(eventType && { type: true }),
                  ...(selectedTeams.length > 0 && { teams: true }),
                  ...(location && { location: true }),
                  ...(dateStart && dateEnd && { date: true })
                }).length} active
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm"
          >
            {isOpen ? 'Collapse' : 'Expand'}
            {isOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Search - Always Visible */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search events, opponents, descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyFilters();
                }
              }}
            />
          </div>
          <Button onClick={applyFilters} className="shrink-0">
            Search
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearAllFilters} className="shrink-0">
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Advanced Filters - Collapsible */}
        {isOpen && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Event Type */}
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="game">Game</SelectItem>
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="scrimmage">Scrimmage</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="location"
                    placeholder="Filter by location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Team Selection */}
            <div className="space-y-2">
              <Label>Teams</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      selectedTeams.includes(team.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    <span className="text-sm">{team.name}</span>
                  </div>
                ))}
              </div>
              
              {/* Selected Teams */}
              {selectedTeams.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {selectedTeams.map((teamId) => {
                    const team = teams.find(t => t.id === teamId);
                    return team ? (
                      <Badge key={teamId} variant="secondary" className="text-xs">
                        {team.name}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTeam(teamId);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Apply Filters Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={applyFilters} className="w-full md:w-auto">
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduleFilters;