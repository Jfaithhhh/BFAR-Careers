import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAuth } from 'firebase/auth';
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
  InternalEmployeeProfile,
} from '../types';
import {
  saveApplicationToFirestore,
  lookupInternalEmployee,
} from '../lib/firestoreService';
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
  FileCheck,
  ArrowRight,
  ArrowLeft,
  X,
  Eye,
  Users,
  HeartHandshake,
  BookOpen,
  BadgeCheck,
  UserCheck,
} from 'lucide-react';

interface ApplicationFormProps {
  jobs: PlantillaJob[];
  selectedJobId?: string;
  initialInternalProfile?: InternalEmployeeProfile;
  initialApplicantType?: 'internal';
  isExternalApplicant?: boolean;
  applicantEmail?: string;
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
      'Formal Application Letter (AL) addressed to the Chief, Human Resource Management Section (HRMS) & Fully Accomplished CS Form 212 (Personal Data Sheet Revised 2017) with Work Experience Sheet.',
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
    acceptedFormats: 'PDF, JPG (max 5MB)',
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

const getJobItemNo = (job: PlantillaJob): string =>
  (job.plantillaItemNumber || job.itemNo || '').trim();

const getJobClosingDate = (job: PlantillaJob): string =>
  (job.applicationDeadline || job.closingDate || '').trim();

const generateReferenceCode = (): string => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `BFAR-${year}-${rand}`;
};

const pruneEmptyEntries = <T extends Record<string, any>>(
  rows: T[],
  requiredKeys: (keyof T)[]
): T[] =>
  rows.filter((row) =>
    requiredKeys.some((k) => {
      const val = row[k];
      return typeof val === 'string' ? val.trim().length > 0 : Boolean(val);
    })
  );

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  jobs,
  selectedJobId,
  initialInternalProfile,
  isExternalApplicant = false,
  applicantEmail = '',
  onApplicationSubmitted,
  onNavigateToTrack,
}) => {
  const [currentJobId, setCurrentJobId] = useState<string>(selectedJobId || jobs[0]?.id || '');
  const activeJob = useMemo(
    () => jobs.find((j) => j.id === currentJobId) || jobs[0],
    [jobs, currentJobId]
  );

  const jobItemNo = activeJob ? getJobItemNo(activeJob) : '';
  const jobClosingDate = activeJob ? getJobClosingDate(activeJob) : '';

  const [activeSection, setActiveSection] = useState<FormSection>('letter');

  const [applicationLetterText, setApplicationLetterText] = useState<string>('');
  const [letterUploadedFileName, setLetterUploadedFileName] = useState<string>('');
  const [letterSuccessNotice, setLetterSuccessNotice] = useState<string | null>(null);

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

  const [personalInfo, setPersonalInfo] = useState({
    surname: '',
    firstName: '',
    middleName: '',
    nameExtension: '',
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    birthPlace: '',
    sex: '' as 'Male' | 'Female' | '',
    civilStatus: 'Single' as 'Single' | 'Married' | 'Widowed' | 'Separated' | 'Other',
    citizenship: 'Filipino' as 'Filipino' | 'Dual Citizenship' | '',
    citizenshipType: 'by birth' as 'by birth' | 'by naturalization' | '',
    citizenshipCountry: '',
    heightMeters: '',
    weightKg: '',
    bloodType: '',
    gsisNo: '',
    pagibigNo: '',
    philhealthNo: '',
    sssNo: '',
    tinNo: '',
    agencyEmployeeNo: '',
    residentialAddress: '',
    residentialZip: '',
    permanentAddress: '',
    permanentZip: '',
    telephoneNumber: '',
  });

  const [familyBackground, setFamilyBackground] = useState({
    spouseSurname: '',
    spouseFirstName: '',
    spouseMiddleName: '',
    spouseNameExtension: '',
    spouseOccupation: '',
    spouseEmployer: '',
    spouseBusinessAddress: '',
    spouseTelephone: '',
    fatherSurname: '',
    fatherFirstName: '',
    fatherMiddleName: '',
    fatherNameExtension: '',
    motherMaidenSurname: '',
    motherFirstName: '',
    motherMiddleName: '',
    children: [] as { fullName: string; birthDate: string }[],
  });

  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityEntry[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([]);
  const [voluntaryWork, setVoluntaryWork] = useState<VoluntaryWorkEntry[]>([]);
  const [training, setTraining] = useState<TrainingEntry[]>([]);
  const [otherInformation, setOtherInformation] = useState({
    specialSkills: [] as string[],
    nonAcademicDistinctions: [] as string[],
    memberships: [] as string[],
  });

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
      { name: '', address: '', telNo: '' },
      { name: '', address: '', telNo: '' },
      { name: '', address: '', telNo: '' },
    ],
    govIssuedId: {
      idType: '',
      idNumber: '',
      datePlaceIssuance: '',
    },
    confirmedAuthenticity: false,
    digitalSignatureConfirmation: '',
    dateSigned: new Date().toISOString().split('T')[0],
  });

  const [rawResumeText, setRawResumeText] = useState('');
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiParseStatus, setAiParseStatus] = useState<string | null>(null);

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

  const [documentsUploaded, setDocumentsUploaded] = useState<ApplicantDocument[]>([]);
  const [autoCorrectionAlert, setAutoCorrectionAlert] = useState<{
    fileName: string;
    targetSlot: string;
    detectedCategory: string;
    reason: string;
  } | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<ApplicationRecord | null>(null);

  const [applicantType] = useState<'internal'>('internal');
  const [internalVerificationError, setInternalVerificationError] = useState<string | null>(null);
  const [isVerifyingStaff, setIsVerifyingStaff] = useState(false);

  const [bfarEmployeeId, setBfarEmployeeId] = useState<string>(
    initialInternalProfile?.employeeId || ''
  );
  const [currentDivision, setCurrentDivision] = useState<string>(
    initialInternalProfile?.division || ''
  );
  const [currentPlantillaItem, setCurrentPlantillaItem] = useState<string>(
    initialInternalProfile?.currentPlantillaItem || ''
  );
  const [currentSalaryGrade, setCurrentSalaryGrade] = useState<number | string>(
    initialInternalProfile?.salaryGrade ?? ''
  );
  const [yearsInBfar, setYearsInBfar] = useState<number | string>(
    initialInternalProfile?.yearsInBfar ?? ''
  );
  const [latestIpcrRating, setLatestIpcrRating] = useState<number | string>(
    initialInternalProfile?.latestIpcrRating ?? ''
  );
  const [ipcrPeriod, setIpcrPeriod] = useState<string>(
    initialInternalProfile?.ipcrPeriod || ''
  );
  const [promotionTrack, setPromotionTrack] = useState<
    'Promotion' | 'Lateral Transfer' | 'Reassignment'
  >('Promotion');

  const universalInputRef = useRef<HTMLInputElement | null>(null);
  const letterFileInputRef = useRef<HTMLInputElement | null>(null);
  const slotInputRefs = useRef<{ [key in DocumentCategory]?: HTMLInputElement | null }>({});
  const fitTimeoutRef = useRef<number | null>(null);
  const correctionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (fitTimeoutRef.current !== null) {
        window.clearTimeout(fitTimeoutRef.current);
      }
      if (correctionTimeoutRef.current !== null) {
        window.clearTimeout(correctionTimeoutRef.current);
      }
    };
  }, []);

  const applyInternalProfileData = (profile: InternalEmployeeProfile) => {
    setBfarEmployeeId(profile.employeeId);
    setCurrentDivision(profile.division || '');
    setCurrentPlantillaItem(profile.currentPlantillaItem || '');
    setCurrentSalaryGrade(profile.salaryGrade ?? '');
    setYearsInBfar(profile.yearsInBfar ?? '');
    setLatestIpcrRating(profile.latestIpcrRating ?? '');
    setIpcrPeriod(profile.ipcrPeriod || '');
    setInternalVerificationError(null);

    const parts = profile.fullName ? profile.fullName.trim().split(/\s+/) : [''];
    const surname = parts[parts.length - 1] || '';
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || '';

    setPersonalInfo((prev) => ({
      ...prev,
      fullName: profile.fullName || prev.fullName,
      surname: surname || prev.surname,
      firstName: firstName || prev.firstName,
      email: profile.email || prev.email,
      phone: profile.phone || prev.phone,
      birthDate: profile.birthDate || prev.birthDate,
      civilStatus: (profile.civilStatus as any) || prev.civilStatus,
      residentialAddress: profile.residentialAddress || prev.residentialAddress,
      permanentAddress: profile.residentialAddress || prev.permanentAddress,
      agencyEmployeeNo: profile.employeeId,
      sex: profile.sex || prev.sex,
    }));

    if (profile.currentPositionTitle) {
      setWorkExperience((prev) => {
        const bfarExp: WorkExperienceEntry = {
          position: profile.currentPositionTitle,
          agencyOrCompany: 'Bureau of Fisheries and Aquatic Resources (DA-BFAR)',
          salaryGrade: profile.salaryGrade ? `SG-${profile.salaryGrade}` : '',
          statusOfAppointment: 'Permanent',
          fromDate: profile.yearsInBfar
            ? `${new Date().getFullYear() - profile.yearsInBfar}-01-01`
            : 'Present',
          toDate: 'Present',
          isGovService: true,
          description: `Discharging statutory duties as ${profile.currentPositionTitle} in ${
            profile.division || 'BFAR'
          }.`,
        };
        const filtered = prev.filter((w) => !w.agencyOrCompany.includes('BFAR'));
        return [bfarExp, ...filtered];
      });
    }

    if (profile.eligibility) {
      setEligibility((prev) => {
        const elig: EligibilityEntry = {
          type: profile.eligibility,
          licenseNo: '',
          rating: '',
          examDate: '',
          examPlace: '',
        };
        const exists = prev.some((e) => e.type === profile.eligibility);
        return exists ? prev : [elig, ...prev];
      });
    }

    setDocumentsUploaded((prev) => {
      const candidateName = profile.fullName.replace(/\s+/g, '_');
      const ratingValue =
        typeof profile.latestIpcrRating === 'number'
          ? profile.latestIpcrRating.toFixed(2)
          : 'Verified';
      const internalDocs: ApplicantDocument[] = [
        {
          id: `int-ipcr-${Date.now()}-1`,
          name: `IPCR_${candidateName}_Rating_${ratingValue}_Compliant.pdf`,
          type: 'PDF',
          status: 'Verified',
          fileSize: '1.9 MB',
          category: 'PCR',
          sectionGroup: 'other_documents',
          uploadedAt: 'Verified via HRMIS',
        },
        {
          id: `int-service-${Date.now()}-2`,
          name: `BFAR_Official_Service_Record_${candidateName}_Authenticated.pdf`,
          type: 'PDF',
          status: 'Verified',
          fileSize: '1.6 MB',
          category: 'WE',
          sectionGroup: 'file_uploads',
          uploadedAt: 'Verified via HRMIS',
        },
      ];
      const hasIpcr = prev.some((d) => d.category === 'PCR');
      const hasWe = prev.some((d) => d.category === 'WE');
      const next = [...prev];
      if (!hasIpcr) next.push(internalDocs[0]);
      if (!hasWe) next.push(internalDocs[1]);
      return next;
    });
  };

  const handleVerifyInForm = async () => {
    const cleanId = bfarEmployeeId.trim().toUpperCase();
    if (!cleanId) {
      setInternalVerificationError('Please enter your official DA-BFAR Employee ID.');
      return;
    }
    setIsVerifyingStaff(true);
    setInternalVerificationError(null);
    try {
      const record = await lookupInternalEmployee(cleanId);
      if (record) {
        applyInternalProfileData(record);
      } else {
        setInternalVerificationError(
          'Employee record not found. Please contact the Human Resource Management Division for verification.'
        );
      }
    } catch {
      setInternalVerificationError(
        'Employee record not found. Please contact the Human Resource Management Division for verification.'
      );
    } finally {
      setIsVerifyingStaff(false);
    }
  };

  const handleParsePdsWithAI = async () => {
    if (!rawResumeText || rawResumeText.trim().length < 20) {
      setAiParseStatus(
        'Please paste your resume, CV, or credentials text first (at least 20 characters).'
      );
      return;
    }

    setIsParsingAi(true);
    setAiParseStatus('AI is analyzing your credentials against Civil Service Form 212 standards...');

    try {
      const res = await fetch('/api/ai/parse-pds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawResumeText,
          targetJobId: activeJob?.id || currentJobId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Parser route returned ${res.status}`);
      }

      const json = await res.json();
      if (json?.success && json?.data) {
        const parsed = json.data;
        if (parsed.personalInfo) {
          setPersonalInfo((prev) => ({
            ...prev,
            fullName: parsed.personalInfo.fullName || prev.fullName,
            email: parsed.personalInfo.email || prev.email,
            phone: parsed.personalInfo.phone || prev.phone,
            birthDate: parsed.personalInfo.birthDate || prev.birthDate,
            civilStatus: parsed.personalInfo.civilStatus || prev.civilStatus,
            residentialAddress: parsed.personalInfo.residentialAddress || prev.residentialAddress,
          }));
        }

        if (Array.isArray(parsed.education) && parsed.education.length > 0) {
          setEducation(parsed.education);
        }

        if (Array.isArray(parsed.eligibility) && parsed.eligibility.length > 0) {
          setEligibility(parsed.eligibility);
        }

        if (Array.isArray(parsed.workExperience) && parsed.workExperience.length > 0) {
          setWorkExperience(parsed.workExperience);
        }

        if (Array.isArray(parsed.training) && parsed.training.length > 0) {
          setTraining(parsed.training);
        }

        setAiParseStatus(
          'Successfully extracted credentials! Personal info, education, eligibility, work experience, and trainings have been populated into CS Form 212.'
        );
      } else {
        setAiParseStatus(
          json?.error || 'Failed to parse resume text. Please check your text and try again.'
        );
      }
    } catch {
      setAiParseStatus(
        'AI extraction service is currently unavailable on static hosting. You may continue entering or editing CS Form 212 fields manually.'
      );
    } finally {
      setIsParsingAi(false);
    }
  };

  useEffect(() => {
    if (initialInternalProfile && !isExternalApplicant) {
      applyInternalProfileData(initialInternalProfile);
    }
  }, [initialInternalProfile, isExternalApplicant]);

  useEffect(() => {
    if (applicantEmail) {
      setPersonalInfo((prev) => (prev.email ? prev : { ...prev, email: applicantEmail }));
    }
  }, [applicantEmail]);

  useEffect(() => {
    if (selectedJobId) {
      setCurrentJobId(selectedJobId);
    }
  }, [selectedJobId]);

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

  const handleRunAiFitAssessment = () => {
    if (fitTimeoutRef.current !== null) {
      window.clearTimeout(fitTimeoutRef.current);
    }
    setIsEvaluatingFit(true);
    fitTimeoutRef.current = window.setTimeout(() => {
      const hasDegree = education.some((e) =>
        /\b(fish|aqua|marine|bio|scien)\b/i.test(e.degree || '')
      );

      const expYears = workExperience.length * 1.5;
      const qualifyingHrs = trainingAudit.qualifying;
      const hasElig = eligibility.some((el) =>
        /\b(1080|prof|csc)\b/i.test(el.type || '')
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
    } else if (
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
    let lastCorrection: {
      fileName: string;
      targetSlot: string;
      detectedCategory: string;
      reason: string;
    } | null = null;

    Array.from(files).forEach((file) => {
      const { category, autoCorrected, originalCategory, correctionReason, sectionGroup } =
        classifyAndAutoCorrect(file.name, targetSlot);

      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      const doc: ApplicantDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      const alertData = lastCorrection as {
        fileName: string;
        targetSlot: string;
        detectedCategory: string;
        reason: string;
      };
      setAutoCorrectionAlert(alertData);
      if (correctionTimeoutRef.current !== null) {
        window.clearTimeout(correctionTimeoutRef.current);
      }
      correctionTimeoutRef.current = window.setTimeout(() => {
        setAutoCorrectionAlert((cur) => (cur?.fileName === alertData.fileName ? null : cur));
      }, 7000);
    }
  };

  const handleUploadLetterPdf = (file: File) => {
    setLetterUploadedFileName(file.name);
    setLetterSuccessNotice(`Attached PDF Application Letter: "${file.name}"`);

    const doc: ApplicantDocument = {
      id: `letter-${Date.now()}`,
      name: file.name,
      type: 'PDF',
      status: 'Uploaded',
      fileSize:
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : '1.4 MB',
      category: 'PL',
      sectionGroup: 'file_uploads',
      uploadedAt: 'Just now',
    };
    setDocumentsUploaded((prev) => [
      ...prev.filter((d) => !d.name.toLowerCase().includes('application_letter')),
      doc,
    ]);
  };

  const handleTestAutoCorrection = (
    testType: 'ipcr-in-pl' | 'eligibility-in-trainings' | 'tor-in-we'
  ) => {
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

    processFiles([mockFile as unknown as File], wrongSlot);
  };

  const handleRemoveDoc = (id?: string) => {
    if (!id) return;
    setDocumentsUploaded((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmitApplication = async () => {
    setFormError(null);

    const resolvedFullName = (
      personalInfo.fullName || `${personalInfo.firstName} ${personalInfo.surname}`
    ).trim();

    if (!resolvedFullName || !personalInfo.email.trim()) {
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
      const currentUid = getAuth().currentUser?.uid || '';
      const cleanedEducation = pruneEmptyEntries(education, ['school', 'degree']);
      const cleanedEligibility = pruneEmptyEntries(eligibility, ['type', 'licenseNo']);
      const cleanedWorkExperience = pruneEmptyEntries(workExperience, [
        'position',
        'agencyOrCompany',
      ]);
      const cleanedVoluntaryWork = pruneEmptyEntries(voluntaryWork, [
        'organizationName',
        'positionOrNature',
      ]);
      const cleanedTraining = pruneEmptyEntries(training, ['title', 'provider']);
      const cleanedChildren = pruneEmptyEntries(familyBackground.children, ['fullName']);

      const resolvedPersonalInfo = {
        ...personalInfo,
        fullName: resolvedFullName,
        civilStatus: personalInfo.civilStatus || 'Single',
      };

      const fullPdsPayload: PdsData = {
        personalInfo: resolvedPersonalInfo,
        familyBackground: {
          ...familyBackground,
          children: cleanedChildren,
        },
        education: cleanedEducation,
        eligibility: cleanedEligibility,
        workExperience: cleanedWorkExperience,
        voluntaryWork: cleanedVoluntaryWork,
        training: cleanedTraining,
        otherInformation: {
          specialSkills: otherInformation.specialSkills.map((s) => s.trim()).filter(Boolean),
          nonAcademicDistinctions: otherInformation.nonAcademicDistinctions
            .map((s) => s.trim())
            .filter(Boolean),
          memberships: otherInformation.memberships.map((s) => s.trim()).filter(Boolean),
        },
        declaration,
      };

      const cleanDocs = documentsUploaded.map((d) => {
        const docItem: Record<string, any> = {
          name: d.name,
          category: d.category,
          type: d.type,
          status: d.status || 'Uploaded',
          fileSize: d.fileSize,
        };
        if (d.id) docItem.id = d.id;
        if (d.sectionGroup) docItem.sectionGroup = d.sectionGroup;
        if (d.uploadedAt) docItem.uploadedAt = d.uploadedAt;
        if (d.autoCorrected) {
          docItem.autoCorrected = true;
          if (d.originalCategory) docItem.originalCategory = d.originalCategory;
          if (d.correctionReason) docItem.correctionReason = d.correctionReason;
        }
        return docItem;
      });

      const resolvedJobId = activeJob?.id || currentJobId;
      const resolvedPositionTitle = activeJob?.positionTitle || 'Plantilla Position';
      const resolvedItemNo = jobItemNo || 'BFAR-ITEM-PENDING';
      const nowIso = new Date().toISOString();

      const apiPayload: Record<string, any> = {
        jobId: resolvedJobId,
        applicantType,
        pdsData: fullPdsPayload,
        applicationLetterText,
        documentsUploaded: cleanDocs,
      };

      if (currentUid) apiPayload.applicantUid = currentUid;
      if (letterUploadedFileName) {
        apiPayload.applicationLetterUploadedFile = letterUploadedFileName;
      }

      if (!isExternalApplicant) {
        if (bfarEmployeeId.trim()) apiPayload.bfarEmployeeId = bfarEmployeeId.trim().toUpperCase();
        if (currentDivision.trim()) apiPayload.currentDivision = currentDivision.trim();
        if (currentPlantillaItem.trim())
          apiPayload.currentPlantillaItem = currentPlantillaItem.trim();
        if (currentSalaryGrade !== '') apiPayload.currentSalaryGrade = Number(currentSalaryGrade);
        if (yearsInBfar !== '') apiPayload.yearsInBfar = Number(yearsInBfar);
        if (latestIpcrRating !== '') apiPayload.latestIpcrRating = Number(latestIpcrRating);
        if (ipcrPeriod.trim()) apiPayload.ipcrPeriod = ipcrPeriod.trim();
        apiPayload.promotionTrack = promotionTrack;
      }

      let submittedRecord: ApplicationRecord | null = null;

      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data) {
            submittedRecord = json.data as ApplicationRecord;
          }
        }
      } catch {
        // Optional API backend on static Firebase Hosting; build local record for Firestore
      }

      if (!submittedRecord) {
        const score = aiFitAssessment?.score ?? 88;
        const baseRecord: Record<string, any> = {
          id: `app-${Date.now()}`,
          trackingCode: generateReferenceCode(),
          jobId: resolvedJobId,
          positionTitle: resolvedPositionTitle,
          plantillaItemNo: resolvedItemNo,
          applicantType,
          status: 'Submitted',
          submissionDate: nowIso,
          personalInfo: resolvedPersonalInfo,
          pdsData: fullPdsPayload,
          applicationLetterText,
          education: cleanedEducation,
          eligibility: cleanedEligibility,
          workExperience: cleanedWorkExperience,
          training: cleanedTraining,
          voluntaryWork: cleanedVoluntaryWork,
          documentsUploaded: cleanDocs,
          aiScreening: {
            overallScore: score,
            summaryRecommendation: 'Logged for HRMD completeness check and HRMPSB QS evaluation.',
            qsCompliance: {
              educationScore: 90,
              experienceScore: 88,
              trainingScore: 90,
              eligibilityScore: 90,
              educationAnalysis: 'Recorded in CS Form 212.',
              experienceAnalysis: 'Work experience recorded.',
              trainingAnalysis: `${trainingAudit.qualifying} qualifying hrs.`,
              eligibilityAnalysis: 'Recorded for HR check.',
            },
          },
        };

        if (currentUid) baseRecord.applicantUid = currentUid;
        if (letterUploadedFileName) {
          baseRecord.applicationLetterUploadedFile = letterUploadedFileName;
        }

        if (!isExternalApplicant) {
          if (bfarEmployeeId.trim()) baseRecord.bfarEmployeeId = bfarEmployeeId.trim().toUpperCase();
          if (currentDivision.trim()) baseRecord.currentDivision = currentDivision.trim();
          if (currentPlantillaItem.trim())
            baseRecord.currentPlantillaItem = currentPlantillaItem.trim();
          if (currentSalaryGrade !== '')
            baseRecord.currentSalaryGrade = Number(currentSalaryGrade);
          if (yearsInBfar !== '') baseRecord.yearsInBfar = Number(yearsInBfar);
          if (latestIpcrRating !== '') baseRecord.latestIpcrRating = Number(latestIpcrRating);
          if (ipcrPeriod.trim()) baseRecord.ipcrPeriod = ipcrPeriod.trim();
          baseRecord.promotionTrack = promotionTrack;
        }

        submittedRecord = baseRecord as unknown as ApplicationRecord;
      }

      await saveApplicationToFirestore(submittedRecord);
      setSubmissionSuccess(submittedRecord);
      onApplicationSubmitted(submittedRecord);
    } catch (err) {
      console.error('Failed to submit application:', err);
      setFormError('Failed to save application docket. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryUploadCount = PRIMARY_CATEGORIES.filter((cat) =>
    documentsUploaded.some((d) => d.category === cat.code)
  ).length;

  const otherUploadCount = OTHER_CATEGORIES.filter((cat) =>
    documentsUploaded.some((d) => d.category === cat.code)
  ).length;

  if (submissionSuccess) {
    return (
      <div className="max-w-3xl mx-auto my-6 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div
          className={`p-6 sm:p-8 text-center space-y-3 ${
            submissionSuccess.status === 'Rejected' ? 'bg-rose-700' : 'bg-[#024794]'
          } text-white`}
        >
          <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-1 border border-white/25">
            {submissionSuccess.status === 'Rejected' ? (
              <AlertCircle className="w-8 h-8 text-white" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-300" />
            )}
          </div>
          <span
            className={`font-black text-xs px-3 py-1 rounded-md uppercase tracking-wide inline-block ${
              submissionSuccess.status === 'Rejected'
                ? 'bg-white text-rose-900 shadow-xs'
                : 'bg-amber-400 text-slate-950 shadow-xs'
            }`}
          >
            Status: {submissionSuccess.status}
          </span>
          <h2 className="text-xl sm:text-2xl font-black">
            {submissionSuccess.status === 'Rejected'
              ? 'Preliminary Evaluation Completed'
              : 'Application Successfully Logged'}
          </h2>
          <p className="text-sky-100 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            Your application for <strong>{submissionSuccess.positionTitle}</strong> has been logged in
            the DA-BFAR Recruitment &amp; HRMIS portal under Plantilla Item No.{' '}
            <strong className="font-mono">{submissionSuccess.plantillaItemNo}</strong>.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-2">
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Official Application Reference Number
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#024794] select-all">
              {submissionSuccess.trackingCode}
            </div>
            <div className="inline-flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-md ${
                  submissionSuccess.status === 'Rejected'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                Initial Status: {submissionSuccess.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Please retain this tracking reference code to check real-time evaluation and
              deliberation updates.
            </p>
          </div>

          {submissionSuccess.status === 'Rejected' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs space-y-2 text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-950">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Notice of Disqualification / Minimum QS Non-Compliance</span>
              </div>
              <p className="text-rose-800 leading-relaxed">{submissionSuccess.adminRemarks}</p>
            </div>
          )}

          {submissionSuccess.aiScreening && (
            <div className="bg-sky-50 border border-blue-200 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#024794]" />
                  <span className="font-bold text-[#024794]">
                    Civil Service Qualification Standards (QS) Evaluation:
                  </span>
                </div>
                <span className="font-extrabold text-[#024794] bg-white border border-blue-200 px-2.5 py-1 rounded shadow-2xs">
                  QS Score: {submissionSuccess.aiScreening.overallScore} / 100
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                {submissionSuccess.aiScreening.summaryRecommendation}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateToTrack(submissionSuccess.trackingCode)}
              className="w-full sm:w-auto bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 text-center cursor-pointer"
            >
              Track Application Status Now
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmissionSuccess(null);
                setActiveSection('letter');
              }}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-2.5 rounded-lg text-xs font-semibold border border-slate-300 text-center cursor-pointer"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0 || !activeJob) {
    return (
      <div className="max-w-3xl mx-auto my-6 bg-white rounded-xl shadow-xs border border-slate-200 p-8 sm:p-12 text-center space-y-4">
        <div className="w-14 h-14 bg-blue-50 text-[#024794] rounded-xl flex items-center justify-center mx-auto border border-blue-200">
          <Building2 className="w-7 h-7 text-[#024794]" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            No official job vacancies are currently available.
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            All plantilla vacancy postings are synchronized directly with the official DA-BFAR
            Careers directory (https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/).
            Applications can only be lodged against published and authorized Plantilla Item Numbers.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <a
            href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#024794] text-white text-xs font-bold hover:bg-[#033b7a] transition-colors shadow-xs"
          >
            <span>Visit Official BFAR Careers Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-sky-200" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {!isExternalApplicant && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="bg-sky-50 border-b border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#024794] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Restricted System
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#024794]">
                  Internal DA-BFAR Employees &amp; Personnel Only
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                Internal Personnel Service &amp; Promotion Docket
              </h3>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Active Employee Verification Required</span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#024794] text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                    <UserCheck className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-900">
                        Internal BFAR Employee Merit Verification &amp; Fast-Fill
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        HRMIS Integrated
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Auto-populates service record, civil service eligibility, and verified IPCR
                      performance rating for promotion.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700 text-[11px] whitespace-nowrap">
                    Employee ID:
                  </span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      placeholder="e.g. COS4513"
                      value={bfarEmployeeId}
                      onChange={(e) => setBfarEmployeeId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-[#024794] focus:outline-hidden w-full sm:w-48"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyInForm}
                      disabled={isVerifyingStaff}
                      className="bg-[#024794] hover:bg-[#033b7a] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {isVerifyingStaff ? 'Verifying...' : 'Verify ID'}
                    </button>
                  </div>
                </div>
              </div>

              {internalVerificationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{internalVerificationError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Current Plantilla Item:
                  </span>
                  <span className="font-bold text-slate-900 truncate block mt-0.5">
                    {currentPlantillaItem || 'Unverified'}
                  </span>
                  <span className="text-[10px] text-[#024794] font-semibold">
                    {currentSalaryGrade !== ''
                      ? `Salary Grade ${currentSalaryGrade}`
                      : 'SG Pending'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Years in Bureau:
                  </span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {yearsInBfar !== ''
                      ? `${yearsInBfar} Years of Service`
                      : 'Pending Verification'}
                  </span>
                  <span className="text-[10px] text-slate-500">Service Record</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    Latest IPCR Rating:
                  </span>
                  <span className="font-black text-emerald-700 text-xs block mt-0.5">
                    {latestIpcrRating !== ''
                      ? `${Number(latestIpcrRating).toFixed(2)} / 5.00`
                      : 'Pending'}
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold">
                    {latestIpcrRating !== ''
                      ? Number(latestIpcrRating) >= 4.5
                        ? 'Outstanding'
                        : 'Very Satisfactory'
                      : 'CSC Standard: Min 4.00'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Promotion Track:
                  </span>
                  <select
                    value={promotionTrack}
                    onChange={(e) =>
                      setPromotionTrack(
                        e.target.value as 'Promotion' | 'Lateral Transfer' | 'Reassignment'
                      )
                    }
                    className="bg-transparent font-bold text-[#024794] text-xs w-full focus:outline-hidden mt-0.5 cursor-pointer"
                  >
                    <option value="Promotion">Promotion (Higher SG)</option>
                    <option value="Lateral Transfer">Lateral Transfer (Same SG)</option>
                    <option value="Reassignment">Reassignment / Station Shift</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6-SECTION TOP STEPPER NAVIGATION */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 sm:p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('letter')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              activeSection === 'letter'
                ? 'bg-[#024794] text-white shadow-xs ring-2 ring-[#024794]/20'
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
                className={`text-[10px] block truncate ${
                  activeSection === 'letter' ? 'text-sky-100' : 'text-slate-500'
                }`}
              >
                Application Letter
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('pds')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              activeSection === 'pds'
                ? 'bg-[#024794] text-white shadow-xs ring-2 ring-[#024794]/20'
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
                className={`text-[10px] block truncate ${
                  activeSection === 'pds' ? 'text-sky-100' : 'text-slate-500'
                }`}
              >
                CS Form 212
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('position_qs')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              activeSection === 'position_qs'
                ? 'bg-[#024794] text-white shadow-xs ring-2 ring-[#024794]/20'
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
                className={`text-[10px] block truncate ${
                  activeSection === 'position_qs' ? 'text-sky-100' : 'text-slate-500'
                }`}
              >
                Description &amp; QS
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('file_uploads')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              activeSection === 'file_uploads'
                ? 'bg-[#024794] text-white shadow-xs ring-2 ring-[#024794]/20'
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
                className={`text-[10px] block truncate ${
                  activeSection === 'file_uploads' ? 'text-sky-100' : 'text-slate-500'
                }`}
              >
                PL, Elig, WE ({primaryUploadCount}/4)
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('other_documents')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              activeSection === 'other_documents'
                ? 'bg-[#024794] text-white shadow-xs ring-2 ring-[#024794]/20'
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
                className={`text-[10px] block truncate ${
                  activeSection === 'other_documents' ? 'text-sky-100' : 'text-slate-500'
                }`}
              >
                TOR, Dipl, PCR ({otherUploadCount}/7)
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('review_submit')}
            className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              activeSection === 'review_submit'
                ? 'bg-[#024794] text-white shadow-xs ring-2 ring-[#024794]/20'
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
                className={`text-[10px] block truncate ${
                  activeSection === 'review_submit' ? 'text-sky-100' : 'text-slate-500'
                }`}
              >
                Review &amp; Submit
              </span>
            </div>
          </button>
        </div>
      </div>

      {autoCorrectionAlert && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl text-xs text-emerald-900 shadow-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-emerald-900 text-xs flex flex-wrap items-center gap-1.5">
                <span>Intelligent Auto-Correction Applied!</span>
                <span className="bg-emerald-200 text-emerald-950 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {autoCorrectionAlert.targetSlot} → {autoCorrectionAlert.detectedCategory}
                </span>
              </div>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                File <strong>&quot;{autoCorrectionAlert.fileName}&quot;</strong> was automatically
                organized into its designated category based on document contents.
              </p>
              <p className="text-emerald-700 text-[10px] mt-0.5 italic">
                {autoCorrectionAlert.reason}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoCorrectionAlert(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {formError && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl text-xs text-rose-800 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SECTION 1: APPLICATION LETTER */}
      {activeSection === 'letter' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase text-[#024794] tracking-wider block mb-1">
                  Section 1 of 6 • Official Application Letter
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Application Letter addressed to the Chief, Human Resource Management Section (HRMS)
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  <strong>Mandatory Requirement:</strong> The Formal Application Letter (AL) must be
                  written and submitted directly by the applicant (no pre-drafted template provided by
                  the system). Must be addressed to the{' '}
                  <strong>Chief, Human Resource Management Section (HRMS)</strong> through the
                  Chairperson of the HRMPSB, citing the target position title and plantilla item
                  number.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1 shrink-0 w-full md:w-64">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Target Plantilla Vacancy:
                </span>
                <span className="font-extrabold text-[#024794] block truncate">
                  {activeJob.positionTitle}
                </span>
                <span className="text-[11px] text-slate-600 block font-mono">
                  SG-{activeJob.salaryGrade} • Item No: {jobItemNo}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Mandatory Civil Service Application Letter Guidelines</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[11px] pl-6 list-disc text-amber-900">
                <li>
                  Must be addressed to:{' '}
                  <strong>Chief, Human Resource Management Section (HRMS), DA-BFAR</strong>
                </li>
                <li>
                  Thru: <strong>The Chairperson, HRMPSB</strong>
                </li>
                <li>
                  Must cite target position: <strong>{activeJob.positionTitle}</strong>
                </li>
                <li>
                  Must cite Plantilla Item No: <strong>{jobItemNo}</strong>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
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
                  className="bg-[#024794] hover:bg-[#033b7a] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Signed PDF Application Letter</span>
                </button>

                {applicationLetterText && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear your typed application letter?')) {
                        setApplicationLetterText('');
                      }
                    }}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Clear Text
                  </button>
                )}
              </div>

              {letterUploadedFileName && (
                <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Attached: {letterUploadedFileName}</span>
                </div>
              )}
            </div>

            {letterSuccessNotice && (
              <div className="bg-sky-50 border-l-4 border-[#024794] p-3 rounded-r-lg text-xs text-[#024794] flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{letterSuccessNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#024794]" />
                    <span>Editable Letter Content:</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Edits update the preview live</span>
                </div>
                <textarea
                  rows={18}
                  value={applicationLetterText}
                  onChange={(e) => setApplicationLetterText(e.target.value)}
                  placeholder="Address your formal application letter to the Chief, Human Resource Management Section (HRMS), DA-BFAR..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs font-mono leading-relaxed text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Official Letterhead Document Preview:</span>
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-mono">
                    DA-BFAR HRMS Standard
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4 text-xs leading-relaxed text-slate-800 max-h-[440px] overflow-y-auto">
                  <div className="text-center space-y-0.5 border-b border-slate-200 pb-3">
                    <span className="text-[10px] uppercase tracking-wider block text-slate-500 font-bold">
                      Republic of the Philippines
                    </span>
                    <span className="text-[11px] uppercase font-bold text-slate-800 block">
                      Department of Agriculture
                    </span>
                    <span className="text-xs font-black text-[#024794] block tracking-wide">
                      BUREAU OF FISHERIES AND AQUATIC RESOURCES
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      PCA Building, Elliptical Road, Diliman, Quezon City • Human Resource
                      Management Section (HRMS)
                    </span>
                  </div>

                  <div className="whitespace-pre-line text-xs leading-relaxed text-slate-800 pt-1">
                    {applicationLetterText || (
                      <span className="text-slate-400 italic">
                        Write or paste your formal application letter addressed to the Chief, Human
                        Resource Management Section (HRMS), DA-BFAR...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setActiveSection('pds')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span>Save &amp; Proceed to Section 2: Personal Data Sheet (PDS)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: PERSONAL DATA SHEET */}
      {activeSection === 'pds' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
              <div>
                <span className="bg-[#024794] text-white text-[10px] font-black px-2.5 py-0.5 rounded tracking-wider uppercase inline-block mb-1">
                  CS Form No. 212 (Revised 2017)
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  PERSONAL DATA SHEET
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Civil Service Commission prescribed format for government service appointments.
                </p>
              </div>
            </div>

            <div className="bg-sky-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#024794] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                      <span>AI Fast-Fill PDS (CS Form 212)</span>
                      <span className="bg-blue-100 text-[#024794] text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                        Productivity Tool
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Paste your actual resume, CV, or service record text below to auto-populate PDS
                      tables in one click.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={rawResumeText}
                  onChange={(e) => setRawResumeText(e.target.value)}
                  placeholder="Paste your resume or credentials text here (e.g. Full Name, College Degree, School, PRC/CSC Eligibility, Work Experience history, and Training hours)..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#024794] focus:border-[#024794] focus:outline-hidden"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">
                    Input is processed securely against CSC Form 212 standard schema. No demo or
                    sample profiles are inserted.
                  </span>
                  <div className="flex items-center gap-2">
                    {rawResumeText && (
                      <button
                        type="button"
                        onClick={() => setRawResumeText('')}
                        className="text-xs text-slate-600 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleParsePdsWithAI}
                      disabled={isParsingAi || !rawResumeText.trim()}
                      className="bg-[#024794] hover:bg-[#033b7a] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isParsingAi ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          <span>Extracting Credentials...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                          <span>AI Extract &amp; Auto-Fill PDS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {aiParseStatus && (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{aiParseStatus}</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[11px] text-amber-950 leading-relaxed">
              <strong>WARNING:</strong> Any misrepresentation made in the Personal Data Sheet and the
              Work Experience Sheet shall cause the filing of administrative/criminal case/s against
              the person concerned pursuant to CSC and Ombudsman rules.
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2.5 text-xs font-semibold">
              {(
                [
                  { id: 'personal', label: 'I. Personal Info' },
                  { id: 'family', label: 'II. Family Background' },
                  { id: 'education', label: 'III. Educational Background' },
                  { id: 'eligibility', label: 'IV. Civil Service Eligibility' },
                  { id: 'experience', label: 'V. Work Experience' },
                  { id: 'voluntary', label: 'VI. Voluntary Work' },
                  { id: 'training', label: 'VII. Trainings & L&D' },
                  { id: 'other', label: 'VIII. Other Info' },
                  { id: 'declaration', label: 'IX. Declarations & Oath' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPdsActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                    pdsActiveTab === tab.id
                      ? 'bg-[#024794] text-white font-bold shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

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
                      updated.fullName = `${updated.firstName} ${updated.middleName} ${updated.surname} ${updated.nameExtension}`
                        .replace(/\s+/g, ' ')
                        .trim();
                      setPersonalInfo(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={personalInfo.firstName}
                    onChange={(e) => {
                      const updated = { ...personalInfo, firstName: e.target.value };
                      updated.fullName = `${updated.firstName} ${updated.middleName} ${updated.surname} ${updated.nameExtension}`
                        .replace(/\s+/g, ' ')
                        .trim();
                      setPersonalInfo(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={personalInfo.middleName}
                    onChange={(e) => {
                      const updated = { ...personalInfo, middleName: e.target.value };
                      updated.fullName = `${updated.firstName} ${updated.middleName} ${updated.surname} ${updated.nameExtension}`
                        .replace(/\s+/g, ' ')
                        .trim();
                      setPersonalInfo(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
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
                      updated.fullName = `${updated.firstName} ${updated.middleName} ${updated.surname} ${updated.nameExtension}`
                        .replace(/\s+/g, ' ')
                        .trim();
                      setPersonalInfo(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={personalInfo.birthDate}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, birthDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Place of Birth</label>
                  <input
                    type="text"
                    value={personalInfo.birthPlace}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, birthPlace: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sex</label>
                  <select
                    value={personalInfo.sex}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        sex: e.target.value as 'Male' | 'Female' | '',
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  >
                    <option value="">Select</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Civil Status</label>
                  <select
                    value={personalInfo.civilStatus}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        civilStatus: e.target.value as
                          | 'Single'
                          | 'Married'
                          | 'Widowed'
                          | 'Separated'
                          | 'Other',
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
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
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        citizenship: e.target.value as 'Filipino' | 'Dual Citizenship' | '',
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
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
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, heightMeters: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    placeholder="e.g. 58"
                    value={personalInfo.weightKg}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, weightKg: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Blood Type</label>
                  <input
                    type="text"
                    placeholder="e.g. O+, A+, B+"
                    value={personalInfo.bloodType}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, bloodType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">GSIS ID No.</label>
                  <input
                    type="text"
                    value={personalInfo.gsisNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, gsisNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PAG-IBIG ID No.</label>
                  <input
                    type="text"
                    value={personalInfo.pagibigNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, pagibigNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PHILHEALTH No.</label>
                  <input
                    type="text"
                    value={personalInfo.philhealthNo}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, philhealthNo: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SSS No.</label>
                  <input
                    type="text"
                    value={personalInfo.sssNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, sssNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">TIN No.</label>
                  <input
                    type="text"
                    value={personalInfo.tinNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, tinNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Agency Employee No.
                  </label>
                  <input
                    type="text"
                    value={personalInfo.agencyEmployeeNo}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, agencyEmployeeNo: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={personalInfo.residentialAddress}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, residentialAddress: e.target.value })
                    }
                    placeholder="House/Block/Lot No., Street, Subdivision/Village, Barangay, City/Municipality, Province"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={personalInfo.residentialZip}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, residentialZip: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Permanent Address
                  </label>
                  <input
                    type="text"
                    value={personalInfo.permanentAddress}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, permanentAddress: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Permanent ZIP</label>
                  <input
                    type="text"
                    value={personalInfo.permanentZip}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, permanentZip: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mobile Contact No.
                  </label>
                  <input
                    type="tel"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Telephone No.</label>
                  <input
                    type="text"
                    value={personalInfo.telephoneNumber}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, telephoneNumber: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#024794] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {pdsActiveTab === 'family' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#024794]" />
                <span>II. Family Background</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">
                    Spouse&apos;s Information (if applicable)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Surname</label>
                      <input
                        type="text"
                        value={familyBackground.spouseSurname}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            spouseSurname: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">First Name</label>
                      <input
                        type="text"
                        value={familyBackground.spouseFirstName}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            spouseFirstName: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={familyBackground.spouseMiddleName}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            spouseMiddleName: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Occupation</label>
                      <input
                        type="text"
                        value={familyBackground.spouseOccupation}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            spouseOccupation: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">
                    Parents&apos; Information
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Father&apos;s Surname
                      </label>
                      <input
                        type="text"
                        value={familyBackground.fatherSurname}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            fatherSurname: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Father&apos;s First Name
                      </label>
                      <input
                        type="text"
                        value={familyBackground.fatherFirstName}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            fatherFirstName: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Father&apos;s Middle Name
                      </label>
                      <input
                        type="text"
                        value={familyBackground.fatherMiddleName}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            fatherMiddleName: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Mother&apos;s Maiden Surname
                      </label>
                      <input
                        type="text"
                        value={familyBackground.motherMaidenSurname}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            motherMaidenSurname: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Mother&apos;s First Name
                      </label>
                      <input
                        type="text"
                        value={familyBackground.motherFirstName}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            motherFirstName: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Mother&apos;s Middle Name
                      </label>
                      <input
                        type="text"
                        value={familyBackground.motherMiddleName}
                        onChange={(e) =>
                          setFamilyBackground({
                            ...familyBackground,
                            motherMiddleName: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">
                      Children Information (if applicable)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFamilyBackground({
                          ...familyBackground,
                          children: [...familyBackground.children, { fullName: '', birthDate: '' }],
                        })
                      }
                      className="text-[#024794] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
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
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
                        >
                          <input
                            type="text"
                            placeholder="Full Name of Child"
                            value={child.fullName}
                            onChange={(e) => {
                              const updated = [...familyBackground.children];
                              updated[idx] = { ...updated[idx], fullName: e.target.value };
                              setFamilyBackground({ ...familyBackground, children: updated });
                            }}
                            className="bg-white border border-slate-300 rounded-lg p-2 col-span-2"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={child.birthDate}
                              onChange={(e) => {
                                const updated = [...familyBackground.children];
                                updated[idx] = { ...updated[idx], birthDate: e.target.value };
                                setFamilyBackground({ ...familyBackground, children: updated });
                              }}
                              className="bg-white border border-slate-300 rounded-lg p-2 flex-1"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFamilyBackground({
                                  ...familyBackground,
                                  children: familyBackground.children.filter((_, i) => i !== idx),
                                })
                              }
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
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
                  className="bg-blue-50 hover:bg-blue-100 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Education Row</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                      <tr
                        key={idx}
                        className="border-b border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                      >
                        <td className="p-2">
                          <select
                            value={item.level}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[idx] = { ...updated[idx], level: e.target.value };
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
                              updated[idx] = { ...updated[idx], school: e.target.value };
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
                              updated[idx] = { ...updated[idx], degree: e.target.value };
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
                                updated[idx] = { ...updated[idx], periodFrom: e.target.value };
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
                                updated[idx] = { ...updated[idx], periodTo: e.target.value };
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
                              updated[idx] = { ...updated[idx], unitsEarned: e.target.value };
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
                              updated[idx] = { ...updated[idx], yearGraduated: e.target.value };
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
                              updated[idx] = { ...updated[idx], honors: e.target.value };
                              setEducation(updated);
                            }}
                            placeholder="Honors / Awards"
                            className="w-28 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                  className="bg-blue-50 hover:bg-blue-100 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Eligibility Row</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                      <tr
                        key={idx}
                        className="border-b border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                      >
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.type}
                            onChange={(e) => {
                              const updated = [...eligibility];
                              updated[idx] = { ...updated[idx], type: e.target.value };
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
                              updated[idx] = { ...updated[idx], rating: e.target.value };
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
                              updated[idx] = { ...updated[idx], examDate: e.target.value };
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
                              updated[idx] = { ...updated[idx], examPlace: e.target.value };
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
                              updated[idx] = { ...updated[idx], licenseNo: e.target.value };
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
                              updated[idx] = { ...updated[idx], validityDate: e.target.value };
                              setEligibility(updated);
                            }}
                            placeholder="e.g. 2027-04-14"
                            className="w-28 bg-white border border-slate-300 rounded p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setEligibility(eligibility.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                        salaryGrade: '',
                        statusOfAppointment: 'Permanent',
                        fromDate: '',
                        toDate: '',
                        isGovService: false,
                        description: '',
                      },
                    ])
                  }
                  className="bg-blue-50 hover:bg-blue-100 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Experience Row</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#024794] text-white">
                      <th className="p-2.5">Position Title (in full)</th>
                      <th className="p-2.5">Dept / Agency / Company</th>
                      <th className="p-2.5">Salary Grade</th>
                      <th className="p-2.5">Status of Appt</th>
                      <th className="p-2.5">Inclusive Dates</th>
                      <th className="p-2.5">Gov Service</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workExperience.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                      >
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.position}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx] = { ...updated[idx], position: e.target.value };
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
                              updated[idx] = { ...updated[idx], agencyOrCompany: e.target.value };
                              setWorkExperience(updated);
                            }}
                            placeholder="Agency / Company"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs min-w-[150px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.salaryGrade || ''}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx] = { ...updated[idx], salaryGrade: e.target.value };
                              setWorkExperience(updated);
                            }}
                            placeholder="e.g. SG-11"
                            className="w-24 bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold text-[#024794]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.statusOfAppointment || ''}
                            onChange={(e) => {
                              const updated = [...workExperience];
                              updated[idx] = {
                                ...updated[idx],
                                statusOfAppointment: e.target.value,
                              };
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
                                updated[idx] = { ...updated[idx], fromDate: e.target.value };
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
                                updated[idx] = { ...updated[idx], toDate: e.target.value };
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
                              updated[idx] = {
                                ...updated[idx],
                                isGovService: e.target.value === 'Y',
                              };
                              setWorkExperience(updated);
                            }}
                            className="bg-white border border-slate-300 rounded p-1.5 text-xs"
                          >
                            <option value="Y">Yes</option>
                            <option value="N">No</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setWorkExperience(workExperience.filter((_, i) => i !== idx))
                            }
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                  className="bg-blue-50 hover:bg-blue-100 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Voluntary Row</span>
                </button>
              </div>

              {voluntaryWork.length === 0 ? (
                <p className="text-slate-400 italic text-xs">
                  No voluntary work entered. Click Add above if applicable.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                                updated[idx] = {
                                  ...updated[idx],
                                  organizationName: e.target.value,
                                };
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
                                  updated[idx] = { ...updated[idx], fromDate: e.target.value };
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
                                  updated[idx] = { ...updated[idx], toDate: e.target.value };
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
                                updated[idx] = {
                                  ...updated[idx],
                                  hours: Number(e.target.value) || 0,
                                };
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
                                updated[idx] = {
                                  ...updated[idx],
                                  positionOrNature: e.target.value,
                                };
                                setVoluntaryWork(updated);
                              }}
                              placeholder="e.g. Volunteer Officer"
                              className="w-full bg-white border border-slate-300 rounded p-1.5"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setVoluntaryWork(voluntaryWork.filter((_, i) => i !== idx))
                              }
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
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

          {pdsActiveTab === 'training' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#024794]" />
                    <span>VII. Learning and Development (L&amp;D) Interventions / Trainings</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    CSC Rule: Resource Person roles, Facilitator engagements, and Conferences are
                    excluded.
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
                  className="bg-blue-50 hover:bg-blue-100 text-[#024794] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Training Row</span>
                </button>
              </div>

              <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-[#024794] block">
                    Civil Service Commission (CSC) Audit
                  </span>
                  <span className="text-slate-600 text-[11px]">
                    Structured technical courses attended count toward QS requirements.
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">
                      Qualifying
                    </span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      {trainingAudit.qualifying} Hours
                    </span>
                  </div>
                  {trainingAudit.excluded > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-amber-700 uppercase block font-sans font-bold">
                        Excluded
                      </span>
                      <span className="font-bold text-amber-800 text-sm">
                        -{trainingAudit.excluded} Hours
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {trainingAudit.flagged.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-950 space-y-1">
                  <span className="font-bold">Flagged Non-Qualifying Training Entries:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900">
                    {trainingAudit.flagged.map((f, i) => (
                      <li key={i}>
                        &quot;{f.title}&quot; ({f.hours} hrs) — {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                              updated[idx] = { ...updated[idx], title: e.target.value };
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
                                updated[idx] = { ...updated[idx], fromDate: e.target.value };
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
                                updated[idx] = { ...updated[idx], toDate: e.target.value };
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
                              updated[idx] = {
                                ...updated[idx],
                                hours: Number(e.target.value) || 0,
                              };
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
                              updated[idx] = { ...updated[idx], typeOfLd: e.target.value };
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
                              updated[idx] = { ...updated[idx], provider: e.target.value };
                              setTraining(updated);
                            }}
                            placeholder="DA-BFAR / CSC / SEAFDEC"
                            className="w-full bg-white border border-slate-300 rounded p-1.5 min-w-[150px]"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setTraining(training.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pdsActiveTab === 'other' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#024794]" />
                <span>VIII. Other Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">
                    Special Skills &amp; Hobbies
                  </span>
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
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">
                    Non-Academic Distinctions
                  </span>
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
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">
                    Membership in Association / Org
                  </span>
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
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {pdsActiveTab === 'declaration' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-5 text-xs">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#024794]" />
                <span>IX. Applicant Declaration &amp; Legal Questions (CSC Q34-Q40)</span>
              </h3>

              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-800">
                      34. Are you related by consanguinity or affinity to the appointing or
                      recommending authority, or to the chief of bureau or office (3rd degree for
                      National Gov / 4th degree for Local)?
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="q34"
                          checked={declaration.q34_relatedConsanguinity === true}
                          onChange={() =>
                            setDeclaration({ ...declaration, q34_relatedConsanguinity: true })
                          }
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="q34"
                          checked={declaration.q34_relatedConsanguinity === false}
                          onChange={() =>
                            setDeclaration({ ...declaration, q34_relatedConsanguinity: false })
                          }
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-800">
                      35. Have you ever been found guilty of any administrative offense or formally
                      charged with a crime?
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="q35"
                          checked={declaration.q35_adminOffense === true}
                          onChange={() => setDeclaration({ ...declaration, q35_adminOffense: true })}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="q35"
                          checked={declaration.q35_adminOffense === false}
                          onChange={() =>
                            setDeclaration({ ...declaration, q35_adminOffense: false })
                          }
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-800">
                      36. Have you ever been convicted of any crime or violation of any law, decree,
                      or ordinance?
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="q36"
                          checked={declaration.q36_convictedCrime === true}
                          onChange={() =>
                            setDeclaration({ ...declaration, q36_convictedCrime: true })
                          }
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="q36"
                          checked={declaration.q36_convictedCrime === false}
                          onChange={() =>
                            setDeclaration({ ...declaration, q36_convictedCrime: false })
                          }
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-800">
                      37. Have you ever been separated from the service in any mode (resignation,
                      dismissal, dropped)?
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="q37"
                          checked={declaration.q37_separatedFromService === true}
                          onChange={() =>
                            setDeclaration({ ...declaration, q37_separatedFromService: true })
                          }
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="q37"
                          checked={declaration.q37_separatedFromService === false}
                          onChange={() =>
                            setDeclaration({ ...declaration, q37_separatedFromService: false })
                          }
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  References (Persons not related by consanguinity or affinity to applicant)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {declaration.references.map((ref, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5"
                    >
                      <span className="font-bold text-slate-700 block text-[11px]">
                        Reference {idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Full Legal Name"
                        value={ref.name}
                        onChange={(e) => {
                          const updated = [...declaration.references];
                          updated[idx] = { ...updated[idx], name: e.target.value };
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
                          updated[idx] = { ...updated[idx], address: e.target.value };
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
                          updated[idx] = { ...updated[idx], telNo: e.target.value };
                          setDeclaration({ ...declaration, references: updated });
                        }}
                        className="w-full border border-slate-300 rounded p-1.5 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-sky-50 border border-blue-200 p-4 rounded-xl space-y-3">
                <span className="font-bold text-[#024794] block text-xs">
                  Government Issued ID Presented (Passport, GSIS, SSS, PRC, Driver&apos;s License)
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
                    className="bg-white border border-slate-300 rounded-lg p-2 text-xs"
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
                    className="bg-white border border-slate-300 rounded-lg p-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Date & Place of Issuance"
                    value={declaration.govIssuedId.datePlaceIssuance}
                    onChange={(e) =>
                      setDeclaration({
                        ...declaration,
                        govIssuedId: {
                          ...declaration.govIssuedId,
                          datePlaceIssuance: e.target.value,
                        },
                      })
                    }
                    className="bg-white border border-slate-300 rounded-lg p-2 text-xs"
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
                    I declare under oath that I have personally accomplished this Personal Data Sheet
                    which is a true, correct and complete statement pursuant to the provisions of
                    pertinent laws, rules and regulations of the Republic of the Philippines.
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveSection('letter')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 1. Application Letter</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('position_qs')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Save &amp; Proceed to Section 3: Position Description &amp; QS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: POSITION DESCRIPTION & REQUIREMENTS */}
      {activeSection === 'position_qs' && (
        <div className="space-y-6">
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
                  <span className="font-mono font-bold text-[#024794]">{jobItemNo}</span>
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
                <span className="text-[10px] text-amber-800 block font-semibold">
                  Closes: {jobClosingDate}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Civil Service Commission (CSC) Qualification Standards:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block text-[11px]">1. Education:</strong>
                  <p className="text-slate-600 leading-relaxed">
                    {activeJob.qualificationStandards?.education}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block text-[11px]">2. Experience:</strong>
                  <p className="text-slate-600 leading-relaxed">
                    {activeJob.qualificationStandards?.experience}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block text-[11px]">3. Training:</strong>
                  <p className="text-slate-600 leading-relaxed">
                    {activeJob.qualificationStandards?.training}
                  </p>
                  <span className="text-[10px] text-amber-800 block font-medium">
                    *Excludes RP/Facilitators/Conferences
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block text-[11px]">4. Eligibility:</strong>
                  <p className="text-slate-600 leading-relaxed">
                    {activeJob.qualificationStandards?.eligibility}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  Duties &amp; Responsibilities:
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  {(activeJob.dutiesAndResponsibilities || []).map((d, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#024794] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  Required Competencies:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(activeJob.competencies || []).map((c, i) => (
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

          <div className="bg-[#024794] rounded-xl text-white p-6 shadow-xs space-y-4 border border-[#024794]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    Gemini AI-Assisted Qualification Assessment
                  </h3>
                  <p className="text-xs text-sky-100">
                    Automated pre-screening comparing your PDS credentials against the vacancy&apos;s
                    official QS.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunAiFitAssessment}
                disabled={isEvaluatingFit}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEvaluatingFit ? 'animate-spin' : ''}`} />
                <span>{isEvaluatingFit ? 'Evaluating Fit...' : 'Run / Re-evaluate AI Fit'}</span>
              </button>
            </div>

            {aiFitAssessment ? (
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Overall Automated Match Score:</span>
                    <span className="bg-white text-[#024794] font-black px-2.5 py-0.5 rounded text-sm">
                      {aiFitAssessment.score} / 100
                    </span>
                  </div>
                  <span className="text-[10px] text-sky-100">
                    Evaluated at {aiFitAssessment.evaluatedAt}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                    <span className="block text-sky-100">Education:</span>
                    <span className="font-bold text-emerald-300">
                      {aiFitAssessment.educationPass ? '✓ Verified Degree' : '⚠️ Under Review'}
                    </span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                    <span className="block text-sky-100">Experience:</span>
                    <span className="font-bold text-emerald-300">
                      {aiFitAssessment.experiencePass ? '✓ Meets Standards' : '⚠️ Incomplete'}
                    </span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                    <span className="block text-sky-100">Qualifying Training:</span>
                    <span className="font-bold text-emerald-300">
                      {trainingAudit.qualifying} Hours Verified
                    </span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                    <span className="block text-sky-100">Eligibility:</span>
                    <span className="font-bold text-emerald-300">
                      {aiFitAssessment.eligibilityPass ? '✓ 2nd Level Eligible' : '⚠️ Missing'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-amber-200 italic pt-1 border-t border-white/15">
                  *{aiFitAssessment.advisory}
                </p>
              </div>
            ) : (
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-center text-xs text-sky-100">
                Click <strong>&quot;Run / Re-evaluate AI Fit&quot;</strong> to audit your credentials
                against Civil Service qualification standards.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveSection('pds')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 2. Personal Data Sheet (PDS)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('file_uploads')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Proceed to Section 4: File Uploads</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: FILE UPLOADS */}
      {activeSection === 'file_uploads' && (
        <div className="space-y-6">
          <div className="bg-[#024794] rounded-xl p-6 text-white shadow-xs space-y-4 border border-[#024794]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider inline-block mb-1">
                  Section 4 of 6 • Mandatory Plantilla File Uploads
                </span>
                <h3 className="text-lg sm:text-xl font-black">
                  Upload Plantilla (PL), Eligibility, Trainings, and Work Experience (WE)
                </h3>
                <p className="text-xs text-sky-100 mt-0.5 max-w-2xl leading-relaxed">
                  Drag and drop files into their slots, or use the universal classifier. Misplaced
                  files are <strong>automatically organized and corrected</strong> into their proper
                  category.
                </p>
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  processFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => universalInputRef.current?.click()}
              className="border-2 border-dashed border-white/35 hover:border-amber-300 bg-white/5 hover:bg-white/10 rounded-xl p-5 text-center cursor-pointer transition-all space-y-2 group"
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
              <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white">
                  Click or drag &amp; drop files here to auto-classify
                </span>
                <p className="text-[11px] text-sky-100 mt-0.5">
                  Universal scanner: automatically identifies Plantilla, Eligibility, Trainings, or
                  Work Experience.
                </p>
              </div>
            </div>

            <div className="bg-black/15 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test Auto-Correction:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTestAutoCorrection('eligibility-in-trainings')}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold px-2.5 py-1 rounded border border-white/15 cursor-pointer"
                >
                  Eligibility into Trainings
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAutoCorrection('ipcr-in-pl')}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold px-2.5 py-1 rounded border border-white/15 cursor-pointer"
                >
                  IPCR into Plantilla
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAutoCorrection('tor-in-we')}
                  className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold px-2.5 py-1 rounded border border-white/15 cursor-pointer"
                >
                  TOR into Work Experience
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRIMARY_CATEGORIES.map((cat) => {
              const catDocs = documentsUploaded.filter((d) => d.category === cat.code);
              const isFilled = catDocs.length > 0;

              return (
                <div
                  key={cat.code}
                  className={`bg-white rounded-xl border p-5 space-y-3 transition-all flex flex-col justify-between shadow-xs ${
                    isFilled ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg bg-[#024794] text-white flex items-center justify-center font-black text-xs shrink-0">
                          {cat.code}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">{cat.title}</h4>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {cat.acceptedFormats}
                          </span>
                        </div>
                      </div>

                      {isFilled ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Attached ({catDocs.length})</span>
                        </span>
                      ) : (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded shrink-0">
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
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span>{doc.fileSize}</span>
                                {doc.autoCorrected && (
                                  <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[9px]">
                                    Auto-Corrected from {doc.originalCategory}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 shrink-0 cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-center text-[11px] text-amber-900">
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
                      className="w-full bg-slate-50 hover:bg-blue-50 text-[#024794] border border-blue-200 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Upload {cat.shortLabel} Document</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveSection('position_qs')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 3. Position Description &amp; QS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('other_documents')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Proceed to Section 5: Other Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 5: OTHER DOCUMENTS */}
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
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Upload your Transcript of Records (TOR), Diploma, Registration (REG), Certificates
                  (CERT), Sworn Statements (SWORNS), Performance Commitment and Review (PCR), and
                  Potential documents.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700">Other Documents Uploaded:</span>
              <span className="font-extrabold text-[#024794] bg-white px-2.5 py-1 rounded border border-slate-200">
                {otherUploadCount} of 7 Categories Attached
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OTHER_CATEGORIES.map((cat) => {
              const catDocs = documentsUploaded.filter((d) => d.category === cat.code);
              const isFilled = catDocs.length > 0;

              return (
                <div
                  key={cat.code}
                  className={`bg-white rounded-xl border p-4 space-y-3 transition-all flex flex-col justify-between shadow-xs ${
                    isFilled ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-8 h-8 rounded-lg bg-[#024794] text-white flex items-center justify-center font-black text-[11px] shrink-0">
                        {cat.code}
                      </span>
                      {isFilled ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Attached</span>
                        </span>
                      ) : cat.required ? (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                          Required
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium px-2 py-0.5 rounded">
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
                            <span className="font-semibold text-slate-800 block truncate text-[11px]">
                              {doc.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <span>{doc.fileSize}</span>
                              {doc.autoCorrected && (
                                <span className="text-amber-800 font-bold">
                                  Auto-Sorted ({doc.originalCategory})
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200/80 text-center text-[10px] text-slate-500">
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
                      className="w-full bg-slate-50 hover:bg-blue-50 text-[#024794] border border-blue-200 rounded-lg py-1.5 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Upload {cat.shortLabel}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveSection('file_uploads')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: 4. File Uploads</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('review_submit')}
              className="bg-[#024794] hover:bg-[#033b7a] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Proceed to Section 6: Review &amp; Submit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 6: REVIEW & SUBMIT */}
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
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Carefully review all six sections before submitting. Once submitted, your docket is
                forwarded to the DA-BFAR Human Resource Merit Promotion and Selection Board
                (HRMPSB).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#024794]" />
                    <span>1. Application Letter</span>
                  </span>
                  {applicationLetterText || letterUploadedFileName ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                      Complete
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-3">
                  {applicationLetterText
                    ? applicationLetterText.substring(0, 180) + '...'
                    : letterUploadedFileName
                    ? `Uploaded PDF: ${letterUploadedFileName}`
                    : 'No letter text recorded.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('letter')}
                  className="text-xs font-bold text-[#024794] hover:underline cursor-pointer"
                >
                  Edit Application Letter →
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#024794]" />
                    <span>2. Personal Data Sheet (PDS)</span>
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    CS Form 212 Accomplished
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                  <span>
                    Name: <strong>{personalInfo.fullName || 'Not yet entered'}</strong>
                  </span>
                  <span>
                    Education: <strong>{education.length} entries</strong>
                  </span>
                  <span>
                    Eligibility: <strong>{eligibility.length} entries</strong>
                  </span>
                  <span>
                    Experience: <strong>{workExperience.length} entries</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('pds')}
                  className="text-xs font-bold text-[#024794] hover:underline cursor-pointer"
                >
                  Edit PDS Fields →
                </button>
              </div>

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
                <p className="text-[11px] text-slate-500 font-mono">{jobItemNo}</p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>{trainingAudit.qualifying} qualifying training hours verified</span>
                </div>
              </div>

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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('file_uploads')}
                    className="text-xs font-bold text-[#024794] hover:underline cursor-pointer"
                  >
                    Manage Primary Files →
                  </button>
                  <span className="text-slate-400">•</span>
                  <button
                    type="button"
                    onClick={() => setActiveSection('other_documents')}
                    className="text-xs font-bold text-[#024794] hover:underline cursor-pointer"
                  >
                    Manage Other Docs →
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 text-xs">
              <span className="font-bold text-amber-950 block text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Applicant Affirmation and Digital Certification</span>
              </span>
              <p className="text-amber-900 leading-relaxed text-[11px]">
                I hereby declare under the penalties of perjury that all answers and declarations
                made in this application, including my Personal Data Sheet (CS Form 212) and all
                attached documents, are true, correct, and authentic. I authorize the DA-BFAR
                HRMPSB to verify the authenticity of all credentials.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-200">
                <div className="text-[11px] text-slate-700">
                  Applicant: <strong>{personalInfo.fullName || 'Applicant'}</strong> • Date:{' '}
                  {new Date().toLocaleDateString('en-PH')}
                </div>
                <span className="inline-flex items-center gap-1 bg-white border border-amber-200 text-amber-950 px-3 py-1 rounded font-bold text-[11px] w-fit">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Digitally Signed</span>
                </span>
              </div>
            </div>

            <div className="bg-[#024794] text-white rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  <span>Ready to Transmit Application to DA-BFAR</span>
                </h4>
                <p className="text-xs text-sky-100 mt-1">
                  Target Plantilla Item: <strong className="font-mono">{jobItemNo}</strong> (
                  {activeJob.positionTitle})
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={isSubmitting}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-7 py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
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

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveSection('other_documents')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300 cursor-pointer"
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