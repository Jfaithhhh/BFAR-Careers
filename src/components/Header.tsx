import React, { useState, useEffect } from 'react';
import { Shield, Fish, Award, ExternalLink, UserCheck, Briefcase, FileSearch, Lock } from 'lucide-react';

interface HeaderProps {
  activeTab: 'jobs' | 'apply' | 'track' | 'admin';
  setActiveTab: (tab: 'jobs' | 'apply' | 'track' | 'admin') => void;
  pendingCount?: number;
  openCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 2,
  openCount = 6,
}) => {
  const [pstTime, setPstTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format as Philippine Standard Time (UTC+8)
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

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top GOVPH Bar */}
      <div className="bg-[#0b2447] text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-blue-950">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold tracking-wider text-sky-200">
            <span className="bg-sky-500/20 px-1.5 py-0.5 rounded text-[10px] text-sky-300 font-mono">GOVPH</span>
            <span>REPUBLIC OF THE PHILIPPINES</span>
          </div>
          <span className="hidden md:inline text-blue-400">|</span>
          <span className="hidden md:inline text-slate-300 text-[11px]">
            Official Recruitment &amp; HRMIS Portal
          </span>
        </div>

        <div className="flex items-center space-x-4 text-[11px]">
          <div className="hidden sm:flex items-center space-x-1 text-slate-300">
            <span className="text-amber-400 font-medium">Philippine Standard Time (PST):</span>
            <span className="font-mono text-white">{pstTime || 'Synchronizing...'}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-300">
            <a
              href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-300 flex items-center gap-1 font-semibold text-amber-200 transition-colors"
              title="Official BFAR Job Vacancies"
            >
              <span>bfar.da.gov.ph/careers</span>
              <ExternalLink className="w-3 h-3 text-amber-300" />
            </a>
            <span className="text-blue-500">·</span>
            {/* Restricted HR / HRMPSB Staff Access Gate */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'bg-blue-900/60 hover:bg-blue-800 text-sky-200 border border-blue-700/60'
              }`}
              title="Restricted: Authorized DA-BFAR HR & HRMPSB Personnel Only"
            >
              <Lock className="w-3 h-3 text-amber-300" />
              <span>HR &amp; HRMPSB Portal (Restricted)</span>
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Agency Banner - Official BFAR Identity */}
      <div className="relative bg-white border-b border-slate-200 shadow-xs overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          {/* Official Agency Brand: Dual Transparent Logos + Hierarchical Typography */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="h-14 sm:h-16 w-auto flex items-center justify-center">
                <img
                  src="/assets/ph_coat_of_arms.png"
                  alt="Coat of Arms of the Republic of the Philippines"
                  className="h-14 sm:h-16 w-auto object-contain drop-shadow-xs"
                />
              </div>

              <div className="h-14 sm:h-16 w-auto flex items-center justify-center">
                <img
                  src="/assets/bfar_da_logo.png"
                  alt="Department of Agriculture - Bureau of Fisheries and Aquatic Resources"
                  className="h-14 sm:h-16 w-auto object-contain drop-shadow-xs"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-800 uppercase leading-tight font-sans">
                REPUBLIC OF THE PHILIPPINES
              </span>
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-800 uppercase leading-tight font-sans">
                DEPARTMENT OF AGRICULTURE
              </span>
              <h1 className="text-base sm:text-xl lg:text-2xl font-black text-[#024794] tracking-tight uppercase leading-tight mt-0.5">
                BUREAU OF FISHERIES AND AQUATIC RESOURCES
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                <span className="bg-amber-100 text-amber-900 border border-amber-300/80 text-[10px] px-2 py-0.2 rounded-full font-bold">
                  Central Office (NCR) • Quezon City
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  PCA Bldg., Elliptical Road, Diliman
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

      {/* Public Applicant Navigation Tabs */}
      <nav className="bg-white border-t border-slate-100 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-1 sm:space-x-2 py-2">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'jobs'
                  ? 'bg-blue-50 text-[#024794] border-b-2 border-[#024794]'
                  : 'text-slate-600 hover:text-[#024794] hover:bg-slate-50'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#024794]" />
              <span>Plantilla Vacancies</span>
              <span className="bg-blue-100 text-[#024794] text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                {openCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('apply')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'apply'
                  ? 'bg-blue-50 text-[#024794] border-b-2 border-[#024794]'
                  : 'text-slate-600 hover:text-[#024794] hover:bg-slate-50'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Online Application (AI Fast-Fill)</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                AI Powered
              </span>
            </button>

            <button
              onClick={() => setActiveTab('track')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'track'
                  ? 'bg-blue-50 text-[#024794] border-b-2 border-[#024794]'
                  : 'text-slate-600 hover:text-[#024794] hover:bg-slate-50'
              }`}
            >
              <FileSearch className="w-4 h-4 text-[#024794]" />
              <span>Track Application Status</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center text-xs text-slate-500 gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>PRC RA 1080 &amp; Civil Service Commission Integrated</span>
          </div>
        </div>
      </nav>
    </header>
  );
};
