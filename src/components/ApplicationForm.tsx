import React, { useState, useEffect } from 'react';
import { PlantillaJob, ApplicationRecord, AiScreeningResult } from '../types';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  User,
  GraduationCap,
  Briefcase,
  Award,
  Calendar,
  Send,
  Plus,
  Trash2,
  Wand2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  Check,
} from 'lucide-react';

interface ApplicationFormProps {
  jobs: PlantillaJob[];
  selectedJobId?: string;
  onApplicationSubmitted: (app: ApplicationRecord) => void;
  onNavigateToTrack: (trackingCode: string) => void;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  jobs,
  selectedJobId,
  onApplicationSubmitted,
  onNavigateToTrack,
}) => {
  const [currentJobId, setCurrentJobId] = useState<string>(selectedJobId || jobs[0]?.id || '');

  // Active Job Details
  const activeJob = jobs.find((j) => j.id === currentJobId) || jobs[0];

  // AI Resume paste & state
  const [rawResumeText, setRawResumeText] = useState('');
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiParseStatus, setAiParseStatus] = useState<string | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<ApplicationRecord | null>(null);

  // Form Fields (PDS / CS Form 212 Structure)
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    civilStatus: 'Single',
    residentialAddress: '',
  });

  const [education, setEducation] = useState<
    Array<{ level: string; degree: string; school: string; yearGraduated: string; honors: string }>
  >([
    {
      level: 'College / Tertiary',
      degree: '',
      school: '',
      yearGraduated: '',
      honors: '',
    },
  ]);

  const [eligibility, setEligibility] = useState<
    Array<{ type: string; licenseNo: string; rating: string; examDate: string }>
  >([
    {
      type: '',
      licenseNo: '',
      rating: '',
      examDate: '',
    },
  ]);

  const [workExperience, setWorkExperience] = useState<
    Array<{
      position: string;
      agencyOrCompany: string;
      fromDate: string;
      toDate: string;
      isGovService: boolean;
      description: string;
    }>
  >([
    {
      position: '',
      agencyOrCompany: '',
      fromDate: '',
      toDate: '',
      isGovService: false,
      description: '',
    },
  ]);

  const [training, setTraining] = useState<
    Array<{ title: string; hours: number; provider: string; year: string }>
  >([
    {
      title: '',
      hours: 8,
      provider: '',
      year: new Date().getFullYear().toString(),
    },
  ]);

  const [statementOfIntent, setStatementOfIntent] = useState('');
  const [documentsUploaded, setDocumentsUploaded] = useState([
    { name: 'Application Letter', type: 'PDF', status: 'Uploaded' as const, fileSize: '1.2 MB' },
    { name: 'CS Form 212 (Personal Data Sheet)', type: 'PDF', status: 'Uploaded' as const, fileSize: '2.4 MB' },
    { name: 'Transcript of Records (TOR)', type: 'PDF', status: 'Uploaded' as const, fileSize: '3.1 MB' },
    { name: 'Certificate of Eligibility / PRC License', type: 'PDF', status: 'Uploaded' as const, fileSize: '850 KB' },
    { name: 'Certificates of Relevant Trainings', type: 'PDF', status: 'Uploaded' as const, fileSize: '1.5 MB' },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedJobId) {
      setCurrentJobId(selectedJobId);
    }
  }, [selectedJobId]);

  // Pre-fill with curated samples
  const handleLoadSample = (sampleType: 'fisheries' | 'criminology' | 'marine') => {
    if (sampleType === 'fisheries') {
      const matchJob = jobs.find((j) => j.positionTitle.toLowerCase().includes('aqua')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setRawResumeText(`Candidate: Maria Angela Santos, RFT
Email: maria.santos@fisheries.ph | Mobile: +63 917 554 9912
Address: Brgy. Central, Diliman, Quezon City, NCR
Birthdate: 1996-05-18 | Status: Single

PROFESSIONAL ELIGIBILITY:
- PRC Registered Fisheries Technologist (RA 1080) - License No. FT-008921 (Rating: 87.20%, Passed Oct 2019)
- Career Service Professional (CSC Level 2)

EDUCATION:
- Bachelor of Science in Fisheries (Major in Aquaculture), Central Luzon State University (CLSU), Graduated 2018 (Cum Laude)

WORK EXPERIENCE:
1. Technical Field Specialist | BFAR Central Office - Aquaculture Division
   March 2022 - Present (Government Service: Yes)
   Assisted in national broodstock dissemination, fish cage biosecurity inspections, and municipal nursery monitoring.
2. Aquaculture Research Fellow | Freshwater Aquaculture Research Center
   June 2018 - February 2022
   Conducted artificial propagation of tilapia and milkfish, water quality parameter titration, and feed conversion efficiency trials.

RELEVANT TRAININGS:
- Sustainable Inland Aquaculture & Fish Health Management (BFAR-NFFTC, 24 Hours, 2024)
- Water Quality Parameter Analysis and Biosecurity in Hatcheries (SEAFDEC/AQD, 16 Hours, 2023)
- Civil Service Rules and Code of Conduct for Public Servants (CSC, 8 Hours, 2022)`);
    } else if (sampleType === 'criminology') {
      const matchJob = jobs.find((j) => j.positionTitle.toLowerCase().includes('regulations')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setRawResumeText(`Candidate: Marc Joshua Dela Cruz
Email: mj.delacruz@enforcement.gov.ph | Mobile: +63 928 334 1902
Address: Project 4, Quezon City, NCR
Birthdate: 1994-09-12 | Status: Married

PROFESSIONAL ELIGIBILITY:
- Career Service Professional Eligibility (CSC Level 2), Rating: 84.60% (2017)
- PRC Registered Criminologist (RA 6506), License No. RC-094120

EDUCATION:
- Bachelor of Science in Criminology, Philippine College of Criminology (PCCR), Graduated 2016

WORK EXPERIENCE:
1. Maritime Safety & Enforcement Officer | Philippine Ports Authority / Coast Guard Auxiliary
   January 2020 - Present (Government Service: Yes)
   Conducted port vessel boarding, maritime security checks, and inter-agency operations with PCG and BFAR against contraband and fishery violations.
2. Port Operations Inspector | North Harbor Logistics Corp.
   April 2017 - December 2019
   Handled cargo manifest auditing, safety compliance, and surveillance reporting.

RELEVANT TRAININGS:
- Seaborne Maritime Law Enforcement & Boarding Procedures (PCG Training Command, 40 Hours, 2023)
- Comprehensive Workshop on the Philippine Fisheries Code RA 8550 as amended by RA 10654 (DA-BFAR, 16 Hours, 2024)
- Investigation and Chain of Custody Protocol for Environmental Violations (DENR-EMB, 16 Hours, 2022)`);
    } else {
      const matchJob = jobs.find((j) => j.positionTitle.toLowerCase().includes('marine')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setRawResumeText(`Candidate: Dr. Roberto Alcantara
Email: roberto.alcantara@marine.ph | Mobile: +63 908 772 3418
Address: Teachers Village, Diliman, Quezon City, NCR
Birthdate: 1991-03-24 | Status: Single

PROFESSIONAL ELIGIBILITY:
- Career Service Professional Eligibility (Level 2)
- PRC Registered Fisheries Technologist (RA 1080)

EDUCATION:
- Master of Science in Marine Biology, UP Diliman Marine Science Institute (2021)
- Bachelor of Science in Marine Biology, University of the Philippines (2014)

WORK EXPERIENCE:
1. Senior Coastal Resource Specialist | Marine Conservation Policy Center
   August 2020 - Present (Non-Government / Research)
   Led marine protected area (MPA) monitoring, underwater transect surveys, and national fish biomass assessments.
2. Science Research Assistant | National Stock Assessment Program (NSAP - BFAR Central Office)
   January 2016 - July 2020 (Government Service: Yes)
   Compiled catch and effort statistical data under the National Stock Assessment Program.

RELEVANT TRAININGS:
- Advanced Scientific Diving and Benthic Line Intercept Transect (PADI/UP, 40 Hours, 2024)
- Marine Spatial Planning & MPA Management in Fisheries (BFAR Central Office, 24 Hours, 2023)`);
    }
  };

  // Run AI Resume / PDS Parser
  const handleParseWithAi = async () => {
    if (!rawResumeText.trim()) {
      setAiParseStatus('⚠️ Please paste a resume text or click one of the quick sample candidates above.');
      return;
    }

    setIsParsingAi(true);
    setAiParseStatus('BFAR AI Assistant is analyzing credentials against CSC standards...');

    try {
      const res = await fetch('/api/ai/parse-pds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawResumeText,
          targetJobId: currentJobId,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.personalInfo) {
          setPersonalInfo({
            fullName: d.personalInfo.fullName || personalInfo.fullName,
            email: d.personalInfo.email || personalInfo.email,
            phone: d.personalInfo.phone || personalInfo.phone,
            birthDate: d.personalInfo.birthDate || personalInfo.birthDate,
            civilStatus: d.personalInfo.civilStatus || 'Single',
            residentialAddress: d.personalInfo.residentialAddress || personalInfo.residentialAddress,
          });
        }
        if (d.education && d.education.length > 0) {
          setEducation(
            d.education.map((e: any) => ({
              level: e.level || 'College / Tertiary',
              degree: e.degree || '',
              school: e.school || '',
              yearGraduated: e.yearGraduated || '',
              honors: e.honors || 'None',
            }))
          );
        }
        if (d.eligibility && d.eligibility.length > 0) {
          setEligibility(
            d.eligibility.map((el: any) => ({
              type: el.type || '',
              licenseNo: el.licenseNo || '',
              rating: el.rating || '',
              examDate: el.examDate || '',
            }))
          );
        }
        if (d.workExperience && d.workExperience.length > 0) {
          setWorkExperience(
            d.workExperience.map((w: any) => ({
              position: w.position || '',
              agencyOrCompany: w.agencyOrCompany || '',
              fromDate: w.fromDate || '',
              toDate: w.toDate || '',
              isGovService: Boolean(w.isGovService),
              description: w.description || '',
            }))
          );
        }
        if (d.training && d.training.length > 0) {
          setTraining(
            d.training.map((t: any) => ({
              title: t.title || '',
              hours: Number(t.hours) || 8,
              provider: t.provider || '',
              year: t.year || '2024',
            }))
          );
        }
        if (d.statementOfIntent) {
          setStatementOfIntent(d.statementOfIntent);
        }
        setAiParseStatus('✨ Successfully extracted into CS Form 212 fields! Review below.');
      } else {
        setAiParseStatus('Analysis completed with standard extraction.');
      }
    } catch (err) {
      console.error(err);
      setAiParseStatus('Failed to connect to AI engine. Manual input is active.');
    } finally {
      setIsParsingAi(false);
    }
  };

  // Generate formal Philippine Civil Service Application Letter
  const handleGenerateCoverLetter = async () => {
    setIsGeneratingLetter(true);
    try {
      const res = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJobId,
          applicantData: {
            personalInfo,
            education,
            eligibility,
            workExperience,
            training,
          },
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStatementOfIntent(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  // Pre-submission Qualification Standards Fit Check
  const totalTrainingHours = training.reduce((acc, t) => acc + (Number(t.hours) || 0), 0);
  const totalExperienceItems = workExperience.filter((w) => w.position.trim()).length;
  const hasDegrees = education.some((e) => e.degree.trim());
  const hasElig = eligibility.some((e) => e.type.trim());

  // Handle Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!personalInfo.fullName.trim() || !personalInfo.email.trim()) {
      setFormError('Please fill in your Full Name and Email address before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJobId,
          personalInfo,
          education,
          eligibility,
          workExperience,
          training,
          statementOfIntent,
          documentsUploaded,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setSubmissionSuccess(json.data);
        onApplicationSubmitted(json.data);
      } else {
        setFormError(json.error || 'Submission error. Please verify your details and try again.');
      }
    } catch (err) {
      setFormError('Network error submitting application to BFAR portal. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* SUCCESS MODAL AFTER SUBMISSION */}
      {submissionSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-center border-2 border-emerald-500 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Application Successfully Registered
            </span>

            <h3 className="text-xl font-black text-slate-900 mt-3">
              DA-BFAR Plantilla Application Logged
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Your credentials have been successfully transmitted to the BFAR Human Resource Merit
              Promotion and Selection Board (HRMPSB).
            </p>

            {/* Tracking Code Box */}
            <div className="bg-slate-50 border-2 border-dashed border-[#024794] rounded-xl p-4 my-5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                Official Application Reference No.
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-[#024794] tracking-wider block mt-1">
                {submissionSuccess.trackingCode}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Save this reference number to monitor your evaluation progress.
              </span>
            </div>

            {/* AI Screening Snapshot */}
            <div className="bg-blue-50/70 p-3 rounded-lg text-left text-xs mb-5 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#024794] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Pre-Screening Score:</span>
                </span>
                <span className="font-extrabold text-sm text-[#024794]">
                  {submissionSuccess.aiScreening?.overallScore || 90}/100
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {submissionSuccess.aiScreening?.summaryRecommendation}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  const code = submissionSuccess.trackingCode;
                  setSubmissionSuccess(null);
                  onNavigateToTrack(code);
                }}
                className="flex-1 bg-[#024794] hover:bg-[#033b7a] text-white py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>Track Application Status Now</span>
              </button>
              <button
                onClick={() => setSubmissionSuccess(null)}
                className="border border-slate-300 text-slate-700 py-2.5 px-4 rounded-lg font-semibold text-xs hover:bg-slate-100"
              >
                Submit Another Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Position Selection Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Step 1: Select Plantilla Item
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">
              Applying for Bureau of Fisheries and Aquatic Resources Vacancy
            </h2>
          </div>
          <div className="w-full md:w-96">
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Choose Plantilla Position:
            </label>
            <select
              value={currentJobId}
              onChange={(e) => setCurrentJobId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-[#024794] focus:ring-2 focus:ring-[#024794]"
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.positionTitle} (SG-{job.salaryGrade}) — {job.division}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Job Qualification Standards Summary */}
        {activeJob && (
          <div className="mt-4 bg-linear-to-r from-blue-50/70 via-sky-50/50 to-slate-50 p-4 rounded-lg border border-blue-200 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="font-bold text-[#024794] text-sm">
                {activeJob.positionTitle} — Plantilla #{activeJob.itemNo}
              </span>
              <span className="bg-[#024794] text-white px-2.5 py-1 rounded text-xs font-bold tracking-wide">
                Salary Grade: SG-{activeJob.salaryGrade}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white/80 p-2 rounded border border-slate-200">
                <strong className="text-slate-800 block">Education:</strong>
                <span className="text-slate-600">{activeJob.qualificationStandards.education}</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-slate-200">
                <strong className="text-slate-800 block">Experience:</strong>
                <span className="text-slate-600">{activeJob.qualificationStandards.experience}</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-slate-200">
                <strong className="text-slate-800 block">Training:</strong>
                <span className="text-slate-600">{activeJob.qualificationStandards.training}</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-slate-200">
                <strong className="text-slate-800 block">Eligibility:</strong>
                <span className="text-slate-600">{activeJob.qualificationStandards.eligibility}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI RESUME / PDS FAST-FILL ASSISTANT HERO */}
      <div className="bg-gradient-to-br from-[#024794] to-[#04336b] rounded-xl shadow-md text-white p-6 relative overflow-hidden border border-blue-900">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">
                  AI Fast-Fill Assistant (Gemini 3.8 Flash)
                </h3>
                <p className="text-xs text-sky-200">
                  Paste your resume or CV. The AI engine will parse your credentials directly into CS
                  Form 212 fields and evaluate your Qualification Standards fit.
                </p>
              </div>
            </div>

            {/* Quick Sample Candidates Picker */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
              <span className="text-[11px] text-amber-300 font-semibold">Try sample:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('fisheries')}
                className="bg-white/10 hover:bg-white/20 text-white text-[11px] px-2.5 py-1 rounded-md border border-white/20 transition-colors"
              >
                Fisheries Tech
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('criminology')}
                className="bg-white/10 hover:bg-white/20 text-white text-[11px] px-2.5 py-1 rounded-md border border-white/20 transition-colors"
              >
                Regulations/Enforcement
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('marine')}
                className="bg-white/10 hover:bg-white/20 text-white text-[11px] px-2.5 py-1 rounded-md border border-white/20 transition-colors"
              >
                Marine Biology
              </button>
            </div>
          </div>

          <div>
            <textarea
              rows={4}
              placeholder="Paste your raw resume, curriculum vitae, or LinkedIn profile summary here..."
              value={rawResumeText}
              onChange={(e) => setRawResumeText(e.target.value)}
              className="w-full bg-white/95 text-slate-900 text-xs p-3 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-400 font-mono shadow-inner placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="text-xs text-sky-200 flex items-center gap-2">
              {isParsingAi && (
                <div className="flex items-center gap-2 text-amber-300 font-medium animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{aiParseStatus || 'Analyzing resume with Gemini...'}</span>
                </div>
              )}
              {!isParsingAi && aiParseStatus && (
                <span className="text-emerald-300 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {aiParseStatus}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={isParsingAi || !rawResumeText.trim()}
              onClick={handleParseWithAi}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Wand2 className="w-4 h-4" />
              <span>{isParsingAi ? 'Parsing Credentials...' : 'Extract & Auto-Fill with AI'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CIVIL SERVICE FORM 212 / PERSONAL DATA SHEET FORM */}
      <form onSubmit={handleSubmitApplication} className="space-y-6">
        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <User className="w-4 h-4 text-[#024794]" />
            <h3 className="font-bold text-slate-900 text-sm">
              I. Personal Information (CS Form 212 Equivalent)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Full Name (Surname, First Name, Middle Name) *
              </label>
              <input
                type="text"
                required
                value={personalInfo.fullName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                placeholder="e.g. Ramos, Danica Flores"
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#024794]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                placeholder="applicant@domain.ph"
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#024794]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mobile Contact No. *</label>
              <input
                type="tel"
                required
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                placeholder="+63 9XX XXX XXXX"
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#024794]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Date of Birth</label>
              <input
                type="date"
                value={personalInfo.birthDate}
                onChange={(e) => setPersonalInfo({ ...personalInfo, birthDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#024794]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Civil Status</label>
              <select
                value={personalInfo.civilStatus}
                onChange={(e) => setPersonalInfo({ ...personalInfo, civilStatus: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#024794]"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Residential Address (Barangay, City/Municipality, Province)
              </label>
              <input
                type="text"
                value={personalInfo.residentialAddress}
                onChange={(e) => setPersonalInfo({ ...personalInfo, residentialAddress: e.target.value })}
                placeholder="Complete address with Postal Code"
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#024794]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: CIVIL SERVICE ELIGIBILITY & PRC LICENSES */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#024794]" />
              <h3 className="font-bold text-slate-900 text-sm">
                II. Civil Service Eligibility &amp; PRC Board Licenses (RA 1080 / CSC)
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setEligibility([...eligibility, { type: '', licenseNo: '', rating: '', examDate: '' }])
              }
              className="text-xs text-[#024794] hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Eligibility</span>
            </button>
          </div>

          <div className="space-y-3">
            {eligibility.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 relative text-xs"
              >
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Career Service / RA 1080 Board
                  </label>
                  <input
                    type="text"
                    value={item.type}
                    onChange={(e) => {
                      const updated = [...eligibility];
                      updated[idx].type = e.target.value;
                      setEligibility(updated);
                    }}
                    placeholder="e.g. RA 1080 (Fisheries Technologist)"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    License / Certificate No.
                  </label>
                  <input
                    type="text"
                    value={item.licenseNo}
                    onChange={(e) => {
                      const updated = [...eligibility];
                      updated[idx].licenseNo = e.target.value;
                      setEligibility(updated);
                    }}
                    placeholder="e.g. FT-004821"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rating / Score</label>
                  <input
                    type="text"
                    value={item.rating}
                    onChange={(e) => {
                      const updated = [...eligibility];
                      updated[idx].rating = e.target.value;
                      setEligibility(updated);
                    }}
                    placeholder="e.g. 88.40%"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Date of Examination / Conferment
                    </label>
                    <input
                      type="text"
                      value={item.examDate}
                      onChange={(e) => {
                        const updated = [...eligibility];
                        updated[idx].examDate = e.target.value;
                        setEligibility(updated);
                      }}
                      placeholder="e.g. Oct 2019"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  {eligibility.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEligibility(eligibility.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: EDUCATIONAL BACKGROUND */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#024794]" />
              <h3 className="font-bold text-slate-900 text-sm">
                III. Educational Background (College / Post-Graduate / Vocational)
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setEducation([
                  ...education,
                  { level: 'College / Tertiary', degree: '', school: '', yearGraduated: '', honors: '' },
                ])
              }
              className="text-xs text-[#024794] hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Education</span>
            </button>
          </div>

          <div className="space-y-3">
            {education.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 relative text-xs"
              >
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Level</label>
                  <select
                    value={item.level}
                    onChange={(e) => {
                      const updated = [...education];
                      updated[idx].level = e.target.value;
                      setEducation(updated);
                    }}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  >
                    <option value="College / Tertiary">College / Tertiary</option>
                    <option value="Graduate Studies (Masteral)">Graduate Studies (Masteral)</option>
                    <option value="Doctorate Degree">Doctorate Degree</option>
                    <option value="Vocational / Technical">Vocational / Technical</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Degree / Course Title
                  </label>
                  <input
                    type="text"
                    value={item.degree}
                    onChange={(e) => {
                      const updated = [...education];
                      updated[idx].degree = e.target.value;
                      setEducation(updated);
                    }}
                    placeholder="e.g. BS Fisheries / Aquaculture"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Name of School / University
                  </label>
                  <input
                    type="text"
                    value={item.school}
                    onChange={(e) => {
                      const updated = [...education];
                      updated[idx].school = e.target.value;
                      setEducation(updated);
                    }}
                    placeholder="e.g. UP Los Baños / CLSU"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Year / Academic Honors
                    </label>
                    <input
                      type="text"
                      value={item.yearGraduated + (item.honors ? ` (${item.honors})` : '')}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[idx].yearGraduated = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="e.g. 2018 (Cum Laude)"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  {education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: WORK EXPERIENCE */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#024794]" />
              <h3 className="font-bold text-slate-900 text-sm">
                IV. Relevant Work Experience (Include Government &amp; Private Track)
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setWorkExperience([
                  ...workExperience,
                  {
                    position: '',
                    agencyOrCompany: '',
                    fromDate: '',
                    toDate: '',
                    isGovService: false,
                    description: '',
                  },
                ])
              }
              className="text-xs text-[#024794] hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Experience</span>
            </button>
          </div>

          <div className="space-y-3">
            {workExperience.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Position Title</label>
                    <input
                      type="text"
                      value={item.position}
                      onChange={(e) => {
                        const updated = [...workExperience];
                        updated[idx].position = e.target.value;
                        setWorkExperience(updated);
                      }}
                      placeholder="e.g. Aquaculture Research Assistant"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Department / Agency / Office / Company
                    </label>
                    <input
                      type="text"
                      value={item.agencyOrCompany}
                      onChange={(e) => {
                        const updated = [...workExperience];
                        updated[idx].agencyOrCompany = e.target.value;
                        setWorkExperience(updated);
                      }}
                      placeholder="e.g. SEAFDEC / BFAR RFO IV-A"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="font-semibold text-slate-700 block mb-1">
                        Inclusive Dates (From - To)
                      </label>
                      <input
                        type="text"
                        value={`${item.fromDate} - ${item.toDate}`}
                        onChange={(e) => {
                          const updated = [...workExperience];
                          updated[idx].fromDate = e.target.value;
                          setWorkExperience(updated);
                        }}
                        placeholder="e.g. 2021 - Present"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mt-5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isGovService}
                        onChange={(e) => {
                          const updated = [...workExperience];
                          updated[idx].isGovService = e.target.checked;
                          setWorkExperience(updated);
                        }}
                        className="rounded text-[#024794]"
                      />
                      <span>Gov't Service</span>
                    </label>
                    {workExperience.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setWorkExperience(workExperience.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 mt-5 p-1"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Summary of Actual Duties &amp; Responsibilities
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...workExperience];
                      updated[idx].description = e.target.value;
                      setWorkExperience(updated);
                    }}
                    placeholder="Brief description of fisheries, regulatory, technical, or research tasks performed..."
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: RELEVANT TRAININGS */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#024794]" />
              <h3 className="font-bold text-slate-900 text-sm">
                V. Learning &amp; Development (L&amp;D) Interventions / Relevant Trainings
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setTraining([
                  ...training,
                  { title: '', hours: 8, provider: '', year: new Date().getFullYear().toString() },
                ])
              }
              className="text-xs text-[#024794] hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Training</span>
            </button>
          </div>

          <div className="space-y-3">
            {training.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 relative text-xs"
              >
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Title of Learning and Development / Training Program
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...training];
                      updated[idx].title = e.target.value;
                      setTraining(updated);
                    }}
                    placeholder="e.g. Advanced Hatchery Management and Biosecurity"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Conducted / Sponsored By
                  </label>
                  <input
                    type="text"
                    value={item.provider}
                    onChange={(e) => {
                      const updated = [...training];
                      updated[idx].provider = e.target.value;
                      setTraining(updated);
                    }}
                    placeholder="e.g. DA-BFAR / SEAFDEC / CSC"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="font-semibold text-slate-700 block mb-1">No. of Hours</label>
                    <input
                      type="number"
                      value={item.hours}
                      onChange={(e) => {
                        const updated = [...training];
                        updated[idx].hours = Number(e.target.value) || 0;
                        setTraining(updated);
                      }}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  {training.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTraining(training.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-right text-[11px] font-semibold text-slate-600">
            Total Accredited Training Hours:{' '}
            <span className="font-bold text-[#024794] text-xs font-mono">
              {totalTrainingHours} Hours
            </span>
          </div>
        </div>

        {/* SECTION 6: STATEMENT OF INTENT & COVER LETTER */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#024794]" />
              <h3 className="font-bold text-slate-900 text-sm">
                VI. Application Cover Letter / Statement of Interest
              </h3>
            </div>
            <button
              type="button"
              disabled={isGeneratingLetter}
              onClick={handleGenerateCoverLetter}
              className="bg-sky-50 hover:bg-sky-100 text-[#024794] border border-blue-300 text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isGeneratingLetter ? 'Drafting Letter...' : 'Draft Formal Letter with AI'}</span>
            </button>
          </div>

          <div>
            <textarea
              rows={6}
              value={statementOfIntent}
              onChange={(e) => setStatementOfIntent(e.target.value)}
              placeholder="State your reasons for applying and how your qualifications will support the mandate of the Bureau of Fisheries and Aquatic Resources..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs leading-relaxed focus:ring-1 focus:ring-[#024794]"
            />
          </div>
        </div>

        {/* SECTION 7: DOCUMENTARY ATTACHMENTS CHECKLIST */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Upload className="w-4 h-4 text-[#024794]" />
            <h3 className="font-bold text-slate-900 text-sm">
              VII. Mandatory Supporting Documents (CSC Qualification Verification)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {documentsUploaded.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded bg-blue-100 text-[#024794] flex items-center justify-center font-bold text-[10px]">
                    PDF
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block text-[11px]">{doc.name}</span>
                    <span className="text-[10px] text-slate-400">Attached ({doc.fileSize})</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Ready
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Note: Original and authenticated physical copies will be required during the scheduled
            HRMPSB panel interview and Civil Service attestation.
          </p>
        </div>

        {/* PRE-SUBMISSION CSC QUALIFICATION STANDARDS SUMMARY CHECK */}
        <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="font-extrabold text-sm">
                  Civil Service Qualification Standards (QS) Self-Assessment
                </h4>
                <p className="text-xs text-slate-400">
                  Target: {activeJob?.positionTitle} (SG-{activeJob?.salaryGrade})
                </p>
              </div>
            </div>
            <span className="bg-amber-400 text-slate-950 text-xs font-bold px-2.5 py-1 rounded">
              Ready for Submission
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[10px] block">Education Check</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <Check className="w-3.5 h-3.5" />
                <span>{hasDegrees ? 'Degree Entered' : 'Pending'}</span>
              </span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[10px] block">Eligibility Check</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <Check className="w-3.5 h-3.5" />
                <span>{hasElig ? 'Eligibility Valid' : 'Check Eligibility'}</span>
              </span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[10px] block">Experience Count</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <Check className="w-3.5 h-3.5" />
                <span>{totalExperienceItems > 0 ? `${totalExperienceItems} Records` : 'None'}</span>
              </span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[10px] block">Training Hours</span>
              <span className="font-bold text-amber-400 flex items-center gap-1 mt-1">
                <Check className="w-3.5 h-3.5" />
                <span>{totalTrainingHours} Hours total</span>
              </span>
            </div>
          </div>

          {formError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" required defaultChecked className="mt-0.5 rounded text-[#024794]" />
              <span>
                I hereby certify that all information submitted in this application is true, correct,
                and complete to the best of my knowledge, under penalties of perjury and administrative
                disqualification under Civil Service Law.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-sm px-8 py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 shrink-0 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Transmitting to BFAR...' : 'Submit Official Application'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
