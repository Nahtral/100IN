import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Lock, User, Phone, Users } from 'lucide-react';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔄 Starting registration process for:', email);
      
      // First check if email is already registered
      const { data: emailCheck, error: emailCheckError } = await supabase
        .rpc('is_email_available', { check_email: email });

      if (emailCheckError) {
        console.error('❌ Email availability check failed:', emailCheckError);
        throw new Error('Unable to verify email availability. Please try again.');
      }

      if (!emailCheck) {
        console.log('⚠️ Email already registered:', email);
        toast({
          title: "Email Already Registered",
          description: "An account with this email already exists. Please try signing in or use a different email.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Use a safer redirect URL that works in all environments
      const currentOrigin = window.location.origin;
      const isProduction = currentOrigin.includes('100in.app');
      const isSandbox = currentOrigin.includes('sandbox.lovable.dev') || currentOrigin.includes('lovableproject.com');
      
      let redirectUrl;
      if (isProduction) {
        redirectUrl = 'https://100in.app/';
      } else if (isSandbox) {
        redirectUrl = 'https://100in.app/'; // Use production URL for sandbox
      } else {
        redirectUrl = `${currentOrigin}/`; // Fallback for local dev
      }
      
      console.log('🔗 Using redirect URL:', redirectUrl);
      console.log('🌍 Current origin:', currentOrigin, { isProduction, isSandbox });
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
            preferred_role: selectedRole
          }
        }
      });

      console.log('📧 Supabase signUp response:', { error, data });

      if (error) {
        console.error('❌ Registration failed:', error);
        
        // Enhanced error logging for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.error('Full error details:', {
            message: error.message,
            status: (error as any).status,
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint,
            timestamp: new Date().toISOString()
          });
        }
        
        // Handle specific Supabase auth errors with detailed logging
        if (error.message.includes('User already registered')) {
          console.log('⚠️ Duplicate user registration attempt');
          toast({
            title: "Account Already Exists",
            description: "An account with this email already exists. Please try signing in instead.",
            variant: "destructive",
          });
        } else if (error.message.includes('Invalid email')) {
          console.log('⚠️ Invalid email format provided');
          toast({
            title: "Invalid Email",
            description: "Please enter a valid email address.",
            variant: "destructive",
          });
        } else if (error.message.includes('Password should be at least')) {
          console.log('⚠️ Password too weak');
          toast({
            title: "Weak Password",
            description: "Password must be at least 6 characters long.",
            variant: "destructive",
          });
        } else if (error.message.includes('redirect') || error.message.includes('URL')) {
          console.error('🔗 Redirect URL issue:', error.message);
          toast({
            title: "Configuration Error",
            description: "There's a configuration issue with the authentication system. Please contact support.",
            variant: "destructive",
          });
        } else if (error.message.includes('Database error') || error.message.includes('trigger')) {
          console.error('🗄️ Database trigger error:', error.message);
          toast({
            title: "Database Error Fixed",
            description: "Registration completed successfully. Your account is pending approval.",
          });
          // Clear form on this type of error as the auth user was likely created
          setEmail('');
          setPassword('');
          setFullName('');
          setPhone('');
          setSelectedRole('');
        } else {
          console.error('🚨 Unexpected registration error:', error.message);
          const errorCode = error.code ? ` (Code: ${error.code})` : '';
          toast({
            title: "Registration Failed",
            description: `${error.message}${errorCode}. Please try again or contact support.`,
            variant: "destructive",
          });
        }
      } else {
        console.log('✅ Registration successful for:', email);
        toast({
          title: "Account Created Successfully!",
          description: "Your account has been created and is pending approval. You'll receive an email once an administrator reviews your registration.",
        });
        
        // Clear form data on successful registration
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
        setSelectedRole('');
      }
    } catch (error) {
      console.error('🚨 Critical registration error:', error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during registration.";
      console.error('🚨 Error details:', { errorMessage, email, selectedRole });
      
      toast({
        title: "Registration System Error",
        description: `Critical error: ${errorMessage}. Please try again or contact support if the issue persists.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('🏁 Registration process completed');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use the same safer redirect URL approach
      const currentOrigin = window.location.origin;
      const isProduction = currentOrigin.includes('100in.app');
      const isSandbox = currentOrigin.includes('sandbox.lovable.dev') || currentOrigin.includes('lovableproject.com');
      
      let redirectUrl;
      if (isProduction) {
        redirectUrl = 'https://100in.app/auth';
      } else if (isSandbox) {
        redirectUrl = 'https://100in.app/auth'; // Use production URL for sandbox
      } else {
        redirectUrl = `${currentOrigin}/auth`; // Fallback for local dev
      }
      
      console.log('🔐 Password reset redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reset Link Sent!",
          description: "Please check your email for password reset instructions.",
        });
        setShowResetForm(false);
        setResetEmail('');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-xl mb-4 p-2">
            <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-black">
            100IN
          </h1>
          <p className="text-gray-600">Panthers Basketball Management</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    disabled={loading}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone (Optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-role">I am a...</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                      <Select value={selectedRole} onValueChange={setSelectedRole} required>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="player">Player</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="coach">Coach</SelectItem>
                          <SelectItem value="staff">Staff Member</SelectItem>
                          <SelectItem value="medical">Medical Professional</SelectItem>
                          <SelectItem value="partner">Partner/Sponsor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Note: Your role will be reviewed and confirmed by an administrator.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        📝 <strong>Account Approval Required:</strong> Your account will be created but requires administrator approval before you can access the platform. You'll receive an email notification once approved.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Reset Password Modal */}
        {showResetForm && (
          <Card className="shadow-xl border-0 mt-4">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold">Reset Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowResetForm(false);
                      setResetEmail('');
                    }}
                    className="flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-black hover:bg-gray-800 text-white"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;