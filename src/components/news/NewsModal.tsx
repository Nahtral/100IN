import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  featured_image_url?: string;
  category: string;
  priority: string;
  published_at: string;
  author_id?: string;
}

interface NewsModalProps {
  news: NewsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewsModal = ({ news, open, onOpenChange }: NewsModalProps) => {
  if (!news) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
        <div className="flex flex-col h-full overflow-hidden">
          {news.featured_image_url && (
            <div className="relative h-64 overflow-hidden flex-shrink-0">
              <img 
                src={news.featured_image_url} 
                alt={news.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6">
                <Badge 
                  variant={news.priority === 'high' ? 'destructive' : 'secondary'}
                  className="mb-2"
                >
                  {news.category}
                </Badge>
                <h1 className="text-white text-2xl font-bold leading-tight">
                  {news.title}
                </h1>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {!news.featured_image_url && (
                <DialogHeader className="mb-6">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <DialogTitle className="text-2xl leading-tight">{news.title}</DialogTitle>
                    <Badge 
                      variant={news.priority === 'high' ? 'destructive' : 'secondary'}
                    >
                      {news.category}
                    </Badge>
                  </div>
                </DialogHeader>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(news.published_at), 'MMMM d, yyyy')}
                </div>
                {news.author_id && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Author
                  </div>
                )}
              </div>
              
              <div className="prose prose-neutral max-w-none pb-6">
                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                  {news.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};