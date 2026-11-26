import React from 'react';
import { ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#024794] text-sky-100 text-xs mt-12 border-t-4 border-amber-400 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-auto rounded-xl bg-white px-2.5 py-1 flex items-center gap-2 border border-slate-200 shadow-xs shrink-0">
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
                <span className="font-black text-white text-xs block leading-tight">
                  REPUBLIC OF THE PHILIPPINES
                </span>
                <span className="text-[10px] text-amber-300 font-semibold">
                  Department of Agriculture • DA-BFAR
                </span>
              </div>
            </div>
            <p className="text-[11px] text-sky-100/90 leading-relaxed">
              All content is in the public domain unless otherwise stated. Bureau of Fisheries and
              Aquatic Resources (BFAR) Recruitment &amp; Selection Unit, PCA Bldg., Elliptical Road,
              Diliman, Quezon City, Metro Manila.
            </p>
            <div className="pt-1">
              <span className="bg-white/10 text-amber-300 border border-white/20 text-[10px] px-2.5 py-0.5 rounded font-mono font-semibold">
                HRMIS Version 2.4-AI
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              ABOUT GOVPH
            </h4>
            <p className="text-[11px] text-sky-100/90 leading-relaxed mb-3">
              Learn more about the Philippine government, its structure, how government works and the
              people behind it.
            </p>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <a
                  href="https://www.gov.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <span>GOV.PH</span>
                  <ExternalLink className="w-2.5 h-2.5 text-amber-300/80" />
                </a>
              </li>
              <li>
                <a
                  href="https://data.gov.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <span>Open Data Portal</span>
                  <ExternalLink className="w-2.5 h-2.5 text-amber-300/80" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.officialgazette.gov.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <span>Official Gazette</span>
                  <ExternalLink className="w-2.5 h-2.5 text-amber-300/80" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              GOVERNMENT LINKS
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <a
                  href="https://president.gov.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition-colors"
                >
                  Office of the President
                </a>
              </li>
              <li>
                <a
                  href="https://da.gov.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition-colors"
                >
                  Department of Agriculture (DA)
                </a>
              </li>
              <li>
                <a
                  href="https://csc.gov.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition-colors"
                >
                  Civil Service Commission (CSC Careers)
                </a>
              </li>
              <li>
                <a
                  href="https://www.bfar.da.gov.ph/opportunities/job-vacancies-careers/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 font-semibold text-amber-300 transition-colors"
                >
                  BFAR Careers &amp; Vacancies (bfar.da.gov.ph/careers)
                </a>
              </li>
              <li>
                <a
                  href="https://portal.bfar.da.gov.ph/login"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition-colors"
                >
                  BFAR Official Portal (portal.bfar.da.gov.ph)
                </a>
              </li>
              <li>
                <a
                  href="https://hrmisv2.bfar.da.gov.ph/login"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition-colors"
                >
                  BFAR HRMIS (hrmisv2.bfar.da.gov.ph)
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              EQUAL OPPORTUNITY PRINCIPLE
            </h4>
            <p className="text-[11px] text-sky-100/90 leading-relaxed mb-3">
              The Bureau of Fisheries and Aquatic Resources adheres to the Civil Service Commission’s
              Equal Employment Opportunity Principle (EEOP). There shall be no discrimination in the
              selection of employees on account of age, sex, sexual orientation and gender identity,
              civil status, disability, religion, ethnicity, or political affiliation.
            </p>
            <div className="text-[10px] text-sky-100/90">
              Hotline: <span className="text-white font-semibold">(02) 8539-5685</span> • Email:{' '}
              <span className="text-amber-300 font-semibold">hrmpsb@bfar.da.gov.ph</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#033b7a] py-3 text-center text-[10px] text-sky-100 border-t border-white/15 px-4">
        Bureau of Fisheries and Aquatic Resources • Department of Agriculture • Republic of the
        Philippines. All Rights Reserved.
      </div>
    </footer>
  );
};