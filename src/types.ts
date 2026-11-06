export interface PlantillaJob {
  id: string;
  itemNo: string;
  positionTitle: string;
  agency: string;
  division: string;
  region: string;
  placeOfAssignment: string;
  salaryGrade: number;
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

// -------------------------------------------------------------
// CS FORM 212 (PERSONAL DATA SHEET REVISED 2017) TYPES
// -------------------------------------------------------------

export interface EducationEntry {
  level: string; // Elementary, Secondary, Vocational / Trade Course, College, Graduate Studies
  degree: string; // Basic Education / Degree / Course (write in full)
  school: string; // Name of School (write in full)
  periodFrom?: string; // Attendance From
  periodTo?: string; // Attendance To
  yearGraduated: string;
  unitsEarned?: string; // Highest Level / Units Earned (if not graduated)
  honors?: string; // Scholarship / Academic Honors Received
  transcriptFile?: string;
  diplomaFile?: string;
}

export interface EligibilityEntry {
  type: string; // Career Service / RA 1080 (Board / Bar) / Under Special Laws / CES / CSEE / Barangay / Driver's License
  licenseNo?: string;
  rating?: string;
  examDate?: string;
  examPlace?: string;
  validityDate?: string;
}

export interface WorkExperienceEntry {
  position: string;
  agencyOrCompany: string;
  salaryGrade?: string; // Salary / Job / Pay Grade & Step (Format "00-0")
  statusOfAppointment?: string; // Permanent / Temporary / Contractual / Casual / COS / Job Order
  fromDate: string;
  toDate: string;
  isGovService: boolean;
  description: string;
}

export interface ChildEntry {
  fullName: string;
  birthDate: string;
}

export interface FamilyBackground {
  spouseSurname: string;
  spouseFirstName: string;
  spouseMiddleName: string;
  spouseNameExtension: string;
  spouseOccupation: string;
  spouseEmployer: string;
  spouseBusinessAddress: string;
  spouseTelephone: string;
  fatherSurname: string;
  fatherFirstName: string;
  fatherMiddleName: string;
  fatherNameExtension: string;
  motherMaidenSurname: string;
  motherFirstName: string;
  motherMiddleName: string;
  children: ChildEntry[];
}

export interface VoluntaryWorkEntry {
  organizationName: string; // Name & Address of Organization
  organizationAddress?: string;
  fromDate: string;
  toDate: string;
  hours: number;
  positionOrNature: string;
}

export interface TrainingEntry {
  title: string;
  fromDate?: string;
  toDate?: string;
  hours: number;
  typeOfLd?: 'Managerial' | 'Supervisory' | 'Technical' | 'Foundation' | string;
  provider: string;
  year?: string;
}

export interface OtherInformation {
  specialSkills: string[];
  nonAcademicDistinctions: string[];
  memberships: string[];
}

export interface CharacterReference {
  name: string;
  address: string;
  telNo: string;
}

export interface ApplicantDeclaration {
  q34_relatedConsanguinity: boolean;
  q34_details: string;
  q35_adminOffense: boolean;
  q35_adminDetails: string;
  q35_criminalCharged: boolean;
  q35_criminalDetails: string;
  q36_convictedCrime: boolean;
  q36_details: string;
  q37_separatedFromService: boolean;
  q37_details: string;
  q38_candidateElection: boolean;
  q38_candidateDetails: string;
  q38_resignedBeforeElection: boolean;
  q38_resignedDetails: string;
  q39_immigrantStatus: boolean;
  q39_details: string;
  q40_indigenousGroup: boolean;
  q40_indigenousDetails: string;
  q40_pwd: boolean;
  q40_pwdDetails: string;
  q40_soloParent: boolean;
  q40_soloParentDetails: string;
  references: CharacterReference[];
  govIssuedId: {
    idType: string;
    idNumber: string;
    datePlaceIssuance: string;
  };
  confirmedAuthenticity: boolean;
  digitalSignatureConfirmation: string;
  dateSigned: string;
}

export interface PdsData {
  personalInfo: {
    surname: string;
    firstName: string;
    middleName: string;
    nameExtension: string;
    fullName: string;
    email: string;
    phone: string;
    birthDate: string;
    birthPlace: string;
    sex: 'Male' | 'Female' | '';
    civilStatus: 'Single' | 'Married' | 'Widowed' | 'Separated' | 'Other';
    citizenship: 'Filipino' | 'Dual Citizenship' | '';
    citizenshipType?: 'by birth' | 'by naturalization' | '';
    citizenshipCountry?: string;
    heightMeters: string;
    weightKg: string;
    bloodType: string;
    gsisNo: string;
    pagibigNo: string;
    philhealthNo: string;
    sssNo: string;
    tinNo: string;
    agencyEmployeeNo: string;
    residentialAddress: string;
    residentialZip: string;
    permanentAddress: string;
    permanentZip: string;
    telephoneNumber: string;
  };
  familyBackground: FamilyBackground;
  education: EducationEntry[];
  eligibility: EligibilityEntry[];
  workExperience: WorkExperienceEntry[];
  voluntaryWork: VoluntaryWorkEntry[];
  training: TrainingEntry[];
  otherInformation: OtherInformation;
  declaration: ApplicantDeclaration;
}

export interface ApplicationRecord {
  id: string;
  trackingCode: string;
  jobId: string;
  positionTitle: string;
  plantillaItemNo: string;
  region: string;
  submissionDate: string;
  applicationLetterText?: string;
  applicationLetterUploadedFile?: string;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    birthDate: string;
    civilStatus: string;
    residentialAddress: string;
  };
  pdsData?: PdsData;
  education: EducationEntry[];
  eligibility: EligibilityEntry[];
  workExperience: WorkExperienceEntry[];
  training: TrainingEntry[];
  voluntaryWork?: VoluntaryWorkEntry[];
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
  finalBoardDecision?:
    | 'Approved for Appointment'
    | 'Shortlisted / Lineup'
    | 'Deferred'
    | 'Not Selected';
  // Internal Employee Specific Fields (Restricted to Internal DA-BFAR Personnel Only)
  applicantType?: 'internal';
  bfarEmployeeId?: string;
  currentDivision?: string;
  currentPlantillaItem?: string;
  currentSalaryGrade?: number;
  yearsInBfar?: number;
  latestIpcrRating?: number;
  ipcrPeriod?: string;
  promotionTrack?: 'Promotion' | 'Lateral Transfer' | 'Reassignment';
}

export interface InternalEmployeeProfile {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate?: string;
  civilStatus?: string;
  residentialAddress?: string;
  division: string;
  station: string;
  currentPlantillaItem: string;
  currentPositionTitle: string;
  salaryGrade: number;
  yearsInBfar: number;
  latestIpcrRating: number;
  ipcrPeriod: string;
  eligibility: string;
  highestEducation: string;
  degree: string;
  trainingHours: number;
  sex?: 'Male' | 'Female' | '';
}

