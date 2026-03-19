import { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  Sprout,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '../../stores/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
}

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
];

export function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotDeliveryMode, setForgotDeliveryMode] = useState<'email' | 'preview' | 'not-configured' | null>(null);
  const [forgotPreviewUrl, setForgotPreviewUrl] = useState('');
  const [forgotDevResetLink, setForgotDevResetLink] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'farmer' as 'farmer' | 'admin',
    farmName: '',
    farmSize: '',
    location: '',
    preferredLanguage: 'en'
  });

  const { login, register, forgotPassword } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await login(loginData.email, loginData.password);
    
    setIsLoading(false);
    if (success) {
      onClose();
    } else {
      alert('Invalid email or password. Please try again.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await register({
      name: registerData.name,
      email: registerData.email,
      password: registerData.password,
      phone: registerData.phone,
      role: registerData.role,
      farmName: registerData.farmName,
      farmSize: parseFloat(registerData.farmSize) || 0,
      location: registerData.location,
      preferredLanguage: registerData.preferredLanguage
    });
    
    setIsLoading(false);
    if (success) {
      onClose();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    const email = forgotPasswordEmail.trim();
    if (!email) {
      setForgotError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    const result = await forgotPassword(email);
    
    setIsLoading(false);
    if (result.success) {
      setForgotDeliveryMode(result.delivery || null);
      setForgotPreviewUrl(result.previewUrl || '');
      setForgotDevResetLink(result.devResetLink || '');
      setForgotPasswordSent(true);
    } else {
      setForgotError(result.error || 'Unable to send reset link. Please try again.');
    }
  };

  if (isForgotPassword) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button onClick={() => setIsForgotPassword(false)} className="p-1 hover:bg-gray-100 rounded">
                <ArrowLeft className="w-5 h-5" />
              </button>
              Reset Password
            </DialogTitle>
          </DialogHeader>
          
          {forgotPasswordSent ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Check Your Email</h3>
              <p className="text-gray-500 mb-4">
                If this email is registered, reset instructions were sent to {forgotPasswordEmail}
              </p>
              {forgotDeliveryMode === 'preview' && forgotPreviewUrl && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
                  SMTP is not configured, so this email was generated in preview mode. Open this preview inbox message:
                  <a className="mt-2 block break-all text-blue-700 underline" href={forgotPreviewUrl} target="_blank" rel="noreferrer">
                    {forgotPreviewUrl}
                  </a>
                </div>
              )}
              {forgotDevResetLink && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-left text-sm text-green-900">
                  Development reset link:
                  <a className="mt-2 block break-all text-blue-700 underline" href={forgotDevResetLink} target="_blank" rel="noreferrer">
                    {forgotDevResetLink}
                  </a>
                </div>
              )}
              {forgotDeliveryMode === 'not-configured' && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800">
                  Email provider is not configured. In development, use the Development reset link above to continue instantly.
                </div>
              )}
              <Button onClick={() => {
                setIsForgotPassword(false);
                setForgotPasswordSent(false);
                setForgotDeliveryMode(null);
                setForgotPreviewUrl('');
                setForgotDevResetLink('');
              }}>
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <Sprout className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">
              {mode === 'login' ? 'Welcome Back!' : 'Join AgroConnect'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login' 
                ? 'Login to access your farm dashboard' 
                : 'Create an account to start your farming journey'}
            </p>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login" onClick={() => onModeChange('login')}>Login</TabsTrigger>
            <TabsTrigger value="register" onClick={() => onModeChange('register')}>Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-green-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reg-name"
                    placeholder="Your full name"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reg-location"
                    placeholder="City, State"
                    value={registerData.location}
                    onChange={(e) => setRegisterData({ ...registerData, location: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-farm-name">Farm Name</Label>
                  <Input
                    id="reg-farm-name"
                    placeholder="Your farm name"
                    value={registerData.farmName}
                    onChange={(e) => setRegisterData({ ...registerData, farmName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-farm-size">Farm Size (acres)</Label>
                  <Input
                    id="reg-farm-size"
                    type="number"
                    placeholder="e.g., 5"
                    value={registerData.farmSize}
                    onChange={(e) => setRegisterData({ ...registerData, farmSize: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-language">Preferred Language</Label>
                <Select 
                  value={registerData.preferredLanguage}
                  onValueChange={(value) => setRegisterData({ ...registerData, preferredLanguage: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-gray-500 mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </DialogContent>
    </Dialog>
  );
}
