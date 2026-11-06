import React, { useState, useEffect } from 'react';
import {
  PlantillaJob,
  ApplicationRecord,
  InternalEmployeeProfile,
} from '../types';
import {
  DEFAULT_INTERNAL_EMPLOYEES,
  getInternalEmployees,
} from '../lib/firestoreService';
import {
  UserCheck,
  Briefcase,
  TrendingUp,
  Sparkles,
  Award,
  ShieldCheck,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  BadgePercent,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

interface InternalRecruitmentPortalProps {
  jobs: PlantillaJob[];
  applications: ApplicationRecord[];
  onSelectJobForInternalApply: (job: PlantillaJob, profile: InternalEmployeeProfile) => void;
  onTrackApplication: (code: string) => void;
}

export const InternalRecruitmentPortal: React.FC<InternalRecruitmentPortalProps> = ({
  jobs,
  applications,
  onSelectJobForInternalApply,
  onTrackApplication,
}) => {
  const [employees, setEmployees] = useState<InternalEmployeeProfile[]>(DEFAULT_INTERNAL_EMPLOYEES);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(DEFAULT_INTERNAL_EMPLOYEES[0].employeeId);
  const [activeEmployee, setActiveEmployee] = useState<InternalEmployeeProfile>(DEFAULT_INTERNAL_EMPLOYEES[0]);
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const list = await getInternalEmployees();
        if (list.length > 0) {
          setEmployees(list);
          const found = list.find((e) => e.employeeId === selectedEmployeeId) || list[0];
          setActiveEmployee(found);
        }
      } catch (err) {
        console.warn('Failed to load internal employees from Firestore:', err);
      }
    }
    loadEmployees();
  }, []);

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const found = employees.find((e) => e.employeeId === empId);
    if (found) {
      setActiveEmployee(found);
      setSearchError(null);
    }
  };

  const handleSearchEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const clean = searchInput.trim().toUpperCase();
    const found = employees.find(
      (emp) =>
        emp.employeeId.toUpperCase() === clean ||
        emp.fullName.toUpperCase().includes(clean)
    );
    if (found) {
      setActiveEmployee(found);
      setSelectedEmployeeId(found.employeeId);
      setSearchError(null);
    } else {
      setSearchError(`No employee record found for "${searchInput}". Try one of the verified sample profiles.`);
    }
  };

  // Internal applications matching this employee
  const myApplications = applications.filter(
    (app) =>
      app.applicantType === 'internal' &&
      (app.bfarEmployeeId === activeEmployee.employeeId ||
        app.personalInfo.fullName.toLowerCase() === activeEmployee.fullName.toLowerCase())
  );

  // Eligible vacancies for promotion (SG >= current employee SG)
  const promotionalVacancies = jobs.filter(
    (j) => j.status === 'Open' && j.salaryGrade >= activeEmployee.salaryGrade
  );

  // Lateral transfer vacancies (same SG)
  const lateralVacancies = jobs.filter(
    (j) => j.status === 'Open' && j.salaryGrade === activeEmployee.salaryGrade
  );

  return (
    <div className="space-y-6">
      {/* Internal Portal Top Banner */}
      <div className="bg-gradient-to-r from-[#024794] via-[#0b2447] to-[#04336c] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 text-amber-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
            <UserCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>DA-BFAR INTERNAL PERSONNEL MERIT SYSTEM</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Internal Recruitment, Promotion &amp; Lateral Transfer Portal
          </h2>
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
            Exclusive career progression track for permanent and contract-of-service (COS) personnel of
            the Bureau of Fisheries and Aquatic Resources. Submit fast-fill promotional applications with
            verified service records, IPCR ratings, and automated CSC qualification standards analysis.
          </p>
        </div>
      </div>

      {/* Employee Selector & Verification Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Employee Identification &amp; Service Profile</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select or look up your official DA-BFAR personnel record to pre-populate applications.
            </p>
          </div>

          {/* Quick Profile Switcher Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 hidden sm:inline">Active Staff:</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-[#024794]"
            >
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId} • SG {emp.salaryGrade})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search by Employee ID / Name */}
        <form onSubmit={handleSearchEmployee} className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by Employee ID (e.g. BFAR-EMP-2018-0412) or Name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-[#024794]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          <button
            type="submit"
            className="bg-[#024794] hover:bg-[#033b7a] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            Verify ID
          </button>
        </form>

        {searchError && (
          <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-lg flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Active Employee Detail Card */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl p-4 sm:p-5 border border-blue-200/60 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-[#024794] text-white font-black text-sm flex items-center justify-center ring-2 ring-blue-300 shadow-sm">
                {activeEmployee.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{activeEmployee.fullName}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[10px] bg-slate-200/80 text-slate-800 px-1.5 py-0.2 rounded font-bold">
                    {activeEmployee.employeeId}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                    Active Plantilla
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-600 space-y-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Email:</span>
                <span className="font-medium text-slate-800">{activeEmployee.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Division / Office:</span>
                <span className="font-medium text-slate-800">{activeEmployee.division}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-700 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Current Plantilla Item:</span>
              <div className="font-semibold text-slate-900">{activeEmployee.currentPositionTitle}</div>
              <div className="font-mono text-[11px] text-slate-500">{activeEmployee.currentPlantillaItem}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Salary Grade:</span>
                <span className="text-sm font-black text-[#024794]">SG {activeEmployee.salaryGrade}</span>
                <span className="text-[10px] text-slate-500 block">Plantilla Pay Grade</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">BFAR Service:</span>
                <span className="text-sm font-black text-slate-800">{activeEmployee.yearsInBfar} Years</span>
                <span className="text-[10px] text-slate-500 block">Regular Permanent</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Latest IPCR Performance Rating:
                </span>
                <span className="text-xs font-black text-emerald-700">
                  {activeEmployee.latestIpcrRating.toFixed(2)} / 5.00
                </span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-900 mt-0.5">
                {activeEmployee.latestIpcrRating >= 4.5 ? 'Outstanding Performance' : 'Very Satisfactory'}
              </div>
              <div className="text-[9px] text-emerald-700 mt-0.5">
                Rating Period: {activeEmployee.ipcrPeriod}
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-800 font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Complies with CSC ORAOHRA promotion rule (min 4.00 VS)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div>
                <span className="text-slate-400 text-[10px]">Eligibility: </span>
                <span className="font-semibold text-slate-800">{activeEmployee.eligibility}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Verified L&amp;D Hours: </span>
                <span className="font-semibold text-slate-800">{activeEmployee.trainingHours} Hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Applications Status Tracker (My Applications) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#024794]" />
            <h3 className="text-sm font-bold text-slate-900">
              My Internal Promotional Submissions ({myApplications.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">Live Real-Time Status via Firestore</span>
        </div>

        {myApplications.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No active promotional applications submitted yet</div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Select an open plantilla position from the list below and click <strong>Apply for Promotion</strong> to start your application process.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {myApplications.map((app) => (
              <div
                key={app.id}
                className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#024794]">
                      {app.trackingCode}
                    </span>
                    <span className="bg-purple-100 text-purple-900 font-bold text-[10px] px-2 py-0.2 rounded">
                      {app.promotionTrack || 'Promotion'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                        app.status.includes('Recommended')
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status.includes('Qualified')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{app.positionTitle}</h4>
                  <p className="text-[11px] text-slate-500">
                    Item No: {app.plantillaItemNo} • Submitted {app.submissionDate}
                  </p>
                  {app.aiScreening && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#024794] mt-1 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        AI Pre-Screening: {app.aiScreening.overallScore}/100 — {app.aiScreening.recommendedStatus}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onTrackApplication(app.trackingCode)}
                  className="bg-white hover:bg-[#024794] hover:text-white text-[#024794] border border-[#024794] text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1 shrink-0"
                >
                  <span>View Dossier &amp; Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promotional Plantilla Opportunities */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Plantilla Promotion Opportunities (Salary Grade {activeEmployee.salaryGrade} and Above)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Plantilla items matching civil service progression criteria for {activeEmployee.fullName}.
            </p>
          </div>
          <span className="bg-blue-100 text-[#024794] text-xs font-bold px-2.5 py-1 rounded-full">
            {promotionalVacancies.length} Vacancies Open
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {promotionalVacancies.map((job) => {
            const sgDiff = job.salaryGrade - activeEmployee.salaryGrade;

            return (
              <div
                key={job.id}
                className="bg-slate-50/70 hover:bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      {job.itemNo}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        sgDiff > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {sgDiff > 0 ? `Promotion (+SG ${sgDiff})` : 'Lateral Transfer'}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                    {job.positionTitle}
                  </h4>
                  <div className="text-[11px] text-slate-600">{job.division}</div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Official Salary Grade:</span>
                      <strong className="text-[#024794] font-black">
                        Salary Grade {job.salaryGrade}
                      </strong>
                    </div>
                    {sgDiff > 0 && (
                      <div className="flex items-center justify-between text-[10px] text-emerald-700 font-semibold border-t border-slate-100 pt-1">
                        <span>Career Advancement:</span>
                        <span>+ {sgDiff} Salary Grade Progression</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <div>
                      <strong className="text-slate-700">Education QS: </strong>
                      {job.qualificationStandards.education}
                    </div>
                    <div>
                      <strong className="text-slate-700">Eligibility QS: </strong>
                      {job.qualificationStandards.eligibility}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">
                    Deadline: <strong>{job.closingDate}</strong>
                  </span>
                  <button
                    onClick={() => onSelectJobForInternalApply(job, activeEmployee)}
                    className="bg-[#024794] hover:bg-[#033b7a] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>Apply for Promotion</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
