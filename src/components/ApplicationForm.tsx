import React, { useState, useEffect, useMemo } from 'react';
import { PlantillaJob, ApplicationRecord, AiScreeningResult, EducationEntry } from '../types';
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
  Paperclip,
  AlertTriangle,
  FileCheck,
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

  const [education, setEducation] = useState<EducationEntry[]>([
    {
      level: 'College / Tertiary',
      degree: '',
      school: '',
      yearGraduated: '',
      unitsEarned: '',
      honors: 'None',
      transcriptFile: '',
      diplomaFile: '',
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

  // Mandatory Document Upload Checklist explicitly mandated by CSC & BFAR HRMPSB
  const [documentsUploaded, setDocumentsUploaded] = useState([
    {
      name: 'Application Letter (AL) addressed to the National Director',
      category: 'AL' as const,
      type: 'PDF',
      status: 'Uploaded' as const,
      fileSize: '1.2 MB',
      required: true,
      description: 'Formal letter of intent citing Plantilla Item Number',
    },
    {
      name: 'Personal Data Sheet (PDS / CS Form 212 Revised 2017)',
      category: 'PDS' as const,
      type: 'PDF',
      status: 'Uploaded' as const,
      fileSize: '2.5 MB',
      required: true,
      description: 'Fully notarized with passport-size photo and Work Experience Sheet',
    },
    {
      name: 'Individual Performance Commitment and Review (IPCR)',
      category: 'IPCR' as const,
      type: 'PDF',
      status: 'Uploaded' as const,
      fileSize: '1.8 MB',
      required: true,
      description: 'Performance rating for the last rating period (at least Very Satisfactory)',
    },
    {
      name: 'Potential / Competency Evaluations',
      category: 'COMPETENCY' as const,
      type: 'PDF',
      status: 'Uploaded' as const,
      fileSize: '1.1 MB',
      required: true,
      description: 'Supervisory ratings, technical competencies, or leadership assessments',
    },
    {
      name: 'Official Transcript of Records (TOR) & Diploma',
      category: 'TOR' as const,
      type: 'PDF',
      status: 'Uploaded' as const,
      fileSize: '3.2 MB',
      required: true,
      description: 'Authenticated copy of transcript reflecting degree and units earned',
    },
    {
      name: 'Certificate of Eligibility / PRC Board License',
      category: 'ELIGIBILITY' as const,
      type: 'PDF',
      status: 'Uploaded' as const,
      fileSize: '890 KB',
      required: true,
      description: 'Valid PRC Professional ID or CSC Certificate of Eligibility',
    },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedJobId) {
      setCurrentJobId(selectedJobId);
    }
  }, [selectedJobId]);

  // LIVE CSC TRAINING AUDIT: Real-time calculation of qualifying vs non-qualifying training hours
  const trainingAudit = useMemo(() => {
    let qualifying = 0;
    let excluded = 0;
    const flagged: Array<{ title: string; hours: number; reason: string }> = [];

    for (const t of training) {
      const combined = `${t.title || ''} ${t.provider || ''}`.toLowerCase();
      const hrs = Number(t.hours) || 0;
      let isExcluded = false;
      let reason = '';

      if (/\b(resource person|resource speaker|speaker|lecturer|instructor|trainor|trainer|panelist)\b/i.test(combined)) {
        isExcluded = true;
        reason = 'Resource Person (RP) / Lecturer role (classified as work experience/instruction, non-qualifying learning hours per CSC)';
      } else if (/\b(facilitator|co-facilitator|moderator|master of ceremonies|emcee|session chair)\b/i.test(combined)) {
        isExcluded = true;
        reason = 'Facilitator / Moderator engagement (non-qualifying learning hours per CSC guidelines)';
      } else if (/\b(conference|symposium|conventions|convention|general assembly|summit|fellowship|forum attendance)\b/i.test(combined)) {
        isExcluded = true;
        reason = 'General Conference / Convention attendance (does not meet structured technical skills training per CSC standards)';
      }

      if (isExcluded) {
        excluded += hrs;
        if (t.title.trim()) {
          flagged.push({ title: t.title, hours: hrs, reason });
        }
      } else {
        qualifying += hrs;
      }
    }

    return { qualifying, excluded, flagged };
  }, [training]);

  // Pre-fill with curated samples reflecting CSC standards
  const handleLoadSample = (sampleType: 'fisheries' | 'criminology' | 'marine') => {
    if (sampleType === 'fisheries') {
      const matchJob = jobs.find((j) => j.positionTitle.toLowerCase().includes('aqua')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setRawResumeText(`Candidate: Danica Flores Ramos, RFT
Email: danica.ramos@example.ph | Mobile: +63 917 845 2311
Address: Brgy. Central, Diliman, Quezon City 1101
Birthdate: 1995-04-14 | Status: Single

EDUCATIONAL BACKGROUND:
- Bachelor of Science in Fisheries (Major in Aquaculture), University of the Philippines Los Baños (UPLB)
  Units Earned: 148 Units (Full Degree Completed)
  Honors / Distinctions: Cum Laude (Graduated 2018)

PROFESSIONAL ELIGIBILITY:
- RA 1080 - Registered Fisheries Technologist (PRC License: FT-004821, Rating: 88.40%, Passed Oct 2019)
- Career Service Professional (CSC Level 2), Rating: 85.20%

PERFORMANCE & COMPETENCY EVALUATIONS:
- IPCR Rating (Jan-Dec 2025): 4.80 (Outstanding)
- Competency Rating: Level 4 Advanced Aquaculture Facility Management

WORK EXPERIENCE:
1. Contractual Technical Assistant | BFAR Central Office - Aquaculture Division
   April 2024 - Present (Government Service: Yes)
   Assisted in national tilapia breeding distribution and LGU technology demonstration projects.
2. Aquaculture Research Assistant | SEAFDEC Aquaculture Department
   January 2021 - March 2024 (Non-Gov/Research)
   Managed broodstock conditioning, artificial fertilization, and larval rearing for milkfish and giant tiger prawn.

TRAINING & WORKSHOPS:
- Advanced Hatchery Management and Biosecurity in Tilapia Farming (BFAR-NFFTC, 16 Hours, 2025)
- Fish Health Surveillance and Disease Diagnostics (SEAFDEC, 24 Hours, 2024)
- Resource Speaker: Sustainable Broodstock Practices at Regional Fish Forum (Provincial Fisheries, 8 Hours, 2024) [Note: Excluded RP role]`);
    } else if (sampleType === 'criminology') {
      const matchJob = jobs.find((j) => j.positionTitle.toLowerCase().includes('regulations')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setRawResumeText(`Candidate: Marc Joshua Bautista Dela Cruz
Email: mj.delacruz@example.ph | Mobile: +63 928 334 1902
Address: Project 4, Quezon City, Metro Manila
Birthdate: 1993-11-20 | Status: Married

EDUCATIONAL BACKGROUND:
- Bachelor of Science in Criminology, Philippine College of Criminology
  Units Earned: 142 Units (Full Degree Completed)
  Honors / Distinctions: Consistent Dean's Lister (Graduated 2016)

PROFESSIONAL ELIGIBILITY:
- Career Service Professional (CSC Level 2), Rating: 84.10% (2017)
- RA 6506 - Registered Criminologist (PRC License: RC-081290, Rating: 82.50%)

PERFORMANCE RATINGS:
- IPCR Rating: 4.60 (Very Satisfactory)
- Potential / Competency Assessment: Verified Maritime Investigator

WORK EXPERIENCE:
1. Compliance Investigator | Maritime Regulatory Consultants Inc.
   February 2024 - Present
   Conducted shipping compliance audits and crew safety inspections.
2. Maritime Enforcement Officer | Philippine Ports Authority
   June 2019 - December 2023 (Government Service: Yes)
   Port security inspection, vessel manifest validation, and joint fisheries patrol.

TRAINING ENTRIES:
- Maritime Law Enforcement and Rules of Engagement Course (PCG Training Command, 40 Hours, 2022)
- Introductory Seminar on Philippine Fisheries Code RA 8550/10654 (DA-BFAR, 8 Hours, 2024)
- Annual Philippine Maritime Security Convention & Conference (Maritime Law Association, 16 Hours, 2023) [Note: Excluded Conference]`);
    } else {
      const matchJob = jobs.find((j) => j.positionTitle.toLowerCase().includes('marine')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setRawResumeText(`Candidate: Dr. Roberto Alcantara
Email: roberto.alcantara@marine.ph | Mobile: +63 908 772 3418
Address: Teachers Village, Diliman, Quezon City
Birthdate: 1991-03-24 | Status: Single

EDUCATIONAL BACKGROUND:
- Master of Science in Marine Biology, UP Diliman Marine Science Institute (Completed 36 Academic Units, Graduated 2021)
- Bachelor of Science in Marine Biology, University of the Philippines (144 Units, Graduated 2014, Magna Cum Laude)

PROFESSIONAL ELIGIBILITY:
- Career Service Professional Eligibility (CSC Level 2)
- RA 1080 - Registered Fisheries Technologist

PERFORMANCE & COMPETENCY:
- IPCR Rating: 4.90 (Outstanding)
- Competency Rating: Expert Marine Stock Modeler (FiSAT II / GIS)

WORK EXPERIENCE:
1. Senior Coastal Resource Specialist | Marine Conservation Policy Center
   August 2020 - Present
   Led marine protected area monitoring and stock assessments.
2. Science Research Assistant | NSAP - BFAR Central Office
   January 2016 - July 2020 (Government Service: Yes)

TRAININGS:
- Advanced Scientific Diving and Benthic Line Intercept (PADI/UP, 40 Hours, 2024)
- Marine Spatial Planning & MPA Management in Fisheries (BFAR Central Office, 24 Hours, 2023)
- Moderator / Session Chair: National Coral Reef Symposium (12 Hours, 2024) [Note: Excluded Moderator role]`);
    }
  };

  // Run AI Resume / PDS Parser
  const handleParseWithAi = async () => {
    if (!rawResumeText.trim()) {
      setAiParseStatus('⚠️ Please paste resume text or click one of the quick sample candidates above.');
      return;
    }

    setIsParsingAi(true);
    setAiParseStatus('BFAR AI Assistant is analyzing credentials and parsing PDS fields...');

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
              unitsEarned: e.unitsEarned || '148 Units (Degree Completed)',
              honors: e.honors || 'None',
              transcriptFile: `TOR_${(d.personalInfo?.fullName || 'Applicant').split(' ')[0]}_Authenticated.pdf`,
              diplomaFile: `Diploma_${(d.personalInfo?.fullName || 'Applicant').split(' ')[0]}.pdf`,
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
        setAiParseStatus('✨ Successfully extracted into CS Form 212 with Units, Honors & Training Audit! Review below.');
      } else {
        setAiParseStatus('Extraction complete.');
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

    if (!education[0]?.degree.trim()) {
      setFormError('Please enter your Degree and College / University in Educational Background.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        jobId: currentJobId,
        personalInfo,
        education,
        eligibility,
        workExperience,
        training,
        statementOfIntent: statementOfIntent || 'Application submitted via DA-BFAR Online Recruitment Portal.',
        documentsUploaded: documentsUploaded.map((d) => ({
          name: d.name,
          category: d.category,
          type: d.type,
          status: 'Uploaded',
          fileSize: d.fileSize,
        })),
      };

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setSubmissionSuccess(json.data);
        onApplicationSubmitted(json.data);
      } else {
        setFormError(json.error || 'Failed to submit application. Please verify your details.');
      }
    } catch (err: any) {
      setFormError('Network communication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dedicated file upload simulation handler for Transcripts/Diplomas
  const handleSimulateUpload = (index: number, field: 'transcript' | 'diploma') => {
    const updated = [...education];
    const dummyName = field === 'transcript'
      ? `TOR_${personalInfo.fullName.replace(/\s+/g, '_') || 'Applicant'}_Authenticated.pdf`
      : `Diploma_${personalInfo.fullName.replace(/\s+/g, '_') || 'Applicant'}.pdf`;

    if (field === 'transcript') {
      updated[index].transcriptFile = dummyName;
    } else {
      updated[index].diplomaFile = dummyName;
    }
    setEducation(updated);
  };

  // If successfully submitted, display confirmation card
  if (submissionSuccess) {
    return (
      <div className="max-w-3xl mx-auto my-8 bg-white rounded-2xl shadow-xl border border-emerald-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 sm:p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 ring-4 ring-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <span className="bg-amber-300 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            Official Application Received
          </span>
          <h2 className="text-2xl sm:text-3xl font-black">Application Successfully Logged</h2>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-lg mx-auto">
            Your application for <strong>{submissionSuccess.positionTitle}</strong> has been officially
            registered in the DA-BFAR Recruitment &amp; HRMIS portal.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Reference Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-2">
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Application Reference Number
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#024794] select-all">
              {submissionSuccess.trackingCode}
            </div>
            <p className="text-xs text-slate-500">
              Please save this tracking code to monitor your document verification and HRMPSB deliberation.
            </p>
          </div>

          {/* AI Pre-Screening Summary Badge */}
          {submissionSuccess.aiScreening && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#024794]" />
                  <span className="font-bold text-[#024794]">
                    AI Automated Qualification Standards (QS) Fit:
                  </span>
                </div>
                <span className="font-extrabold text-[#024794] bg-white px-2.5 py-1 rounded shadow-xs">
                  {submissionSuccess.aiScreening.overallScore} / 100
                </span>
              </div>
              <p className="text-slate-700">
                {submissionSuccess.aiScreening.summaryRecommendation}
              </p>
              {submissionSuccess.aiScreening.qsCompliance.flaggedTrainingEntries &&
                submissionSuccess.aiScreening.qsCompliance.flaggedTrainingEntries.length > 0 && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>CSC Training Hour Audit:</strong>{' '}
                      {submissionSuccess.aiScreening.qsCompliance.qualifyingTrainingHours} qualifying hours verified. (
                      {submissionSuccess.aiScreening.qsCompliance.excludedTrainingHours} hrs excluded for non-qualifying RP/Facilitator/Conference roles).
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigateToTrack(submissionSuccess.trackingCode)}
              className="w-full sm:w-auto bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 text-center"
            >
              Track Application Status Now
            </button>
            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setRawResumeText('');
              }}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-2.5 rounded-lg text-xs font-semibold border border-slate-300 text-center"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Position Selector */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-[#024794] uppercase tracking-wider block mb-1">
              Civil Service Commission (CSC) &amp; DA-BFAR
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Online Plantilla Application &amp; AI Fast-Fill
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Apply for permanent Plantilla vacancies at BFAR Central Office. Fully compliant with
              CSC Form 212 (Personal Data Sheet Revised 2017).
            </p>
          </div>

          <div className="shrink-0">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Plantilla Vacancy:
            </label>
            <select
              value={currentJobId}
              onChange={(e) => setCurrentJobId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-[#024794] focus:outline-hidden focus:ring-2 focus:ring-[#024794] max-w-xs"
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.positionTitle} (SG-{job.salaryGrade})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Job Qualification Snapshot */}
        {activeJob && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-800">
                Minimum Qualification Standards (QS) for {activeJob.positionTitle}:
              </span>
              <span className="bg-[#024794] text-white text-[10px] font-bold px-2.5 py-0.5 rounded">
                Official Salary Grade {activeJob.salaryGrade}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="bg-white/90 p-2 rounded border border-slate-200">
                <strong className="text-slate-800 block text-[10px]">Education:</strong>
                <span className="text-slate-600">{activeJob.qualificationStandards.education}</span>
              </div>
              <div className="bg-white/90 p-2 rounded border border-slate-200">
                <strong className="text-slate-800 block text-[10px]">Experience:</strong>
                <span className="text-slate-600">{activeJob.qualificationStandards.experience}</span>
              </div>
              <div className="bg-white/90 p-2 rounded border border-slate-200">
                <strong className="text-slate-800 block text-[10px]">Training:</strong>
                <span className="text-slate-600">{activeJob.qualificationStandards.training}</span>
                <span className="text-[9px] text-amber-700 block mt-0.5 font-medium">*RP &amp; Conferences excluded</span>
              </div>
              <div className="bg-white/90 p-2 rounded border border-slate-200">
                <strong className="text-slate-800 block text-[10px]">Eligibility:</strong>
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
                  Gemini AI Fast-Fill &amp; PDS Parser Module
                </h3>
                <p className="text-xs text-sky-200">
                  Paste credentials or CV. The AI engine extracts PDS fields (units earned, honors) and
                  automatically flags non-qualifying training entries.
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
                Criminology / Law
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
              placeholder="Paste raw resume, CV, or LinkedIn summary here..."
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
                  <span>{aiParseStatus || 'Analyzing credentials against CSC standards...'}</span>
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

      {/* Error Banner */}
      {formError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* MAIN APPLICATION FORM (CS FORM 212 / REVISED 2017) */}
      <form onSubmit={handleSubmitApplication} className="space-y-6">
        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <User className="w-4 h-4 text-[#024794]" />
            <h3 className="font-bold text-slate-900 text-sm">
              I. Personal Information (CS Form 212 Sheet 1)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Full Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={personalInfo.fullName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                placeholder="e.g. Danica Flores Ramos"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#024794]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Civil Status</label>
              <select
                value={personalInfo.civilStatus}
                onChange={(e) => setPersonalInfo({ ...personalInfo, civilStatus: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#024794]"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                placeholder="applicant@example.ph"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#024794]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mobile Contact No.</label>
              <input
                type="tel"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                placeholder="+63 917 845 2311"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#024794]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Date of Birth</label>
              <input
                type="date"
                value={personalInfo.birthDate}
                onChange={(e) => setPersonalInfo({ ...personalInfo, birthDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#024794]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">Permanent Residential Address</label>
              <input
                type="text"
                value={personalInfo.residentialAddress}
                onChange={(e) => setPersonalInfo({ ...personalInfo, residentialAddress: e.target.value })}
                placeholder="House No., Street, Barangay, Municipality/City, Province, ZIP"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#024794]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: EDUCATIONAL BACKGROUND WITH UNITS EARNED & DEDICATED FILE UPLOAD */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#024794]" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  II. Educational Background (College / Graduate / Vocational)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Includes units earned, academic honors, and dedicated transcript / diploma upload
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setEducation([
                  ...education,
                  {
                    level: 'College / Tertiary',
                    degree: '',
                    school: '',
                    yearGraduated: '',
                    unitsEarned: '',
                    honors: 'None',
                    transcriptFile: '',
                    diplomaFile: '',
                  },
                ])
              }
              className="text-xs text-[#024794] hover:underline font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Education Entry</span>
            </button>
          </div>

          <div className="space-y-4">
            {education.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative text-xs space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Level</label>
                    <select
                      value={item.level}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[idx].level = e.target.value;
                        setEducation(updated);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-[#024794]"
                    >
                      <option value="College / Tertiary">College / Tertiary</option>
                      <option value="Graduate Studies (Masteral)">Graduate Studies (Masteral)</option>
                      <option value="Doctorate Degree">Doctorate Degree</option>
                      <option value="Vocational / Technical">Vocational / Technical</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Degree / Course Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={item.degree}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[idx].degree = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="e.g. Bachelor of Science in Fisheries (Major in Aquaculture)"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Year Graduated / Attendance
                    </label>
                    <input
                      type="text"
                      value={item.yearGraduated}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[idx].yearGraduated = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="e.g. 2018"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      placeholder="e.g. University of the Philippines Los Baños"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Units Earned (if not graduated / graduate studies)
                    </label>
                    <input
                      type="text"
                      value={item.unitsEarned || ''}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[idx].unitsEarned = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="e.g. 148 Units (Degree Completed) or 36 Units Completed"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Academic Honors / Awards Received
                    </label>
                    <input
                      type="text"
                      value={item.honors || ''}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[idx].honors = e.target.value;
                        setEducation(updated);
                      }}
                      placeholder="e.g. Cum Laude, Dean's Lister, None"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                </div>

                {/* Dedicated File Upload Options for Transcripts & Diplomas */}
                <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Transcript Upload */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Transcript (TOR):</span>
                      {item.transcriptFile ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium">
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          <span>{item.transcriptFile}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimulateUpload(idx, 'transcript')}
                          className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-[#024794] border border-blue-300 px-2 py-1 rounded text-[10px] font-semibold"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>Attach Transcript (TOR)</span>
                        </button>
                      )}
                    </div>

                    {/* Diploma Upload */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Diploma:</span>
                      {item.diplomaFile ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium">
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          <span>{item.diplomaFile}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimulateUpload(idx, 'diploma')}
                          className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-[#024794] border border-blue-300 px-2 py-1 rounded text-[10px] font-semibold"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>Attach Diploma</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 self-end sm:self-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: CIVIL SERVICE ELIGIBILITY & PRC LICENSES */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#024794]" />
              <h3 className="font-bold text-slate-900 text-sm">
                III. Civil Service Eligibility &amp; PRC Board Licenses (RA 1080 / CSC)
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
                      Conferment / Exam Date
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

        {/* SECTION 4: WORK EXPERIENCE */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#024794]" />
              <h3 className="font-bold text-slate-900 text-sm">
                IV. Relevant Work Experience (Gov &amp; Private Track)
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
                      placeholder="e.g. Technical Field Specialist"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Department / Agency / Company
                    </label>
                    <input
                      type="text"
                      value={item.agencyOrCompany}
                      onChange={(e) => {
                        const updated = [...workExperience];
                        updated[idx].agencyOrCompany = e.target.value;
                        setWorkExperience(updated);
                      }}
                      placeholder="e.g. BFAR Central Office"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="font-semibold text-slate-700 block mb-1">Duration</label>
                      <input
                        type="text"
                        value={item.fromDate ? `${item.fromDate} to ${item.toDate}` : ''}
                        onChange={(e) => {
                          const updated = [...workExperience];
                          updated[idx].fromDate = e.target.value;
                          setWorkExperience(updated);
                        }}
                        placeholder="e.g. 2022 to Present"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#024794]"
                      />
                    </div>
                    {workExperience.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setWorkExperience(workExperience.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-2 mt-5"
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

        {/* SECTION 5: RELEVANT TRAININGS WITH AUTOMATED CSC VALIDATION */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#024794]" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  V. Learning &amp; Development (L&amp;D) Interventions / Trainings
                </h3>
                <span className="text-[11px] text-slate-500">
                  CSC Rule: Resource Person (RP) roles, Facilitator engagements, and Conferences are automatically excluded.
                </span>
              </div>
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

          {/* CSC Training Hours Live Audit Alert */}
          <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-[#024794]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Civil Service Commission (CSC) Training Hours Validation</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Only formal structured courses attended count toward QS. Resource Person (RP), Facilitator, and Conference attendances are excluded.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Qualifying Hours</span>
                <span className="font-extrabold text-emerald-700 text-sm">{trainingAudit.qualifying} Hours</span>
              </div>
              {trainingAudit.excluded > 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-amber-600 uppercase block font-sans font-bold">Excluded</span>
                  <span className="font-bold text-amber-700 text-sm">-{trainingAudit.excluded} Hours</span>
                </div>
              )}
            </div>
          </div>

          {/* Flagged entries warning notice if any */}
          {trainingAudit.flagged.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 p-3 rounded-lg space-y-1.5 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Non-Qualifying Training Entries Detected &amp; Automatically Flagged:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                {trainingAudit.flagged.map((f, i) => (
                  <li key={i}>
                    <strong>"{f.title}"</strong> ({f.hours} hrs) — {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {training.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 relative text-xs"
              >
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Title of Learning &amp; Development Program
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
        </div>

        {/* SECTION 6: STATEMENT OF INTENT */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#024794]" />
              <h3 className="font-bold text-slate-900 text-sm">
                VI. Application Letter (AL) Statement of Intent
              </h3>
            </div>
            <button
              type="button"
              disabled={isGeneratingLetter}
              onClick={handleGenerateCoverLetter}
              className="bg-sky-50 hover:bg-sky-100 text-[#024794] border border-blue-300 text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isGeneratingLetter ? 'Drafting Official Letter...' : 'Draft Formal Application Letter with AI'}</span>
            </button>
          </div>

          <div>
            <textarea
              rows={5}
              value={statementOfIntent}
              onChange={(e) => setStatementOfIntent(e.target.value)}
              placeholder="State your reasons for applying and how your qualifications will support the statutory mission of the Bureau of Fisheries and Aquatic Resources..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs leading-relaxed focus:ring-1 focus:ring-[#024794]"
            />
          </div>
        </div>

        {/* SECTION 7: MANDATORY DOCUMENTARY ATTACHMENTS CHECKLIST */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Upload className="w-4 h-4 text-[#024794]" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                VII. Mandatory Supporting Document Checklist (CSC &amp; HRMPSB Standards)
              </h3>
              <p className="text-[11px] text-slate-500">
                Explicitly requires Application Letter (AL), PDS (CS Form 212), IPCR (Performance Ratings), and Potential/Competency evaluations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {documentsUploaded.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-x-2"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-[#024794] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {doc.category}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 text-[11px]">{doc.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{doc.description}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      Attached: {doc.fileSize}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded shrink-0">
                  Ready
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 italic pt-1">
            *Pursuant to Civil Service regulations, physical authenticated copies of IPCR and potential evaluations must be presented during the scheduled HRMPSB deliberation.
          </p>
        </div>

        {/* SUBMISSION BAR */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-extrabold text-sm flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Ready to Submit to DA-BFAR Recruitment</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Position: <strong>{activeJob.positionTitle} (SG-{activeJob.salaryGrade})</strong> • Plantilla Item: {activeJob.itemNo}
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Submitting &amp; Screening with AI...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Official Application</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
