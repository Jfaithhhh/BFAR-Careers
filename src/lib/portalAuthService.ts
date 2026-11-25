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
 * Option 1: Register BFAR Employee (Email & Password)
 */
export async function registerBfarEmployee(params: {
  email: string;
  password: string;
  fullName: string;
  division: string;
  currentPosition: string;
  employmentStatus: 'Permanent' | 'Casual' | 'Contractual' | 'Job Order / COS';
}): Promise<PortalUserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!isValidBfarEmail(cleanEmail)) {
    throw new Error(BFAR_DOMAIN_ERROR);
  }

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
  await updateProfile(cred.user, { displayName: params.fullName.trim() });

  const profile: PortalUserProfile = {
    uid: cred.user.uid,
    role: 'bfar_employee',
    email: cleanEmail,
    fullName: params.fullName.trim(),
    division: params.division.trim(),
    currentPosition: params.currentPosition.trim(),
    employmentStatus: params.employmentStatus,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', cred.user.uid), profile);
  return profile;
}

/**
 * Option 1: Sign In BFAR Employee (Email & Password)
 */
export async function loginBfarEmployee(email: string, password: string): Promise<PortalUserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidBfarEmail(cleanEmail)) {
    throw new Error(BFAR_DOMAIN_ERROR);
  }

  const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const profile = await getPortalUserProfile(cred.user.uid);

  if (!profile || profile.role !== 'bfar_employee') {
    await signOut(auth);
    throw new Error('No BFAR Employee profile found for this account. Please register first.');
  }

  return profile;
}

/**
 * Option 1: Google Sign-In strictly restricted to @bfar.da.gov.ph
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
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', cred.user.uid), profile);
  return profile;
}

/**
 * Option 2: Check Username Uniqueness
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return false;
  const snap = await getDoc(doc(db, 'usernames', normalized));
  return !snap.exists();
}

/**
 * Option 2: Generate 6-Digit OTP (5-minute expiry) & queue mail doc
 */
export async function sendExternalApplicantOtp(
  uid: string,
  email: string,
  fullNameOrUsername: string
): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  await setDoc(doc(db, 'otp_verifications', uid), {
    uid,
    email: email.trim().toLowerCase(),
    code,
    expiresAt,
    attempts: 0,
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'mail'), {
    to: [email.trim().toLowerCase()],
    message: {
      subject: 'DA-BFAR Careers Portal — Your 6-Digit Verification Code',
      text: `Hello ${fullNameOrUsername},\n\nYour DA-BFAR External Applicant verification code is: ${code}\n\nThis code will expire in 5 minutes. If you did not request this, please ignore this email.\n\nDA-BFAR Human Resource Merit Promotion and Selection Board (HRMPSB)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
          <div style="background: #0b2447; color: #ffffff; padding: 16px 20px;">
            <div style="font-size: 11px; letter-spacing: 1px; color: #7dd3fc; font-weight: bold;">REPUBLIC OF THE PHILIPPINES • DA-BFAR</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 4px;">Applicant Email Verification</div>
          </div>
          <div style="padding: 24px 20px; color: #1e293b;">
            <p style="margin-top: 0;">Hello <strong>${fullNameOrUsername}</strong>,</p>
            <p>Use the 6-digit One-Time Password (OTP) below to verify your email address and activate your DA-BFAR Applicant account:</p>
            <div style="background: #f1f5f9; border: 1px dashed #024794; border-radius: 6px; padding: 14px; text-align: center; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #024794; font-family: monospace;">${code}</span>
            </div>
            <p style="font-size: 13px; color: #64748b;">This code expires in <strong>5 minutes</strong>.</p>
          </div>
        </div>
      `,
    },
  }).catch(() => {});

  return code;
}

/**
 * Option 2: Register External Applicant & Trigger OTP
 */
export async function registerExternalApplicant(params: {
  username: string;
  email: string;
  password: string;
}): Promise<{ uid: string; email: string; username: string; code: string }> {
  const cleanUsername = params.username.trim();
  const normalizedUsername = cleanUsername.toLowerCase();
  const cleanEmail = params.email.trim().toLowerCase();

  if (cleanEmail.endsWith(BFAR_DOMAIN)) {
    throw new Error('Official @bfar.da.gov.ph emails must register under the BFAR Employee portal.');
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
    emailVerified: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), profile);

  const code = await sendExternalApplicantOtp(cred.user.uid, cleanEmail, cleanUsername);

  return { uid: cred.user.uid, email: cleanEmail, username: cleanUsername, code };
}

/**
 * Option 2: Verify 6-Digit OTP & Activate Account
 */
export async function verifyExternalApplicantOtp(uid: string, enteredCode: string): Promise<PortalUserProfile> {
  const otpRef = doc(db, 'otp_verifications', uid);
  const otpSnap = await getDoc(otpRef);

  if (!otpSnap.exists()) {
    throw new Error('No active verification code found. Please click "Resend OTP".');
  }

  const data = otpSnap.data();
  if (Date.now() > data.expiresAt) {
    throw new Error('Verification code has expired (5-minute limit). Please click "Resend OTP".');
  }

  if (data.code !== enteredCode.trim()) {
    throw new Error('Invalid 6-digit verification code. Please check your email and try again.');
  }

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { emailVerified: true });

  const updatedSnap = await getDoc(userRef);
  return updatedSnap.data() as PortalUserProfile;
}

/**
 * Option 2: Login External Applicant via Email OR Username + Password
 */
export async function loginExternalApplicant(identifier: string, password: string): Promise<{
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