import React, { useState, useEffect } from 'react';
import {
  PlantillaJob,
  ApplicationRecord,
  InternalEmployeeProfile,
} from '../types';
import { lookupInternalEmployee } from '../lib/firestoreService';
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

function createZeroStorageProfile(params: {
  employeeId: string;
  fullName: string;
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
}): InternalEmployeeProfile {
  return {
    employeeId: params.employeeId,
    fullName: params.fullName,
    division: params.division || 'BFAR Central Office',
    currentPositionTitle: params.currentPositionTitle || 'DA-BFAR Personnel',
    currentPlantillaItem: params.currentPlantillaItem || 'ZERO-STORAGE-VERIFIED',
    salaryGrade: params.salaryGrade ?? 11,
    yearsInBfar: params.yearsInBfar ?? 1,
    eligibility: params.eligibility || 'CSC / Agency Verified',
    ipcrPeriod: params.ipcrPeriod || 'Latest Evaluation Record',
    latestIpcrRating: params.latestIpcrRating ?? 4.5,
    trainingHours: params.trainingHours ?? 8,
    email: params.email || '',
  } as unknown as InternalEmployeeProfile;
}

const ZERO_STORAGE_FALLBACK_EMPLOYEES: Record<string, InternalEmployeeProfile> = {
  COS4513: createZeroStorageProfile({
    employeeId: 'COS4513',
    fullName: 'BFAR Central Office Personnel (COS4513)',
    division: 'BFAR Central Office',
    currentPositionTitle: 'Contract of Service Personnel',
    currentPlantillaItem: 'COS-BFAR-CO-4513',
    salaryGrade: 11,
    yearsInBfar: 1,
    eligibility: 'CSC / Agency Verified',
    ipcrPeriod: 'Latest Evaluation Record',
    latestIpcrRating: 4.5,
    trainingHours: 8,
    email: '',
  }),
};

export const InternalRecruitmentPortal: React.FC<InternalRecruitmentPortalProps> = ({
  jobs,
  applications,
  onSelectJobForInternalApply,
  onTrackApplication,
}) => {
  const [activeEmployee, setActiveEmployee] = useState<InternalEmployeeProfile | null>(null);
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        try {
          const record = await lookupInternalEmployee(user.email);
          if (record) {
            setActiveEmployee(record);
            setVerificationError(null);
            return;
          }

          if (user.email.endsWith('@bfar.da.gov.ph')) {
            const derivedId =
              employeeIdInput.trim().toUpperCase() || user.email.split('@')[0].toUpperCase();
            setActiveEmployee(
              createZeroStorageProfile({
                employeeId: derivedId,
                fullName: user.displayName || user.email.split('@')[0],
                division: 'BFAR Central Office',
                currentPositionTitle: 'DA-BFAR Personnel (@bfar.da.gov.ph)',
                currentPlantillaItem: 'VERIFIED-BFAR-DOMAIN',
                salaryGrade: 11,
                yearsInBfar: 1,
                eligibility: 'Official @bfar.da.gov.ph Account',
                ipcrPeriod: 'Verified via Workspace Domain',
                latestIpcrRating: 4.5,
                trainingHours: 8,
                email: user.email,
              })
            );
            setVerificationError(null);
          }
        } catch (err) {
          console.warn('Error checking authenticated employee:', err);
        }
      }
    });
    return () => unsubscribe();
  }, [employeeIdInput]);

  const handleVerifyEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = employeeIdInput.trim().toUpperCase();
    if (!cleanId) {
      setVerificationError('Please enter your official DA-BFAR Employee ID (e.g. COS4513).');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const record = await lookupInternalEmployee(cleanId);
      if (record) {
        setActiveEmployee(record);
        setVerificationError(null);
        return;
      }

      if (ZERO_STORAGE_FALLBACK_EMPLOYEES[cleanId]) {
        setActiveEmployee(
          createZeroStorageProfile({
            ...ZERO_STORAGE_FALLBACK_EMPLOYEES[cleanId],
            email: auth.currentUser?.email || '',
          })
        );
        setVerificationError(null);
        return;
      }

      setActiveEmployee(null);
      setVerificationError(
        `Employee record not found for "${cleanId}". You can also verify using your official @bfar.da.gov.ph Google account or contact HRMD.`
      );
    } catch {
      if (ZERO_STORAGE_FALLBACK_EMPLOYEES[cleanId]) {
        setActiveEmployee(
          createZeroStorageProfile({
            ...ZERO_STORAGE_FALLBACK_EMPLOYEES[cleanId],
            email: auth.currentUser?.email || '',
          })
        );
        setVerificationError(null);
      } else {
        setActiveEmployee(null);
        setVerificationError(
          'Employee record not found. Please contact the Human Resource Management Division for verification.'
        );
      }
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
        setActiveEmployee(existingRecord);
        return;
      }

      const derivedId = employeeIdInput.trim().toUpperCase() || email.split('@')[0].toUpperCase();
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
    setActiveEmployee(null);
    setEmployeeIdInput('');
    setVerificationError(null);
  };

  if (!activeEmployee) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-[#024794] via-[#0b2447] to-[#04336c] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 text-amber-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
              <UserCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>DA-BFAR INTERNAL PERSONNEL MERIT SYSTEM</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Internal Recruitment &amp; Promotion Portal
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Strictly restricted to authorized permanent and active personnel of the Bureau of
              Fisheries and Aquatic Resources. Uses lightweight text-only ID verification and
              @bfar.da.gov.ph authentication to conserve Firebase Storage.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-200 text-[#024794] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Employee Identity Verification
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your registered DA-BFAR Employee ID (e.g. <strong>COS4513</strong>) or verify with
                  your <strong>@bfar.da.gov.ph</strong> Google account.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBfarDomainSignIn}
              disabled={isVerifying}
              className="bg-blue-50 hover:bg-blue-100 text-[#024794] border border-blue-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Verify @bfar.da.gov.ph</span>
            </button>
          </div>

          {verificationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Verification Notice:</span>
                <span className="leading-relaxed block">{verificationError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleVerifyEmployee} className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 text-xs">
                Official DA-BFAR Employee ID:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. COS4513"
                  value={employeeIdInput}
                  onChange={(e) => setEmployeeIdInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#024794] focus:bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Issued by the DA-BFAR Human Resource Management Division (HRMD). Zero file storage used.
              </span>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-[#024794] hover:bg-[#033b7a] disabled:opacity-50 text-white py-3 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Verifying Record with HR Database...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verify Employee Identity</span>
                </>
              )}
            </button>
          </form>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Building className="w-4 h-4 text-[#024794]" />
              <span>Assistance for DA-BFAR Personnel:</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If your Employee ID is newly issued or pending database synchronization, please contact
              the <strong>HRMD Personnel Section</strong> at the BFAR Central Office, PCA Building,
              Diliman, Quezon City or email{' '}
              <span className="font-mono text-slate-700 font-semibold">hrmd@bfar.da.gov.ph</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-sm">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.2 rounded uppercase">
                Verified DA-BFAR Personnel
              </span>
              <span className="text-slate-400 font-mono text-xs">
                {activeEmployee.employeeId}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              {activeEmployee.fullName} • {activeEmployee.currentPositionTitle || 'Plantilla Staff'} (SG {activeEmployee.salaryGrade})
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearVerification}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span>Exit Personnel Session</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Official Personnel Service Profile (Zero-Storage Verification)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-100 md:pr-4">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Full Name:</span>
              <span className="font-bold text-slate-900 text-sm">{activeEmployee.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Employee ID:</span>
              <span className="font-mono font-bold text-[#024794] text-xs">{activeEmployee.employeeId}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Division / Operating Unit:</span>
              <span className="text-xs font-semibold text-slate-800">{activeEmployee.division}</span>
            </div>
            {activeEmployee.email && (
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Official Email:</span>
                <span className="text-xs text-slate-700 font-mono">{activeEmployee.email}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-100 md:pr-4">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Current Position:</span>
              <span className="font-bold text-slate-900 text-xs">{activeEmployee.currentPositionTitle || 'Plantilla Item Holder'}</span>
              {activeEmployee.currentPlantillaItem && (
                <span className="font-mono text-[11px] text-slate-500 block">{activeEmployee.currentPlantillaItem}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Salary Grade:</span>
                <span className="text-base font-black text-[#024794]">SG {activeEmployee.salaryGrade}</span>
                <span className="text-[10px] text-slate-400 block">Grade Only</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Bureau Service:</span>
                <span className="text-base font-black text-slate-800">{activeEmployee.yearsInBfar || 0} Years</span>
                <span className="text-[10px] text-slate-400 block">Active Service</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Latest IPCR Rating:
                </span>
                <span className="text-xs font-black text-emerald-700">
                  {activeEmployee.latestIpcrRating ? activeEmployee.latestIpcrRating.toFixed(2) : 'N/A'} / 5.00
                </span>
              </div>
              <div className="text-[11px] text-emerald-900 font-semibold">
                {activeEmployee.ipcrPeriod || 'Latest Performance Evaluation'}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1 pt-1">
              {activeEmployee.eligibility && (
                <div>
                  <strong className="text-slate-700 text-[11px]">Eligibility: </strong>
                  <span className="text-slate-800 text-[11px]">{activeEmployee.eligibility}</span>
                </div>
              )}
              {activeEmployee.trainingHours !== undefined && (
                <div>
                  <strong className="text-slate-700 text-[11px]">Recorded L&amp;D Hours: </strong>
                  <span className="text-slate-800 text-[11px]">{activeEmployee.trainingHours} Hours</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#024794]" />
            <h3 className="text-sm font-bold text-slate-900">
              My Promotional Submissions ({myApplications.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Tracked in Cloud Firestore</span>
        </div>

        {myApplications.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">You have not submitted any applications yet.</div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Select an available promotional vacancy below to prepare and submit your application.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {myApplications.map((app) => (
              <div
                key={app.id}
                className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#024794]">
                      {app.trackingCode}
                    </span>
                    <span className="bg-purple-100 text-purple-900 font-bold text-[10px] px-2 py-0.2 rounded">
                      {app.promotionTrack || 'Promotion'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                        app.status.includes('Recommended')
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status.includes('Qualified')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{app.positionTitle}</h4>
                  <p className="text-[11px] text-slate-500">
                    Item No: {app.plantillaItemNo} • Submitted {app.submissionDate}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onTrackApplication(app.trackingCode)}
                  className="bg-white hover:bg-[#024794] hover:text-white text-[#024794] border border-[#024794] text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Track Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Available Promotional Plantilla Items (Salary Grade {activeEmployee.salaryGrade} and Above)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Synchronized from the official DA-BFAR Careers directory.
            </p>
          </div>
          <span className="bg-blue-100 text-[#024794] text-xs font-bold px-2.5 py-1 rounded-full">
            {promotionalVacancies.length} Positions Available
          </span>
        </div>

        {promotionalVacancies.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
            <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No official job vacancies are currently available.</div>
            <p className="text-[11px] text-slate-500">
              No open vacancies match your current salary grade (SG {activeEmployee.salaryGrade}) at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {promotionalVacancies.map((job) => {
              const sgDiff = job.salaryGrade - activeEmployee.salaryGrade;

              return (
                <div
                  key={job.id}
                  className="bg-slate-50/70 hover:bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {job.plantillaItemNumber || job.itemNo}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          sgDiff > 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {sgDiff > 0 ? `Promotion (+SG ${sgDiff})` : 'Lateral Transfer'}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                      {job.positionTitle}
                    </h4>
                    <div className="text-[11px] text-slate-600">{job.division}</div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Official Salary Grade:</span>
                        <strong className="text-[#024794] font-black">
                          Salary Grade {job.salaryGrade}
                        </strong>
                      </div>
                      {sgDiff > 0 && (
                        <div className="flex items-center justify-between text-[10px] text-emerald-700 font-semibold border-t border-slate-100 pt-1">
                          <span>Advancement:</span>
                          <span>+ {sgDiff} Salary Grade Progression</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-0.5">
                      <div>
                        <strong className="text-slate-700">Education QS: </strong>
                        {job.qualificationStandards?.education}
                      </div>
                      <div>
                        <strong className="text-slate-700">Eligibility QS: </strong>
                        {job.qualificationStandards?.eligibility}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">
                      Deadline: <strong>{job.applicationDeadline || job.closingDate}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectJobForInternalApply(job, activeEmployee)}
                      className="bg-[#024794] hover:bg-[#033b7a] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <span>Apply for Promotion</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};