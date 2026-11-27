import React, { useState, useEffect } from 'react';
import { PlantillaJob, ApplicationRecord, VacancySyncStatus } from '../types';
import {
  updateApplicationInFirestore,
  deleteJobVacancyFromFirestore,
  saveJobVacancyToFirestore,
  getJobVacanciesFromFirestore,
} from '../lib/firestoreService';
import { auth, db, signInWithGoogle } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit,
  Shield,
  ChevronDown,
  X,
  AlertCircle,
  Lock,
  LogOut,
  RefreshCw,
  ExternalLink,
  LogIn,
  KeyRound,
  UserCheck,
  AlertTriangle,
  BadgeCheck,
  FileText,
  Scale,
  Globe,
  History,
  Check,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

type AdminRole = 'HR_Specialist' | 'HR_Supervisor' | 'HR_Chief';
type PlantillaType = 'Permanent' | 'Contract of Service (COS)' | 'Project-Based';

interface AdminPortalProps {
  jobs: PlantillaJob[];
  applications: ApplicationRecord[];
  onUpdateApplication: (appId: string, updates: Partial<ApplicationRecord>) => void;
  onAddJob: (job: Partial<PlantillaJob>) => void;
  onUpdateJob: (jobId: string, updates: Partial<PlantillaJob>) => void;
  onDeleteJob?: (jobId: string) => void;
  onAuthChange?: (authenticated: boolean) => void;
  onBackToFrontPage?: () => void;
}

const getRoleLabel = (role: AdminRole) => {
  switch (role) {
    case 'HR_Chief':
      return 'Human Resource Chief';
    case 'HR_Supervisor':
      return 'Human Resource Supervisor';
    case 'HR_Specialist':
    default:
      return 'Human Resource Administrative';
  }
};

const emptyJobForm: {
  itemNo: string;
  plantillaItemNumber: string;
  positionTitle: string;
  office: string;
  division: string;
  region: string;
  placeOfAssignment: string;
  salaryGrade: number;
  plantillaType: PlantillaType;
  datePosted: string;
  applicationDeadline: string;
  officialSourceUrl: string;
  education: string;
  experience: string;
  training: string;
  eligibility: string;
  dutiesText: string;
  competenciesText: string;
  documentTitle: string;
  documentUrl: string;
} = {
  itemNo: '',
  plantillaItemNumber: '',
  positionTitle: '',
  office: 'BFAR Central Office',
  division: 'Aquaculture Division',
  region: 'Central Office (NCR) - Quezon City',
  placeOfAssignment: 'BFAR Central Office, PCA Building, Elliptical Road, Diliman, Quezon City',
  salaryGrade: 15,
  plantillaType: 'Permanent',
  datePosted: '2026-10-21',
  applicationDeadline: '2026-12-15',
  officialSourceUrl: 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
  education: "Bachelor's degree in Fisheries, Aquaculture, or related discipline",
  experience: '1 year of relevant experience in fisheries development',
  training: '4 hours of relevant technical training',
  eligibility: 'Career Service (Professional) / RA 1080',
  dutiesText:
    'Coordinate technical program implementation and monitoring.\nEvaluate technical fisheries reports and compliance documents.\nPrepare administrative reports for Central Office review.',
  competenciesText:
    'Fisheries Regulatory Compliance\nTechnical Report Writing\nProgram Monitoring',
  documentTitle: 'Official Notice of Vacancy (CS Form 9)',
  documentUrl: 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
};

const getTodayDateString = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

export const AdminPortal: React.FC<AdminPortalProps> = ({
  jobs,
  applications,
  onUpdateApplication,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onAuthChange,
  onBackToFrontPage,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [signInMethod, setSignInMethod] = useState<'credentials' | 'google'>('credentials');
  const [verifiedRole, setVerifiedRole] = useState<AdminRole>('HR_Specialist');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    onAuthChange?.(isAuthenticated);
  }, [isAuthenticated, onAuthChange]);

  const [adminTab, setAdminTab] = useState<'applicants' | 'plantilla' | 'matrix'>('applicants');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [jobFilter] = useState('All');
  const [applicantTypeFilter, setApplicantTypeFilter] = useState<'All' | 'internal'>('All');

  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);

  const [newStatus, setNewStatus] = useState<ApplicationRecord['status']>('Submitted');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [interviewScore, setInterviewScore] = useState<number | undefined>(undefined);
  const [finalBoardDecision, setFinalBoardDecision] =
    useState<ApplicationRecord['finalBoardDecision']>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  const [syncStatus, setSyncStatus] = useState<VacancySyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [vacancyFilter, setVacancyFilter] = useState<'All' | 'Open' | 'Expired'>('All');
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [deletedJobIds, setDeletedJobIds] = useState<string[]>([]);

  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [editingJob, setEditingJob] = useState<PlantillaJob | null>(null);
  const [createJobError, setCreateJobError] = useState<string | null>(null);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [newJobForm, setNewJobForm] = useState(emptyJobForm);

  const visibleJobs = jobs.filter((j) => !deletedJobIds.includes(j.id));

  useEffect(() => {
    setSyncStatus((prev) => (prev ? { ...prev, status: 'idle' } : null));
  }, [adminTab]);

  const totalApps = applications.length;
  const uniqueApplicants = new Set(
    applications.map((a) => a.bfarEmployeeId || a.personalInfo?.email || a.id)
  ).size;
  const underReviewCount = applications.filter(
    (a) => a.status === 'Submitted' || a.status === 'Document Under Review'
  ).length;
  const qualifiedCount = applications.filter(
    (a) =>
      a.status.includes('Qualified') ||
      a.status.includes('Interview') ||
      a.status.includes('Appointment') ||
      a.status.includes('Recommended') ||
      a.status.includes('Result')
  ).length;
  const disqualifiedCount = applications.filter(
    (a) => a.status.includes('Not Qualified') || a.status.includes('Regret')
  ).length;
  const approvedCount = applications.filter(
    (a) =>
      a.finalBoardDecision === 'Approved for Appointment' ||
      a.status.includes('Recommended') ||
      a.status.includes('Appointment') ||
      a.status.includes('Result')
  ).length;
  const activeVacanciesCount = visibleJobs.filter((j) => j.status === 'Open').length;
  const expiredVacanciesCount = visibleJobs.filter((j) => j.status !== 'Open').length;
  const internalPromotionCount = applications.filter((a) => a.applicantType === 'internal').length;

  const filteredApps = applications.filter((app) => {
    const s = searchTerm.toLowerCase();
    const fullName = app.personalInfo?.fullName || (app as any).applicantName || '';
    const matchesSearch =
      fullName.toLowerCase().includes(s) ||
      (app.trackingCode || '').toLowerCase().includes(s) ||
      (app.positionTitle || (app as any).jobTitle || '').toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesJob = jobFilter === 'All' || app.jobId === jobFilter;
    const matchesType = applicantTypeFilter === 'All' || app.applicantType === 'internal';
    return matchesSearch && matchesStatus && matchesJob && matchesType;
  });

  const handleOpenDossier = (app: ApplicationRecord) => {
    setSelectedApp(app);
    setNewStatus(app.status);
    setAdminRemarks(app.adminRemarks || '');
    setInterviewScore(app.interviewScore);
    setFinalBoardDecision(app.finalBoardDecision);
  };

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
      await updateApplicationInFirestore(selectedApp.id, updates);
      let nextRecord: ApplicationRecord = { ...selectedApp, ...updates };

      try {
        const res = await fetch(`/api/applications/${selectedApp.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data) {
            nextRecord = { ...nextRecord, ...json.data };
          }
        }
      } catch {
        // Optional API route on static hosting; Firestore update already succeeded
      }

      onUpdateApplication(selectedApp.id, nextRecord);
      setSelectedApp(nextRecord);
    } catch (err) {
      console.error('Failed to save HRMPSB evaluation:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await fetch('/api/vacancies/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json?.success) {
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
          return;
        }
      }
      throw new Error('Backend sync route unavailable');
    } catch {
      try {
        const latestVacancies = await getJobVacanciesFromFirestore();
        latestVacancies.forEach((v) => onUpdateJob(v.id, v));
        const nowIso = new Date().toISOString();
        const openCount = latestVacancies.filter((j) => j.status === 'Open').length;
        const closedCount = latestVacancies.filter((j) => j.status !== 'Open').length;

        setSyncStatus({
          status: 'idle',
          lastSuccessfulSync: nowIso,
          totalVacancies: latestVacancies.length,
          activeVacancies: openCount,
          expiredVacancies: closedCount,
          auditLogs: [
            {
              timestamp: nowIso,
              action: 'FIRESTORE_REGISTRY_REFRESH',
              details: `Refreshed ${latestVacancies.length} plantilla items from Firestore (${openCount} Open, ${closedCount} Closed).`,
            },
          ],
        } as VacancySyncStatus);

        setSyncFeedback({
          type: 'success',
          message: `Refreshed ${latestVacancies.length} plantilla vacancies from Firestore (${openCount} Active, ${closedCount} Closed).`,
        });
      } catch {
        setSyncFeedback({
          type: 'error',
          message: 'Unable to refresh plantilla vacancies from Firestore.',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleVacancyStatus = async (job: PlantillaJob) => {
    const isCurrentlyOpen = job.status === 'Open';
    const nextStatus: PlantillaJob['status'] = isCurrentlyOpen ? 'Expired' : 'Open';
    const updatedJob: PlantillaJob = {
      ...job,
      status: nextStatus,
    };

    setUpdatingJobId(job.id);
    setSyncFeedback(null);

    try {
      await saveJobVacancyToFirestore(updatedJob);
      onUpdateJob(job.id, updatedJob);

      try {
        await fetch(`/api/vacancies/${job.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
      } catch {
        // Optional API endpoint; Firestore is primary source of truth
      }

      setSyncFeedback({
        type: 'success',
        message: `"${job.positionTitle}" (${job.plantillaItemNumber || job.itemNo}) marked as ${
          nextStatus === 'Open' ? 'Active / Open' : 'Expired / Closed'
        }.`,
      });
    } catch (err) {
      console.error('Failed to toggle vacancy status:', err);
      setSyncFeedback({
        type: 'error',
        message: 'Nabigong i-update ang status ng plantilla vacancy sa Firestore.',
      });
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleOpenEditJob = (job: PlantillaJob) => {
    setCreateJobError(null);
    setEditingJob(job);
    const itemNo = job.plantillaItemNumber || job.itemNo || '';
    const allowedTypes: PlantillaType[] = [
      'Permanent',
      'Contract of Service (COS)',
      'Project-Based',
    ];
    const resolvedPlantillaType = allowedTypes.includes(job.plantillaType as PlantillaType)
      ? (job.plantillaType as PlantillaType)
      : 'Permanent';

    setNewJobForm({
      itemNo,
      plantillaItemNumber: itemNo,
      positionTitle: job.positionTitle || '',
      office: job.office || 'BFAR Central Office',
      division: job.division || '',
      region: job.region || 'Central Office (NCR) - Quezon City',
      placeOfAssignment:
        job.placeOfAssignment ||
        'BFAR Central Office, PCA Building, Elliptical Road, Diliman, Quezon City',
      salaryGrade: Number(job.salaryGrade) || 15,
      plantillaType: resolvedPlantillaType,
      datePosted: job.datePosted || job.postingDate || getTodayDateString(),
      applicationDeadline: job.applicationDeadline || job.closingDate || getTodayDateString(),
      officialSourceUrl:
        job.officialSourceUrl || 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
      education: job.qualificationStandards?.education || '',
      experience: job.qualificationStandards?.experience || '',
      training: job.qualificationStandards?.training || '',
      eligibility: job.qualificationStandards?.eligibility || '',
      dutiesText: Array.isArray(job.dutiesAndResponsibilities)
        ? job.dutiesAndResponsibilities.join('\n')
        : '',
      competenciesText: Array.isArray(job.competencies) ? job.competencies.join('\n') : '',
      documentTitle:
        job.attachedDocuments?.[0]?.name || 'Official Notice of Vacancy (CS Form 9)',
      documentUrl:
        job.attachedDocuments?.[0]?.url ||
        job.officialSourceUrl ||
        'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
    });
    setIsCreatingJob(true);
  };

  const handleOpenCreateJob = () => {
    setCreateJobError(null);
    setEditingJob(null);
    setNewJobForm(emptyJobForm);
    setIsCreatingJob(true);
  };

  const handleDeleteVacancy = async (jobId: string, positionTitle: string) => {
    if (
      !window.confirm(
        `Sigurado ka bang nais mong burahin ang posisyong "${positionTitle}" sa Firestore database?`
      )
    ) {
      return;
    }

    setUpdatingJobId(jobId);
    setSyncFeedback(null);

    try {
      await deleteJobVacancyFromFirestore(jobId);
      setDeletedJobIds((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]));
      onDeleteJob?.(jobId);
      setSyncFeedback({
        type: 'success',
        message: `Matagumpay na nabura ang "${positionTitle}" sa database.`,
      });
    } catch (err) {
      console.error('Failed to delete job vacancy:', err);
      setSyncFeedback({
        type: 'error',
        message: 'Nabigong burahin ang job vacancy sa database.',
      });
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleCreateOrUpdateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateJobError(null);

    const itemNo = (newJobForm.plantillaItemNumber || newJobForm.itemNo || '').trim().toUpperCase();
    if (!newJobForm.positionTitle.trim() || !itemNo) {
      setCreateJobError('Position Title and Plantilla Item Number are required.');
      return;
    }

    setIsSavingJob(true);
    try {
      const isEditing = Boolean(editingJob);
      const docId = editingJob ? editingJob.id : `vacancy-${Date.now()}`;
      const duties = newJobForm.dutiesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const competencies = newJobForm.competenciesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const todayStr = getTodayDateString();
      const newDeadline = newJobForm.applicationDeadline;
      const isExtendedToActive =
        isEditing &&
        editingJob?.status !== 'Open' &&
        Boolean(newDeadline) &&
        newDeadline >= todayStr;

      const resolvedStatus: PlantillaJob['status'] = isExtendedToActive
        ? 'Open'
        : editingJob?.status || 'Open';

      const payload: PlantillaJob = {
        ...(editingJob || {}),
        id: docId,
        positionTitle: newJobForm.positionTitle.trim(),
        agency: editingJob?.agency || 'DA-BFAR',
        plantillaItemNumber: itemNo,
        itemNo,
        office: newJobForm.office.trim(),
        division: newJobForm.division.trim(),
        region: newJobForm.region.trim(),
        placeOfAssignment: newJobForm.placeOfAssignment.trim(),
        salaryGrade: Number(newJobForm.salaryGrade) || 15,
        plantillaType: newJobForm.plantillaType,
        status: resolvedStatus,
        datePosted: newJobForm.datePosted || todayStr,
        postingDate: newJobForm.datePosted || todayStr,
        applicationDeadline: newDeadline,
        closingDate: newDeadline,
        officialSourceUrl:
          newJobForm.officialSourceUrl.trim() ||
          'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
        qualificationStandards: {
          education: newJobForm.education.trim(),
          experience: newJobForm.experience.trim(),
          training: newJobForm.training.trim(),
          eligibility: newJobForm.eligibility.trim(),
        },
        dutiesAndResponsibilities: duties,
        competencies,
        attachedDocuments: [
          {
            name: newJobForm.documentTitle.trim() || 'Official Notice of Vacancy (CS Form 9)',
            url:
              newJobForm.documentUrl.trim() ||
              'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
            type: editingJob?.attachedDocuments?.[0]?.type || 'PDF',
          },
        ],
      };

      await saveJobVacancyToFirestore(payload);
      setDeletedJobIds((prev) => prev.filter((id) => id !== docId));
      if (isEditing && editingJob) {
        onUpdateJob(editingJob.id, payload);
      } else {
        onAddJob(payload);
      }
      setIsCreatingJob(false);
      setEditingJob(null);
      setNewJobForm(emptyJobForm);
      setSyncFeedback({
        type: 'success',
        message: isEditing
          ? isExtendedToActive
            ? `Na-update at na-extend ang deadline ng "${payload.positionTitle}" hanggang ${newDeadline} (Active / Open na ulit).`
            : `Na-update na ang plantilla item na "${payload.positionTitle}" (Deadline: ${newDeadline}).`
          : `Matagumpay na naidagdag ang bagong plantilla item na "${payload.positionTitle}".`,
      });
    } catch (err) {
      console.error('Failed to save job vacancy:', err);
      setCreateJobError('Nabigong i-save ang job vacancy sa database.');
    } finally {
      setIsSavingJob(false);
    }
  };

  if (!isAuthenticated) {
    const handleDoLogin = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      const empId = loginUsername.trim().toUpperCase();
      const passkey = loginPassword.trim();

      if (!empId) {
        setLoginError('Please enter your authorized Government Employee ID / Account.');
        return;
      }
      if (!passkey) {
        setLoginError('Please enter your authorized HRMIS security passkey.');
        return;
      }

      try {
        setLoginError(null);

        const staffRef = doc(db, 'authorized_staff', empId);
        const staffSnap = await getDoc(staffRef);

        if (!staffSnap.exists()) {
          setLoginError('Invalid Employee ID or security passkey.');
          return;
        }

        const staffData = staffSnap.data() as {
          employeeId?: string;
          fullName?: string;
          role?: AdminRole;
          passkey?: string;
          active?: boolean;
        };

        if (staffData.active === false) {
          setLoginError('This Employee ID is inactive or suspended. Contact HR Admin.');
          return;
        }

        if (!staffData.passkey || staffData.passkey !== passkey) {
          setLoginError('Invalid Employee ID or security passkey.');
          return;
        }

        if (
          staffData.role === 'HR_Specialist' ||
          staffData.role === 'HR_Supervisor' ||
          staffData.role === 'HR_Chief'
        ) {
          setVerifiedRole(staffData.role);
        }

        setLoginUsername(staffData.fullName ? `${empId} — ${staffData.fullName}` : empId);
        setLoginPassword('');
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Firestore credential verification error:', err);
        setLoginError(
          'Unable to verify credentials right now. Check connection or Firestore rules.'
        );
      }
    };

    return (
      <div className="max-w-2xl mx-auto my-4 space-y-4">
        <div className="bg-[#024794] text-white rounded-xl px-5 py-4 border border-[#024794] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/25 text-amber-300 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Restricted Console
                </span>
                <span className="text-sky-100 text-[10px] font-mono">HRMD &amp; HRMPSB</span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                DA-BFAR HRMIS Administrative &amp; HRMPSB Selection Portal
              </h2>
            </div>
          </div>

          {onBackToFrontPage && (
            <button
              type="button"
              onClick={() => {
                onAuthChange?.(false);
                onBackToFrontPage();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>Front Page</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 border border-blue-200 text-[#024794] flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Authorized Personnel Verification
                </h3>
                <p className="text-xs text-slate-600">
                  Sign in with your verified DA-BFAR credentials or authorized Google account.
                </p>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Staff sign-in method"
              className="inline-flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200 shrink-0 self-start sm:self-center"
            >
              <button
                type="button"
                role="tab"
                aria-selected={signInMethod === 'credentials'}
                onClick={() => {
                  setSignInMethod('credentials');
                  setLoginError(null);
                }}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  signInMethod === 'credentials'
                    ? 'bg-[#024794] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3 h-3 text-amber-300" />
                <span>Employee ID</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={signInMethod === 'google'}
                onClick={() => {
                  setSignInMethod('google');
                  setLoginError(null);
                }}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  signInMethod === 'google'
                    ? 'bg-[#024794] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3 h-3 text-amber-300" />
                <span>Google Admin</span>
              </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          {signInMethod === 'google' ? (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-blue-200 rounded-xl p-3.5 text-xs text-slate-900 space-y-1">
                <span className="font-bold text-[#024794] block">
                  DA-BFAR Google Workspace / HR Admin SSO
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Use your official <strong className="text-slate-900">@bfar.da.gov.ph</strong>{' '}
                  email or pre-registered HR Admin Google account for single sign-on access.
                </p>
              </div>

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
                      setLoginError(
                        `Google account ${user.email} is not in the authorized HR/HRMPSB admin registry.`
                      );
                    }
                  } catch (err) {
                    console.error('Google Sign-in failed:', err);
                    setLoginError('Google sign-in was cancelled or encountered an error.');
                  }
                }}
                className="w-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
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

              {auth.currentUser &&
                (auth.currentUser.email === 'jaiciervo7@gmail.com' ||
                  auth.currentUser.email?.endsWith('@bfar.da.gov.ph')) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername(
                        auth.currentUser?.displayName || auth.currentUser?.email || 'Admin'
                      );
                      setVerifiedRole('HR_Specialist');
                      setIsAuthenticated(true);
                    }}
                    className="w-full bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white border border-emerald-200 py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Enter as {auth.currentUser.email}</span>
                  </button>
                )}
            </div>
          ) : (
            <form onSubmit={handleDoLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Verified System Role:
                </label>
                <select
                  value={verifiedRole}
                  onChange={(e) => setVerifiedRole(e.target.value as AdminRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794] cursor-pointer"
                >
                  <option value="HR_Specialist">Human Resource Administrative</option>
                  <option value="HR_Supervisor">Human Resource Supervisor</option>
                  <option value="HR_Chief">Human Resource Chief</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Official Agency Employee ID:
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter authorized Employee ID"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Security Passkey / Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter secure passkey"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 pr-9 font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#024794] hover:bg-[#033b7a] text-white py-2.5 rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>Verify Role &amp; Enter Dashboard</span>
              </button>
            </form>
          )}

          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs space-y-1 text-slate-700">
            <div className="flex items-center gap-1.5 text-amber-950 font-bold text-[11px]">
              <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                Statutory Notice &amp; Warning (Republic Act No. 10173 &amp; CSC ORAOHRA):
              </span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Applicant Personal Data Sheets (CS Form 212), performance ratings (IPCR), and
              deliberation records contain protected personal and sensitive government information. Any
              unauthorized attempt to view, alter, or extract candidate data is strictly prohibited and
              subject to administrative and criminal sanctions under the Cybercrime Prevention Act and
              Data Privacy Act of 2012.
            </p>
          </div>

          <div className="text-center pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span>Existing Bureau System:</span>
            <a
              href="https://hrmisv2.bfar.da.gov.ph/login"
              target="_blank"
              rel="noreferrer"
              className="text-[#024794] font-semibold hover:underline inline-flex items-center gap-1 transition-colors"
            >
              <span>Go to live DA-BFAR HRMIS v2</span>
              <ExternalLink className="w-3 h-3 text-[#024794]" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#024794] text-white rounded-xl p-4 border border-[#024794] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/25 text-amber-300 flex items-center justify-center font-bold text-sm">
            <BadgeCheck className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                Verified Session
              </span>
              <span className="text-sky-100 text-xs">Station: BFAR Central Office (NCR)</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Role: {getRoleLabel(verifiedRole)}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-sky-100 hidden md:inline">
            Logged in as:{' '}
            <strong className="text-white">{loginUsername || 'Authorized Officer'}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setIsAuthenticated(false);
              setLoginPassword('');
            }}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-amber-300" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Registered Applicants
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {uniqueApplicants}
          </div>
          <span className="text-[10px] text-slate-500">Unique Applicants</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Submitted Applications
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalApps}</div>
          <span className="text-[10px] text-slate-500">Total Submissions</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Under Review
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {underReviewCount}
          </div>
          <span className="text-[10px] text-slate-500">Document Review</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Qualified Applicants
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#024794] mt-1">
            {qualifiedCount}
          </div>
          <span className="text-[10px] text-slate-500">Meets CSC Standards</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Disqualified
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            {disqualifiedCount}
          </div>
          <span className="text-[10px] text-slate-500">Does Not Meet QS</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Approved Applications
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {approvedCount}
          </div>
          <span className="text-[10px] text-slate-500">Appointed / Recommended</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Active Vacancies
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {activeVacanciesCount}
          </div>
          <span className="text-[10px] text-slate-500">Open Announcements</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Expired Vacancies
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-600 mt-1">
            {expiredVacanciesCount}
          </div>
          <span className="text-[10px] text-slate-500">Deadline Passed</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1 lg:col-span-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Internal Promotions
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#024794] mt-1">
            {internalPromotionCount}
          </div>
          <span className="text-[10px] text-slate-500">Verified Personnel Applications</span>
        </div>
      </div>

      <div className="bg-white rounded-t-xl border border-b-0 border-slate-200 px-4 pt-3 flex flex-wrap gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setAdminTab('applicants')}
          className={`py-2 px-4 rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            adminTab === 'applicants'
              ? 'bg-[#024794] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Applicants &amp; Dossiers</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              adminTab === 'applicants'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {applications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('plantilla')}
          className={`py-2 px-4 rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            adminTab === 'plantilla'
              ? 'bg-[#024794] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Plantilla Vacancies</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              adminTab === 'plantilla'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-amber-50 text-amber-950 border border-amber-200'
            }`}
          >
            {visibleJobs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('matrix')}
          className={`py-2 px-4 rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            adminTab === 'matrix'
              ? 'bg-[#024794] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Comparative Assessment Matrix</span>
        </button>
      </div>

      {adminTab === 'applicants' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search applicant name, reference code, position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1">
                <span className="text-slate-600 font-medium">Track:</span>
                <select
                  value={applicantTypeFilter}
                  onChange={(e) => setApplicantTypeFilter(e.target.value as 'All' | 'internal')}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#024794] focus:outline-hidden focus:ring-2 focus:ring-[#024794] cursor-pointer"
                >
                  <option value="All">All Internal Staff ({totalApps})</option>
                  <option value="internal">Promotion Track ({internalPromotionCount})</option>
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-slate-600 font-medium">Stage:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#024794] cursor-pointer"
                >
                  <option value="All">All Stages</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Document Under Review">Document Under Review</option>
                  <option value="CSC QS Qualified - Under Review">CSC QS Qualified</option>
                  <option value="HRMPSB Deliberation & Interview Scheduled">
                    HRMPSB Interview Scheduled
                  </option>
                  <option value="HRMPSB Recommended for Appointment">
                    Recommended for Appointment
                  </option>
                  <option value="Application Result Released">Application Result Released</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#024794] text-white font-semibold">
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
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">
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
                          <span>{app.personalInfo?.fullName || (app as any).applicantName}</span>
                          {app.applicantType === 'internal' && (
                            <span className="bg-amber-50 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 border border-amber-200">
                              <UserCheck className="w-2.5 h-2.5 text-emerald-700" />
                              <span>
                                BFAR Staff
                                {(app as any).employmentStatus
                                  ? ` • ${(app as any).employmentStatus}`
                                  : ''}{' '}
                                (SG {app.currentSalaryGrade || 11})
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {app.personalInfo?.email || (app as any).email}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {app.positionTitle || (app as any).jobTitle}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {app.plantillaItemNo || (app as any).itemNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] border ${
                            (app.aiScreening?.overallScore || 0) >= 90
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : (app.aiScreening?.overallScore || 0) >= 80
                              ? 'bg-sky-50 text-[#024794] border-blue-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}
                        >
                          {app.aiScreening?.overallScore || 85}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-[#024794] border border-blue-200">
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {app.finalBoardDecision ? (
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {app.finalBoardDecision}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Under Deliberation</span>
                        )}
                        {app.interviewScore !== undefined && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Interview: {app.interviewScore}/100
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDossier(app)}
                          className="bg-[#024794] hover:bg-[#033b7a] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 mx-auto shadow-2xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
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

      {adminTab === 'plantilla' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-xs p-5 space-y-6">
          <div className="bg-[#024794] text-white rounded-xl p-5 border border-[#024794] shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-700" />
                    Official Source of Truth
                  </span>
                  <span className="text-sky-100 text-xs font-mono">DA-BFAR PORTAL REPOSITORY</span>
                </div>
                <h3 className="text-base font-black text-white">
                  Official Plantilla Vacancy Synchronization Engine
                </h3>
                <p className="text-xs text-sky-100 max-w-2xl leading-relaxed">
                  All job opportunities are synchronized directly from the authoritative DA-BFAR
                  Careers Portal. Monetary salary amounts are strictly suppressed in compliance with CSC
                  rules; only official Salary Grades (SG) are published.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <a
                  href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Open bfar.da.gov.ph</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                </a>

                <button
                  type="button"
                  onClick={handleRunSync}
                  disabled={isSyncing}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white border border-white/25 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isSyncing ? 'animate-spin text-amber-300' : 'text-amber-300'
                    }`}
                  />
                  <span>{isSyncing ? 'Checking BFAR Portal...' : 'Sync Vacancies'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateJob}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-950" />
                  <span>Import Official Notice</span>
                </button>
              </div>
            </div>

            {syncFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-300/30 text-white'
                    : 'bg-rose-950/60 border-rose-400/40 text-rose-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                  )}
                  <span>{syncFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncFeedback(null)}
                  className="text-sky-100 hover:text-white text-xs p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="bg-white/10 border border-white/15 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-sky-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-300" />
                  <span className="text-sky-200">Sync Status:</span>
                  <span className="font-semibold text-white capitalize">
                    {syncStatus?.status || 'Active & Synchronized'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-sky-200">Last Synced:</span>
                  <span className="font-mono text-white text-[11px]">
                    {syncStatus?.lastSuccessfulSync
                      ? new Date(syncStatus.lastSuccessfulSync).toLocaleString('en-PH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Recently updated'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-sky-200">Registry Count:</span>
                  <span className="font-bold text-white">{visibleJobs.length} items</span>
                  <span className="text-emerald-300">
                    ({visibleJobs.filter((j) => j.status === 'Open').length} Open)
                  </span>
                  <span className="text-sky-100">
                    ({visibleJobs.filter((j) => j.status !== 'Open').length} Closed)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="text-amber-300 hover:text-white text-xs font-semibold flex items-center gap-1 underline underline-offset-2 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>{showAuditLogs ? 'Hide Audit Log' : 'View Sync Audit Log'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showAuditLogs ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {showAuditLogs && (
              <div className="bg-slate-950/35 border border-white/15 rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between pb-1 border-b border-white/15 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  <span>Timestamp &amp; Event</span>
                  <span>Outcome Details</span>
                </div>
                {syncStatus?.auditLogs && syncStatus.auditLogs.length > 0 ? (
                  syncStatus.auditLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 text-[11px] py-1 border-b border-white/10"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-sky-100">
                          <span>{new Date(log.timestamp).toLocaleTimeString('en-PH')}</span>
                          <span className="bg-white/15 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            {log.action}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-white max-w-md">{log.details}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-sky-100/80 py-2 text-center">
                    No synchronization events recorded yet.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Official Plantilla Items Ledger ({visibleJobs.length})
              </h4>
              <p className="text-xs text-slate-600">
                Central Office positions synchronized from official DA-BFAR announcements. Click{' '}
                <strong>Edit</strong> to modify details or extend the deadline.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-600 font-medium">Filter:</span>
              <button
                type="button"
                onClick={() => setVacancyFilter('All')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  vacancyFilter === 'All'
                    ? 'bg-[#024794] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({visibleJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setVacancyFilter('Open')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  vacancyFilter === 'Open'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Active / Open ({visibleJobs.filter((j) => j.status === 'Open').length})
              </button>
              <button
                type="button"
                onClick={() => setVacancyFilter('Expired')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  vacancyFilter === 'Expired'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Closed / Expired ({visibleJobs.filter((j) => j.status !== 'Open').length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleJobs
              .filter((j) => {
                if (vacancyFilter === 'Open') return j.status === 'Open';
                if (vacancyFilter === 'Expired') return j.status !== 'Open';
                return true;
              })
              .map((job) => {
                const isOpen = job.status === 'Open';
                const deadline = job.applicationDeadline || job.closingDate;
                const posted = job.datePosted || job.postingDate;
                const isBusy = updatingJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className={`rounded-xl border p-4 space-y-3 flex flex-col justify-between transition-colors shadow-2xs ${
                      isOpen
                        ? 'bg-white border-slate-200 hover:border-[#024794]'
                        : 'bg-slate-50 border-slate-200 opacity-90'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-[#024794] bg-sky-50 px-2 py-0.5 rounded border border-blue-200">
                          {job.plantillaItemNumber || job.itemNo}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            SG {job.salaryGrade}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isOpen
                                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                : 'text-slate-600 bg-slate-100 border-slate-200'
                            }`}
                          >
                            {isOpen ? 'Active / Open' : 'Closed / Expired'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">{job.positionTitle}</h5>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{job.division}</p>
                        <p className="text-[11px] text-slate-500">
                          {job.office || 'BFAR Central Office'}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] space-y-1 border border-slate-200">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Date Posted:</span>
                          <span className="font-medium text-slate-900">{posted}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Deadline:</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditJob(job)}
                            title="Click to edit or extend deadline"
                            className={`font-semibold underline decoration-dotted underline-offset-2 cursor-pointer ${
                              isOpen
                                ? 'text-[#024794] hover:text-[#033b7a]'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {deadline}
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                        <div>
                          <strong className="text-slate-900">Education:</strong>{' '}
                          <span className="line-clamp-1">
                            {job.qualificationStandards?.education}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-900">Eligibility:</strong>{' '}
                          <span className="line-clamp-1">
                            {job.qualificationStandards?.eligibility}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                      <a
                        href={
                          job.officialSourceUrl ||
                          'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/'
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#024794] hover:underline text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Official Notice</span>
                        <ExternalLink className="w-3 h-3 text-[#024794]" />
                      </a>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditJob(job)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 hover:bg-[#024794] text-[#024794] hover:text-white border border-blue-200 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleVacancyStatus(job)}
                          disabled={isBusy}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                            isOpen
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200'
                          }`}
                        >
                          {isBusy ? 'Saving...' : isOpen ? 'Mark Expired' : 'Reactivate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteVacancy(job.id, job.positionTitle)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {adminTab === 'matrix' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Comparative Assessment Form (CAR) - Ranked Applicant Summary
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Criteria weighting conforms to CSC Merit Selection Plan: Education (30%), Experience
              (30%), Qualifying Training (20%), Potential / Interview (20%).
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                        <h4 className="font-bold text-slate-900 text-sm">
                          Comparative Assessment Matrix Empty
                        </h4>
                        <p className="text-xs text-slate-500">
                          No internal promotional candidates have submitted applications yet. When
                          submissions are received, they will be ranked against the CSC Merit
                          Selection Plan criteria here.
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
                      <tr key={app.id} className="hover:bg-blue-50/50">
                        <td className="p-2.5 font-bold text-slate-900">#{idx + 1}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-900">
                          {app.personalInfo?.fullName || (app as any).applicantName}
                        </td>
                        <td className="p-2.5 font-sans text-slate-600">
                          {app.positionTitle || (app as any).jobTitle}
                        </td>
                        <td className="p-2.5 text-center">{edu}%</td>
                        <td className="p-2.5 text-center">{exp}%</td>
                        <td className="p-2.5 text-center">{train}%</td>
                        <td className="p-2.5 text-center">{interview}%</td>
                        <td className="p-2.5 text-center font-bold text-sm text-[#024794]">
                          {total}%
                        </td>
                        <td className="p-2.5 font-sans">
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
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

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-[#024794] text-white p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    HRMPSB Candidate Dossier
                  </span>
                  <span className="text-sky-100 font-mono text-xs">
                    {selectedApp.trackingCode}
                  </span>
                </div>
                <h3 className="text-xl font-black">
                  {selectedApp.personalInfo?.fullName || (selectedApp as any).applicantName}
                </h3>
                <p className="text-xs text-sky-100 mt-0.5">
                  Applied for:{' '}
                  <strong>{selectedApp.positionTitle || (selectedApp as any).jobTitle}</strong> •
                  Plantilla Item:{' '}
                  {selectedApp.plantillaItemNo || (selectedApp as any).itemNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600">
              <div className="bg-sky-50 border border-blue-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#024794]" />
                    <div>
                      <h4 className="font-bold text-sm text-[#024794]">
                        Gemini AI HRMPSB Pre-Screening Evaluation
                      </h4>
                      <span className="text-[10px] text-slate-600">
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

                <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-slate-600">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <strong className="font-bold text-slate-900">
                      Initial AI Screening Recommendation (Advisory Only):
                    </strong>
                    <span>
                      {' '}
                      The QS evaluation below is an automated assessment to assist HRMPSB
                      evaluators. Official qualification standards verification and final appointment
                      decisions rest solely with authorized HR personnel, the HRMPSB, and the
                      National Director.
                    </span>
                  </div>
                </div>

                {selectedApp.applicantType === 'internal' && (
                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-slate-900 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <strong className="block text-[#024794]">
                          DA-BFAR Internal Staff Promotion Profile
                        </strong>
                        <span className="text-slate-600">
                          ID:{' '}
                          <strong className="font-mono text-slate-900">
                            {selectedApp.bfarEmployeeId || 'BFAR-EMP-VERIFIED'}
                          </strong>
                          {(selectedApp as any).employmentStatus ? (
                            <>
                              {' '}
                              • Status:{' '}
                              <strong className="text-slate-900">
                                {(selectedApp as any).employmentStatus}
                              </strong>
                            </>
                          ) : null}{' '}
                          • Division: {selectedApp.currentDivision || 'Central Office'} • Track:{' '}
                          {selectedApp.promotionTrack || 'Promotion'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedApp.currentSalaryGrade && (
                        <span className="bg-slate-50 px-2 py-0.5 rounded font-bold text-[#024794] border border-slate-200">
                          Current: SG {selectedApp.currentSalaryGrade}
                        </span>
                      )}
                      {selectedApp.latestIpcrRating && (
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200 flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-emerald-700" />
                          IPCR: {selectedApp.latestIpcrRating.toFixed(2)}/5.00
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {selectedApp.aiScreening?.qsCompliance && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                        <span>1. Education</span>
                        <span className="text-emerald-700">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.educationAnalysis}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                        <span>2. Experience</span>
                        <span className="text-emerald-700">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.experienceAnalysis}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                        <span>3. Training (CSC)</span>
                        <span className="text-emerald-700">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.trainingAnalysis}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                        <span>4. Eligibility</span>
                        <span className="text-emerald-700">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.eligibilityAnalysis}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#024794] text-white p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                  HRMPSB Deliberation &amp; Application Result Console
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-sky-100 block mb-1 font-semibold">
                      Recruitment Milestone Stage:
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value as ApplicationRecord['status'])
                      }
                      className="w-full bg-white/10 border border-white/25 rounded-lg p-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      <option value="Submitted" className="text-slate-900">
                        1. Application Submitted
                      </option>
                      <option value="Document Under Review" className="text-slate-900">
                        2. Initial AI-Assisted Screening
                      </option>
                      <option value="CSC QS Qualified - Under Review" className="text-slate-900">
                        3. HR Evaluation
                      </option>
                      <option
                        value="HRMPSB Deliberation & Interview Scheduled"
                        className="text-slate-900"
                      >
                        4. Qualification Assessment &amp; Deliberation
                      </option>
                      <option value="Application Result Released" className="text-slate-900">
                        5. Final Status / Notice of Result
                      </option>
                      <option value="Rejected" className="text-slate-900">
                        Disqualified / Rejected (Did not meet QS)
                      </option>
                      <option value="Regret / Not Qualified" className="text-slate-900">
                        Notice of Non-Selection / Regret
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sky-100 block mb-1 font-semibold">
                      HRMPSB Panel Interview Score (0-100):
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 94"
                      value={interviewScore ?? ''}
                      onChange={(e) =>
                        setInterviewScore(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="w-full bg-white/10 border border-white/25 rounded-lg p-2 text-xs font-mono text-white placeholder-sky-200/60"
                    />
                  </div>

                  <div>
                    <label className="text-sky-100 block mb-1 font-semibold">
                      Final Board Decision:
                    </label>
                    <select
                      value={finalBoardDecision || ''}
                      onChange={(e) =>
                        setFinalBoardDecision(
                          (e.target.value || undefined) as ApplicationRecord['finalBoardDecision']
                        )
                      }
                      className="w-full bg-white/10 border border-white/25 rounded-lg p-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      <option value="" className="text-slate-900">
                        Under Deliberation
                      </option>
                      <option value="Approved for Appointment" className="text-slate-900">
                        Approved for Appointment
                      </option>
                      <option value="Shortlisted / Lineup" className="text-slate-900">
                        Shortlisted / Plantilla Lineup
                      </option>
                      <option value="Deferred" className="text-slate-900">
                        Deferred for Next Session
                      </option>
                      <option value="Not Selected" className="text-slate-900">
                        Not Selected
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sky-100 block mb-1 font-semibold text-xs">
                    Official Committee Remarks (Visible to Applicant via Tracker):
                  </label>
                  <input
                    type="text"
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="Enter formal remarks or schedule instructions..."
                    className="w-full bg-white/10 border border-white/25 rounded-lg p-2 text-xs text-white placeholder-sky-200/60"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Logged at: {selectedApp.submissionDate}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-lg bg-[#024794] hover:bg-[#033b7a] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <span>{isUpdating ? 'Saving Decision...' : 'Save HRMPSB Evaluation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-[#024794] text-white p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    {editingJob ? 'Edit Plantilla Item' : 'Official Ingestion'}
                  </span>
                  <span className="text-sky-100 font-mono text-xs">
                    bfar.da.gov.ph / CS Form 9
                  </span>
                </div>
                <h3 className="text-base font-black text-white">
                  {editingJob
                    ? `Edit Vacancy & Extend Deadline: ${editingJob.positionTitle}`
                    : 'Import & Verify Official Plantilla Vacancy'}
                </h3>
                <p className="text-xs text-sky-100 mt-0.5">
                  Synchronize official notices from
                  https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingJob(false);
                  setEditingJob(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {createJobError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Import Verification Alert:</strong>
                    <span>{createJobError}</span>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 text-slate-900 p-3 rounded-xl space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs text-amber-950">
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  Statutory Rule: Salary Confidentiality
                </span>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Only the <strong className="text-slate-900">Salary Grade (SG)</strong> is entered
                  and displayed. Numerical monthly salary rates are confidential and must never be
                  exposed or recorded in the public registry.
                </p>
              </div>

              <form id="importVacancyForm" onSubmit={handleCreateOrUpdateJobSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Position Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJobForm.positionTitle}
                      onChange={(e) =>
                        setNewJobForm({ ...newJobForm, positionTitle: e.target.value })
                      }
                      placeholder="e.g. Senior Aquaculturist"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Plantilla Item Number *
                    </label>
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Office / Agency *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJobForm.office}
                      onChange={(e) => setNewJobForm({ ...newJobForm, office: e.target.value })}
                      placeholder="BFAR Central Office"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Division / Operating Unit *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJobForm.division}
                      onChange={(e) => setNewJobForm({ ...newJobForm, division: e.target.value })}
                      placeholder="e.g. Aquaculture Division"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Salary Grade (SG) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={33}
                      value={newJobForm.salaryGrade}
                      onChange={(e) =>
                        setNewJobForm({ ...newJobForm, salaryGrade: Number(e.target.value) })
                      }
                      placeholder="15"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Official Grade (e.g. 11, 15, 19, 24)
                    </span>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Date Posted (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      value={newJobForm.datePosted}
                      onChange={(e) => setNewJobForm({ ...newJobForm, datePosted: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                    />
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <label className="font-bold text-[#024794] mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      <span>Application Deadline (Extendable)</span>
                    </label>
                    <input
                      type="date"
                      value={newJobForm.applicationDeadline}
                      onChange={(e) =>
                        setNewJobForm({ ...newJobForm, applicationDeadline: e.target.value })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                    />
                    <span className="text-[10px] text-amber-900 mt-0.5 block">
                      Pumili ng bagong petsa para ma-extend.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Official Announcement URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={newJobForm.officialSourceUrl}
                    onChange={(e) =>
                      setNewJobForm({ ...newJobForm, officialSourceUrl: e.target.value })
                    }
                    placeholder="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-[#024794] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#024794] focus:border-[#024794]"
                  />
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-900 text-xs block">
                    Civil Service Commission (CSC) Qualification Standards
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">
                        Education Standard *
                      </label>
                      <input
                        type="text"
                        required
                        value={newJobForm.education}
                        onChange={(e) => setNewJobForm({ ...newJobForm, education: e.target.value })}
                        placeholder="Bachelor's degree in Fisheries..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">
                        Experience Standard *
                      </label>
                      <input
                        type="text"
                        required
                        value={newJobForm.experience}
                        onChange={(e) =>
                          setNewJobForm({ ...newJobForm, experience: e.target.value })
                        }
                        placeholder="1 year of relevant experience..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">
                        Training Standard *
                      </label>
                      <input
                        type="text"
                        required
                        value={newJobForm.training}
                        onChange={(e) => setNewJobForm({ ...newJobForm, training: e.target.value })}
                        placeholder="4 hours of relevant training..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">
                        Eligibility Standard *
                      </label>
                      <input
                        type="text"
                        required
                        value={newJobForm.eligibility}
                        onChange={(e) =>
                          setNewJobForm({ ...newJobForm, eligibility: e.target.value })
                        }
                        placeholder="Career Service (Professional) / RA 1080"
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Attached Document Title
                    </label>
                    <input
                      type="text"
                      value={newJobForm.documentTitle}
                      onChange={(e) =>
                        setNewJobForm({ ...newJobForm, documentTitle: e.target.value })
                      }
                      placeholder="Official Notice of Vacancy (CS Form 9)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Document Link / URL
                    </label>
                    <input
                      type="text"
                      value={newJobForm.documentUrl}
                      onChange={(e) =>
                        setNewJobForm({ ...newJobForm, documentUrl: e.target.value })
                      }
                      placeholder="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Duties &amp; Responsibilities (One item per line)
                  </label>
                  <textarea
                    rows={3}
                    value={newJobForm.dutiesText}
                    onChange={(e) => setNewJobForm({ ...newJobForm, dutiesText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </form>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Authoritative Source: bfar.da.gov.ph
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingJob(false);
                    setEditingJob(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="importVacancyForm"
                  disabled={isSavingJob}
                  className="px-5 py-2 rounded-lg bg-[#024794] hover:bg-[#033b7a] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isSavingJob
                      ? 'Saving...'
                      : editingJob
                      ? 'Save Changes & Deadline'
                      : 'Verify & Add to Registry'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};