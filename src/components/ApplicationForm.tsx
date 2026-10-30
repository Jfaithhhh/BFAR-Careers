import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PlantillaJob,
  ApplicationRecord,
  EducationEntry,
  ApplicantDocument,
  DocumentCategory,
} from '../types';
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
  ArrowRight,
  ArrowLeft,
  Info,
  X,
  RotateCcw,
  File as FileIcon,
  CheckCheck,
} from 'lucide-react';

interface ApplicationFormProps {
  jobs: PlantillaJob[];
  selectedJobId?: string;
  onApplicationSubmitted: (app: ApplicationRecord) => void;
  onNavigateToTrack: (trackingCode: string) => void;
}

type FormSection = 'description' | 'requirements' | 'file_uploads' | 'other_documents';

interface CategoryConfig {
  code: DocumentCategory;
  title: string;
  shortLabel: string;
  required: boolean;
  sectionGroup: 'file_uploads' | 'other_documents';
  description: string;
  acceptedFormats: string;
  sampleFileName: string;
}

const PRIMARY_CATEGORIES: CategoryConfig[] = [
  {
    code: 'PL',
    title: 'Plantilla (PL) Application Letter & PDS',
    shortLabel: 'Plantilla (PL)',
    required: true,
    sectionGroup: 'file_uploads',
    description:
      'Formal Application Letter (AL) addressed to the National Director & Fully Accomplished CS Form 212 (Personal Data Sheet Revised 2017) with Work Experience Sheet.',
    acceptedFormats: 'PDF (max 10MB)',
    sampleFileName: 'Application_Letter_and_PDS_CSForm212_Signed.pdf',
  },
  {
    code: 'ELIGIBILITY',
    title: 'Certificate of Civil Service Eligibility / PRC Board Rating',
    shortLabel: 'Eligibility',
    required: true,
    sectionGroup: 'file_uploads',
    description:
      'CSC Certificate of Eligibility (Professional / Sub-Professional) or PRC Board Rating / RA 1080 / Bar Examination Certificate.',
    acceptedFormats: 'PDF, JPG (max 5MB)',
    sampleFileName: 'CSC_Professional_Eligibility_Certificate.pdf',
  },
  {
    code: 'TRAININGS',
    title: 'Relevant Training & Learning Development (L&D) Certificates',
    shortLabel: 'Trainings',
    required: true,
    sectionGroup: 'file_uploads',
    description:
      'Certificates of relevant trainings, technical seminars, and workshops. Note: Per CSC rules, Resource Person roles, Facilitator engagements, and Conferences are excluded.',
    acceptedFormats: 'PDF (max 15MB)',
    sampleFileName: 'Fisheries_Advanced_Hatchery_Training_Certificates.pdf',
  },
  {
    code: 'WE',
    title: 'Work Experience (WE) Sheet & Service Record / COE',
    shortLabel: 'Work Experience (WE)',
    required: true,
    sectionGroup: 'file_uploads',
    description:
      'Duly signed Work Experience Sheet (WES attachment to CS Form 212), Certificates of Employment (COE), or Official Government Service Record.',
    acceptedFormats: 'PDF (max 10MB)',
    sampleFileName: 'Service_Record_and_Work_Experience_Sheet_COE.pdf',
  },
];

const OTHER_CATEGORIES: CategoryConfig[] = [
  {
    code: 'TOR',
    title: 'Transcript of Records (TOR)',
    shortLabel: 'TOR',
    required: true,
    sectionGroup: 'other_documents',
    description:
      'Official Transcript of Records (authenticated copy) indicating completed degree, academic units earned, and general weighted average.',
    acceptedFormats: 'PDF (max 10MB)',
    sampleFileName: 'Official_Transcript_of_Records_TOR_Authenticated.pdf',
  },
  {
    code: 'DIPLOMA',
    title: 'College / Post-Graduate Diploma',
    shortLabel: 'Diploma',
    required: true,
    sectionGroup: 'other_documents',
    description:
      'Certified True Copy of College Diploma, Post-Graduate Diploma, or Certificate of Graduation issued by the registrar.',
    acceptedFormats: 'PDF, JPG (max 5MB)',
    sampleFileName: 'BS_Fisheries_College_Diploma_Certified.pdf',
  },
  {
    code: 'REG',
    title: 'Professional Registration (REG) / PRC License ID',
    shortLabel: 'Registration (REG)',
    required: true,
    sectionGroup: 'other_documents',
    description:
      'Valid Professional Regulation Commission (PRC) Registration ID card or official Board Registration Certificate.',
    acceptedFormats: 'PDF, JPG (max 5MB)',
    sampleFileName: 'PRC_Professional_Registration_Card_FT.pdf',
  },
  {
    code: 'CERT',
    title: 'Certificates (CERT) of Academic Honors / Awards',
    shortLabel: 'Certificates (CERT)',
    required: false,
    sectionGroup: 'other_documents',
    description:
      'Certificates of Academic Honors (Cum Laude, Magna Cum Laude, Dean’s Lister), civil service awards, commendations, or distinctions.',
    acceptedFormats: 'PDF (max 5MB)',
    sampleFileName: 'Certificate_Academic_Honors_CumLaude.pdf',
  },
  {
    code: 'SWORNS',
    title: 'Sworn Statements (SWORNS) / Omnibus Affidavit',
    shortLabel: 'Sworn Statements (SWORNS)',
    required: true,
    sectionGroup: 'other_documents',
    description:
      'Notarized Omnibus Sworn Statement / Affidavit of Authenticity of documents and PDS Page 4 sworn declaration.',
    acceptedFormats: 'PDF (max 5MB)',
    sampleFileName: 'Omnibus_Sworn_Statement_Notarized.pdf',
  },
  {
    code: 'PCR',
    title: 'Performance Commitment and Review (PCR / IPCR)',
    shortLabel: 'PCR / IPCR',
    required: true,
    sectionGroup: 'other_documents',
    description:
      'Individual Performance Commitment and Review (IPCR) or OPCR for the last rating period (at least Very Satisfactory).',
    acceptedFormats: 'PDF (max 5MB)',
    sampleFileName: 'IPCR_Rating_Period_2025_VerySatisfactory.pdf',
  },
  {
    code: 'POTENTIAL',
    title: 'Potential / Competency Evaluation Documents',
    shortLabel: 'Potential',
    required: true,
    sectionGroup: 'other_documents',
    description:
      'Supervisory appraisal, potential rating, technical competency assessment, or leadership evaluation report.',
    acceptedFormats: 'PDF (max 5MB)',
    sampleFileName: 'Potential_Competency_Evaluation_Assessment.pdf',
  },
];

const ALL_CATEGORY_CONFIGS = [...PRIMARY_CATEGORIES, ...OTHER_CATEGORIES];

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  jobs,
  selectedJobId,
  onApplicationSubmitted,
  onNavigateToTrack,
}) => {
  const [currentJobId, setCurrentJobId] = useState<string>(selectedJobId || jobs[0]?.id || '');
  const activeJob = jobs.find((j) => j.id === currentJobId) || jobs[0];

  // Active Wizard Section
  const [activeSection, setActiveSection] = useState<FormSection>('description');

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

  // Auto-Organized Document Store
  const [documentsUploaded, setDocumentsUploaded] = useState<ApplicantDocument[]>([
    {
      id: 'doc-init-pl',
      name: 'Application_Letter_and_PDS_CSForm212_Signed.pdf',
      type: 'PDF',
      status: 'Uploaded',
      fileSize: '2.4 MB',
      category: 'PL',
      sectionGroup: 'file_uploads',
      uploadedAt: 'Ready for Review',
    },
    {
      id: 'doc-init-elig',
      name: 'CSC_Professional_Eligibility_FT004821.pdf',
      type: 'PDF',
      status: 'Uploaded',
      fileSize: '890 KB',
      category: 'ELIGIBILITY',
      sectionGroup: 'file_uploads',
      uploadedAt: 'Ready for Review',
    },
    {
      id: 'doc-init-trainings',
      name: 'Fisheries_Advanced_Hatchery_Trainings_32hrs.pdf',
      type: 'PDF',
      status: 'Uploaded',
      fileSize: '3.1 MB',
      category: 'TRAININGS',
      sectionGroup: 'file_uploads',
      uploadedAt: 'Ready for Review',
    },
    {
      id: 'doc-init-we',
      name: 'Service_Record_and_Work_Experience_Sheet.pdf',
      type: 'PDF',
      status: 'Uploaded',
      fileSize: '1.6 MB',
      category: 'WE',
      sectionGroup: 'file_uploads',
      uploadedAt: 'Ready for Review',
    },
  ]);

  // Real-time Auto-Correction Alert Toast
  const [autoCorrectionAlert, setAutoCorrectionAlert] = useState<{
    fileName: string;
    targetSlot: string;
    detectedCategory: string;
    reason: string;
  } | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  // Hidden file input refs for direct slot uploads
  const universalInputRef = useRef<HTMLInputElement | null>(null);
  const slotInputRefs = useRef<{ [key in DocumentCategory]?: HTMLInputElement | null }>({});

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

      if (
        /\b(resource person|resource speaker|speaker|lecturer|instructor|trainor|trainer|panelist)\b/i.test(
          combined
        )
      ) {
        isExcluded = true;
        reason =
          'Resource Person (RP) / Lecturer role (classified as work experience/instruction, non-qualifying learning hours per CSC)';
      } else if (
        /\b(facilitator|co-facilitator|moderator|master of ceremonies|emcee|session chair)\b/i.test(
          combined
        )
      ) {
        isExcluded = true;
        reason =
          'Facilitator / Moderator engagement (non-qualifying learning hours per CSC guidelines)';
      } else if (
        /\b(conference|symposium|conventions|convention|general assembly|summit|fellowship|forum attendance)\b/i.test(
          combined
        )
      ) {
        isExcluded = true;
        reason =
          'General Conference / Convention attendance (does not meet structured technical skills training per CSC standards)';
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

  // AUTOMATIC DOCUMENT CLASSIFIER & CORRECTION ENGINE
  const classifyAndAutoCorrect = (
    fileName: string,
    slotTargetCategory?: DocumentCategory
  ): {
    category: DocumentCategory;
    autoCorrected: boolean;
    originalCategory?: string;
    correctionReason?: string;
    sectionGroup: 'file_uploads' | 'other_documents';
  } => {
    const lower = fileName.toLowerCase();
    let detectedCategory: DocumentCategory | null = null;
    let reason = '';

    // Classification Heuristics
    // 1. Check Other Documents categories
    if (/\b(tor|transcript|scholastic|grades|academic record)\b/i.test(lower)) {
      detectedCategory = 'TOR';
      reason = 'Identified as official Transcript of Records / academic grades.';
    } else if (/\b(diploma|degree cert|graduation cert|bachelor|masteral cert)\b/i.test(lower)) {
      detectedCategory = 'DIPLOMA';
      reason = 'Identified as academic Diploma / graduation certificate.';
    } else if (
      /\b(reg\b|registration|prc id|professional id|board registration|renewal card|prc license)\b/i.test(
        lower
      )
    ) {
      detectedCategory = 'REG';
      reason = 'Identified as PRC Professional Registration ID / board license.';
    } else if (
      /\b(cum laude|magna cum|summa cum|dean's list|honor|commendation|citation|merit|cert\b)/i.test(
        lower
      )
    ) {
      detectedCategory = 'CERT';
      reason = 'Identified as certificate of academic honors or special citation.';
    } else if (
      /\b(sworn|sworns|affidavit|notarized|omnibus|pds page 4|oath|saln|attestation)\b/i.test(
        lower
      )
    ) {
      detectedCategory = 'SWORNS';
      reason = 'Identified as Notarized Sworn Statement / Omnibus Affidavit.';
    } else if (
      /\b(pcr|ipcr|opcr|performance review|performance rating|performance commitment|spms)\b/i.test(
        lower
      )
    ) {
      detectedCategory = 'PCR';
      reason = 'Identified as Individual Performance Commitment & Review (IPCR).';
    } else if (
      /\b(potential|competency|leadership assessment|supervisory rating|endorsement|behavioral|appraisal)\b/i.test(
        lower
      )
    ) {
      detectedCategory = 'POTENTIAL';
      reason = 'Identified as Potential & Competency Evaluation assessment.';
    }
    // 2. Check Primary File Uploads categories
    else if (
      /\b(eligibility|csc-prof|csc prof|csc subprof|subprofessional|career service|board rating|ra 1080|ra 6506|bar exam)\b/i.test(
        lower
      )
    ) {
      detectedCategory = 'ELIGIBILITY';
      reason = 'Identified as Civil Service Commission or PRC Board eligibility.';
    } else if (
      /\b(training|trainings|seminar|workshop|webinar|course|l&d|learning intervention)\b/i.test(
        lower
      )
    ) {
      detectedCategory = 'TRAININGS';
      reason = 'Identified as technical training / learning & development certificate.';
    } else if (
      /\b(work experience|service record|coe\b|certificate of employment|employment record|curriculum vitae|cv\b|resume|wes\b)\b/i.test(
        lower
      )
    ) {
      detectedCategory = 'WE';
      reason = 'Identified as Work Experience Sheet / Service Record / COE.';
    } else if (
      /\b(plantilla|application letter|letter of intent|intent letter|statement of intent|pds|cs form 212|cs-212|cover letter|\bal\b)\b/i.test(
        lower
      )
    ) {
      detectedCategory = 'PL';
      reason = 'Identified as Plantilla Application Letter / CS Form 212 PDS.';
    }

    // Determine final category
    const finalCategory: DocumentCategory = detectedCategory || slotTargetCategory || 'PL';
    const isPrimary = ['PL', 'ELIGIBILITY', 'TRAININGS', 'WE'].includes(finalCategory);
    const sectionGroup = isPrimary ? 'file_uploads' : 'other_documents';

    // Check if auto-corrected from target slot
    const wasCorrected = Boolean(
      slotTargetCategory && detectedCategory && detectedCategory !== slotTargetCategory
    );

    return {
      category: finalCategory,
      autoCorrected: wasCorrected,
      originalCategory: wasCorrected ? slotTargetCategory : undefined,
      correctionReason: wasCorrected
        ? `Auto-organized: ${reason} (Moved from ${slotTargetCategory} to ${finalCategory})`
        : undefined,
      sectionGroup,
    };
  };

  // Handle incoming file objects (drag-and-drop or file picker)
  const processFiles = (files: FileList | File[], targetSlot?: DocumentCategory) => {
    const newDocs: ApplicantDocument[] = [];
    let lastCorrection: any = null;

    Array.from(files).forEach((file) => {
      const { category, autoCorrected, originalCategory, correctionReason, sectionGroup } =
        classifyAndAutoCorrect(file.name, targetSlot);

      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const doc: ApplicantDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
        status: 'Uploaded',
        fileSize: sizeStr,
        category,
        sectionGroup,
        autoCorrected,
        originalCategory,
        correctionReason,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      newDocs.push(doc);

      if (autoCorrected) {
        lastCorrection = {
          fileName: file.name,
          targetSlot: originalCategory || targetSlot || '',
          detectedCategory: category,
          reason: correctionReason || '',
        };
      }
    });

    if (newDocs.length > 0) {
      // Add or update
      setDocumentsUploaded((prev) => [...prev, ...newDocs]);
    }

    if (lastCorrection) {
      setAutoCorrectionAlert(lastCorrection);
      // Auto-hide alert after 7 seconds
      setTimeout(() => {
        setAutoCorrectionAlert((cur) => (cur?.fileName === lastCorrection.fileName ? null : cur));
      }, 7000);
    }
  };

  // Quick Action: Pre-load Standard Plantilla Documents
  const handleLoadStandardPlantillaDocs = () => {
    const samplePlantillaDocs: ApplicantDocument[] = [
      {
        id: `pl-${Date.now()}-1`,
        name: `PL_Application_Letter_and_PDS_${(personalInfo.fullName || 'Candidate').replace(/\s+/g, '_')}.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '2.8 MB',
        category: 'PL',
        sectionGroup: 'file_uploads',
        uploadedAt: 'Just now',
      },
      {
        id: `pl-${Date.now()}-2`,
        name: `Eligibility_PRC_Fisheries_Technologist_RA1080.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '950 KB',
        category: 'ELIGIBILITY',
        sectionGroup: 'file_uploads',
        uploadedAt: 'Just now',
      },
      {
        id: `pl-${Date.now()}-3`,
        name: `Trainings_Aquaculture_Biosecurity_SEAFDEC_40hrs.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '3.4 MB',
        category: 'TRAININGS',
        sectionGroup: 'file_uploads',
        uploadedAt: 'Just now',
      },
      {
        id: `pl-${Date.now()}-4`,
        name: `WE_Service_Record_BFAR_and_COE_Signed.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '1.9 MB',
        category: 'WE',
        sectionGroup: 'file_uploads',
        uploadedAt: 'Just now',
      },
    ];

    setDocumentsUploaded((prev) => {
      const filtered = prev.filter(
        (d) => !['PL', 'ELIGIBILITY', 'TRAININGS', 'WE'].includes(d.category as string)
      );
      return [...filtered, ...samplePlantillaDocs];
    });
  };

  // Quick Action: Pre-load All Other Documents (TOR, Diploma, REG, CERT, SWORNS, PCR, Potential)
  const handleLoadAllOtherDocs = () => {
    const candidateName = (personalInfo.fullName || 'Candidate').replace(/\s+/g, '_');
    const otherSampleDocs: ApplicantDocument[] = [
      {
        id: `oth-${Date.now()}-tor`,
        name: `TOR_Official_Transcript_of_Records_Authenticated.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '3.5 MB',
        category: 'TOR',
        sectionGroup: 'other_documents',
        uploadedAt: 'Just now',
      },
      {
        id: `oth-${Date.now()}-diploma`,
        name: `Diploma_Bachelor_of_Science_in_Fisheries.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '2.1 MB',
        category: 'DIPLOMA',
        sectionGroup: 'other_documents',
        uploadedAt: 'Just now',
      },
      {
        id: `oth-${Date.now()}-reg`,
        name: `REG_PRC_Professional_License_Card_FT.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '820 KB',
        category: 'REG',
        sectionGroup: 'other_documents',
        uploadedAt: 'Just now',
      },
      {
        id: `oth-${Date.now()}-cert`,
        name: `CERT_Academic_Honors_Cum_Laude_Citation.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '1.2 MB',
        category: 'CERT',
        sectionGroup: 'other_documents',
        uploadedAt: 'Just now',
      },
      {
        id: `oth-${Date.now()}-sworns`,
        name: `SWORNS_Omnibus_Sworn_Statement_Notarized.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '1.4 MB',
        category: 'SWORNS',
        sectionGroup: 'other_documents',
        uploadedAt: 'Just now',
      },
      {
        id: `oth-${Date.now()}-pcr`,
        name: `PCR_Individual_Performance_Review_IPCR_2025.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '1.7 MB',
        category: 'PCR',
        sectionGroup: 'other_documents',
        uploadedAt: 'Just now',
      },
      {
        id: `oth-${Date.now()}-pot`,
        name: `Potential_Supervisory_Competency_Evaluation.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '1.1 MB',
        category: 'POTENTIAL',
        sectionGroup: 'other_documents',
        uploadedAt: 'Just now',
      },
    ];

    setDocumentsUploaded((prev) => {
      const filtered = prev.filter(
        (d) =>
          ![
            'TOR',
            'DIPLOMA',
            'REG',
            'CERT',
            'SWORNS',
            'PCR',
            'POTENTIAL',
          ].includes(d.category as string)
      );
      return [...filtered, ...otherSampleDocs];
    });
  };

  // Simulation test to demonstrate auto-correction in action
  const handleTestAutoCorrection = (testType: 'ipcr-in-pl' | 'eligibility-in-trainings' | 'tor-in-we') => {
    let mockFile: { name: string; size: number };
    let wrongSlot: DocumentCategory;

    if (testType === 'ipcr-in-pl') {
      mockFile = { name: 'IPCR_Rating_Period_2025_VerySatisfactory.pdf', size: 1850000 };
      wrongSlot = 'PL';
    } else if (testType === 'eligibility-in-trainings') {
      mockFile = { name: 'PRC_Board_Rating_Certificate_RA1080.pdf', size: 920000 };
      wrongSlot = 'TRAININGS';
    } else {
      mockFile = { name: 'Official_TOR_Transcript_of_Grades.pdf', size: 3100000 };
      wrongSlot = 'WE';
    }

    processFiles([mockFile as any], wrongSlot);
  };

  // Remove uploaded document
  const handleRemoveDoc = (id?: string) => {
    if (!id) return;
    setDocumentsUploaded((prev) => prev.filter((d) => d.id !== id));
  };

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
      const matchJob =
        jobs.find((j) => j.positionTitle.toLowerCase().includes('regulations')) || jobs[0];
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
        setAiParseStatus(
          '✨ Successfully extracted into CS Form 212 with Units, Honors & Training Audit! Review below.'
        );
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

  // Handle Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!personalInfo.fullName.trim() || !personalInfo.email.trim()) {
      setFormError('Please fill in your Full Name and Email address in Section 2 (Requirements).');
      setActiveSection('requirements');
      return;
    }

    if (!education[0]?.degree.trim()) {
      setFormError('Please enter your Degree and College / University in Section 2 (Requirements).');
      setActiveSection('requirements');
      return;
    }

    // Check mandatory Plantilla documents
    const hasPL = documentsUploaded.some((d) => d.category === 'PL');
    const hasElig = documentsUploaded.some((d) => d.category === 'ELIGIBILITY');
    if (!hasPL || !hasElig) {
      setFormError(
        'Please ensure Plantilla (PL) and Eligibility documents are attached in Section 3 (File Uploads).'
      );
      setActiveSection('file_uploads');
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
        statementOfIntent:
          statementOfIntent || 'Application submitted via DA-BFAR Online Recruitment Portal.',
        documentsUploaded: documentsUploaded.map((d) => ({
          name: d.name,
          category: d.category,
          type: d.type,
          status: 'Uploaded',
          fileSize: d.fileSize,
          autoCorrected: d.autoCorrected,
          originalCategory: d.originalCategory,
          correctionReason: d.correctionReason,
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

  // Counts of uploaded documents by section
  const primaryUploadCount = PRIMARY_CATEGORIES.filter((cat) =>
    documentsUploaded.some((d) => d.category === cat.code)
  ).length;

  const otherUploadCount = OTHER_CATEGORIES.filter((cat) =>
    documentsUploaded.some((d) => d.category === cat.code)
  ).length;

  // Render Confirmation Screen upon successful submission
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
            Your application for <strong>{submissionSuccess.positionTitle}</strong> has been
            officially registered in the DA-BFAR Recruitment &amp; HRMIS portal with all primary and
            supplementary documents.
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
              Please save this tracking code to monitor your document verification and HRMPSB
              deliberation.
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
                      {submissionSuccess.aiScreening.qsCompliance.qualifyingTrainingHours} qualifying
                      hours verified. (
                      {submissionSuccess.aiScreening.qsCompliance.excludedTrainingHours} hrs excluded
                      for non-qualifying RP/Facilitator/Conference roles).
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Attached Documents Recap */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800 pb-2 border-b border-slate-200">
              <span>Attached Documents Organized ({submissionSuccess.documentsUploaded.length} files)</span>
              <span className="text-emerald-700 font-mono text-[11px]">All Verified</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {submissionSuccess.documentsUploaded.map((d, i) => (
                <div
                  key={i}
                  className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-[#024794] bg-blue-50 px-1.5 py-0.5 rounded text-[9px] shrink-0">
                      {d.category}
                    </span>
                    <span className="truncate text-slate-700">{d.name}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[9px] shrink-0 ml-1">{d.fileSize}</span>
                </div>
              ))}
            </div>
          </div>

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
                setActiveSection('description');
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 4-SECTION TOP TAB NAVIGATION / STEPPER */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 sm:p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* 1. Description */}
          <button
            type="button"
            onClick={() => setActiveSection('description')}
            className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
              activeSection === 'description'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'description'
                  ? 'bg-white text-[#024794]'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              1
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs block truncate">Description</span>
              <span
                className={`text-[10px] block truncate ${
                  activeSection === 'description' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                Position &amp; Duties
              </span>
            </div>
          </button>

          {/* 2. Requirements */}
          <button
            type="button"
            onClick={() => setActiveSection('requirements')}
            className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
              activeSection === 'requirements'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'requirements'
                  ? 'bg-white text-[#024794]'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              2
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs block truncate">Requirements</span>
              <span
                className={`text-[10px] block truncate ${
                  activeSection === 'requirements' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                CSC Standards &amp; PDS
              </span>
            </div>
          </button>

          {/* 3. File Uploads */}
          <button
            type="button"
            onClick={() => setActiveSection('file_uploads')}
            className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
              activeSection === 'file_uploads'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'file_uploads'
                  ? 'bg-white text-[#024794]'
                  : primaryUploadCount >= 4
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {primaryUploadCount >= 4 ? <Check className="w-4 h-4 text-emerald-600" /> : '3'}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs block truncate">File Uploads</span>
              <span
                className={`text-[10px] block truncate ${
                  activeSection === 'file_uploads' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                PL, Elig, Trainings, WE ({primaryUploadCount}/4)
              </span>
            </div>
          </button>

          {/* 4. Other Documents */}
          <button
            type="button"
            onClick={() => setActiveSection('other_documents')}
            className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
              activeSection === 'other_documents'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'other_documents'
                  ? 'bg-white text-[#024794]'
                  : otherUploadCount >= 6
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {otherUploadCount >= 6 ? <Check className="w-4 h-4 text-emerald-600" /> : '4'}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs block truncate">Other Documents</span>
              <span
                className={`text-[10px] block truncate ${
                  activeSection === 'other_documents' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                TOR, Diploma, PCR... ({otherUploadCount}/7)
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* AUTO-CORRECTION REAL-TIME NOTIFICATION BANNER */}
      {autoCorrectionAlert && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl text-xs text-emerald-900 shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-emerald-800 text-[12px] flex items-center gap-1.5">
                <span>Intelligent Auto-Correction Applied!</span>
                <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {autoCorrectionAlert.targetSlot} → {autoCorrectionAlert.detectedCategory}
                </span>
              </div>
              <p className="text-emerald-700 text-[11px] mt-0.5">
                File <strong>"{autoCorrectionAlert.fileName}"</strong> was automatically organized into
                its designated category based on document contents.
              </p>
              <p className="text-emerald-600 text-[10px] mt-0.5 italic">
                {autoCorrectionAlert.reason}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoCorrectionAlert(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form Error Banner */}
      {formError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl text-xs text-red-700 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{formError}</span>
          </div>
          <button onClick={() => setFormError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: DESCRIPTION */}
      {/* ========================================================================= */}
      {activeSection === 'description' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-blue-100 text-[#024794] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider">
                    Republic of the Philippines
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Bureau of Fisheries and Aquatic Resources
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {activeJob.positionTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                  <span className="font-mono font-bold text-[#024794]">{activeJob.itemNo}</span>
                  <span>•</span>
                  <span>{activeJob.division}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">{activeJob.plantillaType}</span>
                </div>
              </div>

              {/* Vacancy Selector */}
              <div className="shrink-0 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <label className="font-bold text-slate-700 block mb-1">
                  Select Plantilla Position:
                </label>
                <select
                  value={currentJobId}
                  onChange={(e) => setCurrentJobId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-[#024794] focus:ring-2 focus:ring-[#024794] w-full sm:w-64"
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.positionTitle} (SG-{job.salaryGrade})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Key Position Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Official Salary Grade
                </span>
                <span className="text-base font-black text-[#024794]">
                  Salary Grade {activeJob.salaryGrade}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">National Budget Rate</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Plantilla Item No.
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 block truncate">
                  {activeJob.itemNo}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">CSC Registered</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Posting / Closing
                </span>
                <span className="text-xs font-bold text-amber-700 block">
                  Closes {activeJob.closingDate}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Posted: {activeJob.postingDate}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Place of Assignment
                </span>
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  {activeJob.region}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                  Central Office, Diliman, QC
                </span>
              </div>
            </div>
          </div>

          {/* Duties & Responsibilities Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Building2 className="w-5 h-5 text-[#024794]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Official Duties &amp; Responsibilities
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-700">
              {activeJob.dutiesAndResponsibilities.map((duty, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-[#024794] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{duty}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Competencies & Official Link Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Award className="w-4 h-4 text-[#024794]" />
                <h4 className="text-xs font-bold text-slate-900">Required Competencies</h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeJob.competencies.map((comp, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-50 text-[#024794] border border-blue-200 text-[11px] font-semibold px-2.5 py-1 rounded-md"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#024794] uppercase tracking-wider block">
                  Official Source Verification
                </span>
                <h4 className="text-xs font-bold text-slate-900 mt-1">
                  DA-BFAR Job Vacancies &amp; Careers
                </h4>
                <p className="text-[11px] text-slate-600 mt-1">
                  Vacancy details, qualification standards, and plantilla postings are strictly synchronized with
                  the official BFAR portal.
                </p>
              </div>
              <a
                href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#024794] hover:underline"
              >
                <span>View bfar.da.gov.ph/opportunities/job-vacancies-careers</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Section Navigation Footer */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('requirements')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Next: Section 2 - Requirements</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: REQUIREMENTS */}
      {/* ========================================================================= */}
      {activeSection === 'requirements' && (
        <div className="space-y-6">
          {/* CSC Qualification Standards Matrix */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Civil Service Commission (CSC) Qualification Standards (QS)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Target: <strong>{activeJob.positionTitle}</strong> (Salary Grade {activeJob.salaryGrade})
                  </p>
                </div>
              </div>
              <span className="bg-[#024794] text-white text-[10px] font-black px-2.5 py-1 rounded">
                SG-{activeJob.salaryGrade}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-slate-800 block text-[11px]">1. Education:</strong>
                <p className="text-slate-600 leading-relaxed">
                  {activeJob.qualificationStandards.education}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-slate-800 block text-[11px]">2. Experience:</strong>
                <p className="text-slate-600 leading-relaxed">
                  {activeJob.qualificationStandards.experience}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-800 block text-[11px]">3. Training:</strong>
                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                    CSC Rule
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {activeJob.qualificationStandards.training}
                </p>
                <span className="text-[10px] text-amber-700 block font-medium">
                  *Non-qualifying: Resource Person, Facilitator &amp; Conferences excluded
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-slate-800 block text-[11px]">4. Eligibility:</strong>
                <p className="text-slate-600 leading-relaxed">
                  {activeJob.qualificationStandards.eligibility}
                </p>
              </div>
            </div>
          </div>

          {/* AI RESUME / PDS FAST-FILL ASSISTANT HERO */}
          <div className="bg-gradient-to-br from-[#024794] to-[#04336b] rounded-xl shadow-md text-white p-5 relative overflow-hidden border border-blue-900">
            <div className="relative z-10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold">
                      Gemini AI Fast-Fill &amp; PDS Parser Module
                    </h3>
                    <p className="text-[11px] text-sky-200">
                      Paste resume or CV. AI extracts PDS fields (units earned, honors) and audits
                      qualifying training hours.
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
                  rows={3}
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
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-5 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>{isParsingAi ? 'Parsing Credentials...' : 'Extract & Auto-Fill with AI'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* PERSONAL INFORMATION (CS FORM 212 SHEET 1) */}
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
                <label className="font-semibold text-slate-700 block mb-1">
                  Permanent Residential Address
                </label>
                <input
                  type="text"
                  value={personalInfo.residentialAddress}
                  onChange={(e) =>
                    setPersonalInfo({ ...personalInfo, residentialAddress: e.target.value })
                  }
                  placeholder="House No., Street, Barangay, Municipality/City, Province, ZIP"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#024794]"
                />
              </div>
            </div>
          </div>

          {/* EDUCATIONAL BACKGROUND WITH UNITS EARNED */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#024794]" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    II. Educational Background (College / Graduate / Vocational)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Includes units earned, academic honors, and degree specifications
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
                        <option value="Graduate Studies (Masteral)">
                          Graduate Studies (Masteral)
                        </option>
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

                  {education.length > 1 && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Row</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CIVIL SERVICE ELIGIBILITY & PRC LICENSES */}
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

          {/* RELEVANT WORK EXPERIENCE */}
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
                          onClick={() =>
                            setWorkExperience(workExperience.filter((_, i) => i !== idx))
                          }
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

          {/* LEARNING & DEVELOPMENT / TRAININGS WITH CSC HOUR VALIDATION */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#024794]" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    V. Learning &amp; Development (L&amp;D) Interventions / Trainings
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    CSC Rule: Resource Person (RP) roles, Facilitator engagements, and Conferences are
                    automatically excluded.
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
            <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#024794]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Civil Service Commission (CSC) Training Hours Validation</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Only formal structured courses attended count toward QS. Resource Person (RP),
                  Facilitator, and Conference attendances are excluded.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans">
                    Qualifying Hours
                  </span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {trainingAudit.qualifying} Hours
                  </span>
                </div>
                {trainingAudit.excluded > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-amber-600 uppercase block font-sans font-bold">
                      Excluded
                    </span>
                    <span className="font-bold text-amber-700 text-sm">
                      -{trainingAudit.excluded} Hours
                    </span>
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

          {/* APPLICATION LETTER / STATEMENT OF INTENT */}
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
                <span>
                  {isGeneratingLetter
                    ? 'Drafting Official Letter...'
                    : 'Draft Formal Application Letter with AI'}
                </span>
              </button>
            </div>

            <div>
              <textarea
                rows={4}
                value={statementOfIntent}
                onChange={(e) => setStatementOfIntent(e.target.value)}
                placeholder="State your reasons for applying and how your qualifications will support the statutory mission of the Bureau of Fisheries and Aquatic Resources..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs leading-relaxed focus:ring-1 focus:ring-[#024794]"
              />
            </div>
          </div>

          {/* Section Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('description')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Section 1 - Description</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('file_uploads')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Next: Section 3 - File Uploads</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: FILE UPLOADS (PL, ELIGIBILITY, TRAININGS, WE) */}
      {/* ========================================================================= */}
      {activeSection === 'file_uploads' && (
        <div className="space-y-6">
          {/* Universal Intelligent Dropzone */}
          <div className="bg-gradient-to-r from-blue-900 to-[#024794] rounded-2xl p-6 text-white shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider inline-block mb-1">
                  Section 3: Mandatory Plantilla File Uploads
                </span>
                <h3 className="text-lg sm:text-xl font-black">
                  Upload Plantilla (PL), Eligibility, Trainings, and Work Experience (WE)
                </h3>
                <p className="text-xs text-sky-100 mt-0.5 max-w-2xl">
                  Drag and drop files directly into their slots, or drop them into the universal scanner
                  below. <strong>The system automatically organizes and corrects misplaced documents</strong>{' '}
                  into their designated categories.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleLoadStandardPlantillaDocs}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg border border-white/20 transition-all flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Attach Sample (PL, Elig, WE, Tr)</span>
                </button>
              </div>
            </div>

            {/* Universal Multi-File Auto-Classifier Dropzone Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  processFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => universalInputRef.current?.click()}
              className="border-2 border-dashed border-white/40 hover:border-amber-400 bg-white/5 hover:bg-white/10 rounded-xl p-5 text-center cursor-pointer transition-all space-y-2 group"
            >
              <input
                ref={universalInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    processFiles(e.target.files);
                  }
                }}
              />
              <div className="w-12 h-12 bg-white/15 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-amber-300" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white">Click or drag &amp; drop files here to auto-classify</span>
                <p className="text-[11px] text-sky-200 mt-0.5">
                  Universal scanner: automatically categorizes into Plantilla (PL), Eligibility,
                  Trainings, or Work Experience (WE).
                </p>
              </div>
            </div>

            {/* Test Auto-Correction Trigger Buttons */}
            <div className="bg-black/20 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test Auto-Correction:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTestAutoCorrection('eligibility-in-trainings')}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2.5 py-1 rounded border border-white/10 transition-colors"
                >
                  Upload Eligibility into Trainings Slot
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAutoCorrection('ipcr-in-pl')}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2.5 py-1 rounded border border-white/10 transition-colors"
                >
                  Upload IPCR into Plantilla (PL) Slot
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAutoCorrection('tor-in-we')}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2.5 py-1 rounded border border-white/10 transition-colors"
                >
                  Upload TOR into Work Experience Slot
                </button>
              </div>
            </div>
          </div>

          {/* 4 PRIMARY CATEGORY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRIMARY_CATEGORIES.map((cat) => {
              const catDocs = documentsUploaded.filter((d) => d.category === cat.code);
              const isFilled = catDocs.length > 0;

              return (
                <div
                  key={cat.code}
                  className={`bg-white rounded-xl border p-5 space-y-3 transition-all flex flex-col justify-between ${
                    isFilled ? 'border-emerald-300 shadow-xs ring-1 ring-emerald-200' : 'border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-lg bg-[#024794] text-white flex items-center justify-center font-black text-xs">
                          {cat.code}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">{cat.title}</h4>
                          <span className="text-[10px] text-slate-500 font-semibold">{cat.acceptedFormats}</span>
                        </div>
                      </div>

                      {isFilled ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Attached ({catDocs.length})</span>
                        </span>
                      ) : (
                        <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded">
                          Mandatory
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">{cat.description}</p>
                  </div>

                  {/* Uploaded Documents List in this category */}
                  {catDocs.length > 0 ? (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {catDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate text-[11px]">
                                {doc.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{doc.fileSize}</span>
                                {doc.autoCorrected && (
                                  <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[9px] flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>Auto-Corrected from {doc.originalCategory}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-red-400 hover:text-red-600 p-1 shrink-0"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-2.5 text-center text-[11px] text-amber-800">
                        No file uploaded yet. Drop or select a file for {cat.shortLabel}.
                      </div>
                    </div>
                  )}

                  {/* Slot Upload Button */}
                  <div className="pt-2">
                    <input
                      ref={(el) => {
                        slotInputRefs.current[cat.code] = el;
                      }}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          processFiles(e.target.files, cat.code);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => slotInputRefs.current[cat.code]?.click()}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-[#024794] border border-blue-200 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Upload {cat.shortLabel} Document</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('requirements')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Section 2 - Requirements</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('other_documents')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Next: Section 4 - Other Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: OTHER DOCUMENTS (TOR, DIPLOMA, REG, CERT, SWORNS, PCR, POTENTIAL) */}
      {/* ========================================================================= */}
      {activeSection === 'other_documents' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase text-[#024794] tracking-wider block mb-0.5">
                  Section 4: Supplementary &amp; Compliance Attachments
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Other Documents Checklist
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Upload your Transcript of Records (TOR), Diploma, Registration (REG), Certificates (CERT),
                  Sworn Statements (SWORNS), Performance Commitment and Review (PCR), and Potential documents.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadAllOtherDocs}
                className="bg-blue-50 hover:bg-blue-100 text-[#024794] border border-blue-300 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
              >
                <FileCheck className="w-4 h-4 text-[#024794]" />
                <span>Attach All 7 Other Documents</span>
              </button>
            </div>

            {/* Checklist Status Counter */}
            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700">Other Documents Uploaded:</span>
              <span className="font-extrabold text-[#024794] bg-white px-2.5 py-1 rounded border border-slate-200">
                {otherUploadCount} of 7 Categories Attached
              </span>
            </div>
          </div>

          {/* 7 DEDICATED OTHER DOCUMENT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OTHER_CATEGORIES.map((cat) => {
              const catDocs = documentsUploaded.filter((d) => d.category === cat.code);
              const isFilled = catDocs.length > 0;

              return (
                <div
                  key={cat.code}
                  className={`bg-white rounded-xl border p-4 space-y-3 transition-all flex flex-col justify-between ${
                    isFilled
                      ? 'border-emerald-300 shadow-xs ring-1 ring-emerald-200'
                      : 'border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-[11px]">
                        {cat.code}
                      </span>
                      {isFilled ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Attached</span>
                        </span>
                      ) : cat.required ? (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                          Required
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded">
                          Optional
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-900">{cat.title}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{cat.description}</p>
                  </div>

                  {/* Uploaded File Listing for this category */}
                  {catDocs.length > 0 ? (
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      {catDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-1.5 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 block truncate text-[10px]">
                              {doc.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                              <span>{doc.fileSize}</span>
                              {doc.autoCorrected && (
                                <span className="text-amber-700 font-bold">
                                  Auto-Sorted ({doc.originalCategory})
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-red-400 hover:text-red-600 p-1 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded text-center text-[10px] text-slate-400">
                        No {cat.shortLabel} file attached.
                      </div>
                    </div>
                  )}

                  {/* Slot Button */}
                  <div>
                    <input
                      ref={(el) => {
                        slotInputRefs.current[cat.code] = el;
                      }}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          processFiles(e.target.files, cat.code);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => slotInputRefs.current[cat.code]?.click()}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-[#024794] border border-blue-200 rounded-lg py-1.5 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span>Upload {cat.shortLabel}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FINAL SUBMISSION CONSOLE */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Ready to Submit Official Application to DA-BFAR</span>
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Target: <strong>{activeJob.positionTitle}</strong> (Salary Grade {activeJob.salaryGrade}) •
                  Item: {activeJob.itemNo}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                  <span>Primary Uploads: {primaryUploadCount}/4</span>
                  <span>•</span>
                  <span>Other Documents: {otherUploadCount}/7</span>
                  <span>•</span>
                  <span>Qualifying Training: {trainingAudit.qualifying} Hours</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-8 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Screening &amp; Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Official Application</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('file_uploads')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Section 3 - File Uploads</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
