import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Archive, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Partner } from '@/hooks/usePartnerData';

interface PartnerCardProps {
  partner: Partner;
  onView: (partner: Partner) => void;
  onEdit: (partner: Partner) => void;
  onArchive: (partnerId: string) => void;
  onDelete: (partnerId: string) => void;
}

export const PartnerCard: React.FC<PartnerCardProps> = ({
  partner,
  onView,
  onEdit,
  onArchive,
  onDelete,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sponsor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'equipment':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'media':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer border border-border/50"
      onClick={() => onView(partner)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView(partner);
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground">
              {partner.name}
            </h3>
            <div className="flex gap-2">
              <Badge className={getTypeColor(partner.partnership_type)}>
                {partner.partnership_type}
              </Badge>
              <Badge className={getStatusColor(partner.status)}>
                {partner.status}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onView(partner);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit(partner);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {partner.status !== 'archived' && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onArchive(partner.id);
                }}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(partner.id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Contact</p>
            <p className="font-medium">{partner.contact_name || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Value</p>
            <p className="font-medium">
              {formatCurrency(partner.partnership_value || 0)}
            </p>
          </div>
        </div>

        <div className="text-sm">
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium">{partner.contact_email || 'Not provided'}</p>
        </div>

        {partner.description && (
          <div className="text-sm">
            <p className="text-muted-foreground">Description</p>
            <p className="font-medium line-clamp-2">{partner.description}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/50">
        <div className="grid grid-cols-3 gap-4 text-center text-sm w-full">
          <div>
            <p className="text-muted-foreground">Sponsorships</p>
            <p className="font-bold text-lg">{partner.total_sponsorships}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Active</p>
            <p className="font-bold text-lg text-green-600">{partner.active_sponsorships}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Value</p>
            <p className="font-bold text-lg">
              {formatCurrency(partner.total_sponsorship_value || 0)}
            </p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};