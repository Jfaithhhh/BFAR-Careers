import React from 'react';
import { Shield, Fish, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#0b2447] text-slate-300 text-xs mt-12 border-t-4 border-[#024794]">
      {/* Top GovPH links section */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Seal & Statement */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-auto rounded-lg bg-white/95 px-2.5 py-1 flex items-center gap-2 border border-white/40 shadow-xs shrink-0">
                <img
                  src="/assets/ph_coat_of_arms.png"
                  alt="Coat of Arms of the Philippines"
                  className="h-9 w-auto object-contain"
                />
                <img
                  src="/assets/bfar_da_logo.png"
                  alt="DA-BFAR Official Logo"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div>
                <span className="font-extrabold text-white text-xs block leading-tight">
                  REPUBLIC OF THE PHILIPPINES
                </span>
                <span className="text-[10px] text-sky-300">
                  Department of Agriculture • DA-BFAR
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              All content is in the public domain unless otherwise stated. Bureau of Fisheries and
              Aquatic Resources (BFAR) Recruitment &amp; Selection Unit, PCA Bldg., Elliptical Road,
              Diliman, Quezon City, Metro Manila.
            </p>
            <div className="pt-1">
              <span className="bg-sky-900/60 text-sky-200 border border-sky-700/50 text-[10px] px-2 py-0.5 rounded font-mono">
                HRMIS Version 2.4-AI
              </span>
            </div>
          </div>

          {/* Column 2: About GOVPH */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              ABOUT GOVPH
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Learn more about the Philippine government, its structure, how government works and the
              people behind it.
            </p>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <a href="https://www.gov.ph" target="_blank" rel="noreferrer" className="hover:text-amber-300 flex items-center gap-1">
                  <span>GOV.PH</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a href="https://data.gov.ph" target="_blank" rel="noreferrer" className="hover:text-amber-300 flex items-center gap-1">
                  <span>Open Data Portal</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a href="https://www.officialgazette.gov.ph" target="_blank" rel="noreferrer" className="hover:text-amber-300 flex items-center gap-1">
                  <span>Official Gazette</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Government Links */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              GOVERNMENT LINKS
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <a href="https://president.gov.ph" target="_blank" rel="noreferrer" className="hover:text-amber-300">
                  Office of the President
                </a>
              </li>
              <li>
                <a href="https://da.gov.ph" target="_blank" rel="noreferrer" className="hover:text-amber-300">
                  Department of Agriculture (DA)
                </a>
              </li>
              <li>
                <a href="https://csc.gov.ph" target="_blank" rel="noreferrer" className="hover:text-amber-300">
                  Civil Service Commission (CSC Careers)
                </a>
              </li>
              <li>
                <a href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/" target="_blank" rel="noreferrer" className="hover:text-amber-300 font-semibold text-amber-200">
                  BFAR Careers &amp; Vacancies (bfar.da.gov.ph/careers)
                </a>
              </li>
              <li>
                <a href="https://portal.bfar.da.gov.ph/login" target="_blank" rel="noreferrer" className="hover:text-amber-300">
                  BFAR Official Portal (portal.bfar.da.gov.ph)
                </a>
              </li>
              <li>
                <a href="https://hrmisv2.bfar.da.gov.ph/login" target="_blank" rel="noreferrer" className="hover:text-amber-300">
                  BFAR HRMIS (hrmisv2.bfar.da.gov.ph)
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Civil Service Compliance */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              EQUAL OPPORTUNITY PRINCIPLE
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              The Bureau of Fisheries and Aquatic Resources adheres to the Civil Service Commission’s
              Equal Employment Opportunity Principle (EEOP). There shall be no discrimination in the
              selection of employees on account of age, sex, sexual orientation and gender identity,
              civil status, disability, religion, ethnicity, or political affiliation.
            </p>
            <div className="text-[10px] text-slate-400">
              Hotline: (02) 8539-5685 • Email: <span className="text-sky-300">hrmpsb@bfar.da.gov.ph</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#06152b] py-3 text-center text-[10px] text-slate-400 border-t border-blue-950 px-4">
        Bureau of Fisheries and Aquatic Resources • Department of Agriculture • Republic of the Philippines. All Rights Reserved.
      </div>
    </footer>
  );
};
