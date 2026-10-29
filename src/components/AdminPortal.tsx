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
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  BadgeCheck,
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

  // Selected candidate for deep evaluation dossier
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);

  // Status edit state in modal
  const [newStatus, setNewStatus] = useState<ApplicationRecord['status']>('Submitted');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [interviewScore, setInterviewScore] = useState<number | undefined>(undefined);
  const [finalBoardDecision, setFinalBoardDecision] = useState<ApplicationRecord['finalBoardDecision']>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);

  // New Job Modal
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [createJobError, setCreateJobError] = useState<string | null>(null);
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
      education: "Bachelor's degree in Fisheries, Marine Science, or relevant discipline",
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
    a.status.includes('Qualified') || a.status.includes('Interview') || a.status.includes('Appointment') || a.status.includes('Result')
  ).length;
  const underReviewCount = applications.filter(
    (a) => a.status === 'Submitted' || a.status === 'Document Under Review'
  ).length;
  const interviewCount = applications.filter((a) => a.status.includes('Interview')).length;
  const appointedCount = applications.filter((a) => a.status.includes('Appointment') || a.status.includes('Result')).length;

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
    setCreateJobError(null);
    if (!newJobForm.positionTitle || !newJobForm.itemNo) {
      setCreateJobError('Please enter Position Title and Plantilla Item No.');
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
      } else {
        setCreateJobError(json.error || 'Failed to publish new Plantilla vacancy.');
      }
    } catch (err) {
      setCreateJobError('Failed to publish new Plantilla vacancy.');
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Applications</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalApps}</div>
          <span className="text-[10px] text-slate-400">All Plantilla Items</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Under Review</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{underReviewCount}</div>
          <span className="text-[10px] text-slate-400">Document Verification</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">CSC QS Qualified</span>
          <div className="text-2xl font-black text-[#024794] mt-1">{qualifiedCount}</div>
          <span className="text-[10px] text-slate-400">Meets QS Standards</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Interview Scheduled</span>
          <div className="text-2xl font-black text-purple-600 mt-1">{interviewCount}</div>
          <span className="text-[10px] text-slate-400">HRMPSB Deliberation</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Application Result</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{appointedCount}</div>
          <span className="text-[10px] text-slate-400">Board Decisions Finalized</span>
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

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Stage:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs"
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

      {/* TAB 2: PLANTILLA VACANCIES */}
      {adminTab === 'plantilla' && (
        <div className="bg-white rounded-b-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Official Plantilla Items Management
              </h3>
              <p className="text-xs text-slate-500">
                Authorized Central Office positions and Civil Service publication status.
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
                    <span className="font-mono text-[10px] font-bold text-[#024794] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      SG {job.salaryGrade}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Closes: {job.closingDate}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{job.positionTitle}</h4>
                  <p className="font-mono text-xs text-slate-500">{job.itemNo}</p>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">{job.division}</p>
                </div>
              </div>
            ))}
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
                {applications.map((app, idx) => {
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
                    <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-slate-800">{doc.name}</span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-400">{doc.fileSize}</span>
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
                      <option value="Submitted">1. Application Received &amp; Logged</option>
                      <option value="Document Under Review">2. HR Document Verification</option>
                      <option value="CSC QS Qualified - Under Review">3. CSC QS Review</option>
                      <option value="HRMPSB Deliberation & Interview Scheduled">4. HRMPSB Deliberation &amp; Interview</option>
                      <option value="HRMPSB Recommended for Appointment">5. Recommended for Appointment</option>
                      <option value="Application Result Released">6. Application Result Promulgated</option>
                      <option value="Regret / Not Qualified">7. Regret / Not Qualified</option>
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

            {createJobError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{createJobError}</span>
              </div>
            )}

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
                    placeholder="e.g. BFAR-OSEC-CO-AQ3-2026-091"
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Salary Grade (SG)</label>
                  <input
                    type="number"
                    value={newJobForm.salaryGrade}
                    onChange={(e) => setNewJobForm({ ...newJobForm, salaryGrade: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Closing Date</label>
                  <input
                    type="text"
                    value={newJobForm.closingDate}
                    onChange={(e) => setNewJobForm({ ...newJobForm, closingDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreatingJob(false)}
                  className="px-4 py-2 rounded border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#024794] hover:bg-[#033b7a] text-white font-bold shadow-md"
                >
                  Publish Vacancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
