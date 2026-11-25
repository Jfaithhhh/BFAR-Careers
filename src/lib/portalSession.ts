import { ApplicationRecord, PlantillaJob, PortalRole, PortalUserProfile } from '../types';

export type ActivePortalPov = PortalRole | 'hr_admin';

export const BFAR_EMAIL_DOMAIN = '@bfar.da.gov.ph';

export function isOfficialBfarEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(BFAR_EMAIL_DOMAIN);
}

/**
 * Determines whether a Plantilla vacancy is visible to the active POV.
 * - hr_admin (when verified inside HR & HRMPSB Portal): sees all vacancies.
 * - bfar_employee: sees internal promotion / internal openings and general vacancies.
 * - external_applicant: sees ONLY external/public vacancies; internal-only promotions are hidden.
 */
export function isVacancyVisibleForRole(
  job: PlantillaJob,
  role: ActivePortalPov | null,
  isHrPortalVerified: boolean
): boolean {
  if (role === 'hr_admin' && isHrPortalVerified) {
    return true;
  }

  const titleLower = (job.positionTitle || '').toLowerCase();
  const divisionLower = (job.division || '').toLowerCase();
  const isInternalPromotion =
    titleLower.includes('internal') ||
    titleLower.includes('promotion') ||
    divisionLower.includes('internal promotion');

  if (role === 'bfar_employee') {
    return true;
  }

  if (role === 'external_applicant') {
    return !isInternalPromotion;
  }

  // Front page preview before signing in: show public/external openings only
  return !isInternalPromotion;
}

/**
 * Strictly scopes application visibility by role.
 * Non-admin users only see their own submitted records.
 */
export function canViewApplicationRecord(
  app: ApplicationRecord,
  role: ActivePortalPov | null,
  currentEmail?: string | null,
  isHrPortalVerified = false
): boolean {
  if (role === 'hr_admin' && isHrPortalVerified) {
    return true;
  }

  const normalizedEmail = (currentEmail || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  const recordEmail = (app.personalInfo?.email || '').trim().toLowerCase();
  const isOwner = Boolean(recordEmail) && recordEmail === normalizedEmail;
  if (!isOwner) {
    return false;
  }

  if (role === 'external_applicant') {
    return app.applicantType !== 'internal';
  }

  return true;
}

export function createInitialSessionProfile(
  partial: Partial<PortalUserProfile> & { uid: string; role: PortalRole; email: string }
): PortalUserProfile {
  return {
    uid: partial.uid,
    role: partial.role,
    email: partial.email.trim().toLowerCase(),
    fullName: partial.fullName || partial.email.split('@')[0],
    division: partial.division,
    currentPosition: partial.currentPosition,
    employmentStatus: partial.employmentStatus,
    username: partial.username,
    emailVerified: partial.emailVerified ?? true,
    createdAt: partial.createdAt || new Date().toISOString(),
  };
}