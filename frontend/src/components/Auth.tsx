import React, { useState } from 'react';
import { User } from '../App';
import { Lock, Mail, ArrowRight, UserPlus, Info } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  isOffline: boolean;
  apiUrl: string;
}

export default function Auth({ onLogin, isOffline, apiUrl }: AuthProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register Form States
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('All fields are required.');
      return;
    }

    setIsLoggingIn(true);

    if (isOffline) {
      // Simulate login in standalone mode
      setTimeout(() => {
        setIsLoggingIn(false);
        onLogin({
          _id: 'local-user-id',
          email: loginEmail,
          settings: {
            ringtone: 'classic-chime',
            alarmOffset: 5
          }
        });
      }, 600);
    } else {
      try {
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: loginEmail, password: loginPassword })
        });
        const data = await res.json();
        setIsLoggingIn(false);

        if (res.ok) {
          onLogin(data);
        } else {
          setLoginError(data.message || 'Login failed.');
        }
      } catch (err) {
        setIsLoggingIn(false);
        setLoginError('Cannot reach authentication server.');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (!registerEmail || !registerPassword || !registerConfirmPassword) {
      setRegisterError('All fields are required.');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters.');
      return;
    }

    setIsRegistering(true);

    if (isOffline) {
      // Simulate registration in standalone mode
      setTimeout(() => {
        setIsRegistering(false);
        setLoginEmail(registerEmail);
        setLoginPassword('');
        setIsFlipped(false);
        alert('Account registered successfully (Sandbox)! Please log in using your password.');
      }, 600);
    } else {
      try {
        const res = await fetch(`${apiUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: registerEmail, password: registerPassword })
        });
        const data = await res.json();
        setIsRegistering(false);

        if (res.ok) {
          setLoginEmail(registerEmail);
          setLoginPassword('');
          setIsFlipped(false);
          alert('Profile registered successfully! Please log in.');
        } else {
          setRegisterError(data.message || 'Registration failed.');
        }
      } catch (err) {
        setIsRegistering(false);
        setRegisterError('Cannot reach authentication server.');
      }
    }
  };

  return (
    <div className="auth-perspective w-full max-w-[420px] p-4">
      {isOffline && (
        <div className="glass-container mb-6 p-4 border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs flex items-start gap-3 rounded-2xl">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold mb-1">Standalone Sandbox Mode</p>
            <p className="leading-relaxed opacity-80">
              The Node.js server is not running or unreachable. Enter any mock credentials (e.g., <code>demo@example.com</code> / <code>123456</code>) to log in instantly.
            </p>
          </div>
        </div>
      )}

      <div className={`auth-flip-card ${isFlipped ? 'flipped' : ''}`}>
        
        {/* LOGIN SCREEN (CARD FRONT) */}
        <div className="auth-card-front glass-container border border-white/5 shadow-3xl rounded-3xl bg-slate-900/60 backdrop-blur-2xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h2>
            <p className="text-sm text-slate-400">Sign in to control your weekly routines.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                placeholder="Email Address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="input-glass pl-12"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="input-glass pl-12"
                required
              />
            </div>

            {loginError && (
              <div className="text-rose-400 text-sm text-center font-medium bg-rose-500/10 border border-rose-500/20 py-2.5 rounded-xl">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn-glass btn-primary-glow w-full mt-2 font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {isLoggingIn ? 'Decrypting Authentications...' : 'Access Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              New to timetable popup?{' '}
              <button
                onClick={() => {
                  setIsFlipped(true);
                  setLoginError('');
                }}
                className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>

        {/* REGISTRATION SCREEN (CARD BACK) */}
        <div className="auth-card-back glass-container border border-white/5 shadow-3xl rounded-3xl bg-slate-900/60 backdrop-blur-2xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent mb-2">
              Join timetable popup
            </h2>
            <p className="text-sm text-slate-400">Synchronize your schedule in 3D space.</p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                placeholder="Email Address"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                className="input-glass pl-12"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="Choose Password (min 6 chars)"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                className="input-glass pl-12"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="Confirm Password"
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                className="input-glass pl-12"
                required
              />
            </div>

            {registerError && (
              <div className="text-rose-400 text-sm text-center font-medium bg-rose-500/10 border border-rose-500/20 py-2.5 rounded-xl">
                {registerError}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="btn-glass btn-primary-glow w-full mt-2 font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              {isRegistering ? 'Generating Keys...' : 'Register Profile'}
              <UserPlus className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setRegisterError('');
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4"
              >
                Log In
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
