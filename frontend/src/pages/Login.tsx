import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Droplets, Monitor, ShieldCheck, UserCheck } from 'lucide-react';

type AuthMode = 'login' | 'signup';
type UserRole = 'admin' | 'cleaner' | 'display';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (role === 'admin') {
      navigate('/dashboard');
    } else if (role === 'cleaner') {
      navigate('/cleaner');
    } else {
      navigate('/display');
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
                  className="grid grid-cols-3 gap-3"
                >
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
              </div>

              <Button type="submit" className="w-full">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
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
