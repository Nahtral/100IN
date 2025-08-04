import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, Line } from 'fabric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Download, RefreshCw } from 'lucide-react';

interface ShotLocation {
  x: number;
  y: number;
  made: boolean;
  arc: number;
  depth: number;
}

interface ShotHeatmapProps {
  shots: ShotLocation[];
  courtDimensions?: {
    width: number;
    height: number;
  };
}

const ShotHeatmap: React.FC<ShotHeatmapProps> = ({ 
  shots, 
  courtDimensions = { width: 800, height: 600 } 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<'all' | 'made' | 'missed'>('all');
  const [intensityLevel, setIntensityLevel] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: courtDimensions.width,
      height: courtDimensions.height,
      backgroundColor: '#1a4d3a', // Basketball court green
      selection: false,
    });

    // Draw basketball court
    drawBasketballCourt(canvas);
    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [courtDimensions]);

  useEffect(() => {
    if (fabricCanvas && shots.length > 0) {
      generateHeatmap();
    }
  }, [fabricCanvas, shots, heatmapMode, intensityLevel]);

  const drawBasketballCourt = (canvas: FabricCanvas) => {
    const { width, height } = courtDimensions;
    
    // Court boundary
    const courtBoundary = new Rect({
      left: 50,
      top: 50,
      width: width - 100,
      height: height - 100,
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 3,
      selectable: false,
    });
    canvas.add(courtBoundary);

    // Three-point line (simplified arc)
    const threePointArc = new Circle({
      left: width / 2 - 150,
      top: height - 200,
      radius: 150,
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 2,
      startAngle: 0,
      endAngle: Math.PI,
      selectable: false,
    });
    canvas.add(threePointArc);

    // Free throw circle
    const freeThrowCircle = new Circle({
      left: width / 2 - 60,
      top: height - 240,
      radius: 60,
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(freeThrowCircle);

    // Rim
    const rim = new Circle({
      left: width / 2 - 9,
      top: height - 70,
      radius: 9,
      fill: '#ff6b35',
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(rim);

    // Backboard
    const backboard = new Line([width / 2 - 30, height - 50, width / 2 + 30, height - 50], {
      stroke: '#ffffff',
      strokeWidth: 4,
      selectable: false,
    });
    canvas.add(backboard);

    // Paint area (key)
    const paint = new Rect({
      left: width / 2 - 80,
      top: height - 190,
      width: 160,
      height: 140,
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
    });
    canvas.add(paint);
  };

  const generateHeatmap = () => {
    if (!fabricCanvas) return;

    // Clear existing shot markers
    const objects = fabricCanvas.getObjects();
    const shotMarkers = objects.filter(obj => obj.get('shotMarker'));
    shotMarkers.forEach(marker => fabricCanvas.remove(marker));

    // Filter shots based on mode
    const filteredShots = shots.filter(shot => {
      if (heatmapMode === 'made') return shot.made;
      if (heatmapMode === 'missed') return !shot.made;
      return true;
    });

    // Create heat zones
    const heatZones = createHeatZones(filteredShots);
    
    // Draw heat zones
    heatZones.forEach(zone => {
      const intensity = Math.min(zone.count / getMaxIntensity(), 1);
      const opacity = getOpacityFromIntensity(intensity);
      
      const heatCircle = new Circle({
        left: zone.x - 25,
        top: zone.y - 25,
        radius: 25,
        fill: `rgba(255, 107, 53, ${opacity})`,
        selectable: false,
        shotMarker: true,
      } as any);
      
      fabricCanvas.add(heatCircle);
    });

    // Draw individual shot markers
    filteredShots.forEach(shot => {
      const shotMarker = new Circle({
        left: shot.x - 3,
        top: shot.y - 3,
        radius: 3,
        fill: shot.made ? '#22c55e' : '#ef4444',
        stroke: '#ffffff',
        strokeWidth: 1,
        selectable: false,
        shotMarker: true,
      } as any);
      
      fabricCanvas.add(shotMarker);
    });

    fabricCanvas.renderAll();
  };

  const createHeatZones = (shots: ShotLocation[]) => {
    const zones: { [key: string]: { x: number; y: number; count: number } } = {};
    const gridSize = 50;

    shots.forEach(shot => {
      const gridX = Math.floor(shot.x / gridSize) * gridSize + gridSize / 2;
      const gridY = Math.floor(shot.y / gridSize) * gridSize + gridSize / 2;
      const key = `${gridX}-${gridY}`;

      if (!zones[key]) {
        zones[key] = { x: gridX, y: gridY, count: 0 };
      }
      zones[key].count++;
    });

    return Object.values(zones);
  };

  const getMaxIntensity = () => {
    switch (intensityLevel) {
      case 'low': return 3;
      case 'high': return 10;
      default: return 6;
    }
  };

  const getOpacityFromIntensity = (intensity: number) => {
    return Math.max(0.1, Math.min(0.7, intensity * 0.6));
  };

  const exportHeatmap = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement('a');
    link.download = `shot-heatmap-${new Date().toISOString().split('T')[0]}.png`;
    link.href = dataURL;
    link.click();
  };

  const refreshHeatmap = () => {
    generateHeatmap();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Shot Heatmap
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {shots.length} shots
            </Badge>
            <Button onClick={exportHeatmap} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button onClick={refreshHeatmap} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Shot Filter</label>
            <Select value={heatmapMode} onValueChange={(value: any) => setHeatmapMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shots</SelectItem>
                <SelectItem value="made">Made Shots Only</SelectItem>
                <SelectItem value="missed">Missed Shots Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Heat Intensity</label>
            <Select value={intensityLevel} onValueChange={(value: any) => setIntensityLevel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Sensitivity</SelectItem>
                <SelectItem value="medium">Medium Sensitivity</SelectItem>
                <SelectItem value="high">High Sensitivity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Heatmap Canvas */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-900">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Made Shots</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>Missed Shots</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full opacity-50"></div>
            <span>Heat Zones</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{shots.filter(s => s.made).length}</div>
            <div className="text-sm text-muted-foreground">Made</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{shots.filter(s => !s.made).length}</div>
            <div className="text-sm text-muted-foreground">Missed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {shots.length > 0 ? Math.round((shots.filter(s => s.made).length / shots.length) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {shots.length > 0 ? Math.round(shots.reduce((sum, s) => sum + s.arc, 0) / shots.length) : 0}°
            </div>
            <div className="text-sm text-muted-foreground">Avg Arc</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShotHeatmap;