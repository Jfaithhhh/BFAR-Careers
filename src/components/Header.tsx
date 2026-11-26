import React, { useState, useEffect } from 'react';
import {
  Award,
  ExternalLink,
  UserCheck,
  Briefcase,
  FileSearch,
  Lock,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface HeaderProps {
  activeTab: 'jobs' | 'apply' | 'internal' | 'track' | 'admin';
  setActiveTab: (tab: 'jobs' | 'apply' | 'internal' | 'track' | 'admin') => void;
  pendingCount?: number;
  openCount?: number;
  internalCount?: number;
  isAdminAuthenticated?: boolean;
  onAdminAuthChange?: (authenticated: boolean) => void;
  hideNavTabs?: boolean;
  isExternalApplicantSession?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 2,
  openCount = 6,
  isAdminAuthenticated = false,
  onAdminAuthChange,
  hideNavTabs = false,
  isExternalApplicantSession = false,
}) => {
  const [pstTime, setPstTime] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const isRestrictedActive = activeTab === 'admin' && !isExternalApplicantSession;
  const canStaffSignIn = Boolean(isAdminAuthenticated && isRestrictedActive);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (!canStaffSignIn) return;
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-in failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      onAdminAuthChange?.(false);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Manila',
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setPstTime(new Intl.DateTimeFormat('en-PH', options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTabSelect = (tab: 'jobs' | 'apply' | 'internal' | 'track' | 'admin') => {
    if (isExternalApplicantSession) {
      setActiveTab(tab === 'apply' ? 'apply' : 'jobs');
      return;
    }
    if (tab !== 'admin') {
      onAdminAuthChange?.(false);
    }
    setActiveTab(tab);
  };

  const handleToggleRestrictedPortal = () => {
    if (isExternalApplicantSession) {
      setActiveTab('jobs');
      return;
    }
    if (isRestrictedActive) {
      onAdminAuthChange?.(false);
      setActiveTab('jobs');
    } else {
      setActiveTab('admin');
    }
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
      <div className="bg-[#024794] text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#033b7a]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold tracking-wider text-white">
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black font-mono">
              GOVPH
            </span>
            <span>REPUBLIC OF THE PHILIPPINES</span>
          </div>
          <span className="hidden md:inline text-white/30">|</span>
          <span className="hidden md:inline text-sky-100 font-medium text-[11px]">
            {isExternalApplicantSession
              ? 'Public Plantilla Recruitment Portal'
              : 'Internal Recruitment & Personnel Promotion Portal'}
          </span>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4 text-[11px]">
          <div className="hidden sm:flex items-center space-x-1 text-sky-100">
            <span className="text-amber-300 font-semibold">Philippine Standard Time (PST):</span>
            <span className="font-mono text-white">{pstTime || 'Synchronizing...'}</span>
          </div>
          <div className="flex items-center space-x-2 text-sky-100">
            <a
              href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white flex items-center gap-1 font-semibold text-amber-300 transition-colors"
              title="Official BFAR Job Vacancies"
            >
              <span>bfar.da.gov.ph/careers</span>
              <ExternalLink className="w-3 h-3 text-amber-300" />
            </a>

            {!isExternalApplicantSession && (
              <>
                <span className="text-white/30">·</span>

                {currentUser && canStaffSignIn ? (
                  <div className="flex items-center gap-1.5 bg-white/10 border border-white/25 rounded-lg px-2 py-0.5">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'Staff'}
                        className="w-4 h-4 rounded border border-amber-300"
                      />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span
                      className="text-[10px] text-white max-w-[120px] truncate"
                      title={currentUser.email || ''}
                    >
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </span>
                    {currentUser.email === 'jaiciervo7@gmail.com' ||
                    currentUser.email?.endsWith('@bfar.da.gov.ph') ? (
                      <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 rounded uppercase">
                        Admin
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 rounded">
                        Staff
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      title="Sign out from DA-BFAR Portal"
                      className="text-sky-100 hover:text-rose-200 ml-1 p-0.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={!canStaffSignIn || isSigningIn}
                    aria-disabled={!canStaffSignIn || isSigningIn}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-colors border ${
                      canStaffSignIn
                        ? 'bg-white/15 hover:bg-white/25 text-white border-amber-300/60 cursor-pointer'
                        : 'bg-white/5 text-sky-100/50 border-white/15 cursor-not-allowed'
                    }`}
                    title={
                      canStaffSignIn
                        ? 'Sign in with your verified DA-BFAR Google Account'
                        : 'Locked: Naka-off ang HR & HRMPSB Portal o hindi pa naka-verify ang Admin'
                    }
                  >
                    {canStaffSignIn ? (
                      <LogIn className="w-3 h-3 text-amber-300" />
                    ) : (
                      <Lock className="w-3 h-3 text-sky-100/50" />
                    )}
                    <span>{isSigningIn ? 'Signing In...' : 'Staff Sign In'}</span>
                  </button>
                )}

                <span className="text-white/30">·</span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isRestrictedActive}
                  aria-label="Toggle HR and HRMPSB Restricted Portal"
                  onClick={handleToggleRestrictedPortal}
                  className={`flex items-center gap-2 pl-2.5 pr-1.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                    isRestrictedActive
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/25'
                  }`}
                  title="Toggle Restricted HR & HRMPSB Staff Portal"
                >
                  <Lock
                    className={`w-3 h-3 ${isRestrictedActive ? 'text-slate-950' : 'text-amber-300'}`}
                  />
                  <span>HR &amp; HRMPSB Portal (Restricted)</span>
                  {pendingCount > 0 && (
                    <span
                      className={`text-[9px] font-bold px-1.5 rounded ${
                        isRestrictedActive
                          ? 'bg-slate-950 text-amber-300'
                          : 'bg-amber-400 text-slate-950'
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-4 w-7 items-center rounded-md transition-colors ${
                      isRestrictedActive ? 'bg-slate-950' : 'bg-slate-950/50 border border-white/25'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded transition-transform ${
                        isRestrictedActive
                          ? 'translate-x-3.5 bg-amber-400'
                          : 'translate-x-0.5 bg-sky-100'
                      }`}
                    />
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative bg-white border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="h-14 sm:h-16 w-auto flex items-center justify-center">
                <img
                  src="/assets/ph_coat_of_arms.png"
                  alt="Coat of Arms of the Republic of the Philippines"
                  className="h-14 sm:h-16 w-auto object-contain"
                />
              </div>

              <div className="h-14 sm:h-16 w-auto flex items-center justify-center">
                <img
                  src="/assets/bfar_da_logo.png"
                  alt="Department of Agriculture - Bureau of Fisheries and Aquatic Resources"
                  className="h-14 sm:h-16 w-auto object-contain"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-[10px] sm:text-xs font-bold tracking-widest text-slate-500 uppercase leading-tight">
                REPUBLIC OF THE PHILIPPINES
              </span>
              <span className="text-[10px] sm:text-xs font-bold tracking-widest text-slate-500 uppercase leading-tight">
                DEPARTMENT OF AGRICULTURE
              </span>
              <h1 className="text-base sm:text-xl lg:text-2xl font-black text-[#024794] tracking-tight uppercase leading-tight mt-0.5">
                BUREAU OF FISHERIES AND AQUATIC RESOURCES
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                <span className="bg-amber-50 text-amber-950 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-bold">
                  Central Office (NCR) • Quezon City
                </span>
                <span className="text-[11px] text-slate-600 hidden sm:inline">
                  Fisheries Building Complex, BPI Compound, Brgy. Vasra, Visayas Avenue, Diliman
                </span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span className="text-[11px] font-semibold text-[#024794] hidden lg:inline">
                  Human Resource Merit Promotion and Selection Board (HRMPSB)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!hideNavTabs && (
        <nav className="bg-white border-b border-slate-200 px-4 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar">
            <div className="flex items-center space-x-1 sm:space-x-2 py-2">
              <button
                type="button"
                onClick={() => handleTabSelect('jobs')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'jobs'
                    ? 'bg-sky-50 text-[#024794] border-b-2 border-[#024794] font-bold'
                    : 'text-slate-600 hover:text-[#024794] hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-4 h-4 text-[#024794]" />
                <span>Plantilla Vacancies</span>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-1.5 py-0.5 rounded">
                  {openCount}
                </span>
              </button>

              {!isExternalApplicantSession && (
                <>
                  <button
                    type="button"
                    onClick={() => handleTabSelect('apply')}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'apply'
                        ? 'bg-sky-50 text-[#024794] border-b-2 border-[#024794] font-bold'
                        : 'text-slate-600 hover:text-[#024794] hover:bg-slate-50'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Internal Application (Fast-Fill)</span>
                    <span className="bg-amber-50 text-amber-950 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Staff Only
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSelect('internal')}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'internal'
                        ? 'bg-sky-50 text-[#024794] border-b-2 border-[#024794] font-bold'
                        : 'text-slate-600 hover:text-[#024794] hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    <span>Internal Recruitment (BFAR Personnel)</span>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Promotion Hub
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSelect('track')}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'track'
                        ? 'bg-sky-50 text-[#024794] border-b-2 border-[#024794] font-bold'
                        : 'text-slate-600 hover:text-[#024794] hover:bg-slate-50'
                    }`}
                  >
                    <FileSearch className="w-4 h-4 text-[#024794]" />
                    <span>Track Application Status</span>
                  </button>
                </>
              )}
            </div>

            {!isExternalApplicantSession && (
              <div className="hidden lg:flex items-center text-xs text-slate-600 gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>PRC RA 1080 &amp; Civil Service Commission Integrated</span>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};