import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PlantillaJob,
  ApplicationRecord,
  ApplicantDocument,
  DocumentCategory,
  PdsData,
  EducationEntry,
  EligibilityEntry,
  WorkExperienceEntry,
  VoluntaryWorkEntry,
  TrainingEntry,
  CharacterReference,
  AiScreeningResult,
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
  File as FileIcon,
  Download,
  Eye,
  Users,
  HeartHandshake,
  BookOpen,
  BadgeCheck,
} from 'lucide-react';

interface ApplicationFormProps {
  jobs: PlantillaJob[];
  selectedJobId?: string;
  onApplicationSubmitted: (app: ApplicationRecord) => void;
  onNavigateToTrack: (trackingCode: string) => void;
}

type FormSection =
  | 'letter'
  | 'pds'
  | 'position_qs'
  | 'file_uploads'
  | 'other_documents'
  | 'review_submit';

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

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  jobs,
  selectedJobId,
  onApplicationSubmitted,
  onNavigateToTrack,
}) => {
  const [currentJobId, setCurrentJobId] = useState<string>(selectedJobId || jobs[0]?.id || '');
  const activeJob = jobs.find((j) => j.id === currentJobId) || jobs[0];

  // Wizard Section Step State (6-Step Sequence)
  const [activeSection, setActiveSection] = useState<FormSection>('letter');

  // ==========================================
  // SECTION 1: APPLICATION LETTER STATE
  // ==========================================
  const [letterMode, setLetterMode] = useState<'generate' | 'upload' | 'manual'>('generate');
  const [applicationLetterText, setApplicationLetterText] = useState<string>('');
  const [letterUploadedFileName, setLetterUploadedFileName] = useState<string>('');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [letterSuccessNotice, setLetterSuccessNotice] = useState<string | null>(null);

  // ==========================================
  // SECTION 2: PERSONAL DATA SHEET (CS FORM 212)
  // ==========================================
  const [pdsActiveTab, setPdsActiveTab] = useState<
    | 'personal'
    | 'family'
    | 'education'
    | 'eligibility'
    | 'experience'
    | 'voluntary'
    | 'training'
    | 'other'
    | 'declaration'
  >('personal');

  // 1. Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    surname: 'Ramos',
    firstName: 'Danica',
    middleName: 'Flores',
    nameExtension: '',
    fullName: 'Danica Flores Ramos',
    email: 'danica.ramos@example.ph',
    phone: '+63 917 845 2311',
    birthDate: '1995-04-14',
    birthPlace: 'Quezon City',
    sex: 'Female' as 'Male' | 'Female' | '',
    civilStatus: 'Single' as 'Single' | 'Married' | 'Widowed' | 'Separated' | 'Other',
    citizenship: 'Filipino' as 'Filipino' | 'Dual Citizenship' | '',
    citizenshipType: 'by birth' as 'by birth' | 'by naturalization' | '',
    citizenshipCountry: '',
    heightMeters: '1.62',
    weightKg: '54',
    bloodType: 'O+',
    gsisNo: '12345678901',
    pagibigNo: '121098765432',
    philhealthNo: '098765432101',
    sssNo: '3456789012',
    tinNo: '456-789-012-000',
    agencyEmployeeNo: 'BFAR-2024-C09',
    residentialAddress: 'Block 4 Lot 12, Fisheries Village, Brgy. Central, Diliman, Quezon City',
    residentialZip: '1101',
    permanentAddress: 'Block 4 Lot 12, Fisheries Village, Brgy. Central, Diliman, Quezon City',
    permanentZip: '1101',
    telephoneNumber: '(02) 8928-1234',
  });

  // 2. Family Background
  const [familyBackground, setFamilyBackground] = useState({
    spouseSurname: '',
    spouseFirstName: '',
    spouseMiddleName: '',
    spouseNameExtension: '',
    spouseOccupation: '',
    spouseEmployer: '',
    spouseBusinessAddress: '',
    spouseTelephone: '',
    fatherSurname: 'Ramos',
    fatherFirstName: 'Eduardo',
    fatherMiddleName: 'Cruz',
    fatherNameExtension: '',
    motherMaidenSurname: 'Flores',
    motherFirstName: 'Lourdes',
    motherMiddleName: 'Santos',
    children: [
      { fullName: '', birthDate: '' },
    ].filter((c) => c.fullName),
  });

  // 3. Educational Background
  const [education, setEducation] = useState<EducationEntry[]>([
    {
      level: 'College',
      school: 'University of the Philippines Los Baños (UPLB)',
      degree: 'Bachelor of Science in Fisheries (Major in Aquaculture)',
      periodFrom: '2014',
      periodTo: '2018',
      unitsEarned: '148 Units (Graduated)',
      yearGraduated: '2018',
      honors: 'Cum Laude',
    },
    {
      level: 'Secondary',
      school: 'Quezon City Science High School',
      degree: 'High School Diploma',
      periodFrom: '2010',
      periodTo: '2014',
      unitsEarned: 'Graduated',
      yearGraduated: '2014',
      honors: 'Honorable Mention',
    },
  ]);

  // 4. Civil Service Eligibility
  const [eligibility, setEligibility] = useState<EligibilityEntry[]>([
    {
      type: 'RA 1080 - Registered Fisheries Technologist',
      licenseNo: 'FT-004821',
      rating: '88.40%',
      examDate: '2019-10-24',
      examPlace: 'PRC Manila',
      validityDate: '2027-04-14',
    },
    {
      type: 'Career Service Professional (CSC Level 2)',
      licenseNo: 'CSC-NCR-2018-0941',
      rating: '85.20%',
      examDate: '2018-08-12',
      examPlace: 'CSC NCR Quezon City',
      validityDate: 'Lifetime',
    },
  ]);

  // 5. Work Experience
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([
    {
      position: 'Contractual Technical Assistant',
      agencyOrCompany: 'Bureau of Fisheries and Aquatic Resources (BFAR Central Office)',
      monthlySalary: 31000,
      salaryGrade: 'SG 13-1',
      statusOfAppointment: 'Contractual / COS',
      fromDate: '2024-04-15',
      toDate: 'Present',
      isGovService: true,
      description:
        'Assisted in nationwide fingerling broodstock logistics, fish seed certification, and aquaculture technical advisory.',
    },
    {
      position: 'Aquaculture Research Assistant',
      agencyOrCompany: 'SEAFDEC Aquaculture Department',
      monthlySalary: 28000,
      salaryGrade: 'N/A',
      statusOfAppointment: 'Project-Based',
      fromDate: '2021-01-15',
      toDate: '2024-03-31',
      isGovService: false,
      description:
        'Conducted controlled larval rearing, feed formulations, and water quality diagnostics for milkfish and tilapia.',
    },
  ]);

  // 6. Voluntary Work
  const [voluntaryWork, setVoluntaryWork] = useState<VoluntaryWorkEntry[]>([
    {
      organizationName: 'Philippine Fisheries Association - Youth Wing',
      organizationAddress: 'Diliman, Quezon City',
      fromDate: '2022-01-01',
      toDate: '2023-12-31',
      hours: 120,
      positionOrNature: 'Volunteer Coastal Resource Officer',
    },
  ]);

  // 7. Learning and Development / Trainings
  const [training, setTraining] = useState<TrainingEntry[]>([
    {
      title: 'Advanced Hatchery Management and Biosecurity in Tilapia Farming',
      fromDate: '2025-03-10',
      toDate: '2025-03-12',
      hours: 16,
      typeOfLd: 'Technical',
      provider: 'BFAR - National Freshwater Fisheries Technology Center (NFFTC)',
      year: '2025',
    },
    {
      title: 'Fish Health Surveillance and Aquatic Disease Diagnostics',
      fromDate: '2024-07-15',
      toDate: '2024-07-18',
      hours: 24,
      typeOfLd: 'Technical',
      provider: 'SEAFDEC Aquaculture Department',
      year: '2024',
    },
    {
      title: 'Resource Speaker: Sustainable Broodstock Practices at Regional Forum',
      fromDate: '2024-09-05',
      toDate: '2024-09-05',
      hours: 8,
      typeOfLd: 'Lecturer / RP',
      provider: 'Provincial Fisheries Office',
      year: '2024',
    },
  ]);

  // 8. Other Information
  const [otherInformation, setOtherInformation] = useState({
    specialSkills: [
      'Aquaculture Recirculating System (RAS) Design',
      'Water Chemistry Testing (Hach Spectrophotometer)',
      'Scientific Diving (Rescue Diver)',
    ],
    nonAcademicDistinctions: [
      'Best Undergraduate Fisheries Thesis - UPLB 2018',
      'BFAR Regional Technology Demonstration Commendation 2024',
    ],
    memberships: [
      'Philippine Association of Fisheries Professionals Inc. (PAFPI)',
      'World Aquaculture Society (WAS) - Asian-Pacific Chapter',
    ],
  });

  // 9. Declarations & Questions
  const [declaration, setDeclaration] = useState({
    q34_relatedConsanguinity: false,
    q34_details: '',
    q35_adminOffense: false,
    q35_adminDetails: '',
    q35_criminalCharged: false,
    q35_criminalDetails: '',
    q36_convictedCrime: false,
    q36_details: '',
    q37_separatedFromService: false,
    q37_details: '',
    q38_candidateElection: false,
    q38_candidateDetails: '',
    q38_resignedBeforeElection: false,
    q38_resignedDetails: '',
    q39_immigrantStatus: false,
    q39_details: '',
    q40_indigenousGroup: false,
    q40_indigenousDetails: '',
    q40_pwd: false,
    q40_pwdDetails: '',
    q40_soloParent: false,
    q40_soloParentDetails: '',
    references: [
      {
        name: 'Dr. Maria Cecilia Santos',
        address: 'Institute of Aquaculture, UPLB College, Laguna',
        telNo: '+63 918 223 4455',
      },
      {
        name: 'Atty. Roberto G. Mendoza',
        address: 'DA-BFAR Central Office, Diliman, Quezon City',
        telNo: '+63 920 889 1122',
      },
      {
        name: 'Engr. Nelson P. Valenzuela',
        address: 'SEAFDEC/AQD Tigbauan Main Station, Iloilo',
        telNo: '+63 917 554 9988',
      },
    ],
    govIssuedId: {
      idType: 'PRC Identification Card',
      idNumber: 'FT-004821',
      datePlaceIssuance: 'Oct 2019 / PRC Manila',
    },
    confirmedAuthenticity: true,
    digitalSignatureConfirmation: 'Danica Flores Ramos',
    dateSigned: new Date().toISOString().split('T')[0],
  });

  // Fast-Fill Raw Resume State
  const [rawResumeText, setRawResumeText] = useState('');
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiParseStatus, setAiParseStatus] = useState<string | null>(null);

  // ==========================================
  // SECTION 3: AI QUALIFICATION FIT CHECK
  // ==========================================
  const [aiFitAssessment, setAiFitAssessment] = useState<{
    score: number;
    educationPass: boolean;
    experiencePass: boolean;
    trainingPass: boolean;
    eligibilityPass: boolean;
    missingItems: string[];
    strengths: string[];
    advisory: string;
    evaluatedAt: string;
  } | null>(null);
  const [isEvaluatingFit, setIsEvaluatingFit] = useState(false);

  // ==========================================
  // SECTION 4 & 5: FILE UPLOADS & OTHER DOCUMENTS
  // ==========================================
  const [documentsUploaded, setDocumentsUploaded] = useState<ApplicantDocument[]>([
    {
      id: 'doc-init-pl',
      name: 'Application_Letter_National_Director_and_PDS.pdf',
      type: 'PDF',
      status: 'Uploaded',
      fileSize: '2.4 MB',
      category: 'PL',
      sectionGroup: 'file_uploads',
      uploadedAt: 'Ready for Review',
    },
    {
      id: 'doc-init-elig',
      name: 'PRC_Fisheries_Technologist_Board_Rating_FT004821.pdf',
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
      name: 'Service_Record_and_Work_Experience_Sheet_Signed.pdf',
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

  // General Form States
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<ApplicationRecord | null>(null);

  // Input refs
  const universalInputRef = useRef<HTMLInputElement | null>(null);
  const letterFileInputRef = useRef<HTMLInputElement | null>(null);
  const slotInputRefs = useRef<{ [key in DocumentCategory]?: HTMLInputElement | null }>({});

  useEffect(() => {
    if (selectedJobId) {
      setCurrentJobId(selectedJobId);
    }
  }, [selectedJobId]);

  // Generate initial formal application letter on mount if empty
  useEffect(() => {
    if (!applicationLetterText) {
      const defaultLetter = `THE NATIONAL DIRECTOR
Bureau of Fisheries and Aquatic Resources
Department of Agriculture
3rd Floor, PCA Building, Elliptical Road, Diliman, Quezon City

THRU:  THE CHAIRPERSON
       Human Resource Merit Promotion and Selection Board (HRMPSB)

Sir:

I have the honor to submit my formal application for the permanent Plantilla position of ${activeJob.positionTitle} (Salary Grade ${activeJob.salaryGrade}), with Plantilla Item Number ${activeJob.itemNo}, currently vacant under the ${activeJob.division}.

I am a graduate of ${education[0]?.degree || "Bachelor's degree in Fisheries"} from ${education[0]?.school || 'University of the Philippines'}, and a certified ${eligibility[0]?.type || 'RA 1080 Registered Fisheries Technologist'}. Over the past years, I have actively engaged in aquaculture development, regulatory compliance, and coastal fisheries enhancement. I have accumulated relevant qualifying technical hours and hands-on laboratory experience that align directly with the statutory mandates of the Bureau.

Should I be favored with the appointment, I pledge to discharge the duties and responsibilities of the position with utmost integrity, competence, and patriotism in support of national food security and sustainable aquatic resource management.

Attached herewith are my fully accomplished Civil Service Personal Data Sheet (CS Form 212 Revised 2017), Work Experience Sheet, authenticated credentials, and required documentary proofs for your esteemed evaluation.

Very truly yours,


${personalInfo.fullName || 'Danica Flores Ramos'}
${personalInfo.residentialAddress || 'Quezon City, Metro Manila'}
Mobile: ${personalInfo.phone || '+63 917 845 2311'}
Email: ${personalInfo.email || 'danica.ramos@example.ph'}`;

      setApplicationLetterText(defaultLetter);
    }
  }, [currentJobId]);

  // LIVE CSC TRAINING AUDIT: Real-time calculation of qualifying vs non-qualifying training hours
  const trainingAudit = useMemo(() => {
    let qualifying = 0;
    let excluded = 0;
    const flagged: Array<{ title: string; hours: number; reason: string }> = [];

    for (const t of training) {
      const combined = `${t.title || ''} ${t.provider || ''} ${t.typeOfLd || ''}`.toLowerCase();
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

  // Run AI Qualification Assessment comparing PDS against selected Job
  const handleRunAiFitAssessment = () => {
    setIsEvaluatingFit(true);
    setTimeout(() => {
      const hasDegree = education.some((e) =>
        e.degree.toLowerCase().includes('fish') ||
        e.degree.toLowerCase().includes('aqua') ||
        e.degree.toLowerCase().includes('marine') ||
        e.degree.toLowerCase().includes('bio') ||
        e.degree.toLowerCase().includes('scien')
      );

      const expYears = workExperience.length * 1.5; // estimated
      const qualifyingHrs = trainingAudit.qualifying;
      const hasElig = eligibility.some((el) =>
        el.type.toLowerCase().includes('1080') ||
        el.type.toLowerCase().includes('prof') ||
        el.type.toLowerCase().includes('csc')
      );

      const missing: string[] = [];
      if (!hasDegree) missing.push('Educational discipline may require evaluation by HRMPSB');
      if (qualifyingHrs < 4) missing.push('Qualifying CSC training hours below 4-hour minimum');
      if (!hasElig) missing.push('Civil service eligibility or PRC license credential missing');
      if (workExperience.length === 0) missing.push('No documented work experience entries found');

      setAiFitAssessment({
        score: hasDegree && hasElig && qualifyingHrs >= 4 ? 94 : 76,
        educationPass: hasDegree,
        experiencePass: expYears >= 1,
        trainingPass: qualifyingHrs >= 4,
        eligibilityPass: hasElig,
        missingItems: missing,
        strengths: [
          'Degree aligns directly with position profile',
          'Qualifying Civil Service and RA 1080 credentials validated',
          'Documented public sector experience in aquaculture',
        ],
        advisory:
          'This automated evaluation is preliminary and advisory only. Official qualification determination is conducted by the DA-BFAR HRMPSB during formal docket verification.',
        evaluatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setIsEvaluatingFit(false);
    }, 600);
  };

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

    const finalCategory: DocumentCategory = detectedCategory || slotTargetCategory || 'PL';
    const isPrimary = ['PL', 'ELIGIBILITY', 'TRAININGS', 'WE'].includes(finalCategory);
    const sectionGroup = isPrimary ? 'file_uploads' : 'other_documents';

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
      setDocumentsUploaded((prev) => [...prev, ...newDocs]);
    }

    if (lastCorrection) {
      setAutoCorrectionAlert(lastCorrection);
      setTimeout(() => {
        setAutoCorrectionAlert((cur) => (cur?.fileName === lastCorrection.fileName ? null : cur));
      }, 7000);
    }
  };

  // Upload handler specifically for Section 1 (Application Letter PDF)
  const handleUploadLetterPdf = (file: File) => {
    setLetterUploadedFileName(file.name);
    setLetterMode('upload');
    setLetterSuccessNotice(`Attached PDF Application Letter: "${file.name}"`);

    // Add directly to PL documents
    const doc: ApplicantDocument = {
      id: `letter-${Date.now()}`,
      name: file.name,
      type: 'PDF',
      status: 'Uploaded',
      fileSize: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB',
      category: 'PL',
      sectionGroup: 'file_uploads',
      uploadedAt: 'Just now',
    };
    setDocumentsUploaded((prev) => [
      ...prev.filter((d) => !d.name.toLowerCase().includes('application_letter')),
      doc,
    ]);
  };

  // Generate formal application letter with Gemini AI
  const handleGenerateCoverLetter = async () => {
    setIsGeneratingLetter(true);
    setLetterSuccessNotice(null);
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
        setApplicationLetterText(json.data);
        setLetterMode('generate');
        setLetterSuccessNotice('✨ Official Application Letter generated by Gemini AI for DA-BFAR!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  // Load sample candidates to easily test the extensive PDS Form 212
  const handleLoadSample = (sampleType: 'fisheries' | 'criminology' | 'marine') => {
    if (sampleType === 'fisheries') {
      const matchJob = jobs.find((j) => j.positionTitle.toLowerCase().includes('aqua')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setPersonalInfo({
        surname: 'Ramos',
        firstName: 'Danica',
        middleName: 'Flores',
        nameExtension: '',
        fullName: 'Danica Flores Ramos',
        email: 'danica.ramos@example.ph',
        phone: '+63 917 845 2311',
        birthDate: '1995-04-14',
        birthPlace: 'Quezon City',
        sex: 'Female',
        civilStatus: 'Single',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: '',
        heightMeters: '1.62',
        weightKg: '54',
        bloodType: 'O+',
        gsisNo: '12345678901',
        pagibigNo: '121098765432',
        philhealthNo: '098765432101',
        sssNo: '3456789012',
        tinNo: '456-789-012-000',
        agencyEmployeeNo: 'BFAR-2024-C09',
        residentialAddress: 'Block 4 Lot 12, Fisheries Village, Brgy. Central, Diliman, Quezon City',
        residentialZip: '1101',
        permanentAddress: 'Block 4 Lot 12, Fisheries Village, Brgy. Central, Diliman, Quezon City',
        permanentZip: '1101',
        telephoneNumber: '(02) 8928-1234',
      });
      setEducation([
        {
          level: 'College',
          school: 'University of the Philippines Los Baños (UPLB)',
          degree: 'Bachelor of Science in Fisheries (Major in Aquaculture)',
          periodFrom: '2014',
          periodTo: '2018',
          unitsEarned: '148 Units (Degree Completed)',
          yearGraduated: '2018',
          honors: 'Cum Laude',
        },
      ]);
      setEligibility([
        {
          type: 'RA 1080 - Registered Fisheries Technologist',
          licenseNo: 'FT-004821',
          rating: '88.40%',
          examDate: '2019-10-24',
          examPlace: 'PRC Manila',
          validityDate: '2027-04-14',
        },
      ]);
      setAiParseStatus('✨ Loaded candidate: Danica Flores Ramos (Fisheries Technologist)');
    } else if (sampleType === 'criminology') {
      const matchJob =
        jobs.find((j) => j.positionTitle.toLowerCase().includes('regulations')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setPersonalInfo({
        surname: 'Dela Cruz',
        firstName: 'Marc Joshua',
        middleName: 'Bautista',
        nameExtension: '',
        fullName: 'Marc Joshua Bautista Dela Cruz',
        email: 'mj.delacruz@example.ph',
        phone: '+63 928 334 1902',
        birthDate: '1993-11-20',
        birthPlace: 'Manila',
        sex: 'Male',
        civilStatus: 'Married',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: '',
        heightMeters: '1.75',
        weightKg: '72',
        bloodType: 'B+',
        gsisNo: '98765432109',
        pagibigNo: '234567890123',
        philhealthNo: '112233445566',
        sssNo: '0987654321',
        tinNo: '123-456-789-000',
        agencyEmployeeNo: 'PPA-2019-E44',
        residentialAddress: '15 Katipunan St., Project 4, Quezon City',
        residentialZip: '1109',
        permanentAddress: '15 Katipunan St., Project 4, Quezon City',
        permanentZip: '1109',
        telephoneNumber: '(02) 8913-5678',
      });
      setEducation([
        {
          level: 'College',
          school: 'Philippine College of Criminology',
          degree: 'Bachelor of Science in Criminology',
          periodFrom: '2012',
          periodTo: '2016',
          unitsEarned: '142 Units (Graduated)',
          yearGraduated: '2016',
          honors: "Dean's Lister",
        },
      ]);
      setEligibility([
        {
          type: 'RA 6506 - Registered Criminologist',
          licenseNo: 'RC-081290',
          rating: '82.50%',
          examDate: '2017-04-12',
          examPlace: 'PRC Manila',
          validityDate: '2028-11-20',
        },
      ]);
      setAiParseStatus('✨ Loaded candidate: Marc Joshua Dela Cruz (Registered Criminologist)');
    } else {
      const matchJob = jobs.find((j) => j.positionTitle.toLowerCase().includes('marine')) || jobs[0];
      setCurrentJobId(matchJob.id);
      setPersonalInfo({
        surname: 'Alcantara',
        firstName: 'Roberto',
        middleName: 'Villanueva',
        nameExtension: 'Dr.',
        fullName: 'Dr. Roberto Villanueva Alcantara',
        email: 'roberto.alcantara@marine.ph',
        phone: '+63 908 772 3418',
        birthDate: '1991-03-24',
        birthPlace: 'Batangas City',
        sex: 'Male',
        civilStatus: 'Single',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: '',
        heightMeters: '1.70',
        weightKg: '68',
        bloodType: 'A+',
        gsisNo: '87654321098',
        pagibigNo: '345678901234',
        philhealthNo: '223344556677',
        sssNo: '4567890123',
        tinNo: '234-567-890-000',
        agencyEmployeeNo: 'UPMSI-2018-02',
        residentialAddress: 'Teachers Village, Diliman, Quezon City',
        residentialZip: '1101',
        permanentAddress: 'Teachers Village, Diliman, Quezon City',
        permanentZip: '1101',
        telephoneNumber: '(02) 8981-8500',
      });
      setEducation([
        {
          level: 'Graduate Studies',
          school: 'UP Diliman Marine Science Institute',
          degree: 'Master of Science in Marine Biology',
          periodFrom: '2017',
          periodTo: '2021',
          unitsEarned: 'Completed 36 Academic Units',
          yearGraduated: '2021',
          honors: 'University Scholar',
        },
        {
          level: 'College',
          school: 'University of the Philippines Diliman',
          degree: 'Bachelor of Science in Biology',
          periodFrom: '2010',
          periodTo: '2014',
          unitsEarned: '144 Units (Graduated)',
          yearGraduated: '2014',
          honors: 'Magna Cum Laude',
        },
      ]);
      setEligibility([
        {
          type: 'Career Service Professional (CSC Level 2)',
          licenseNo: 'CSC-2014-0881',
          rating: '89.60%',
          examDate: '2014-10-15',
          examPlace: 'CSC NCR',
          validityDate: 'Lifetime',
        },
      ]);
      setAiParseStatus('✨ Loaded candidate: Dr. Roberto Alcantara (Marine Biologist)');
    }
  };

  // Quick Action: Pre-load Standard Plantilla Documents
  const handleLoadStandardPlantillaDocs = () => {
    const candidateName = (personalInfo.fullName || 'Candidate').replace(/\s+/g, '_');
    const samplePlantillaDocs: ApplicantDocument[] = [
      {
        id: `pl-${Date.now()}-1`,
        name: `PL_Application_Letter_National_Director_${candidateName}.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '1.4 MB',
        category: 'PL',
        sectionGroup: 'file_uploads',
        uploadedAt: 'Just now',
      },
      {
        id: `pl-${Date.now()}-2`,
        name: `Eligibility_Certificate_${candidateName}.pdf`,
        type: 'PDF',
        status: 'Uploaded',
        fileSize: '950 KB',
        category: 'ELIGIBILITY',
        sectionGroup: 'file_uploads',
        uploadedAt: 'Just now',
      },
      {
        id: `pl-${Date.now()}-3`,
        name: `Trainings_Aquaculture_Biosecurity_Certificates.pdf`,
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

  // Test Auto-Correction Simulation
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

  const handleRemoveDoc = (id?: string) => {
    if (!id) return;
    setDocumentsUploaded((prev) => prev.filter((d) => d.id !== id));
  };

  // Final Submit Handler
  const handleSubmitApplication = async () => {
    setFormError(null);

    if (!personalInfo.fullName.trim() || !personalInfo.email.trim()) {
      setFormError('Please ensure Full Name and Email Address are completed in Section 2 (PDS).');
      setActiveSection('pds');
      return;
    }

    if (!declaration.confirmedAuthenticity) {
      setFormError('Please check the affirmation of authenticity in Section 2 (PDS Declaration).');
      setActiveSection('pds');
      setPdsActiveTab('declaration');
      return;
    }

    // Check mandatory documents
    const hasPL = documentsUploaded.some((d) => d.category === 'PL');
    const hasElig = documentsUploaded.some((d) => d.category === 'ELIGIBILITY');
    if (!hasPL || !hasElig) {
      setFormError(
        'Please ensure Plantilla (PL) and Eligibility documents are attached under Section 4 (File Uploads).'
      );
      setActiveSection('file_uploads');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPdsPayload: PdsData = {
        personalInfo,
        familyBackground,
        education,
        eligibility,
        workExperience,
        voluntaryWork,
        training,
        otherInformation,
        declaration,
      };

      const payload = {
        jobId: currentJobId,
        personalInfo: {
          fullName: personalInfo.fullName || `${personalInfo.firstName} ${personalInfo.surname}`,
          email: personalInfo.email,
          phone: personalInfo.phone,
          birthDate: personalInfo.birthDate,
          civilStatus: personalInfo.civilStatus,
          residentialAddress: personalInfo.residentialAddress,
        },
        pdsData: fullPdsPayload,
        applicationLetterText: applicationLetterText,
        applicationLetterUploadedFile: letterUploadedFileName,
        education,
        eligibility,
        workExperience,
        training,
        voluntaryWork,
        statementOfIntent: applicationLetterText,
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
        setFormError(json.error || 'Failed to submit application. Please review your details.');
      }
    } catch (err: any) {
      setFormError('Network communication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload counts
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
            officially registered in the DA-BFAR Recruitment &amp; HRMIS portal with complete CS Form 212
            and supporting attachments.
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
              deliberation in the 5-Stage Milestone Tracker.
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
                setActiveSection('letter');
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
      {/* 6-SECTION TOP STEPPER NAVIGATION */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 sm:p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Step 1: Application Letter */}
          <button
            type="button"
            onClick={() => setActiveSection('letter')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
              activeSection === 'letter'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'letter'
                  ? 'bg-white text-[#024794]'
                  : applicationLetterText
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {applicationLetterText && activeSection !== 'letter' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                '1'
              )}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[11px] block truncate">1. Letter</span>
              <span
                className={`text-[9px] block truncate ${
                  activeSection === 'letter' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                Application Letter
              </span>
            </div>
          </button>

          {/* Step 2: Personal Data Sheet (PDS) */}
          <button
            type="button"
            onClick={() => setActiveSection('pds')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
              activeSection === 'pds'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'pds'
                  ? 'bg-white text-[#024794]'
                  : personalInfo.fullName
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {personalInfo.fullName && activeSection !== 'pds' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                '2'
              )}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[11px] block truncate">2. PDS</span>
              <span
                className={`text-[9px] block truncate ${
                  activeSection === 'pds' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                CS Form 212
              </span>
            </div>
          </button>

          {/* Step 3: Position Description & Requirements */}
          <button
            type="button"
            onClick={() => setActiveSection('position_qs')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
              activeSection === 'position_qs'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'position_qs'
                  ? 'bg-white text-[#024794]'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              3
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[11px] block truncate">3. Position</span>
              <span
                className={`text-[9px] block truncate ${
                  activeSection === 'position_qs' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                Description &amp; QS
              </span>
            </div>
          </button>

          {/* Step 4: File Uploads */}
          <button
            type="button"
            onClick={() => setActiveSection('file_uploads')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
              activeSection === 'file_uploads'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'file_uploads'
                  ? 'bg-white text-[#024794]'
                  : primaryUploadCount >= 4
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {primaryUploadCount >= 4 && activeSection !== 'file_uploads' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                '4'
              )}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[11px] block truncate">4. Uploads</span>
              <span
                className={`text-[9px] block truncate ${
                  activeSection === 'file_uploads' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                PL, Elig, WE ({primaryUploadCount}/4)
              </span>
            </div>
          </button>

          {/* Step 5: Other Documents */}
          <button
            type="button"
            onClick={() => setActiveSection('other_documents')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
              activeSection === 'other_documents'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'other_documents'
                  ? 'bg-white text-[#024794]'
                  : otherUploadCount >= 6
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {otherUploadCount >= 6 && activeSection !== 'other_documents' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                '5'
              )}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[11px] block truncate">5. Other Docs</span>
              <span
                className={`text-[9px] block truncate ${
                  activeSection === 'other_documents' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                TOR, Dipl, PCR ({otherUploadCount}/7)
              </span>
            </div>
          </button>

          {/* Step 6: Review & Submit */}
          <button
            type="button"
            onClick={() => setActiveSection('review_submit')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
              activeSection === 'review_submit'
                ? 'bg-[#024794] text-white shadow-sm ring-2 ring-[#024794]/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeSection === 'review_submit'
                  ? 'bg-white text-[#024794]'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              6
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[11px] block truncate">6. Review</span>
              <span
                className={`text-[9px] block truncate ${
                  activeSection === 'review_submit' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                Review &amp; Submit
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
      {/* SECTION 1: APPLICATION LETTER */}
      {/* ========================================================================= */}
      {activeSection === 'letter' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase text-[#024794] tracking-wider block mb-1">
                  Section 1 of 6 • Official Application Letter
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Application Letter addressed to the National Director
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                  Submit a formal application letter addressed to the National Director of BFAR. You can generate
                  a formal draft with Gemini AI, upload an existing PDF letter, or manually edit the contents.
                </p>
              </div>

              {/* Position Quick Info */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1 shrink-0 w-full md:w-64">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Applying for Vacancy:
                </span>
                <span className="font-extrabold text-[#024794] block truncate">
                  {activeJob.positionTitle}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  SG-{activeJob.salaryGrade} • {activeJob.itemNo}
                </span>
              </div>
            </div>

            {/* Letter Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateCoverLetter}
                  disabled={isGeneratingLetter}
                  className="bg-[#024794] hover:bg-[#033b7a] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isGeneratingLetter ? 'Drafting Official Letter...' : 'Generate with Gemini AI'}
                  </span>
                </button>

                <input
                  ref={letterFileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadLetterPdf(e.target.files[0]);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => letterFileInputRef.current?.click()}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload Existing PDF Letter</span>
                </button>
              </div>

              {letterUploadedFileName && (
                <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Attached: {letterUploadedFileName}</span>
                </div>
              )}
            </div>

            {letterSuccessNotice && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-xs text-[#024794] flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{letterSuccessNotice}</span>
              </div>
            )}

            {/* Formal Government Letterhead Preview & Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Left: Interactive Text Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#024794]" />
                    <span>Editable Letter Content:</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Edits update the preview live</span>
                </div>
                <textarea
                  rows={18}
                  value={applicationLetterText}
                  onChange={(e) => setApplicationLetterText(e.target.value)}
                  placeholder="Paste or draft your formal Philippine Civil Service Application Letter..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                />
              </div>

              {/* Right: Formal Government Letterhead Paper Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Official Letterhead Document Preview:</span>
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    DA-BFAR Standard
                  </span>
                </div>

                <div className="bg-amber-50/20 border border-slate-300 rounded-xl p-6 shadow-inner space-y-4 text-xs font-serif leading-relaxed text-slate-800 max-h-[440px] overflow-y-auto">
                  {/* Government Header */}
                  <div className="text-center space-y-0.5 border-b border-slate-300 pb-3 font-sans">
                    <span className="text-[10px] uppercase tracking-wider block text-slate-500 font-bold">
                      Republic of the Philippines
                    </span>
                    <span className="text-[11px] uppercase font-bold text-slate-800 block">
                      Department of Agriculture
                    </span>
                    <span className="text-xs font-black text-[#024794] block tracking-wide">
                      BUREAU OF FISHERIES AND AQUATIC RESOURCES
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      PCA Building, Elliptical Road, Diliman, Quezon City
                    </span>
                  </div>

                  {/* Letter Body Preview */}
                  <div className="whitespace-pre-line text-[11px] leading-relaxed font-sans text-slate-800 pt-1">
                    {applicationLetterText || (
                      <span className="text-slate-400 italic font-sans">
                        Click "Generate with Gemini AI" or type in the editor to draft your official letter...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section Navigation Footer */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('pds')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Save &amp; Proceed to Section 2: Personal Data Sheet (PDS)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: PERSONAL DATA SHEET (CS FORM 212 REVISED 2017) */}
      {/* ========================================================================= */}
      {activeSection === 'pds' && (
        <div className="space-y-6">
          {/* Official CSC CS Form 212 Header */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
              <div>
                <span className="bg-[#024794] text-white text-[10px] font-black px-2.5 py-0.5 rounded tracking-wider uppercase inline-block mb-1">
                  CS Form No. 212 (Revised 2017)
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  PERSONAL DATA SHEET
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Civil Service Commission prescribed format for government service appointments.
                </p>
              </div>

              {/* Sample Pre-fill Helpers */}
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <span className="text-[11px] text-slate-600 font-semibold">Fast-Fill Sample:</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample('fisheries')}
                  className="bg-blue-50 hover:bg-blue-100 text-[#024794] text-[11px] font-bold px-2.5 py-1 rounded border border-blue-200"
                >
                  Fisheries Tech
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('criminology')}
                  className="bg-blue-50 hover:bg-blue-100 text-[#024794] text-[11px] font-bold px-2.5 py-1 rounded border border-blue-200"
                >
                  Criminologist
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('marine')}
                  className="bg-blue-50 hover:bg-blue-100 text-[#024794] text-[11px] font-bold px-2.5 py-1 rounded border border-blue-200"
                >
                  Marine Biologist
                </button>
              </div>
            </div>

            {aiParseStatus && (
              <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{aiParseStatus}</span>
              </div>
            )}

            {/* Official Warning Notice */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[11px] text-amber-900 leading-relaxed">
              <strong>WARNING:</strong> Any misrepresentation made in the Personal Data Sheet and the Work
              Experience Sheet shall cause the filing of administrative/criminal case/s against the person
              concerned pursuant to CSC and Ombudsman rules.
            </div>

            {/* PDS Subsection Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2 text-xs font-semibold">
              {[
                { id: 'personal', label: 'I. Personal Info' },
                { id: 'family', label: 'II. Family Background' },
                { id: 'education', label: 'III. Educational Background' },
                { id: 'eligibility', label: 'IV. Civil Service Eligibility' },
                { id: 'experience', label: 'V. Work Experience' },
                { id: 'voluntary', label: 'VI. Voluntary Work' },
                { id: 'training', label: 'VII. Trainings & L&D' },
                { id: 'other', label: 'VIII. Other Info' },
                { id: 'declaration', label: 'IX. Declarations & Oath' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPdsActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors ${
                    pdsActiveTab === tab.id
                      ? 'bg-[#024794] text-white font-bold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1. PERSONAL INFORMATION */}
          {pdsActiveTab === 'personal' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
                <User className="w-4 h-4 text-[#024794]" />
                <span>I. Personal Information (CS Form 212 Page 1)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Surname</label>
                  <input
                    type="text"
                    value={personalInfo.surname}
                    onChange={(e) => {
                      const updated = { ...personalInfo, surname: e.target.value };
                      updated.fullName = `${updated.firstName} ${updated.middleName} ${updated.surname} ${updated.nameExtension}`.trim();
                      setPersonalInfo(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={personalInfo.firstName}
                    onChange={(e) => {
                      const updated = { ...personalInfo, firstName: e.target.value };
                      updated.fullName = `${updated.firstName} ${updated.middleName} ${updated.surname} ${updated.nameExtension}`.trim();
                      setPersonalInfo(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={personalInfo.middleName}
                    onChange={(e) => {
                      const updated = { ...personalInfo, middleName: e.target.value };
                      updated.fullName = `${updated.firstName} ${updated.middleName} ${updated.surname} ${updated.nameExtension}`.trim();
                      setPersonalInfo(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Name Extension</label>
                  <input
                    type="text"
                    placeholder="e.g. Jr., III, None"
                    value={personalInfo.nameExtension}
                    onChange={(e) => {
                      const updated = { ...personalInfo, nameExtension: e.target.value };
                      updated.fullName = `${updated.firstName} ${updated.middleName} ${updated.surname} ${updated.nameExtension}`.trim();
                      setPersonalInfo(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={personalInfo.birthDate}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, birthDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Place of Birth</label>
                  <input
                    type="text"
                    value={personalInfo.birthPlace}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, birthPlace: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sex</label>
                  <select
                    value={personalInfo.sex}
                    onChange={(e: any) => setPersonalInfo({ ...personalInfo, sex: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Civil Status</label>
                  <select
                    value={personalInfo.civilStatus}
                    onChange={(e: any) => setPersonalInfo({ ...personalInfo, civilStatus: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Citizenship</label>
                  <select
                    value={personalInfo.citizenship}
                    onChange={(e: any) => setPersonalInfo({ ...personalInfo, citizenship: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  >
                    <option value="Filipino">Filipino</option>
                    <option value="Dual Citizenship">Dual Citizenship</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Height (m)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1.65"
                    value={personalInfo.heightMeters}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, heightMeters: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    placeholder="e.g. 58"
                    value={personalInfo.weightKg}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, weightKg: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Blood Type</label>
                  <input
                    type="text"
                    placeholder="e.g. O+, A+, B+"
                    value={personalInfo.bloodType}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, bloodType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>

                {/* Government IDs */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">GSIS ID No.</label>
                  <input
                    type="text"
                    value={personalInfo.gsisNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, gsisNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PAG-IBIG ID No.</label>
                  <input
                    type="text"
                    value={personalInfo.pagibigNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, pagibigNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PHILHEALTH No.</label>
                  <input
                    type="text"
                    value={personalInfo.philhealthNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, philhealthNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SSS No.</label>
                  <input
                    type="text"
                    value={personalInfo.sssNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, sssNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">TIN No.</label>
                  <input
                    type="text"
                    value={personalInfo.tinNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, tinNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Agency Employee No.</label>
                  <input
                    type="text"
                    value={personalInfo.agencyEmployeeNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, agencyEmployeeNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>

                {/* Addresses & Contact */}
                <div className="sm:col-span-3">
                  <label className="font-semibold text-slate-700 block mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={personalInfo.residentialAddress}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, residentialAddress: e.target.value })}
                    placeholder="House/Block/Lot No., Street, Subdivision/Village, Barangay, City/Municipality, Province"
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={personalInfo.residentialZip}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, residentialZip: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-semibold text-slate-700 block mb-1">Permanent Address</label>
                  <input
                    type="text"
                    value={personalInfo.permanentAddress}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, permanentAddress: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Permanent ZIP</label>
                  <input
                    type="text"
                    value={personalInfo.permanentZip}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, permanentZip: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Contact No.</label>
                  <input
                    type="tel"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Telephone No.</label>
                  <input
                    type="text"
                    value={personalInfo.telephoneNumber}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, telephoneNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-[#024794]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. FAMILY BACKGROUND */}
          {pdsActiveTab === 'family' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#024794]" />
                <span>II. Family Background</span>
              </h3>

              <div className="space-y-4 text-xs">
                {/* Spouse Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">Spouse's Information (if applicable)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Surname</label>
                      <input
                        type="text"
                        value={familyBackground.spouseSurname}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, spouseSurname: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">First Name</label>
                      <input
                        type="text"
                        value={familyBackground.spouseFirstName}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, spouseFirstName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={familyBackground.spouseMiddleName}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, spouseMiddleName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Occupation</label>
                      <input
                        type="text"
                        value={familyBackground.spouseOccupation}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, spouseOccupation: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Parents Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">Parents' Information</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Father's Surname</label>
                      <input
                        type="text"
                        value={familyBackground.fatherSurname}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, fatherSurname: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Father's First Name</label>
                      <input
                        type="text"
                        value={familyBackground.fatherFirstName}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, fatherFirstName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Father's Middle Name</label>
                      <input
                        type="text"
                        value={familyBackground.fatherMiddleName}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, fatherMiddleName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Mother's Maiden Surname</label>
                      <input
                        type="text"
                        value={familyBackground.motherMaidenSurname}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, motherMaidenSurname: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Mother's First Name</label>
                      <input
                        type="text"
                        value={familyBackground.motherFirstName}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, motherFirstName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Mother's Middle Name</label>
                      <input
                        type="text"
                        value={familyBackground.motherMiddleName}
                        onChange={(e) => setFamilyBackground({ ...familyBackground, motherMiddleName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded p-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Children Table */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Children Information (if applicable)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFamilyBackground({
                          ...familyBackground,
                          children: [...familyBackground.children, { fullName: '', birthDate: '' }],
                        })
                      }
                      className="text-[#024794] hover:underline font-bold text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Child Row</span>
                    </button>
                  </div>

                  {familyBackground.children.length === 0 ? (
                    <p className="text-slate-400 italic text-xs">No children records entered.</p>
                  ) : (
                    <div className="space-y-2">
                      {familyBackground.children.map((child, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Full Name of Child"
                            value={child.fullName}
                            onChange={(e) => {
                              const updated = [...familyBackground.children];
                              updated[idx].fullName = e.target.value;
                              setFamilyBackground({ ...familyBackground, children: updated });
                            }}
                            className="bg-white border border-slate-300 rounded p-2 col-span-2"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={child.birthDate}
                              onChange={(e) => {
                                const updated = [...familyBackground.children];
                                updated[idx].birthDate = e.target.value;
                                setFamilyBackground({ ...familyBackground, children: updated });
                              }}
                              className="bg-white border border-slate-300 rounded p-2 flex-1"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFamilyBackground({
                                  ...familyBackground,
                                  children: familyBackground.children.filter((_, i) => i !== idx),
                                })
                              }
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. EDUCATIONAL BACKGROUND DYNAMIC TABLE */}
          {pdsActiveTab === 'education' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#024794]" />
                  <span>III. Educational Background (CS Form 212 Dynamic Table)</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setEducation([
                      ...education,
                      {
                        level: 'College',
                        school: '',
                        degree: '',
                        periodFrom: '',
                        periodTo: '',
                        unitsEarned: '',
                        yearGraduated: '',
                        honors: '',
                      },
                    ])
                  }
                  className="bg-blue-50 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Education Row</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#024794] text-white">
                      <th className="p-2.5">Level</th>
                      <th className="p-2.5">Name of School</th>
                      <th className="p-2.5">Degree / Course (write in full)</th>
                      <th className="p-2.5">Period (From-To)</th>
                      <th className="p-2.5">Units Earned</th>
                      <th className="p-2.5">Year Graduated</th>
                      <th className="p-2.5">Scholarship / Honors</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {education.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                        <td className="p-2">
                          <select
                            value={item.level}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[idx].level = e.target.value;
                              setEducation(updated);
                            }}
                            className="bg-white border border-slate-300 rounded p-1.5 text-xs w-28"
                          >
                            <option value="Elementary">Elementary</option>
                            <option value="Secondary">Secondary</option>
                            <option value="Vocational / Trade">Vocational / Trade</option>
                            <option value="College">College</option>
                            <option value="Graduate Studies">Graduate Studies</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.school}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[idx].school = e.target.value;
                              setEducation(updated);
                            }}
                            placeholder="Full Name of School"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs min-w-[150px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.degree}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[idx].degree = e.target.value;
                              setEducation(updated);
                            }}
                            placeholder="Degree / Course"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs min-w-[150px]"
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={item.periodFrom || ''}
                              onChange={(e) => {
                                const updated = [...education];
                                updated[idx].periodFrom = e.target.value;
                                setEducation(updated);
                              }}
                              placeholder="From"
                              className="w-16 bg-white border border-slate-300 rounded p-1.5 text-xs"
                            />
                            <span>-</span>
                            <input
                              type="text"
                              value={item.periodTo || ''}
                              onChange={(e) => {
                                const updated = [...education];
                                updated[idx].periodTo = e.target.value;
                                setEducation(updated);
                              }}
                              placeholder="To"
                              className="w-16 bg-white border border-slate-300 rounded p-1.5 text-xs"
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.unitsEarned || ''}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[idx].unitsEarned = e.target.value;
                              setEducation(updated);
                            }}
                            placeholder="e.g. 148 Units"
                            className="w-24 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.yearGraduated}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[idx].yearGraduated = e.target.value;
                              setEducation(updated);
                            }}
                            placeholder="Year"
                            className="w-20 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.honors || ''}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[idx].honors = e.target.value;
                              setEducation(updated);
                            }}
                            placeholder="Honors / Awards"
                            className="w-28 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {education.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. CIVIL SERVICE ELIGIBILITY */}
          {pdsActiveTab === 'eligibility' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#024794]" />
                  <span>IV. Civil Service Eligibility (CS Form 212 Table)</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setEligibility([
                      ...eligibility,
                      {
                        type: '',
                        rating: '',
                        examDate: '',
                        examPlace: '',
                        licenseNo: '',
                        validityDate: '',
                      },
                    ])
                  }
                  className="bg-blue-50 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Eligibility Row</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#024794] text-white">
                      <th className="p-2.5">Career Service / RA 1080 / Bar</th>
                      <th className="p-2.5">Rating</th>
                      <th className="p-2.5">Date of Exam</th>
                      <th className="p-2.5">Place of Exam</th>
                      <th className="p-2.5">License No.</th>
                      <th className="p-2.5">Validity Date</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibility.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.type}
                            onChange={(e) => {
                              const updated = [...eligibility];
                              updated[idx].type = e.target.value;
                              setEligibility(updated);
                            }}
                            placeholder="e.g. RA 1080 (Fisheries Technologist)"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs min-w-[200px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.rating || ''}
                            onChange={(e) => {
                              const updated = [...eligibility];
                              updated[idx].rating = e.target.value;
                              setEligibility(updated);
                            }}
                            placeholder="e.g. 88.40%"
                            className="w-20 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.examDate || ''}
                            onChange={(e) => {
                              const updated = [...eligibility];
                              updated[idx].examDate = e.target.value;
                              setEligibility(updated);
                            }}
                            placeholder="YYYY-MM-DD"
                            className="w-28 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.examPlace || ''}
                            onChange={(e) => {
                              const updated = [...eligibility];
                              updated[idx].examPlace = e.target.value;
                              setEligibility(updated);
                            }}
                            placeholder="e.g. Manila"
                            className="w-28 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.licenseNo || ''}
                            onChange={(e) => {
                              const updated = [...eligibility];
                              updated[idx].licenseNo = e.target.value;
                              setEligibility(updated);
                            }}
                            placeholder="License No."
                            className="w-28 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.validityDate || ''}
                            onChange={(e) => {
                              const updated = [...eligibility];
                              updated[idx].validityDate = e.target.value;
                              setEligibility(updated);
                            }}
                            placeholder="e.g. 2027-04-14"
                            className="w-28 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {eligibility.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEligibility(eligibility.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. WORK EXPERIENCE TABLE */}
          {pdsActiveTab === 'experience' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#024794]" />
                  <span>V. Work Experience (CS Form 212 Table)</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setWorkExperience([
                      ...workExperience,
                      {
                        position: '',
                        agencyOrCompany: '',
                        monthlySalary: '',
                        salaryGrade: '',
                        statusOfAppointment: 'Permanent',
                        fromDate: '',
                        toDate: '',
                        isGovService: false,
                        description: '',
                      },
                    ])
                  }
                  className="bg-blue-50 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Experience Row</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#024794] text-white">
                      <th className="p-2.5">Position Title (in full)</th>
                      <th className="p-2.5">Dept / Agency / Company</th>
                      <th className="p-2.5">Monthly Salary (₱)</th>
                      <th className="p-2.5">Salary Grade</th>
                      <th className="p-2.5">Status of Appt</th>
                      <th className="p-2.5">Inclusive Dates</th>
                      <th className="p-2.5">Gov Service</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workExperience.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.position}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx].position = e.target.value;
                              setWorkExperience(updated);
                            }}
                            placeholder="Position Title"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs min-w-[150px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.agencyOrCompany}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx].agencyOrCompany = e.target.value;
                              setWorkExperience(updated);
                            }}
                            placeholder="Agency / Company"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs min-w-[150px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.monthlySalary || ''}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx].monthlySalary = e.target.value;
                              setWorkExperience(updated);
                            }}
                            placeholder="31000"
                            className="w-20 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.salaryGrade || ''}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx].salaryGrade = e.target.value;
                              setWorkExperience(updated);
                            }}
                            placeholder="SG 13-1"
                            className="w-20 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.statusOfAppointment || ''}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx].statusOfAppointment = e.target.value;
                              setWorkExperience(updated);
                            }}
                            placeholder="Permanent / COS"
                            className="w-28 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={item.fromDate}
                              onChange={(e) => {
                                const updated = [...workExperience];
                                updated[idx].fromDate = e.target.value;
                                setWorkExperience(updated);
                              }}
                              placeholder="From"
                              className="w-20 bg-white border border-slate-300 rounded p-1.5 text-xs"
                            />
                            <span>-</span>
                            <input
                              type="text"
                              value={item.toDate}
                              onChange={(e) => {
                                const updated = [...workExperience];
                                updated[idx].toDate = e.target.value;
                                setWorkExperience(updated);
                              }}
                              placeholder="To"
                              className="w-20 bg-white border border-slate-300 rounded p-1.5 text-xs"
                            />
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <select
                            value={item.isGovService ? 'Y' : 'N'}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx].isGovService = e.target.value === 'Y';
                              setWorkExperience(updated);
                            }}
                            className="bg-white border border-slate-300 rounded p-1.5 text-xs"
                          >
                            <option value="Y">Yes</option>
                            <option value="N">No</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          {workExperience.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setWorkExperience(workExperience.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. VOLUNTARY WORK */}
          {pdsActiveTab === 'voluntary' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-[#024794]" />
                  <span>VI. Voluntary Work or Involvement in Civic / NGO / PO Organizations</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setVoluntaryWork([
                      ...voluntaryWork,
                      {
                        organizationName: '',
                        organizationAddress: '',
                        fromDate: '',
                        toDate: '',
                        hours: 40,
                        positionOrNature: '',
                      },
                    ])
                  }
                  className="bg-blue-50 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Voluntary Row</span>
                </button>
              </div>

              {voluntaryWork.length === 0 ? (
                <p className="text-slate-400 italic text-xs">No voluntary work entered. Click Add above if applicable.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#024794] text-white">
                        <th className="p-2.5">Name &amp; Address of Organization</th>
                        <th className="p-2.5">Inclusive Dates (From - To)</th>
                        <th className="p-2.5">No. of Hours</th>
                        <th className="p-2.5">Position / Nature of Work</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voluntaryWork.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-200 bg-slate-50/50">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.organizationName}
                              onChange={(e) => {
                                const updated = [...voluntaryWork];
                                updated[idx].organizationName = e.target.value;
                                setVoluntaryWork(updated);
                              }}
                              placeholder="Organization Name & Address"
                              className="w-full bg-white border border-slate-300 rounded p-1.5"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={item.fromDate}
                                onChange={(e) => {
                                  const updated = [...voluntaryWork];
                                  updated[idx].fromDate = e.target.value;
                                  setVoluntaryWork(updated);
                                }}
                                placeholder="From"
                                className="w-20 bg-white border border-slate-300 rounded p-1.5"
                              />
                              <span>-</span>
                              <input
                                type="text"
                                value={item.toDate}
                                onChange={(e) => {
                                  const updated = [...voluntaryWork];
                                  updated[idx].toDate = e.target.value;
                                  setVoluntaryWork(updated);
                                }}
                                placeholder="To"
                                className="w-20 bg-white border border-slate-300 rounded p-1.5"
                              />
                            </div>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.hours}
                              onChange={(e) => {
                                const updated = [...voluntaryWork];
                                updated[idx].hours = Number(e.target.value) || 0;
                                setVoluntaryWork(updated);
                              }}
                              className="w-20 bg-white border border-slate-300 rounded p-1.5"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.positionOrNature}
                              onChange={(e) => {
                                const updated = [...voluntaryWork];
                                updated[idx].positionOrNature = e.target.value;
                                setVoluntaryWork(updated);
                              }}
                              placeholder="e.g. Volunteer Officer"
                              className="w-full bg-white border border-slate-300 rounded p-1.5"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setVoluntaryWork(voluntaryWork.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 7. LEARNING & DEVELOPMENT / TRAININGS */}
          {pdsActiveTab === 'training' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#024794]" />
                    <span>VII. Learning and Development (L&amp;D) Interventions / Trainings</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    CSC Rule: Resource Person roles, Facilitator engagements, and Conferences are excluded.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTraining([
                      ...training,
                      {
                        title: '',
                        fromDate: '',
                        toDate: '',
                        hours: 8,
                        typeOfLd: 'Technical',
                        provider: '',
                      },
                    ])
                  }
                  className="bg-blue-50 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Training Row</span>
                </button>
              </div>

              {/* CSC Training Live Validation Alert */}
              <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-[#024794] block">Civil Service Commission (CSC) Audit</span>
                  <span className="text-slate-600 text-[11px]">
                    Structured technical courses attended count toward QS requirements.
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">Qualifying</span>
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

              {trainingAudit.flagged.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg text-xs text-amber-900 space-y-1">
                  <span className="font-bold">Flagged Non-Qualifying Training Entries:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    {trainingAudit.flagged.map((f, i) => (
                      <li key={i}>
                        "{f.title}" ({f.hours} hrs) — {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#024794] text-white">
                      <th className="p-2.5">Title of Learning &amp; Development Program</th>
                      <th className="p-2.5">Inclusive Dates</th>
                      <th className="p-2.5">No. of Hours</th>
                      <th className="p-2.5">Type of L&amp;D</th>
                      <th className="p-2.5">Conducted / Sponsored By</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {training.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200 bg-slate-50/50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...training];
                              updated[idx].title = e.target.value;
                              setTraining(updated);
                            }}
                            placeholder="Course / Program Title"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 min-w-[200px]"
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={item.fromDate || ''}
                              onChange={(e) => {
                                const updated = [...training];
                                updated[idx].fromDate = e.target.value;
                                setTraining(updated);
                              }}
                              placeholder="From"
                              className="w-20 bg-white border border-slate-300 rounded p-1.5"
                            />
                            <span>-</span>
                            <input
                              type="text"
                              value={item.toDate || ''}
                              onChange={(e) => {
                                const updated = [...training];
                                updated[idx].toDate = e.target.value;
                                setTraining(updated);
                              }}
                              placeholder="To"
                              className="w-20 bg-white border border-slate-300 rounded p-1.5"
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.hours}
                            onChange={(e) => {
                              const updated = [...training];
                              updated[idx].hours = Number(e.target.value) || 0;
                              setTraining(updated);
                            }}
                            className="w-16 bg-white border border-slate-300 rounded p-1.5"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.typeOfLd || 'Technical'}
                            onChange={(e) => {
                              const updated = [...training];
                              updated[idx].typeOfLd = e.target.value;
                              setTraining(updated);
                            }}
                            placeholder="Technical"
                            className="w-24 bg-white border border-slate-300 rounded p-1.5"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.provider}
                            onChange={(e) => {
                              const updated = [...training];
                              updated[idx].provider = e.target.value;
                              setTraining(updated);
                            }}
                            placeholder="DA-BFAR / CSC / SEAFDEC"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 min-w-[150px]"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {training.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setTraining(training.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. OTHER INFORMATION */}
          {pdsActiveTab === 'other' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#024794]" />
                <span>VIII. Other Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">Special Skills &amp; Hobbies</span>
                  <textarea
                    rows={4}
                    value={otherInformation.specialSkills.join('\n')}
                    onChange={(e) =>
                      setOtherInformation({
                        ...otherInformation,
                        specialSkills: e.target.value.split('\n'),
                      })
                    }
                    placeholder="Enter one per line..."
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">Non-Academic Distinctions</span>
                  <textarea
                    rows={4}
                    value={otherInformation.nonAcademicDistinctions.join('\n')}
                    onChange={(e) =>
                      setOtherInformation({
                        ...otherInformation,
                        nonAcademicDistinctions: e.target.value.split('\n'),
                      })
                    }
                    placeholder="Enter one per line..."
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">Membership in Association / Org</span>
                  <textarea
                    rows={4}
                    value={otherInformation.memberships.join('\n')}
                    onChange={(e) =>
                      setOtherInformation({
                        ...otherInformation,
                        memberships: e.target.value.split('\n'),
                      })
                    }
                    placeholder="Enter one per line..."
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 9. DECLARATIONS & OATH */}
          {pdsActiveTab === 'declaration' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-5 text-xs">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#024794]" />
                <span>IX. Applicant Declaration &amp; Legal Questions (CSC Q34-Q40)</span>
              </h3>

              {/* Legal Questions */}
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-800">
                      34. Are you related by consanguinity or affinity to the appointing or recommending authority,
                      or to the chief of bureau or office (3rd degree for National Gov / 4th degree for Local)?
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 font-bold">
                        <input
                          type="radio"
                          name="q34"
                          checked={declaration.q34_relatedConsanguinity === true}
                          onChange={() => setDeclaration({ ...declaration, q34_relatedConsanguinity: true })}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1 font-bold">
                        <input
                          type="radio"
                          name="q34"
                          checked={declaration.q34_relatedConsanguinity === false}
                          onChange={() => setDeclaration({ ...declaration, q34_relatedConsanguinity: false })}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-800">
                      35. Have you ever been found guilty of any administrative offense or formally charged with a crime?
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 font-bold">
                        <input
                          type="radio"
                          name="q35"
                          checked={declaration.q35_adminOffense === true}
                          onChange={() => setDeclaration({ ...declaration, q35_adminOffense: true })}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1 font-bold">
                        <input
                          type="radio"
                          name="q35"
                          checked={declaration.q35_adminOffense === false}
                          onChange={() => setDeclaration({ ...declaration, q35_adminOffense: false })}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-800">
                      36. Have you ever been convicted of any crime or violation of any law, decree, or ordinance?
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 font-bold">
                        <input
                          type="radio"
                          name="q36"
                          checked={declaration.q36_convictedCrime === true}
                          onChange={() => setDeclaration({ ...declaration, q36_convictedCrime: true })}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1 font-bold">
                        <input
                          type="radio"
                          name="q36"
                          checked={declaration.q36_convictedCrime === false}
                          onChange={() => setDeclaration({ ...declaration, q36_convictedCrime: false })}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-800">
                      37. Have you ever been separated from the service in any mode (resignation, dismissal, dropped)?
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 font-bold">
                        <input
                          type="radio"
                          name="q37"
                          checked={declaration.q37_separatedFromService === true}
                          onChange={() => setDeclaration({ ...declaration, q37_separatedFromService: true })}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1 font-bold">
                        <input
                          type="radio"
                          name="q37"
                          checked={declaration.q37_separatedFromService === false}
                          onChange={() => setDeclaration({ ...declaration, q37_separatedFromService: false })}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Character References (3 persons) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  References (Persons not related by consanguinity or affinity to applicant)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {declaration.references.map((ref, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                      <span className="font-bold text-slate-700 block text-[11px]">Reference {idx + 1}</span>
                      <input
                        type="text"
                        placeholder="Full Legal Name"
                        value={ref.name}
                        onChange={(e) => {
                          const updated = [...declaration.references];
                          updated[idx].name = e.target.value;
                          setDeclaration({ ...declaration, references: updated });
                        }}
                        className="w-full border border-slate-300 rounded p-1.5 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Office / Residential Address"
                        value={ref.address}
                        onChange={(e) => {
                          const updated = [...declaration.references];
                          updated[idx].address = e.target.value;
                          setDeclaration({ ...declaration, references: updated });
                        }}
                        className="w-full border border-slate-300 rounded p-1.5 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Telephone / Mobile No."
                        value={ref.telNo}
                        onChange={(e) => {
                          const updated = [...declaration.references];
                          updated[idx].telNo = e.target.value;
                          setDeclaration({ ...declaration, references: updated });
                        }}
                        className="w-full border border-slate-300 rounded p-1.5 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Government ID Presented & Confirmation */}
              <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl space-y-3">
                <span className="font-bold text-[#024794] block text-xs">
                  Government Issued ID Presented (Passport, GSIS, SSS, PRC, Driver's License)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Government Issued ID Type"
                    value={declaration.govIssuedId.idType}
                    onChange={(e) =>
                      setDeclaration({
                        ...declaration,
                        govIssuedId: { ...declaration.govIssuedId, idType: e.target.value },
                      })
                    }
                    className="bg-white border border-slate-300 rounded p-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="ID / License / Passport No."
                    value={declaration.govIssuedId.idNumber}
                    onChange={(e) =>
                      setDeclaration({
                        ...declaration,
                        govIssuedId: { ...declaration.govIssuedId, idNumber: e.target.value },
                      })
                    }
                    className="bg-white border border-slate-300 rounded p-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Date & Place of Issuance"
                    value={declaration.govIssuedId.datePlaceIssuance}
                    onChange={(e) =>
                      setDeclaration({
                        ...declaration,
                        govIssuedId: { ...declaration.govIssuedId, datePlaceIssuance: e.target.value },
                      })
                    }
                    className="bg-white border border-slate-300 rounded p-2 text-xs"
                  />
                </div>

                <label className="flex items-start gap-2 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration.confirmedAuthenticity}
                    onChange={(e) =>
                      setDeclaration({ ...declaration, confirmedAuthenticity: e.target.checked })
                    }
                    className="mt-0.5 rounded text-[#024794]"
                  />
                  <span className="text-[11px] text-slate-800 font-semibold leading-relaxed">
                    I declare under oath that I have personally accomplished this Personal Data Sheet which is a true,
                    correct and complete statement pursuant to the provisions of pertinent laws, rules and regulations
                    of the Republic of the Philippines.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Section Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('letter')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 1. Application Letter</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('position_qs')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <span>Save &amp; Proceed to Section 3: Position Description &amp; QS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: POSITION DESCRIPTION & REQUIREMENTS */}
      {/* ========================================================================= */}
      {activeSection === 'position_qs' && (
        <div className="space-y-6">
          {/* Position Details Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase text-[#024794] tracking-wider block mb-1">
                  Section 3 of 6 • Official Plantilla Vacancy
                </span>
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

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Official Salary Grade:
                </span>
                <span className="text-lg font-black text-[#024794]">
                  Salary Grade {activeJob.salaryGrade}
                </span>
                <span className="text-[10px] text-amber-700 block font-semibold">
                  Closes: {activeJob.closingDate}
                </span>
              </div>
            </div>

            {/* Official Qualification Standards Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Civil Service Commission (CSC) Qualification Standards:
              </span>
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
                  <strong className="text-slate-800 block text-[11px]">3. Training:</strong>
                  <p className="text-slate-600 leading-relaxed">
                    {activeJob.qualificationStandards.training}
                  </p>
                  <span className="text-[10px] text-amber-700 block font-medium">
                    *Excludes RP/Facilitators/Conferences
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

            {/* Duties and Competencies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">Duties &amp; Responsibilities:</span>
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  {activeJob.dutiesAndResponsibilities.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#024794] text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">Required Competencies:</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeJob.competencies.map((c, i) => (
                    <span
                      key={i}
                      className="bg-blue-50 text-[#024794] border border-blue-200 px-2.5 py-1 rounded text-[11px] font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <a
                    href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#024794] hover:underline"
                  >
                    <span>Verify at bfar.da.gov.ph/opportunities/job-vacancies-careers</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* GEMINI AI QUALIFICATION ASSESSMENT MODULE */}
          <div className="bg-gradient-to-br from-[#024794] to-[#04336b] rounded-xl text-white p-6 shadow-md space-y-4 border border-blue-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    Gemini AI-Assisted Qualification Assessment
                  </h3>
                  <p className="text-xs text-sky-200">
                    Automated pre-screening comparing your PDS credentials against the vacancy's official QS.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunAiFitAssessment}
                disabled={isEvaluatingFit}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEvaluatingFit ? 'animate-spin' : ''}`} />
                <span>{isEvaluatingFit ? 'Evaluating Fit...' : 'Run / Re-evaluate AI Fit'}</span>
              </button>
            </div>

            {/* Assessment Result Panel */}
            {aiFitAssessment ? (
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Overall Automated Match Score:</span>
                    <span className="bg-white text-[#024794] font-black px-2.5 py-0.5 rounded text-sm">
                      {aiFitAssessment.score} / 100
                    </span>
                  </div>
                  <span className="text-[10px] text-sky-200">Evaluated at {aiFitAssessment.evaluatedAt}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="bg-white/10 p-2 rounded">
                    <span className="block text-sky-200">Education:</span>
                    <span className="font-bold text-emerald-300">
                      {aiFitAssessment.educationPass ? '✓ Verified Degree' : '⚠️ Under Review'}
                    </span>
                  </div>
                  <div className="bg-white/10 p-2 rounded">
                    <span className="block text-sky-200">Experience:</span>
                    <span className="font-bold text-emerald-300">
                      {aiFitAssessment.experiencePass ? '✓ Meets Standards' : '⚠️ Incomplete'}
                    </span>
                  </div>
                  <div className="bg-white/10 p-2 rounded">
                    <span className="block text-sky-200">Qualifying Training:</span>
                    <span className="font-bold text-emerald-300">
                      {trainingAudit.qualifying} Hours Verified
                    </span>
                  </div>
                  <div className="bg-white/10 p-2 rounded">
                    <span className="block text-sky-200">Eligibility:</span>
                    <span className="font-bold text-emerald-300">
                      {aiFitAssessment.eligibilityPass ? '✓ 2nd Level Eligible' : '⚠️ Missing'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-amber-200 italic pt-1 border-t border-white/10">
                  *{aiFitAssessment.advisory}
                </p>
              </div>
            ) : (
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-center text-xs text-sky-200">
                Click <strong>"Run / Re-evaluate AI Fit"</strong> to audit your credentials against Civil
                Service qualification standards.
              </div>
            )}
          </div>

          {/* Section Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('pds')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 2. Personal Data Sheet (PDS)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('file_uploads')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <span>Proceed to Section 4: File Uploads</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: FILE UPLOADS (PRIMARY PLANTILLA DOCUMENTS) */}
      {/* ========================================================================= */}
      {activeSection === 'file_uploads' && (
        <div className="space-y-6">
          {/* Universal Intelligent Dropzone */}
          <div className="bg-gradient-to-r from-blue-900 to-[#024794] rounded-2xl p-6 text-white shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider inline-block mb-1">
                  Section 4 of 6 • Mandatory Plantilla File Uploads
                </span>
                <h3 className="text-lg sm:text-xl font-black">
                  Upload Plantilla (PL), Eligibility, Trainings, and Work Experience (WE)
                </h3>
                <p className="text-xs text-sky-100 mt-0.5 max-w-2xl">
                  Drag and drop files into their slots, or use the universal classifier. Misplaced files are{' '}
                  <strong>automatically organized and corrected</strong> into their proper category.
                </p>
              </div>

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
              <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white">Click or drag &amp; drop files here to auto-classify</span>
                <p className="text-[11px] text-sky-200 mt-0.5">
                  Universal scanner: automatically identifies Plantilla, Eligibility, Trainings, or Work Experience.
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
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2.5 py-1 rounded border border-white/10"
                >
                  Eligibility into Trainings
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAutoCorrection('ipcr-in-pl')}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2.5 py-1 rounded border border-white/10"
                >
                  IPCR into Plantilla
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAutoCorrection('tor-in-we')}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2.5 py-1 rounded border border-white/10"
                >
                  TOR into Work Experience
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
                                  <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[9px]">
                                    Auto-Corrected from {doc.originalCategory}
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
              onClick={() => setActiveSection('position_qs')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 3. Position Description &amp; QS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('other_documents')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <span>Proceed to Section 5: Other Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: OTHER DOCUMENTS */}
      {/* ========================================================================= */}
      {activeSection === 'other_documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase text-[#024794] tracking-wider block mb-0.5">
                  Section 5 of 6 • Supplementary Documents Checklist
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Other Documents &amp; Compliance Attachments
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

            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700">Other Documents Uploaded:</span>
              <span className="font-extrabold text-[#024794] bg-white px-2.5 py-1 rounded border border-slate-200">
                {otherUploadCount} of 7 Categories Attached
              </span>
            </div>
          </div>

          {/* 7 CATEGORIES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OTHER_CATEGORIES.map((cat) => {
              const catDocs = documentsUploaded.filter((d) => d.category === cat.code);
              const isFilled = catDocs.length > 0;

              return (
                <div
                  key={cat.code}
                  className={`bg-white rounded-xl border p-4 space-y-3 transition-all flex flex-col justify-between ${
                    isFilled ? 'border-emerald-300 shadow-xs ring-1 ring-emerald-200' : 'border-slate-200 shadow-xs'
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
                            <Trash2 className="w-3.5 h-3.5" />
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
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Upload {cat.shortLabel}</span>
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
              onClick={() => setActiveSection('file_uploads')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 4. File Uploads</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('review_submit')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <span>Proceed to Section 6: Review &amp; Submit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: REVIEW & SUBMIT */}
      {/* ========================================================================= */}
      {activeSection === 'review_submit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-[10px] font-black uppercase text-[#024794] tracking-wider block mb-0.5">
                Section 6 of 6 • Final Verification
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Consolidated Application Review &amp; Official Submission
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Carefully review all six sections before submitting. Once submitted, your docket is forwarded
                to the DA-BFAR Human Resource Merit Promotion and Selection Board (HRMPSB).
              </p>
            </div>

            {/* Checklist Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Card 1: Application Letter Status */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#024794]" />
                    <span>1. Application Letter</span>
                  </span>
                  {applicationLetterText ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      Complete
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-3">
                  {applicationLetterText
                    ? applicationLetterText.substring(0, 180) + '...'
                    : 'No letter text recorded.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('letter')}
                  className="text-xs font-bold text-[#024794] hover:underline"
                >
                  Edit Application Letter →
                </button>
              </div>

              {/* Card 2: PDS CS Form 212 Status */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#024794]" />
                    <span>2. Personal Data Sheet (PDS)</span>
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    CS Form 212 Accomplished
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                  <span>Name: <strong>{personalInfo.fullName}</strong></span>
                  <span>Education: <strong>{education.length} entries</strong></span>
                  <span>Eligibility: <strong>{eligibility.length} entries</strong></span>
                  <span>Experience: <strong>{workExperience.length} entries</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('pds')}
                  className="text-xs font-bold text-[#024794] hover:underline"
                >
                  Edit PDS Fields →
                </button>
              </div>

              {/* Card 3: Position & QS Fit */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#024794]" />
                    <span>3. Target Position &amp; QS Fit</span>
                  </span>
                  <span className="bg-[#024794] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    SG-{activeJob.salaryGrade}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-xs">{activeJob.positionTitle}</p>
                <p className="text-[11px] text-slate-500 font-mono">{activeJob.itemNo}</p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>{trainingAudit.qualifying} qualifying training hours verified</span>
                </div>
              </div>

              {/* Card 4: Documents Uploaded Status */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-[#024794]" />
                    <span>4 &amp; 5. Documents Attached</span>
                  </span>
                  <span className="font-bold text-[#024794]">
                    {documentsUploaded.length} files attached
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Primary Plantilla Files: {primaryUploadCount}/4</span>
                  <span>Other Documents: {otherUploadCount}/7</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('file_uploads')}
                    className="text-xs font-bold text-[#024794] hover:underline"
                  >
                    Manage Primary Files →
                  </button>
                  <span className="text-slate-400">•</span>
                  <button
                    type="button"
                    onClick={() => setActiveSection('other_documents')}
                    className="text-xs font-bold text-[#024794] hover:underline"
                  >
                    Manage Other Docs →
                  </button>
                </div>
              </div>
            </div>

            {/* Final Legal Oath & Signature Box */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 text-xs">
              <span className="font-bold text-amber-900 block text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Applicant Affirmation and Digital Certification</span>
              </span>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                I hereby declare under the penalties of perjury that all answers and declarations made in this
                application, including my Personal Data Sheet (CS Form 212) and all attached documents, are true,
                correct, and authentic. I authorize the DA-BFAR HRMPSB to verify the authenticity of all credentials.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-amber-200/60">
                <div className="text-[11px] text-slate-700">
                  Applicant: <strong>{personalInfo.fullName}</strong> • Date: {new Date().toLocaleDateString('en-PH')}
                </div>
                <span className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-900 px-3 py-1 rounded font-bold text-[11px]">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Digitally Signed</span>
                </span>
              </div>
            </div>

            {/* SUBMIT BUTTON BAR */}
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Ready to Transmit Application to DA-BFAR</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Target Plantilla Item: <strong>{activeJob.itemNo}</strong> ({activeJob.positionTitle})
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-8 py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Application Docket...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Official Application to DA-BFAR</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('other_documents')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 5. Other Documents</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
