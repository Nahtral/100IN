import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export const ApprovalRequired = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkApprovalStatus();
  }, [user]);

  const checkApprovalStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status, rejection_reason')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking approval status:', error);
        return;
      }

      setApprovalStatus(data.approval_status as ApprovalStatus);
      
      // If approved, redirect to main app using React Router
      if (data.approval_status === 'approved') {
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Checking approval status...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-xl mb-4 p-2">
            <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-black">100IN</h1>
          <p className="text-gray-600">Panthers Basketball Management</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2">
              {approvalStatus === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
              {approvalStatus === 'rejected' && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {approvalStatus === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvalStatus === 'pending' && (
              <>
                <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    Approval Pending
                  </h3>
                  <p className="text-yellow-700 text-sm">
                    Your account is currently under review by our administrators. 
                    You'll receive an email notification once your account has been approved.
                  </p>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>What happens next?</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>An administrator will review your account</li>
                    <li>You'll receive an email notification with the decision</li>
                    <li>Once approved, you can log in and access the platform</li>
                  </ul>
                </div>
              </>
            )}

            {approvalStatus === 'rejected' && (
              <>
                <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    Account Rejected
                  </h3>
                  <p className="text-red-700 text-sm">
                    Unfortunately, your account application was not approved. 
                    Please contact the administrator for more information.
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    If you believe this was an error, please contact support.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-center pt-4">
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Sign out and return to login
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-600">
          <p>Need help? Contact your administrator</p>
        </div>
      </div>
    </div>
  );
};