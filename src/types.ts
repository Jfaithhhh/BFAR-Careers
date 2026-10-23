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

export interface ApplicantDocument {
  name: string;
  type: string;
  status: 'Verified' | 'Pending' | 'Uploaded';
  fileSize?: string;
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
  education: Array<{
    level: string;
    degree: string;
    school: string;
    yearGraduated: string;
    honors?: string;
  }>;
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
    | 'QS Qualified - Exam Scheduled'
    | 'HRMPSB Interview Scheduled'
    | 'HRMPSB Recommended for Appointment'
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
  writtenExamScore?: number;
  interviewScore?: number;
}
