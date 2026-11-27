import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
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
import { lookupInternalEmployee } from './lib/firestoreService';

interface PortalSignInGateProps {
  selectedOption: ActivePortalPov;
  onSelectOption: (option: ActivePortalPov) => void;
  onAuthenticatedUser: (profile: PortalUserProfile) => void;
  onProceedToHrPortal: () => void;
}

type EmployeeEmailOption = 'bfar_email' | 'personal_gmail';

export const PortalSignInGate: React.FC<PortalSignInGateProps> = ({
  selectedOption,
  onSelectOption,
  onAuthenticatedUser,
  onProceedToHrPortal,
}) => {
  const [empMode, setEmpMode] = useState<'login' | 'register'>('login');
  const [empEmailOption, setEmpEmailOption] = useState<EmployeeEmailOption>('bfar_email');
  const [empFullName, setEmpFullName] = useState('');
  const [empDivision, setEmpDivision] = useState('');
  const [empIdOrEmail, setEmpIdOrEmail] = useState('');
  const [empGmail, setEmpGmail] = useState('');
  const [empOtpCode, setEmpOtpCode] = useState('');
  const [empOtpSent, setEmpOtpSent] = useState(false);
  const [empOtpVerified, setEmpOtpVerified] = useState(false);
  const [empDevOtpPreview, setEmpDevOtpPreview] = useState<string | null>(null);
  const [isSendingEmpOtp, setIsSendingEmpOtp] = useState(false);
  const [empPassword, setEmpPassword] = useState('');
  const [empConfirmPassword, setEmpConfirmPassword] = useState('');
  const [showEmpPassword, setShowEmpPassword] = useState(false);
  const [showEmpConfirmPassword, setShowEmpConfirmPassword] = useState(false);

  const [extMode, setExtMode] = useState<'register' | 'login'>('register');
  const [extUsername, setExtUsername] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extPassword, setExtPassword] = useState('');
  const [extConfirmPassword, setExtConfirmPassword] = useState('');
  const [showExtPassword, setShowExtPassword] = useState(false);
  const [showExtConfirmPassword, setShowExtConfirmPassword] = useState(false);
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

  const parseOtpResponse = (
    otpResult: unknown
  ): { previewCode: string | null; deliveredViaEmail: boolean } => {
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

    return { previewCode, deliveredViaEmail };
  };

  const handleSendEmployeeOtp = async () => {
    resetMessages();
    setIsSendingEmpOtp(true);
    try {
      const targetEmail =
        empEmailOption === 'bfar_email'
          ? empIdOrEmail.trim().toLowerCase()
          : empGmail.trim().toLowerCase();

      if (!targetEmail) {
        throw new Error(
          empEmailOption === 'bfar_email'
            ? 'Please enter your @bfar.da.gov.ph email address first.'
            : 'Please enter your Gmail address first.'
        );
      }

      if (empEmailOption === 'bfar_email' && !targetEmail.endsWith('@bfar.da.gov.ph')) {
        throw new Error('Option 1 requires an official @bfar.da.gov.ph email address.');
      }

      if (empEmailOption === 'personal_gmail' && !targetEmail.endsWith('@gmail.com')) {
        throw new Error('Option 2 requires a valid @gmail.com email address.');
      }

      if (!empPassword || empPassword.length < 6) {
        throw new Error('Please enter a password (at least 6 characters) before sending the OTP.');
      }

      const derivedUsername = empFullName.trim() || targetEmail.split('@')[0];
      const otpResult: unknown = await sendExternalApplicantOtp(
        targetEmail,
        derivedUsername,
        empPassword
      );
      const { previewCode, deliveredViaEmail } = parseOtpResponse(otpResult);

      setEmpOtpSent(true);
      setEmpOtpVerified(false);
      setEmpDevOtpPreview(previewCode);
      setInfoMessage(
        deliveredViaEmail
          ? `A 6-digit verification code was sent to ${targetEmail}.`
          : `6-digit OTP generated for ${targetEmail}.`
      );
    } catch (caughtError: unknown) {
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : 'Unable to send 6-digit OTP.'
      );
    } finally {
      setIsSendingEmpOtp(false);
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!empPassword.trim()) {
      setErrorMessage('Password is required for BFAR Employee access.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (empMode === 'register') {
        if (!empFullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (empPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (empPassword !== empConfirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (!/^\d{6}$/.test(empOtpCode.trim())) {
          throw new Error('Please enter the 6-digit OTP code sent for verification.');
        }

        const primaryEmail =
          empEmailOption === 'bfar_email'
            ? empIdOrEmail.trim().toLowerCase()
            : empGmail.trim().toLowerCase();

        if (!primaryEmail) {
          throw new Error('Please enter your email address.');
        }

        if (empEmailOption === 'bfar_email' && !primaryEmail.endsWith('@bfar.da.gov.ph')) {
          throw new Error('1st Option requires an official @bfar.da.gov.ph email address.');
        }

        if (empEmailOption === 'personal_gmail' && !primaryEmail.endsWith('@gmail.com')) {
          throw new Error('2nd Option requires a valid @gmail.com email address.');
        }

        if (empEmailOption === 'personal_gmail') {
          const employeeIdInput = empIdOrEmail.trim().toUpperCase();
          if (!employeeIdInput || employeeIdInput === '1234' || employeeIdInput.length < 3) {
            throw new Error(
              'Access denied: Please enter a valid, official DA-BFAR Employee ID when registering with Gmail.'
            );
          }
          const verifiedRecord = await lookupInternalEmployee(employeeIdInput);
          if (!verifiedRecord) {
            throw new Error(
              'Access denied: Employee ID not found in the official DA-BFAR employee directory.'
            );
          }
          if ((verifiedRecord as unknown as { status?: string }).status === 'Inactive') {
            throw new Error('Access denied: This BFAR Employee ID is inactive.');
          }
        }

       const registerPayload = {
      email: primaryEmail,
      password: empPassword,
      fullName: empFullName.trim(),
      division: empDivision.trim(),
      code: empOtpCode.trim(),
      } as unknown as Parameters<typeof registerBfarEmployee>[0];

        const profile = await registerBfarEmployee(registerPayload);

        setEmpOtpVerified(true);

        if (!profile.emailVerified) {
          setInfoMessage(
            `Account created for ${primaryEmail}. Complete verification before full portal entry.`
          );
          return;
        }

        onAuthenticatedUser(profile);
        return;
      }

      const rawInput = empIdOrEmail.trim();
      if (!rawInput) {
        setErrorMessage('Please enter a valid DA-BFAR Employee ID or email address.');
        return;
      }

      if (!rawInput.includes('@')) {
        const normalizedId = rawInput.toUpperCase();
        if (normalizedId === '1234' || normalizedId.length < 3) {
          throw new Error('Access denied: Please enter a valid, official DA-BFAR Employee ID.');
        }

        const verifiedRecord = await lookupInternalEmployee(normalizedId);
        if (!verifiedRecord) {
          throw new Error(
            'Access denied: Employee ID not found in the official DA-BFAR employee directory.'
          );
        }

        if ((verifiedRecord as unknown as { status?: string }).status === 'Inactive') {
          throw new Error('Access denied: This BFAR Employee ID is inactive.');
        }

        const verifiedEmail =
          verifiedRecord.email?.trim().toLowerCase() ||
          `${normalizedId.toLowerCase()}@bfar.da.gov.ph`;

        const profile = await loginBfarEmployee(verifiedEmail, empPassword);
        if (!profile.emailVerified) {
          throw new Error(
            'Access denied: Your account email is not yet verified. Please verify your email/OTP first.'
          );
        }

        onAuthenticatedUser({
          ...profile,
          fullName: verifiedRecord.fullName || profile.fullName,
          division: verifiedRecord.division || profile.division,
          role: 'bfar_employee',
        });
        return;
      }

      const normalizedEmail = rawInput.toLowerCase();
      const profile = await loginBfarEmployee(normalizedEmail, empPassword);
      if (!profile.emailVerified) {
        throw new Error(
          'Access denied: Your email is not yet verified. Please complete OTP or email verification first.'
        );
      }

      onAuthenticatedUser(profile);
    } catch (caughtError: unknown) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'BFAR Employee authentication failed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    resetMessages();
    setIsSendingOtp(true);
    try {
      const normalizedEmail = extEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error('Please enter your Gmail address first.');
      }
      if (!extPassword) {
        throw new Error('Please enter your password before sending the OTP.');
      }

      const derivedUsername = extUsername.trim() || normalizedEmail.split('@')[0];
      const otpResult: unknown = await sendExternalApplicantOtp(
        normalizedEmail,
        derivedUsername,
        extPassword
      );
      const { previewCode, deliveredViaEmail } = parseOtpResponse(otpResult);

      setOtpSent(true);
      setOtpVerified(false);
      setDevOtpPreview(previewCode);
      setInfoMessage(
        deliveredViaEmail
          ? `A 6-digit verification code was sent to ${normalizedEmail}.`
          : `6-digit OTP generated for ${normalizedEmail}.`
      );
    } catch (caughtError: unknown) {
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : 'Unable to send 6-digit OTP.'
      );
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
        const profile = extractPortalProfile(loginResult);
        if (!profile.emailVerified) {
          throw new Error('Please verify your Gmail OTP before signing in.');
        }
        onAuthenticatedUser(profile);
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

        const profile = extractPortalProfile(regResult);
        setOtpVerified(true);

        if (!profile.emailVerified) {
          setInfoMessage('Applicant account created. Complete OTP verification to activate access.');
          return;
        }

        onAuthenticatedUser(profile);
      }
    } catch (caughtError: unknown) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'External Applicant sign-up failed.'
      );
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
              1st Choice: @bfar.da.gov.ph &bull; 2nd Option: Personal Gmail
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
              Personal Gmail + 6-Digit OTP &bull; Public/External Openings
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
                  Primary option:{' '}
                  <span className="font-semibold text-[#0F3557]">@bfar.da.gov.ph</span>. Secondary
                  registration option:{' '}
                  <span className="font-semibold text-[#0D4F3C]">Personal Gmail</span> with OTP
                  verification.
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
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setEmpEmailOption('bfar_email');
                        setEmpOtpSent(false);
                        setEmpOtpVerified(false);
                      }}
                      className={`p-3 rounded-sm border text-left cursor-pointer ${
                        empEmailOption === 'bfar_email'
                          ? 'border-[#0F3557] bg-[#FBF7EC]'
                          : 'border-[#DCE2E8] bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#0F172A]">
                        1st Choice: Official @bfar.da.gov.ph Email
                      </div>
                      <div className="text-[11px] text-[#475569]">
                        Primary BFAR employee email with verification
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setEmpEmailOption('personal_gmail');
                        setEmpOtpSent(false);
                        setEmpOtpVerified(false);
                      }}
                      className={`p-3 rounded-sm border text-left cursor-pointer ${
                        empEmailOption === 'personal_gmail'
                          ? 'border-[#0D4F3C] bg-[#EBF5F1]'
                          : 'border-[#DCE2E8] bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#0F172A]">
                        2nd Option: Personal Gmail (@gmail.com)
                      </div>
                      <div className="text-[11px] text-[#475569]">
                        Use personal Gmail + Employee ID + 6-digit OTP
                      </div>
                    </button>
                  </div>

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
                        placeholder="Enter full name"
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
                        placeholder="Enter office or division"
                        className="w-full px-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                      />
                    </div>
                  </div>
                </>
              )}

              {empMode === 'register' && empEmailOption === 'personal_gmail' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Personal Gmail Address (@gmail.com) *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                        <input
                          type="email"
                          required
                          autoComplete="off"
                          value={empGmail}
                          onChange={(e) => {
                            setEmpGmail(e.target.value);
                            setEmpOtpVerified(false);
                          }}
                          placeholder="yourname@gmail.com"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendEmployeeOtp}
                        disabled={isSendingEmpOtp || !empGmail.trim()}
                        className="px-3.5 py-2 rounded-sm bg-[#071A2F] hover:bg-[#0F3557] text-white text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isSendingEmpOtp ? 'Sending...' : empOtpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Verified BFAR Employee ID *
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={empIdOrEmail}
                      onChange={(e) => setEmpIdOrEmail(e.target.value)}
                      placeholder="Enter official BFAR Employee ID"
                      className="w-full px-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      {empMode === 'register'
                        ? 'Official BFAR Email (@bfar.da.gov.ph) *'
                        : 'Official BFAR Email (@bfar.da.gov.ph) or Employee ID *'}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          autoComplete="off"
                          value={empIdOrEmail}
                          onChange={(e) => {
                            setEmpIdOrEmail(e.target.value);
                            setEmpOtpVerified(false);
                          }}
                          placeholder={
                            empMode === 'register'
                              ? 'name@bfar.da.gov.ph'
                              : 'Enter official Employee ID or email'
                          }
                          className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                        />
                      </div>
                      {empMode === 'register' && (
                        <button
                          type="button"
                          onClick={handleSendEmployeeOtp}
                          disabled={isSendingEmpOtp || !empIdOrEmail.trim()}
                          className="px-3.5 py-2 rounded-sm bg-[#071A2F] hover:bg-[#0F3557] text-white text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {isSendingEmpOtp ? 'Sending...' : empOtpSent ? 'Resend OTP' : 'Send OTP'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                      <input
                        type={showEmpPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-9 pr-10 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmpPassword((prev) => !prev)}
                        aria-label={showEmpPassword ? 'Hide password' : 'Show password'}
                        className="text-[#475569] hover:text-[#0F172A] absolute right-2.5 top-2.5 cursor-pointer"
                      >
                        {showEmpPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {empMode === 'register' && empEmailOption === 'personal_gmail' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                      <input
                        type={showEmpPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-9 pr-10 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmpPassword((prev) => !prev)}
                        aria-label={showEmpPassword ? 'Hide password' : 'Show password'}
                        className="text-[#475569] hover:text-[#0F172A] absolute right-2.5 top-2.5 cursor-pointer"
                      >
                        {showEmpPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                      <input
                        type={showEmpConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={empConfirmPassword}
                        onChange={(e) => setEmpConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-9 pr-10 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmpConfirmPassword((prev) => !prev)}
                        aria-label={
                          showEmpConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                        }
                        className="text-[#475569] hover:text-[#0F172A] absolute right-2.5 top-2.5 cursor-pointer"
                      >
                        {showEmpConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {empMode === 'register' && empEmailOption === 'bfar_email' && (
                <div className="max-w-md">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type={showEmpConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={empConfirmPassword}
                      onChange={(e) => setEmpConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-10 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmpConfirmPassword((prev) => !prev)}
                      aria-label={
                        showEmpConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                      }
                      className="text-[#475569] hover:text-[#0F172A] absolute right-2.5 top-2.5 cursor-pointer"
                    >
                      {showEmpConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {empMode === 'register' && (
                <div className="max-w-xs">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    6-Digit Verification OTP *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      value={empOtpCode}
                      onChange={(e) => setEmpOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full pl-9 pr-3 py-2 text-sm tracking-widest font-mono border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                  {empDevOtpPreview && (
                    <p className="text-[11px] text-[#C69214] mt-1 font-semibold">
                      Test OTP Code:{' '}
                      <span className="font-mono font-bold text-[#0F172A]">
                        {empDevOtpPreview}
                      </span>
                    </p>
                  )}
                  {empOtpVerified && (
                    <p className="text-[11px] text-[#0D4F3C] mt-1 inline-flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> OTP Verified
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#0F3557] hover:bg-[#071A2F] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#C69214]" />
                  {isSubmitting
                    ? 'Verifying...'
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
                  Register with your personal Gmail address, Username, Password, Confirm Password, and
                  6-Digit Gmail OTP.
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
                    autoComplete="off"
                    value={extUsername}
                    onChange={(e) => setExtUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-3 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Personal Gmail Address *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={extEmail}
                      onChange={(e) => {
                        setExtEmail(e.target.value);
                        setOtpVerified(false);
                      }}
                      placeholder="yourname@gmail.com"
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
                      {isSendingOtp
                        ? 'Sending OTP...'
                        : otpSent
                        ? 'Resend 6-Digit OTP'
                        : 'Send 6-Digit OTP'}
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
                      type={showExtPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={extPassword}
                      onChange={(e) => setExtPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-10 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowExtPassword((prev) => !prev)}
                      aria-label={showExtPassword ? 'Hide password' : 'Show password'}
                      className="text-[#475569] hover:text-[#0F172A] absolute right-2.5 top-2.5 cursor-pointer"
                    >
                      {showExtPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {extMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                      <input
                        type={showExtConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={extConfirmPassword}
                        onChange={(e) => setExtConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-9 pr-10 py-2 text-sm border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowExtConfirmPassword((prev) => !prev)}
                        aria-label={
                          showExtConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                        }
                        className="text-[#475569] hover:text-[#0F172A] absolute right-2.5 top-2.5 cursor-pointer"
                      >
                        {showExtConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
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
                      autoComplete="one-time-code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full pl-9 pr-3 py-2 text-sm tracking-widest font-mono border border-[#DCE2E8] rounded-sm bg-white text-[#0F172A]"
                    />
                  </div>
                  {devOtpPreview && (
                    <p className="text-[11px] text-[#C69214] mt-1 font-semibold">
                      Test OTP Code:{' '}
                      <span className="font-mono font-bold text-[#0F172A]">{devOtpPreview}</span>
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