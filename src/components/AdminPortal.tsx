import React, { useState, useEffect } from 'react';
import { PlantillaJob, ApplicationRecord, VacancySyncStatus } from '../types';
import {
  updateApplicationInFirestore,
  deleteJobVacancyFromFirestore,
  saveJobVacancyToFirestore,
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
  ShieldAlert,
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

interface AdminPortalProps {
  jobs: PlantillaJob[];
  applications: ApplicationRecord[];
  onUpdateApplication: (appId: string, updates: Partial<ApplicationRecord>) => void;
  onAddJob: (job: Partial<PlantillaJob>) => void;
  onUpdateJob: (jobId: string, updates: Partial<PlantillaJob>) => void;
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
  plantillaType: 'Permanent' | 'Contract of Service (COS)' | 'Project-Based';
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
  const [finalBoardDecision, setFinalBoardDecision] = useState<ApplicationRecord['finalBoardDecision']>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);

  const [syncStatus, setSyncStatus] = useState<VacancySyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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
      const res = await fetch(`/api/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success && json.data) {
        try {
          await updateApplicationInFirestore(selectedApp.id, updates);
        } catch (fErr) {
          console.warn('Firestore update sync error handled:', fErr);
        }
        onUpdateApplication(selectedApp.id, json.data);
        setSelectedApp(json.data);
      } else {
        await updateApplicationInFirestore(selectedApp.id, updates);
        onUpdateApplication(selectedApp.id, updates);
        setSelectedApp({ ...selectedApp, ...updates });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

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
    } catch {
      setSyncFeedback({
        type: 'error',
        message: 'Network error communicating with vacancy synchronization engine.',
      });
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
    const allowedTypes: Array<'Permanent' | 'Contract of Service (COS)' | 'Project-Based'> = [
      'Permanent',
      'Contract of Service (COS)',
      'Project-Based',
    ];
    const resolvedPlantillaType = allowedTypes.includes(
      job.plantillaType as 'Permanent' | 'Contract of Service (COS)' | 'Project-Based'
    )
      ? (job.plantillaType as 'Permanent' | 'Contract of Service (COS)' | 'Project-Based')
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
      datePosted: job.datePosted || job.postingDate || new Date().toISOString().split('T')[0],
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
    if (!window.confirm(`Sigurado ka bang nais mong burahin ang posisyong "${positionTitle}" sa Firestore database?`)) {
      return;
    }

    setUpdatingJobId(jobId);
    setSyncFeedback(null);

    try {
      await deleteJobVacancyFromFirestore(jobId);
      setDeletedJobIds((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]));
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

    try {
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
        setLoginError('Unable to verify credentials right now. Check connection or Firestore rules.');
      }
    };

    return (
      <div className="max-w-2xl mx-auto my-4 space-y-4">
        <div className="bg-[#071A2F] text-white rounded-sm px-5 py-4 border border-[#0F3557] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-sm bg-[#0F3557] border border-[#C69214]/50 text-[#C69214] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#C69214] text-[#071A2F] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  Restricted Console
                </span>
                <span className="text-[#DCE2E8] text-[10px] font-mono">HRMD &amp; HRMPSB</span>
              </div>
              <h2
                className="text-sm sm:text-base font-bold text-white truncate mt-0.5"
                style={{ fontFamily: "'Libre Baskerville', 'Cormorant Garamond', Georgia, serif" }}
              >
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-[#DCE2E8]/25 bg-[#0F3557] hover:bg-[#0D4F3C] text-[11px] font-semibold text-white transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C69214]" />
              <span>Front Page</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-sm border border-[#DCE2E8] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE2E8]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#FBF7EC] border border-[#C69214]/50 text-[#0F3557] flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0F172A]">
                  Authorized Personnel Verification
                </h3>
                <p className="text-xs text-[#475569]">
                  Sign in with your verified DA-BFAR credentials or authorized Google account.
                </p>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Staff sign-in method"
              className="inline-flex items-center bg-[#F6F7F9] p-0.5 rounded-sm border border-[#DCE2E8] shrink-0 self-start sm:self-center"
            >
              <button
                type="button"
                role="tab"
                aria-selected={signInMethod === 'credentials'}
                onClick={() => {
                  setSignInMethod('credentials');
                  setLoginError(null);
                }}
                className={`px-2.5 py-1.5 rounded-sm text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  signInMethod === 'credentials'
                    ? 'bg-[#0F3557] text-white'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <KeyRound className="w-3 h-3 text-[#C69214]" />
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
                className={`px-2.5 py-1.5 rounded-sm text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  signInMethod === 'google'
                    ? 'bg-[#0F3557] text-white'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <LogIn className="w-3 h-3 text-[#C69214]" />
                <span>Google Admin</span>
              </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-sm flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          {signInMethod === 'google' ? (
            <div className="space-y-4">
              <div className="bg-[#EBF5F1] border border-[#0D4F3C]/25 rounded-sm p-3 text-xs text-[#0F172A] space-y-1">
                <span className="font-bold text-[#0D4F3C] block">
                  DA-BFAR Google Workspace / HR Admin SSO
                </span>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Use your official <strong className="text-[#0F172A]">@bfar.da.gov.ph</strong> email or pre-registered HR Admin Google
                  account for single sign-on access.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const user = await signInWithGoogle();
                    const isAuthorized =
                      user.email === 'jaiciervo7@gmail.com' || user.email?.endsWith('@bfar.da.gov.ph');
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
                className="w-full bg-white hover:bg-[#F6F7F9] text-[#0F172A] border border-[#DCE2E8] py-2.5 rounded-sm font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                      setLoginUsername(auth.currentUser?.displayName || auth.currentUser?.email || 'Admin');
                      setVerifiedRole('HR_Specialist');
                      setIsAuthenticated(true);
                    }}
                    className="w-full bg-[#EBF5F1] hover:bg-[#0D4F3C] text-[#0D4F3C] hover:text-white border border-[#0D4F3C]/30 py-2 rounded-sm font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Enter as {auth.currentUser.email}</span>
                  </button>
                )}
            </div>
          ) : (
            <form onSubmit={handleDoLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#0F172A] block mb-1">Verified System Role:</label>
                <select
                  value={verifiedRole}
                  onChange={(e) => setVerifiedRole(e.target.value as AdminRole)}
                  className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2.5 font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F3557]"
                >
                  <option value="HR_Specialist">HR Administrative</option>
                  <option value="HR_Supervisor">HR Supervisor</option>
                  <option value="HR_Chief">HR Chief</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Official Agency Employee ID:</label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter authorized Employee ID"
                    className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2.5 font-mono text-[#0F172A] focus:outline-none focus:border-[#0F3557]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Security Passkey / Password:</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter secure passkey"
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2.5 pr-9 font-mono text-[#0F172A] focus:outline-none focus:border-[#0F3557]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#475569] hover:text-[#0F172A] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#0F3557] hover:bg-[#071A2F] text-white py-2.5 rounded-sm font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#C69214]" />
                <span>Verify Role &amp; Enter Dashboard</span>
              </button>
            </form>
          )}

          <div className="bg-[#FBF7EC] border border-[#DCE2E8] p-3.5 rounded-sm text-xs space-y-1 text-[#475569]">
            <div className="flex items-center gap-1.5 text-[#071A2F] font-bold text-[11px]">
              <Lock className="w-3.5 h-3.5 text-[#C69214] shrink-0" />
              <span>Statutory Notice &amp; Warning (Republic Act No. 10173 &amp; CSC ORAOHRA):</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Applicant Personal Data Sheets (CS Form 212), performance ratings (IPCR), and deliberation records
              contain protected personal and sensitive government information. Any unauthorized attempt to view,
              alter, or extract candidate data is strictly prohibited and subject to administrative and criminal
              sanctions under the Cybercrime Prevention Act and Data Privacy Act of 2012.
            </p>
          </div>

          <div className="text-center pt-2 border-t border-[#DCE2E8] flex items-center justify-between text-[11px] text-[#475569]">
            <span>Existing Bureau System:</span>
            <a
              href="https://hrmisv2.bfar.da.gov.ph/login"
              target="_blank"
              rel="noreferrer"
              className="text-[#0F3557] font-semibold hover:text-[#C69214] inline-flex items-center gap-1 transition-colors"
            >
              <span>Go to live DA-BFAR HRMIS v2</span>
              <ExternalLink className="w-3 h-3 text-[#C69214]" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#071A2F] text-white rounded-sm p-4 border border-[#0F3557] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-[#0D4F3C]/40 border border-[#0D4F3C] text-[#C69214] flex items-center justify-center font-bold text-sm">
            <BadgeCheck className="w-5 h-5 text-[#C69214]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#0D4F3C] text-white font-bold text-[10px] px-2 py-0.5 rounded-sm uppercase">
                Verified Session
              </span>
              <span className="text-[#DCE2E8] text-xs">Station: BFAR Central Office (NCR)</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">Role: {getRoleLabel(verifiedRole)}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#DCE2E8] hidden md:inline">
            Logged in as: <strong className="text-white">{loginUsername || 'Authorized Officer'}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setIsAuthenticated(false);
              setLoginPassword('');
            }}
            className="bg-[#0F3557] hover:bg-[#0D4F3C] text-white border border-[#DCE2E8]/25 px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#C69214]" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8]">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Registered Applicants</span>
          <div className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-1">{uniqueApplicants}</div>
          <span className="text-[10px] text-[#475569]">Unique Applicants</span>
        </div>
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8]">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Submitted Applications</span>
          <div className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-1">{totalApps}</div>
          <span className="text-[10px] text-[#475569]">Total Submissions</span>
        </div>
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8]">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Under Review</span>
          <div className="text-xl sm:text-2xl font-bold text-[#C69214] mt-1">{underReviewCount}</div>
          <span className="text-[10px] text-[#475569]">Document Review</span>
        </div>
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8]">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Qualified Applicants</span>
          <div className="text-xl sm:text-2xl font-bold text-[#0F3557] mt-1">{qualifiedCount}</div>
          <span className="text-[10px] text-[#475569]">Meets CSC Standards</span>
        </div>
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8]">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Disqualified</span>
          <div className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{disqualifiedCount}</div>
          <span className="text-[10px] text-[#475569]">Does Not Meet QS</span>
        </div>
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8]">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Approved Applications</span>
          <div className="text-xl sm:text-2xl font-bold text-[#0D4F3C] mt-1">{approvedCount}</div>
          <span className="text-[10px] text-[#475569]">Appointed / Recommended</span>
        </div>
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8]">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Active Vacancies</span>
          <div className="text-xl sm:text-2xl font-bold text-[#0D4F3C] mt-1">{activeVacanciesCount}</div>
          <span className="text-[10px] text-[#475569]">Open Announcements</span>
        </div>
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8]">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Expired Vacancies</span>
          <div className="text-xl sm:text-2xl font-bold text-[#475569] mt-1">{expiredVacanciesCount}</div>
          <span className="text-[10px] text-[#475569]">Deadline Passed</span>
        </div>
        <div className="bg-white p-3.5 rounded-sm border border-[#DCE2E8] col-span-2 sm:col-span-1 lg:col-span-2">
          <span className="text-[10px] font-bold text-[#475569] uppercase block">Internal Promotions</span>
          <div className="text-xl sm:text-2xl font-bold text-[#0F3557] mt-1">{internalPromotionCount}</div>
          <span className="text-[10px] text-[#475569]">Verified Personnel Applications</span>
        </div>
      </div>

      <div className="bg-white rounded-t-sm border border-b-0 border-[#DCE2E8] px-4 pt-3 flex space-x-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setAdminTab('applicants')}
          className={`py-2 px-4 rounded-t-sm transition-colors flex items-center gap-1.5 cursor-pointer ${
            adminTab === 'applicants'
              ? 'bg-[#0F3557] text-white'
              : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F6F7F9]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Applicants &amp; Dossiers</span>
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-sm">
            {applications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('plantilla')}
          className={`py-2 px-4 rounded-t-sm transition-colors flex items-center gap-1.5 cursor-pointer ${
            adminTab === 'plantilla'
              ? 'bg-[#0F3557] text-white'
              : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F6F7F9]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Plantilla Vacancies</span>
          <span className="bg-[#FBF7EC] text-[#071A2F] text-[10px] px-1.5 py-0.5 rounded-sm">
            {visibleJobs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('matrix')}
          className={`py-2 px-4 rounded-t-sm transition-colors flex items-center gap-1.5 cursor-pointer ${
            adminTab === 'matrix'
              ? 'bg-[#0F3557] text-white'
              : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F6F7F9]'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Comparative Assessment Matrix</span>
        </button>
      </div>

      {adminTab === 'applicants' && (
        <div className="bg-white rounded-b-sm border border-[#DCE2E8] overflow-hidden">
          <div className="p-4 bg-[#F6F7F9] border-b border-[#DCE2E8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search applicant name, reference code, position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-[#DCE2E8] rounded-sm pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#0F3557]"
              />
              <Search className="w-3.5 h-3.5 text-[#475569] absolute left-2.5 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1">
                <span className="text-[#475569] font-medium">Track:</span>
                <select
                  value={applicantTypeFilter}
                  onChange={(e) => setApplicantTypeFilter(e.target.value as 'All' | 'internal')}
                  className="bg-white border border-[#DCE2E8] rounded-sm px-2 py-1.5 text-xs font-semibold text-[#0F3557]"
                >
                  <option value="All">All Internal Staff ({totalApps})</option>
                  <option value="internal">Promotion Track ({internalPromotionCount})</option>
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-[#475569] font-medium">Stage:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-[#DCE2E8] rounded-sm px-2 py-1.5 text-xs font-semibold text-[#0F172A]"
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#071A2F] text-white font-semibold">
                  <th className="py-2.5 px-3">Reference No.</th>
                  <th className="py-2.5 px-3">Applicant Name</th>
                  <th className="py-2.5 px-3">Plantilla Position</th>
                  <th className="py-2.5 px-3">AI QS Fit Score</th>
                  <th className="py-2.5 px-3">Current Milestone</th>
                  <th className="py-2.5 px-3">Board Decision</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE2E8]">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center space-y-2">
                        <div className="w-12 h-12 rounded-sm bg-[#F6F7F9] border border-[#DCE2E8] flex items-center justify-center text-[#475569]">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-[#0F172A] text-sm">
                          {applications.length === 0
                            ? 'No recruitment records are currently available.'
                            : 'No Matching Applications Found'}
                        </h4>
                        <p className="text-xs text-[#475569] leading-relaxed">
                          {applications.length === 0
                            ? 'As verified DA-BFAR employees submit their promotional applications, their CS Form 212 records, uploaded files, and automated Gemini AI evaluations will appear here in real-time.'
                            : 'Try adjusting your search query, salary grade filter, or status selection.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-[#FBF7EC] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#0F3557]">{app.trackingCode}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#0F172A] flex items-center gap-1.5 flex-wrap">
                          <span>{app.personalInfo.fullName}</span>
                          {app.applicantType === 'internal' && (
                            <span className="bg-[#FBF7EC] text-[#071A2F] text-[9px] font-bold px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1 border border-[#C69214]/40">
                              <UserCheck className="w-2.5 h-2.5 text-[#0D4F3C]" />
                              <span>BFAR Staff (SG {app.currentSalaryGrade || 11})</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#475569]">{app.personalInfo.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#0F172A]">{app.positionTitle}</div>
                        <div className="text-[10px] text-[#475569]">{app.plantillaItemNo}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded-sm text-[11px] ${
                            (app.aiScreening?.overallScore || 0) >= 90
                              ? 'bg-[#EBF5F1] text-[#0D4F3C]'
                              : (app.aiScreening?.overallScore || 0) >= 80
                              ? 'bg-[#FBF7EC] text-[#0F3557]'
                              : 'bg-amber-50 text-[#C69214]'
                          }`}
                        >
                          {app.aiScreening?.overallScore || 85}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#FBF7EC] text-[#0F3557] border border-[#C69214]/40">
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {app.finalBoardDecision ? (
                          <span className="font-bold text-[#0D4F3C] bg-[#EBF5F1] px-2 py-0.5 rounded-sm border border-[#0D4F3C]/30">
                            {app.finalBoardDecision}
                          </span>
                        ) : (
                          <span className="text-[#475569] italic">Under Deliberation</span>
                        )}
                        {app.interviewScore && (
                          <div className="text-[10px] text-[#475569] font-mono mt-0.5">
                            Interview: {app.interviewScore}/100
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDossier(app)}
                          className="bg-[#0F3557] hover:bg-[#071A2F] text-white px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C69214]" />
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
        <div className="bg-white rounded-b-sm border border-[#DCE2E8] p-5 space-y-6">
          <div className="bg-[#071A2F] text-white rounded-sm p-5 border border-[#0F3557] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#0D4F3C] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#C69214]" />
                    Official Source of Truth
                  </span>
                  <span className="text-[#DCE2E8] text-xs font-mono">DA-BFAR PORTAL REPOSITORY</span>
                </div>
                <h3
                  className="text-base font-bold text-white"
                  style={{ fontFamily: "'Libre Baskerville', 'Cormorant Garamond', Georgia, serif" }}
                >
                  Official Plantilla Vacancy Synchronization Engine
                </h3>
                <p className="text-xs text-[#DCE2E8] max-w-2xl leading-relaxed">
                  All job opportunities are synchronized directly from the authoritative DA-BFAR Careers Portal.
                  Monetary salary amounts are strictly suppressed in compliance with CSC rules; only official Salary
                  Grades (SG) are published.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <a
                  href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#0F3557] hover:bg-[#0D4F3C] text-white border border-[#DCE2E8]/25 px-3 py-2 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Open bfar.da.gov.ph</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#C69214]" />
                </a>

                <button
                  type="button"
                  onClick={handleRunSync}
                  disabled={isSyncing}
                  className="bg-[#0F3557] hover:bg-[#0D4F3C] disabled:opacity-50 text-white border border-[#C69214]/40 px-3.5 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#C69214]' : 'text-[#C69214]'}`}
                  />
                  <span>{isSyncing ? 'Checking BFAR Portal...' : 'Sync Vacancies'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateJob}
                  className="bg-[#0D4F3C] hover:bg-[#0F3557] text-white px-3.5 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C69214]" />
                  <span>Import Official Notice</span>
                </button>
              </div>
            </div>

            {syncFeedback && (
              <div
                className={`p-3 rounded-sm text-xs flex items-center justify-between border ${
                  syncFeedback.type === 'success'
                    ? 'bg-[#0D4F3C]/40 border-[#0D4F3C] text-white'
                    : 'bg-red-950/60 border-red-500/40 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#C69214] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{syncFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncFeedback(null)}
                  className="text-[#DCE2E8] hover:text-white text-xs p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="bg-[#0F3557]/70 border border-[#DCE2E8]/20 rounded-sm p-3 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-[#DCE2E8]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C69214]"></span>
                  <span className="text-[#DCE2E8]/80">Sync Status:</span>
                  <span className="font-semibold text-white capitalize">
                    {syncStatus?.status || 'Active & Synchronized'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C69214]" />
                  <span className="text-[#DCE2E8]/80">Last Synced:</span>
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
                  <Briefcase className="w-3.5 h-3.5 text-[#C69214]" />
                  <span className="text-[#DCE2E8]/80">Registry Count:</span>
                  <span className="font-bold text-white">{visibleJobs.length} items</span>
                  <span className="text-[#C69214]">({visibleJobs.filter((j) => j.status === 'Open').length} Open)</span>
                  <span className="text-[#DCE2E8]">({visibleJobs.filter((j) => j.status !== 'Open').length} Closed)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="text-[#C69214] hover:text-white text-xs font-semibold flex items-center gap-1 underline underline-offset-2 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>{showAuditLogs ? 'Hide Audit Log' : 'View Sync Audit Log'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAuditLogs ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showAuditLogs && (
              <div className="bg-[#071A2F] border border-[#DCE2E8]/20 rounded-sm p-3 space-y-2 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between pb-1 border-b border-[#DCE2E8]/20 text-[11px] font-bold text-[#C69214] uppercase tracking-wider">
                  <span>Timestamp &amp; Event</span>
                  <span>Outcome Details</span>
                </div>
                {syncStatus?.auditLogs && syncStatus.auditLogs.length > 0 ? (
                  syncStatus.auditLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 text-[11px] py-1 border-b border-[#DCE2E8]/10"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-[#DCE2E8]">
                          <span>{new Date(log.timestamp).toLocaleTimeString('en-PH')}</span>
                          <span className="bg-[#0F3557] text-[#C69214] px-1.5 py-0.5 rounded-sm text-[9px] font-bold">
                            {log.action}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-white max-w-md">{log.details}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#DCE2E8]/70 py-2 text-center">No synchronization events recorded yet.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#DCE2E8]">
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Official Plantilla Items Ledger ({visibleJobs.length})</h4>
              <p className="text-xs text-[#475569]">
                Central Office positions synchronized from official DA-BFAR announcements. Click <strong>Edit</strong> to
                modify details or extend the deadline.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#475569] font-medium">Filter:</span>
              <button
                type="button"
                onClick={() => setVacancyFilter('All')}
                className={`px-2.5 py-1 rounded-sm font-semibold transition-colors cursor-pointer ${
                  vacancyFilter === 'All'
                    ? 'bg-[#0F3557] text-white'
                    : 'bg-[#F6F7F9] text-[#0F172A] hover:bg-[#DCE2E8]/50'
                }`}
              >
                All ({visibleJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setVacancyFilter('Open')}
                className={`px-2.5 py-1 rounded-sm font-semibold transition-colors cursor-pointer ${
                  vacancyFilter === 'Open'
                    ? 'bg-[#0D4F3C] text-white'
                    : 'bg-[#EBF5F1] text-[#0D4F3C] hover:bg-[#0D4F3C]/20'
                }`}
              >
                Active / Open ({visibleJobs.filter((j) => j.status === 'Open').length})
              </button>
              <button
                type="button"
                onClick={() => setVacancyFilter('Expired')}
                className={`px-2.5 py-1 rounded-sm font-semibold transition-colors cursor-pointer ${
                  vacancyFilter === 'Expired'
                    ? 'bg-[#071A2F] text-white'
                    : 'bg-[#F6F7F9] text-[#475569] hover:bg-[#DCE2E8]/50'
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
                    className={`rounded-sm border p-4 space-y-3 flex flex-col justify-between transition-colors ${
                      isOpen
                        ? 'bg-white border-[#DCE2E8] hover:border-[#0F3557]'
                        : 'bg-[#F6F7F9] border-[#DCE2E8] opacity-90'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-[#0F3557] bg-[#FBF7EC] px-2 py-0.5 rounded-sm border border-[#C69214]/40">
                          {job.plantillaItemNumber || job.itemNo}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#0F172A] bg-[#F6F7F9] px-2 py-0.5 rounded-sm border border-[#DCE2E8]">
                            SG {job.salaryGrade}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                              isOpen
                                ? 'text-[#0D4F3C] bg-[#EBF5F1] border-[#0D4F3C]/30'
                                : 'text-[#475569] bg-[#F6F7F9] border-[#DCE2E8]'
                            }`}
                          >
                            {isOpen ? 'Active / Open' : 'Closed / Expired'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-[#0F172A] text-sm">{job.positionTitle}</h5>
                        <p className="text-xs text-[#475569] font-medium mt-0.5">{job.division}</p>
                        <p className="text-[11px] text-[#475569]">{job.office || 'BFAR Central Office'}</p>
                      </div>

                      <div className="bg-[#F6F7F9] rounded-sm p-2.5 text-[11px] space-y-1 border border-[#DCE2E8]">
                        <div className="flex items-center justify-between text-[#475569]">
                          <span>Date Posted:</span>
                          <span className="font-medium text-[#0F172A]">{posted}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#475569]">
                          <span>Deadline:</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditJob(job)}
                            title="Click to edit or extend deadline"
                            className={`font-semibold underline decoration-dotted underline-offset-2 cursor-pointer ${
                              isOpen ? 'text-[#0F3557] hover:text-[#C69214]' : 'text-[#475569] hover:text-[#0F172A]'
                            }`}
                          >
                            {deadline}
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#475569] space-y-0.5 pt-1">
                        <div>
                          <strong className="text-[#0F172A]">Education:</strong>{' '}
                          <span className="line-clamp-1">{job.qualificationStandards?.education}</span>
                        </div>
                        <div>
                          <strong className="text-[#0F172A]">Eligibility:</strong>{' '}
                          <span className="line-clamp-1">{job.qualificationStandards?.eligibility}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#DCE2E8] flex items-center justify-between gap-2 flex-wrap">
                      <a
                        href={job.officialSourceUrl || 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0F3557] hover:text-[#C69214] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Official Notice</span>
                        <ExternalLink className="w-3 h-3 text-[#C69214]" />
                      </a>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditJob(job)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-sm text-[11px] font-bold bg-[#FBF7EC] hover:bg-[#0F3557] text-[#0F3557] hover:text-white border border-[#C69214]/40 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleVacancyStatus(job)}
                          disabled={isBusy}
                          className={`px-2.5 py-1 rounded-sm text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                            isOpen
                              ? 'bg-[#FBF7EC] hover:bg-amber-100 text-[#C69214] border border-[#C69214]/40'
                              : 'bg-[#EBF5F1] hover:bg-[#0D4F3C] text-[#0D4F3C] hover:text-white border border-[#0D4F3C]/30'
                          }`}
                        >
                          {isBusy ? 'Saving...' : isOpen ? 'Mark Expired' : 'Reactivate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteVacancy(job.id, job.positionTitle)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-sm text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
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
        <div className="bg-white rounded-b-sm border border-[#DCE2E8] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              Comparative Assessment Form (CAR) - Ranked Applicant Summary
            </h3>
            <p className="text-xs text-[#475569] mt-0.5">
              Criteria weighting conforms to CSC Merit Selection Plan: Education (30%), Experience (30%),
              Qualifying Training (20%), Potential / Interview (20%).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#071A2F] text-white">
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
              <tbody className="divide-y divide-[#DCE2E8]">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center font-sans">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center space-y-2">
                        <Scale className="w-8 h-8 text-[#475569]" />
                        <h4 className="font-bold text-[#0F172A] text-sm">Comparative Assessment Matrix Empty</h4>
                        <p className="text-xs text-[#475569]">
                          No internal promotional candidates have submitted applications yet. When submissions are
                          received, they will be ranked against the CSC Merit Selection Plan criteria here.
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

                    const total = Math.round(edu * 0.3 + exp * 0.3 + train * 0.2 + interview * 0.2);

                    return (
                      <tr key={app.id} className="hover:bg-[#FBF7EC]">
                        <td className="p-2.5 font-bold text-[#0F172A]">#{idx + 1}</td>
                        <td className="p-2.5 font-sans font-bold text-[#0F172A]">{app.personalInfo.fullName}</td>
                        <td className="p-2.5 font-sans text-[#475569]">{app.positionTitle}</td>
                        <td className="p-2.5 text-center">{edu}%</td>
                        <td className="p-2.5 text-center">{exp}%</td>
                        <td className="p-2.5 text-center">{train}%</td>
                        <td className="p-2.5 text-center">{interview}%</td>
                        <td className="p-2.5 text-center font-bold text-sm text-[#0F3557]">{total}%</td>
                        <td className="p-2.5 font-sans">
                          <span className="text-[11px] font-semibold text-[#0D4F3C] bg-[#EBF5F1] px-2 py-0.5 rounded-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A2F]/60">
          <div className="bg-white rounded-sm max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#DCE2E8]">
            <div className="bg-[#071A2F] text-white p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#C69214] text-[#071A2F] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">
                    HRMPSB Candidate Dossier
                  </span>
                  <span className="text-[#DCE2E8] font-mono text-xs">{selectedApp.trackingCode}</span>
                </div>
                <h3 className="text-xl font-bold">{selectedApp.personalInfo.fullName}</h3>
                <p className="text-xs text-[#DCE2E8] mt-0.5">
                  Applied for: <strong>{selectedApp.positionTitle}</strong> • Plantilla Item: {selectedApp.plantillaItemNo}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-[#DCE2E8] hover:text-white p-1 rounded-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#475569]">
              <div className="bg-[#FBF7EC] border border-[#C69214]/40 p-4 rounded-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#C69214]" />
                    <div>
                      <h4 className="font-bold text-sm text-[#0F3557]">
                        Gemini AI HRMPSB Pre-Screening Evaluation
                      </h4>
                      <span className="text-[10px] text-[#475569]">
                        Official assessment against prescribed CSC Qualification Standards
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#475569] uppercase block">Suitability Index</span>
                    <span className="text-2xl font-bold text-[#0F3557]">
                      {selectedApp.aiScreening?.overallScore || 90}/100
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#DCE2E8] rounded-sm p-2.5 flex items-start gap-2 text-[11px] text-[#475569]">
                  <AlertTriangle className="w-4 h-4 text-[#C69214] shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <strong className="font-bold text-[#0F172A]">Initial AI Screening Recommendation (Advisory Only):</strong>
                    <span>
                      {' '}
                      The QS evaluation below is an automated assessment to assist HRMPSB evaluators. Official
                      qualification standards verification and final appointment decisions rest solely with authorized HR
                      personnel, the HRMPSB, and the National Director.
                    </span>
                  </div>
                </div>

                {selectedApp.applicantType === 'internal' && (
                  <div className="bg-white border border-[#DCE2E8] rounded-sm p-3 text-[11px] text-[#0F172A] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#0D4F3C] shrink-0" />
                      <div>
                        <strong className="block text-[#0F3557]">DA-BFAR Internal Staff Promotion Profile</strong>
                        <span className="text-[#475569]">
                          ID: <strong className="font-mono text-[#0F172A]">{selectedApp.bfarEmployeeId || 'BFAR-EMP-VERIFIED'}</strong>{' '}
                          • Division: {selectedApp.currentDivision || 'Central Office'} • Track:{' '}
                          {selectedApp.promotionTrack || 'Promotion'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedApp.currentSalaryGrade && (
                        <span className="bg-[#F6F7F9] px-2 py-0.5 rounded-sm font-bold text-[#0F3557] border border-[#DCE2E8]">
                          Current: SG {selectedApp.currentSalaryGrade}
                        </span>
                      )}
                      {selectedApp.latestIpcrRating && (
                        <span className="bg-[#EBF5F1] text-[#0D4F3C] px-2 py-0.5 rounded-sm font-bold border border-[#0D4F3C]/30 flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-[#0D4F3C]" />
                          IPCR: {selectedApp.latestIpcrRating.toFixed(2)}/5.00
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {selectedApp.aiScreening?.qsCompliance && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-white p-2.5 rounded-sm border border-[#DCE2E8]">
                      <div className="flex items-center justify-between font-bold text-[#0F172A] mb-1">
                        <span>1. Education</span>
                        <span className="text-[#0D4F3C]">PASS</span>
                      </div>
                      <p className="text-[#475569] text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.educationAnalysis}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-sm border border-[#DCE2E8]">
                      <div className="flex items-center justify-between font-bold text-[#0F172A] mb-1">
                        <span>2. Experience</span>
                        <span className="text-[#0D4F3C]">PASS</span>
                      </div>
                      <p className="text-[#475569] text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.experienceAnalysis}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-sm border border-[#DCE2E8]">
                      <div className="flex items-center justify-between font-bold text-[#0F172A] mb-1">
                        <span>3. Training (CSC)</span>
                        <span className="text-[#0D4F3C]">PASS</span>
                      </div>
                      <p className="text-[#475569] text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.trainingAnalysis}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-sm border border-[#DCE2E8]">
                      <div className="flex items-center justify-between font-bold text-[#0F172A] mb-1">
                        <span>4. Eligibility</span>
                        <span className="text-[#0D4F3C]">PASS</span>
                      </div>
                      <p className="text-[#475569] text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.eligibilityAnalysis}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#071A2F] text-white p-4 rounded-sm space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#C69214]">
                  HRMPSB Deliberation &amp; Application Result Console
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[#DCE2E8] block mb-1 font-semibold">Recruitment Milestone Stage:</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ApplicationRecord['status'])}
                      className="w-full bg-[#0F3557] border border-[#DCE2E8]/25 rounded-sm p-2 text-xs font-semibold text-white"
                    >
                      <option value="Submitted">1. Application Submitted</option>
                      <option value="Document Under Review">2. Initial AI-Assisted Screening</option>
                      <option value="CSC QS Qualified - Under Review">3. HR Evaluation</option>
                      <option value="HRMPSB Deliberation & Interview Scheduled">
                        4. Qualification Assessment &amp; Deliberation
                      </option>
                      <option value="Application Result Released">5. Final Status / Notice of Result</option>
                      <option value="Rejected">Disqualified / Rejected (Did not meet QS)</option>
                      <option value="Regret / Not Qualified">Notice of Non-Selection / Regret</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[#DCE2E8] block mb-1 font-semibold">
                      HRMPSB Panel Interview Score (0-100):
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 94"
                      value={interviewScore ?? ''}
                      onChange={(e) => setInterviewScore(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-[#0F3557] border border-[#DCE2E8]/25 rounded-sm p-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[#DCE2E8] block mb-1 font-semibold">Final Board Decision:</label>
                    <select
                      value={finalBoardDecision || ''}
                      onChange={(e) =>
                        setFinalBoardDecision(
                          (e.target.value || undefined) as ApplicationRecord['finalBoardDecision']
                        )
                      }
                      className="w-full bg-[#0F3557] border border-[#DCE2E8]/25 rounded-sm p-2 text-xs font-semibold text-white"
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
                  <label className="text-[#DCE2E8] block mb-1 font-semibold text-xs">
                    Official Committee Remarks (Visible to Applicant via Tracker):
                  </label>
                  <input
                    type="text"
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="Enter formal remarks or schedule instructions..."
                    className="w-full bg-[#0F3557] border border-[#DCE2E8]/25 rounded-sm p-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F6F7F9] border-t border-[#DCE2E8] flex items-center justify-between">
              <span className="text-[11px] text-[#475569]">Logged at: {selectedApp.submissionDate}</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-sm border border-[#DCE2E8] bg-white text-[#0F172A] font-semibold text-xs hover:bg-[#F6F7F9] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-sm bg-[#0F3557] hover:bg-[#071A2F] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{isUpdating ? 'Saving Decision...' : 'Save HRMPSB Evaluation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A2F]/60">
          <div className="bg-white rounded-sm max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#DCE2E8]">
            <div className="bg-[#071A2F] text-white p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#C69214] text-[#071A2F] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">
                    {editingJob ? 'Edit Plantilla Item' : 'Official Ingestion'}
                  </span>
                  <span className="text-[#DCE2E8] font-mono text-xs">bfar.da.gov.ph / CS Form 9</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingJob
                    ? `Edit Vacancy & Extend Deadline: ${editingJob.positionTitle}`
                    : 'Import & Verify Official Plantilla Vacancy'}
                </h3>
                <p className="text-xs text-[#DCE2E8] mt-0.5">
                  Synchronize official notices from https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingJob(false);
                  setEditingJob(null);
                }}
                className="text-[#DCE2E8] hover:text-white p-1 rounded-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {createJobError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Import Verification Alert:</strong>
                    <span>{createJobError}</span>
                  </div>
                </div>
              )}

              <div className="bg-[#FBF7EC] border border-[#C69214]/40 text-[#0F172A] p-3 rounded-sm space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs text-[#0F3557]">
                  <Shield className="w-3.5 h-3.5 text-[#C69214]" />
                  Statutory Rule: Salary Confidentiality
                </span>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Only the <strong className="text-[#0F172A]">Salary Grade (SG)</strong> is entered and displayed. Numerical monthly salary rates are
                  confidential and must never be exposed or recorded in the public registry.
                </p>
              </div>

              <form id="importVacancyForm" onSubmit={handleCreateOrUpdateJobSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#0F172A] block mb-1">Position Title *</label>
                    <input
                      type="text"
                      required
                      value={newJobForm.positionTitle}
                      onChange={(e) => setNewJobForm({ ...newJobForm, positionTitle: e.target.value })}
                      placeholder="e.g. Senior Aquaculturist"
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 text-xs focus:outline-none focus:border-[#0F3557]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#0F172A] block mb-1">Plantilla Item Number *</label>
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
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 font-mono text-xs focus:outline-none focus:border-[#0F3557]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#0F172A] block mb-1">Office / Agency *</label>
                    <input
                      type="text"
                      required
                      value={newJobForm.office}
                      onChange={(e) => setNewJobForm({ ...newJobForm, office: e.target.value })}
                      placeholder="BFAR Central Office"
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 text-xs focus:outline-none focus:border-[#0F3557]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#0F172A] block mb-1">Division / Operating Unit *</label>
                    <input
                      type="text"
                      required
                      value={newJobForm.division}
                      onChange={(e) => setNewJobForm({ ...newJobForm, division: e.target.value })}
                      placeholder="e.g. Aquaculture Division"
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 text-xs focus:outline-none focus:border-[#0F3557]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-[#0F172A] block mb-1">Salary Grade (SG) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={33}
                      value={newJobForm.salaryGrade}
                      onChange={(e) => setNewJobForm({ ...newJobForm, salaryGrade: Number(e.target.value) })}
                      placeholder="15"
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 font-mono text-xs focus:outline-none focus:border-[#0F3557]"
                    />
                    <span className="text-[10px] text-[#475569] mt-0.5 block">Official Grade (e.g. 11, 15, 19, 24)</span>
                  </div>
                  <div>
                    <label className="font-semibold text-[#0F172A] block mb-1">Date Posted (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={newJobForm.datePosted}
                      onChange={(e) => setNewJobForm({ ...newJobForm, datePosted: e.target.value })}
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 text-xs focus:outline-none focus:border-[#0F3557]"
                    />
                  </div>
                  <div className="bg-[#FBF7EC] p-2 rounded-sm border border-[#C69214]/40">
                    <label className="font-bold text-[#0F3557] mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#C69214]" />
                      <span>Application Deadline (Extendable)</span>
                    </label>
                    <input
                      type="date"
                      value={newJobForm.applicationDeadline}
                      onChange={(e) => setNewJobForm({ ...newJobForm, applicationDeadline: e.target.value })}
                      className="w-full bg-white border border-[#DCE2E8] rounded-sm p-1.5 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F3557]"
                    />
                    <span className="text-[10px] text-[#475569] mt-0.5 block">
                      Pumili ng bagong petsa para ma-extend.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Official Announcement URL *</label>
                  <input
                    type="url"
                    required
                    value={newJobForm.officialSourceUrl}
                    onChange={(e) => setNewJobForm({ ...newJobForm, officialSourceUrl: e.target.value })}
                    placeholder="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                    className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 text-xs font-mono text-[#0F3557] focus:outline-none focus:border-[#0F3557]"
                  />
                </div>

                <div className="bg-[#F6F7F9] p-3.5 rounded-sm border border-[#DCE2E8] space-y-3">
                  <span className="font-bold text-[#0F172A] text-xs block">
                    Civil Service Commission (CSC) Qualification Standards
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-[#475569] block mb-1">Education Standard *</label>
                      <input
                        type="text"
                        required
                        value={newJobForm.education}
                        onChange={(e) => setNewJobForm({ ...newJobForm, education: e.target.value })}
                        placeholder="Bachelor's degree in Fisheries..."
                        className="w-full bg-white border border-[#DCE2E8] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[#475569] block mb-1">Experience Standard *</label>
                      <input
                        type="text"
                        required
                        value={newJobForm.experience}
                        onChange={(e) => setNewJobForm({ ...newJobForm, experience: e.target.value })}
                        placeholder="1 year of relevant experience..."
                        className="w-full bg-white border border-[#DCE2E8] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[#475569] block mb-1">Training Standard *</label>
                      <input
                        type="text"
                        required
                        value={newJobForm.training}
                        onChange={(e) => setNewJobForm({ ...newJobForm, training: e.target.value })}
                        placeholder="4 hours of relevant training..."
                        className="w-full bg-white border border-[#DCE2E8] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[#475569] block mb-1">Eligibility Standard *</label>
                      <input
                        type="text"
                        required
                        value={newJobForm.eligibility}
                        onChange={(e) => setNewJobForm({ ...newJobForm, eligibility: e.target.value })}
                        placeholder="Career Service (Professional) / RA 1080"
                        className="w-full bg-white border border-[#DCE2E8] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#0F172A] block mb-1">Attached Document Title</label>
                    <input
                      type="text"
                      value={newJobForm.documentTitle}
                      onChange={(e) => setNewJobForm({ ...newJobForm, documentTitle: e.target.value })}
                      placeholder="Official Notice of Vacancy (CS Form 9)"
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#0F172A] block mb-1">Document Link / URL</label>
                    <input
                      type="text"
                      value={newJobForm.documentUrl}
                      onChange={(e) => setNewJobForm({ ...newJobForm, documentUrl: e.target.value })}
                      placeholder="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                      className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">
                    Duties &amp; Responsibilities (One item per line)
                  </label>
                  <textarea
                    rows={3}
                    value={newJobForm.dutiesText}
                    onChange={(e) => setNewJobForm({ ...newJobForm, dutiesText: e.target.value })}
                    className="w-full bg-[#F6F7F9] border border-[#DCE2E8] rounded-sm p-2 text-xs"
                  />
                </div>
              </form>
            </div>

            <div className="p-4 bg-[#F6F7F9] border-t border-[#DCE2E8] flex items-center justify-between">
              <span className="text-[11px] text-[#475569]">Authoritative Source: bfar.da.gov.ph</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingJob(false);
                    setEditingJob(null);
                  }}
                  className="px-4 py-2 rounded-sm border border-[#DCE2E8] bg-white text-[#0F172A] font-semibold text-xs hover:bg-[#F6F7F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="importVacancyForm"
                  disabled={isSavingJob}
                  className="px-5 py-2 rounded-sm bg-[#0F3557] hover:bg-[#071A2F] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-[#C69214]" />
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