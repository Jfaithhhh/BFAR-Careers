import React, { useState } from 'react';
import { PlantillaJob, ApplicationRecord } from '../types';
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
  // Authentication gate for BFAR HRMIS (Admin-only access)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRole, setCurrentRole] = useState<'Director' | 'HR_Specialist' | 'HRMPSB_Member'>('HR_Specialist');
  const [loginUsername, setLoginUsername] = useState('jciervo4513');
  const [loginPassword, setLoginPassword] = useState('bfarhrmis2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sub-tabs
  const [adminTab, setAdminTab] = useState<'applicants' | 'plantilla' | 'matrix'>('applicants');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [jobFilter, setJobFilter] = useState('All');

  // Selected candidate for deep evaluation dossier
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);

  // Status edit state in modal
  const [newStatus, setNewStatus] = useState<ApplicationRecord['status']>('Submitted');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [writtenExamScore, setWrittenExamScore] = useState<number | undefined>(undefined);
  const [interviewScore, setInterviewScore] = useState<number | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);

  // New Job Modal
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [newJobForm, setNewJobForm] = useState<Partial<PlantillaJob>>({
    itemNo: '',
    positionTitle: '',
    division: 'Fisheries Protection and Law Enforcement Group (FPLEG)',
    region: 'Central Office (NCR) - Quezon City',
    placeOfAssignment: 'BFAR Central Office, PCA Building, Elliptical Road, Diliman, Quezon City',
    salaryGrade: 15,
    monthlySalary: 36619,
    plantillaType: 'Permanent',
    postingDate: '21 Oct 2026',
    closingDate: '06 Nov 2026',
    status: 'Open',
    qualificationStandards: {
      education: "Bachelor's degree in Fisheries or related field",
      experience: '1 year of relevant experience',
      training: '4 hours of relevant training',
      eligibility: 'Career Service (Professional) / RA 1080',
    },
    dutiesAndResponsibilities: ['Perform regulatory enforcement and technical evaluations.'],
    competencies: ['Fisheries Law Enforcement', 'Technical Report Writing'],
  });

  // KPI Calculations
  const totalApps = applications.length;
  const qualifiedCount = applications.filter((a) =>
    a.status.includes('Qualified') || a.status.includes('Interview') || a.status.includes('Appointment')
  ).length;
  const underReviewCount = applications.filter(
    (a) => a.status === 'Submitted' || a.status === 'Document Under Review'
  ).length;
  const interviewCount = applications.filter((a) => a.status === 'HRMPSB Interview Scheduled').length;
  const appointedCount = applications.filter((a) => a.status === 'HRMPSB Recommended for Appointment').length;

  // Filtered applicants
  const filteredApps = applications.filter((app) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      app.personalInfo.fullName.toLowerCase().includes(s) ||
      app.trackingCode.toLowerCase().includes(s) ||
      app.positionTitle.toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesJob = jobFilter === 'All' || app.jobId === jobFilter;
    return matchesSearch && matchesStatus && matchesJob;
  });

  // Open dossier modal
  const handleOpenDossier = (app: ApplicationRecord) => {
    setSelectedApp(app);
    setNewStatus(app.status);
    setAdminRemarks(app.adminRemarks || '');
    setWrittenExamScore(app.writtenExamScore);
    setInterviewScore(app.interviewScore);
  };

  // Save changes to application
  const handleSaveStatus = async () => {
    if (!selectedApp) return;
    setIsUpdating(true);

    const updates: Partial<ApplicationRecord> = {
      status: newStatus,
      adminRemarks,
      writtenExamScore,
      interviewScore,
    };

    try {
      const res = await fetch(`/api/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success && json.data) {
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

  // Create Job Handler
  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobForm.positionTitle || !newJobForm.itemNo) {
      alert('Please enter Position Title and Plantilla Item No.');
      return;
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJobForm),
      });
      const json = await res.json();
      if (json.success && json.data) {
        onAddJob(json.data);
        setIsCreatingJob(false);
      }
    } catch (err) {
      alert('Failed to publish new Plantilla vacancy.');
    }
  };

  if (!isAuthenticated) {
    const handleDoLogin = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!loginUsername.trim()) {
        setLoginError('Please enter your Employee ID or HRMIS Username.');
        return;
      }
      if (!loginPassword.trim()) {
        setLoginError('Please enter your HRMIS password.');
        return;
      }
      setLoginError(null);
      setIsAuthenticated(true);
    };

    return (
      <div className="max-w-5xl mx-auto my-6 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <img src="/assets/ph_coat_of_arms.png" alt="Coat of Arms" className="h-12 w-auto object-contain" />
              <img src="/assets/bfar_da_logo.png" alt="DA-BFAR" className="h-12 w-auto object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-700 tracking-wider uppercase block">
                Republic of the Philippines • Department of Agriculture
              </span>
              <h2 className="text-base sm:text-lg font-black text-[#024794] uppercase tracking-tight">
                Bureau of Fisheries and Aquatic Resources
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Central Office HRMIS &amp; HRMPSB Selection Board Authentication Gate
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-red-600" />
              <span>Admin Access Required</span>
            </span>
          </div>
        </div>

        {/* Dual Column Login Layout matching portal.bfar.da.gov.ph and hrmisv2.bfar.da.gov.ph */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left Column: Official Employee & HRMIS Portal Hero */}
          <div className="bg-gradient-to-br from-[#f0f6ff] via-white to-sky-50 rounded-2xl border border-blue-200 p-6 sm:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-2xl sm:text-3xl font-black text-[#024794] tracking-tight block">
                  EMPLOYEE &amp; HRMIS PORTAL
                </span>
                <span className="h-1 w-20 bg-amber-400 rounded-full block mt-1"></span>
              </div>

              {/* Graphic Motif inspired by BFAR Portal Screenshot */}
              <div className="py-4 flex flex-col items-center justify-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-sky-300 animate-spin-slow opacity-60"></div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#024794] to-sky-500 flex items-center justify-center shadow-lg ring-4 ring-sky-100">
                    <UserCheck className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow-md">
                    <Shield className="w-4 h-4 text-slate-900" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 text-center leading-relaxed">
                The Employee Portal is an Information System that provides authorized HRMPSB selection
                board officers and HR personnel secure online access to candidate dossiers, CSC Qualification
                Standards evaluations, and Central Office Plantilla appointments.
              </p>
            </div>

            {/* Direct Integration with Live BFAR HRMIS */}
            <div className="mt-6 pt-5 border-t border-blue-200/80 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                Official Agency External HRMIS Integration
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="https://hrmisv2.bfar.da.gov.ph/login"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-[#024794] hover:bg-[#033b7a] text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                  title="Open live DA-BFAR HRMIS v2 in a new window"
                >
                  <span>hrmisv2.bfar.da.gov.ph</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                </a>
                <a
                  href="https://portal.bfar.da.gov.ph/login"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                  title="Open live BFAR Employee Portal"
                >
                  <span>portal.bfar.da.gov.ph</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Secure HRMIS Admin Sign-In Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Log in</h3>
                  <p className="text-xs text-slate-500">Sign in with your authorized HRMIS account</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#024794]" />
                </div>
              </div>

              {loginError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleDoLogin} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Username / Employee ID:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="e.g. jciervo4513 or bfar.admin"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                    />
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-10 py-2.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Designated HRMPSB Role:
                  </label>
                  <select
                    value={currentRole}
                    onChange={(e: any) => setCurrentRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#024794]"
                  >
                    <option value="HR_Specialist">HR Recruitment Specialist (FAD-HRMS)</option>
                    <option value="HRMPSB_Member">HRMPSB Selection Committee Member</option>
                    <option value="Director">Regional / National Appointing Director</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1b73e8] hover:bg-[#1557b0] text-white py-3 rounded-lg text-xs font-black tracking-wider uppercase shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>LOGIN</span>
                </button>
              </form>
            </div>

            {/* Quick Demo Helper & Copyright */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setLoginUsername('jciervo4513');
                  setLoginPassword('bfarhrmis2026');
                  setCurrentRole('HR_Specialist');
                  setIsAuthenticated(true);
                }}
                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Auto-Fill &amp; Enter as Authorized HR Specialist</span>
              </button>

              <div className="text-[10px] text-slate-400 text-center">
                © 2026 All rights reserved. Bureau of Fisheries and Aquatic Resources.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Top Bar & Role Indicator */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-auto bg-white px-2.5 py-1 rounded-lg flex items-center justify-center gap-2 shrink-0 shadow-xs">
            <img src="/assets/ph_coat_of_arms.png" alt="Coat of Arms" className="h-9 w-auto object-contain" />
            <img src="/assets/bfar_da_logo.png" alt="DA-BFAR" className="h-9 w-auto object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">
                DA-BFAR HRMIS Recruitment &amp; Selection Module
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.2 rounded-full font-mono">
                Admin Session Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authenticated Session as:{' '}
              <strong className="text-amber-300">
                {currentRole === 'HR_Specialist'
                  ? 'HR Recruitment Specialist (FAD-HR)'
                  : currentRole === 'HRMPSB_Member'
                  ? 'HRMPSB Committee Chairperson'
                  : 'Appointing Authority / Director'}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <select
            value={currentRole}
            onChange={(e: any) => setCurrentRole(e.target.value)}
            className="bg-slate-800 text-white border border-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-amber-400"
          >
            <option value="HR_Specialist">Switch: HR Specialist</option>
            <option value="HRMPSB_Member">Switch: HRMPSB Member</option>
            <option value="Director">Switch: Appointing Director</option>
          </select>

          {/* Direct link to external live BFAR HRMIS */}
          <a
            href="https://hrmisv2.bfar.da.gov.ph/login"
            target="_blank"
            rel="noreferrer"
            className="bg-[#024794] hover:bg-[#033b7a] text-white border border-blue-400/40 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Open Live Central BFAR HRMIS v2 in new tab"
          >
            <span>Live HRMIS</span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
          </a>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Lock Admin Portal & Require Sign-In"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Portal</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Open Plantilla</span>
          <span className="text-xl font-black text-[#024794] mt-0.5 block">{jobs.length}</span>
          <span className="text-[10px] text-slate-400">Active postings</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Applicants</span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{totalApps}</span>
          <span className="text-[10px] text-slate-400">In HRMIS database</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Document Audit</span>
          <span className="text-xl font-black text-amber-600 mt-0.5 block">{underReviewCount}</span>
          <span className="text-[10px] text-slate-400">Pending verification</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">QS Qualified</span>
          <span className="text-xl font-black text-emerald-600 mt-0.5 block">{qualifiedCount}</span>
          <span className="text-[10px] text-slate-400">Meets CSC standard</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">HRMPSB Interview</span>
          <span className="text-xl font-black text-purple-600 mt-0.5 block">{interviewCount}</span>
          <span className="text-[10px] text-slate-400">Deliberation stage</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Appointed</span>
          <span className="text-xl font-black text-blue-600 mt-0.5 block">{appointedCount}</span>
          <span className="text-[10px] text-slate-400">Selected by Director</span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl">
        <button
          onClick={() => setAdminTab('applicants')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors ${
            adminTab === 'applicants'
              ? 'border-[#024794] text-[#024794]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Applicants Screening &amp; AI Dossiers ({applications.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('plantilla')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors ${
            adminTab === 'plantilla'
              ? 'border-[#024794] text-[#024794]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Plantilla Vacancies Manager ({jobs.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('matrix')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors ${
            adminTab === 'matrix'
              ? 'border-[#024794] text-[#024794]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Comparative Assessment Form (CAR - CSC Form)</span>
        </button>
      </div>

      {/* TAB 1: APPLICANTS MANAGEMENT */}
      {adminTab === 'applicants' && (
        <div className="bg-white rounded-b-xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-4">
          {/* Controls & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Filter applicant name, tracking #, position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-[#024794]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-[#024794]"
              >
                <option value="All">All Stages</option>
                <option value="Submitted">Submitted</option>
                <option value="Document Under Review">Document Under Review</option>
                <option value="QS Qualified - Exam Scheduled">QS Qualified - Exam Scheduled</option>
                <option value="HRMPSB Interview Scheduled">HRMPSB Interview Scheduled</option>
                <option value="HRMPSB Recommended for Appointment">Recommended for Appointment</option>
                <option value="Regret / Not Qualified">Regret / Disqualified</option>
              </select>

              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="bg-white border border-slate-300 text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-[#024794] hidden sm:block"
              >
                <option value="All">All Vacancies</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.positionTitle} ({j.region})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Applicants Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold border-b border-slate-900">
                  <th className="py-2.5 px-3">Reference No.</th>
                  <th className="py-2.5 px-3">Applicant Name</th>
                  <th className="py-2.5 px-3">Plantilla Position</th>
                  <th className="py-2.5 px-3">AI Fit &amp; QS Score</th>
                  <th className="py-2.5 px-3">Evaluation Status</th>
                  <th className="py-2.5 px-3">Exam / Interview</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No matching applicants found.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#024794]">
                        {app.trackingCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{app.personalInfo.fullName}</div>
                        <div className="text-[10px] text-slate-500">{app.personalInfo.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{app.positionTitle}</div>
                        <div className="text-[10px] text-slate-500">{app.region}</div>
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
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {app.aiScreening?.recommendedStatus?.split('-')[1] || 'Meets QS'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            app.status.includes('Interview')
                              ? 'bg-purple-100 text-purple-800'
                              : app.status.includes('Appointment')
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status.includes('Regret')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-50 text-[#024794] border border-blue-200'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        {app.writtenExamScore ? (
                          <span>Exam: {app.writtenExamScore}/100</span>
                        ) : (
                          <span className="text-slate-400">Exam: Pending</span>
                        )}
                        {app.interviewScore && <div>Panel: {app.interviewScore}/100</div>}
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

      {/* TAB 2: PLANTILLA VACANCIES MANAGER */}
      {adminTab === 'plantilla' && (
        <div className="bg-white rounded-b-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Civil Service Commission Plantilla Items Database
              </h3>
              <p className="text-xs text-slate-500">
                Manage official authorized positions and publication deadlines for DA-BFAR.
              </p>
            </div>
            <button
              onClick={() => setIsCreatingJob(true)}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Plantilla Vacancy</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="bg-blue-100 text-[#024794] text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      {job.itemNo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        job.status === 'Open'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{job.positionTitle}</h4>
                  <p className="text-xs text-slate-500">{job.division}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">{job.region}</p>

                  <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-200">
                    <span className="font-bold text-[#024794] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Salary Grade: SG-{job.salaryGrade}
                    </span>
                    <span className="text-slate-500 text-[11px]">Due: {job.closingDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      const newStatus = job.status === 'Open' ? 'Closed' : 'Open';
                      onUpdateJob(job.id, { status: newStatus });
                    }}
                    className="flex-1 py-1.5 rounded border border-slate-300 text-xs font-semibold hover:bg-slate-200 text-slate-700"
                  >
                    {job.status === 'Open' ? 'Close Position' : 'Re-open'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMPARATIVE ASSESSMENT MATRIX (CAR - CSC STANDARD) */}
      {adminTab === 'matrix' && (
        <div className="bg-white rounded-b-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block">
              CSC Form - Selection Board Deliberation
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Comparative Assessment Form (CAR) - Ranked Applicant Summary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Criteria weighting conforms to CSC OSP / Merit Selection Plan: Education (30%),
              Experience (30%), Training (20%), Potential / Examination (20%).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#024794] text-white">
                  <th className="p-2.5">Rank</th>
                  <th className="p-2.5">Candidate Name</th>
                  <th className="p-2.5">Plantilla Item</th>
                  <th className="p-2.5 text-center">Education (30%)</th>
                  <th className="p-2.5 text-center">Experience (30%)</th>
                  <th className="p-2.5 text-center">Training (20%)</th>
                  <th className="p-2.5 text-center">Exam/Potential (20%)</th>
                  <th className="p-2.5 text-center">Total Rating</th>
                  <th className="p-2.5">HRMPSB Deliberation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {applications.map((app, idx) => {
                  const edu = app.aiScreening?.qsCompliance?.educationScore || 90;
                  const exp = app.aiScreening?.qsCompliance?.experienceScore || 88;
                  const train = app.aiScreening?.qsCompliance?.trainingScore || 90;
                  const exam = app.writtenExamScore || 85;

                  const total = Math.round(
                    edu * 0.3 + exp * 0.3 + train * 0.2 + exam * 0.2
                  );

                  return (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800">#{idx + 1}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-900">
                        {app.personalInfo.fullName}
                      </td>
                      <td className="p-2.5 font-sans text-slate-600">{app.positionTitle}</td>
                      <td className="p-2.5 text-center text-slate-800">{edu}%</td>
                      <td className="p-2.5 text-center text-slate-800">{exp}%</td>
                      <td className="p-2.5 text-center text-slate-800">{train}%</td>
                      <td className="p-2.5 text-center text-slate-800">{exam}%</td>
                      <td className="p-2.5 text-center font-bold text-sm text-[#024794]">
                        {total}%
                      </td>
                      <td className="p-2.5 font-sans">
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {app.aiScreening?.recommendedStatus || 'Meets Standards'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
                  Applied for: <strong>{selectedApp.positionTitle}</strong> ({selectedApp.region})
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
              {/* AI Automated Qualification Standards (QS) Audit Banner */}
              <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="font-extrabold text-sm text-[#024794]">
                        Gemini 3.8 Flash HRMPSB Pre-Screening Evaluation
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Official assessment against prescribed Civil Service Qualification Standards
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

                {/* 4 Pillars Matrix */}
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
                        <span>3. Training</span>
                        <span className="text-emerald-600">PASS</span>
                      </div>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {selectedApp.aiScreening.qsCompliance.trainingAnalysis}
                      </p>
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

                {/* Strengths & Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                  <div className="bg-white/90 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-emerald-800 block mb-1">
                      Candidate Strengths:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      {(selectedApp.aiScreening?.strengths || []).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/90 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-amber-800 block mb-1">
                      Items for Verification:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      {(selectedApp.aiScreening?.gapsOrRisk || ['Verify authenticated Transcript of Records']).map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* AI Custom HRMPSB Interview Questions */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#024794]" />
                    <h4 className="font-bold text-slate-900 text-xs">
                      Tailored HRMPSB Panel Interview Questions (Fisheries Mandate &amp; RA 8550/10654)
                    </h4>
                  </div>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isGeneratingAiQuestions}
                    className="text-xs text-[#024794] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAiQuestions ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAiQuestions ? 'Generating...' : 'Regenerate Questions with AI'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(selectedApp.aiScreening?.tailoredInterviewQuestions || []).map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-[#024794] font-black flex items-center justify-center shrink-0 text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Candidate CS Form 212 Dossier Data */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-200">
                  Full Application Information &amp; Work Background
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="font-bold text-slate-800 block text-[11px] mb-1">
                      Education &amp; Academic Honors
                    </span>
                    {selectedApp.education.map((e, idx) => (
                      <div key={idx} className="text-slate-600 mb-1 text-[11px]">
                        • <strong>{e.degree}</strong> ({e.school}, {e.yearGraduated})
                        {e.honors && <span className="text-[#024794] font-semibold"> - {e.honors}</span>}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="font-bold text-slate-800 block text-[11px] mb-1">
                      Eligibility &amp; PRC Licenses
                    </span>
                    {selectedApp.eligibility.map((el, idx) => (
                      <div key={idx} className="text-slate-600 mb-1 text-[11px]">
                        • <strong>{el.type}</strong>
                        {el.licenseNo && <span> (Lic: {el.licenseNo})</span>}
                        {el.rating && <span className="text-emerald-700 font-semibold"> - Rating: {el.rating}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="font-bold text-slate-800 block text-[11px] mb-1">
                    Work Experience History
                  </span>
                  {selectedApp.workExperience.map((w, idx) => (
                    <div key={idx} className="text-slate-600 mb-2 text-[11px] pb-1 border-b border-slate-100 last:border-0">
                      <div className="font-semibold text-slate-800">
                        {w.position} at {w.agencyOrCompany} ({w.fromDate} - {w.toDate})
                        {w.isGovService && (
                          <span className="ml-2 bg-blue-50 text-[#024794] text-[9px] px-1.5 py-0.2 rounded font-bold">
                            Gov't Service
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{w.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* HR / HRMPSB Action Console */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                  HRMPSB Secretariat &amp; Selection Committee Decision Console
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Update Application Stage:
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e: any) => setNewStatus(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs font-semibold text-white focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="Submitted">1. Submitted</option>
                      <option value="Document Under Review">2. Document Under Review</option>
                      <option value="QS Qualified - Exam Scheduled">3. QS Qualified - Exam Scheduled</option>
                      <option value="HRMPSB Interview Scheduled">4. HRMPSB Interview Scheduled</option>
                      <option value="HRMPSB Recommended for Appointment">5. Recommended for Appointment</option>
                      <option value="Regret / Not Qualified">6. Regret / Disqualified</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Technical Written Exam Score:
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 92"
                      value={writtenExamScore ?? ''}
                      onChange={(e) => setWrittenExamScore(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs font-mono text-white focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      HRMPSB Panel Interview Score:
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 95"
                      value={interviewScore ?? ''}
                      onChange={(e) => setInterviewScore(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs font-mono text-white focus:ring-1 focus:ring-amber-400"
                    />
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

      {/* CREATE PLANTILLA VACANCY MODAL */}
      {isCreatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">
                Post New Plantilla Vacancy (Civil Service Bulletin)
              </h3>
              <button
                onClick={() => setIsCreatingJob(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Position Title *</label>
                  <input
                    type="text"
                    required
                    value={newJobForm.positionTitle}
                    onChange={(e) => setNewJobForm({ ...newJobForm, positionTitle: e.target.value })}
                    placeholder="e.g. Senior Aquaculturist"
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plantilla Item No. *</label>
                  <input
                    type="text"
                    required
                    value={newJobForm.itemNo}
                    onChange={(e) => setNewJobForm({ ...newJobForm, itemNo: e.target.value })}
                    placeholder="e.g. BFAR-OSEC-RFO3-AQ3-2026-091"
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Region / Station</label>
                  <select
                    value={newJobForm.region}
                    onChange={(e) => setNewJobForm({ ...newJobForm, region: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  >
                    <option value="Central Office (NCR) - Quezon City">Central Office (NCR) - Quezon City</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Salary Grade</label>
                  <input
                    type="number"
                    value={newJobForm.salaryGrade}
                    onChange={(e) => setNewJobForm({ ...newJobForm, salaryGrade: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Monthly Salary (₱)</label>
                  <input
                    type="number"
                    value={newJobForm.monthlySalary}
                    onChange={(e) => setNewJobForm({ ...newJobForm, monthlySalary: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Division / Operating Unit</label>
                <input
                  type="text"
                  value={newJobForm.division}
                  onChange={(e) => setNewJobForm({ ...newJobForm, division: e.target.value })}
                  placeholder="e.g. Fisheries Protection and Law Enforcement Group"
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Education Standard</label>
                  <input
                    type="text"
                    value={newJobForm.qualificationStandards?.education}
                    onChange={(e) =>
                      setNewJobForm({
                        ...newJobForm,
                        qualificationStandards: {
                          ...newJobForm.qualificationStandards!,
                          education: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Eligibility Standard</label>
                  <input
                    type="text"
                    value={newJobForm.qualificationStandards?.eligibility}
                    onChange={(e) =>
                      setNewJobForm({
                        ...newJobForm,
                        qualificationStandards: {
                          ...newJobForm.qualificationStandards!,
                          eligibility: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreatingJob(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#024794] text-white rounded font-bold text-xs hover:bg-[#033b7a]"
                >
                  Publish Plantilla Vacancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
