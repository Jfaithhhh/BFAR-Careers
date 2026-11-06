import React, { useState, useEffect, useRef } from 'react';
import { ApplicationRecord } from '../types';
import { subscribeToSingleApplication } from '../lib/firestoreService';
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
  Radio,
  UserCheck,
  TrendingUp,
  FileCheck2,
  ShieldCheck,
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
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const codeToTrack = initialTrackingCode || (recentApplications.length > 0 ? recentApplications[0].trackingCode : '');
    if (codeToTrack) {
      setTrackingInput(codeToTrack);
      trackApplicationWithRealtime(codeToTrack);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [initialTrackingCode]);

  const trackApplicationWithRealtime = async (code: string) => {
    if (!code.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Initial HTTP fetch from server API
    try {
      const res = await fetch(`/api/applications/track/${encodeURIComponent(cleanCode)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentApp(json.data);
      } else {
        // Fallback: check recentApplications in memory
        const found = recentApplications.find(
          (a) => a.trackingCode.toUpperCase() === cleanCode || a.id.toUpperCase() === cleanCode
        );
        if (found) {
          setCurrentApp(found);
        } else {
          setCurrentApp(null);
          setErrorMessage(json.error || 'No application record found for this tracking number.');
        }
      }
    } catch (err) {
      console.warn('API lookup error, checking local and Firestore:', err);
    } finally {
      setIsLoading(false);
    }

    // 2. Attach live Firestore subscription for real-time instant status updates
    try {
      const unsub = subscribeToSingleApplication(cleanCode, (updatedApp) => {
        if (updatedApp) {
          setCurrentApp(updatedApp);
          setIsLiveConnected(true);
          setErrorMessage(null);
        }
      });
      unsubscribeRef.current = unsub;
      setIsLiveConnected(true);
    } catch (err) {
      console.warn('Could not connect real-time Firestore listener:', err);
      setIsLiveConnected(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    trackApplicationWithRealtime(trackingInput);
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
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#024794] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>Official Application Tracker • Real-Time Database</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Track Your Plantilla Application Status
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Enter your official BFAR Application Reference Number (e.g. BFAR-2026-CO-8942) to monitor
            real-time document verification, AI pre-screening advisory evaluation, and HRMPSB deliberation updates.
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

        {/* Quick Click from Recent Submissions */}
        {recentApplications.length > 0 && (
          <div className="max-w-xl mx-auto pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-500 font-medium text-[11px]">Recent Submissions:</span>
            {recentApplications.slice(0, 3).map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => {
                  setTrackingInput(app.trackingCode);
                  trackApplicationWithRealtime(app.trackingCode);
                }}
                className={`font-mono text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  trackingInput.toUpperCase() === app.trackingCode.toUpperCase()
                    ? 'bg-[#024794] text-white border-[#024794]'
                    : 'bg-slate-50 hover:bg-blue-50 text-[#024794] border-slate-200'
                }`}
              >
                {app.trackingCode} {app.applicantType === 'internal' && '(Internal)'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <strong className="font-bold block">Application Not Found</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Empty / Initial Instructions Card */}
      {!currentApp && !errorMessage && !isLoading && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-[#024794] rounded-full flex items-center justify-center mx-auto">
            <Search className="w-8 h-8 text-[#024794]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Track Your Application Status
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your BFAR Application Reference Number (e.g. <span className="font-mono text-[#024794] font-semibold">BFAR-2026-CO-XXXX</span>) in the search box above to view your real-time CSC milestone progress, document audit, and AI qualification assessment.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Connected to DA-BFAR Firestore Live Database</span>
          </div>
        </div>
      )}

      {/* Application Details Card */}
      {currentApp && (
        <div className="space-y-6">
          {/* Main Top Summary Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            {/* Header Status Bar */}
            <div className="bg-[#0b2447] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-black text-amber-300">
                    {currentApp.trackingCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                    title="Copy Reference Number"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {isLiveConnected && (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Real-Time Sync Active
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {currentApp.positionTitle}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-0.5">
                  <span>Plantilla Item: <strong className="text-sky-200">{currentApp.plantillaItemNo}</strong></span>
                  <span>•</span>
                  <span>Region: {currentApp.region}</span>
                </div>
              </div>

              {/* Status Pill & Track Badge */}
              <div className="flex flex-col sm:items-end gap-1.5">
                <div className="flex items-center gap-1.5">
                  {currentApp.applicantType === 'internal' && (
                    <span className="bg-purple-500/30 text-purple-200 border border-purple-400/50 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-purple-300" />
                      <span>BFAR Internal Track</span>
                    </span>
                  )}
                  <span className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    {currentApp.status}
                  </span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Submitted: {currentApp.submissionDate}
                </span>
              </div>
            </div>

            {/* Internal BFAR Employee Metadata Banner (If Internal) */}
            {currentApp.applicantType === 'internal' && (
              <div className="bg-purple-50/70 border-b border-purple-200 p-4 text-xs text-purple-950 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold block text-purple-900">
                      DA-BFAR Personnel Internal Promotional Docket
                    </span>
                    <span className="text-[11px] text-purple-700">
                      Employee ID: <strong className="font-mono">{currentApp.bfarEmployeeId || 'BFAR-EMP-VERIFIED'}</strong> • Track:{' '}
                      <strong>{currentApp.promotionTrack || 'Promotion'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {currentApp.currentSalaryGrade && (
                    <span className="bg-white px-2 py-0.5 rounded border border-purple-200 font-semibold text-purple-800">
                      Current Grade: SG {currentApp.currentSalaryGrade}
                    </span>
                  )}
                  {currentApp.yearsInBfar !== undefined && (
                    <span className="bg-white px-2 py-0.5 rounded border border-purple-200 font-semibold text-purple-800">
                      Service: {currentApp.yearsInBfar} Years
                    </span>
                  )}
                  {currentApp.latestIpcrRating && (
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300 font-bold flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3 text-emerald-600" />
                      IPCR Rating: {currentApp.latestIpcrRating.toFixed(2)}/5.00
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Candidate Info Grid */}
            <div className="p-4 sm:p-5 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Applicant Name:</span>
                <strong className="text-slate-900 text-sm block mt-0.5">
                  {currentApp.personalInfo.fullName}
                </strong>
                <span className="text-slate-500">{currentApp.personalInfo.civilStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Contact Details:</span>
                <span className="text-slate-800 block mt-0.5">{currentApp.personalInfo.email}</span>
                <span className="text-slate-600 font-mono text-[11px]">{currentApp.personalInfo.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Residential Address:</span>
                <span className="text-slate-700 block mt-0.5 line-clamp-2">
                  {currentApp.personalInfo.residentialAddress}
                </span>
              </div>
            </div>

            {/* REVISED 5-STAGE MILESTONE PIPELINE TRACKER */}
            <div className="p-4 sm:p-6 bg-slate-50/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#024794]" />
                  <span>Civil Service Recruitment &amp; Selection Milestone Pipeline</span>
                </h4>
                <span className="text-[10px] text-slate-500">DA-BFAR Merit Selection Plan (MSP)</span>
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {currentApp.statusTimeline.map((step, idx) => {
                  const isDone = step.isCompleted;
                  const isCur = step.isCurrent;

                  return (
                    <div key={idx} className="relative group">
                      {/* Step Circle Marker */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                            : isCur
                            ? 'bg-[#024794] text-white ring-4 ring-blue-100 animate-pulse'
                            : 'bg-white border-2 border-slate-300 text-slate-400'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        ) : (
                          <span className="text-[10px] sm:text-xs">{idx + 1}</span>
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5
                            className={`font-bold text-xs sm:text-sm ${
                              isCur ? 'text-[#024794]' : isDone ? 'text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            {step.step}
                          </h5>
                          <div className="flex items-center gap-2">
                            {isCur && (
                              <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wide">
                                In Progress
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {step.date}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600">{step.notes}</p>
                        <div className="text-[10px] text-slate-400 pt-1">
                          Evaluated by: <strong className="text-slate-600">{step.by}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GEMINI AI AUTOMATED QUALIFICATION STANDARDS (QS) ADVISORY EVALUATION */}
          {currentApp.aiScreening && (
            <div className="bg-white rounded-xl shadow-xs border border-blue-200 overflow-hidden space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-[#024794] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      Automated Qualification Standards (QS) Fit Evaluation
                    </h4>
                    <span className="text-[11px] text-blue-200">
                      Powered by Gemini AI Engine • Generated at submission
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-200">QS Fit Score:</span>
                  <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded shadow-xs">
                    {currentApp.aiScreening.overallScore} / 100
                  </span>
                </div>
              </div>

              {/* MANDATORY LEGAL & CSC ADVISORY DISCLAIMER */}
              <div className="px-5 pt-1">
                <div className="bg-amber-50 border border-amber-300/80 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <strong className="font-bold block text-amber-900">
                      Notice of Advisory Status:
                    </strong>
                    <span>
                      This AI-generated evaluation represents an automated preliminary pre-screening recommendation
                      based strictly on CSC Qualification Standards (QS). <strong>It is NOT a final or binding hiring decision.</strong> Official
                      review, comparative ranking, and final hiring recommendations remain exclusively under the authority
                      of the DA-BFAR Human Resource Merit Promotion and Selection Board (HRMPSB) and the National Director.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Recommendation summary banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Initial Advisory Recommendation:
                  </span>
                  <div className="font-semibold text-slate-900 text-sm">
                    {currentApp.aiScreening.summaryRecommendation}
                  </div>
                  <div className="text-[11px] text-slate-600 pt-0.5">
                    Recommended Preliminary Status:{' '}
                    <strong className="text-[#024794]">{currentApp.aiScreening.recommendedStatus}</strong>
                  </div>
                </div>

                {/* 4 Pillars QS Compliance Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Education */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#024794]" />
                        Education QS
                      </span>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${
                          currentApp.aiScreening.qsCompliance.educationMatch
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {currentApp.aiScreening.qsCompliance.educationMatch ? 'Passed' : 'Review Needed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {currentApp.aiScreening.qsCompliance.educationAnalysis}
                    </p>
                  </div>

                  {/* Experience */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#024794]" />
                        Experience QS
                      </span>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${
                          currentApp.aiScreening.qsCompliance.experienceMatch
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {currentApp.aiScreening.qsCompliance.experienceMatch ? 'Passed' : 'Review Needed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {currentApp.aiScreening.qsCompliance.experienceAnalysis}
                    </p>
                  </div>

                  {/* Training Hours (With strict exclusion audit) */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#024794]" />
                        Training Hours QS
                      </span>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${
                          currentApp.aiScreening.qsCompliance.trainingMatch
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {currentApp.aiScreening.qsCompliance.trainingMatch ? 'Passed' : 'Review Needed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {currentApp.aiScreening.qsCompliance.trainingAnalysis}
                    </p>
                    <div className="pt-1 flex flex-wrap gap-2 text-[10px]">
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                        Qualifying: {currentApp.aiScreening.qsCompliance.qualifyingTrainingHours || 0} Hours
                      </span>
                      {currentApp.aiScreening.qsCompliance.excludedTrainingHours > 0 && (
                        <span className="bg-amber-50 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                          Excluded non-qualifying: {currentApp.aiScreening.qsCompliance.excludedTrainingHours} Hours
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Eligibility */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <BadgeCheck className="w-3.5 h-3.5 text-[#024794]" />
                        Civil Service Eligibility QS
                      </span>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${
                          currentApp.aiScreening.qsCompliance.eligibilityMatch
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {currentApp.aiScreening.qsCompliance.eligibilityMatch ? 'Passed' : 'Review Needed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {currentApp.aiScreening.qsCompliance.eligibilityAnalysis}
                    </p>
                  </div>
                </div>

                {/* Strengths */}
                {currentApp.aiScreening.strengths && currentApp.aiScreening.strengths.length > 0 && (
                  <div className="pt-2">
                    <span className="font-bold text-slate-700 block mb-1">Key Strengths Identified:</span>
                    <ul className="space-y-1">
                      {currentApp.aiScreening.strengths.map((str, i) => (
                        <li key={i} className="text-slate-600 flex items-start gap-2 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Uploaded Documents Verification Status */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#024794]" />
              <span>Mandatory Application Documents Attached ({currentApp.documentsUploaded.length})</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {currentApp.documentsUploaded.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#024794] shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-slate-800 block truncate">{doc.name}</span>
                      <span className="text-[10px] text-slate-400">
                        Category: {doc.category} • {doc.fileSize || 'PDF'}
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded shrink-0">
                    {doc.status || 'Verified'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
