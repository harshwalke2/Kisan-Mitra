import { useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '../../stores/authStore';

const getTokenFromUrl = (): string => {
  const params = new URLSearchParams(window.location.search);
  return (params.get('token') || '').trim();
};

export function ResetPasswordPage() {
  const token = useMemo(() => getTokenFromUrl(), []);
  const { resetPassword } = useAuthStore();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Reset token missing. Please open the link from your email again.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const success = await resetPassword(token, newPassword);
    setIsLoading(false);

    if (!success) {
      setError('Reset link is invalid or expired. Please request a new reset email.');
      return;
    }

    setDone(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl">
        {!done ? (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-stone-900">Set New Password</h1>
                <p className="text-sm text-stone-500">Reset your AgroConnect account password</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Enter new password"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-600" />
            <h2 className="text-xl font-semibold text-stone-900">Password Updated</h2>
            <p className="mt-2 text-sm text-stone-600">Your password has been reset successfully. You can now log in.</p>
            <Button className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => (window.location.href = '/')}>
              Go to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
