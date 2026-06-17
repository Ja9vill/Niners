import { useState } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Mock Director Login (In a real app, integrate with Firebase Auth)
    setTimeout(() => {
      if (pin === '1234') { // Mock PIN
        onLogin();
      } else {
        setError('Invalid Director PIN');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black text-white p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl mx-auto flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-neutral-500 text-sm">Director Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Enter PIN (Mock: 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-center text-xl tracking-[0.5em] focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>
          
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || pin.length < 4}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
          </button>
        </form>
      </div>
    </div>
  );
}
