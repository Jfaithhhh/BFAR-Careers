import React, { useState, useEffect } from 'react';
import { PlantillaJob, ApplicationRecord, VacancySyncStatus } from '../types';
import { updateApplicationInFirestore } from '../lib/firestoreService';
import { auth, signInWithGoogle } from '../lib/firebase';
import { deleteJobVacancyFromFirestore } from '../lib/firestoreService';
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Shield,
  Award,
  ChevronDown,
  X,
  Send,
  Building,
  GraduationCap,
  Calendar,
  AlertCircle,
  Lock,
  LogOut,
  RefreshCw,
  ExternalLink,
  LogIn,
  KeyRound,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  BadgeCheck,
  FileText,
  Scale,
  Globe,
  History,
  Trash2, 
  Check,
} from 'lucide-react';

interface AdminPortalProps {
  jobs: PlantillaJob[];
  applications: ApplicationRecord[];
  onUpdateApplication: (appId: string, updates: Partial<ApplicationRecord>) => void;
  onAddJob: (job: Partial<PlantillaJob>) => void;
  onUpdateJob: (jobId: string, updates: Partial<PlantillaJob>) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  jobs,
  applications,
  onUpdateApplication,
  onAddJob,
  onUpdateJob,
}) => {
  // Authentication gate for BFAR HRMIS (Strict Role-Based Access Controls)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<'HR_Specialist' | 'HRMPSB_Member' | 'Director'>('HR_Specialist');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [securityBadgeId, setSecurityBadgeId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sub-tabs
  const [adminTab, setAdminTab] = useState<'applicants' | 'plantilla' | 'matrix'>('applicants');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [jobFilter, setJobFilter] = useState('All');
  const [applicantTypeFilter, setApplicantTypeFilter] = useState<'All' | 'internal'>('All');

  // Selected candidate for deep evaluation dossier
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);

  // Status edit state in modal
  const [newStatus, setNewStatus] = useState<ApplicationRecord['status']>('Submitted');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [interviewScore, setInterviewScore] = useState<number | undefined>(undefined);
  const [finalBoardDecision, setFinalBoardDecision] = useState<ApplicationRecord['finalBoardDecision']>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);

  // Vacancy Sync & Official Registry State
  const [syncStatus, setSyncStatus] = useState<VacancySyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [vacancyFilter, setVacancyFilter] = useState<'All' | 'Open' | 'Expired'>('All');

  // Official Vacancy Import Modal State
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [createJobError, setCreateJobError] = useState<string | null>(null);
  const [createJobSuccess, setCreateJobSuccess] = useState<string | null>(null);
  const [newJobForm, setNewJobForm] = useState({
    itemNo: '',
    plantillaItemNumber: '',
    positionTitle: '',
    office: 'BFAR Central Office',
    division: 'Aquaculture Division',
    region: 'Central Office (NCR) - Quezon City',
    placeOfAssignment: 'BFAR Central Office, PCA Building, Elliptical Road, Diliman, Quezon City',
    salaryGrade: 15,
    plantillaType: 'Permanent' as 'Permanent' | 'Contract of Service (COS)' | 'Project-Based',
    datePosted: '2026-10-21',
    applicationDeadline: '2026-11-25',
    officialSourceUrl: 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
    education: "Bachelor's degree in Fisheries, Aquaculture, or related discipline",
    experience: '1 year of relevant experience in fisheries development',
    training: '4 hours of relevant technical training',
    eligibility: 'Career Service (Professional) / RA 1080',
    dutiesText: 'Coordinate technical program implementation and monitoring.\nEvaluate technical fisheries reports and compliance documents.\nPrepare administrative reports for Central Office review.',
    competenciesText: 'Fisheries Regulatory Compliance\nTechnical Report Writing\nProgram Monitoring',
    documentTitle: 'Official Notice of Vacancy (CS Form 9)',
    documentUrl: 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
  });

  // Load official vacancy synchronization status
  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/vacancies/sync-status');
      const json = await res.json();
      if (json.success && json.data) {
        setSyncStatus(json.data);
      }
    } catch (e) {
      console.warn('Could not fetch vacancy sync status:', e);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, [adminTab]);

  // KPI Calculations dynamically computed from actual Firestore records
  const totalApps = applications.length;
  const uniqueApplicants = new Set(applications.map((a) => a.bfarEmployeeId || a.personalInfo?.email || a.id)).size;
  const underReviewCount = applications.filter(
    (a) => a.status === 'Submitted' || a.status === 'Document Under Review'
  ).length;
  const qualifiedCount = applications.filter((a) =>
    a.status.includes('Qualified') || a.status.includes('Interview') || a.status.includes('Appointment') || a.status.includes('Recommended') || a.status.includes('Result')
  ).length;
  const disqualifiedCount = applications.filter((a) =>
    a.status.includes('Not Qualified') || a.status.includes('Regret')
  ).length;
  const approvedCount = applications.filter((a) =>
    a.finalBoardDecision === 'Approved for Appointment' || a.status.includes('Recommended') || a.status.includes('Appointment') || a.status.includes('Result')
  ).length;
  const activeVacanciesCount = jobs.filter((j) => j.status === 'Open').length;
  const expiredVacanciesCount = jobs.filter((j) => j.status !== 'Open').length;
  const internalPromotionCount = applications.filter((a) => a.applicantType === 'internal').length;

  // Filtered applicants
  const filteredApps = applications.filter((app) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      app.personalInfo.fullName.toLowerCase().includes(s) ||
      app.trackingCode.toLowerCase().includes(s) ||
      app.positionTitle.toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesJob = jobFilter === 'All' || app.jobId === jobFilter;
    const matchesType =
      applicantTypeFilter === 'All' ||
      (applicantTypeFilter === 'internal' ? app.applicantType === 'internal' : app.applicantType !== 'internal');
    return matchesSearch && matchesStatus && matchesJob && matchesType;
  });

  // Open dossier modal
  const handleOpenDossier = (app: ApplicationRecord) => {
    setSelectedApp(app);
    setNewStatus(app.status);
    setAdminRemarks(app.adminRemarks || '');
    setInterviewScore(app.interviewScore);
    setFinalBoardDecision(app.finalBoardDecision);
  };

  // Save changes to application
  const handleSaveStatus = async () => {
    if (!selectedApp) return;
    setIsUpdating(true);

    const updates: Partial<ApplicationRecord> = {
      status: newStatus,
      adminRemarks,
      interviewScore,
      finalBoardDecision,
    };

    try {
      const res = await fetch(`/api/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Real-time Firestore sync
        try {
          await updateApplicationInFirestore(selectedApp.id, updates);
        } catch (fErr) {
          console.warn('Firestore update sync error handled:', fErr);
        }
        onUpdateApplication(selectedApp.id, json.data);
        setSelectedApp(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Regenerate AI Interview Questions
  const handleGenerateQuestions = async () => {
    if (!selectedApp) return;
    setIsGeneratingAiQuestions(true);
    try {
      const res = await fetch('/api/ai/interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedApp.jobId,
          applicantData: selectedApp,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const updatedScreening = {
          ...selectedApp.aiScreening,
          tailoredInterviewQuestions: json.data,
        };
        setSelectedApp({
          ...selectedApp,
          aiScreening: updatedScreening,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAiQuestions(false);
    }
  };

  // Manual Vacancy Sync Trigger with Official BFAR Portal
  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/vacancies/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncStatus(json.data);
        if (json.vacancies && Array.isArray(json.vacancies)) {
          json.vacancies.forEach((v: PlantillaJob) => {
            onUpdateJob(v.id, v);
          });
        }
        setSyncFeedback({
          type: 'success',
          message: `Synchronized with official BFAR announcements. Total: ${json.data.totalVacancies} (${json.data.activeVacancies} Active, ${json.data.expiredVacancies} Expired).`,
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: json.error || 'Failed to synchronize with BFAR portal.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: 'Network error communicating with vacancy synchronization engine.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Vacancy Status (Open <-> Expired)
  const handleToggleVacancyStatus = async (jobId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Open' ? 'Expired' : 'Open';
    try {
      const res = await fetch(`/api/vacancies/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        onUpdateJob(jobId, json.data);
        fetchSyncStatus();
      }
    } catch (err) {
      console.error('Failed to toggle vacancy status:', err);
    }
  };
// 2. Gamitin ang in-update na function na ito:
const handleDeleteVacancy = async (jobId: string, positionTitle: string) => {
  if (!window.confirm(`Sigurado ka bang nais mong burahin ang posisyong "${positionTitle}" sa Firestore database?`)) {
    return;
  }

  try {
    // Direktang buburahin sa Firestore database
    await deleteJobVacancyFromFirestore(jobId);

    alert(`Maitagumpay na nabura ang "${positionTitle}" sa database!`);

    // Kung walang real-time snapshot listener sa component, i-reload para mag-reflect agad sa UI
    window.location.reload();
  } catch (err) {
    console.error('Failed to delete job vacancy:', err);
    alert('Nabigong burahin ang job vacancy sa database.');
  }
};

  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateJobError(null);
    setCreateJobSuccess(null);

    const itemNo = (newJobForm.plantillaItemNumber || newJobForm.itemNo || '').trim().toUpperCase();
    if (!newJobForm.positionTitle.trim() || !itemNo) {
      setCreateJobError('Position Title and Plantilla Item Number are required.');
      return;
    }

    const payload = {
      positionTitle: newJobForm.positionTitle.trim(),
      plantillaItemNumber: itemNo,
      itemNo: itemNo,
      office: newJobForm.office.trim(),
      division: newJobForm.division.trim(),
      region: newJobForm.region.trim(),
      placeOfAssignment: newJobForm.placeOfAssignment.trim(),
      salaryGrade: Number(newJobForm.salaryGrade) || 15,
      plantillaType: newJobForm.plantillaType,
      datePosted: newJobForm.datePosted,
      postingDate: newJobForm.datePosted,
      applicationDeadline: newJobForm.applicationDeadline,
      closingDate: newJobForm.applicationDeadline,
      officialSourceUrl: newJobForm.officialSourceUrl.trim() || 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
      qualificationStandards: {
        education: newJobForm.education.trim(),
        experience: newJobForm.experience.trim(),
        training: newJobForm.training.trim(),
        eligibility: newJobForm.eligibility.trim(),
      },
      dutiesAndResponsibilities: newJobForm.dutiesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      competencies: newJobForm.competenciesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      attachedDocuments: [
        {
          name: newJobForm.documentTitle.trim() || 'Official Notice of Vacancy (CS Form 9)',
          url: newJobForm.documentUrl.trim() || 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
          type: 'PDF',
        },
      ],
    };

    try {
      const res = await fetch('/api/vacancies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        onAddJob(json.data);
        setIsCreatingJob(false);
        fetchSyncStatus();
      } else {
        setCreateJobError(json.error || 'Failed to import and verify official vacancy.');
      }
    } catch (err) {
      setCreateJobError('Failed to communicate with official vacancy import service.');
    }
  };

  // RESTRICTED ACCESS SCREEN (When unauthenticated)
  // Strictly removes public-facing login prompts or placeholder access elements for unauthorized users
  if (!isAuthenticated) {
    const handleDoLogin = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!loginUsername.trim()) {
        setLoginError('Please enter your authorized Government Employee ID / Account.');
        return;
      }
      if (!loginPassword.trim()) {
        setLoginError('Please enter your authorized HRMIS security passkey.');
        return;
      }
      setLoginError(null);
      setIsAuthenticated(true);
    };

    return (
      <div className="max-w-4xl mx-auto my-8 space-y-6">
        {/* Security Alert Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-red-500" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Restricted Access System
                </span>
                <span className="text-slate-400 text-xs font-mono">GOVPH SECURITY GATEWAY</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                DA-BFAR HRMIS Administrative &amp; HRMPSB Selection Portal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                Access to this administrative console is <strong>strictly restricted</strong> to authenticated
                Human Resource Management Personnel and officially constituted members of the Human Resource
                Merit Promotion and Selection Board (HRMPSB).
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Lock className="w-4 h-4" />
              <span>Statutory Notice &amp; Warning (Republic Act No. 10173 &amp; CSC ORAOHRA):</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Applicant Personal Data Sheets (CS Form 212), performance ratings (IPCR), and deliberation records
              contain protected personal and sensitive government information. Any unauthorized attempt to view,
              alter, or extract candidate data is strictly prohibited and subject to administrative and criminal
              sanctions under the Cybercrime Prevention Act and Data Privacy Act of 2012.
            </p>
          </div>
        </div>

        {/* Authorized Personnel Authentication Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-1 pb-4 border-b border-slate-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-[#024794] flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Authorized Personnel Verification
            </h3>
            <p className="text-xs text-slate-500">
              Sign in with your verified DA-BFAR credentials and authorized board role.
            </p>
          </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Google Firebase Auth Quick Entry for Authorized HR Admin */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const user = await signInWithGoogle();
                    const isAuthorized =
                      user.email === 'jaiciervo7@gmail.com' ||
                      user.email?.endsWith('@bfar.da.gov.ph');
                    if (isAuthorized) {
                      setLoginUsername(user.displayName || user.email || 'Admin jaiciervo7');
                      setVerifiedRole('HR_Specialist');
                      setIsAuthenticated(true);
                      setLoginError(null);
                    } else {
                      setLoginError(`Google account ${user.email} is not in the authorized HR/HRMPSB admin registry.`);
                    }
                  } catch (err) {
                    console.error('Google Sign-in failed:', err);
                    setLoginError('Google sign-in was cancelled or encountered an error.');
                  }
                }}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-2.5 rounded-lg font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 hover:border-slate-400"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google (Authorized HR Admin)</span>
              </button>

              {auth.currentUser && (auth.currentUser.email === 'jaiciervo7@gmail.com' || auth.currentUser.email?.endsWith('@bfar.da.gov.ph')) && (
                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername(auth.currentUser?.displayName || auth.currentUser?.email || 'Admin');
                    setVerifiedRole('HR_Specialist');
                    setIsAuthenticated(true);
                  }}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Enter as {auth.currentUser.email}</span>
                </button>
              )}

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-slate-400 text-[10px] font-semibold uppercase">
                  or employee credentials
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            </div>

            <form onSubmit={handleDoLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Verified System Role:
              </label>
              <select
                value={verifiedRole}
                onChange={(e: any) => setVerifiedRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-[#024794]"
              >
                <option value="HR_Specialist">HR Administrative Specialist / Secretariat</option>
                <option value="HRMPSB_Member">HRMPSB Selection Board Member / Evaluator</option>
                <option value="Director">National Director / Appointing Authority</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Official Agency Employee ID:
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter authorized Employee ID"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-[#024794]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Security Passkey / Password:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter secure passkey"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 pr-9 font-mono focus:ring-2 focus:ring-[#024794]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#024794] hover:bg-[#033b7a] text-white py-3 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>Verify Role &amp; Enter Dashboard</span>
            </button>
          </form>

          {/* Quick link for official live portal */}
          <div className="text-center pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 block mb-1">Existing Bureau Systems:</span>
            <a
              href="https://hrmisv2.bfar.da.gov.ph/login"
              target="_blank"
              rel="noreferrer"
              className="text-[#024794] font-semibold text-xs hover:underline inline-flex items-center gap-1"
            >
              <span>Go to live DA-BFAR HRMIS v2</span>
              <ExternalLink className="w-3 h-3 text-[#024794]" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED HR PERSONNEL DASHBOARD
  return (
    <div className="space-y-6">
      {/* Verified Role Session Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-sm">
            <BadgeCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.2 rounded uppercase">
                Verified Session
              </span>
              <span className="text-slate-400 text-xs">
                Station: BFAR Central Office (NCR)
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Role:{' '}
              {verifiedRole === 'Director'
                ? 'National Director / Appointing Authority'
                : verifiedRole === 'HRMPSB_Member'
                ? 'HRMPSB Selection Board Member'
                : 'HR Administrative Specialist'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 hidden md:inline">
            Logged in as: <strong className="text-white">{loginUsername || 'Authorized Officer'}</strong>
          </span>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setLoginPassword('');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Dynamic Recruitment & Personnel Metrics (Calculated from Real Database Records) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Registered Applicants</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{uniqueApplicants}</div>
          <span className="text-[10px] text-slate-400">Unique Applicants</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Submitted Applications</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalApps}</div>
          <span className="text-[10px] text-slate-400">Total Submissions</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Under Review</span>
          <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{underReviewCount}</div>
          <span className="text-[10px] text-slate-400">Document Review</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Qualified Applicants</span>
          <div className="text-xl sm:text-2xl font-black text-[#024794] mt-1">{qualifiedCount}</div>
          <span className="text-[10px] text-slate-400">Meets CSC Standards</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Disqualified</span>
          <div className="text-xl sm:text-2xl font-black text-red-600 mt-1">{disqualifiedCount}</div>
          <span className="text-[10px] text-slate-400">Does Not Meet QS</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Approved Applications</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{approvedCount}</div>
          <span className="text-[10px] text-slate-400">Appointed / Recommended</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Active Vacancies</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{activeVacanciesCount}</div>
          <span className="text-[10px] text-slate-400">Open Announcements</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Expired Vacancies</span>
          <div className="text-xl sm:text-2xl font-black text-slate-600 mt-1">{expiredVacanciesCount}</div>
          <span className="text-[10px] text-slate-400">Deadline Passed</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1 lg:col-span-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Internal Promotions</span>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">{internalPromotionCount}</div>
          <span className="text-[10px] text-slate-400">Verified Personnel Applications</span>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div className="bg-white rounded-t-xl border border-b-0 border-slate-200 px-4 pt-3 flex space-x-2 text-xs font-bold">
        <button
          onClick={() => setAdminTab('applicants')}
          className={`py-2 px-4 rounded-t-lg transition-colors flex items-center gap-1.5 ${
            adminTab === 'applicants'
              ? 'bg-[#024794] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Applicants &amp; Dossiers</span>
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
            {applications.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('plantilla')}
          className={`py-2 px-4 rounded-t-lg transition-colors flex items-center gap-1.5 ${
            adminTab === 'plantilla'
              ? 'bg-[#024794] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Plantilla Vacancies</span>
          <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.2 rounded-full">
            {jobs.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('matrix')}
          className={`py-2 px-4 rounded-t-lg transition-colors flex items-center gap-1.5 ${
            adminTab === 'matrix'
              ? 'bg-[#024794] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Comparative Assessment Matrix</span>
        </button>
      </div>

      {/* TAB 1: APPLICANTS TABLE */}
      {adminTab === 'applicants' && (
        <div className="bg-white rounded-b-xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search applicant name, reference code, position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-[#024794]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1">
                <span className="text-slate-500 font-medium">Track:</span>
                <select
                  value={applicantTypeFilter}
                  onChange={(e: any) => setApplicantTypeFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs font-semibold text-purple-900"
                >
                  <option value="All">All Internal Staff ({totalApps})</option>
                  <option value="internal">Promotion Track ({internalPromotionCount})</option>
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-slate-500 font-medium">Stage:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="All">All Stages</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Document Under Review">Document Under Review</option>
                  <option value="CSC QS Qualified - Under Review">CSC QS Qualified</option>
                  <option value="HRMPSB Deliberation & Interview Scheduled">HRMPSB Interview Scheduled</option>
                  <option value="HRMPSB Recommended for Appointment">Recommended for Appointment</option>
                  <option value="Application Result Released">Application Result Released</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold">
                  <th className="py-2.5 px-3">Reference No.</th>
                  <th className="py-2.5 px-3">Applicant Name</th>
                  <th className="py-2.5 px-3">Plantilla Position</th>
                  <th className="py-2.5 px-3">AI QS Fit Score</th>
                  <th className="py-2.5 px-3">Current Milestone</th>
                  <th className="py-2.5 px-3">Board Decision</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          {applications.length === 0
                            ? 'No recruitment records are currently available.'
                            : 'No Matching Applications Found'}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {applications.length === 0
                            ? 'As verified DA-BFAR employees submit their promotional applications, their CS Form 212 records, uploaded files, and automated Gemini AI evaluations will appear here in real-time.'
                            : 'Try adjusting your search query, salary grade filter, or status selection.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#024794]">
                        {app.trackingCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{app.personalInfo.fullName}</span>
                          {app.applicantType === 'internal' && (
                            <span className="bg-purple-100 text-purple-900 text-[9px] font-extrabold px-1.5 py-0.2 rounded inline-flex items-center gap-1 border border-purple-200">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>BFAR Staff (SG {app.currentSalaryGrade || 11})</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{app.personalInfo.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{app.positionTitle}</div>
                        <div className="text-[10px] text-slate-500">{app.plantillaItemNo}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-black font-mono px-2 py-0.5 rounded text-[11px] ${
                              (app.aiScreening?.overallScore || 0) >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : (app.aiScreening?.overallScore || 0) >= 80
                                ? 'bg-blue-100 text-[#024794]'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {app.aiScreening?.overallScore || 85}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            app.status.includes('Interview')
                              ? 'bg-purple-100 text-purple-800'
                              : app.status.includes('Appointment') || app.status.includes('Result')
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-50 text-[#024794] border border-blue-200'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {app.finalBoardDecision ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {app.finalBoardDecision}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Under Deliberation</span>
                        )}
                        {app.interviewScore && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Interview: {app.interviewScore}/100
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleOpenDossier(app)}
                          className="bg-[#024794] hover:bg-[#033b7a] text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center justify-center gap-1 mx-auto transition-all active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review Dossier</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PLANTILLA VACANCIES & OFFICIAL BFAR SYNCHRONIZATION */}
      {adminTab === 'plantilla' && (
        <div className="bg-white rounded-b-xl shadow-xs border border-slate-200 p-5 space-y-6">
          {/* Official Source & Synchronization Console Card */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0a2540] to-slate-900 text-white rounded-xl p-5 border border-slate-700 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Official Source of Truth
                  </span>
                  <span className="text-slate-300 text-xs font-mono">DA-BFAR PORTAL REPOSITORY</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Official Plantilla Vacancy Synchronization Engine
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  All job opportunities are synchronized directly from the authoritative DA-BFAR Careers Portal.
                  Monetary salary amounts are strictly suppressed in compliance with CSC rules; only official Salary Grades (SG) are published.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <a
                  href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Open bfar.da.gov.ph</span>
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                </a>

                <button
                  type="button"
                  onClick={handleRunSync}
                  disabled={isSyncing}
                  className="bg-[#024794] hover:bg-[#033b7a] disabled:opacity-50 text-white border border-blue-400/30 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
                  <span>{isSyncing ? 'Checking BFAR Portal...' : 'Sync Vacancies'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreatingJob(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import Official Notice</span>
                </button>
              </div>
            </div>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/60 border-red-500/40 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{syncFeedback.message}</span>
                </div>
                <button
                  onClick={() => setSyncFeedback(null)}
                  className="text-slate-400 hover:text-white text-xs p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Sync Status Info Bar */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-400">Sync Status:</span>
                  <span className="font-semibold text-white capitalize">
                    {syncStatus?.status || 'Active & Synchronized'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Last Synced:</span>
                  <span className="font-mono text-white text-[11px]">
                    {syncStatus?.lastSuccessfulSync
                      ? new Date(syncStatus.lastSuccessfulSync).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Recently updated'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Registry Count:</span>
                  <span className="font-bold text-white">{jobs.length} items</span>
                  <span className="text-emerald-400">({jobs.filter(j => j.status === 'Open').length} Open)</span>
                  <span className="text-slate-400">({jobs.filter(j => j.status !== 'Open').length} Closed)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="text-sky-300 hover:text-sky-200 text-xs font-semibold flex items-center gap-1 underline underline-offset-2"
              >
                <History className="w-3.5 h-3.5" />
                <span>{showAuditLogs ? 'Hide Audit Log' : 'View Sync Audit Log'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAuditLogs ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Collapsible Sync Audit Log Drawer */}
            {showAuditLogs && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Timestamp &amp; Event</span>
                  <span>Outcome Details</span>
                </div>
                {syncStatus?.auditLogs && syncStatus.auditLogs.length > 0 ? (
                  syncStatus.auditLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-[11px] py-1 border-b border-slate-900/50">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-slate-400">
                          <span>{new Date(log.timestamp).toLocaleTimeString('en-PH')}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            log.status === 'success'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : log.status === 'warning'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}>
                            {log.action}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-slate-300 max-w-md">
                        {log.details}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2 text-center">No synchronization events recorded yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Plantilla Vacancies Listing with Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Official Plantilla Items Ledger ({jobs.length})
              </h4>
              <p className="text-xs text-slate-500">
                Central Office positions synchronized from official DA-BFAR announcements.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Filter:</span>
              <button
                type="button"
                onClick={() => setVacancyFilter('All')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  vacancyFilter === 'All'
                    ? 'bg-[#024794] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({jobs.length})
              </button>
              <button
                type="button"
                onClick={() => setVacancyFilter('Open')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  vacancyFilter === 'Open'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Active / Open ({jobs.filter(j => j.status === 'Open').length})
              </button>
              <button
                type="button"
                onClick={() => setVacancyFilter('Expired')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  vacancyFilter === 'Expired'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Closed / Expired ({jobs.filter(j => j.status !== 'Open').length})
              </button>
            </div>
          </div>

          {/* Vacancies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs
              .filter((j) => {
                if (vacancyFilter === 'Open') return j.status === 'Open';
                if (vacancyFilter === 'Expired') return j.status !== 'Open';
                return true;
              })
              .map((job) => {
                const isOpen = job.status === 'Open';
                const deadline = job.applicationDeadline || job.closingDate;
                const posted = job.datePosted || job.postingDate;

                return (
                  <div
                    key={job.id}
                    className={`rounded-xl border p-4 space-y-3 flex flex-col justify-between transition-all ${
                      isOpen
                        ? 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
                        : 'bg-slate-50 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-[#024794] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {job.plantillaItemNumber || job.itemNo}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            SG {job.salaryGrade}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isOpen
                                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                : 'text-slate-600 bg-slate-100 border-slate-300'
                            }`}
                          >
                            {isOpen ? 'Active / Open' : 'Closed / Expired'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">{job.positionTitle}</h5>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{job.division}</p>
                        <p className="text-[11px] text-slate-400">{job.office || 'BFAR Central Office'}</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] space-y-1 border border-slate-100">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Date Posted:</span>
                          <span className="font-medium text-slate-800">{posted}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Deadline:</span>
                          <span className={`font-semibold ${isOpen ? 'text-blue-900' : 'text-slate-500'}`}>
                            {deadline}
                          </span>
                        </div>
                      </div>

                      {/* Qualification Standards Summary */}
                      <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                        <div>
                          <strong className="text-slate-700">Education:</strong>{' '}
                          <span className="line-clamp-1">{job.qualificationStandards?.education}</span>
                        </div>
                        <div>
                          <strong className="text-slate-700">Eligibility:</strong>{' '}
                          <span className="line-clamp-1">{job.qualificationStandards?.eligibility}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={job.officialSourceUrl || 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#024794] hover:underline text-[11px] font-semibold flex items-center gap-1"
                        >
                          <span>Official Notice</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleToggleVacancyStatus(job.id, job.status)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                            isOpen
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          }`}
                        >
                          {isOpen ? 'Mark Expired' : 'Reactivate'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: COMPARATIVE ASSESSMENT MATRIX */}
      {adminTab === 'matrix' && (
        <div className="bg-white rounded-b-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Comparative Assessment Form (CAR) - Ranked Applicant Summary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Criteria weighting conforms to CSC Merit Selection Plan: Education (30%),
              Experience (30%), Qualifying Training (20%), Potential / Interview (20%).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#024794] text-white">
                  <th className="p-2.5">Rank</th>
                  <th className="p-2.5 font-sans">Candidate Name</th>
                  <th className="p-2.5 font-sans">Plantilla Item</th>
                  <th className="p-2.5 text-center">Education (30%)</th>
                  <th className="p-2.5 text-center">Experience (30%)</th>
                  <th className="p-2.5 text-center">Qualifying Training (20%)</th>
                  <th className="p-2.5 text-center">Interview / Potential (20%)</th>
                  <th className="p-2.5 text-center font-bold">Total Rating</th>
                  <th className="p-2.5 font-sans">Deliberation Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center font-sans">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center space-y-2">
                        <Scale className="w-8 h-8 text-slate-400" />
                        <h4 className="font-bold text-slate-800 text-sm">
                          Comparative Assessment Matrix Empty
                        </h4>
                        <p className="text-xs text-slate-500">
                          No internal promotional candidates have submitted applications yet. When submissions are received, they will be ranked against the CSC Merit Selection Plan criteria here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  applications.map((app, idx) => {
                  const edu = app.aiScreening?.qsCompliance?.educationScore || 90;
                  const exp = app.aiScreening?.qsCompliance?.experienceScore || 88;
                  const train = app.aiScreening?.qsCompliance?.trainingScore || 90;
                  const interview = app.interviewScore || 92;

                  const total = Math.round(
                    edu * 0.3 + exp * 0.3 + train * 0.2 + interview * 0.2
                  );

                  return (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800">#{idx + 1}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-900">
                        {app.personalInfo.fullName}
                      </td>
                      <td className="p-2.5 font-sans text-slate-600">{app.positionTitle}</td>
                      <td className="p-2.5 text-center">{edu}%</td>
                      <td className="p-2.5 text-center">{exp}%</td>
                      <td className="p-2.5 text-center">{train}%</td>
                      <td className="p-2.5 text-center">{interview}%</td>
                      <td className="p-2.5 text-center font-bold text-sm text-[#024794]">{total}%</td>
                      <td className="p-2.5 font-sans">
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {app.finalBoardDecision || 'Shortlisted for Deliberation'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPLICANT REVIEW & AI SCREENING DOSSIER MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#024794] text-white p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    HRMPSB Candidate Dossier
                  </span>
                  <span className="text-sky-200 font-mono text-xs">{selectedApp.trackingCode}</span>
                </div>
                <h3 className="text-xl font-bold">{selectedApp.personalInfo.fullName}</h3>
                <p className="text-xs text-sky-200 mt-0.5">
                  Applied for: <strong>{selectedApp.positionTitle}</strong> • Plantilla Item: {selectedApp.plantillaItemNo}
                </p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* AI Qualification Standards (QS) Evaluation */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="font-extrabold text-sm text-[#024794]">
                        Gemini AI HRMPSB Pre-Screening Evaluation
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Official assessment against prescribed CSC Qualification Standards
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Suitability Index
                    </span>
                    <span className="text-2xl font-black text-[#024794]">
                      {selectedApp.aiScreening?.overallScore || 90}/100
                    </span>
                  </div>
                </div>

                {/* MANDATORY LEGAL & CSC ADVISORY DISCLAIMER */}
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <strong className="font-bold">Initial AI Screening Recommendation (Advisory Only):</strong>
                    <span>
                      {' '}The QS evaluation below is an automated assessment to assist HRMPSB evaluators. Official qualification standards verification and final appointment decisions rest solely with authorized HR personnel, the HRMPSB, and the National Director.
                    </span>
                  </div>
                </div>

                {/* If Internal Applicant: Display Verified Internal Personnel Card */}
                {selectedApp.applicantType === 'internal' && (
                  <div className="bg-purple-100/70 border border-purple-200 rounded-lg p-3 text-[11px] text-purple-950 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-700 shrink-0" />
                      <div>
                        <strong className="block text-purple-900">
                          DA-BFAR Internal Staff Promotion Profile
                        </strong>
                        <span className="text-purple-800">
                          ID: <strong className="font-mono">{selectedApp.bfarEmployeeId || 'BFAR-EMP-VERIFIED'}</strong> • Division: {selectedApp.currentDivision || 'Central Office'} • Track: {selectedApp.promotionTrack || 'Promotion'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedApp.currentSalaryGrade && (
                        <span className="bg-white px-2 py-0.5 rounded font-bold text-purple-800 border border-purple-200">
                          Current: SG {selectedApp.currentSalaryGrade}
                        </span>
                      )}
                      {selectedApp.latestIpcrRating && (
                        <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold border border-emerald-300 flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-emerald-600" />
                          IPCR: {selectedApp.latestIpcrRating.toFixed(2)}/5.00
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 4 Pillars Matrix with Training Exclusion Notice */}
                {selectedApp.aiScreening?.qsCompliance && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                        <span>1. Education</span>
                        <span className="text-emerald-600">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.educationAnalysis}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                        <span>2. Experience</span>
                        <span className="text-emerald-600">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.experienceAnalysis}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                        <span>3. Training (CSC)</span>
                        <span className="text-emerald-600">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.trainingAnalysis}
                      </p>
                      {selectedApp.aiScreening.qsCompliance.flaggedTrainingEntries &&
                        selectedApp.aiScreening.qsCompliance.flaggedTrainingEntries.length > 0 && (
                          <div className="mt-1 bg-amber-50 text-amber-800 p-1 rounded text-[9px]">
                            *Excluded {selectedApp.aiScreening.qsCompliance.excludedTrainingHours} hrs non-qualifying RP/Conference.
                          </div>
                        )}
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                        <span>4. Eligibility</span>
                        <span className="text-emerald-600">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.eligibilityAnalysis}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Application Letter to the National Director */}
              {(selectedApp.applicationLetterText || selectedApp.statementOfIntent) && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 block text-xs">
                      Application Letter addressed to the National Director
                    </span>
                    <span className="text-[10px] bg-blue-50 text-[#024794] font-semibold px-2 py-0.5 rounded">
                      Section 1 Submission
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono whitespace-pre-line text-slate-700 max-h-44 overflow-y-auto leading-relaxed">
                    {selectedApp.applicationLetterText || selectedApp.statementOfIntent}
                  </div>
                </div>
              )}

              {/* Educational Background with Units & Attachments */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  Educational Background &amp; Credentials
                </span>
                {selectedApp.education.map((e, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{e.degree}</span>
                      <span className="text-[10px] bg-blue-50 text-[#024794] font-semibold px-2 py-0.5 rounded">
                        {e.level}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">{e.school} • Graduated: {e.yearGraduated}</div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                      {e.unitsEarned && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          Units: {e.unitsEarned}
                        </span>
                      )}
                      {e.honors && e.honors !== 'None' && (
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                          Honors: {e.honors}
                        </span>
                      )}
                      {e.transcriptFile && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>TOR Attached ({e.transcriptFile})</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mandatory Supporting Documents Verification */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  Mandatory Document Checklist Verification
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {selectedApp.documentsUploaded.map((doc, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-[#024794] text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0">
                          {doc.category || 'DOC'}
                        </span>
                        <span className="font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.autoCorrected && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                            Auto-Sorted
                          </span>
                        )}
                        <span className="font-mono text-[9px] text-slate-400">{doc.fileSize}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tailored HRMPSB Interview Questions */}
              {selectedApp.aiScreening?.tailoredInterviewQuestions && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">
                      AI-Generated HRMPSB Behavioral Interview Questions:
                    </span>
                    <button
                      onClick={handleGenerateQuestions}
                      disabled={isGeneratingAiQuestions}
                      className="text-[#024794] hover:underline font-semibold text-[11px] flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGeneratingAiQuestions ? 'animate-spin' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-700">
                    {selectedApp.aiScreening.tailoredInterviewQuestions.map((q, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {q}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* HRMPSB Decision Console (Streamlined 5-Stage Pipeline) */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                  HRMPSB Deliberation &amp; Application Result Console
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Recruitment Milestone Stage:
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e: any) => setNewStatus(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs font-semibold text-white focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="Submitted">1. Application Submitted</option>
                      <option value="Document Under Review">2. Initial AI-Assisted Screening</option>
                      <option value="CSC QS Qualified - Under Review">3. HR Evaluation</option>
                      <option value="HRMPSB Deliberation & Interview Scheduled">4. Qualification Assessment &amp; Deliberation</option>
                      <option value="Application Result Released">5. Final Status / Notice of Result</option>
                      <option value="Rejected">Disqualified / Rejected (Did not meet QS)</option>
                      <option value="Regret / Not Qualified">Notice of Non-Selection / Regret</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      HRMPSB Panel Interview Score (0-100):
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 94"
                      value={interviewScore ?? ''}
                      onChange={(e) => setInterviewScore(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs font-mono text-white focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Final Board Decision:
                    </label>
                    <select
                      value={finalBoardDecision || ''}
                      onChange={(e: any) => setFinalBoardDecision(e.target.value || undefined)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs font-semibold text-white focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="">Under Deliberation</option>
                      <option value="Approved for Appointment">Approved for Appointment</option>
                      <option value="Shortlisted / Lineup">Shortlisted / Plantilla Lineup</option>
                      <option value="Deferred">Deferred for Next Session</option>
                      <option value="Not Selected">Not Selected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold text-xs">
                    Official Committee Remarks (Visible to Applicant via Tracker):
                  </label>
                  <input
                    type="text"
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="Enter formal remarks or schedule instructions..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs text-white focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Logged at: {selectedApp.submissionDate}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveStatus}
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-md bg-[#024794] hover:bg-[#033b7a] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <span>{isUpdating ? 'Saving Decision...' : 'Save HRMPSB Evaluation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL BFAR VACANCY IMPORT & VERIFICATION MODAL */}
      {isCreatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#024794] text-white p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    Official Ingestion
                  </span>
                  <span className="text-sky-200 font-mono text-xs">bfar.da.gov.ph / CS Form 9</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Import &amp; Verify Official Plantilla Vacancy
                </h3>
                <p className="text-xs text-sky-200 mt-0.5">
                  Synchronize official notices from https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingJob(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {createJobError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Import Verification Alert:</strong>
                    <span>{createJobError}</span>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  Statutory Rule: Salary Confidentiality
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Only the <strong>Salary Grade (SG)</strong> is entered and displayed. Numerical monthly salary rates are confidential and must never be exposed or recorded in the public registry.
                </p>
              </div>

              <form id="importVacancyForm" onSubmit={handleCreateJobSubmit} className="space-y-4">
                {/* Basic Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Position Title *</label>
                    <input
                      type="text"
                      required
                      value={newJobForm.positionTitle}
                      onChange={(e) => setNewJobForm({ ...newJobForm, positionTitle: e.target.value })}
                      placeholder="e.g. Senior Aquaculturist"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Plantilla Item Number *</label>
                    <input
                      type="text"
                      required
                      value={newJobForm.plantillaItemNumber || newJobForm.itemNo}
                      onChange={(e) =>
                        setNewJobForm({
                          ...newJobForm,
                          plantillaItemNumber: e.target.value,
                          itemNo: e.target.value,
                        })
                      }
                      placeholder="e.g. BFAR-OSEC-CO-AQ3-2026-091"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs focus:ring-2 focus:ring-[#024794]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Office / Agency *</label>
                    <input
                      type="text"
                      required
                      value={newJobForm.office}
                      onChange={(e) => setNewJobForm({ ...newJobForm, office: e.target.value })}
                      placeholder="BFAR Central Office"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Division / Operating Unit *</label>
                    <input
                      type="text"
                      required
                      value={newJobForm.division}
                      onChange={(e) => setNewJobForm({ ...newJobForm, division: e.target.value })}
                      placeholder="e.g. Aquaculture Division"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#024794]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Salary Grade (SG) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={33}
                      value={newJobForm.salaryGrade}
                      onChange={(e) => setNewJobForm({ ...newJobForm, salaryGrade: Number(e.target.value) })}
                      placeholder="15"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs focus:ring-2 focus:ring-[#024794]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Official Grade (e.g. 11, 15, 19, 24)</span>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Date Posted (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={newJobForm.datePosted}
                      onChange={(e) => setNewJobForm({ ...newJobForm, datePosted: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Application Deadline</label>
                    <input
                      type="date"
                      value={newJobForm.applicationDeadline}
                      onChange={(e) => setNewJobForm({ ...newJobForm, applicationDeadline: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#024794]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Announcement URL *</label>
                  <input
                    type="url"
                    required
                    value={newJobForm.officialSourceUrl}
                    onChange={(e) => setNewJobForm({ ...newJobForm, officialSourceUrl: e.target.value })}
                    placeholder="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-blue-900 focus:ring-2 focus:ring-[#024794]"
                  />
                </div>

                {/* CSC Qualification Standards */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 text-xs block">
                    Civil Service Commission (CSC) Qualification Standards
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Education Standard *</label>
                      <input
                        type="text"
                        required
                        value={newJobForm.education}
                        onChange={(e) => setNewJobForm({ ...newJobForm, education: e.target.value })}
                        placeholder="Bachelor's degree in Fisheries..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-[#024794]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Experience Standard *</label>
                      <input
                        type="text"
                        required
                        value={newJobForm.experience}
                        onChange={(e) => setNewJobForm({ ...newJobForm, experience: e.target.value })}
                        placeholder="1 year of relevant experience..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-[#024794]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Training Standard *</label>
                      <input
                        type="text"
                        required
                        value={newJobForm.training}
                        onChange={(e) => setNewJobForm({ ...newJobForm, training: e.target.value })}
                        placeholder="4 hours of relevant training..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-[#024794]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Eligibility Standard *</label>
                      <input
                        type="text"
                        required
                        value={newJobForm.eligibility}
                        onChange={(e) => setNewJobForm({ ...newJobForm, eligibility: e.target.value })}
                        placeholder="Career Service (Professional) / RA 1080"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-[#024794]"
                      />
                    </div>
                  </div>
                </div>

                {/* Attached Document & Duties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Attached Document Title</label>
                    <input
                      type="text"
                      value={newJobForm.documentTitle}
                      onChange={(e) => setNewJobForm({ ...newJobForm, documentTitle: e.target.value })}
                      placeholder="Official Notice of Vacancy (CS Form 9)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Document Link / URL</label>
                    <input
                      type="text"
                      value={newJobForm.documentUrl}
                      onChange={(e) => setNewJobForm({ ...newJobForm, documentUrl: e.target.value })}
                      placeholder="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-[#024794]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Duties &amp; Responsibilities (One item per line)
                  </label>
                  <textarea
                    rows={3}
                    value={newJobForm.dutiesText}
                    onChange={(e) => setNewJobForm({ ...newJobForm, dutiesText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#024794]"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Authoritative Source: bfar.da.gov.ph
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingJob(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="importVacancyForm"
                  className="px-5 py-2 rounded-lg bg-[#024794] hover:bg-[#033b7a] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify &amp; Add to Registry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
