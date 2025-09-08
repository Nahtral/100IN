import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface HRFunctionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  status?: 'active' | 'setup_required' | 'maintenance';
  count?: number;
}

export const HRFunctionCard: React.FC<HRFunctionCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  status = 'active',
  count
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700';
      case 'setup_required':
        return 'bg-yellow-50 text-yellow-700';
      case 'maintenance':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-all duration-200" onClick={onClick}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4" />
          {title}
          {count !== undefined && (
            <Badge variant="outline" className="ml-auto">
              {count}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {description}
        </p>
        <div className="flex items-center justify-between">
          <Badge className={`text-xs ${getStatusColor()}`}>
            {status === 'active' ? 'Active' : status === 'setup_required' ? 'Setup Required' : 'Maintenance'}
          </Badge>
          <Button className="w-full mt-2" size="sm">
            Access
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};