import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Activity,
  FileText,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface ReturnToPlayStatusProps {
  status: {
    status: 'cleared' | 'limited' | 'under_review' | 'not_cleared';
    lastAssessment: Date | null;
    activeInjuries: number;
    completedRehabPlans: number;
    totalRehabPlans: number;
    notes: string;
  };
  onRequestClearance: () => void;
}

const ReturnToPlayStatus: React.FC<ReturnToPlayStatusProps> = ({ 
  status, 
  onRequestClearance 
}) => {
  const getStatusConfig = () => {
    switch (status.status) {
      case 'cleared':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          title: 'Cleared for Play',
          titleColor: 'text-green-800',
          description: 'You are cleared for full participation in training and competition.',
          descriptionColor: 'text-green-700',
          cardBgColor: 'bg-green-50',
          buttonVariant: 'outline' as const,
          buttonColor: 'border-green-200 text-green-700 hover:bg-green-50'
        };
      case 'limited':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          title: 'Limited Participation',
          titleColor: 'text-orange-800',
          description: 'You may participate with restrictions. Follow your rehabilitation plan.',
          descriptionColor: 'text-orange-700',
          cardBgColor: 'bg-orange-50',
          buttonVariant: 'outline' as const,
          buttonColor: 'border-orange-200 text-orange-700 hover:bg-orange-50'
        };
      case 'under_review':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          title: 'Under Medical Review',
          titleColor: 'text-blue-800',
          description: 'Your return-to-play status is being evaluated by medical staff.',
          descriptionColor: 'text-blue-700',
          cardBgColor: 'bg-blue-50',
          buttonVariant: 'outline' as const,
          buttonColor: 'border-blue-200 text-blue-700 hover:bg-blue-50'
        };
      case 'not_cleared':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          title: 'Not Cleared for Play',
          titleColor: 'text-red-800',
          description: 'Medical clearance is required before returning to activity.',
          descriptionColor: 'text-red-700',
          cardBgColor: 'bg-red-50',
          buttonVariant: 'outline' as const,
          buttonColor: 'border-red-200 text-red-700 hover:bg-red-50'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          title: 'Status Unknown',
          titleColor: 'text-gray-800',
          description: 'Unable to determine current status.',
          descriptionColor: 'text-gray-700',
          cardBgColor: 'bg-gray-50',
          buttonVariant: 'outline' as const,
          buttonColor: 'border-gray-200 text-gray-700 hover:bg-gray-50'
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  
  // Calculate overall progress percentage
  const calculateProgress = () => {
    let progress = 0;
    
    // 40% weight for no active injuries
    if (status.activeInjuries === 0) {
      progress += 40;
    }
    
    // 40% weight for rehabilitation completion
    if (status.totalRehabPlans > 0) {
      progress += (status.completedRehabPlans / status.totalRehabPlans) * 40;
    } else if (status.activeInjuries === 0) {
      progress += 40; // No rehab needed if no injuries
    }
    
    // 20% weight for recent medical assessment
    if (status.lastAssessment && status.lastAssessment > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      progress += 20;
    }
    
    return Math.round(progress);
  };

  const progressPercentage = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className={config.cardBgColor}>
        <CardContent className="p-8">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 ${config.bgColor} rounded-full mb-6`}>
              <StatusIcon className={`h-10 w-10 ${config.color}`} />
            </div>
            
            <h3 className={`text-3xl font-bold ${config.titleColor} mb-3`}>
              {config.title}
            </h3>
            
            <p className={`${config.descriptionColor} mb-6 text-lg`}>
              {config.description}
            </p>

            {/* Status Details */}
            <div className={`${config.cardBgColor} rounded-lg p-6 mb-6`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${status.activeInjuries === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {status.activeInjuries}
                  </div>
                  <p className="text-gray-600">Active Injuries</p>
                </div>
                
                {status.totalRehabPlans > 0 && (
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${status.completedRehabPlans === status.totalRehabPlans ? 'text-green-600' : 'text-orange-600'}`}>
                      {status.completedRehabPlans}/{status.totalRehabPlans}
                    </div>
                    <p className="text-gray-600">Rehab Plans Complete</p>
                  </div>
                )}
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${status.lastAssessment ? 'text-green-600' : 'text-gray-400'}`}>
                    {status.lastAssessment ? '✓' : '—'}
                  </div>
                  <p className="text-gray-600">Recent Assessment</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Return-to-Play Progress</span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            {/* Current Status Notes */}
            {status.notes && (
              <div className="text-left mb-6">
                <h4 className={`font-semibold ${config.titleColor} mb-2 flex items-center gap-2`}>
                  <FileText className="h-4 w-4" />
                  Current Status Details
                </h4>
                <p className={`${config.descriptionColor} bg-white bg-opacity-50 p-4 rounded-md`}>
                  {status.notes}
                </p>
              </div>
            )}

            {/* Last Assessment Info */}
            {status.lastAssessment && (
              <div className="text-left mb-6">
                <h4 className={`font-semibold ${config.titleColor} mb-2 flex items-center gap-2`}>
                  <Calendar className="h-4 w-4" />
                  Last Medical Assessment
                </h4>
                <p className={`${config.descriptionColor} bg-white bg-opacity-50 p-4 rounded-md`}>
                  Completed on {format(status.lastAssessment, 'PPP')}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant={config.buttonVariant}
                className={config.buttonColor}
                onClick={onRequestClearance}
              >
                <Shield className="h-4 w-4 mr-2" />
                Request Medical Assessment
              </Button>
              
              {status.status === 'limited' && (
                <Button variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  View Activity Restrictions
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Clearance Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {status.activeInjuries === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={status.activeInjuries === 0 ? 'text-green-700' : 'text-red-700'}>
                No active injuries
              </span>
              {status.activeInjuries > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {status.activeInjuries} active
                </Badge>
              )}
            </div>

            {status.totalRehabPlans > 0 && (
              <div className="flex items-center gap-3">
                {status.completedRehabPlans === status.totalRehabPlans ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-orange-600" />
                )}
                <span className={status.completedRehabPlans === status.totalRehabPlans ? 'text-green-700' : 'text-orange-700'}>
                  Complete all rehabilitation plans
                </span>
                <Badge variant="outline" className="ml-auto">
                  {status.completedRehabPlans}/{status.totalRehabPlans}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-3">
              {status.lastAssessment && status.lastAssessment > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-orange-600" />
              )}
              <span className={status.lastAssessment && status.lastAssessment > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? 'text-green-700' : 'text-orange-700'}>
                Recent medical assessment (within 30 days)
              </span>
              {status.lastAssessment ? (
                <span className="text-sm text-gray-500 ml-auto">
                  {format(status.lastAssessment, 'MMM dd')}
                </span>
              ) : (
                <Badge variant="outline" className="ml-auto text-orange-600">
                  Needed
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReturnToPlayStatus;