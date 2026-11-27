import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import { ApplicationRecord, InternalEmployeeProfile, PlantillaJob } from '../types';

export const APPLICATIONS_COLLECTION = 'applications';
export const JOB_VACANCIES_COLLECTION = 'job_vacancies';
const OFFICIAL_BFAR_CAREERS_URL =
  'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/';

export type BfarEmploymentStatus =
  | 'COS'
  | 'JO'
  | 'Casual'
  | 'Pakyaw'
  | 'Consultant'
  | 'Permanent';

export interface VerifiedBfarIdResult {
  isValid: boolean;
  normalizedId: string;
  employmentStatus: BfarEmploymentStatus;
  label: string;
}

function stripUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

// Instant client-side DA-BFAR Employee ID verification & status detection
export function verifyBfarEmployeeId(rawId: string): VerifiedBfarIdResult | null {
  const clean = rawId.trim().toUpperCase();
  if (!clean || clean.length < 3) return null;

  if (/^COS-?\d{2,}$/.test(clean)) {
    return {
      isValid: true,
      normalizedId: clean,
      employmentStatus: 'COS',
      label: `${clean} • COS`,
    };
  }

  if (/^JO-?\d{2,}$/.test(clean)) {
    return {
      isValid: true,
      normalizedId: clean,
      employmentStatus: 'JO',
      label: `${clean} • Job Order`,
    };
  }

  if (/^(CASUAL|CAS)-?\d{2,}$/.test(clean)) {
    return {
      isValid: true,
      normalizedId: clean,
      employmentStatus: 'Casual',
      label: `${clean} • Casual`,
    };
  }

  if (/^(PAKYAW|PKY)-?\d{2,}$/.test(clean)) {
    return {
      isValid: true,
      normalizedId: clean,
      employmentStatus: 'Pakyaw',
      label: `${clean} • Pakyaw`,
    };
  }

  if (/^C-[A-Z0-9-]+$/.test(clean)) {
    return {
      isValid: true,
      normalizedId: clean,
      employmentStatus: 'Consultant',
      label: `${clean} • Consultant`,
    };
  }

  // Permanent: considered as walang status prefix nakalagay
  if (/^[A-Z0-9-]{3,20}$/.test(clean)) {
    return {
      isValid: true,
      normalizedId: clean,
      employmentStatus: 'Permanent',
      label: `${clean} • Permanent`,
    };
  }

  return null;
}

// Lightweight verification helper without Firestore directory reads or writes
export async function lookupInternalEmployee(
  id: string
): Promise<
  | (InternalEmployeeProfile & {
      employmentStatus?: BfarEmploymentStatus;
      badgeLabel?: string;
    })
  | null
> {
  const verified = verifyBfarEmployeeId(id);
  if (!verified) return null;

  return {
    employeeId: verified.normalizedId,
    fullName: '',
    email: '',
    division: '',
    employmentStatus: verified.employmentStatus,
    badgeLabel: verified.label,
  } as InternalEmployeeProfile & {
    employmentStatus: BfarEmploymentStatus;
    badgeLabel: string;
  };
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
        const apps: ApplicationRecord[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as ApplicationRecord),
          id: docSnap.id,
        }));

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
  const trimmed = trackingCodeOrId.trim();
  if (!trimmed) {
    onUpdate(null);
    return () => {};
  }

  const upper = trimmed.toUpperCase();
  const colRef = collection(db, APPLICATIONS_COLLECTION);

  // Query by trackingCode first so we do not download the entire collection
  const qByTracking = query(colRef, where('trackingCode', '==', upper), limit(1));

  try {
    let fallbackUnsub: Unsubscribe | null = null;

    const primaryUnsub = onSnapshot(
      qByTracking,
      (snapshot) => {
        if (!snapshot.empty) {
          const d = snapshot.docs[0];
          onUpdate({ ...(d.data() as ApplicationRecord), id: d.id });
          return;
        }

        // Fallback lookup by document ID if trackingCode query had no match
        if (!fallbackUnsub) {
          const qById = query(colRef, where('id', '==', trimmed), limit(1));
          fallbackUnsub = onSnapshot(
            qById,
            (idSnap) => {
              if (!idSnap.empty) {
                const d = idSnap.docs[0];
                onUpdate({ ...(d.data() as ApplicationRecord), id: d.id });
              } else {
                onUpdate(null);
              }
            },
            (err) => {
              console.error('Firestore single app fallback error:', err);
              if (onError) onError(err);
            }
          );
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.error('Firestore single app error:', err);
        if (onError) onError(err);
      }
    );

    return () => {
      primaryUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (err: any) {
    console.error('Failed to set up single app snapshot:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// Save application to Firestore (Internal BFAR Applications Only)
export async function saveApplicationToFirestore(app: ApplicationRecord): Promise<void> {
  const verifiedId = verifyBfarEmployeeId(app.bfarEmployeeId || '');
  if (!verifiedId) {
    throw new Error(
      'Access Denied: A valid DA-BFAR Employee ID is required to submit an internal application.'
    );
  }

  try {
    const docId = app.id || `app-${Date.now()}`;
    const docRef = doc(db, APPLICATIONS_COLLECTION, docId);
    const nowIso = new Date().toISOString();
    const sg = app.currentSalaryGrade ? `SG ${app.currentSalaryGrade}` : 'SG 11';

    const payload: Record<string, any> = stripUndefined({
      ...app,
      id: docId,
      applicantType: 'internal',
      bfarEmployeeId: verifiedId.normalizedId,
      employmentStatus: (app as any).employmentStatus || verifiedId.employmentStatus,
      applicantName: app.personalInfo?.fullName || (app as any).applicantName || '',
      email: app.personalInfo?.email || (app as any).email || '',
      jobTitle: app.positionTitle || (app as any).jobTitle || '',
      salaryGrade: (app as any).salaryGrade || sg,
      status: app.status || 'Submitted',
      createdAt: (app as any).createdAt || nowIso,
      updatedAt: nowIso,
    });

    // Absolute Salary Confidentiality Protection: never transmit or persist monthly numerical rate
    delete payload.monthlySalary;

    await setDoc(docRef, payload);
  } catch (err) {
    const msg = handleFirestoreError(
      err,
      'saveApplicationToFirestore',
      `${APPLICATIONS_COLLECTION}/${app.id}`
    );
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
    const safeUpdates = stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    delete safeUpdates.monthlySalary;
    await updateDoc(docRef, safeUpdates);
  } catch (err) {
    const msg = handleFirestoreError(err, 'updateApplicationInFirestore');
    console.error(msg);
    throw new Error(msg);
  }
}

// ==========================================
// OFFICIAL JOB VACANCIES (BFAR CAREERS PORTAL)
// ==========================================

function normalizeVacancyDoc(id: string, data: PlantillaJob): PlantillaJob {
  return {
    ...data,
    id,
    plantillaItemNumber: data.plantillaItemNumber || data.itemNo || '',
    itemNo: data.itemNo || data.plantillaItemNumber || '',
    datePosted: data.datePosted || data.postingDate || '',
    applicationDeadline: data.applicationDeadline || data.closingDate || '',
    officialSourceUrl: data.officialSourceUrl || OFFICIAL_BFAR_CAREERS_URL,
  };
}

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
        const vacancies: PlantillaJob[] = snapshot.docs.map((d) =>
          normalizeVacancyDoc(d.id, d.data() as PlantillaJob)
        );

        vacancies.sort((a, b) => {
          if (a.status === 'Open' && b.status !== 'Open') return -1;
          if (a.status !== 'Open' && b.status === 'Open') return 1;
          return (Number(a.salaryGrade) || 0) - (Number(b.salaryGrade) || 0);
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
    return snap.docs.map((d) => normalizeVacancyDoc(d.id, d.data() as PlantillaJob));
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
    const nowIso = new Date().toISOString();

    const payload: Record<string, any> = stripUndefined({
      ...job,
      id: docId,
      plantillaItemNumber: job.plantillaItemNumber || job.itemNo || '',
      itemNo: job.itemNo || job.plantillaItemNumber || '',
      datePosted: job.datePosted || job.postingDate || '',
      applicationDeadline: job.applicationDeadline || job.closingDate || '',
      officialSourceUrl: job.officialSourceUrl || OFFICIAL_BFAR_CAREERS_URL,
      sourceLastChecked: job.sourceLastChecked || nowIso,
      lastSyncedAt: nowIso,
      verifiedByHr: true,
    });

    // Absolute Salary Confidentiality Protection
    delete payload.monthlySalary;

    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    const msg = handleFirestoreError(
      err,
      'saveJobVacancyToFirestore',
      `${JOB_VACANCIES_COLLECTION}/${job.id}`
    );
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
    const msg = handleFirestoreError(
      err,
      'deleteJobVacancyFromFirestore',
      `${JOB_VACANCIES_COLLECTION}/${jobId}`
    );
    console.error(msg);
    throw new Error(msg);
  }
}

// Bulk sync vacancies to Firestore using batched writes
export async function syncVacanciesToFirestore(vacancies: PlantillaJob[]): Promise<void> {
  if (!vacancies.length) return;

  try {
    const nowIso = new Date().toISOString();
    const chunkSize = 400;

    for (let i = 0; i < vacancies.length; i += chunkSize) {
      const batch = writeBatch(db);
      const slice = vacancies.slice(i, i + chunkSize);

      for (const job of slice) {
        const docId = job.id || `vacancy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const docRef = doc(db, JOB_VACANCIES_COLLECTION, docId);
        const payload: Record<string, any> = stripUndefined({
          ...job,
          id: docId,
          plantillaItemNumber: job.plantillaItemNumber || job.itemNo || '',
          itemNo: job.itemNo || job.plantillaItemNumber || '',
          datePosted: job.datePosted || job.postingDate || '',
          applicationDeadline: job.applicationDeadline || job.closingDate || '',
          officialSourceUrl: job.officialSourceUrl || OFFICIAL_BFAR_CAREERS_URL,
          sourceLastChecked: job.sourceLastChecked || nowIso,
          lastSyncedAt: nowIso,
          verifiedByHr: true,
        });
        delete payload.monthlySalary;
        batch.set(docRef, payload, { merge: true });
      }

      await batch.commit();
    }
  } catch (err) {
    console.warn('Failed bulk sync to Firestore job_vacancies:', err);
  }
}