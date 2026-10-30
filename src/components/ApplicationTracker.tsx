import React, { useState, useEffect } from 'react';
import { ApplicationRecord } from '../types';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  GraduationCap,
  Briefcase,
  Award,
  Sparkles,
  MapPin,
  Calendar,
  ChevronRight,
  ShieldAlert,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react';

interface ApplicationTrackerProps {
  initialTrackingCode?: string;
  recentApplications?: ApplicationRecord[];
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  initialTrackingCode = '',
  recentApplications = [],
}) => {
  const [trackingInput, setTrackingInput] = useState(initialTrackingCode);
  const [currentApp, setCurrentApp] = useState<ApplicationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialTrackingCode) {
      setTrackingInput(initialTrackingCode);
      fetchApplicationByCode(initialTrackingCode);
    } else if (recentApplications.length > 0) {
      setTrackingInput(recentApplications[0].trackingCode);
      fetchApplicationByCode(recentApplications[0].trackingCode);
    }
  }, [initialTrackingCode, recentApplications]);

  const fetchApplicationByCode = async (code: string) => {
    if (!code.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/applications/track/${encodeURIComponent(code.trim())}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentApp(json.data);
      } else {
        setCurrentApp(null);
        setErrorMessage(json.error || 'No application record found for this tracking number.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to BFAR application tracking server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplicationByCode(trackingInput);
  };

  const handleCopyCode = () => {
    if (!currentApp) return;
    navigator.clipboard.writeText(currentApp.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 text-center space-y-4">
        <div className="max-w-xl mx-auto">
          <span className="text-[11px] font-bold text-[#024794] uppercase tracking-widest block mb-1">
            Official Application Tracker
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Track Your Plantilla Application Status
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Enter your official BFAR Application Reference Number (e.g. BFAR-2026-CO-8942) to check
            document verification, CSC qualification review, and HRMPSB deliberation updates.
          </p>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. BFAR-2026-CO-8942"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#024794]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#024794] hover:bg-[#033b7a] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {/* Quick Test Demo Codes */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
          <span className="text-slate-500 text-[11px]">Quick test Central Office application:</span>
          <button
            type="button"
            onClick={() => {
              setTrackingInput('BFAR-2026-CO-8942');
              fetchApplicationByCode('BFAR-2026-CO-8942');
            }}
            className="font-mono bg-blue-50 text-[#024794] border border-blue-200 px-2 py-0.5 rounded text-[11px] hover:bg-blue-100"
          >
            BFAR-2026-CO-8942 (Aquaculture Division)
          </button>
          <button
            type="button"
            onClick={() => {
              setTrackingInput('BFAR-2026-CO-7719');
              fetchApplicationByCode('BFAR-2026-CO-7719');
            }}
            className="font-mono bg-blue-50 text-[#024794] border border-blue-200 px-2 py-0.5 rounded text-[11px] hover:bg-blue-100"
          >
            BFAR-2026-CO-7719 (FPLEG Enforcement)
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Application Details & Stepper */}
      {currentApp && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Status Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="bg-[#024794] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    Civil Service Track
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-sky-200">
                    <span>{currentApp.trackingCode}</span>
                    <button
                      onClick={handleCopyCode}
                      className="text-white/80 hover:text-white p-0.5 rounded"
                      title="Copy Reference Number"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold">{currentApp.positionTitle}</h3>
                <p className="text-xs text-sky-200 mt-0.5">
                  Plantilla Item: {currentApp.plantillaItemNo} • {currentApp.region}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-sky-200 uppercase tracking-widest block font-bold">
                  Current Official Stage
                </span>
                <span className="inline-block mt-1 font-bold text-xs px-3 py-1 rounded-full bg-white text-[#024794] shadow-xs">
                  {currentApp.status}
                </span>
                <span className="text-[11px] text-sky-200 block mt-1">
                  Submitted: {currentApp.submissionDate}
                </span>
              </div>
            </div>

            {/* Stepper Pipeline: Streamlined 5-Stage Recruitment & Selection Milestone Tracker */}
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recruitment &amp; Selection Milestone Tracker
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  5 Key Civil Service Milestones
                </span>
              </div>

              <div className="relative">
                {/* 5-Stage Stepper Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {currentApp.statusTimeline.map((step, idx) => {
                    const isDone = step.isCompleted;
                    const isCurr = step.isCurrent;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                          isCurr
                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/50 shadow-xs'
                            : isDone
                            ? 'bg-white border-emerald-300'
                            : 'bg-slate-100/70 border-slate-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                isDone
                                  ? 'bg-emerald-600 text-white'
                                  : isCurr
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-slate-300 text-slate-700'
                              }`}
                            >
                              {isDone ? '✓' : idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {step.date.split(' ')[0]}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-[11px] leading-tight">
                            {step.step}
                          </p>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">
                          {step.notes || 'In queue'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Screening Review Box */}
            <div className="p-6 bg-gradient-to-r from-blue-50/50 to-slate-50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#024794] text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      AI Qualification Standards (QS) Audit Report
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Evaluated by Gemini AI Engine against CSC Qualification Standards
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">
                    Suitability Index
                  </span>
                  <span className="text-base font-black text-[#024794]">
                    {currentApp.aiScreening?.overallScore || 90}/100
                  </span>
                </div>
              </div>

              {/* 4 QS pillars */}
              {currentApp.aiScreening?.qsCompliance && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block">Education:</span>
                    <span className="text-slate-600 text-[10px]">
                      {currentApp.aiScreening.qsCompliance.educationAnalysis}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block">Experience:</span>
                    <span className="text-slate-600 text-[10px]">
                      {currentApp.aiScreening.qsCompliance.experienceAnalysis}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block">Training Hours (CSC):</span>
                    <span className="text-slate-600 text-[10px] block">
                      {currentApp.aiScreening.qsCompliance.trainingAnalysis}
                    </span>
                    {currentApp.aiScreening.qsCompliance.flaggedTrainingEntries &&
                      currentApp.aiScreening.qsCompliance.flaggedTrainingEntries.length > 0 && (
                        <div className="mt-1 bg-amber-50 text-amber-800 border border-amber-200 p-1.5 rounded text-[9px] flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>CSC Rule:</strong> {currentApp.aiScreening.qsCompliance.excludedTrainingHours} hrs excluded (RP/Facilitator/Conference roles).
                          </span>
                        </div>
                      )}
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block">Eligibility:</span>
                    <span className="text-slate-600 text-[10px]">
                      {currentApp.aiScreening.qsCompliance.eligibilityAnalysis}
                    </span>
                  </div>
                </div>
              )}

              {/* Evaluator Remarks */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block mb-1">
                  HR Reviewer &amp; HRMPSB Secretariat Remarks:
                </span>
                <p className="text-slate-600 italic">
                  "{currentApp.adminRemarks || 'Document verification underway.'}"
                </p>
                {currentApp.interviewScore && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded text-xs font-semibold">
                    <span>HRMPSB Interview Score:</span>
                    <span className="font-mono font-bold">{currentApp.interviewScore} / 100</span>
                  </div>
                )}
                {currentApp.finalBoardDecision && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 text-[#024794] border border-blue-200 px-2.5 py-1 rounded text-xs font-bold">
                    <span>Application Result Decision:</span>
                    <span>{currentApp.finalBoardDecision}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Applicant Credentials Summary Drawer */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-2 border-b border-slate-200">
              Submitted Application Dossier (CS Form 212 &amp; Mandatory Attachments)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Applicant Name</span>
                <span className="font-semibold text-slate-800">{currentApp.personalInfo.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Contact Email</span>
                <span className="font-semibold text-slate-800">{currentApp.personalInfo.email}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Mobile Phone</span>
                <span className="font-semibold text-slate-800">{currentApp.personalInfo.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Highest Degree &amp; Honors</span>
                <span className="font-semibold text-slate-800">
                  {currentApp.education[0]?.degree || 'Bachelor Degree'}
                  {currentApp.education[0]?.honors && currentApp.education[0].honors !== 'None' ? ` (${currentApp.education[0].honors})` : ''}
                </span>
                {currentApp.education[0]?.unitsEarned && (
                  <span className="text-[10px] text-blue-700 block font-medium">
                    Units Earned: {currentApp.education[0].unitsEarned}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Civil Service / PRC License</span>
                <span className="font-semibold text-slate-800">
                  {currentApp.eligibility[0]?.type || 'CS Professional'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Current / Recent Position</span>
                <span className="font-semibold text-slate-800">
                  {currentApp.workExperience[0]?.position || 'Specialist'}
                </span>
              </div>
            </div>

            {/* Document Checklist */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">
                Mandatory &amp; Supporting Documents Uploaded ({currentApp.documentsUploaded.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {currentApp.documentsUploaded.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-1.5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="bg-[#024794] text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0">
                        {doc.category || 'DOC'}
                      </span>
                      <span className="truncate text-slate-800 text-[11px] font-medium" title={doc.name}>
                        {doc.name}
                      </span>
                    </div>
                    {doc.autoCorrected && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded shrink-0">
                        Auto-Sorted
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
