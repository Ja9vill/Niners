import React from 'react';
import { ShieldCheck, Calendar, Eye, Database, FileText, Lock, Users, AlertCircle } from 'lucide-react';

export const PrivacyTab = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Policy Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-950/60 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ShieldCheck size={200} className="text-indigo-400" />
        </div>
        
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400">
            <ShieldCheck size={12} />
            Legal & Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Privacy Policy</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/40 pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-400" />
              Effective date: May 21, 2026
            </span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1.5">
              <Database size={14} className="text-cyan-400" />
              Application: NINE Talent Management Dashboard
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-6">
        
        {/* Section 1: Overview */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Eye size={18} className="text-indigo-400" />
            1. Overview
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            This Privacy Policy explains how the NINE Talent Management Dashboard collects, uses, stores, and shares information when authorized users access and use the application. The dashboard is an internal operational platform for NINE Talent Management and is designed around structured business records stored in official spreadsheet systems used for roster, reporting, and financial workflows.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application is intended for internal agency operations, including roster management, profile management, reporting workflows, and financial review. The current system architecture is built around three connected spreadsheet sources: the DATA MASTERSHEET, the ROSTER REPORTING workbook, and the FINANCIAL DATA SHEET, with <code className="font-mono text-[11px] bg-white/5 px-1.5 py-0.5 rounded text-cyan-400">Poppo ID</code> used as the primary shared key across the system.
          </p>
        </div>

        {/* Section 2: Information Collected */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Database size={18} className="text-cyan-400" />
            2. Information Collected
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans mb-3">
            The application may collect and process the following categories of information:
          </p>
          <ul className="space-y-3 pl-1">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white/90">Identity and Roster Information</span>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">Including Poppo ID, nickname, position, role, status, manager assignment, team assignment, profile photo, profile bio, date ranges, and operational notes.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white/90">Reporting and Performance Information</span>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">Including event records, exposure records, fanbase activity, PK records, weekly performance data, monthly performance data, and related notes tied to internal reporting workflows.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white/90">Financial Information</span>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">Including monthly financial entries and historical ledger data such as earnings categories, commissions, points, salaries, ranks, and levels as defined in the financial workbook schema.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white/90">Authentication and Access-Related Information</span>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">Including internal role and access-control data where used by the application architecture.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white/90">Technical and Operational Information</span>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">Including submission logs, update logs, sync status, validation results, and related system activity needed to maintain the application.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Section 3: How Information Is Used */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <FileText size={18} className="text-emerald-400" />
            3. How Information Is Used
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Information is used to operate, maintain, and improve the internal functions of the dashboard. This includes displaying roster records, supporting profile workflows, processing internal reports, maintaining financial records, syncing data across the authorized spreadsheet systems, validating submissions, and supporting internal oversight and audit functions.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Information may also be used to monitor data integrity, resolve sync issues, investigate submission failures, and maintain administrative visibility into system status. The documented system includes append-only or engine-generated logs such as update logs, submission logs, and version control records to support auditability and operational reliability.
          </p>
        </div>

        {/* Section 4: Data Sources and Storage */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Database size={18} className="text-indigo-400" />
            4. Data Sources and Storage
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application is designed to use official spreadsheet systems as its primary business data layer. These systems include the DATA MASTERSHEET for master identity and roster fields, ROSTER REPORTING for consolidated reporting history, and the FINANCIAL DATA SHEET for finance-specific source collection and financial history.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Data may be read from, written to, synchronized with, or derived from these systems according to documented ownership and sync rules. The intended architecture treats the DATA MASTERSHEET as the top-level authoritative master database, ROSTER REPORTING as a derived reporting layer, and the FINANCIAL DATA SHEET as the finance-domain source system.
          </p>
        </div>

        {/* Section 5: Sharing and Disclosure */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Users size={18} className="text-teal-400" />
            5. Sharing and Disclosure
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Information processed through the application is intended for internal business use within NINE Talent Management. Data may be accessible to authorized directors, managers, staff, or other authorized internal users depending on system role and operational need.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Information may also be shared with service providers or infrastructure platforms that are necessary to operate the application environment, such as hosting, authentication, database, cloud, or spreadsheet services, to the extent needed for system functionality. No statement in this policy should be interpreted as permitting unauthorized public disclosure of internal roster, reporting, or financial records.
          </p>
        </div>

        {/* Section 6: Access Control */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Lock size={18} className="text-amber-400" />
            6. Access Control
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The documented permission model is role-based and distinguishes between director, manager, talent, and public access states within the current technical blueprint. The application may limit access to specific views, forms, records, or workflows based on role, operational responsibility, or system configuration.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Because the system handles internal operational and financial data, access should be restricted to authorized users only. Users are responsible for protecting their credentials, access links, and any exported records they are permitted to access.
          </p>
        </div>

        {/* Section 7: Data Accuracy and User Responsibilities */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <AlertCircle size={18} className="text-rose-400" />
            7. Data Accuracy and User Responsibilities
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Users are expected to enter accurate information and follow internal operating rules when interacting with the platform. The underlying documentation includes restrictions against editing protected fields, protected ranges, engine-generated logs, header rows, timestamp fields, row IDs, or other system-controlled structures.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Users should also avoid changing spreadsheet structures, renaming protected tabs, altering expected column order, or modifying fields outside approved workflows, because those actions can interrupt sync behavior, reporting accuracy, or application reliability.
          </p>
        </div>

        {/* Section 8: Retention */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Calendar size={18} className="text-indigo-400" />
            8. Retention
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Information may be retained for as long as needed to support internal operations, reporting history, financial history, audit requirements, troubleshooting, and business continuity. The documented architecture includes historical and audit-focused structures such as FINANCIAL HISTORY, ROSTER HISTORY, UPDATE LOG, SUBMISSION LOG, and VERSION CONTROL LOG, which indicates an operational need to preserve certain records over time.
          </p>
          <p className="text-xs sm:text-sm text-white/50 font-medium italic">
            Retention periods may vary by record type, business purpose, legal requirement, or administrative decision.
          </p>
        </div>

        {/* Section 9: Security */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Lock size={18} className="text-emerald-400" />
            9. Security
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Reasonable administrative, technical, and operational safeguards should be used to protect internal data processed by the application. These may include role-based access controls, protected spreadsheet ranges, validation rules, controlled sync processes, logging, and restricted editing of system-managed structures.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            No digital system can be guaranteed to be completely secure. Users should understand that the application depends on connected cloud tools and spreadsheet-based operational systems, and security also depends on correct permissions, safe credential handling, and disciplined internal use.
          </p>
        </div>

        {/* Section 10: Third-Party Services */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Eye size={18} className="text-cyan-400" />
            10. Third-Party Services
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application may rely on third-party services and platforms to function, including Google Sheets and related cloud tools used in the current architecture. Depending on implementation, the application environment may also interact with other cloud or infrastructure services used for app hosting, authentication, storage, or synchronization.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Those third-party services operate under their own terms and privacy practices. Internal administrators should review the settings, permissions, and data-handling behavior of any connected services used in the production deployment.
          </p>
        </div>

        {/* Section 11: Children's Privacy */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <ShieldCheck size={18} className="text-indigo-400" />
            11. Children’s Privacy
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application is an internal business operations platform and is not intended for use by children as a consumer-facing service. It is designed for authorized internal or business-related use in connection with NINE Talent Management operations.
          </p>
        </div>

        {/* Section 12: Changes to This Policy */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <FileText size={18} className="text-purple-400" />
            12. Changes to This Policy
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            This Privacy Policy may be updated from time to time to reflect changes in the application, business workflows, connected data systems, legal requirements, or internal governance practices. Updated versions should be posted or otherwise made available through the organization’s normal internal documentation or application channels.
          </p>
        </div>

        {/* Section 13: Contact */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Users size={18} className="text-cyan-400" />
            13. Contact
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Questions about this Privacy Policy, data handling practices, or access to the NINE Talent Management Dashboard should be directed to the appropriate internal administrator, director, or authorized operations lead responsible for the system.
          </p>
        </div>

      </div>
    </div>
  );
};
