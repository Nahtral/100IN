import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Newspaper, Plus, Upload, Image, Video, Trash2, Edit, Eye, Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

interface MediaUpload {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  file_url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  orientation: 'landscape' | 'portrait' | 'square' | null;
  dimensions: { width: number; height: number } | null;
}

const NewsManager = () => {
  const { user } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'general',
    priority: 'normal',
    is_featured: false,
    tags: '',
    featured_image: null as File | null,
    video_file: null as File | null
  });

  const categories = [
    'general', 'team', 'medical', 'schedule', 'achievement', 'announcement',
    'panthers', 'player_profiles', 'highlights', 'player_of_the_week', 
    'panthers_alumni', 'ncaa', 'updates', 'schedule_changes'
  ];

  const priorities = ['low', 'normal', 'high', 'urgent'];

  const currentUser = {
    name: user?.email?.split('@')[0] || 'User',
    role: isSuperAdmin ? 'Super Admin' : 'User',
    avatar: '/placeholder.svg'
  };

  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      toast.error('Access denied. Super admin privileges required.');
      return;
    }
    if (isSuperAdmin) {
      fetchNewsItems();
    }
  }, [isSuperAdmin, roleLoading]);

  const fetchNewsItems = async () => {
    try {
      const { data, error } = await supabase
        .from('news_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewsItems(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Failed to fetch news items');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = document.createElement('img');
        
        img.onload = () => {
          canvas.width = 300;
          canvas.height = 200;
          ctx?.drawImage(img, 0, 0, 300, 200);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        
        img.src = URL.createObjectURL(file);
      } else {
        // For videos, use a placeholder or extract frame
        resolve('/placeholder.svg');
      }
    });
  };

  const detectOrientation = (file: File): Promise<'landscape' | 'portrait' | 'square'> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.onload = () => {
          const ratio = img.width / img.height;
          if (ratio > 1.1) resolve('landscape');
          else if (ratio < 0.9) resolve('portrait');
          else resolve('square');
        };
        img.src = URL.createObjectURL(file);
      } else {
        resolve('landscape'); // Default for videos
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      
      let featured_image_url = null;
      let video_url = null;
      let thumbnail_url = null;

      // Upload featured image
      if (formData.featured_image) {
        const imagePath = `${user.id}/${Date.now()}_${formData.featured_image.name}`;
        featured_image_url = await uploadFile(formData.featured_image, 'news-media', imagePath);
        thumbnail_url = await generateThumbnail(formData.featured_image);
      }

      // Upload video
      if (formData.video_file) {
        const videoPath = `${user.id}/${Date.now()}_${formData.video_file.name}`;
        video_url = await uploadFile(formData.video_file, 'news-media', videoPath);
        if (!thumbnail_url) {
          thumbnail_url = await generateThumbnail(formData.video_file);
        }
      }

      const newsData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        category: formData.category,
        priority: formData.priority,
        is_featured: formData.is_featured,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        featured_image_url,
        video_url,
        thumbnail_url,
        author_id: user.id,
        published_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('news_updates')
        .insert(newsData);

      if (error) throw error;

      toast.success('News item created successfully!');
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        category: 'general',
        priority: 'normal',
        is_featured: false,
        tags: '',
        featured_image: null,
        video_file: null
      });
      setActiveTab('list');
      fetchNewsItems();
    } catch (error) {
      console.error('Error creating news:', error);
      toast.error('Failed to create news item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (newsId: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;

    try {
      const { error } = await supabase
        .from('news_updates')
        .delete()
        .eq('id', newsId);

      if (error) throw error;

      toast.success('News item deleted successfully');
      fetchNewsItems();
    } catch (error) {
      console.error('Error deleting news:', error);
      toast.error('Failed to delete news item');
    }
  };

  const toggleFeatured = async (newsId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('news_updates')
        .update({ is_featured: !currentValue })
        .eq('id', newsId);

      if (error) throw error;

      toast.success(`News item ${!currentValue ? 'featured' : 'unfeatured'} successfully`);
      fetchNewsItems();
    } catch (error) {
      console.error('Error updating featured status:', error);
      toast.error('Failed to update featured status');
    }
  };

  if (roleLoading) {
    return <div>Loading...</div>;
  }

  if (!isSuperAdmin) {
    return <div>Access denied. Super admin privileges required.</div>;
  }

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">News & Update Manager</h1>
            <p className="text-muted-foreground">Manage news and updates for the home page</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">News List</TabsTrigger>
            <TabsTrigger value="create">Create News</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="grid gap-4">
              {loading ? (
                <div>Loading news items...</div>
              ) : newsItems.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No news items found</p>
                    <Button 
                      onClick={() => setActiveTab('create')} 
                      className="mt-4"
                    >
                      Create First News Item
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                newsItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{item.title}</h3>
                            {item.is_featured && (
                              <Star className="h-4 w-4 text-gold fill-current" />
                            )}
                          </div>
                          
                          <p className="text-muted-foreground mb-3 line-clamp-2">{item.excerpt || item.content}</p>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline">{item.category}</Badge>
                            <Badge 
                              variant={item.priority === 'urgent' ? 'destructive' : 
                                      item.priority === 'high' ? 'default' : 'secondary'}
                            >
                              {item.priority}
                            </Badge>
                            {item.tags?.map((tag, index) => (
                              <Badge key={index} variant="outline">{tag}</Badge>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Views: {item.view_count}</span>
                            <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                            {item.published_at && (
                              <span>Published: {new Date(item.published_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {(item.featured_image_url || item.video_url) && (
                            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
                              {item.thumbnail_url ? (
                                <img 
                                  src={item.thumbnail_url} 
                                  alt="Thumbnail"
                                  className="w-full h-full object-cover"
                                />
                              ) : item.featured_image_url ? (
                                <img 
                                  src={item.featured_image_url} 
                                  alt="Featured"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Video className="w-full h-full p-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleFeatured(item.id, item.is_featured)}
                            >
                              <Star className={`h-4 w-4 ${item.is_featured ? 'fill-current text-gold' : ''}`} />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create News & Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter news title"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Brief summary of the news..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Full news content..."
                      rows={6}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map(priority => (
                            <SelectItem key={priority} value={priority}>
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="tag1, tag2, tag3"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="featured"
                        checked={formData.is_featured}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                      />
                      <Label htmlFor="featured">Featured</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="featured-image">Featured Image</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4">
                        <input
                          id="featured-image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFormData({ ...formData, featured_image: e.target.files?.[0] || null })}
                          className="w-full"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Supports landscape, portrait, and square formats
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="video">Video</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4">
                        <input
                          id="video"
                          type="file"
                          accept="video/*"
                          onChange={(e) => setFormData({ ...formData, video_file: e.target.files?.[0] || null })}
                          className="w-full"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Automatic thumbnail generation
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => setActiveTab('list')}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Publishing...' : 'Publish News'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default NewsManager;