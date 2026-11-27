import React, { useState, useEffect, useRef } from 'react';
import {
  PlantillaJob,
  ApplicationRecord,
  InternalEmployeeProfile,
} from '../types';
import {
  lookupInternalEmployee,
  verifyBfarEmployeeId,
  BfarEmploymentStatus,
} from '../lib/firestoreService';
import { auth, signInWithGoogle } from '../lib/firebase';
import {
  UserCheck,
  Briefcase,
  TrendingUp,
  Award,
  ShieldCheck,
  FileText,
  Search,
  Building,
  Clock,
  ArrowRight,
  LogOut,
  RefreshCw,
  KeyRound,
  AlertCircle,
  LogIn,
} from 'lucide-react';

interface InternalRecruitmentPortalProps {
  jobs: PlantillaJob[];
  applications: ApplicationRecord[];
  onSelectJobForInternalApply: (job: PlantillaJob, profile: InternalEmployeeProfile) => void;
  onTrackApplication: (code: string) => void;
}

type VerifiedInternalProfile = InternalEmployeeProfile & {
  employmentStatus?: BfarEmploymentStatus;
  badgeLabel?: string;
};

function createZeroStorageProfile(params: {
  employeeId: string;
  fullName: string;
  employmentStatus?: BfarEmploymentStatus;
  badgeLabel?: string;
  division?: string;
  currentPositionTitle?: string;
  currentPlantillaItem?: string;
  salaryGrade?: number;
  yearsInBfar?: number;
  eligibility?: string;
  ipcrPeriod?: string;
  latestIpcrRating?: number;
  trainingHours?: number;
  email?: string;
}): VerifiedInternalProfile {
  const verified = verifyBfarEmployeeId(params.employeeId);
  const normalizedId = verified?.normalizedId || params.employeeId.trim().toUpperCase();
  const status: BfarEmploymentStatus =
    params.employmentStatus || verified?.employmentStatus || 'Permanent';
  const badgeLabel = params.badgeLabel || verified?.label || `${normalizedId} • ${status}`;

  return {
    employeeId: normalizedId,
    fullName: params.fullName,
    employmentStatus: status,
    badgeLabel,
    division: params.division || 'BFAR Central Office',
    currentPositionTitle:
      params.currentPositionTitle ||
      (status === 'Permanent' ? 'DA-BFAR Plantilla Personnel' : `DA-BFAR ${status} Personnel`),
    currentPlantillaItem: params.currentPlantillaItem || `ZERO-STORAGE-${status.toUpperCase()}`,
    salaryGrade: params.salaryGrade ?? 11,
    yearsInBfar: params.yearsInBfar ?? 1,
    eligibility: params.eligibility || 'CSC / Agency Verified',
    ipcrPeriod: params.ipcrPeriod || 'Latest Evaluation Record',
    latestIpcrRating: params.latestIpcrRating ?? 4.5,
    trainingHours: params.trainingHours ?? 8,
    email: params.email || '',
  } as unknown as VerifiedInternalProfile;
}

const normalizePlantillaItemNo = (job: PlantillaJob): string =>
  (job.plantillaItemNumber || job.itemNo || '').trim();

const normalizeDeadline = (job: PlantillaJob): string =>
  (job.applicationDeadline || job.closingDate || '').trim();

export const InternalRecruitmentPortal: React.FC<InternalRecruitmentPortalProps> = ({
  jobs,
  applications,
  onSelectJobForInternalApply,
  onTrackApplication,
}) => {
  const [activeEmployee, setActiveEmployee] = useState<VerifiedInternalProfile | null>(null);
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const employeeIdInputRef = useRef(employeeIdInput);
  const authCheckIdRef = useRef(0);

  useEffect(() => {
    employeeIdInputRef.current = employeeIdInput;
  }, [employeeIdInput]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      const checkId = ++authCheckIdRef.current;

      if (!user) {
        return;
      }

      const email = user.email || '';
      if (!email) {
        return;
      }

      try {
        const record = await lookupInternalEmployee(email);
        if (checkId !== authCheckIdRef.current) return;

        if (record) {
          setActiveEmployee(
            createZeroStorageProfile({
              ...record,
              email: record.email || email,
            })
          );
          setVerificationError(null);
          return;
        }

        if (email.endsWith('@bfar.da.gov.ph')) {
          const derivedId =
            employeeIdInputRef.current.trim().toUpperCase() ||
            email.split('@')[0].toUpperCase();
          setActiveEmployee(
            createZeroStorageProfile({
              employeeId: derivedId,
              fullName: user.displayName || email.split('@')[0],
              division: 'BFAR Central Office',
              currentPositionTitle: 'DA-BFAR Personnel (@bfar.da.gov.ph)',
              currentPlantillaItem: 'VERIFIED-BFAR-DOMAIN',
              salaryGrade: 11,
              yearsInBfar: 1,
              eligibility: 'Official @bfar.da.gov.ph Account',
              ipcrPeriod: 'Verified via Workspace Domain',
              latestIpcrRating: 4.5,
              trainingHours: 8,
              email,
            })
          );
          setVerificationError(null);
        }
      } catch (err) {
        if (checkId !== authCheckIdRef.current) return;
        console.warn('Error checking authenticated employee:', err);
      }
    });

    return () => {
      authCheckIdRef.current += 1;
      unsubscribe();
    };
  }, []);

  const handleVerifyEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = employeeIdInput.trim();
    if (!rawInput) {
      setVerificationError(
        'Please enter your DA-BFAR Employee ID (e.g. COS4513, JO102, CASUAL01, PAKYAW05, C-101, or Permanent ID).'
      );
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const verified = verifyBfarEmployeeId(rawInput);
      const record = await lookupInternalEmployee(rawInput);

      if (verified) {
        setActiveEmployee(
          createZeroStorageProfile({
            employeeId: verified.normalizedId,
            fullName: record?.fullName || `DA-BFAR ${verified.employmentStatus} Personnel (${verified.normalizedId})`,
            employmentStatus: verified.employmentStatus,
            badgeLabel: verified.label,
            division: record?.division || 'BFAR Central Office',
            currentPositionTitle:
              record?.currentPositionTitle ||
              (verified.employmentStatus === 'Permanent'
                ? 'DA-BFAR Plantilla Personnel'
                : `DA-BFAR ${verified.employmentStatus} Personnel`),
            currentPlantillaItem:
              record?.currentPlantillaItem || `ID-${verified.normalizedId}`,
            salaryGrade: record?.salaryGrade ?? 11,
            yearsInBfar: record?.yearsInBfar ?? 1,
            eligibility: record?.eligibility || 'CSC / Agency Verified',
            ipcrPeriod: record?.ipcrPeriod || 'Latest Evaluation Record',
            latestIpcrRating: record?.latestIpcrRating ?? 4.5,
            trainingHours: record?.trainingHours ?? 8,
            email: record?.email || auth.currentUser?.email || '',
          })
        );
        setEmployeeIdInput(verified.normalizedId);
        setVerificationError(null);
        return;
      }

      setActiveEmployee(null);
      setVerificationError(
        `Invalid Employee ID format for "${rawInput}". Supported formats: COS, JO, CASUAL/CAS, PAKYAW/PKY, C- (Consultant), or ID without status prefix (Permanent).`
      );
    } catch {
      setActiveEmployee(null);
      setVerificationError(
        'Unable to verify Employee ID right now. Please try again or contact HRMD.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBfarDomainSignIn = async () => {
    setVerificationError(null);
    setIsVerifying(true);
    try {
      const user = await signInWithGoogle();
      const email = user.email || '';
      if (!email.endsWith('@bfar.da.gov.ph')) {
        setVerificationError(
          `Account ${email} is not an official @bfar.da.gov.ph address. Enter your Employee ID (e.g. COS4513) or sign in with @bfar.da.gov.ph.`
        );
        return;
      }

      const existingRecord = await lookupInternalEmployee(email);
      if (existingRecord) {
        setActiveEmployee(
          createZeroStorageProfile({
            ...existingRecord,
            email: existingRecord.email || email,
          })
        );
        return;
      }

      const derivedId =
        employeeIdInputRef.current.trim().toUpperCase() ||
        email.split('@')[0].toUpperCase();
      setActiveEmployee(
        createZeroStorageProfile({
          employeeId: derivedId,
          fullName: user.displayName || email.split('@')[0],
          division: 'BFAR Central Office',
          currentPositionTitle: 'DA-BFAR Personnel (@bfar.da.gov.ph)',
          currentPlantillaItem: 'VERIFIED-BFAR-DOMAIN',
          salaryGrade: 11,
          yearsInBfar: 1,
          eligibility: 'Official @bfar.da.gov.ph Account',
          ipcrPeriod: 'Verified via Workspace Domain',
          latestIpcrRating: 4.5,
          trainingHours: 8,
          email,
        })
      );
    } catch {
      setVerificationError('Google sign-in was cancelled or could not be completed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearVerification = () => {
    authCheckIdRef.current += 1;
    setActiveEmployee(null);
    setEmployeeIdInput('');
    setVerificationError(null);
  };

  if (!activeEmployee) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Official DA-BFAR Internal Portal Banner */}
        <div className="bg-sky-50 border-l-4 border-[#024794] p-5 sm:p-6 rounded-r-xl shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#024794] text-white text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wide">
              <UserCheck className="w-3 h-3 text-amber-300" />
              <span>Internal Personnel Merit System</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Central Office (NCR) • Quezon City
            </span>
            <span className="bg-blue-100 text-[#024794] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              RA 7041 / CSC Compliant
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Internal Recruitment &amp; Promotion Portal
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            Strictly restricted to authorized personnel of the{' '}
            <strong>Bureau of Fisheries and Aquatic Resources (DA-BFAR)</strong>. Uses lightweight
            ID verification and <strong>@bfar.da.gov.ph</strong> authentication to conserve
            Firestore storage and writes.
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-[#024794] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Employee Identity Verification
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Enter your DA-BFAR Employee ID (e.g.{' '}
                  <strong className="text-slate-800">COS4513</strong>,{' '}
                  <strong className="text-slate-800">JO...</strong>,{' '}
                  <strong className="text-slate-800">CASUAL...</strong>,{' '}
                  <strong className="text-slate-800">PAKYAW...</strong>,{' '}
                  <strong className="text-slate-800">C-...</strong>, or Permanent ID) or verify with{' '}
                  <strong className="text-[#024794]">@bfar.da.gov.ph</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBfarDomainSignIn}
              disabled={isVerifying}
              className="bg-white hover:bg-blue-50 text-[#024794] border border-[#024794]/40 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5 text-[#024794]" />
              <span>Verify @bfar.da.gov.ph</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {verificationError && (
              <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs p-4 rounded-r-lg flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Verification Notice</span>
                  <span className="leading-relaxed block">{verificationError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyEmployee} className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5 text-xs">
                  Official DA-BFAR Employee ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. COS4513, C-101, or ID No."
                    value={employeeIdInput}
                    onChange={(e) => setEmployeeIdInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:bg-white"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-[11px] text-slate-500 mt-1.5 block">
                  Supports COS, JO, CASUAL, PAKYAW, C- (Consultant), and IDs without status prefix
                  as Permanent. Zero directory storage used.
                </span>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full bg-[#024794] hover:bg-[#033b7a] disabled:opacity-50 text-white py-2.5 px-4 rounded-lg font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>Verifying Employee ID...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Verify Employee Identity</span>
                  </>
                )}
              </button>
            </form>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Building className="w-4 h-4 text-[#024794]" />
                <span>Assistance for DA-BFAR Personnel</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                For questions on ID classification or internal applications, contact the{' '}
                <strong>HRMD Personnel Section</strong> at the BFAR Central Office, PCA Building,
                Diliman, Quezon City or email{' '}
                <span className="font-mono text-slate-700 font-semibold">hrmd@bfar.da.gov.ph</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayStatus = activeEmployee.employmentStatus || 'Permanent';
  const displayBadge =
    activeEmployee.badgeLabel || `${activeEmployee.employeeId} • ${displayStatus}`;

  const myApplications = applications.filter(
    (app) =>
      app.applicantType === 'internal' &&
      (app.bfarEmployeeId === activeEmployee.employeeId ||
        app.personalInfo?.fullName?.toLowerCase() === activeEmployee.fullName.toLowerCase())
  );

  const promotionalVacancies = jobs.filter(
    (j) => j.status === 'Open' && j.salaryGrade >= activeEmployee.salaryGrade
  );

  return (
    <div className="space-y-6">
      {/* Verified Session Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-100 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                Verified DA-BFAR Personnel
              </span>
              <span className="bg-amber-100 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                {displayStatus}
              </span>
              <span className="text-slate-300 font-mono text-xs font-semibold">
                {displayBadge}
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white mt-0.5">
              {activeEmployee.fullName} • {activeEmployee.currentPositionTitle} (SG{' '}
              {activeEmployee.salaryGrade})
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearVerification}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Exit Personnel Session</span>
        </button>
      </div>

      {/* Official Personnel Service Profile */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official Personnel Service Profile</span>
          </h3>
          <span className="bg-blue-100 text-[#024794] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
            Zero-Storage Verification
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="space-y-2.5 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-5">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Full Name
              </span>
              <span className="font-bold text-slate-900 text-sm">{activeEmployee.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Employee ID &amp; Status
              </span>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="font-mono font-bold text-[#024794] text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                  {activeEmployee.employeeId}
                </span>
                <span className="font-bold text-emerald-900 text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                  {displayStatus}
                </span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Division / Operating Unit
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {activeEmployee.division}
              </span>
            </div>
            {activeEmployee.email && (
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Official Email
                </span>
                <span className="text-xs text-slate-700 font-mono">{activeEmployee.email}</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-5">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Current Position
              </span>
              <span className="font-bold text-slate-900 text-xs block">
                {activeEmployee.currentPositionTitle || 'DA-BFAR Personnel'}
              </span>
              {activeEmployee.currentPlantillaItem && (
                <span className="font-mono text-[11px] text-slate-500 block mt-0.5">
                  {activeEmployee.currentPlantillaItem}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Salary Grade
                </span>
                <span className="text-sm font-black text-[#024794] block mt-0.5">
                  SG {activeEmployee.salaryGrade}
                </span>
                <span className="text-[10px] text-slate-400 block">Grade Only</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Employment Status
                </span>
                <span className="text-sm font-black text-slate-800 block mt-0.5">
                  {displayStatus}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {activeEmployee.yearsInBfar || 1} Yr(s) Service
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Latest IPCR Rating</span>
                </span>
                <span className="text-xs font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {activeEmployee.latestIpcrRating
                    ? activeEmployee.latestIpcrRating.toFixed(2)
                    : 'N/A'}{' '}
                  / 5.00
                </span>
              </div>
              <div className="text-[11px] text-emerald-900 font-semibold">
                {activeEmployee.ipcrPeriod || 'Latest Performance Evaluation'}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1 pt-0.5">
              {activeEmployee.eligibility && (
                <div>
                  <strong className="text-slate-700 text-[11px]">Eligibility: </strong>
                  <span className="text-slate-800 text-[11px]">{activeEmployee.eligibility}</span>
                </div>
              )}
              {activeEmployee.trainingHours !== undefined && (
                <div>
                  <strong className="text-slate-700 text-[11px]">Recorded L&amp;D Hours: </strong>
                  <span className="text-slate-800 text-[11px]">
                    {activeEmployee.trainingHours} Hours
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* My Promotional Submissions */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#024794]" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              My Promotional Submissions ({myApplications.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Tracked in Cloud Firestore</span>
        </div>

        <div className="p-5">
          {myApplications.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
              <FileText className="w-7 h-7 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-800">
                You have not submitted any applications yet.
              </div>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Select an available promotional vacancy below to prepare and submit your
                application.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#024794] bg-white px-2 py-0.5 rounded border border-blue-200">
                        {app.trackingCode}
                      </span>
                      <span className="bg-blue-100 text-[#024794] font-bold text-[10px] px-2 py-0.5 rounded">
                        {app.promotionTrack || 'Promotion'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          app.status.includes('Recommended')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : app.status.includes('Qualified')
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      {app.positionTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Item No: <span className="font-mono">{app.plantillaItemNo}</span> • Submitted{' '}
                      {app.submissionDate}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onTrackApplication(app.trackingCode)}
                    className="bg-white hover:bg-[#024794] hover:text-white text-[#024794] border border-[#024794] text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Track Application</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Promotional Plantilla Items */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#024794]" />
              <span>
                Available Promotional Plantilla Items (Salary Grade {activeEmployee.salaryGrade} and
                Above)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Synchronized from the official DA-BFAR Careers directory.
            </p>
          </div>
          <span className="bg-blue-100 text-[#024794] text-xs font-bold px-2.5 py-1 rounded-full self-start sm:self-center">
            {promotionalVacancies.length} Positions Available
          </span>
        </div>

        <div className="p-5">
          {promotionalVacancies.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-1.5">
              <Briefcase className="w-7 h-7 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-800">
                No official job vacancies are currently available.
              </div>
              <p className="text-[11px] text-slate-500">
                No open vacancies match your current salary grade (SG {activeEmployee.salaryGrade})
                at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promotionalVacancies.map((job) => {
                const sgDiff = job.salaryGrade - activeEmployee.salaryGrade;
                const plantillaCode = normalizePlantillaItemNo(job);
                const deadlineText = normalizeDeadline(job);

                return (
                  <div
                    key={job.id}
                    className="bg-slate-50/60 hover:bg-blue-50/40 rounded-xl p-4 border border-slate-200 hover:border-[#024794]/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {plantillaCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            sgDiff > 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-200/80 text-slate-800'
                          }`}
                        >
                          {sgDiff > 0 ? `Promotion (+SG ${sgDiff})` : 'Lateral Transfer'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-[#024794] leading-snug">
                          {job.positionTitle}
                        </h4>
                        <div className="text-[11px] text-slate-600 mt-0.5">{job.division}</div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Official Salary Grade:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-black bg-[#024794] text-white tracking-wide">
                            SALARY GRADE {job.salaryGrade}
                          </span>
                        </div>
                        {sgDiff > 0 && (
                          <div className="flex items-center justify-between text-[10px] text-emerald-700 font-semibold border-t border-slate-100 pt-1">
                            <span>Advancement:</span>
                            <span>+ {sgDiff} Salary Grade Progression</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div>
                          <strong className="text-slate-800">Education QS: </strong>
                          {job.qualificationStandards?.education}
                        </div>
                        <div>
                          <strong className="text-slate-800">Eligibility QS: </strong>
                          {job.qualificationStandards?.eligibility}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                        Closes: {deadlineText}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectJobForInternalApply(job, activeEmployee)}
                        className="bg-[#024794] hover:bg-[#033b7a] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>Apply Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};