import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Eye, Search, Filter, ArrowLeft, Star, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import Layout from '@/components/layout/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  priority: string;
  featured_image_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  view_count: number;
  tags: string[];
  published_at: string | null;
  created_at: string;
  author_id: string;
}

const News = () => {
  const { currentUser } = useCurrentUser();
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const categories = [
    'all', 'general', 'team', 'medical', 'schedule', 'achievement', 'announcement',
    'panthers', 'player_profiles', 'highlights', 'player_of_the_week', 
    'panthers_alumni', 'ncaa', 'updates', 'schedule_changes'
  ];

  // Fetch all published news
  const { data: allNews, isLoading } = useQuery({
    queryKey: ['all-news', searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('news_updates')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch featured news
  const { data: featuredNews } = useQuery({
    queryKey: ['featured-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_updates')
        .select('*')
        .eq('is_featured', true)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    }
  });

  const handleNewsClick = async (newsItem: NewsItem) => {
    setSelectedNews(newsItem);
    setIsDetailModalOpen(true);
    
    // Increment view count
    try {
      await supabase
        .from('news_updates')
        .update({ view_count: (newsItem.view_count || 0) + 1 })
        .eq('id', newsItem.id);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const formatCategoryName = (category: string) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Panthers News & Updates</h1>
          <p className="text-muted-foreground">Stay updated with the latest news from Panthers Basketball</p>
        </div>

        {/* Featured News Section */}
        {featuredNews && featuredNews.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Featured Stories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredNews.map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => handleNewsClick(item)}
                >
                  <div className="relative">
                    {item.featured_image_url && (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img 
                          src={item.featured_image_url} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    {item.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-t-lg">
                        <Play className="h-12 w-12 text-white" />
                      </div>
                    )}
                    <Star className="absolute top-2 right-2 h-5 w-5 text-primary fill-current bg-white rounded-full p-1" />
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(item.priority)}>
                          {formatCategoryName(item.category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.published_at || item.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.excerpt || item.content.substring(0, 100) + '...'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>{item.view_count || 0} views</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search news and updates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {formatCategoryName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* All News Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Stories</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-t-lg"></div>
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allNews && allNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allNews.map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => handleNewsClick(item)}
                >
                  <div className="relative">
                    {item.featured_image_url ? (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img 
                          src={item.featured_image_url} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    {item.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-t-lg">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    )}
                    {item.is_featured && (
                      <Star className="absolute top-2 right-2 h-4 w-4 text-primary fill-current bg-white rounded-full p-0.5" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={getPriorityColor(item.priority)}>
                          {formatCategoryName(item.category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.published_at || item.created_at), 'MMM d')}
                        </span>
                      </div>
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.excerpt || item.content.substring(0, 100) + '...'}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span>{item.view_count || 0} views</span>
                        </div>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1">
                            {item.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{item.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'No news items found matching your criteria.' 
                    : 'No news items available at the moment.'}
                </p>
                {(searchQuery || selectedCategory !== 'all') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* News Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsDetailModalOpen(false)}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant={getPriorityColor(selectedNews?.priority || 'normal')}>
                  {formatCategoryName(selectedNews?.category || '')}
                </Badge>
                {selectedNews?.is_featured && (
                  <Star className="h-4 w-4 text-primary fill-current" />
                )}
              </div>
            </div>
            <DialogTitle className="text-left text-2xl">
              {selectedNews?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedNews && (
            <div className="space-y-6">
              {/* Media */}
              {selectedNews.featured_image_url && (
                <div className="aspect-video overflow-hidden rounded-lg">
                  <img 
                    src={selectedNews.featured_image_url} 
                    alt={selectedNews.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {selectedNews.video_url && (
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                  <video 
                    src={selectedNews.video_url} 
                    controls
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Meta Information */}
              <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-4">
                <div className="flex items-center gap-4">
                  <span>Published: {format(new Date(selectedNews.published_at || selectedNews.created_at), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {selectedNews.view_count || 0} views
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-slate max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {selectedNews.content}
                </div>
              </div>

              {/* Tags */}
              {selectedNews.tags && selectedNews.tags.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNews.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default News;