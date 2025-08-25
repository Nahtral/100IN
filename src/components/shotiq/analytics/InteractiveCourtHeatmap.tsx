import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, Path, FabricText } from 'fabric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Target, Download, RefreshCw, Plus, Filter, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ShotData {
  id: string;
  court_x_position: number;
  court_y_position: number;
  made: boolean;
  shot_type: string;
  player_id: string;
  session_id: string;
  created_at: string;
  arc_degrees?: number;
  depth_inches?: number;
}

interface RegionStats {
  region: string;
  region_name: string;
  attempts: number;
  makes: number;
  percentage: number;
  shot_type: string;
}

// Define court regions directly in the component since they're not in DB yet
interface CourtRegion {
  region_code: string;
  region_name: string;
  region_bounds: any;
  shot_type: string;
}

interface InteractiveCourtHeatmapProps {
  playerId?: string;
  sessionId?: string;
  courtDimensions?: { width: number; height: number };
}

const InteractiveCourtHeatmap: React.FC<InteractiveCourtHeatmapProps> = ({ 
  playerId,
  sessionId,
  courtDimensions = { width: 800, height: 600 } 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [shots, setShots] = useState<ShotData[]>([]);
  const [regions, setRegions] = useState<CourtRegion[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStats[]>([]);
  const [viewMode, setViewMode] = useState<'heatmap' | 'shots'>('heatmap');
  const [isTrackingMode, setIsTrackingMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(playerId || '');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [showStats, setShowStats] = useState(true);
  const { toast } = useToast();

  // Define court regions since they're not in database yet
  const courtRegions: CourtRegion[] = [
    { region_code: 'RA', region_name: 'Restricted Area', shot_type: '2PT', region_bounds: { type: 'circle', centerX: 400, centerY: 530, radius: 40 } },
    { region_code: 'PC', region_name: 'Paint Center', shot_type: '2PT', region_bounds: { type: 'rectangle', x1: 320, y1: 450, x2: 480, y2: 530 } },
    { region_code: 'PL', region_name: 'Paint Left', shot_type: '2PT', region_bounds: { type: 'rectangle', x1: 240, y1: 450, x2: 320, y2: 530 } },
    { region_code: 'PR', region_name: 'Paint Right', shot_type: '2PT', region_bounds: { type: 'rectangle', x1: 480, y1: 450, x2: 560, y2: 530 } },
    { region_code: 'MRL', region_name: 'Mid-Range Left', shot_type: '2PT', region_bounds: { type: 'rectangle', x1: 140, y1: 350, x2: 240, y2: 450 } },
    { region_code: 'MRR', region_name: 'Mid-Range Right', shot_type: '2PT', region_bounds: { type: 'rectangle', x1: 560, y1: 350, x2: 660, y2: 450 } },
    { region_code: 'MRT', region_name: 'Mid-Range Top', shot_type: '2PT', region_bounds: { type: 'rectangle', x1: 240, y1: 300, x2: 560, y2: 350 } },
    { region_code: 'C3L', region_name: 'Corner 3 Left', shot_type: '3PT', region_bounds: { type: 'rectangle', x1: 50, y1: 450, x2: 140, y2: 530 } },
    { region_code: 'C3R', region_name: 'Corner 3 Right', shot_type: '3PT', region_bounds: { type: 'rectangle', x1: 660, y1: 450, x2: 750, y2: 530 } },
    { region_code: 'W3L', region_name: 'Wing 3 Left', shot_type: '3PT', region_bounds: { type: 'rectangle', x1: 120, y1: 280, x2: 240, y2: 350 } },
    { region_code: 'W3R', region_name: 'Wing 3 Right', shot_type: '3PT', region_bounds: { type: 'rectangle', x1: 560, y1: 280, x2: 680, y2: 350 } },
    { region_code: 'AB3', region_name: 'Above Break 3', shot_type: '3PT', region_bounds: { type: 'rectangle', x1: 200, y1: 200, x2: 600, y2: 300 } },
  ];

  // Load initial data
  useEffect(() => {
    loadShotData();
    setRegions(courtRegions);
  }, [playerId, sessionId, dateRange]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: courtDimensions.width,
      height: courtDimensions.height,
      backgroundColor: '#1a4d3a',
      selection: false,
    });

    drawBasketballCourt(canvas);
    setFabricCanvas(canvas);

    // Add click handler for shot tracking
    canvas.on('mouse:down', handleCanvasClick);

    return () => {
      canvas.dispose();
    };
  }, [courtDimensions, isTrackingMode]);

  // Update visualization when data changes
  useEffect(() => {
    if (fabricCanvas && shots.length > 0) {
      updateVisualization();
    }
  }, [fabricCanvas, shots, viewMode, regionStats, showStats]);

  const loadShotData = async () => {
    try {
      let query = supabase
        .from('shots')
        .select('*')
        .gte('created_at', `${dateRange.start}T00:00:00Z`)
        .lte('created_at', `${dateRange.end}T23:59:59Z`);

      if (playerId) {
        query = query.eq('player_id', playerId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const shotsData = data || [];
      setShots(shotsData);
      calculateRegionStats(shotsData);
    } catch (error) {
      console.error('Error loading shot data:', error);
      toast({
        title: "Error",
        description: "Failed to load shot data",
        variant: "destructive"
      });
    }
  };


  const determineRegion = (x: number, y: number): string => {
    for (const region of courtRegions) {
      const bounds = region.region_bounds;
      if (bounds.type === 'rectangle') {
        if (x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2) {
          return region.region_code;
        }
      } else if (bounds.type === 'circle') {
        const distance = Math.sqrt(Math.pow(x - bounds.centerX, 2) + Math.pow(y - bounds.centerY, 2));
        if (distance <= bounds.radius) {
          return region.region_code;
        }
      }
    }
    return 'MRT'; // Default to mid-range top
  };

  const calculateRegionStats = (shotData: ShotData[]) => {
    const regionMap = new Map<string, RegionStats>();

    shotData.forEach(shot => {
      const region = determineRegion(shot.court_x_position || 400, shot.court_y_position || 300);
      const regionInfo = courtRegions.find(r => r.region_code === region);
      
      if (!regionMap.has(region)) {
        regionMap.set(region, {
          region: region,
          region_name: regionInfo?.region_name || region,
          attempts: 0,
          makes: 0,
          percentage: 0,
          shot_type: regionInfo?.shot_type || '2PT'
        });
      }

      const stats = regionMap.get(region)!;
      stats.attempts++;
      if (shot.made) {
        stats.makes++;
      }
      stats.percentage = (stats.makes / stats.attempts) * 100;
    });

    setRegionStats(Array.from(regionMap.values()));
  };

  const drawBasketballCourt = (canvas: FabricCanvas) => {
    const { width, height } = courtDimensions;
    
    // Professional court colors matching reference
    const courtColor = '#2d5b47'; // Dark green court color
    const lineColor = '#ffffff';
    const rimColor = '#ff6b35';
    
    // Court dimensions based on reference image proportions
    const courtMargin = 40;
    const courtWidth = width - (courtMargin * 2);
    const courtHeight = height - (courtMargin * 2);
    
    // Key measurements (scaled to canvas)
    const centerX = width / 2;
    const baselineY = height - courtMargin;
    const keyWidth = courtWidth * 0.2; // Paint width
    const keyHeight = courtHeight * 0.35; // Paint height
    const threePointRadius = courtWidth * 0.28;
    const freeThrowRadius = keyWidth * 0.5;
    
    // Court boundary with proper background
    const courtBoundary = new Rect({
      left: courtMargin,
      top: courtMargin,
      width: courtWidth,
      height: courtHeight,
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 3,
      selectable: false,
    });
    canvas.add(courtBoundary);

    // Half-court line
    const halfCourtLine = new Rect({
      left: courtMargin,
      top: height / 2,
      width: courtWidth,
      height: 0,
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(halfCourtLine);

    // Center circle
    const centerCircle = new Circle({
      left: centerX - (courtWidth * 0.08),
      top: (height / 2) - (courtWidth * 0.08),
      radius: courtWidth * 0.08,
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(centerCircle);

    // Paint area (key)
    const paint = new Rect({
      left: centerX - (keyWidth / 2),
      top: baselineY - keyHeight,
      width: keyWidth,
      height: keyHeight,
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(paint);

    // Free throw circle
    const freeThrowCircle = new Circle({
      left: centerX - freeThrowRadius,
      top: baselineY - keyHeight - freeThrowRadius,
      radius: freeThrowRadius,
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(freeThrowCircle);

    // Three-point line - accurate arc
    const threePointArcY = baselineY - (keyHeight * 0.2);
    const threePointCornerDistance = courtWidth * 0.075; // Distance from corners
    
    // Three-point arc
    const threePointArc = new Circle({
      left: centerX - threePointRadius,
      top: threePointArcY - threePointRadius,
      radius: threePointRadius,
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
      startAngle: 0.4, // Start angle for arc
      endAngle: 2.74,  // End angle for arc
    });
    canvas.add(threePointArc);

    // Three-point line corners (straight sections)
    const leftThreePointCorner = new Rect({
      left: courtMargin + threePointCornerDistance,
      top: threePointArcY - (threePointRadius * 0.7),
      width: 0,
      height: (threePointRadius * 0.7),
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(leftThreePointCorner);

    const rightThreePointCorner = new Rect({
      left: width - courtMargin - threePointCornerDistance,
      top: threePointArcY - (threePointRadius * 0.7),
      width: 0,
      height: (threePointRadius * 0.7),  
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(rightThreePointCorner);

    // Rim
    const rim = new Circle({
      left: centerX - 8,
      top: baselineY - 16,
      radius: 8,
      fill: rimColor,
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(rim);

    // Backboard  
    const backboard = new Rect({
      left: centerX - 25,
      top: baselineY - 8,
      width: 50,
      height: 3,
      fill: lineColor,
      selectable: false,
    });
    canvas.add(backboard);

    // Restricted area (small arc under basket)
    const restrictedArea = new Circle({
      left: centerX - 20,
      top: baselineY - 40,
      radius: 20,
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      selectable: false,
      startAngle: 0,
      endAngle: Math.PI,
    });
    canvas.add(restrictedArea);

    // Draw court regions for heatmap
    drawCourtRegions(canvas);
  };

  const drawCourtRegions = (canvas: FabricCanvas) => {
    if (!showStats) return;

    regions.forEach(region => {
      const stats = regionStats.find(s => s.region === region.region_code);
      if (!stats || stats.attempts === 0) return;

      const bounds = region.region_bounds;
      let regionShape: any = null;
      let centerX = 0, centerY = 0;

      // Create region shape based on bounds
      if (bounds.type === 'rectangle') {
        const width = bounds.x2 - bounds.x1;
        const height = bounds.y2 - bounds.y1;
        centerX = bounds.x1 + width / 2;
        centerY = bounds.y1 + height / 2;

        regionShape = new Rect({
          left: bounds.x1,
          top: bounds.y1,
          width: width,
          height: height,
          fill: getRegionColor(stats.percentage),
          opacity: 0.3,
          selectable: false,
          stroke: '#ffffff',
          strokeWidth: 1,
        });
      } else if (bounds.type === 'circle') {
        centerX = bounds.centerX;
        centerY = bounds.centerY;

        regionShape = new Circle({
          left: bounds.centerX - bounds.radius,
          top: bounds.centerY - bounds.radius,
          radius: bounds.radius,
          fill: getRegionColor(stats.percentage),
          opacity: 0.3,
          selectable: false,
          stroke: '#ffffff',
          strokeWidth: 1,
        });
      }

      if (regionShape) {
        canvas.add(regionShape);

        // Add stats text
        const statsText = new FabricText(`${stats.makes}/${stats.attempts}\n${stats.percentage.toFixed(1)}%`, {
          left: centerX,
          top: centerY,
          fontSize: 12,
          fill: '#ffffff',
          textAlign: 'center',
          originX: 'center',
          originY: 'center',
          selectable: false,
          fontWeight: 'bold',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 4,
        });
        canvas.add(statsText);
      }
    });
  };

  const getRegionColor = (percentage: number): string => {
    if (percentage >= 50) return '#22c55e'; // Green for good shooting
    if (percentage >= 40) return '#fbbf24'; // Yellow for average
    if (percentage >= 30) return '#f97316'; // Orange for below average
    return '#ef4444'; // Red for poor shooting
  };

  const updateVisualization = () => {
    if (!fabricCanvas) return;

    // Clear existing visualization elements
    const objects = fabricCanvas.getObjects();
    const visualElements = objects.filter(obj => 
      obj.get('shotMarker') || obj.get('regionOverlay') || obj.get('statsText')
    );
    visualElements.forEach(element => fabricCanvas.remove(element));

    if (viewMode === 'heatmap') {
      drawCourtRegions(fabricCanvas);
    } else {
      // Draw individual shots
      shots.forEach(shot => {
        const shotMarker = new Circle({
          left: (shot.court_x_position || 400) - 4,
          top: (shot.court_y_position || 300) - 4,
          radius: 4,
          fill: shot.made ? '#22c55e' : '#ef4444',
          stroke: '#ffffff',
          strokeWidth: 1,
          selectable: false,
          shotMarker: true,
        } as any);
        
        fabricCanvas.add(shotMarker);
      });
    }

    fabricCanvas.renderAll();
  };

  const handleCanvasClick = useCallback((event: any) => {
    if (!isTrackingMode || !fabricCanvas) return;

    const pointer = fabricCanvas.getPointer(event.e);
    // Show shot entry modal at this position
    // For now, just log the coordinates
    console.log('Shot at:', pointer);
    toast({
      title: "Shot Recorded",
      description: `Shot at (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`,
    });
  }, [isTrackingMode, fabricCanvas, toast]);

  const exportHeatmap = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement('a');
    link.download = `basketball-heatmap-${new Date().toISOString().split('T')[0]}.png`;
    link.href = dataURL;
    link.click();
  };

  const overallStats = {
    totalShots: shots.length,
    makes: shots.filter(s => s.made).length,
    percentage: shots.length > 0 ? ((shots.filter(s => s.made).length / shots.length) * 100) : 0,
    twoPointers: shots.filter(s => {
      const region = determineRegion(s.court_x_position || 400, s.court_y_position || 300);
      const regionInfo = courtRegions.find(r => r.region_code === region);
      return regionInfo?.shot_type === '2PT';
    }),
    threePointers: shots.filter(s => {
      const region = determineRegion(s.court_x_position || 400, s.court_y_position || 300);
      const regionInfo = courtRegions.find(r => r.region_code === region);
      return regionInfo?.shot_type === '3PT';
    }),
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interactive Basketball Court Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Date Range Start</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date Range End</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={loadShotData} size="sm">
                <Filter className="w-4 h-4 mr-1" />
                Apply Filter
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="tracking-mode"
                checked={isTrackingMode}
                onCheckedChange={setIsTrackingMode}
              />
              <Label htmlFor="tracking-mode">Shot Tracking Mode</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="show-stats"
                checked={showStats}
                onCheckedChange={setShowStats}
              />
              <Label htmlFor="show-stats">Show Region Stats</Label>
            </div>

            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heatmap">Heatmap View</SelectItem>
                <SelectItem value="shots">Shot Chart View</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportHeatmap} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Court Visualization */}
      <Card>
        <CardContent className="p-6">
          <div className="border border-border rounded-lg overflow-hidden bg-slate-900">
            <canvas ref={canvasRef} className="max-w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overall Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded">
                  <div className="text-2xl font-bold">{overallStats.makes}</div>
                  <div className="text-sm text-muted-foreground">Makes</div>
                </div>
                <div className="text-center p-3 bg-muted rounded">
                  <div className="text-2xl font-bold">{overallStats.totalShots}</div>
                  <div className="text-sm text-muted-foreground">Attempts</div>
                </div>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded">
                <div className="text-3xl font-bold text-primary">
                  {overallStats.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Field Goal %</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="font-medium">2PT: {overallStats.twoPointers.filter(s => s.made).length}/{overallStats.twoPointers.length}</div>
                  <div className="text-muted-foreground">
                    {overallStats.twoPointers.length > 0 ? 
                      ((overallStats.twoPointers.filter(s => s.made).length / overallStats.twoPointers.length) * 100).toFixed(1) + '%' : 
                      '0.0%'
                    }
                  </div>
                </div>
                <div>
                  <div className="font-medium">3PT: {overallStats.threePointers.filter(s => s.made).length}/{overallStats.threePointers.length}</div>
                  <div className="text-muted-foreground">
                    {overallStats.threePointers.length > 0 ? 
                      ((overallStats.threePointers.filter(s => s.made).length / overallStats.threePointers.length) * 100).toFixed(1) + '%' : 
                      '0.0%'
                    }
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Region Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Region Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {regionStats.map(stat => (
                <div key={stat.region} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: getRegionColor(stat.percentage) }}
                    />
                    <span className="font-medium">{stat.region_name}</span>
                    <Badge variant={stat.shot_type === '3PT' ? 'default' : 'secondary'}>
                      {stat.shot_type}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{stat.makes}/{stat.attempts}</div>
                    <div className="text-sm text-muted-foreground">{stat.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InteractiveCourtHeatmap;