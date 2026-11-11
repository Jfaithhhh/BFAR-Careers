import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import { ApplicationRecord, InternalEmployeeProfile, PlantillaJob } from '../types';

export const APPLICATIONS_COLLECTION = 'applications';
export const INTERNAL_EMPLOYEES_COLLECTION = 'internal_employees';
export const JOB_VACANCIES_COLLECTION = 'job_vacancies';

// Fetch all internal employees directly from Firestore (No mock or demo fallbacks)
export async function getInternalEmployees(): Promise<InternalEmployeeProfile[]> {
  try {
    const colRef = collection(db, INTERNAL_EMPLOYEES_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      return [];
    }
    return snap.docs.map((d) => d.data() as InternalEmployeeProfile);
  } catch (err) {
    console.warn('Error fetching internal employees from Firestore:', err);
    return [];
  }
}

// Lookup internal employee by ID strictly against Firestore (Returns null if not found, never falls back to mock)
export async function lookupInternalEmployee(id: string): Promise<InternalEmployeeProfile | null> {
  const cleanId = id.trim().toUpperCase();
  if (!cleanId) return null;

  try {
    // 1. Try direct doc ID match in Firestore
    const docRef = doc(db, INTERNAL_EMPLOYEES_COLLECTION, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as InternalEmployeeProfile;
    }

    // 2. Query by employeeId field across registered documents
    const colRef = collection(db, INTERNAL_EMPLOYEES_COLLECTION);
    const allSnap = await getDocs(colRef);
    for (const d of allSnap.docs) {
      const data = d.data() as InternalEmployeeProfile;
      if (
        data.employeeId?.toUpperCase() === cleanId ||
        d.id.toUpperCase() === cleanId ||
        (cleanId.length >= 4 && data.fullName?.toUpperCase().includes(cleanId))
      ) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Error looking up internal employee from Firestore:', err);
  }
  return null;
}

// Register or update verified internal employee profile in Firestore
export async function saveInternalEmployeeToFirestore(emp: InternalEmployeeProfile): Promise<void> {
  try {
    const docId = emp.employeeId.trim().toUpperCase();
    const docRef = doc(db, INTERNAL_EMPLOYEES_COLLECTION, docId);
    await setDoc(docRef, emp, { merge: true });
  } catch (err) {
    const msg = handleFirestoreError(err, 'saveInternalEmployeeToFirestore', `${INTERNAL_EMPLOYEES_COLLECTION}/${emp.employeeId}`);
    throw new Error(msg);
  }
}

// Real-time subscription to applications list
export function subscribeToApplications(
  onUpdate: (apps: ApplicationRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const colRef = collection(db, APPLICATIONS_COLLECTION);

    return onSnapshot(
      colRef,
      (snapshot) => {
        const apps: ApplicationRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as ApplicationRecord;
          apps.push({
            ...data,
            id: doc.id,
          });
        });
        // Sort descending in memory by submission timestamp
        apps.sort((a, b) => {
          const timeA = new Date((a as any).createdAt || a.submissionDate || 0).getTime();
          const timeB = new Date((b as any).createdAt || b.submissionDate || 0).getTime();
          return timeB - timeA;
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
  if (!app.bfarEmployeeId) {
    throw new Error('Access Denied: A verified DA-BFAR Employee ID is required to submit an internal application.');
  }
  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, app.id);
    const sg = app.currentSalaryGrade ? `SG ${app.currentSalaryGrade}` : 'SG 11';
    const payload: Record<string, any> = {
      ...app,
      applicantType: 'internal',
      bfarEmployeeId: app.bfarEmployeeId,
      applicantName: app.personalInfo?.fullName || (app as any).applicantName || '',
      email: app.personalInfo?.email || (app as any).email || '',
      jobTitle: app.positionTitle || (app as any).jobTitle || '',
      salaryGrade: (app as any).salaryGrade || sg,
      status: app.status || 'Submitted',
      createdAt: (app as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Absolute Salary Confidentiality Protection: never transmit or persist monthly numerical rate
    delete payload.monthlySalary;
    await setDoc(docRef, payload);
  } catch (err) {
    const msg = handleFirestoreError(err, 'saveApplicationToFirestore', `${APPLICATIONS_COLLECTION}/${app.id}`);
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

// ==========================================
// OFFICIAL JOB VACANCIES (BFAR CAREERS PORTAL)
// ==========================================

// Subscribe in real-time to official job vacancies
export function subscribeToJobVacancies(
  onUpdate: (vacancies: PlantillaJob[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const colRef = collection(db, JOB_VACANCIES_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const vacancies: PlantillaJob[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as PlantillaJob;
          vacancies.push({
            ...data,
            id: d.id,
            plantillaItemNumber: data.plantillaItemNumber || data.itemNo,
            itemNo: data.itemNo || data.plantillaItemNumber || '',
            datePosted: data.datePosted || data.postingDate || '',
            applicationDeadline: data.applicationDeadline || data.closingDate || '',
            officialSourceUrl: data.officialSourceUrl || 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
          });
        });

        // Track and inspect real-time Firestore vacancies payload
        console.log("🔥 Firestore Job Vacancies Snapshot:", vacancies);

        // Sort active first, then by deadline
        vacancies.sort((a, b) => {
          if (a.status === 'Open' && b.status !== 'Open') return -1;
          if (a.status !== 'Open' && b.status === 'Open') return 1;
          return a.salaryGrade - b.salaryGrade;
        });
        onUpdate(vacancies);
      },
      (error) => {
        console.warn('Firestore onSnapshot error on job_vacancies:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error('Failed to set up job_vacancies snapshot:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// Fetch all official job vacancies from Firestore
export async function getJobVacanciesFromFirestore(): Promise<PlantillaJob[]> {
  try {
    const colRef = collection(db, JOB_VACANCIES_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      return [];
    }
    return snap.docs.map((d) => {
      const data = d.data() as PlantillaJob;
      return {
        ...data,
        id: d.id,
        plantillaItemNumber: data.plantillaItemNumber || data.itemNo,
        itemNo: data.itemNo || data.plantillaItemNumber || '',
        datePosted: data.datePosted || data.postingDate || '',
        applicationDeadline: data.applicationDeadline || data.closingDate || '',
        officialSourceUrl: data.officialSourceUrl || 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
      };
    });
  } catch (err) {
    console.warn('Error fetching job_vacancies from Firestore:', err);
    return [];
  }
}

// Save or update a single official job vacancy in Firestore
export async function saveJobVacancyToFirestore(job: PlantillaJob): Promise<void> {
  try {
    const docId = job.id || `vacancy-${Date.now()}`;
    const docRef = doc(db, JOB_VACANCIES_COLLECTION, docId);
    const payload: Record<string, any> = {
      ...job,
      id: docId,
      plantillaItemNumber: job.plantillaItemNumber || job.itemNo,
      itemNo: job.itemNo || job.plantillaItemNumber || '',
      datePosted: job.datePosted || job.postingDate || '',
      applicationDeadline: job.applicationDeadline || job.closingDate || '',
      officialSourceUrl: job.officialSourceUrl || 'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/',
      sourceLastChecked: job.sourceLastChecked || new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      verifiedByHr: true,
    };
    // Absolute Salary Protection
    delete payload.monthlySalary;
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    const msg = handleFirestoreError(err, 'saveJobVacancyToFirestore', `${JOB_VACANCIES_COLLECTION}/${job.id}`);
    console.error(msg);
    throw new Error(msg);
  }
}

// Delete an official job vacancy from Firestore
export async function deleteJobVacancyFromFirestore(jobId: string): Promise<void> {
  try {
    const docRef = doc(db, JOB_VACANCIES_COLLECTION, jobId);
    await deleteDoc(docRef);
  } catch (err) {
    const msg = handleFirestoreError(err, 'deleteJobVacancyFromFirestore', `${JOB_VACANCIES_COLLECTION}/${jobId}`);
    console.error(msg);
    throw new Error(msg);
  }
}

// Bulk sync vacancies to Firestore
export async function syncVacanciesToFirestore(vacancies: PlantillaJob[]): Promise<void> {
  try {
    for (const v of vacancies) {
      await saveJobVacancyToFirestore(v);
    }
  } catch (err) {
    console.warn('Failed bulk sync to Firestore job_vacancies:', err);
  }
}