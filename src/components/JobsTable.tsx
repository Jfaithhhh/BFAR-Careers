import React, { useState, useMemo } from 'react';
import { PlantillaJob } from '../types';
import {
  Search,
  Filter,
  Eye,
  ArrowUpDown,
  Calendar,
  Building,
  MapPin,
  Banknote,
  GraduationCap,
  Award,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  FileCheck2,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface JobsTableProps {
  jobs: PlantillaJob[];
  onSelectJobForApply: (job: PlantillaJob) => void;
  isLoading?: boolean;
}

export const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  onSelectJobForApply,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof PlantillaJob>('postingDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedJobForModal, setSelectedJobForModal] = useState<PlantillaJob | null>(null);

  // Distinct Central Office divisions for filter
  const divisions = useMemo(() => {
    const list = Array.from(new Set(jobs.map((j) => j.division)));
    return ['All', ...list];
  }, [jobs]);

  // Filtered and sorted jobs
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        const matchesDivision = divisionFilter === 'All' || job.division === divisionFilter;
        const s = searchTerm.toLowerCase();
        const matchesSearch =
          job.positionTitle.toLowerCase().includes(s) ||
          job.itemNo.toLowerCase().includes(s) ||
          job.agency.toLowerCase().includes(s) ||
          job.region.toLowerCase().includes(s) ||
          job.division.toLowerCase().includes(s);
        return matchesDivision && matchesSearch;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [jobs, searchTerm, divisionFilter, sortField, sortAsc]);

  // Pagination calculation
  const totalEntries = filteredJobs.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const displayedJobs = filteredJobs.slice(startIndex, startIndex + entriesPerPage);

  const handleSort = (field: keyof PlantillaJob) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Notice / CSC Notice */}
      <div className="bg-sky-50 border-l-4 border-[#024794] p-4 rounded-r-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#024794] text-sm">
              CSC &amp; DA-BFAR Central Office Plantilla Vacancies
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Central Office (NCR) • Quezon City
            </span>
            <span className="bg-blue-100 text-[#024794] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              RA 7041 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Station: <strong>BFAR Central Office, PCA Building, Elliptical Road, Diliman, Quezon City</strong>.
            All vacancies are officially posted pursuant to Civil Service rules and synchronized with{' '}
            <a
              href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
              target="_blank"
              rel="noreferrer"
              className="text-[#024794] font-semibold underline hover:text-blue-700"
            >
              bfar.da.gov.ph/opportunities/job-vacancies-careers
            </a>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
            target="_blank"
            rel="noreferrer"
            className="bg-white hover:bg-slate-50 text-[#024794] border border-[#024794]/40 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            title="Verify directly on official BFAR Careers page"
          >
            <span>Verify on Official bfar.da.gov.ph</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#024794]" />
          </a>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700">Division:</span>
            <select
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#024794] max-w-[200px]"
            >
              {divisions.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Central Office Divisions' : d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container replicating CSC Portal Layout */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Controls Bar: Show X entries & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-700">
            <span>Show</span>
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
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-700">Search:</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Search position, plantilla #, region..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-60 sm:w-72 bg-white border border-slate-300 rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#024794]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table replicating CSC careers table columns */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold border-b border-slate-900 select-none">
                <th
                  onClick={() => handleSort('agency')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Agency</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('region')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Region</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('positionTitle')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 min-w-[200px]">
                    <span>Position Title</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('itemNo')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Plantilla Item No.</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('postingDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Posting Date</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('closingDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Closing Date</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center whitespace-nowrap">
                  <span>Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#024794] border-t-transparent mb-2"></div>
                    <p>Loading vacancies from BFAR and CSC databases...</p>
                  </td>
                </tr>
              ) : displayedJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">No matching Plantilla vacancies found.</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or filter.</p>
                  </td>
                </tr>
              ) : (
                displayedJobs.map((job, idx) => (
                  <tr
                    key={job.id}
                    className={`hover:bg-blue-50/70 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-800 text-[11px] max-w-[180px]">
                      {job.agency}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-[11px]">
                        Central Office (NCR)
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Diliman, Quezon City
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#024794] hover:underline cursor-pointer"
                           onClick={() => setSelectedJobForModal(job)}>
                        {job.positionTitle}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-bold text-[#024794] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Salary Grade: SG-{job.salaryGrade}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500 truncate max-w-[280px]">
                          {job.division}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {job.itemNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {job.postingDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {job.closingDate}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setSelectedJobForModal(job)}
                          className="bg-[#1b73e8] hover:bg-[#1557b0] text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center gap-1 transition-all active:scale-95"
                          title="View Qualification Standards and Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                        <button
                          onClick={() => onSelectJobForApply(job)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center gap-1 transition-all active:scale-95"
                          title="Apply now using AI Form Assistant"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Apply</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Status Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing {totalEntries > 0 ? startIndex + 1 : 0} to{' '}
            {Math.min(startIndex + entriesPerPage, totalEntries)} of {totalEntries} entries
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded border text-xs font-semibold ${
                  currentPage === page
                    ? 'bg-[#024794] text-white border-[#024794]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* JOB DETAILS MODAL */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#024794] text-white p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    CSC Plantilla Item
                  </span>
                  <span className="text-sky-200 text-xs font-mono">
                    {selectedJobForModal.itemNo}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{selectedJobForModal.positionTitle}</h2>
                <p className="text-xs text-sky-100 mt-1">
                  {selectedJobForModal.agency} • {selectedJobForModal.region}
                </p>
              </div>
              <button
                onClick={() => setSelectedJobForModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Key Quick Facts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Salary Grade
                  </span>
                  <span className="font-extrabold text-sm text-[#024794]">
                    SG-{selectedJobForModal.salaryGrade}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Plantilla Classification
                  </span>
                  <span className="font-extrabold text-sm text-[#024794]">
                    Authorized Plantilla
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Status of Appointment
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedJobForModal.plantillaType}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Application Deadline
                  </span>
                  <span className="font-semibold text-red-600">
                    {selectedJobForModal.closingDate}
                  </span>
                </div>
              </div>

              {/* Assignment & Division */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#024794]" />
                  <span>Division &amp; Station of Assignment</span>
                </h3>
                <p className="bg-slate-50 p-3 rounded border border-slate-200 font-medium">
                  {selectedJobForModal.division}
                  <br />
                  <span className="text-slate-500 text-[11px]">{selectedJobForModal.placeOfAssignment}</span>
                </p>
              </div>

              {/* Civil Service Commission Qualification Standards (QS) Matrix */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#024794]" />
                  <span>Civil Service Commission Qualification Standards (QS)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#024794] mb-1">
                      <GraduationCap className="w-4 h-4" />
                      <span>Education Requirement</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedJobForModal.qualificationStandards.education}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#024794] mb-1">
                      <Clock className="w-4 h-4" />
                      <span>Experience Requirement</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedJobForModal.qualificationStandards.experience}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#024794] mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>Training Requirement</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedJobForModal.qualificationStandards.training}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#024794] mb-1">
                      <FileCheck2 className="w-4 h-4" />
                      <span>Civil Service / PRC Eligibility</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedJobForModal.qualificationStandards.eligibility}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duties and Responsibilities */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">
                  Duties and Responsibilities
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 leading-relaxed">
                  {selectedJobForModal.dutiesAndResponsibilities.map((duty, idx) => (
                    <li key={idx}>{duty}</li>
                  ))}
                </ul>
              </div>

              {/* Core Competencies */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">Required Competencies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJobForModal.competencies.map((comp, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-50 text-[#024794] border border-blue-200 px-2.5 py-1 rounded-md text-[11px] font-medium"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">
                Closing date: <strong className="text-slate-800">{selectedJobForModal.closingDate}</strong>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedJobForModal(null)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const job = selectedJobForModal;
                    setSelectedJobForModal(null);
                    onSelectJobForApply(job);
                  }}
                  className="px-5 py-2 rounded-md bg-[#024794] hover:bg-[#033b7a] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Apply with AI Fast-Fill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
