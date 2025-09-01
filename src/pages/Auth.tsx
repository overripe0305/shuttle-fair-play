import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import badmintonLogo from '@/assets/badminton-logo.png';
import { ArrowLeft, Loader2, Mail, Lock } from 'lucide-react';

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();

  // Cleanup auth state utility
  const cleanupAuthState = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.error('Error cleaning up auth state:', err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to defer navigation and prevent deadlocks
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // If user is already logged in, redirect to home
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSigningIn(true);
      setError(null);
      
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('Global signout failed:', err);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      if (data.user) {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
    } catch (error: any) {
      console.error('Error signing in:', error);
      setError(error.message || 'Failed to sign in. Please check your credentials.');
      setSigningIn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setSigningUp(true);
      setError(null);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        throw error;
      }
      
      if (data.user) {
        setError(null);
        // Show success message
        alert('Account created successfully! Please check your email to verify your account.');
      }
      
    } catch (error: any) {
      console.error('Error signing up:', error);
      setError(error.message || 'Failed to create account. Please try again.');
      setSigningUp(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) {
        throw error;
      }
      
      setResetEmailSent(true);
      
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      setError(error.message || 'Failed to send reset email. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // If user is already authenticated, show logged in state
  if (user && session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={badmintonLogo} alt="BadmintonPro" className="h-12 w-12" />
            </div>
            <CardTitle>Welcome Back!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground">
                You are signed in as:
              </p>
              <p className="font-medium">{user.email}</p>
            </div>
            
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/">
                  Go to Dashboard
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={async () => {
                  cleanupAuthState();
                  await supabase.auth.signOut({ scope: 'global' });
                  window.location.href = '/auth';
                }}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={badmintonLogo} alt="BadmintonPro" className="h-12 w-12" />
          </div>
          <CardTitle>Welcome to BadmintonPro</CardTitle>
          <p className="text-muted-foreground">
            Sign in to access your club management dashboard
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showForgotPassword ? (
            <div className="space-y-4">
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Password reset link sent to your email. Please check your inbox and follow the instructions.
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                      setEmail('');
                    }}
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        placeholder="Enter your email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" size="lg">
                    Send Reset Link
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="w-full"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setEmail('');
                      setError(null);
                    }}
                  >
                    Back to Sign In
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={signingIn || signingUp}
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={signingIn || signingUp}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  placeholder={isSignUp ? "Create a password (min 6 characters)" : "Enter your password"}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={signingIn || signingUp}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={signingIn || signingUp}
              className="w-full"
              size="lg"
            >
              {(signingIn || signingUp) ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : null}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>
          )}
          
          <div className="text-center space-y-2">
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setEmail('');
                setPassword('');
                setFullName('');
                setShowForgotPassword(false);
                setResetEmailSent(false);
              }}
              disabled={signingIn || signingUp}
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </Button>
            
            {!isSignUp && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowForgotPassword(!showForgotPassword);
                  setError(null);
                  setResetEmailSent(false);
                }}
                disabled={signingIn || signingUp}
              >
                Forgot your password?
              </Button>
            )}
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>
              By {isSignUp ? 'creating an account' : 'signing in'}, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;