export interface PlantillaJob {
  id: string;
  itemNo: string;
  positionTitle: string;
  agency: string;
  division: string;
  region: string;
  placeOfAssignment: string;
  salaryGrade: number;
  monthlySalary: number;
  plantillaType: 'Permanent' | 'Contract of Service (COS)' | 'Project-Based';
  postingDate: string;
  closingDate: string;
  status: 'Open' | 'Closed' | 'Under HRMPSB Review';
  qualificationStandards: {
    education: string;
    experience: string;
    training: string;
    eligibility: string;
  };
  dutiesAndResponsibilities: string[];
  competencies: string[];
}

export type DocumentCategory =
  | 'PL'
  | 'ELIGIBILITY'
  | 'TRAININGS'
  | 'WE'
  | 'TOR'
  | 'DIPLOMA'
  | 'REG'
  | 'CERT'
  | 'SWORNS'
  | 'PCR'
  | 'POTENTIAL';

export interface ApplicantDocument {
  id?: string;
  name: string;
  type: string;
  status: 'Verified' | 'Pending' | 'Uploaded';
  fileSize?: string;
  category: DocumentCategory | string;
  sectionGroup?: 'file_uploads' | 'other_documents';
  autoCorrected?: boolean;
  originalCategory?: string;
  correctionReason?: string;
  uploadedAt?: string;
}

export interface FlaggedTrainingEntry {
  title: string;
  hours: number;
  reason: string; // e.g. "Resource Person / Lecturer role (non-qualifying learning)", "Facilitator / Moderator role", "Conference / Symposium attendance"
}

export interface AiScreeningResult {
  overallScore: number;
  qsCompliance: {
    educationMatch: boolean;
    educationScore: number;
    educationAnalysis: string;
    experienceMatch: boolean;
    experienceScore: number;
    experienceAnalysis: string;
    trainingMatch: boolean;
    trainingScore: number;
    trainingAnalysis: string;
    qualifyingTrainingHours: number;
    excludedTrainingHours: number;
    flaggedTrainingEntries?: FlaggedTrainingEntry[];
    eligibilityMatch: boolean;
    eligibilityScore: number;
    eligibilityAnalysis: string;
  };
  strengths: string[];
  gapsOrRisk: string[];
  summaryRecommendation: string;
  recommendedStatus:
    | 'Qualified - Highly Recommended'
    | 'Qualified - Meets Standards'
    | 'Conditionally Qualified'
    | 'Disqualified - Does Not Meet QS';
  tailoredInterviewQuestions: string[];
  generatedAt: string;
}

export interface EducationEntry {
  level: string; // College / Tertiary, Graduate Studies, Vocational
  degree: string;
  school: string;
  yearGraduated: string;
  unitsEarned?: string; // e.g. "Completed 36 units", "144 units / Graduated"
  honors?: string; // e.g. "Cum Laude", "Dean's Lister", "None"
  transcriptFile?: string; // file name or status
  diplomaFile?: string;
}

export interface ApplicationRecord {
  id: string;
  trackingCode: string;
  jobId: string;
  positionTitle: string;
  plantillaItemNo: string;
  region: string;
  submissionDate: string;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    birthDate: string;
    civilStatus: string;
    residentialAddress: string;
  };
  education: EducationEntry[];
  eligibility: Array<{
    type: string;
    licenseNo?: string;
    rating?: string;
    examDate?: string;
  }>;
  workExperience: Array<{
    position: string;
    agencyOrCompany: string;
    fromDate: string;
    toDate: string;
    isGovService: boolean;
    description: string;
  }>;
  training: Array<{
    title: string;
    hours: number;
    provider: string;
    year: string;
  }>;
  statementOfIntent: string;
  documentsUploaded: ApplicantDocument[];
  aiScreening: AiScreeningResult;
  status:
    | 'Submitted'
    | 'Document Under Review'
    | 'CSC QS Qualified - Under Review'
    | 'HRMPSB Deliberation & Interview Scheduled'
    | 'HRMPSB Recommended for Appointment'
    | 'Application Result Released'
    | 'Regret / Not Qualified';
  statusTimeline: Array<{
    step: string;
    date: string;
    notes: string;
    by: string;
    isCompleted: boolean;
    isCurrent: boolean;
  }>;
  adminRemarks: string;
  interviewScore?: number;
  finalBoardDecision?: 'Approved for Appointment' | 'Shortlisted / Lineup' | 'Deferred' | 'Not Selected';
}
