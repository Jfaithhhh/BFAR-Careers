import React, { useState, useMemo, useEffect } from 'react';
import { PlantillaJob } from '../types';
import {
  Search,
  Eye,
  ArrowUpDown,
  Building,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileText,
  BadgeCheck,
} from 'lucide-react';

interface JobsTableProps {
  jobs: PlantillaJob[];
  onSelectJobForApply: (job: PlantillaJob) => void;
  isLoading?: boolean;
}

type SortKey = 'positionTitle' | 'salaryGrade' | 'itemNo' | 'postingDate' | 'closingDate';

const getItemNumber = (job: PlantillaJob): string =>
  (job.plantillaItemNumber || job.itemNo || '').trim();

const getPostingDate = (job: PlantillaJob): string =>
  (job.datePosted || job.postingDate || '').trim();

const getClosingDate = (job: PlantillaJob): string =>
  (job.applicationDeadline || job.closingDate || '').trim();

const isDeadlinePassed = (deadlineStr: string, now: number): boolean => {
  if (!deadlineStr) return false;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadlineStr.trim());
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const endOfDayLocal = new Date(year, month, day, 23, 59, 59, 999).getTime();
    return now > endOfDayLocal;
  }
  const parsed = new Date(deadlineStr).getTime();
  return !Number.isNaN(parsed) && parsed < now;
};

export const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  onSelectJobForApply,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [sgFilter, setSgFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Expired'>('All');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortKey>('salaryGrade');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedJobForModal, setSelectedJobForModal] = useState<PlantillaJob | null>(null);

  const divisions = useMemo(() => {
    const list = Array.from(new Set(jobs.map((j) => j.division).filter(Boolean)));
    return ['All', ...list];
  }, [jobs]);

  const salaryGrades = useMemo(() => {
    const list = Array.from(
      new Set(jobs.map((j) => j.salaryGrade).filter((sg): sg is number => typeof sg === 'number'))
    ).sort((a, b) => a - b);
    return ['All', ...list.map((sg) => `SG ${sg}`)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const now = Date.now();
    const s = searchTerm.trim().toLowerCase();

    const getSortValue = (job: PlantillaJob, field: SortKey): string | number => {
      switch (field) {
        case 'positionTitle':
          return (job.positionTitle || '').toLowerCase();
        case 'salaryGrade':
          return Number(job.salaryGrade) || 0;
        case 'itemNo':
          return getItemNumber(job).toLowerCase();
        case 'postingDate':
          return getPostingDate(job).toLowerCase();
        case 'closingDate':
          return getClosingDate(job).toLowerCase();
      }
    };

    return jobs
      .filter((job) => {
        const matchesDivision = divisionFilter === 'All' || job.division === divisionFilter;
        const matchesSg = sgFilter === 'All' || `SG ${job.salaryGrade}` === sgFilter;

        const deadline = getClosingDate(job);
        const isExpired =
          job.status === 'Expired' ||
          job.status === 'Closed' ||
          isDeadlinePassed(deadline, now);

        let matchesStatus = true;
        if (statusFilter === 'Open') {
          matchesStatus = !isExpired && job.status === 'Open';
        } else if (statusFilter === 'Expired') {
          matchesStatus = isExpired;
        }

        const itemNo = getItemNumber(job).toLowerCase();
        const matchesSearch =
          !s ||
          (job.positionTitle || '').toLowerCase().includes(s) ||
          itemNo.includes(s) ||
          `sg ${job.salaryGrade}`.includes(s) ||
          `sg-${job.salaryGrade}`.includes(s) ||
          (job.division || '').toLowerCase().includes(s);

        return matchesDivision && matchesSg && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const valA = getSortValue(a, sortField);
        const valB = getSortValue(b, sortField);
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [jobs, searchTerm, divisionFilter, sgFilter, statusFilter, sortField, sortAsc]);

  const totalEntries = filteredJobs.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * entriesPerPage;
  const displayedJobs = filteredJobs.slice(startIndex, startIndex + entriesPerPage);

  const handleSort = (field: SortKey) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field !== 'salaryGrade');
    }
  };

  const getSgLevelLabel = (sg: number) => {
    if (sg >= 24) return 'Executive / Managerial';
    if (sg >= 11) return '2nd Level (Professional)';
    return '1st Level (Sub-Professional)';
  };

  const now = Date.now();

  return (
    <div className="space-y-6">
      {/* Official CSC & DA-BFAR Banner */}
      <div className="bg-sky-50 border-l-4 border-[#024794] p-4 rounded-r-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#024794] text-sm">
              DA-BFAR Central Office Plantilla Vacancies
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Central Office (NCR) • Quezon City
            </span>
            <span className="bg-blue-100 text-[#024794] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              RA 7041 / CSC Compliant
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Official publication of authorized Plantilla positions at{' '}
            <strong>
              BFAR Central Office, Fisheries Building Complex, BPI Compound, Brgy. Vasra, Visayas
              Avenue, Diliman, Quezon City
            </strong>
            . Synchronized with{' '}
            <a
              href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
              target="_blank"
              rel="noreferrer"
              className="text-[#024794] font-semibold underline hover:text-blue-700 inline-flex items-center gap-0.5"
            >
              bfar.da.gov.ph/opportunities/job-vacancies-careers
              <ExternalLink className="w-3 h-3 ml-0.5 inline" />
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
            target="_blank"
            rel="noreferrer"
            className="bg-white hover:bg-slate-50 text-[#024794] border border-[#024794]/40 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Verify on Official Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#024794]" />
          </a>
        </div>
      </div>

      {/* Main Streamlined Table Container */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Streamlined Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-700">
              <span className="text-slate-500">Show:</span>
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#024794]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
              <span className="text-slate-500">entries</span>
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="font-semibold text-slate-700">Division:</span>
              <select
                value={divisionFilter}
                onChange={(e) => {
                  setDivisionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:ring-2 focus:ring-[#024794] max-w-[200px]"
              >
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d === 'All' ? 'All Divisions' : d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="font-semibold text-slate-700">Salary Grade:</span>
              <select
                value={sgFilter}
                onChange={(e) => {
                  setSgFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-semibold text-[#024794] focus:ring-2 focus:ring-[#024794]"
              >
                {salaryGrades.map((sg) => (
                  <option key={sg} value={sg}>
                    {sg === 'All' ? 'All Grades' : sg}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="font-semibold text-slate-700">Publication Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'All' | 'Open' | 'Expired');
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#024794]"
              >
                <option value="All">All Publications</option>
                <option value="Open">Active (Open for Application)</option>
                <option value="Expired">Closed / Expired</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-700">Search:</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Search position, SG, item #..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-64 sm:w-72 bg-white border border-slate-300 rounded-md pl-8 pr-7 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#024794]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Streamlined Job Listing Table with Emphasized Salary Grade */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold border-b border-slate-950 select-none">
                <th
                  onClick={() => handleSort('positionTitle')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 min-w-[220px]">
                    <span>Position Title &amp; Division</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('salaryGrade')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap min-w-[140px]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-amber-300 font-bold uppercase tracking-wide">
                      Salary Grade
                    </span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('itemNo')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap min-w-[170px]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Plantilla Item No.</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('postingDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Date Posted</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('closingDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Application Deadline</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center whitespace-nowrap min-w-[180px]">
                  <span>Official Notice &amp; Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#024794] border-t-transparent mb-2"></div>
                    <p>Loading vacancies from BFAR Central Office database...</p>
                  </td>
                </tr>
              ) : displayedJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center px-4">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#024794] flex items-center justify-center mx-auto shadow-xs">
                        <Building className="w-6 h-6 text-[#024794]" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {jobs.length === 0
                          ? 'No official job vacancies are currently available.'
                          : 'No job vacancies match your selected filters.'}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {jobs.length === 0
                          ? 'All official plantilla openings are synchronized with the DA-BFAR Careers directory (https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/). Check back when new vacancies are published.'
                          : 'Try resetting your division, salary grade, or publication status filters to view all official vacancies.'}
                      </p>
                      <div className="pt-2">
                        <a
                          href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#024794] text-white text-xs font-bold hover:bg-blue-900 transition-colors shadow-xs"
                        >
                          <span>Visit Official BFAR Careers Page</span>
                          <ExternalLink className="w-3 h-3 text-sky-200" />
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedJobs.map((job, idx) => {
                  const itemNo = getItemNumber(job);
                  const postedDate = getPostingDate(job);
                  const deadline = getClosingDate(job);
                  const isExpired =
                    job.status === 'Expired' ||
                    job.status === 'Closed' ||
                    isDeadlinePassed(deadline, now);

                  return (
                    <tr
                      key={job.id}
                      className={`hover:bg-blue-50/70 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div
                          className="font-bold text-[#024794] text-sm hover:underline cursor-pointer flex items-center gap-1.5"
                          onClick={() => setSelectedJobForModal(job)}
                        >
                          <span>{job.positionTitle}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                          {job.division}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500">
                            {job.office || 'BFAR Central Office'}
                          </span>
                          <span>•</span>
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                            {job.plantillaType}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-gradient-to-r from-[#024794] to-[#0460c4] text-white shadow-xs tracking-wide">
                            SALARY GRADE {job.salaryGrade}
                          </span>
                          <span className="text-[10px] text-slate-600 font-medium tracking-tight">
                            {getSgLevelLabel(job.salaryGrade)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 block w-fit">
                          {itemNo}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Permanent Plantilla Item
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap text-xs">
                        {postedDate}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded border text-xs inline-flex items-center gap-1 font-bold ${
                            isExpired
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <Clock
                            className={`w-3 h-3 ${isExpired ? 'text-rose-600' : 'text-amber-600'}`}
                          />
                          {deadline}
                        </span>
                        {isExpired ? (
                          <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                            Application Closed (Deadline Passed)
                          </span>
                        ) : (
                          <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                            Accepting Applications
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <a
                            href={
                              job.officialSourceUrl ||
                              'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/'
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white hover:bg-slate-100 text-[#024794] border border-[#024794]/40 px-2.5 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center gap-1 transition-all"
                            title="View Official Vacancy Announcement on bfar.da.gov.ph"
                          >
                            <span>Notice</span>
                            <ExternalLink className="w-3 h-3 text-[#024794]" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setSelectedJobForModal(job)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center gap-1 transition-all"
                            title="View Qualification Standards and Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>Details</span>
                          </button>

                          {isExpired ? (
                            <button
                              type="button"
                              disabled
                              className="bg-slate-200 text-slate-400 px-3 py-1.5 rounded text-xs font-bold cursor-not-allowed shadow-none"
                              title="The application deadline for this position has passed"
                            >
                              <span>Closed</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectJobForApply(job)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                              title="Apply for this Plantilla Vacancy"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Apply</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong>{totalEntries === 0 ? 0 : startIndex + 1}</strong> to{' '}
            <strong>{Math.min(startIndex + entriesPerPage, totalEntries)}</strong> of{' '}
            <strong>{totalEntries}</strong> Plantilla entries
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  currentPage === pg
                    ? 'bg-[#024794] text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Plantilla Vacancy Detail Modal */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="bg-[#024794] text-white p-6 sticky top-0 z-10 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded uppercase">
                    SALARY GRADE {selectedJobForModal.salaryGrade}
                  </span>
                  <span className="bg-blue-800 text-sky-200 font-mono text-xs px-2 py-0.5 rounded">
                    {getItemNumber(selectedJobForModal)}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded font-semibold border border-emerald-400/30">
                    {selectedJobForModal.plantillaType}
                  </span>
                </div>
                <h3 className="text-xl font-black">{selectedJobForModal.positionTitle}</h3>
                <p className="text-xs text-sky-200 mt-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedJobForModal.division} • BFAR Central Office</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobForModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 text-lg"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-700">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#024794] text-white flex items-center justify-center font-black text-lg shadow-xs">
                    SG{selectedJobForModal.salaryGrade}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">
                      Civil Service Position Level
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Official Salary Grade {selectedJobForModal.salaryGrade} (
                      {getSgLevelLabel(selectedJobForModal.salaryGrade)})
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Standard CSC compensation scale applies (monthly monetary rates strictly masked
                      for privacy).
                    </p>
                  </div>
                </div>
                <div className="sm:text-right text-xs space-y-1">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Application Deadline
                    </span>
                    <span className="font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded border border-amber-300 inline-block">
                      {getClosingDate(selectedJobForModal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      Posted: {getPostingDate(selectedJobForModal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-[11px]">
                    <span className="font-bold text-slate-800 block">
                      Verified Official Publication
                    </span>
                    <span className="text-slate-500">
                      Source: DA-BFAR Official Job Opportunities &amp; Careers Portal
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={
                      selectedJobForModal.officialSourceUrl ||
                      'https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#024794] border border-blue-300 font-bold text-xs shadow-2xs transition-colors"
                  >
                    <span>View Official Announcement</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#024794]" />
                  </a>
                </div>
              </div>

              {selectedJobForModal.attachedDocuments &&
                selectedJobForModal.attachedDocuments.length > 0 && (
                  <div className="bg-sky-50/60 p-3 rounded-lg border border-sky-200">
                    <span className="text-[10px] font-bold text-[#024794] uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#024794]" />
                      <span>Official Attached Vacancy Notice Documents</span>
                    </span>
                    <div className="space-y-1">
                      {selectedJobForModal.attachedDocuments.map((doc, dIdx) => (
                        <a
                          key={dIdx}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between bg-white p-2 rounded border border-sky-100 hover:border-blue-300 text-xs transition-colors"
                        >
                          <span className="font-medium text-slate-800 truncate">{doc.name}</span>
                          <span className="text-[10px] font-bold text-[#024794] flex items-center gap-1 shrink-0 ml-2">
                            <span>View Announcement</span>
                            <ExternalLink className="w-3 h-3 text-[#024794]" />
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-[#024794]" />
                  <span>CSC Qualification Standards (QS) Requirements</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-[#024794] block mb-1">Education</span>
                    <p className="text-slate-700">
                      {selectedJobForModal.qualificationStandards.education}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-[#024794] block mb-1">Experience</span>
                    <p className="text-slate-700">
                      {selectedJobForModal.qualificationStandards.experience}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-[#024794] block mb-1">Training</span>
                    <p className="text-slate-700">
                      {selectedJobForModal.qualificationStandards.training}
                    </p>
                    <span className="text-[10px] text-amber-700 block mt-1">
                      *Note: Only formal learning &amp; development counts. Facilitator/RP roles
                      excluded.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-[#024794] block mb-1">Eligibility</span>
                    <p className="text-slate-700">
                      {selectedJobForModal.qualificationStandards.eligibility}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Key Duties and Responsibilities
                </h4>
                <ul className="space-y-1.5 list-disc list-inside bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700">
                  {selectedJobForModal.dutiesAndResponsibilities.map((duty, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {duty}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Required Competencies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedJobForModal.competencies.map((comp, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-50 text-[#024794] border border-blue-200 px-2.5 py-1 rounded text-xs font-semibold"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedJobForModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Close
              </button>
              {(() => {
                const deadline = getClosingDate(selectedJobForModal);
                const isExpired =
                  selectedJobForModal.status === 'Expired' ||
                  selectedJobForModal.status === 'Closed' ||
                  isDeadlinePassed(deadline, now);

                if (isExpired) {
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-600 font-bold hidden sm:inline">
                        Notice: Application deadline has passed.
                      </span>
                      <button
                        type="button"
                        disabled
                        className="bg-slate-200 text-slate-400 px-5 py-2 rounded-lg font-bold shadow-none cursor-not-allowed text-xs"
                      >
                        Application Closed
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => {
                      const job = selectedJobForModal;
                      setSelectedJobForModal(null);
                      onSelectJobForApply(job);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 text-xs"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Apply for this Position</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};