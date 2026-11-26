import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Header } from './components/Header';
import { PortalAccessGateway } from './components/PortalAccessGateway';
import { PortalSignInGate } from './PortalSignInGate';
import { JobsTable } from './components/JobsTable';
import { ApplicationForm } from './components/ApplicationForm';
import { InternalRecruitmentPortal } from './components/InternalRecruitmentPortal';
import { ApplicationTracker } from './components/ApplicationTracker';
import { AdminPortal } from './components/AdminPortal';
import { Footer } from './components/Footer';
import {
  PlantillaJob,
  ApplicationRecord,
  InternalEmployeeProfile,
  PortalRole,
  PortalUserProfile,
} from './types';
import {
  ActivePortalPov,
  canViewApplicationRecord,
  isVacancyVisibleForRole,
} from './lib/portalSession';
import { auth, signOutUser } from './lib/firebase';
import { getPortalUserProfile } from './lib/portalAuthService';
import {
  subscribeToApplications,
  subscribeToJobVacancies,
} from './lib/firestoreService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'apply' | 'internal' | 'track' | 'admin'>('jobs');
  const [selectedGateOption, setSelectedGateOption] = useState<ActivePortalPov>('bfar_employee');
  const [portalRole, setPortalRole] = useState<PortalRole | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [portalUser, setPortalUser] = useState<PortalUserProfile | null>(null);
  const [isCheckingPortalAuth, setIsCheckingPortalAuth] = useState<boolean>(() => Boolean(auth.currentUser));
  const [jobs, setJobs] = useState<PlantillaJob[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedJobIdForApply, setSelectedJobIdForApply] = useState<string>('');
  const [selectedInternalProfile, setSelectedInternalProfile] = useState<InternalEmployeeProfile | undefined>(undefined);
  const [activeTrackingCode, setActiveTrackingCode] = useState<string>('');
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  const effectiveRole: ActivePortalPov | null = isAdminAuthenticated
    ? 'hr_admin'
    : portalUser?.role || portalRole;

  const isExternalApplicantSession = !isAdminAuthenticated && effectiveRole === 'external_applicant';
  const isAdminView = !isExternalApplicantSession && activeTab === 'admin';

  useEffect(() => {
    if (isExternalApplicantSession && activeTab !== 'jobs' && activeTab !== 'apply') {
      setActiveTab('jobs');
    }
  }, [isExternalApplicantSession, activeTab]);

  useEffect(() => {
    if (activeTab !== 'admin') {
      setIsAdminAuthenticated(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setPortalUser(null);
        setPortalRole(null);
        setIsCheckingPortalAuth(false);
        return;
      }
      try {
        const profile = await getPortalUserProfile(firebaseUser.uid);
        const isVerified = Boolean(profile?.emailVerified || firebaseUser.emailVerified);
        if (profile && isVerified) {
          const verifiedProfile: PortalUserProfile = { ...profile, emailVerified: true };
          setPortalUser(verifiedProfile);
          setPortalRole(verifiedProfile.role);
        } else {
          setPortalUser(null);
          setPortalRole(null);
        }
      } catch {
        setPortalUser(null);
        setPortalRole(null);
      } finally {
        setIsCheckingPortalAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setIsLoadingJobs(true);

    const unsubVacancies = subscribeToJobVacancies((firestoreJobs) => {
      setJobs(firestoreJobs || []);
      setIsLoadingJobs(false);
    });

    const unsubApplications = subscribeToApplications((firestoreApps) => {
      setApplications(firestoreApps || []);
    });

    return () => {
      unsubVacancies();
      unsubApplications();
    };
  }, []);

  const handleReturnToFrontPage = () => {
    setIsAdminAuthenticated(false);
    setPortalUser(null);
    setPortalRole(null);
    setSelectedInternalProfile(undefined);
    setActiveTab('jobs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGateAuthenticatedUser = (profile: PortalUserProfile) => {
    setIsAdminAuthenticated(false);
    setPortalUser(profile);
    setPortalRole(profile.role);
    setActiveTab('jobs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePortalUserChange = (user: PortalUserProfile | null) => {
    setPortalUser(user);
    setPortalRole(user?.role || null);
    if (user) {
      setIsAdminAuthenticated(false);
      setActiveTab('jobs');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePortalSignOut = async () => {
    setIsAdminAuthenticated(false);
    setPortalUser(null);
    setPortalRole(null);
    setSelectedInternalProfile(undefined);
    setActiveTab('jobs');
    try {
      await signOutUser();
    } catch {
      // Ignore if already signed out
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectJobForApply = (job: PlantillaJob) => {
    setSelectedJobIdForApply(job.id);
    setSelectedInternalProfile(undefined);
    setActiveTab('apply');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectJobForInternalApply = (job: PlantillaJob, profile: InternalEmployeeProfile) => {
    if (isExternalApplicantSession) return;
    setSelectedJobIdForApply(job.id);
    setSelectedInternalProfile(profile);
    setActiveTab('apply');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplicationSubmitted = (newApp: ApplicationRecord) => {
    setApplications((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
    setActiveTrackingCode(newApp.trackingCode);
  };

  const handleNavigateToTrack = (trackingCode: string) => {
    if (isExternalApplicantSession) {
      setActiveTab('jobs');
      return;
    }
    setActiveTrackingCode(trackingCode);
    setActiveTab('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateApplication = (appId: string, updated: Partial<ApplicationRecord>) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, ...updated } : a))
    );
  };

  const handleAddJob = (newJob: Partial<PlantillaJob>) => {
    if (!newJob.id) return;
    setJobs((prev) => [newJob as PlantillaJob, ...prev.filter((j) => j.id !== newJob.id)]);
  };

  const handleUpdateJob = (jobId: string, updates: Partial<PlantillaJob>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  };

  const handleDeleteJob = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const visibleJobs = jobs.filter((job) =>
    isVacancyVisibleForRole(job, effectiveRole, isAdminAuthenticated)
  );

  const visibleApplications = applications.filter((app) =>
    canViewApplicationRecord(
      app,
      effectiveRole,
      portalUser?.email || auth.currentUser?.email,
      isAdminAuthenticated
    )
  );

  const pendingCount = visibleApplications.filter(
    (a) => a.status === 'Submitted' || a.status === 'Document Under Review'
  ).length;

  const internalCount = visibleApplications.filter((a) => a.applicantType === 'internal').length;

  const showFrontPageGate = !isAdminView && !portalUser && !portalRole;
  const hideHeaderNav = showFrontPageGate || isAdminView;

  const headerActiveTab: 'jobs' | 'apply' | 'internal' | 'track' | 'admin' =
    isExternalApplicantSession && activeTab !== 'jobs' && activeTab !== 'apply'
      ? 'jobs'
      : activeTab;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-[#0F172A] font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <Header
        activeTab={headerActiveTab}
        setActiveTab={(tab) => {
          if (isExternalApplicantSession) {
            setActiveTab(tab === 'apply' ? 'apply' : 'jobs');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          if (tab !== 'admin') {
            setIsAdminAuthenticated(false);
          }
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        pendingCount={pendingCount}
        openCount={visibleJobs.filter((j) => j.status === 'Open').length}
        internalCount={internalCount}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminAuthChange={(authenticated) => {
          if (authenticated) {
            setPortalUser(null);
            setPortalRole(null);
          }
          setIsAdminAuthenticated(authenticated);
        }}
        hideNavTabs={hideHeaderNav}
        isExternalApplicantSession={isExternalApplicantSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {isCheckingPortalAuth && !isAdminView ? (
          <div className="bg-white border border-[#DCE2E8] rounded-sm p-8 text-center text-xs font-semibold text-[#475569]">
            Checking portal session...
          </div>
        ) : isAdminView ? (
          <AdminPortal
            jobs={visibleJobs}
            applications={visibleApplications}
            onUpdateApplication={handleUpdateApplication}
            onAddJob={handleAddJob}
            onUpdateJob={handleUpdateJob}
            onDeleteJob={handleDeleteJob}
            onAuthChange={(authenticated) => {
              if (authenticated) {
                setPortalUser(null);
                setPortalRole(null);
              }
              setIsAdminAuthenticated(authenticated);
            }}
            onBackToFrontPage={handleReturnToFrontPage}
          />
        ) : showFrontPageGate ? (
          <PortalSignInGate
            selectedOption={selectedGateOption}
            onSelectOption={setSelectedGateOption}
            onAuthenticatedUser={handleGateAuthenticatedUser}
            onProceedToHrPortal={() => {
              setPortalUser(null);
              setPortalRole(null);
              setActiveTab('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : isExternalApplicantSession ? (
          <>
            <PortalAccessGateway
              portalUser={portalUser}
              onPortalUserChange={handlePortalUserChange}
              onPortalSignOut={handlePortalSignOut}
              onOpenAdminPortal={() => {}}
              onNavigateTab={(tab) => {
                setActiveTab(tab === 'apply' ? 'apply' : 'jobs');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {activeTab === 'apply' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab('jobs')}
                    className="text-xs font-bold text-[#0F3557] hover:text-[#C69214] transition-colors cursor-pointer"
                  >
                    &larr; Back to Plantilla Vacancies
                  </button>
                </div>

                <ApplicationForm
                  jobs={visibleJobs}
                  selectedJobId={selectedJobIdForApply}
                  initialInternalProfile={undefined}
                  isExternalApplicant={true}
                  applicantEmail={portalUser?.email || ''}
                  onApplicationSubmitted={handleApplicationSubmitted}
                  onNavigateToTrack={() => setActiveTab('jobs')}
                />
              </div>
            ) : (
              <JobsTable
                jobs={visibleJobs}
                onSelectJobForApply={handleSelectJobForApply}
                isLoading={isLoadingJobs}
              />
            )}
          </>
        ) : (
          <>
            {activeTab === 'jobs' && (
              <>
                <PortalAccessGateway
                  portalUser={portalUser}
                  onPortalUserChange={handlePortalUserChange}
                  onPortalSignOut={handlePortalSignOut}
                  onOpenAdminPortal={() => {
                    setPortalUser(null);
                    setPortalRole(null);
                    setActiveTab('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onNavigateTab={(tab: 'jobs' | 'apply' | 'internal' | 'track') => {
                    setActiveTab(tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />

                <JobsTable
                  jobs={visibleJobs}
                  onSelectJobForApply={handleSelectJobForApply}
                  isLoading={isLoadingJobs}
                />
              </>
            )}

            {activeTab === 'internal' && (
              <InternalRecruitmentPortal
                jobs={visibleJobs}
                applications={visibleApplications}
                onSelectJobForInternalApply={handleSelectJobForInternalApply}
                onTrackApplication={handleNavigateToTrack}
              />
            )}

            {activeTab === 'apply' && (
              <ApplicationForm
                jobs={visibleJobs}
                selectedJobId={selectedJobIdForApply}
                initialInternalProfile={selectedInternalProfile}
                isExternalApplicant={false}
                applicantEmail={portalUser?.email || ''}
                onApplicationSubmitted={handleApplicationSubmitted}
                onNavigateToTrack={handleNavigateToTrack}
              />
            )}

            {activeTab === 'track' && (
              <ApplicationTracker
                initialTrackingCode={activeTrackingCode}
                recentApplications={visibleApplications}
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}