import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { PortalUserProfile } from './types';
import { ActivePortalPov } from './lib/portalSession';
import {
  loginBfarEmployee,
  loginExternalApplicant,
  registerBfarEmployee,
  registerExternalApplicant,
  sendExternalApplicantOtp,
} from './lib/portalAuthService';

interface PortalSignInGateProps {
  selectedOption: ActivePortalPov;
  onSelectOption: (option: ActivePortalPov) => void;
  onAuthenticatedUser: (profile: PortalUserProfile) => void;
  onProceedToHrPortal: () => void;
}

export const PortalSignInGate: React.FC<PortalSignInGateProps> = ({
  selectedOption,
  onSelectOption,
  onAuthenticatedUser,
  onProceedToHrPortal,
}) => {
  // BFAR Employee state
  const [empMode, setEmpMode] = useState<'login' | 'register'>('login');
  const [empFullName, setEmpFullName] = useState('');
  const [empDivision, setEmpDivision] = useState('Administrative and Finance Division');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empConfirmPassword, setEmpConfirmPassword] = useState('');

  // External Applicant state (Register with Username, Email, Password, Confirm Password + 6-Digit Gmail OTP)
  const [extMode, setExtMode] = useState<'register' | 'login'>('register');
  const [extUsername, setExtUsername] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extPassword, setExtPassword] = useState('');
  const [extConfirmPassword, setExtConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const extractPortalProfile = (authResult: unknown): PortalUserProfile => {
    if (authResult && typeof authResult === 'object' && 'profile' in authResult) {
      return (authResult as { profile: PortalUserProfile }).profile;
    }
    return authResult as PortalUserProfile;
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsSubmitting(true);
    try {
      const normalizedEmail = empEmail.trim().toLowerCase();
      if (empMode === 'login') {
        const profile = await loginBfarEmployee(normalizedEmail, empPassword);
        onAuthenticatedUser(profile);
      } else {
        if (!empFullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (empPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (empPassword !== empConfirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const profile = await registerBfarEmployee({
          email: normalizedEmail,
          password: empPassword,
          fullName: empFullName.trim(),
          division: empDivision,
        } as Parameters<typeof registerBfarEmployee>[0]);
        onAuthenticatedUser(profile);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'BFAR Employee authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    resetMessages();
    setIsSendingOtp(true);
    try {
      const normalizedEmail = extEmail.trim().toLowerCase();
      const fallbackUsername = extUsername.trim() || normalizedEmail.split('@')[0] || 'applicant';
      const fallbackPassword = extPassword || 'PortalApplicant123!';
      const otpResult: unknown = await sendExternalApplicantOtp(
        normalizedEmail,
        fallbackUsername,
        fallbackPassword
      );

      let previewCode: string | null = null;
      let deliveredViaEmail = false;

      if (typeof otpResult === 'string' && /^\d{6}$/.test(otpResult.trim())) {
        previewCode = otpResult.trim();
      } else if (otpResult && typeof otpResult === 'object') {
        const maybeObj = otpResult as { devOtpCode?: unknown; deliveredViaEmail?: unknown };
        if (typeof maybeObj.devOtpCode === 'string' && /^\d{6}$/.test(maybeObj.devOtpCode.trim())) {
          previewCode = maybeObj.devOtpCode.trim();
        }
        deliveredViaEmail = Boolean(maybeObj.deliveredViaEmail);
      }

      setOtpSent(true);
      setOtpVerified(false);
      setDevOtpPreview(previewCode);
      setInfoMessage(
        deliveredViaEmail
          ? `A 6-digit verification code was sent to ${normalizedEmail}.`
          : `6-digit OTP generated for ${normalizedEmail}.`
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to send 6-digit OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsSubmitting(true);
    try {
      const normalizedEmail = extEmail.trim().toLowerCase();
      if (extMode === 'login') {
        const loginResult: unknown = await loginExternalApplicant(normalizedEmail, extPassword);
        onAuthenticatedUser(extractPortalProfile(loginResult));
      } else {
        if (!extUsername.trim()) {
          throw new Error('Please enter a username.');
        }
        if (extPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (extPassword !== extConfirmPassword) {
          throw new Error('Password and Confirm Password must match.');
        }
        if (!/^\d{6}$/.test(otpCode.trim())) {
          throw new Error('Please enter the 6-digit Gmail OTP code.');
        }

        const fallbackUid =
          (typeof window !== 'undefined' &&
            (window as unknown as { __bfarOtpUid?: string }).__bfarOtpUid) ||
          `ext_${Date.now()}`;

        const regResult: unknown = await registerExternalApplicant({
          uid: fallbackUid,
          email: normalizedEmail,
          username: extUsername.trim(),
          password: extPassword,
          code: otpCode.trim(),
        } as Parameters<typeof registerExternalApplicant>[0]);

        setOtpVerified(true);
        onAuthenticatedUser(extractPortalProfile(regResult));
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'External Applicant sign-up failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Centered Front Page Header */}
      <div className="bg-[#002c60] text-white px-6 py-5 border-b border-[#01397a] text-center">
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full mb-2">
          DA-BFAR Recruitment Portal &bull; Role-Based POV
        </span>

        <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide uppercase">
          PORTAL SIGN-IN
        </h2>
        <p className="text-xs text-blue-100 mt-1">
          Choose your role to enter with scoped permissions and isolated data access.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {/* 3-Option Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              resetMessages();
              onSelectOption('bfar_employee');
            }}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              selectedOption === 'bfar_employee'
                ? 'border-[#024794] bg-blue-50/70 ring-2 ring-[#024794]/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <UserCheck className="w-4 h-4 text-[#024794]" />
              <span className="text-sm font-bold text-slate-900">1. BFAR Employee</span>
            </div>
            <p className="text-[11px] text-slate-600">
              @bfar.da.gov.ph &bull; Internal Promotions
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              onSelectOption('external_applicant');
            }}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              selectedOption === 'external_applicant'
                ? 'border-emerald-700 bg-emerald-50/70 ring-2 ring-emerald-700/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span className="text-sm font-bold text-slate-900">2. External Applicant</span>
            </div>
            <p className="text-[11px] text-slate-600">
              6-Digit Gmail OTP &bull; Public/External Openings
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              onSelectOption('hr_admin');
              onProceedToHrPortal();
            }}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              selectedOption === 'hr_admin'
                ? 'border-amber-700 bg-amber-50/70 ring-2 ring-amber-700/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-bold text-slate-900">3. HR Admin (HRMPSB Portal)</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Restricted Staff Verification &amp; Selection Board
            </p>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            {infoMessage}
          </div>
        )}

        {/* OPTION 1: BFAR EMPLOYEE */}
        {selectedOption === 'bfar_employee' && (
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/40">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">BFAR Employee Internal Portal</h3>
                <p className="text-xs text-slate-500">
                  Requires an official <span className="font-semibold">@bfar.da.gov.ph</span> email address.
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setEmpMode('login');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    empMode === 'login' ? 'bg-[#024794] text-white' : 'text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setEmpMode('register');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    empMode === 'register' ? 'bg-[#024794] text-white' : 'text-slate-600'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <form onSubmit={handleEmployeeSubmit} className="space-y-3.5">
              {empMode === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={empFullName}
                      onChange={(e) => setEmpFullName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      BFAR Office / Division *
                    </label>
                    <input
                      type="text"
                      required
                      value={empDivision}
                      onChange={(e) => setEmpDivision(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official BFAR Email (@bfar.da.gov.ph) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      placeholder="name@bfar.da.gov.ph"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={empPassword}
                      onChange={(e) => setEmpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {empMode === 'register' && (
                <div className="max-w-md">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={empConfirmPassword}
                    onChange={(e) => setEmpConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#024794] hover:bg-[#013670] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  {isSubmitting
                    ? 'Please wait...'
                    : empMode === 'login'
                    ? 'Sign In as BFAR Employee'
                    : 'Register BFAR Employee Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* OPTION 2: EXTERNAL APPLICANT */}
        {selectedOption === 'external_applicant' && (
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/40">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">External Applicant Portal</h3>
                <p className="text-xs text-slate-500">
                  Register with Username, Email, Password, Confirm Password, and 6-Digit Gmail OTP.
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setExtMode('register');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    extMode === 'register' ? 'bg-emerald-700 text-white' : 'text-slate-600'
                  }`}
                >
                  Register + OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setExtMode('login');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    extMode === 'login' ? 'bg-emerald-700 text-white' : 'text-slate-600'
                  }`}
                >
                  Sign In
                </button>
              </div>
            </div>

            <form onSubmit={handleExternalSubmit} className="space-y-3.5">
              {extMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={extUsername}
                    onChange={(e) => setExtUsername(e.target.value)}
                    placeholder="applicant_username"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={extEmail}
                      onChange={(e) => {
                        setExtEmail(e.target.value);
                        setOtpVerified(false);
                      }}
                      placeholder="your.name@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  {extMode === 'register' && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || !extEmail.trim()}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isSendingOtp ? 'Sending OTP...' : otpSent ? 'Resend 6-Digit OTP' : 'Send 6-Digit OTP'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={extPassword}
                      onChange={(e) => setExtPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                {extMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={extConfirmPassword}
                      onChange={(e) => setExtConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {extMode === 'register' && (
                <div className="max-w-xs">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6-Digit Gmail OTP Code *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full pl-9 pr-3 py-2 text-sm tracking-widest font-mono border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  {devOtpPreview && (
                    <p className="text-[11px] text-amber-700 mt-1 font-medium">
                      Test OTP Code: <span className="font-mono font-bold">{devOtpPreview}</span>
                    </p>
                  )}
                  {otpVerified && (
                    <p className="text-[11px] text-emerald-700 mt-1 inline-flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> OTP Verified
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting
                    ? 'Verifying...'
                    : extMode === 'register'
                    ? 'Verify OTP & Create Applicant Account'
                    : 'Sign In as External Applicant'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};