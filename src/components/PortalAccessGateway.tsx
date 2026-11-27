import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Briefcase,
  Mail,
  Lock,
  User,
  Building2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  LogOut,
  X,
} from 'lucide-react';
import { PortalUserProfile } from '../types';
import {
  BFAR_DOMAIN_ERROR,
  isValidBfarEmail,
  registerBfarEmployee,
  loginBfarEmployee,
  signInBfarEmployeeWithGoogle,
  registerExternalApplicant,
  loginExternalApplicant,
  verifyExternalApplicantOtp,
  sendExternalApplicantOtp,
} from '../lib/portalAuthService';

interface PortalAccessGatewayProps {
  portalUser: PortalUserProfile | null;
  onPortalUserChange: (user: PortalUserProfile | null) => void;
  onPortalSignOut: () => Promise<void>;
  onOpenAdminPortal: () => void;
  onNavigateTab: (tab: 'jobs' | 'apply' | 'internal' | 'track') => void;
}

type SelectedOption = 'bfar_employee' | 'external_applicant' | 'admin';
type EmployeeStatus = 'Permanent' | 'Casual' | 'Contractual' | 'Job Order / COS';

export const PortalAccessGateway: React.FC<PortalAccessGatewayProps> = ({
  portalUser,
  onPortalUserChange,
  onPortalSignOut,
  onOpenAdminPortal,
  onNavigateTab,
}) => {
  const [selectedOption, setSelectedOption] = useState<SelectedOption>('bfar_employee');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empConfirmPassword, setEmpConfirmPassword] = useState('');
  const [empFullName, setEmpFullName] = useState('');
  const [empDivision, setEmpDivision] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empStatus, setEmpStatus] = useState<EmployeeStatus>('Permanent');

  const [extIdentifier, setExtIdentifier] = useState('');
  const [extUsername, setExtUsername] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extPassword, setExtPassword] = useState('');
  const [extConfirmPassword, setExtConfirmPassword] = useState('');

  const [otpModalData, setOtpModalData] = useState<{
    uid: string;
    email: string;
    username: string;
    generatedCode?: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSelectOption = (option: SelectedOption) => {
    setErrorMsg('');
    setSelectedOption(option);
    if (option === 'admin') {
      onOpenAdminPortal();
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidBfarEmail(empEmail)) {
      setErrorMsg(BFAR_DOMAIN_ERROR);
      return;
    }

    if (authMode === 'register') {
      if (!empFullName.trim() || !empDivision.trim() || !empPosition.trim()) {
        setErrorMsg('Please fill out Full Name, Division/Office, and Current Position.');
        return;
      }
      if (empPassword.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (empPassword !== empConfirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    try {
      setLoading(true);
      if (authMode === 'register') {
        const profile = await registerBfarEmployee({
          email: empEmail,
          password: empPassword,
          fullName: empFullName,
          division: empDivision,
          currentPosition: empPosition,
          employmentStatus: empStatus,
        });
        onPortalUserChange(profile);
        onNavigateTab('jobs');
      } else {
        const profile = await loginBfarEmployee(empEmail, empPassword);
        onPortalUserChange(profile);
        onNavigateTab('jobs');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Sign in failed. Please check your credentials.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeGoogleSignIn = async () => {
    setErrorMsg('');
    try {
      setLoading(true);
      const profile = await signInBfarEmployeeWithGoogle({
        division: empDivision || undefined,
        currentPosition: empPosition || undefined,
        employmentStatus: empStatus,
      });
      onPortalUserChange(profile);
      onNavigateTab('jobs');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : BFAR_DOMAIN_ERROR;
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (authMode === 'register') {
      if (!extUsername.trim() || extUsername.trim().length < 3) {
        setErrorMsg('Username must be at least 3 characters.');
        return;
      }
      if (!extEmail.trim().includes('@')) {
        setErrorMsg('Please enter a valid Gmail or personal email address.');
        return;
      }
      if (extPassword.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (extPassword !== extConfirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    try {
      setLoading(true);
      if (authMode === 'register') {
        const pending = await registerExternalApplicant({
          username: extUsername,
          email: extEmail,
          password: extPassword,
        });

        setOtpCode('');
        setOtpError('');
        setResendCooldown(60);
        setOtpModalData({
          uid: pending.uid,
          email: pending.email,
          username: pending.username,
          generatedCode:
            typeof (pending as { code?: unknown }).code === 'string'
              ? String((pending as { code?: unknown }).code)
              : undefined,
        });
      } else {
        const { profile, requiresOtp } = await loginExternalApplicant(extIdentifier, extPassword);
        if (requiresOtp) {
          const nextCode = await sendExternalApplicantOtp(
            profile.uid,
            profile.email,
            profile.username || profile.email
          );
          setOtpCode('');
          setOtpError('');
          setResendCooldown(60);
          setOtpModalData({
            uid: profile.uid,
            email: profile.email,
            username: profile.username || profile.email,
            generatedCode: typeof nextCode === 'string' ? nextCode : undefined,
          });
        } else {
          onPortalUserChange(profile);
          onNavigateTab('jobs');
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to process applicant authentication.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpModalData) return;
    setOtpError('');

    if (otpCode.trim().length !== 6) {
      setOtpError('Enter the 6-digit verification code.');
      return;
    }

    try {
      setOtpLoading(true);
      const verifiedProfile = await verifyExternalApplicantOtp(otpModalData.uid, otpCode);
      setOtpModalData(null);
      onPortalUserChange(verifiedProfile);
      onNavigateTab('jobs');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OTP verification failed.';
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpModalData || resendCooldown > 0) return;
    setOtpError('');
    try {
      setOtpLoading(true);
      const nextCode = await sendExternalApplicantOtp(
        otpModalData.uid,
        otpModalData.email,
        otpModalData.username
      );
      setResendCooldown(60);
      setOtpModalData((prev) =>
        prev
          ? { ...prev, generatedCode: typeof nextCode === 'string' ? nextCode : prev.generatedCode }
          : prev
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend OTP.';
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  if (portalUser) {
    const isEmployee = portalUser.role === 'bfar_employee';
    return (
      <div className="mb-4 bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
              isEmployee
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-blue-100 text-[#024794] border-blue-200'
            }`}
          >
            {isEmployee ? 'BFAR Employee' : 'External Applicant'}
          </span>
          <span className="font-bold text-slate-800">{portalUser.fullName}</span>
          <span className="text-slate-500 hidden sm:inline">({portalUser.email})</span>
        </div>

        <button
          type="button"
          onClick={onPortalSignOut}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-10 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="bg-[#024794] px-6 py-4 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
            DA-BFAR Careers Portal
          </p>
          <h1 className="text-base font-black mt-0.5">
            {authMode === 'login' ? 'Portal Sign In' : 'Create Portal Account'}
          </h1>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 mb-5">
            <button
              type="button"
              onClick={() => handleSelectOption('bfar_employee')}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedOption === 'bfar_employee'
                  ? 'bg-white text-emerald-800 shadow-2xs ring-1 ring-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>BFAR Employee</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectOption('external_applicant')}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedOption === 'external_applicant'
                  ? 'bg-white text-[#024794] shadow-2xs ring-1 ring-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>External Applicant</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectOption('admin')}
              className="py-2 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 text-amber-950 hover:bg-amber-50 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>HR Admin</span>
            </button>
          </div>

          <div className="flex border-b border-slate-200 mb-4">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setAuthMode('login');
              }}
              className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                authMode === 'login'
                  ? 'border-[#024794] text-[#024794]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setAuthMode('register');
              }}
              className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                authMode === 'register'
                  ? 'border-[#024794] text-[#024794]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {selectedOption === 'bfar_employee' && (
            <form onSubmit={handleEmployeeSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={empFullName}
                        onChange={(e) => setEmpFullName(e.target.value)}
                        placeholder="Juan Dela Cruz"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Division / Office
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={empDivision}
                          onChange={(e) => setEmpDivision(e.target.value)}
                          placeholder="Aquaculture Div."
                          className="w-full pl-8 pr-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Current Position
                      </label>
                      <input
                        type="text"
                        required
                        value={empPosition}
                        onChange={(e) => setEmpPosition(e.target.value)}
                        placeholder="Aquaculturist I"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Employment Status
                    </label>
                    <select
                      value={empStatus}
                      onChange={(e) => setEmpStatus(e.target.value as EmployeeStatus)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white cursor-pointer"
                    >
                      <option value="Permanent">Permanent</option>
                      <option value="Casual">Casual</option>
                      <option value="Contractual">Contractual</option>
                      <option value="Job Order / COS">Job Order / COS</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Official Email (@bfar.da.gov.ph)
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="name@bfar.da.gov.ph"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={empConfirmPassword}
                      onChange={(e) => setEmpConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {loading
                  ? 'Please wait...'
                  : authMode === 'login'
                  ? 'Sign In & View Vacancies'
                  : 'Sign Up & View Vacancies'}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleEmployeeGoogleSignIn}
                className="w-full bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 border border-slate-300 text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer"
              >
                Continue with BFAR Google
              </button>
            </form>
          )}

          {selectedOption === 'external_applicant' && (
            <form onSubmit={handleExternalSubmit} className="space-y-3">
              {authMode === 'login' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Gmail or Username
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={extIdentifier}
                        onChange={(e) => setExtIdentifier(e.target.value)}
                        placeholder="you@gmail.com or username"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={extPassword}
                        onChange={(e) => setExtPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={extUsername}
                        onChange={(e) => setExtUsername(e.target.value)}
                        placeholder="unique_username"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Gmail Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={extEmail}
                        onChange={(e) => setExtEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={extPassword}
                          onChange={(e) => setExtPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Confirm
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={extConfirmPassword}
                          onChange={(e) => setExtConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#024794] hover:bg-[#033b7a] disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {loading
                  ? 'Processing...'
                  : authMode === 'login'
                  ? 'Sign In & View Vacancies'
                  : 'Sign Up & Generate 6-Digit OTP'}
              </button>
            </form>
          )}
        </div>
      </div>

      {otpModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-[#024794] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-xs">6-Digit Account Verification</h3>
              </div>
              <button
                type="button"
                onClick={() => setOtpModalData(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Verification code for <strong>{otpModalData.email}</strong> (expires in 5 mins). The
                portal does not access applicant Gmail accounts.
              </p>

              {otpModalData.generatedCode && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center justify-between">
                  <span>Verification Code:</span>
                  <strong className="font-mono text-sm tracking-widest">
                    {otpModalData.generatedCode}
                  </strong>
                </div>
              )}

              {otpError && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {otpError}
                </div>
              )}

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center tracking-[0.45em] font-mono text-lg font-black py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
              />

              <button
                type="submit"
                disabled={otpLoading || otpCode.length !== 6}
                className="w-full bg-[#024794] hover:bg-[#033b7a] disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-lg shadow-xs cursor-pointer"
              >
                {otpLoading ? 'Verifying...' : 'Verify & Continue to Vacancies'}
              </button>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-500">Need a new code?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || otpLoading}
                  onClick={handleResendOtp}
                  className="font-bold text-[#024794] hover:underline disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; 