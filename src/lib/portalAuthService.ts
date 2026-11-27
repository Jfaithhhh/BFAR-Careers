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
  collection,
  addDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { PortalUserProfile } from '../types';

export const BFAR_DOMAIN = '@bfar.da.gov.ph';
export const BFAR_DOMAIN_ERROR =
  'Access restricted: Please use your official @bfar.da.gov.ph email address.';

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
 * Generates a 6-digit OTP (5-minute expiry) & queues a mail document in Firestore `mail`.
 * Actual email delivery to Gmail relies on a backend / Cloud Function / Firestore Mail extension.
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

  if (typeof window !== 'undefined') {
    (window as unknown as { __bfarOtpUid?: string }).__bfarOtpUid = existingUid;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  await setDoc(doc(db, 'otp_verifications', existingUid), {
    uid: existingUid,
    email: cleanEmail,
    code,
    expiresAt,
    attempts: 0,
    verified: false,
    updatedAt: serverTimestamp(),
  });

  let deliveredViaEmail = false;
  try {
    await addDoc(collection(db, 'mail'), {
      to: [cleanEmail],
      message: {
        subject: 'DA-BFAR Careers Portal — Your 6-Digit Verification Code',
        text: `Hello ${displayName},\n\nYour DA-BFAR verification code is: ${code}\n\nThis code will expire in 5 minutes. If you did not request this, please ignore this email.\n\nDA-BFAR Human Resource Merit Promotion and Selection Board (HRMPSB)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
            <div style="background: #0b2447; color: #ffffff; padding: 16px 20px;">
              <div style="font-size: 11px; letter-spacing: 1px; color: #7dd3fc; font-weight: bold;">REPUBLIC OF THE PHILIPPINES • DA-BFAR</div>
              <div style="font-size: 16px; font-weight: bold; margin-top: 4px;">Portal Email Verification</div>
            </div>
            <div style="padding: 24px 20px; color: #1e293b;">
              <p style="margin-top: 0;">Hello <strong>${displayName}</strong>,</p>
              <p>Use the 6-digit One-Time Password (OTP) below to verify your email address:</p>
              <div style="background: #f1f5f9; border: 1px dashed #024794; border-radius: 6px; padding: 14px; text-align: center; margin: 20px 0;">
                <span style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #024794; font-family: monospace;">${code}</span>
              </div>
              <p style="font-size: 13px; color: #64748b;">This code expires in <strong>5 minutes</strong>.</p>
            </div>
          </div>
        `,
      },
    });
    deliveredViaEmail = true;
  } catch {
    deliveredViaEmail = false;
  }

  return {
    code,
    devOtpCode: code,
    deliveredViaEmail,
    uid: existingUid,
  };
}

/**
 * Validates the 6-digit OTP stored in `otp_verifications/{uid}`.
 */
async function validateOtpRecord(uid: string, enteredCode: string): Promise<void> {
  const otpRef = doc(db, 'otp_verifications', uid);
  const otpSnap = await getDoc(otpRef);

  if (!otpSnap.exists()) {
    throw new Error('No active verification code found. Please click "Send OTP" first.');
  }

  const data = otpSnap.data();
  if (Date.now() > Number(data.expiresAt || 0)) {
    throw new Error('Verification code has expired (5-minute limit). Please resend OTP.');
  }

  if (String(data.code || '').trim() !== enteredCode.trim()) {
    throw new Error('Invalid 6-digit verification code. Please check your email and try again.');
  }

  await updateDoc(otpRef, {
    verified: true,
    verifiedAt: serverTimestamp(),
  });
}

/**
 * BFAR Employee Registration:
 * - 1st Choice: Official @bfar.da.gov.ph email
 * - 2nd Option: Personal @gmail.com email (requires 6-digit OTP verification)
 * - Does NOT auto-set emailVerified: true without valid OTP verification.
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
    if (!params.code || !/^\d{6}$/.test(params.code.trim())) {
      throw new Error('Please enter a valid 6-digit verification OTP code.');
    }
    const candidateUid =
      auth.currentUser?.uid ||
      (typeof window !== 'undefined'
        ? (window as unknown as { __bfarOtpUid?: string }).__bfarOtpUid
        : undefined) ||
      `otp_${btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;

    await validateOtpRecord(candidateUid, params.code.trim());
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
 * `code` is optional so callers that verify via modal (`PortalAccessGateway`) can pass `{ username, email, password }`.
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
  if (hasInlineCode && !/^\d{6}$/.test(params.code!.trim())) {
    throw new Error('Please enter a valid 6-digit Gmail OTP code.');
  }

  const available = await isUsernameAvailable(normalizedUsername);
  if (!available) {
    throw new Error('Username is already taken. Please choose another username.');
  }

  if (hasInlineCode) {
    const candidateOtpUid =
      params.uid?.trim() ||
      (typeof window !== 'undefined'
        ? (window as unknown as { __bfarOtpUid?: string }).__bfarOtpUid
        : undefined) ||
      `otp_${btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;

    await validateOtpRecord(candidateOtpUid, params.code!.trim());
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

  const otpInfo = await sendExternalApplicantOtp(cred.user.uid, cleanEmail, cleanUsername);

  return {
    profile,
    uid: cred.user.uid,
    email: cleanEmail,
    username: cleanUsername,
    code: otpInfo.code,
  };
}

/**
 * Verify 6-Digit OTP & Activate Account
 */
export async function verifyExternalApplicantOtp(
  uid: string,
  enteredCode: string
): Promise<PortalUserProfile> {
  await validateOtpRecord(uid, enteredCode);

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { emailVerified: true });

  const updatedSnap = await getDoc(userRef);
  return updatedSnap.data() as PortalUserProfile;
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