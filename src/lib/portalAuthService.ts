import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { PortalUserProfile } from '../types';

export const BFAR_DOMAIN = '@bfar.da.gov.ph';
export const BFAR_DOMAIN_ERROR =
  'Access restricted: Please use your official @bfar.da.gov.ph email address.';

const OTP_STORAGE_PREFIX = 'bfar_otp_session:';
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes (matches Apps Script email notice)

interface SessionOtpRecord {
  uid: string;
  email: string;
  code: string;
  expiresAt: number;
  verified: boolean;
}

function getOtpStorageKey(email: string): string {
  return `${OTP_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readSessionOtp(email: string): SessionOtpRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(getOtpStorageKey(email));
    if (!raw) return null;
    return JSON.parse(raw) as SessionOtpRecord;
  } catch {
    return null;
  }
}

function writeSessionOtp(record: SessionOtpRecord): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(getOtpStorageKey(record.email), JSON.stringify(record));
  (window as unknown as { __bfarOtpEmail?: string; __bfarOtpUid?: string }).__bfarOtpEmail =
    record.email;
  (window as unknown as { __bfarOtpEmail?: string; __bfarOtpUid?: string }).__bfarOtpUid =
    record.uid;
}

function clearSessionOtp(email: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(getOtpStorageKey(email));
}

/**
 * Validates the 6-digit OTP stored in `sessionStorage` BEFORE creating any
 * Firebase Auth user or writing to Firestore (`users` / `usernames`).
 */
export function assertValidSessionOtp(
  email: string,
  enteredCode: string,
  consume = true
): void {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = enteredCode.trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('Please enter a valid 6-digit verification OTP code.');
  }

  const record = readSessionOtp(cleanEmail);
  if (!record) {
    throw new Error('No active verification code found. Please click "Send OTP" first.');
  }

  if (Date.now() > Number(record.expiresAt || 0)) {
    clearSessionOtp(cleanEmail);
    throw new Error('Verification code has expired (10-minute limit). Please resend OTP.');
  }

  if (String(record.code || '').trim() !== cleanCode) {
    throw new Error('Invalid 6-digit verification code. Please check your email and try again.');
  }

  if (consume) {
    clearSessionOtp(cleanEmail);
  } else {
    writeSessionOtp({ ...record, verified: true });
  }
}

export function isValidBfarEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(BFAR_DOMAIN);
}

/**
 * Fetches the portal user profile from `users/{uid}`.
 * Returns null if the user has no portal profile (e.g., an HR Admin Google session).
 */
export async function getPortalUserProfile(uid: string): Promise<PortalUserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as PortalUserProfile;
}

/**
 * Generates a 6-digit OTP (10-minute expiry), stores it ONLY in `sessionStorage`
 * (0 bytes in Firestore), and sends the email via Google Apps Script Web App.
 */
export async function sendExternalApplicantOtp(
  emailOrUid: string,
  fullNameOrUsernameOrEmail: string,
  optionalPasswordOrName?: string
): Promise<{
  code: string;
  devOtpCode: string;
  deliveredViaEmail: boolean;
  uid: string;
}> {
  const isFirstArgEmail = emailOrUid.includes('@');
  const cleanEmail = (isFirstArgEmail ? emailOrUid : fullNameOrUsernameOrEmail)
    .trim()
    .toLowerCase();
  const displayName = (
    isFirstArgEmail ? fullNameOrUsernameOrEmail : optionalPasswordOrName || cleanEmail.split('@')[0]
  ).trim();

  const existingUid =
    !isFirstArgEmail && emailOrUid.trim()
      ? emailOrUid.trim()
      : auth.currentUser?.uid ||
        `otp_${btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_TTL_MS;

  writeSessionOtp({
    uid: existingUid,
    email: cleanEmail,
    code,
    expiresAt,
    verified: false,
  });

  const webhookUrl = String(import.meta.env.VITE_OTP_WEBHOOK_URL || '').trim();
  let deliveredViaEmail = false;

  if (webhookUrl) {
    try {
      // Use text/plain to prevent CORS preflight OPTIONS failure on Google Apps Script Web Apps
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          email: cleanEmail,
          code,
          fullName: displayName,
        }),
      });

      if (res.ok) {
        const payload = await res.json().catch(() => ({ ok: true }));
        deliveredViaEmail = payload?.ok !== false;
      }
    } catch {
      deliveredViaEmail = false;
    }
  }

  return {
    code,
    devOtpCode: code,
    deliveredViaEmail,
    uid: existingUid,
  };
}

/**
 * BFAR Employee Registration:
 * - 1st Choice: Official @bfar.da.gov.ph email
 * - 2nd Option: Personal @gmail.com email (strictly gated by 6-digit sessionStorage OTP)
 */
export async function registerBfarEmployee(params: {
  email: string;
  password: string;
  fullName: string;
  division: string;
  currentPosition?: string;
  employmentStatus?: 'Permanent' | 'Casual' | 'Contractual' | 'Job Order / COS';
  code?: string;
  authChannel?: 'bfar_email' | 'personal_gmail';
}): Promise<PortalUserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  const isOfficialBfar = isValidBfarEmail(cleanEmail);
  const isPersonalGmail = cleanEmail.endsWith('@gmail.com');

  if (!isOfficialBfar && !isPersonalGmail) {
    throw new Error(
      'Please use an official @bfar.da.gov.ph email (1st choice) or a valid @gmail.com address (2nd option).'
    );
  }

  const requiresOtp = isPersonalGmail || Boolean(params.code?.trim());
  let otpPassed = false;

  if (requiresOtp) {
    assertValidSessionOtp(cleanEmail, params.code || '', true);
    otpPassed = true;
  }

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
  await updateProfile(cred.user, { displayName: params.fullName.trim() });

  const profile: PortalUserProfile = {
    uid: cred.user.uid,
    role: 'bfar_employee',
    email: cleanEmail,
    fullName: params.fullName.trim(),
    division: params.division.trim(),
    currentPosition: (params.currentPosition || 'BFAR Personnel').trim(),
    employmentStatus: params.employmentStatus || 'Permanent',
    emailVerified: otpPassed,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', cred.user.uid), profile);
  return profile;
}

/**
 * BFAR Employee Sign In (Email & Password).
 * Blocks login if email is not verified or role is not `bfar_employee`.
 */
export async function loginBfarEmployee(email: string, password: string): Promise<PortalUserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const profile = await getPortalUserProfile(cred.user.uid);

  if (!profile || profile.role !== 'bfar_employee') {
    await signOut(auth);
    throw new Error('No BFAR Employee profile found for this account. Please register first.');
  }

  if (!profile.emailVerified && !cred.user.emailVerified) {
    await signOut(auth);
    throw new Error('Account email is not yet verified. Please complete OTP/email verification first.');
  }

  return {
    ...profile,
    emailVerified: true,
  };
}

/**
 * Google Sign-In strictly restricted to @bfar.da.gov.ph
 */
export async function signInBfarEmployeeWithGoogle(extraDetails?: {
  division?: string;
  currentPosition?: string;
  employmentStatus?: 'Permanent' | 'Casual' | 'Contractual' | 'Job Order / COS';
}): Promise<PortalUserProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: 'bfar.da.gov.ph', prompt: 'select_account' });

  const cred = await signInWithPopup(auth, provider);
  const email = (cred.user.email || '').trim().toLowerCase();

  if (!isValidBfarEmail(email)) {
    await signOut(auth);
    throw new Error(BFAR_DOMAIN_ERROR);
  }

  const existing = await getPortalUserProfile(cred.user.uid);
  if (existing) {
    if (existing.role !== 'bfar_employee') {
      await signOut(auth);
      throw new Error('This account is registered under a different portal role.');
    }
    return existing;
  }

  const profile: PortalUserProfile = {
    uid: cred.user.uid,
    role: 'bfar_employee',
    email,
    fullName: cred.user.displayName || email.split('@')[0],
    division: extraDetails?.division || 'BFAR Central Office',
    currentPosition: extraDetails?.currentPosition || 'BFAR Personnel',
    employmentStatus: extraDetails?.employmentStatus || 'Permanent',
    emailVerified: Boolean(cred.user.emailVerified),
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', cred.user.uid), profile);
  return profile;
}

/**
 * Check Username Uniqueness
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return false;
  const snap = await getDoc(doc(db, 'usernames', normalized));
  return !snap.exists();
}

/**
 * Register External Applicant.
 * Enforces `assertValidSessionOtp` BEFORE `createUserWithEmailAndPassword` when `code` is provided.
 */
export async function registerExternalApplicant(params: {
  uid?: string;
  username: string;
  email: string;
  password: string;
  code?: string;
}): Promise<{
  profile: PortalUserProfile;
  uid: string;
  email: string;
  username: string;
  code: string;
}> {
  const cleanUsername = params.username.trim();
  const normalizedUsername = cleanUsername.toLowerCase();
  const cleanEmail = params.email.trim().toLowerCase();

  if (cleanEmail.endsWith(BFAR_DOMAIN)) {
    throw new Error(
      'Official @bfar.da.gov.ph emails must register under the BFAR Employee portal.'
    );
  }

  const hasInlineCode = Boolean(params.code && params.code.trim().length > 0);
  if (hasInlineCode) {
    assertValidSessionOtp(cleanEmail, params.code!.trim(), true);
  }

  const available = await isUsernameAvailable(normalizedUsername);
  if (!available) {
    throw new Error('Username is already taken. Please choose another username.');
  }

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
  await updateProfile(cred.user, { displayName: cleanUsername });

  await setDoc(doc(db, 'usernames', normalizedUsername), {
    uid: cred.user.uid,
    email: cleanEmail,
    username: cleanUsername,
    createdAt: serverTimestamp(),
  });

  const profile: PortalUserProfile = {
    uid: cred.user.uid,
    role: 'external_applicant',
    email: cleanEmail,
    username: cleanUsername,
    fullName: cleanUsername,
    emailVerified: hasInlineCode,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', cred.user.uid), profile);

  let sentCode = params.code?.trim() || '';
  if (!hasInlineCode) {
    const otpInfo = await sendExternalApplicantOtp(cred.user.uid, cleanEmail, cleanUsername);
    sentCode = otpInfo.code;
  }

  return {
    profile,
    uid: cred.user.uid,
    email: cleanEmail,
    username: cleanUsername,
    code: sentCode,
  };
}

/**
 * Verify 6-Digit OTP & Activate Account (for 2-step modal verification)
 */
export async function verifyExternalApplicantOtp(
  uid: string,
  enteredCode: string
): Promise<PortalUserProfile> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('User profile not found. Please register again.');
  }

  const existingProfile = userSnap.data() as PortalUserProfile;
  assertValidSessionOtp(existingProfile.email, enteredCode, true);

  await updateDoc(userRef, { emailVerified: true });

  return {
    ...existingProfile,
    emailVerified: true,
  };
}

/**
 * Login External Applicant via Email OR Username + Password
 */
export async function loginExternalApplicant(
  identifier: string,
  password: string
): Promise<{
  profile: PortalUserProfile;
  requiresOtp: boolean;
}> {
  const trimmed = identifier.trim();
  let resolvedEmail = trimmed.toLowerCase();

  if (!trimmed.includes('@')) {
    const usernameSnap = await getDoc(doc(db, 'usernames', resolvedEmail));
    if (!usernameSnap.exists()) {
      throw new Error('Username not found. Please check your username or register an account.');
    }
    resolvedEmail = usernameSnap.data().email;
  }

  const cred = await signInWithEmailAndPassword(auth, resolvedEmail, password);
  const profile = await getPortalUserProfile(cred.user.uid);

  if (!profile || profile.role !== 'external_applicant') {
    await signOut(auth);
    throw new Error('Account not found under External Applicant portal.');
  }

  if (!profile.emailVerified) {
    return { profile, requiresOtp: true };
  }

  return { profile, requiresOtp: false };
}