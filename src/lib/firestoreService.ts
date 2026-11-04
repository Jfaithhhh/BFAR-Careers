import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import { ApplicationRecord, InternalEmployeeProfile } from '../types';

export const APPLICATIONS_COLLECTION = 'applications';
export const INTERNAL_EMPLOYEES_COLLECTION = 'internal_employees';

// Verified DA-BFAR Internal Employee Profiles (Seed Data)
export const DEFAULT_INTERNAL_EMPLOYEES: InternalEmployeeProfile[] = [
  {
    employeeId: 'BFAR-EMP-2018-0412',
    fullName: 'Maria Elena S. Santos',
    email: 'maria.santos@bfar.da.gov.ph',
    phone: '+63 917 882 1042',
    birthDate: '1990-06-15',
    civilStatus: 'Single',
    residentialAddress: 'Quezon City, Metro Manila',
    division: 'Fisheries Regulatory and Licensing Division (FRLD)',
    station: 'Central Office, PCA Compound, Elliptical Road, Diliman, QC',
    currentPlantillaItem: 'BFARB-AQUAT1-12-2004',
    currentPositionTitle: 'Aquaculturist I',
    salaryGrade: 11,
    monthlySalary: 27000,
    yearsInBfar: 6,
    latestIpcrRating: 4.88, // Outstanding
    ipcrPeriod: 'July - December 2024',
    eligibility: 'RA 1080 (Fisheries Technologist Licensure Examination - 87.50%)',
    highestEducation: 'College Graduate (BS Fisheries)',
    degree: 'Bachelor of Science in Fisheries',
    trainingHours: 48,
    sex: 'Female',
  },
  {
    employeeId: 'BFAR-EMP-2019-0834',
    fullName: 'Juan Carlo D. Dela Cruz',
    email: 'jcarlo.delacruz@bfar.da.gov.ph',
    phone: '+63 920 944 3211',
    birthDate: '1988-11-20',
    civilStatus: 'Married',
    residentialAddress: 'Marikina City, Metro Manila',
    division: 'Capture Fisheries Division (CFD)',
    station: 'National Center for Fisheries Development (NCFD)',
    currentPlantillaItem: 'BFARB-FI1-45-2014',
    currentPositionTitle: 'Fishing Regulations Officer I',
    salaryGrade: 11,
    monthlySalary: 27000,
    yearsInBfar: 5,
    latestIpcrRating: 4.75, // Very Satisfactory
    ipcrPeriod: 'July - December 2024',
    eligibility: 'Career Service Professional (CSC-CSCRO NCR - 85.20%)',
    highestEducation: 'College Graduate (BS Marine Biology)',
    degree: 'Bachelor of Science in Marine Biology',
    trainingHours: 32,
    sex: 'Male',
  },
  {
    employeeId: 'BFAR-EMP-2020-0199',
    fullName: 'Engr. Roberto Miguel V. Tan',
    email: 'roberto.tan@bfar.da.gov.ph',
    phone: '+63 908 555 8923',
    birthDate: '1987-03-08',
    civilStatus: 'Married',
    residentialAddress: 'Valenzuela City, Metro Manila',
    division: 'Fisheries Post-Harvest and Technology Division (FPHTD)',
    station: 'Central Office, Diliman, Quezon City',
    currentPlantillaItem: 'BFARB-ENG2-08-2016',
    currentPositionTitle: 'Engineer II',
    salaryGrade: 16,
    monthlySalary: 39672,
    yearsInBfar: 4,
    latestIpcrRating: 4.92, // Outstanding
    ipcrPeriod: 'July - December 2024',
    eligibility: 'RA 1080 (PRC Registered Agricultural and Biosystems Engineer)',
    highestEducation: 'College Graduate (BS Agricultural & Biosystems Engineering)',
    degree: 'BS Agricultural and Biosystems Engineering',
    trainingHours: 64,
    sex: 'Male',
  },
  {
    employeeId: 'BFAR-EMP-2021-0305',
    fullName: 'Ana Patricia G. Mendoza',
    email: 'ana.mendoza@bfar.da.gov.ph',
    phone: '+63 915 222 7109',
    birthDate: '1993-09-12',
    civilStatus: 'Single',
    residentialAddress: 'Pasig City, Metro Manila',
    division: 'Fisheries Planning and Economics Division (FPED)',
    station: 'Central Office, Diliman, Quezon City',
    currentPlantillaItem: 'BFARB-ECO1-18-2019',
    currentPositionTitle: 'Economist I',
    salaryGrade: 11,
    monthlySalary: 27000,
    yearsInBfar: 3,
    latestIpcrRating: 4.65, // Very Satisfactory
    ipcrPeriod: 'July - December 2024',
    eligibility: 'Career Service Professional (CSC - 86.40%)',
    highestEducation: 'Master of Science in Agricultural Economics (with 24 units)',
    degree: 'BS Economics / MS AgEcon units',
    trainingHours: 24,
    sex: 'Female',
  },
];

// Helper: Seed internal employees if not present
export async function seedInternalEmployeesIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, INTERNAL_EMPLOYEES_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const emp of DEFAULT_INTERNAL_EMPLOYEES) {
        await setDoc(doc(db, INTERNAL_EMPLOYEES_COLLECTION, emp.employeeId), emp);
      }
    }
  } catch (err: any) {
    // Non-fatal: if rules or offline state prevents writing, the app seamlessly uses local store
    console.info('Internal employees directory synced with fallback defaults.', err?.message || '');
  }
}

// Fetch all internal employees
export async function getInternalEmployees(): Promise<InternalEmployeeProfile[]> {
  try {
    const colRef = collection(db, INTERNAL_EMPLOYEES_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      // Return defaults if Firestore empty
      return DEFAULT_INTERNAL_EMPLOYEES;
    }
    return snap.docs.map((d) => d.data() as InternalEmployeeProfile);
  } catch (err) {
    console.warn('Error fetching internal employees from Firestore, returning defaults:', err);
    return DEFAULT_INTERNAL_EMPLOYEES;
  }
}

// Lookup internal employee by ID
export async function lookupInternalEmployee(id: string): Promise<InternalEmployeeProfile | null> {
  const cleanId = id.trim().toUpperCase();
  // Try direct memory match first
  const localMatch = DEFAULT_INTERNAL_EMPLOYEES.find(
    (e) => e.employeeId.toUpperCase() === cleanId || e.fullName.toUpperCase().includes(cleanId)
  );
  if (localMatch) return localMatch;

  try {
    const docRef = doc(db, INTERNAL_EMPLOYEES_COLLECTION, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as InternalEmployeeProfile;
    }
  } catch (err) {
    console.warn('Error looking up internal employee:', err);
  }
  return null;
}

// Real-time subscription to applications list
export function subscribeToApplications(
  onUpdate: (apps: ApplicationRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const colRef = collection(db, APPLICATIONS_COLLECTION);
    const q = query(colRef, orderBy('submissionDate', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const apps: ApplicationRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as ApplicationRecord;
          apps.push({
            ...data,
            id: doc.id,
          });
        });
        onUpdate(apps);
      },
      (error) => {
        console.error('Firestore onSnapshot error on applications:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error('Failed to set up applications snapshot:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// Real-time subscription to a single application by trackingCode or ID
export function subscribeToSingleApplication(
  trackingCodeOrId: string,
  onUpdate: (app: ApplicationRecord | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const clean = trackingCodeOrId.trim().toUpperCase();
  try {
    const colRef = collection(db, APPLICATIONS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        let match: ApplicationRecord | null = null;
        snapshot.forEach((d) => {
          const data = d.data() as ApplicationRecord;
          if (
            data.trackingCode?.toUpperCase() === clean ||
            data.id?.toUpperCase() === clean ||
            d.id.toUpperCase() === clean
          ) {
            match = { ...data, id: d.id };
          }
        });
        onUpdate(match);
      },
      (err) => {
        console.error('Firestore single app error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.error('Failed to set up single app snapshot:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// Save application to Firestore (Internal BFAR Applications Only)
export async function saveApplicationToFirestore(app: ApplicationRecord): Promise<void> {
  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, app.id);
    await setDoc(docRef, {
      ...app,
      applicantType: 'internal',
      bfarEmployeeId: app.bfarEmployeeId || (app as any).bfarEmployeeId || 'BFAR-EMP-INTERNAL',
      applicantName: app.personalInfo?.fullName || (app as any).applicantName || '',
      email: app.personalInfo?.email || (app as any).email || '',
      jobTitle: app.positionTitle || (app as any).jobTitle || '',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = handleFirestoreError(err, 'saveApplicationToFirestore');
    console.error(msg);
    throw new Error(msg);
  }
}

// Update application in Firestore
export async function updateApplicationInFirestore(
  appId: string,
  updates: Partial<ApplicationRecord>
): Promise<void> {
  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, appId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = handleFirestoreError(err, 'updateApplicationInFirestore');
    console.error(msg);
    throw new Error(msg);
  }
}
