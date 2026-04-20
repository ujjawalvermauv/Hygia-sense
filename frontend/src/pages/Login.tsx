import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Droplets, Monitor, ShieldCheck, UserCheck } from 'lucide-react';
import { loginCleaner, requestCleanerSignup } from '@/services/cleanerService';

type AuthMode = 'login' | 'signup';
type UserRole = 'admin' | 'cleaner' | 'display';

const ADMIN_EMAIL = 'ujjawalvermauv12@gmail.com';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setAuthError('');
    setAuthInfo('');

    if (mode === 'signup' && role === 'admin') {
      setAuthError('Admin account cannot be created from sign up. Please choose Cleaner or TV Display.');
      return;
    }

    if (role === 'admin' && email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setAuthError(`Only ${ADMIN_EMAIL} can access Admin mode.`);
      return;
    }

    try {
      if (role === 'admin') {
        localStorage.setItem('hygia_session', JSON.stringify({
          role: 'admin',
          email: ADMIN_EMAIL,
          name: 'Ujjawal Verma',
        }));
        navigate('/dashboard');
        return;
      }

      if (role === 'display') {
        localStorage.setItem('hygia_session', JSON.stringify({
          role: 'display',
          email: email.trim().toLowerCase(),
          name: name.trim() || 'Display User',
        }));
        navigate('/display');
        return;
      }

      if (mode === 'signup') {
        if (!name.trim()) {
          setAuthError('Cleaner name is required for signup.');
          return;
        }

        if (!mobileNumber.trim()) {
          setAuthError('Cleaner mobile number is required for signup.');
          return;
        }

        await requestCleanerSignup(name.trim(), email.trim().toLowerCase(), password, mobileNumber.trim());
        setAuthInfo('Signup request submitted. Admin approval is required before cleaner login.');
        setMode('login');
        setRole('cleaner');
        return;
      }

      const response = await loginCleaner(email.trim().toLowerCase(), password);
      const cleaner = response?.cleaner;

      localStorage.setItem('hygia_session', JSON.stringify({
        role: 'cleaner',
        cleanerId: cleaner?._id,
        email: cleaner?.email,
        name: cleaner?.name,
      }));

      navigate('/cleaner');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      if (role === 'cleaner' && message.toLowerCase().includes('not found')) {
        setAuthError('Cleaner account not found. Please sign up first and wait for admin approval.');
        return;
      }
      setAuthError(message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent mb-4">
            <Droplets className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Hygia Sense</h1>
          <p className="text-muted-foreground mt-1">Smart Washroom Monitoring System</p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg font-semibold">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {mode === 'login' 
                ? 'Enter your credentials to access the system' 
                : 'Register a new account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              {mode === 'signup' && role === 'cleaner' && (
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Mobile Number</Label>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <Label>Access Mode</Label>
                <RadioGroup 
                  value={role} 
                  onValueChange={(value) => setRole(value as UserRole)}
                  className={`grid gap-3 ${mode === 'signup' ? 'grid-cols-2' : 'grid-cols-3'}`}
                >
                  {mode === 'login' && (
                    <div className="relative">
                      <RadioGroupItem 
                        value="admin" 
                        id="admin" 
                        className="peer sr-only" 
                      />
                      <Label 
                        htmlFor="admin" 
                        className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/5 hover:bg-muted/50"
                      >
                        <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs font-medium text-center">Admin</span>
                      </Label>
                    </div>
                  )}
                  <div className="relative">
                    <RadioGroupItem 
                      value="cleaner" 
                      id="cleaner" 
                      className="peer sr-only" 
                    />
                    <Label 
                      htmlFor="cleaner" 
                      className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/5 hover:bg-muted/50"
                    >
                      <UserCheck className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs font-medium text-center">Cleaner</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem 
                      value="display" 
                      id="display" 
                      className="peer sr-only" 
                    />
                    <Label 
                      htmlFor="display" 
                      className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/5 hover:bg-muted/50"
                    >
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs font-medium text-center">TV Display</span>
                    </Label>
                  </div>
                </RadioGroup>
                {mode === 'signup' && (
                  <p className="text-xs text-muted-foreground">
                    Admin sign up is disabled. Only cleaner and TV display accounts can be created.
                  </p>
                )}
              </div>

              {authError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {authError}
                </div>
              )}

              {authInfo && (
                <div className="rounded-md border border-status-info/30 bg-status-info/10 px-3 py-2 text-sm text-status-info">
                  {authInfo}
                </div>
              )}

              <Button type="submit" className="w-full">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = mode === 'login' ? 'signup' : 'login';
                    setMode(nextMode);
                    setAuthError('');
                    setAuthInfo('');
                    setMobileNumber('');
                    if (nextMode === 'signup' && role === 'admin') {
                      setRole('cleaner');
                    }
                  }}
                  className="ml-1 text-accent hover:underline font-medium"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2025 Hygia Sense. Professional Washroom Monitoring.
        </p>
      </div>
    </div>
  );
};

export default Login;
