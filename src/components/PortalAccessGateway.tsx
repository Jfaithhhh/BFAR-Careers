import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Briefcase,
  Mail,
  Lock,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
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
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // BFAR Employee Form States
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empConfirmPassword, setEmpConfirmPassword] = useState('');
  const [empFullName, setEmpFullName] = useState('');
  const [empDivision, setEmpDivision] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empStatus, setEmpStatus] = useState<'Permanent' | 'Casual' | 'Contractual' | 'Job Order / COS'>('Permanent');

  // External Applicant Form States
  const [extIdentifier, setExtIdentifier] = useState('');
  const [extUsername, setExtUsername] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extPassword, setExtPassword] = useState('');
  const [extConfirmPassword, setExtConfirmPassword] = useState('');

  // OTP Verification Modal State
  const [otpModalData, setOtpModalData] = useState<{
    uid: string;
    email: string;
    username: string;
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

  const clearFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSelectOption = (option: SelectedOption) => {
    clearFeedback();
    setSelectedOption(option);
    if (option === 'admin') {
      onOpenAdminPortal();
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!isValidBfarEmail(empEmail)) {
      setErrorMsg(BFAR_DOMAIN_ERROR);
      return;
    }

    if (authMode === 'register') {
      if (!empFullName.trim() || !empDivision.trim() || !empPosition.trim()) {
        setErrorMsg('Please fill out your Full Name, Division/Office, and Current Position.');
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
        setSuccessMsg('BFAR Employee account registered. Redirecting to Promotion Hub...');
        onNavigateTab('internal');
      } else {
        const profile = await loginBfarEmployee(empEmail, empPassword);
        onPortalUserChange(profile);
        onNavigateTab('internal');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeGoogleSignIn = async () => {
    clearFeedback();
    try {
      setLoading(true);
      const profile = await signInBfarEmployeeWithGoogle({
        division: empDivision || undefined,
        currentPosition: empPosition || undefined,
        employmentStatus: empStatus,
      });
      onPortalUserChange(profile);
      onNavigateTab('internal');
    } catch (err: any) {
      setErrorMsg(err?.message || BFAR_DOMAIN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    try {
      setLoading(true);
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

        const pending = await registerExternalApplicant({
          username: extUsername,
          email: extEmail,
          password: extPassword,
        });

        setOtpCode('');
        setOtpError('');
        setResendCooldown(60);
        setOtpModalData(pending);
      } else {
        const { profile, requiresOtp } = await loginExternalApplicant(extIdentifier, extPassword);
        if (requiresOtp) {
          await sendExternalApplicantOtp(profile.uid, profile.email, profile.username || profile.email);
          setOtpCode('');
          setOtpError('');
          setResendCooldown(60);
          setOtpModalData({
            uid: profile.uid,
            email: profile.email,
            username: profile.username || profile.email,
          });
        } else {
          onPortalUserChange(profile);
          onNavigateTab('jobs');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to process applicant authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpModalData) return;
    setOtpError('');

    if (otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    try {
      setOtpLoading(true);
      const verifiedProfile = await verifyExternalApplicantOtp(otpModalData.uid, otpCode);
      setOtpModalData(null);
      onPortalUserChange(verifiedProfile);
      onNavigateTab('jobs');
    } catch (err: any) {
      setOtpError(err?.message || 'OTP verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpModalData || resendCooldown > 0) return;
    setOtpError('');
    try {
      setOtpLoading(true);
      await sendExternalApplicantOtp(otpModalData.uid, otpModalData.email, otpModalData.username);
      setResendCooldown(60);
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to resend OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  if (portalUser) {
    const isEmployee = portalUser.role === 'bfar_employee';
    return (
      <section className="mb-6 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="bg-[#0b2447] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isEmployee ? (
              <UserCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <Briefcase className="w-5 h-5 text-sky-400" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">{portalUser.fullName}</span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isEmployee
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                  }`}
                >
                  {isEmployee ? 'Verified BFAR Employee' : 'Verified External Applicant'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {portalUser.email}
                {isEmployee && portalUser.division ? ` • ${portalUser.division}` : ''}
                {isEmployee && portalUser.currentPosition ? ` (${portalUser.currentPosition})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEmployee ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('internal')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Open Promotion Hub
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('apply')}
                  className="bg-blue-800 hover:bg-blue-700 text-sky-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Internal Fast-Fill
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('jobs')}
                  className="bg-[#024794] hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Browse Plantilla Vacancies
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('track')}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Track Application
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onPortalSignOut}
              className="flex items-center gap-1 bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800/70 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="bg-gradient-to-r from-[#0b2447] via-[#024794] to-[#0b2447] px-5 py-4 text-white border-b border-blue-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-300">
              DA-BFAR Unified Portal Access
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              Select Your Portal Entry Point
            </h2>
          </div>
          <span className="text-[11px] text-sky-200">
            Role-Isolated Authentication • Civil Service Commission &amp; HRMPSB Compliant
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleSelectOption('bfar_employee')}
          className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
            selectedOption === 'bfar_employee'
              ? 'bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-400'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <UserCheck className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                @bfar.da.gov.ph
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">1. BFAR Employee</h3>
            <p className="text-xs text-slate-600 mt-1">
              For permanent, casual, and COS personnel accessing the Internal Recruitment &amp; Promotion Hub.
            </p>
          </div>
          <div className="mt-3 text-xs font-bold text-emerald-700 flex items-center gap-1">
            <span>Employee Sign In / Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectOption('external_applicant')}
          className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
            selectedOption === 'external_applicant'
              ? 'bg-white border-[#024794] shadow-sm ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-400'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-lg bg-blue-50 text-[#024794] border border-blue-200">
                <Briefcase className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-[#024794]">
                Gmail OTP Verified
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">2. External Applicant</h3>
            <p className="text-xs text-slate-600 mt-1">
              For public job applicants applying to open Plantilla vacancies and tracking application status.
            </p>
          </div>
          <div className="mt-3 text-xs font-bold text-[#024794] flex items-center gap-1">
            <span>Applicant Sign In / Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectOption('admin')}
          className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
            selectedOption === 'admin'
              ? 'bg-amber-50/60 border-amber-500 shadow-sm ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-400'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Restricted
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">3. Admin (HR &amp; HRMPSB Portal)</h3>
            <p className="text-xs text-slate-600 mt-1">
              Authorized HR Secretariat &amp; HRMPSB evaluators only. Requires Official Employee ID &amp; Security Passkey.
            </p>
          </div>
          <div className="mt-3 text-xs font-bold text-amber-800 flex items-center gap-1">
            <span>Proceed to Restricted HR Verification</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {selectedOption !== 'admin' && (
        <div className="p-5 sm:p-6 bg-white">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedOption === 'bfar_employee'
                    ? 'BFAR Employee Portal Authentication'
                    : 'External Applicant Portal Authentication'}
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedOption === 'bfar_employee'
                    ? 'Strictly requires an official @bfar.da.gov.ph email address.'
                    : 'Register with a unique username and verify your Gmail address via 6-digit OTP.'}
                </p>
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setAuthMode('login');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setAuthMode('register');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    authMode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {selectedOption === 'bfar_employee' && (
              <form onSubmit={handleEmployeeSubmit} className="space-y-3.5">
                {authMode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={empFullName}
                          onChange={(e) => setEmpFullName(e.target.value)}
                          placeholder="Juan Dela Cruz"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Division / Office *</label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={empDivision}
                          onChange={(e) => setEmpDivision(e.target.value)}
                          placeholder="e.g., Aquaculture Division"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Current Position *</label>
                      <input
                        type="text"
                        required
                        value={empPosition}
                        onChange={(e) => setEmpPosition(e.target.value)}
                        placeholder="e.g., Aquaculturist I"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Employment Status *</label>
                      <select
                        value={empStatus}
                        onChange={(e) => setEmpStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Casual">Casual</option>
                        <option value="Contractual">Contractual</option>
                        <option value="Job Order / COS">Job Order / Contract of Service (COS)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official BFAR Email Address (@bfar.da.gov.ph) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      placeholder="username@bfar.da.gov.ph"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className={`grid grid-cols-1 ${authMode === 'register' ? 'sm:grid-cols-2' : ''} gap-3`}>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={empConfirmPassword}
                          onChange={(e) => setEmpConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    {loading
                      ? 'Please wait...'
                      : authMode === 'login'
                      ? 'Sign In to BFAR Employee Portal'
                      : 'Register BFAR Employee Account'}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleEmployeeGoogleSignIn}
                    className="bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 border border-slate-300 text-xs font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Continue with BFAR Google (@bfar.da.gov.ph)</span>
                  </button>
                </div>
              </form>
            )}

            {selectedOption === 'external_applicant' && (
              <form onSubmit={handleExternalSubmit} className="space-y-3.5">
                {authMode === 'login' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address or Username *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={extIdentifier}
                          onChange={(e) => setExtIdentifier(e.target.value)}
                          placeholder="Enter your Gmail or registered username"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#024794]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={extPassword}
                          onChange={(e) => setExtPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#024794]"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Unique Username *</label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            required
                            value={extUsername}
                            onChange={(e) => setExtUsername(e.target.value)}
                            placeholder="e.g., applicant_juan"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#024794]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Gmail / Personal Email *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="email"
                            required
                            value={extEmail}
                            onChange={(e) => setExtEmail(e.target.value)}
                            placeholder="yourname@gmail.com"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#024794]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="password"
                            required
                            value={extPassword}
                            onChange={(e) => setExtPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#024794]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="password"
                            required
                            value={extConfirmPassword}
                            onChange={(e) => setExtConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#024794]"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#024794] hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  {loading
                    ? 'Processing...'
                    : authMode === 'login'
                    ? 'Sign In as External Applicant'
                    : 'Register & Send 6-Digit Gmail OTP'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {otpModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-[#0b2447] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm">Verify Your Email Address</h3>
              </div>
              <button
                type="button"
                onClick={() => setOtpModalData(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                We sent a 6-digit One-Time Password (OTP) to{' '}
                <strong className="text-slate-900">{otpModalData.email}</strong>. Enter the code below within{' '}
                <strong>5 minutes</strong> to activate your External Applicant account.
              </p>

              {otpError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">6-Digit Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl font-black py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#024794]"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otpCode.length !== 6}
                className="w-full bg-[#024794] hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {otpLoading ? 'Verifying...' : 'Verify OTP & Activate Account'}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || otpLoading}
                  onClick={handleResendOtp}
                  className="font-bold text-[#024794] hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};