import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye } from "lucide-react";
import { format } from "date-fns";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  category: string;
  priority: string;
  published_at: string;
}

interface NewsCardProps {
  news: NewsItem;
  onClick: () => void;
}

export const NewsCard = ({ news, onClick }: NewsCardProps) => {
  const truncatedContent = news.excerpt || 
    (news.content.length > 150 ? news.content.substring(0, 150) + "..." : news.content);

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden"
      onClick={onClick}
    >
      {news.featured_image_url && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={news.featured_image_url} 
            alt={news.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {news.title}
          </h3>
          <Badge 
            variant={news.priority === 'high' ? 'destructive' : 'secondary'}
            className="shrink-0"
          >
            {news.category}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-4">
          {truncatedContent}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(news.published_at), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="h-3 w-3" />
            Read More
          </div>
        </div>
      </CardContent>
    </Card>
  );
};