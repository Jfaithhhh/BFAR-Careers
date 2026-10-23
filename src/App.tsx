import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { JobsTable } from './components/JobsTable';
import { ApplicationForm } from './components/ApplicationForm';
import { ApplicationTracker } from './components/ApplicationTracker';
import { AdminPortal } from './components/AdminPortal';
import { Footer } from './components/Footer';
import { PlantillaJob, ApplicationRecord } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'apply' | 'track' | 'admin'>('jobs');
  const [jobs, setJobs] = useState<PlantillaJob[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedJobIdForApply, setSelectedJobIdForApply] = useState<string>('');
  const [activeTrackingCode, setActiveTrackingCode] = useState<string>('');
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // Load jobs and applications on mount
  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const res = await fetch('/api/jobs');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setJobs(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setApplications(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    }
  };

  // When applicant clicks "Apply" on a job
  const handleSelectJobForApply = (job: PlantillaJob) => {
    setSelectedJobIdForApply(job.id);
    setActiveTab('apply');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When a new application is submitted
  const handleApplicationSubmitted = (newApp: ApplicationRecord) => {
    setApplications((prev) => [newApp, ...prev]);
    setActiveTrackingCode(newApp.trackingCode);
  };

  // When applicant wants to track
  const handleNavigateToTrack = (trackingCode: string) => {
    setActiveTrackingCode(trackingCode);
    setActiveTab('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When Admin updates an application
  const handleUpdateApplication = (appId: string, updated: Partial<ApplicationRecord>) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, ...updated } : a))
    );
  };

  // When Admin adds a job
  const handleAddJob = (newJob: Partial<PlantillaJob>) => {
    setJobs((prev) => [newJob as PlantillaJob, ...prev]);
  };

  // When Admin updates a job
  const handleUpdateJob = (jobId: string, updates: Partial<PlantillaJob>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  };

  const pendingCount = applications.filter(
    (a) => a.status === 'Submitted' || a.status === 'Document Under Review'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Official Government & BFAR Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        pendingCount={pendingCount}
        openCount={jobs.filter((j) => j.status === 'Open').length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'jobs' && (
          <JobsTable
            jobs={jobs}
            onSelectJobForApply={handleSelectJobForApply}
            isLoading={isLoadingJobs}
          />
        )}

        {activeTab === 'apply' && (
          <ApplicationForm
            jobs={jobs}
            selectedJobId={selectedJobIdForApply}
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

        {activeTab === 'admin' && (
          <AdminPortal
            jobs={jobs}
            applications={applications}
            onUpdateApplication={handleUpdateApplication}
            onAddJob={handleAddJob}
            onUpdateJob={handleUpdateJob}
          />
        )}
      </main>

      {/* Official GovPH Footer */}
      <Footer />
    </div>
  );
}
