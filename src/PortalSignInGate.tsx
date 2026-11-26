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
  const [empMode, setEmpMode] = useState<'login' | 'register'>('login');
  const [empFullName, setEmpFullName] = useState('');
  const [empDivision, setEmpDivision] = useState('Administrative and Finance Division');
  const [empIdOrEmail, setEmpIdOrEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empConfirmPassword, setEmpConfirmPassword] = useState('');

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

  const handleZeroStorageEmployeeIdLogin = () => {
    resetMessages();
    const cleaned = empIdOrEmail.trim().toUpperCase();
    if (!cleaned || cleaned.includes('@')) {
      setErrorMessage('Enter your Employee ID (e.g. COS4513) or sign in with your @bfar.da.gov.ph email.');
      return;
    }

    const fallbackProfile = {
      uid: `emp_${cleaned.toLowerCase()}`,
      email: `${cleaned.toLowerCase()}@bfar.da.gov.ph`,
      fullName: empFullName.trim() || `BFAR Personnel (${cleaned})`,
      role: 'bfar_employee',
      division: empDivision || 'BFAR Central Office',
      employeeId: cleaned,
      emailVerified: true,
    } as unknown as PortalUserProfile;

    onAuthenticatedUser(fallbackProfile);
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const rawInput = empIdOrEmail.trim();
    if (!rawInput.includes('@')) {
      handleZeroStorageEmployeeIdLogin();
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedEmail = rawInput.toLowerCase();
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
    <section className="bg-white border border-[#DCE2E8] rounded-sm overflow-hidden mb-6">
      <div className="bg-[#071A2F] text-white px-6 py-6 border-b border-[#0F3557] text-center">
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-[#C69214] bg-[#0F3557] border border-[#C69214]/40 px-2.5 py-0.5 rounded-sm mb-2">
          DA-BFAR Recruitment Portal &bull; Role-Based POV
        </span>

        <h2
          className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-white"
          style={{ fontFamily: "'Libre Baskerville', 'Cormorant Garamond', Georgia, serif" }}
        >
          PORTAL SIGN-IN
        </h2>
        <p className="text-xs text-[#DCE2E8] mt-1">
          Choose your role to enter with scoped permissions and isolated data access.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              resetMessages();
              onSelectOption('bfar_employee');
            }}
            className={`text-left p-4 rounded-sm border transition-colors cursor-pointer ${
              selectedOption === 'bfar_employee'
                ? 'border-[#0F3557] bg-[#FBF7EC] border-t-2 border-t-[#0F3557]'
                : 'border-[#DCE2E8] hover:border-[#0F3557]/50 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <UserCheck className="w-4 h-4 text-[#0F3557]" />
              <span className="text-sm font-bold text-[#0F172A]">1. BFAR Employee</span>
            </div>
            <p className="text-[11px] text-[#475569]">
              @bfar.da.gov.ph or Employee ID (COS4513) &bull; Internal Promotions
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              onSelectOption('external_applicant');
            }}
            className={`text-left p-4 rounded-sm border transition-colors cursor-pointer ${
              selectedOption === 'external_applicant'
                ? 'border-[#0D4F3C] bg-[#EBF5F1] border-t-2 border-t-[#0D4F3C]'
                : 'border-[#DCE2E8] hover:border-[#0D4F3C]/50 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <Building2 className="w-4 h-4 text-[#0D4F3C]" />
              <span className="text-sm font-bold text-[#0F172A]">2. External Applicant</span>
            </div>
            <p className="text-[11px] text-[#475569]">
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
            className={`text-left p-4 rounded-sm border transition-colors cursor-pointer ${
              selectedOption === 'hr_admin'
                ? 'border-[#C69214] bg-[#FBF7EC] border-t-2 border-t-[#C69214]'
                : 'border-[#DCE2E8] hover:border-[#C69214]/60 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#C69214]" />
              <span className="text-sm font-bold text-[#0F172A]">3. HR Admin (HRMPSB Portal)</span>
            </div>
            <p className="text-[11px] text-[#475569]">
              Restricted Staff Verification &amp; Selection Board
            </p>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-sm bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-sm bg-[#EBF5F1] border border-[#0D4F3C]/30 text-xs font-semibold text-[#0D4F3C]">
            {infoMessage}
          </div>
        )}

        {selectedOption === 'bfar_employee' && (
          <div className="border border-[#DCE2E8] rounded-sm p-5 bg-[#F6F7F9]/70">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">BFAR Employee Internal Portal</h3>
                <p className="text-xs text-[#475569]">
                  Sign in with <span className="font-semibold text-[#0F3557]">@bfar.da.gov.ph</span> or enter your Employee ID (e.g. <span className="font-mono font-bold text-[#0F172A]">COS4513</span>).
                </p>
              </div>
              <div className="inline-flex rounded-sm border border-[#DCE2E8] bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setEmpMode('login');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-sm cursor-pointer ${
                    empMode === 'login' ? 'bg-[#0F3557] text-white' : 'text-[#475569]'
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
                  className={`px-3 py-1 text-xs font-semibold rounded-sm cursor-pointer ${
                    empMode === 'register' ? 'bg-[#0F3557] text-white' : 'text-[#475569]'
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
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={empFullName}
                      onChange={(e) => setEmpFullName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full px-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      BFAR Office / Division *
                    </label>
                    <input
                      type="text"
                      required
                      value={empDivision}
                      onChange={(e) => setEmpDivision(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Official BFAR Email (@bfar.da.gov.ph) or Employee ID *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={empIdOrEmail}
                      onChange={(e) => setEmpIdOrEmail(e.target.value)}
                      placeholder="COS4513 or name@bfar.da.gov.ph"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Password {empIdOrEmail.includes('@') ? '*' : '(Optional for ID lookup)'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required={empIdOrEmail.includes('@')}
                      value={empPassword}
                      onChange={(e) => setEmpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                </div>
              </div>

              {empMode === 'register' && (
                <div className="max-w-md">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={empConfirmPassword}
                    onChange={(e) => setEmpConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {!empIdOrEmail.includes('@') && empIdOrEmail.trim() && (
                  <button
                    type="button"
                    onClick={handleZeroStorageEmployeeIdLogin}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#0D4F3C] hover:bg-[#071A2F] text-white text-xs font-bold cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-[#C69214]" />
                    Continue with ID ({empIdOrEmail.trim().toUpperCase()})
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#0F3557] hover:bg-[#071A2F] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#C69214]" />
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

        {selectedOption === 'external_applicant' && (
          <div className="border border-[#DCE2E8] rounded-sm p-5 bg-[#F6F7F9]/70">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">External Applicant Portal</h3>
                <p className="text-xs text-[#475569]">
                  Register with Username, Email, Password, Confirm Password, and 6-Digit Gmail OTP.
                </p>
              </div>
              <div className="inline-flex rounded-sm border border-[#DCE2E8] bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setExtMode('register');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-sm cursor-pointer ${
                    extMode === 'register' ? 'bg-[#0D4F3C] text-white' : 'text-[#475569]'
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
                  className={`px-3 py-1 text-xs font-semibold rounded-sm cursor-pointer ${
                    extMode === 'login' ? 'bg-[#0D4F3C] text-white' : 'text-[#475569]'
                  }`}
                >
                  Sign In
                </button>
              </div>
            </div>

            <form onSubmit={handleExternalSubmit} className="space-y-3.5">
              {extMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={extUsername}
                    onChange={(e) => setExtUsername(e.target.value)}
                    placeholder="applicant_username"
                    className="w-full px-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Email Address *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={extEmail}
                      onChange={(e) => {
                        setExtEmail(e.target.value);
                        setOtpVerified(false);
                      }}
                      placeholder="your.name@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                  {extMode === 'register' && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || !extEmail.trim()}
                      className="px-4 py-2 rounded-sm bg-[#071A2F] hover:bg-[#0F3557] text-white text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isSendingOtp ? 'Sending OTP...' : otpSent ? 'Resend 6-Digit OTP' : 'Send 6-Digit OTP'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={extPassword}
                      onChange={(e) => setExtPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                </div>

                {extMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={extConfirmPassword}
                      onChange={(e) => setExtConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                )}
              </div>

              {extMode === 'register' && (
                <div className="max-w-xs">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    6-Digit Gmail OTP Code *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full pl-9 pr-3 py-2 text-sm tracking-widest font-mono border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                  {devOtpPreview && (
                    <p className="text-[11px] text-[#C69214] mt-1 font-semibold">
                      Test OTP Code: <span className="font-mono font-bold text-[#0F172A]">{devOtpPreview}</span>
                    </p>
                  )}
                  {otpVerified && (
                    <p className="text-[11px] text-[#0D4F3C] mt-1 inline-flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> OTP Verified
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#0D4F3C] hover:bg-[#071A2F] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#C69214]" />
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