import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Play, Download, Filter, Eye, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ShotVideo {
  id: string;
  playerId: string;
  videoUrl: string;
  thumbnail?: string;
  shotType: string;
  made: boolean;
  arc: number;
  depth: number;
  timestamp: number;
  tags?: string[];
}

interface VideoLoggerProps {
  playerId: string;
  onVideoSelect?: (video: ShotVideo) => void;
}

const VideoLogger: React.FC<VideoLoggerProps> = ({ playerId, onVideoSelect }) => {
  const [videos, setVideos] = useState<ShotVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<ShotVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShotType, setSelectedShotType] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    loadVideos();
  }, [playerId]);

  useEffect(() => {
    filterAndSortVideos();
  }, [videos, selectedShotType, selectedResult, sortBy]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      const { data: shots, error } = await supabase
        .from('shots')
        .select('*')
        .eq('player_id', playerId)
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const shotVideos: ShotVideo[] = shots.map(shot => ({
        id: shot.id,
        playerId: shot.player_id,
        videoUrl: shot.video_url!,
        shotType: shot.shot_type || 'practice',
        made: shot.made,
        arc: shot.arc_degrees || 45,
        depth: shot.depth_inches || 10,
        timestamp: new Date(shot.created_at).getTime(),
        tags: []
      }));

      setVideos(shotVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortVideos = () => {
    let filtered = [...videos];

    // Filter by shot type
    if (selectedShotType !== 'all') {
      filtered = filtered.filter(video => video.shotType === selectedShotType);
    }

    // Filter by result
    if (selectedResult !== 'all') {
      filtered = filtered.filter(video => 
        selectedResult === 'made' ? video.made : !video.made
      );
    }

    // Sort videos
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'best_arc':
        filtered.sort((a, b) => Math.abs(45 - a.arc) - Math.abs(45 - b.arc));
        break;
      case 'made_first':
        filtered.sort((a, b) => (b.made ? 1 : 0) - (a.made ? 1 : 0));
        break;
    }

    setFilteredVideos(filtered);
  };

  const generateThumbnail = async (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      
      video.onloadeddata = () => {
        video.currentTime = 1; // Capture frame at 1 second
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      video.onerror = () => {
        resolve('/placeholder.svg'); // Fallback thumbnail
      };
    });
  };

  const exportSession = async () => {
    try {
      const sessionData = {
        playerId,
        totalShots: videos.length,
        madeShots: videos.filter(v => v.made).length,
        avgArc: videos.reduce((sum, v) => sum + v.arc, 0) / videos.length,
        avgDepth: videos.reduce((sum, v) => sum + v.depth, 0) / videos.length,
        videos: filteredVideos,
        exportDate: new Date().toISOString()
      };

      const dataStr = JSON.stringify(sessionData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `shotiq_session_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting session:', error);
    }
  };

  const VideoCard: React.FC<{ video: ShotVideo }> = ({ video }) => {
    const [thumbnail, setThumbnail] = useState<string>('/placeholder.svg');

    useEffect(() => {
      generateThumbnail(video.videoUrl).then(setThumbnail);
    }, [video.videoUrl]);

    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="aspect-video bg-black rounded-md overflow-hidden mb-3 relative">
            <img 
              src={thumbnail} 
              alt="Shot thumbnail" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <Button
                size="sm"
                variant="secondary"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onVideoSelect?.(video)}
              >
                <Play className="w-4 h-4 mr-1" />
                Play
              </Button>
            </div>
            
            {/* Shot result overlay */}
            <Badge 
              variant={video.made ? "default" : "destructive"}
              className="absolute top-2 left-2"
            >
              {video.made ? "MADE" : "MISS"}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {format(video.timestamp, 'MMM d, HH:mm')}
              </span>
              <Badge variant="outline" className="capitalize">
                {video.shotType}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Arc:</span> {video.arc}°
              </div>
              <div>
                <span className="text-muted-foreground">Depth:</span> {video.depth}"
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          Loading videos...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Log ({filteredVideos.length})
          </div>
          <Button onClick={exportSession} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Select value={selectedShotType} onValueChange={setSelectedShotType}>
            <SelectTrigger>
              <SelectValue placeholder="Shot Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="free_throw">Free Throw</SelectItem>
              <SelectItem value="catch_and_shoot">Catch & Shoot</SelectItem>
              <SelectItem value="off_dribble">Off Dribble</SelectItem>
              <SelectItem value="practice">Practice</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedResult} onValueChange={setSelectedResult}>
            <SelectTrigger>
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="made">Made</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="best_arc">Best Arc</SelectItem>
              <SelectItem value="made_first">Made First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Video Grid */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No videos found matching your filters</p>
            <p className="text-sm">Start recording shots to build your library</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}

        {/* Session Summary */}
        {videos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{videos.length}</div>
              <div className="text-sm text-muted-foreground">Total Shots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round((videos.filter(v => v.made).length / videos.length) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Make Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round(videos.reduce((sum, v) => sum + v.arc, 0) / videos.length)}°
              </div>
              <div className="text-sm text-muted-foreground">Avg Arc</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round(videos.reduce((sum, v) => sum + v.depth, 0) / videos.length)}"
              </div>
              <div className="text-sm text-muted-foreground">Avg Depth</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoLogger;