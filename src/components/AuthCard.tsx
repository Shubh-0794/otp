import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, RefreshCw, CheckCircle, AlertCircle, ArrowLeft, Clock, ShieldCheck, Sparkles, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AuthStep, SupabaseConfig, SessionData } from '../types/auth';
import { sendWhatsAppOtp, verifyWhatsAppOtp } from '../lib/supabase';
import { WhatsAppIcon } from './WhatsAppIcon';

interface AuthCardProps {
  config: SupabaseConfig;
  session: SessionData | null;
  onAuthenticated: (session: SessionData, target: string) => void;
  onSignOut: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  config,
  session,
  onAuthenticated,
  onSignOut,
}) => {
  const [step, setStep] = useState<AuthStep>('input');
  
  // Phone input states
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  
  // 6-digit OTP state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string | null>(null);
  
  // Countdown Timer
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (step === 'verify' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  const targetIdentifier = `${countryCode} ${phone || '(555) 019-2834'}`;

  const handleSendOtp = async (isResend = false) => {
    setError(null);

    const cleanDigits = phone.replace(/\D/g, '') || '5550192834';
    setLoading(true);

    try {
      const fullPhone = `${countryCode}${cleanDigits}`;
      const res = await sendWhatsAppOtp(fullPhone, config);
      
      if (res.success) {
        setStep('verify');
        setTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        if (res.simulatedCode) {
          setLastGeneratedCode(res.simulatedCode);
        }
      } else {
        setError(res.error || 'Failed to send WhatsApp OTP.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred sending WhatsApp OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      if (digits.length === 6) {
        verifyCode(newOtp.join(''));
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5 && newOtp.every((d) => d !== '')) {
      verifyCode(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pastedData) {
      const digits = pastedData.slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(digits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      if (digits.length === 6) {
        verifyCode(newOtp.join(''));
      }
    }
  };

  const verifyCode = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit WhatsApp code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanDigits = phone.replace(/\D/g, '') || '5550192834';
      const fullPhone = `${countryCode}${cleanDigits}`;
      const res = await verifyWhatsAppOtp(fullPhone, fullCode, config);
      
      if (res.success && res.session) {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        onAuthenticated(res.session, fullPhone);
      } else {
        setError(res.error || 'Invalid WhatsApp OTP code. Please check and try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const quickFillPreset = (code: string, number: string) => {
    setCountryCode(code);
    setPhone(number);
  };

  const fillSimulatedCode = () => {
    if (lastGeneratedCode && lastGeneratedCode.length === 6) {
      const digits = lastGeneratedCode.split('');
      setOtp(digits);
      verifyCode(lastGeneratedCode);
    }
  };

  // If already logged in, show authenticated state inside this card
  if (session) {
    return (
      <div className="w-full max-w-[580px] bg-[#0F1622] border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[#142B1F] border border-[#25D366]/40 text-[#25D366] mb-4 shadow-lg shadow-[#25D366]/10">
            <WhatsAppIcon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Authenticated
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Signed in with WhatsApp number <span className="text-[#25D366] font-mono font-bold">{session.user.phone}</span>
          </p>
        </div>

        <div className="p-4 bg-[#131A26] border border-slate-800 rounded-2xl space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">User ID</span>
            <span className="font-mono text-slate-200 truncate max-w-[220px]">{session.user.id}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Auth Method</span>
            <span className="text-[#25D366] font-mono font-semibold">Supabase WhatsApp OTP</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Status</span>
            <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Verified Session Active</span>
            </span>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>

        <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#25D366]"></span>
            <span>Supabase WhatsApp Channel</span>
          </div>
          <span className="font-mono text-slate-400">
            {config.isCustom ? 'Custom Supabase' : 'Sandbox Emulator'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[580px] bg-[#0F1622] border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl relative">
      
      {/* Top WhatsApp Icon */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[#142B1F] border border-[#25D366]/40 text-[#25D366] mb-4 shadow-lg shadow-[#25D366]/10">
          <WhatsAppIcon className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          WhatsApp OTP Login
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          {step === 'input'
            ? 'Sign in securely with one-time verification codes sent straight to your WhatsApp.'
            : `We sent a 6-digit WhatsApp code to ${targetIdentifier}`}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {/* STEP 1: Phone Input matching the screenshot */}
      {step === 'input' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendOtp();
          }}
          className="space-y-5"
        >
          {/* Label */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              <span>WHATSAPP PHONE NUMBER</span>
            </label>
            
            {/* Input Row */}
            <div className="flex gap-2.5">
              {/* Country select */}
              <div className="relative">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country Code"
                  className="h-13 bg-[#131A26] border border-slate-700/80 rounded-2xl text-sm font-semibold text-white px-3.5 pr-8 focus:outline-none focus:border-[#25D366] font-mono cursor-pointer appearance-none"
                >
                  <option value="+1">US +1 (US)</option>
                  <option value="+91">IN +91 (IN)</option>
                  <option value="+44">GB +44 (UK)</option>
                  <option value="+49">DE +49 (DE)</option>
                  <option value="+33">FR +33 (FR)</option>
                  <option value="+971">AE +971 (UAE)</option>
                  <option value="+62">ID +62 (ID)</option>
                  <option value="+55">BR +55 (BR)</option>
                  <option value="+81">JP +81 (JP)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              
              {/* Phone number field */}
              <div className="relative flex-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 019-2834"
                  autoFocus
                  className="w-full h-13 px-4 bg-[#131A26] border border-slate-700/80 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] font-mono transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Quick WhatsApp test numbers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Quick WhatsApp test numbers:</span>
              <span className="text-slate-500">1-click test</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickFillPreset('+91', '98765-43210')}
                className="py-2 px-2 rounded-xl bg-[#131A26] border border-slate-800 hover:border-[#25D366]/50 text-slate-300 text-xs font-mono transition-colors text-center truncate cursor-pointer"
              >
                IN +91 98765-43210
              </button>
              <button
                type="button"
                onClick={() => quickFillPreset('+1', '(555) 019-2834')}
                className="py-2 px-2 rounded-xl bg-[#131A26] border border-slate-800 hover:border-[#25D366]/50 text-slate-300 text-xs font-mono transition-colors text-center truncate cursor-pointer"
              >
                US +1 (555) 019-2834
              </button>
              <button
                type="button"
                onClick={() => quickFillPreset('+44', '7911-123456')}
                className="py-2 px-2 rounded-xl bg-[#131A26] border border-slate-800 hover:border-[#25D366]/50 text-slate-300 text-xs font-mono transition-colors text-center truncate cursor-pointer"
              >
                GB +44 7911-123456
              </button>
            </div>
          </div>

          {/* Big Green Send WhatsApp Code Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-4 px-6 bg-[#25D366] hover:bg-[#20bd5a] text-[#071E10] font-bold text-base rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-[#071E10]" />
                <span>Sending WhatsApp Code...</span>
              </>
            ) : (
              <>
                <WhatsAppIcon className="h-5 w-5 text-[#071E10]" />
                <span>Send WhatsApp Code</span>
                <ArrowRight className="h-5 w-5 text-[#071E10]" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: 6-Digit WhatsApp Code Verification */}
      {step === 'verify' && (
        <div className="space-y-5">
          {/* Simulated WhatsApp notification preview */}
          <div className="p-4 bg-[#142B1F] border border-[#25D366]/30 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#25D366] font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <WhatsAppIcon className="h-4 w-4" />
                <span>WhatsApp Notification</span>
              </span>
              {lastGeneratedCode && (
                <button
                  type="button"
                  onClick={fillSimulatedCode}
                  className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-[#25D366] rounded-lg hover:bg-[#20bd5a] transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Auto-Fill {lastGeneratedCode}</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-200 mt-1">
              Your Supabase WhatsApp verification passcode is{' '}
              <strong className="font-mono text-[#25D366] text-sm tracking-wider">{lastGeneratedCode || '••••••'}</strong>.
            </p>
          </div>

          {/* 6 Digit Input Cells */}
          <div>
            <div className="flex items-center justify-between mb-2 text-xs text-slate-300">
              <span className="font-semibold uppercase tracking-wider">Enter 6-Digit Code</span>
              <span className="font-mono text-[#25D366] flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{timer}s</span>
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:gap-3" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-full h-14 text-center text-2xl font-bold font-mono bg-[#131A26] border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 transition-all tabular-nums"
                />
              ))}
            </div>
          </div>

          {/* Verify CTA */}
          <button
            type="button"
            onClick={() => verifyCode()}
            disabled={loading || otp.join('').length !== 6}
            className="w-full py-4 px-6 bg-[#25D366] hover:bg-[#20bd5a] text-[#071E10] font-bold text-base rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-[#071E10]" />
                <span>Verifying WhatsApp OTP...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5 text-[#071E10]" />
                <span>Verify Code & Sign In</span>
              </>
            )}
          </button>

          {/* Change number / Resend */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('input');
                setError(null);
              }}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Change Number</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendOtp(true)}
              disabled={!canResend || loading}
              className={`font-semibold transition-colors flex items-center gap-1 ${
                canResend
                  ? 'text-[#25D366] hover:text-emerald-300 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Resend OTP {timer > 0 ? `(${timer}s)` : ''}</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer matching screenshot */}
      <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#25D366] animate-pulse"></span>
          <span>Supabase WhatsApp Channel</span>
        </div>
        <span className="font-mono text-emerald-400">
          Supabase Connected
        </span>
      </div>

    </div>
  );
};
