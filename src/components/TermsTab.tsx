import React from 'react';
import { Scale, Calendar, Landmark, FileText, CheckCircle2, ShieldAlert, AlertTriangle, Key, Users, Eye } from 'lucide-react';

export const TermsTab = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Terms Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-950/60 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Scale size={200} className="text-indigo-400" />
        </div>
        
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400">
            <Scale size={12} />
            Legal & Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Terms of Service</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/40 pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-400" />
              Effective date: May 21, 2026
            </span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1.5">
              <Landmark size={14} className="text-cyan-400" />
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
            <FileText size={18} className="text-indigo-400" />
            1. Overview
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            These Terms of Service govern access to and use of the NINE Talent Management Dashboard. The dashboard is an internal operations application designed to support roster management, reporting workflows, profile management, and financial review using the organization’s official spreadsheet-based data systems.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            By accessing or using the application, the user agrees to comply with these Terms of Service, any related internal policies, and any lawful instructions issued by authorized NINE Talent Management administrators or operations leads.
          </p>
        </div>

        {/* Section 2: Eligibility and Authorized Use */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Users size={18} className="text-cyan-400" />
            2. Eligibility and Authorized Use
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application is intended only for authorized users connected to NINE Talent Management operations. Depending on configuration, access may be limited by role, assignment, employment or contractor status, or other internal approval requirements.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Use of the application is permitted only for legitimate internal business purposes. Unauthorized access, misuse of data, credential sharing, or attempts to bypass access restrictions are prohibited.
          </p>
        </div>

        {/* Section 3: Account Access and Credentials */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Key size={18} className="text-purple-400" />
            3. Account Access and Credentials
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Users may be required to use assigned credentials, identifiers, or other access methods to use the application. The documented architecture includes role and access structures tied to operational records such as Poppo ID and related authorization data.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Users are responsible for maintaining the confidentiality of their credentials and for activities that occur through their access methods, to the extent permitted by law and internal policy. If a credential, device, or account is compromised, the user should notify the appropriate internal administrator immediately.
          </p>
        </div>

        {/* Section 4: Application Purpose */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Landmark size={18} className="text-amber-400" />
            4. Application Purpose
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application is designed to support internal agency workflows, including master roster management, reporting submissions, reporting review, profile management, and financial review. The documented data architecture relies on the DATA MASTERSHEET, ROSTER REPORTING, and FINANCIAL DATA SHEET as the core connected business data systems.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application may display, collect, validate, process, sync, or export information necessary for those internal workflows. All use must remain consistent with the intended internal business purpose of the platform.
          </p>
        </div>

        {/* Section 5: Data Ownership and Source-of-Truth Rules */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <CheckCircle2 size={18} className="text-emerald-400" />
            5. Data Ownership and Source-of-Truth Rules
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The official business records used by the application are governed by the organization’s approved spreadsheet architecture. The DATA MASTERSHEET is documented as the primary source of truth for core roster and operational records, ROSTER REPORTING is the reporting and consolidated history layer, and the FINANCIAL DATA SHEET is the finance-domain workbook for monthly intake and historical financial records.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            A field appearing in one screen or workbook does not change which system owns that field. Users must follow the designated write targets and system ownership rules established for the application and connected spreadsheet systems.
          </p>
        </div>

        {/* Section 6: User Responsibilities */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <CheckCircle2 size={18} className="text-indigo-400" />
            6. User Responsibilities
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans mb-3">
            Users agree to:
          </p>
          <ul className="space-y-2.5 pl-1">
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <span>Provide accurate and complete information when entering or updating records.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <span>Use only approved workflows, forms, and edit locations for data entry and correction.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <span>Respect protected ranges, protected tabs, locked headers, timestamp fields, row IDs, logs, and other system-managed structures.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <span>Avoid actions that could break sync behavior, corrupt reporting outputs, or interfere with financial history or audit trails.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <span>Use exported or viewed internal information only for authorized business purposes.</span>
            </li>
          </ul>
        </div>

        {/* Section 7: Prohibited Conduct */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <ShieldAlert size={18} className="text-rose-400" />
            7. Prohibited Conduct
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans mb-3">
            Users may not:
          </p>
          <ul className="space-y-2.5 pl-1">
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Access the application without authorization or attempt to elevate privileges without approval.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Share internal access credentials or permit unauthorized persons to use the application under their identity.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Alter protected spreadsheet structures, change approved headers, rename protected tabs, reorder required columns, or modify engine-generated logs or timestamp fields contrary to system rules.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Submit false, misleading, duplicate, malicious, or intentionally corrupted records.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Use the application to interfere with internal operations, damage data integrity, or disrupt sync, reporting, or financial workflows.</span>
            </li>
            <li className="flex items-start gap-3 text-xs sm:text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Copy, disclose, or distribute internal records outside authorized business use except as expressly permitted.</span>
            </li>
          </ul>
        </div>

        {/* Section 8: Data Validation, Sync, and Availability */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Landmark size={18} className="text-teal-400" />
            8. Data Validation, Sync, and Availability
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application may enforce validation rules, duplicate prevention, field restrictions, logging, and workflow constraints before accepting or processing data. The technical blueprint specifically documents validation checks, duplicate prevention, append-only logs, and sync rules across reporting inputs, output tabs, and master data structures.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application may also depend on cloud tools, spreadsheet services, scripts, or synchronization processes that are not available at all times. NINE Talent Management does not guarantee uninterrupted or error-free operation, and temporary outages, sync delays, validation failures, or integration issues may occur.
          </p>
        </div>

        {/* Section 9: Financial and Reporting Records */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <FileText size={18} className="text-amber-400" />
            9. Financial and Reporting Records
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Financial records, reporting records, and historical logs may be subject to special handling, restricted editing, or separate approval rules. The documentation specifically distinguishes master operational editing, finance-domain editing, and non-editable audit or engine-generated structures.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Users must not treat display layers, mirrored reports, or derived views as interchangeable with the canonical write locations designated by the system.
          </p>
        </div>

        {/* Section 10: Monitoring and Logs */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Eye size={18} className="text-emerald-400" />
            10. Monitoring and Logs
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Use of the application may be logged for operational, security, validation, or audit purposes. The documented system includes structures such as UPDATE LOG, SUBMISSION LOG, VERSION CONTROL LOG, and other engine-generated or append-only records that support traceability and troubleshooting.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            By using the application, users acknowledge that authorized administrators may review operational logs, sync history, submissions, and related records as necessary to maintain system integrity, investigate issues, or enforce policy.
          </p>
        </div>

        {/* Section 11: Intellectual Property and Internal Materials */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Users size={18} className="text-purple-400" />
            11. Intellectual Property and Internal Materials
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application, its workflow structure, internal forms, documentation, reports, and connected operational materials are intended for internal business use unless otherwise stated. Users may not reproduce, republish, or externally distribute internal materials or data except with authorization.
          </p>
        </div>

        {/* Section 12: Suspension or Termination of Access */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <ShieldAlert size={18} className="text-rose-400" />
            12. Suspension or Termination of Access
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Access may be suspended, limited, or terminated at any time for operational, security, policy, staffing, or compliance reasons. This may include cases involving unauthorized access, misuse, credential compromise, policy violations, inactivity, or business restructuring.
          </p>
          <p className="text-xs sm:text-sm text-white/50 font-medium italic">
            Termination of access does not affect the organization’s rights regarding retained records, audit logs, business data, or prior misuse.
          </p>
        </div>

        {/* Section 13: Disclaimers */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <AlertTriangle size={18} className="text-amber-500" />
            13. Disclaimers
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application is provided for internal business use on an "as available" and "as configured" basis. While reasonable efforts may be made to maintain data integrity, workflow reliability, and system availability, no guarantee is made that all information will always be current, complete, uninterrupted, or error-free.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Users remain responsible for using reasonable judgment and following internal review or approval processes where business decisions depend on application data.
          </p>
        </div>

        {/* Section 14: Limitation of Liability */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <ShieldAlert size={18} className="text-red-400" />
            14. Limitation of Liability
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            To the maximum extent permitted by applicable law, NINE Talent Management and its operators, administrators, or affiliates will not be liable for indirect, incidental, special, consequential, or punitive damages arising out of or related to use of the application, internal workflow interruptions, sync failures, validation issues, access problems, or data-handling incidents.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Nothing in these Terms is intended to exclude liability that cannot lawfully be excluded.
          </p>
        </div>

        {/* Section 15: Changes to the Service or Terms */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <FileText size={18} className="text-slate-400" />
            15. Changes to the Service or Terms
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            The application, connected workflows, spreadsheet architecture, and these Terms of Service may be updated, modified, suspended, or replaced from time to time. Updated terms may be published through internal documentation, administrative notice, or within the application environment.
          </p>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Continued use of the application after updated terms become effective constitutes acceptance of the revised terms, unless applicable law requires a different form of consent.
          </p>
        </div>

        {/* Section 16: Governing Rules and Internal Policies */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Landmark size={18} className="text-blue-400" />
            16. Governing Rules and Internal Policies
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Use of the application is also subject to applicable internal policies, operational rules, access protocols, data-handling expectations, and workflow governance adopted by NINE Talent Management. Where a more specific internal operational rule applies to a given workflow, that rule may supplement these Terms.
          </p>
        </div>

        {/* Section 17: Contact */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Users size={18} className="text-indigo-400" />
            17. Contact
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Questions regarding these Terms of Service, access issues, permissions, or application governance should be directed to the appropriate internal administrator, director, or authorized operations lead responsible for the system.
          </p>
        </div>

      </div>
    </div>
  );
};
