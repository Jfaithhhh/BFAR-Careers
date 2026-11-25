import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Header } from './components/Header';
import { PortalAccessGateway } from './components/PortalAccessGateway';
import { JobsTable } from './components/JobsTable';
import { ApplicationForm } from './components/ApplicationForm';
import { InternalRecruitmentPortal } from './components/InternalRecruitmentPortal';
import { ApplicationTracker } from './components/ApplicationTracker';
import { AdminPortal } from './components/AdminPortal';
import { Footer } from './components/Footer';
import { PlantillaJob, ApplicationRecord, InternalEmployeeProfile, PortalUserProfile } from './types';
import { auth, signOutUser } from './lib/firebase';
import { getPortalUserProfile } from './lib/portalAuthService';
import {
  subscribeToApplications,
  subscribeToJobVacancies,
} from './lib/firestoreService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'apply' | 'internal' | 'track' | 'admin'>('jobs');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [portalUser, setPortalUser] = useState<PortalUserProfile | null>(null);
  const [isCheckingPortalAuth, setIsCheckingPortalAuth] = useState(true);
  const [jobs, setJobs] = useState<PlantillaJob[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedJobIdForApply, setSelectedJobIdForApply] = useState<string>('');
  const [selectedInternalProfile, setSelectedInternalProfile] = useState<InternalEmployeeProfile | undefined>(undefined);
  const [activeTrackingCode, setActiveTrackingCode] = useState<string>('');
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  const isExternalApplicantSession = portalUser?.role === 'external_applicant';
  const isAdminView = !isExternalApplicantSession && activeTab === 'admin';

  // External applicants may only access Plantilla Vacancies ('jobs') and the Application Form ('apply')
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
        setIsCheckingPortalAuth(false);
        return;
      }
      try {
        const profile = await getPortalUserProfile(firebaseUser.uid);
        const isVerified = Boolean(profile?.emailVerified || firebaseUser.emailVerified);
        if (profile && isVerified) {
          setPortalUser({ ...profile, emailVerified: true });
        } else {
          setPortalUser(null);
        }
      } catch {
        setPortalUser(null);
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

  const handlePortalSignOut = async () => {
    await signOutUser();
    setPortalUser(null);
    setActiveTab('jobs');
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
    setJobs((prev) => [newJob as PlantillaJob, ...prev]);
  };

  const handleUpdateJob = (jobId: string, updates: Partial<PlantillaJob>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  };

  const pendingCount = applications.filter(
    (a) => a.status === 'Submitted' || a.status === 'Document Under Review'
  ).length;

  const internalCount = applications.filter((a) => a.applicantType === 'internal').length;

  const showLoginFirstGate = !isAdminView && !portalUser;
  const hideHeaderNav = showLoginFirstGate || isAdminView;

  const headerActiveTab: 'jobs' | 'apply' | 'internal' | 'track' | 'admin' =
    isExternalApplicantSession && activeTab !== 'jobs' && activeTab !== 'apply'
      ? 'jobs'
      : activeTab;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
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
        openCount={jobs.filter((j) => j.status === 'Open').length}
        internalCount={internalCount}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminAuthChange={setIsAdminAuthenticated}
        hideNavTabs={hideHeaderNav}
        isExternalApplicantSession={isExternalApplicantSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {isCheckingPortalAuth && !isAdminView ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs font-semibold text-slate-600 shadow-xs">
            Checking portal session...
          </div>
        ) : isAdminView ? (
          <AdminPortal
            jobs={jobs}
            applications={applications}
            onUpdateApplication={handleUpdateApplication}
            onAddJob={handleAddJob}
            onUpdateJob={handleUpdateJob}
            onAuthChange={setIsAdminAuthenticated}
          />
        ) : showLoginFirstGate ? (
          <PortalAccessGateway
            portalUser={null}
            onPortalUserChange={(user) => {
              setPortalUser(user);
              if (user) {
                setActiveTab('jobs');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            onPortalSignOut={handlePortalSignOut}
            onOpenAdminPortal={() => {
              setActiveTab('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateTab={(tab: 'jobs' | 'apply' | 'internal' | 'track') => {
              setActiveTab(isExternalApplicantSession && tab !== 'apply' ? 'jobs' : tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : isExternalApplicantSession ? (
          <>
            <PortalAccessGateway
              portalUser={portalUser}
              onPortalUserChange={setPortalUser}
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
                    className="text-xs font-bold text-[#024794] hover:underline cursor-pointer"
                  >
                    &larr; Back to Plantilla Vacancies
                  </button>
                </div>

                <ApplicationForm
                  jobs={jobs}
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
                jobs={jobs}
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
                  onPortalUserChange={setPortalUser}
                  onPortalSignOut={handlePortalSignOut}
                  onOpenAdminPortal={() => {
                    setActiveTab('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onNavigateTab={(tab: 'jobs' | 'apply' | 'internal' | 'track') => {
                    setActiveTab(tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />

                <JobsTable
                  jobs={jobs}
                  onSelectJobForApply={handleSelectJobForApply}
                  isLoading={isLoadingJobs}
                />
              </>
            )}

            {activeTab === 'internal' && (
              <InternalRecruitmentPortal
                jobs={jobs}
                applications={applications}
                onSelectJobForInternalApply={handleSelectJobForInternalApply}
                onTrackApplication={handleNavigateToTrack}
              />
            )}

            {activeTab === 'apply' && (
              <ApplicationForm
                jobs={jobs}
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
                recentApplications={applications}
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}