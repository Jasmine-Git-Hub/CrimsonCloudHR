import React, { useState, useEffect } from 'react';
import { GraduationCap, CheckCircle, Clock, BookOpen, ExternalLink, Loader2, Calendar, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { auth, db } from '../../../config/firebaseSetup';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface TrainingRecord {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'Ongoing' | 'Completed';
  dueDate: string;
  completionDate?: string;
  link?: string;
}

interface RecommendedModule {
  title: string;
  description: string;
  tag: string;
  duration: string;
  link: string; // 🟢 Dinagdag natin ang link para clickable
}

// ─── COMPLETE ROLE-BASED MODULE MAP (ALL 45 ROLES WITH LINKS) ──────────────
const ROLE_MODULES: Record<string, RecommendedModule[]> = {
  // ── HUMAN RESOURCES ──
  'HR Assistant': [
    { title: 'HR Fundamentals', description: 'Core concepts of HR management and employee relations.', tag: 'Foundation', duration: '3 hrs', link: 'https://www.coursera.org/learn/managing-human-resources' },
    { title: 'Onboarding Excellence', description: 'Designing onboarding programs that retain talent.', tag: 'Process', duration: '2 hrs', link: 'https://www.youtube.com/watch?v=Xh0YqJkXUvM' },
    { title: 'Labor Law Basics', description: 'Introduction to Philippine labor code and employee rights.', tag: 'Legal', duration: '4 hrs', link: 'https://bwc.dole.gov.ph/faqs-on-labor-standards' },
    { title: 'HRIS Tools', description: 'Using systems for records management and data accuracy.', tag: 'Tools', duration: '2 hrs', link: 'https://www.bamboohr.com/hr-glossary/hris/' },
  ],
  'HR Generalist': [
    { title: 'Talent Acquisition', description: 'End-to-end recruitment and candidate experience.', tag: 'Recruitment', duration: '4 hrs', link: 'https://www.coursera.org/specializations/human-resource-management' },
    { title: 'Performance Management', description: 'Setting KPIs, appraisals, and improvement plans.', tag: 'Management', duration: '3 hrs', link: 'https://www.youtube.com/watch?v=J_P3Qk3_Ijw' },
    { title: 'Employee Engagement', description: 'Strategies to build engagement and reduce attrition.', tag: 'Culture', duration: '3 hrs', link: 'https://www.gallup.com/workplace/285674/improve-employee-engagement-workplace.aspx' },
    { title: 'Compensation Basics', description: 'Structuring pay grades and benefits packages.', tag: 'Compensation', duration: '3 hrs', link: 'https://www.aihr.com/blog/compensation-and-benefits/' },
  ],
  'Recruitment Specialist': [
    { title: 'Advanced Sourcing', description: 'LinkedIn Recruiter, Boolean search, and passive outreach.', tag: 'Sourcing', duration: '4 hrs', link: 'https://business.linkedin.com/talent-solutions/resources/recruiting-tips' },
    { title: 'Behavioral Interviewing', description: 'STAR method and competency-based interviews.', tag: 'Interviewing', duration: '3 hrs', link: 'https://www.youtube.com/watch?v=WalJ_N_1Z0A' },
    { title: 'Employer Branding', description: 'Promoting the employer value proposition (EVP).', tag: 'Branding', duration: '2 hrs', link: 'https://www.hubspot.com/employer-brand' },
    { title: 'Recruitment Analytics', description: 'Measuring key recruitment metrics and ATS usage.', tag: 'Analytics', duration: '2 hrs', link: 'https://workable.com/resources/recruitment-metrics' },
  ],
  'Payroll Officer': [
    { title: 'PH Payroll Processing', description: 'Payroll computation and statutory deductions (SSS, PhilHealth).', tag: 'Payroll', duration: '5 hrs', link: 'https://sprout.ph/blog/how-to-compute-payroll-in-the-philippines/' },
    { title: 'Tax & BIR Reporting', description: 'Income tax return, alphalist, and compliance.', tag: 'Tax', duration: '4 hrs', link: 'https://www.bir.gov.ph/' },
    { title: 'Leave Management', description: 'Administering policies, holiday pay, and timekeeping.', tag: 'Operations', duration: '2 hrs', link: 'https://dole.gov.ph/labor-standards/' },
    { title: 'Payroll Software Basics', description: 'Hands-on training with HRIS and payroll tools.', tag: 'Tools', duration: '3 hrs', link: 'https://sprout.ph/resources/' },
  ],
  'HR Manager': [
    { title: 'Strategic HR', description: 'Aligning HR strategy with overall business goals.', tag: 'Strategy', duration: '5 hrs', link: 'https://www.coursera.org/learn/managing-human-resources' },
    { title: 'Labor Relations', description: 'Handling grievances and constructive employee relations.', tag: 'Legal', duration: '4 hrs', link: 'https://www.youtube.com/watch?v=mD2b05Nnsy8' },
    { title: 'HR Dashboards', description: 'Data-driven decisions using people analytics.', tag: 'Analytics', duration: '3 hrs', link: 'https://www.aihr.com/blog/hr-dashboards/' },
    { title: 'Coaching Skills', description: 'Developing team leads and succession planning.', tag: 'Leadership', duration: '4 hrs', link: 'https://www.coursera.org/learn/coaching-practices' },
  ],
  'HR Director': [
    { title: 'Executive HR Leadership', description: 'Board-level reporting and organizational transformation.', tag: 'Leadership', duration: '6 hrs', link: 'https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-new-possible-how-hr-can-help-build-the-organization-of-the-future' },
    { title: 'Change Management', description: 'Leading large-scale culture initiatives and mergers.', tag: 'Strategy', duration: '5 hrs', link: 'https://hbr.org/topic/change-management' },
    { title: 'Total Rewards Architecture', description: 'Designing comprehensive compensation philosophy.', tag: 'Compensation', duration: '4 hrs', link: 'https://www.worldatwork.org/resources' },
    { title: 'DE&I Strategy', description: 'Building inclusive workplaces through equity programs.', tag: 'Culture', duration: '4 hrs', link: 'https://www.coursera.org/learn/diversity-inclusion-workplace' },
  ],

  // ── INFORMATION TECHNOLOGY ──
  'IT Support Specialist': [
    { title: 'Helpdesk Fundamentals', description: 'Ticketing systems, SLA management, and tier-1 support.', tag: 'Support', duration: '3 hrs', link: 'https://www.coursera.org/professional-certificates/google-it-support' },
    { title: 'Networking Essentials', description: 'TCP/IP, DNS, DHCP, and basic troubleshooting.', tag: 'Networking', duration: '4 hrs', link: 'https://www.youtube.com/watch?v=qiQR5rTSshw' },
    { title: 'Cybersecurity Awareness', description: 'Phishing, endpoint protection, and incident response.', tag: 'Security', duration: '3 hrs', link: 'https://www.coursera.org/learn/foundations-of-cybersecurity' },
    { title: 'OS Administration', description: 'Windows/macOS config and Active Directory basics.', tag: 'Systems', duration: '3 hrs', link: 'https://docs.microsoft.com/en-us/windows-server/' },
  ],
  'Frontend Developer': [
    { title: 'Modern React & TS', description: 'Hooks, context, state management, and TypeScript.', tag: 'React', duration: '6 hrs', link: 'https://react.dev/learn' },
    { title: 'Tailwind CSS', description: 'Utility-first design, Flexbox, and CSS Grid.', tag: 'UI', duration: '4 hrs', link: 'https://tailwindcss.com/docs/installation' },
    { title: 'Web Performance', description: 'Core Web Vitals, lazy loading, and optimization.', tag: 'Performance', duration: '3 hrs', link: 'https://web.dev/learn/performance/' },
    { title: 'Web Accessibility', description: 'WCAG 2.1 compliance and ARIA roles.', tag: 'A11y', duration: '3 hrs', link: 'https://www.freecodecamp.org/learn/responsive-web-design/' },
  ],
  'Backend Developer': [
    { title: 'RESTful API Design', description: 'API versioning, error handling, and authentication.', tag: 'API', duration: '4 hrs', link: 'https://restfulapi.net/' },
    { title: 'Database Optimization', description: 'Indexing strategies, query optimization, and schema design.', tag: 'Database', duration: '5 hrs', link: 'https://www.freecodecamp.org/learn/relational-database/' },
    { title: 'Node.js Backend', description: 'Server-side architecture and async patterns.', tag: 'Backend', duration: '6 hrs', link: 'https://nodejs.org/en/learn' },
    { title: 'OWASP Top 10', description: 'SQL injection, XSS, and secure coding practices.', tag: 'Security', duration: '4 hrs', link: 'https://owasp.org/www-project-top-ten/' },
  ],
  'Full Stack Software Engineer': [
    { title: 'Full Stack Architecture', description: 'Monolith vs microservices, BFF pattern.', tag: 'Architecture', duration: '5 hrs', link: 'https://www.coursera.org/specializations/full-stack-react' },
    { title: 'CI/CD Pipelines', description: 'GitHub Actions and automated testing setups.', tag: 'DevOps', duration: '4 hrs', link: 'https://docs.github.com/en/actions' },
    { title: 'Cloud: Firebase & AWS', description: 'Firestore, Cloud Functions, and serverless essentials.', tag: 'Cloud', duration: '4 hrs', link: 'https://firebase.google.com/docs/guides' },
    { title: 'E2E Testing', description: 'Jest, React Testing Library, and Cypress.', tag: 'Testing', duration: '4 hrs', link: 'https://testing-library.com/docs/' },
  ],
  'Systems Administrator': [
    { title: 'Linux Administration', description: 'Shell scripting, cron jobs, and server hardening.', tag: 'Linux', duration: '6 hrs', link: 'https://www.edx.org/learn/linux' },
    { title: 'Network Security', description: 'Firewall rules, VPN config, and intrusion detection.', tag: 'Security', duration: '5 hrs', link: 'https://www.coursera.org/learn/network-security' },
    { title: 'Disaster Recovery', description: 'Backup strategies and RTO/RPO management.', tag: 'BCP', duration: '3 hrs', link: 'https://aws.amazon.com/disaster-recovery/' },
    { title: 'Virtualization', description: 'VMware, Hyper-V, and Docker fundamentals.', tag: 'Infrastructure', duration: '4 hrs', link: 'https://www.docker.com/101-tutorial/' },
  ],
  'IT Project Manager': [
    { title: 'Scrum Mastery', description: 'Sprint planning, retrospectives, and backlog grooming.', tag: 'Agile', duration: '5 hrs', link: 'https://www.scrum.org/resources' },
    { title: 'IT Risk Management', description: 'Risk identification and stakeholder communication.', tag: 'Risk', duration: '3 hrs', link: 'https://www.pmi.org/learning/library/risk-management' },
    { title: 'Software Budgeting', description: 'Story points, resource planning, and cost management.', tag: 'Planning', duration: '3 hrs', link: 'https://www.atlassian.com/agile/project-management/estimation' },
    { title: 'Jira & Confluence', description: 'Practical use of project management tools.', tag: 'Tools', duration: '2 hrs', link: 'https://www.atlassian.com/software/jira/guides' },
  ],
  'CTO': [
    { title: 'Tech Strategy', description: 'Defining technical vision and multi-year roadmaps.', tag: 'Strategy', duration: '6 hrs', link: 'https://hbr.org/topic/technology-and-analytics' },
    { title: 'Engineering Leadership', description: 'Hiring and growing high-performing tech teams.', tag: 'Leadership', duration: '5 hrs', link: 'https://lethain.com/engineering-management/' },
    { title: 'AI Integration', description: 'Evaluating AI/ML adoption and gen-AI strategy.', tag: 'Innovation', duration: '5 hrs', link: 'https://www.deeplearning.ai/' },
    { title: 'Tech Governance', description: 'Information security governance and IT risk frameworks.', tag: 'Governance', duration: '4 hrs', link: 'https://isaca.org/resources' },
  ],

  // ── FINANCE / ACCOUNTING ──
  'Accounting Assistant': [
    { title: 'Bookkeeping Entries', description: 'Double-entry accounting, chart of accounts, and ledgers.', tag: 'Accounting', duration: '4 hrs', link: 'https://corporatefinanceinstitute.com/resources/accounting/journal-entries-guide/' },
    { title: 'AP & AR Management', description: 'Processing invoices and payment reconciliation.', tag: 'AP/AR', duration: '3 hrs', link: 'https://www.youtube.com/watch?v=hB9iC36o7g8' },
    { title: 'Excel for Accounting', description: 'VLOOKUP, pivot tables, and spreadsheet reconciliation.', tag: 'Tools', duration: '3 hrs', link: 'https://exceljet.net/' },
    { title: 'BIR Tax Basics', description: 'VAT, withholding tax, and basic filing obligations.', tag: 'Tax', duration: '3 hrs', link: 'https://www.bir.gov.ph/' },
  ],
  'Junior Accountant': [
    { title: 'Financial Statements', description: 'Preparing income statements and balance sheets.', tag: 'Reporting', duration: '5 hrs', link: 'https://corporatefinanceinstitute.com/resources/accounting/financial-statements/' },
    { title: 'Month-End Close', description: 'Closing procedures, accruals, and prepayments.', tag: 'Closing', duration: '4 hrs', link: 'https://www.journalofaccountancy.com/' },
    { title: 'QuickBooks/Xero Basics', description: 'Posting transactions and generating reports.', tag: 'Tools', duration: '4 hrs', link: 'https://quickbooks.intuit.com/learn-support/' },
    { title: 'Audit Readiness', description: 'Documentation and preparing for external audits.', tag: 'Audit', duration: '3 hrs', link: 'https://www.investopedia.com/terms/a/audit.asp' },
  ],
  'Senior Accountant': [
    { title: 'PFRS/IFRS Standards', description: 'Philippine Financial Reporting Standards application.', tag: 'Standards', duration: '6 hrs', link: 'https://www.ifrs.org/' },
    { title: 'Tax Optimization', description: 'Legal tax strategies and BIR exam readiness.', tag: 'Tax', duration: '5 hrs', link: 'https://pwc.com/ph/en/tax.html' },
    { title: 'Group Consolidation', description: 'Intercompany eliminations and consolidated statements.', tag: 'Consolidation', duration: '4 hrs', link: 'https://corporatefinanceinstitute.com/resources/accounting/consolidated-financial-statements/' },
    { title: 'Accounting Leadership', description: 'Reviewing junior work and leading month-end.', tag: 'Leadership', duration: '3 hrs', link: 'https://www.imanet.org/' },
  ],
  'Financial Analyst': [
    { title: 'Financial Modeling', description: 'Building DCF and comparable company models.', tag: 'Modeling', duration: '6 hrs', link: 'https://corporatefinanceinstitute.com/resources/financial-modeling/' },
    { title: 'Budgeting & Forecasting', description: 'Rolling forecasts and variance analysis.', tag: 'Planning', duration: '4 hrs', link: 'https://www.wallstreetprep.com/' },
    { title: 'Power BI for Finance', description: 'Creating financial dashboards and KPI tracking.', tag: 'Analytics', duration: '4 hrs', link: 'https://learn.microsoft.com/en-us/power-bi/' },
    { title: 'Capital Allocation', description: 'NPV, IRR, and capital budgeting frameworks.', tag: 'Investment', duration: '4 hrs', link: 'https://www.investopedia.com/terms/c/capitalbudgeting.asp' },
  ],
  'Finance Manager': [
    { title: 'Strategic Finance', description: 'Working capital optimization and long-range planning.', tag: 'Strategy', duration: '5 hrs', link: 'https://www.coursera.org/learn/financial-management' },
    { title: 'Financial Risk Management', description: 'FX risk, liquidity risk, and hedging strategies.', tag: 'Risk', duration: '4 hrs', link: 'https://www.investopedia.com/terms/r/riskmanagement.asp' },
    { title: 'Business Partnering', description: 'Collaborating with ops and sales to drive performance.', tag: 'Partnership', duration: '3 hrs', link: 'https://www.cgap.org/' },
    { title: 'Executive Reporting', description: 'Presenting financial results and executive commentary.', tag: 'Reporting', duration: '3 hrs', link: 'https://hbr.org/topic/finance-and-accounting' },
  ],
  'CFO': [
    { title: 'CFO Leadership', description: 'Strategic advisor, capital allocator, and value driver.', tag: 'Leadership', duration: '6 hrs', link: 'https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights' },
    { title: 'Mergers & Acquisitions', description: 'M&A process, due diligence, and deal structuring.', tag: 'M&A', duration: '6 hrs', link: 'https://corporatefinanceinstitute.com/resources/valuation/mergers-acquisitions-m-a/' },
    { title: 'Investor Relations', description: 'Communicating with investors and debt markets.', tag: 'IR', duration: '5 hrs', link: 'https://www.niri.org/' },
    { title: 'Corporate Governance', description: 'Audit committee responsibilities and ERM.', tag: 'Governance', duration: '5 hrs', link: 'https://www.oecd.org/corporate/' },
  ],

  // ── SALES ──
  'Sales Representative': [
    { title: 'Inbound Sales', description: 'Building pipelines, cold outreach, and CRM basics.', tag: 'Foundation', duration: '3 hrs', link: 'https://academy.hubspot.com/courses/inbound-sales' },
    { title: 'Consultative Selling', description: 'Needs discovery and objection handling.', tag: 'Selling', duration: '4 hrs', link: 'https://www.youtube.com/watch?v=J8rK_d_f8q4' },
    { title: 'Product Positioning', description: 'Deep-dive into competitive positioning.', tag: 'Product', duration: '2 hrs', link: 'https://www.productmarketingalliance.com/' },
    { title: 'CRM Tools (HubSpot)', description: 'Logging activities and managing deals.', tag: 'Tools', duration: '2 hrs', link: 'https://academy.hubspot.com/courses/hubspot-sales-software' },
  ],
  'Account Executive': [
    { title: 'Account Management', description: 'Upselling, cross-selling, and renewal strategies.', tag: 'Account', duration: '4 hrs', link: 'https://www.salesforce.com/resources/articles/account-management/' },
    { title: 'Deal Closing', description: 'Advanced negotiation tactics for multi-stakeholder deals.', tag: 'Negotiation', duration: '4 hrs', link: 'https://www.hubspot.com/sales/negotiation' },
    { title: 'Sales Presentations', description: 'Storytelling and executive-level demos.', tag: 'Presentation', duration: '3 hrs', link: 'https://hbr.org/topic/presentations' },
    { title: 'Contract Management', description: 'Understanding SLAs and terms & conditions.', tag: 'Legal', duration: '2 hrs', link: 'https://www.docusign.com/blog' },
  ],
  'Business Development Manager': [
    { title: 'Market Research', description: 'Competitive landscape analysis and TAM/SAM/SOM.', tag: 'Research', duration: '4 hrs', link: 'https://www.coursera.org/learn/market-research' },
    { title: 'Partnership Management', description: 'Building channel partnerships and co-selling.', tag: 'Partnerships', duration: '4 hrs', link: 'https://partnerstack.com/' },
    { title: 'RFP Responses', description: 'Crafting proposals and pricing models.', tag: 'Proposals', duration: '3 hrs', link: 'https://www.rfp360.com/blog' },
    { title: 'Enterprise Sales', description: 'Navigating large organizations and C-suite sales.', tag: 'Enterprise', duration: '3 hrs', link: 'https://www.gong.io/blog/enterprise-sales/' },
  ],
  'Sales Manager': [
    { title: 'Sales Team Coaching', description: 'Pipeline reviews and performance management.', tag: 'Coaching', duration: '5 hrs', link: 'https://www.saleshacker.com/' },
    { title: 'Sales Forecasting', description: 'Forecast accuracy and revenue operations.', tag: 'Analytics', duration: '4 hrs', link: 'https://trailhead.salesforce.com/' },
    { title: 'Territory Planning', description: 'Account tiering and resource allocation.', tag: 'Planning', duration: '3 hrs', link: 'https://www.hubspot.com/sales/territory-management' },
    { title: 'Sales Enablement', description: 'Playbooks and onboarding new reps.', tag: 'Enablement', duration: '4 hrs', link: 'https://www.highspot.com/sales-enablement/' },
  ],
  'VP of Sales': [
    { title: 'Revenue Operations', description: 'Aligning sales and marketing for growth.', tag: 'RevOps', duration: '6 hrs', link: 'https://www.revops.io/' },
    { title: 'Sales Org Design', description: 'Structuring compensation plans and culture.', tag: 'Leadership', duration: '5 hrs', link: 'https://hbr.org/topic/sales' },
    { title: 'Enterprise Strategy', description: 'Complex deal navigation and long sales cycles.', tag: 'Strategy', duration: '5 hrs', link: 'https://business.linkedin.com/sales-solutions' },
    { title: 'Board Reporting', description: 'OKR alignment and top-line revenue accountability.', tag: 'Reporting', duration: '4 hrs', link: 'https://www.saastr.com/' },
  ],

  // ── MARKETING ──
  'Marketing Assistant': [
    { title: 'Inbound Marketing', description: 'Buyer personas and content strategies.', tag: 'Foundation', duration: '4 hrs', link: 'https://academy.hubspot.com/courses/inbound-marketing' },
    { title: 'Social Media Basics', description: 'Content calendars and scheduling tools.', tag: 'Social Media', duration: '3 hrs', link: 'https://academy.hubspot.com/courses/social-media' },
    { title: 'Canva Design', description: 'Creating marketing materials and brand consistency.', tag: 'Design', duration: '2 hrs', link: 'https://designschool.canva.com/' },
    { title: 'Email Marketing', description: 'List management and open rate optimization.', tag: 'Email', duration: '2 hrs', link: 'https://academy.hubspot.com/courses/email-marketing' },
  ],
  'Social Media Specialist': [
    { title: 'Social Strategy', description: 'Platform algorithms and community management.', tag: 'Strategy', duration: '4 hrs', link: 'https://later.com/training/' },
    { title: 'Content & Video Editing', description: 'Short-form video hooks and storytelling.', tag: 'Content', duration: '4 hrs', link: 'https://www.youtube.com/creators/' },
    { title: 'Social Analytics', description: 'Meta Business Suite and measuring ROI.', tag: 'Analytics', duration: '3 hrs', link: 'https://analytics.twitter.com/' },
    { title: 'Paid Social Ads', description: 'Meta Ads and audience targeting optimization.', tag: 'Paid Ads', duration: '4 hrs', link: 'https://www.facebook.com/business/learn' },
  ],
  'SEO Specialist': [
    { title: 'Technical SEO', description: 'Crawlability, schema markup, and site speed.', tag: 'Technical', duration: '5 hrs', link: 'https://academy.hubspot.com/courses/seo-training' },
    { title: 'Keyword Strategy', description: 'Ahrefs, SEMrush, and building topic clusters.', tag: 'Keywords', duration: '4 hrs', link: 'https://ahrefs.com/academy' },
    { title: 'Link Building', description: 'Outreach, guest posting, and digital PR.', tag: 'Off-page', duration: '4 hrs', link: 'https://backlinko.com/hub/seo' },
    { title: 'GA4 Mastery', description: 'Analyzing organic performance and conversions.', tag: 'Analytics', duration: '4 hrs', link: 'https://skillshop.exceedlms.com/student/catalog/list?category_ids=6431-google-analytics-4' },
  ],
  'Content Writer': [
    { title: 'Persuasive Copywriting', description: 'AIDA framework and writing copy that converts.', tag: 'Writing', duration: '4 hrs', link: 'https://copyhackers.com/' },
    { title: 'SEO Writing', description: 'Writing for search intent and readability.', tag: 'SEO', duration: '3 hrs', link: 'https://yoast.com/academy/' },
    { title: 'Brand Voice', description: 'Maintaining consistent brand tone.', tag: 'Branding', duration: '2 hrs', link: 'https://contentmarketinginstitute.com/' },
    { title: 'Content Planning', description: 'Editorial calendars and workflow management.', tag: 'Planning', duration: '2 hrs', link: 'https://trello.com/tour' },
  ],
  'Marketing Manager': [
    { title: 'Integrated Marketing', description: 'Multi-channel campaign planning.', tag: 'Strategy', duration: '5 hrs', link: 'https://www.coursera.org/learn/marketing-strategy' },
    { title: 'Budget Management', description: 'Attribution modeling and measuring effectiveness.', tag: 'Finance', duration: '4 hrs', link: 'https://hbr.org/topic/marketing' },
    { title: 'Marketing Dashboards', description: 'Google Analytics and data-driven decisions.', tag: 'Analytics', duration: '4 hrs', link: 'https://lookerstudio.google.com/' },
    { title: 'Brand Positioning', description: 'Brand equity and long-term brand strategy.', tag: 'Branding', duration: '4 hrs', link: 'https://www.brandingstrategyinsider.com/' },
  ],
  'CMO': [
    { title: 'Marketing Leadership', description: 'Building high-performing marketing orgs.', tag: 'Leadership', duration: '6 hrs', link: 'https://sloanreview.mit.edu/topic/marketing/' },
    { title: 'Growth Marketing', description: 'Demand generation and pipeline acceleration.', tag: 'Growth', duration: '5 hrs', link: 'https://growthhackers.com/' },
    { title: 'CX Strategy', description: 'Journey mapping and aligning marketing with CS.', tag: 'CX', duration: '5 hrs', link: 'https://www.qualtrics.com/experience-management/customer/' },
    { title: 'MarTech Stack', description: 'Managing CRM, automation, and analytics.', tag: 'MarTech', duration: '4 hrs', link: 'https://chiefmartec.com/' },
  ],

  // ── OPERATIONS ──
  'Operations Assistant': [
    { title: 'Operations Basics', description: 'Process mapping and day-to-day support.', tag: 'Foundation', duration: '3 hrs', link: 'https://www.coursera.org/learn/operations-management' },
    { title: 'Workspace Productivity', description: 'Mastering Google Workspace for data management.', tag: 'Productivity', duration: '2 hrs', link: 'https://skillshop.exceedlms.com/student/catalog/list?category_ids=2890-google-workspace' },
    { title: 'Business Communication', description: 'Professional email and memo writing.', tag: 'Communication', duration: '2 hrs', link: 'https://www.coursera.org/learn/business-writing' },
    { title: 'Records Management', description: 'Document control and filing systems.', tag: 'Admin', duration: '2 hrs', link: 'https://www.arma.org/' },
  ],
  'Operations Analyst': [
    { title: 'Process Improvement', description: 'As-is/to-be mapping and efficiency metrics.', tag: 'Analysis', duration: '4 hrs', link: 'https://www.coursera.org/learn/process-improvement' },
    { title: 'Data Analysis with Excel', description: 'Operational dashboards and trend analysis.', tag: 'Analytics', duration: '4 hrs', link: 'https://exceljet.net/' },
    { title: 'Lean Six Sigma', description: 'DMAIC methodology and waste elimination.', tag: 'Lean', duration: '5 hrs', link: 'https://www.sixsigmacouncil.org/' },
    { title: 'Operational Reporting', description: 'Building reports and presenting findings.', tag: 'Reporting', duration: '3 hrs', link: 'https://www.tableau.com/learn' },
  ],
  'Logistics Coordinator': [
    { title: 'Supply Chain Fundamentals', description: 'Inventory management and procurement cycle.', tag: 'Logistics', duration: '4 hrs', link: 'https://www.coursera.org/specializations/supply-chain-management' },
    { title: 'Warehouse Management', description: 'Stock control, WMS tools, and cycle counting.', tag: 'Warehouse', duration: '3 hrs', link: 'https://www.inboundlogistics.com/' },
    { title: 'Shipping Regulations', description: 'Incoterms and customs documentation.', tag: 'Compliance', duration: '3 hrs', link: 'https://www.export.gov/' },
    { title: 'Vendor Management', description: 'Negotiating with vendors and SLA tracking.', tag: 'Procurement', duration: '3 hrs', link: 'https://www.cips.org/' },
  ],
  'Operations Manager': [
    { title: 'Operational Excellence', description: 'Building OKRs, SLAs, and improvement culture.', tag: 'Excellence', duration: '5 hrs', link: 'https://hbr.org/topic/operations-management' },
    { title: 'People Management', description: 'Leading ops teams and performance coaching.', tag: 'Leadership', duration: '4 hrs', link: 'https://www.mindtools.com/' },
    { title: 'Cost Control', description: 'Operations budgeting and variance reporting.', tag: 'Finance', duration: '4 hrs', link: 'https://corporatefinanceinstitute.com/' },
    { title: 'Business Continuity', description: 'BCP planning and risk mitigation.', tag: 'Risk', duration: '3 hrs', link: 'https://www.ready.gov/business' },
  ],
  'COO': [
    { title: 'Executive Ops Strategy', description: 'Scaling operations and organizational design.', tag: 'Strategy', duration: '6 hrs', link: 'https://www.mckinsey.com/capabilities/operations/our-insights' },
    { title: 'Digital Transformation', description: 'RPA and operational transformation programs.', tag: 'Digital', duration: '5 hrs', link: 'https://sloanreview.mit.edu/topic/digital-transformation/' },
    { title: 'Cross-functional Leadership', description: 'Aligning product, finance, and HR.', tag: 'Leadership', duration: '5 hrs', link: 'https://hbr.org/topic/leadership' },
    { title: 'Sustainable Operations', description: 'ESG reporting and sustainable supply chains.', tag: 'ESG', duration: '4 hrs', link: 'https://www.weforum.org/topics/sustainability' },
  ],

  // ── CUSTOMER SERVICE / SUPPORT ──
  'Customer Service Representative': [
    { title: 'CS Fundamentals', description: 'Empathy, service standards, and call handling.', tag: 'Foundation', duration: '3 hrs', link: 'https://www.youtube.com/watch?v=kYJ6X2m4b8s' },
    { title: 'De-escalation Skills', description: 'LAST model and handling difficult scenarios.', tag: 'De-escalation', duration: '3 hrs', link: 'https://www.youtube.com/watch?v=o0hS-8uQ0e8' },
    { title: 'Zendesk Training', description: 'Ticketing tools and customer data management.', tag: 'Tools', duration: '2 hrs', link: 'https://training.zendesk.com/' },
    { title: 'Support Communication', description: 'Chat etiquette and professional emails.', tag: 'Communication', duration: '2 hrs', link: 'https://www.helpscout.com/customer-service-training/' },
  ],
  'Technical Support Specialist': [
    { title: 'Troubleshooting Methodology', description: 'Problem diagnosis and escalation paths.', tag: 'Troubleshooting', duration: '4 hrs', link: 'https://www.comptia.org/blog/troubleshooting-methodology' },
    { title: 'ITIL Basics', description: 'Incident and change management processes.', tag: 'ITIL', duration: '4 hrs', link: 'https://www.axelos.com/certifications/itil-service-management' },
    { title: 'Remote Support Tools', description: 'Using TeamViewer and remote desktop effectively.', tag: 'Tools', duration: '2 hrs', link: 'https://www.teamviewer.com/en/resources/' },
    { title: 'Writing KB Articles', description: 'Creating clear how-to guides and FAQs.', tag: 'Documentation', duration: '2 hrs', link: 'https://www.atlassian.com/itsm/knowledge-management' },
  ],
  'Customer Success Manager': [
    { title: 'CS Fundamentals', description: 'Onboarding, adoption, and health scoring.', tag: 'CS Fundamentals', duration: '4 hrs', link: 'https://www.gainsight.com/customer-success-best-practices/' },
    { title: 'Churn Prevention', description: 'At-risk playbooks and renewal conversations.', tag: 'Retention', duration: '4 hrs', link: 'https://www.churnzero.com/blog/' },
    { title: 'NPS & Feedback', description: 'Closing the loop and driving improvements.', tag: 'Feedback', duration: '3 hrs', link: 'https://www.netpromotersystem.com/' },
    { title: 'Upselling Strategies', description: 'Positioning expansion revenue opportunities.', tag: 'Growth', duration: '3 hrs', link: 'https://www.hubspot.com/customer-success' },
  ],
  'BPO Team Lead': [
    { title: 'BPO Team Leadership', description: 'Coaching agents and driving team KPIs.', tag: 'Leadership', duration: '4 hrs', link: 'https://www.callcentrehelper.com/' },
    { title: 'Quality Assurance', description: 'QA scoring and calibration sessions.', tag: 'Quality', duration: '3 hrs', link: 'https://www.nice.com/resources/' },
    { title: 'Workforce Management', description: 'Shift scheduling and adherence tracking.', tag: 'WFM', duration: '3 hrs', link: 'https://www.verint.com/' },
    { title: 'SLA Management', description: 'AHT, CSAT, FCR metrics and reporting.', tag: 'Reporting', duration: '3 hrs', link: 'https://www.talkdesk.com/resources/' },
  ],

  // ── ENGINEERING / PRODUCT DEV ──
  'QA Engineer': [
    { title: 'Testing Fundamentals', description: 'Test plans, bug lifecycle, and regression.', tag: 'Testing', duration: '4 hrs', link: 'https://www.guru99.com/software-testing.html' },
    { title: 'Automation with Cypress', description: 'Writing automated scripts and CI integration.', tag: 'Automation', duration: '5 hrs', link: 'https://learn.cypress.io/' },
    { title: 'API Testing via Postman', description: 'REST API validation and contract testing.', tag: 'API', duration: '3 hrs', link: 'https://learning.postman.com/' },
    { title: 'Test Management', description: 'Defect triage and working with developers.', tag: 'Tools', duration: '2 hrs', link: 'https://www.atlassian.com/software/jira/guides/use-cases/software-development' },
  ],
  'DevOps Engineer': [
    { title: 'CI/CD with GitHub Actions', description: 'Automated builds and deployment pipelines.', tag: 'CI/CD', duration: '5 hrs', link: 'https://docs.github.com/en/actions' },
    { title: 'Docker & Kubernetes', description: 'Orchestration and production deployments.', tag: 'Containers', duration: '6 hrs', link: 'https://kubernetes.io/docs/tutorials/' },
    { title: 'Terraform IaC', description: 'Provisioning cloud resources and state config.', tag: 'IaC', duration: '5 hrs', link: 'https://developer.hashicorp.com/terraform/tutorials' },
    { title: 'Monitoring & SRE', description: 'Prometheus, Grafana, alerting, and logging.', tag: 'Monitoring', duration: '4 hrs', link: 'https://sre.google/' },
  ],
  'Product Manager': [
    { title: 'PM Fundamentals', description: 'Roadmapping and prioritization frameworks.', tag: 'Foundation', duration: '5 hrs', link: 'https://www.productschool.com/' },
    { title: 'User Research & JTBD', description: 'Usability testing and insight synthesis.', tag: 'Research', duration: '4 hrs', link: 'https://www.nngroup.com/' },
    { title: 'Agile Product Ownership', description: 'Writing user stories and sprint ceremonies.', tag: 'Agile', duration: '4 hrs', link: 'https://www.scrum.org/' },
    { title: 'Product Analytics', description: 'A/B testing, funnel analysis, and product KPIs.', tag: 'Analytics', duration: '4 hrs', link: 'https://mixpanel.com/blog/' },
  ],
  'UI/UX Designer': [
    { title: 'UX Research & Principles', description: 'Journey mapping and usability testing.', tag: 'UX', duration: '5 hrs', link: 'https://www.coursera.org/professional-certificates/google-ux-design' },
    { title: 'Figma Prototyping', description: 'Auto layout, variants, and developer handoff.', tag: 'Figma', duration: '5 hrs', link: 'https://help.figma.com/hc/en-us' },
    { title: 'Design Systems', description: 'Building tokens and component libraries.', tag: 'Design System', duration: '4 hrs', link: 'https://designsystemsrepo.com/design-systems/' },
    { title: 'Interaction Design', description: 'Micro-interactions and motion principles.', tag: 'Motion', duration: '3 hrs', link: 'https://www.nngroup.com/articles/microinteractions/' },
  ],
  'Engineering Manager': [
    { title: 'Engineering Leadership', description: 'Effective 1:1s and growth conversations.', tag: 'Leadership', duration: '5 hrs', link: 'https://lethain.com/engineering-management/' },
    { title: 'Technical Decisions', description: 'Architecture reviews and tech debt management.', tag: 'Technical', duration: '4 hrs', link: 'https://hbr.org/topic/technology-and-analytics' },
    { title: 'Velocity Management', description: 'Sprint metrics and improving team throughput.', tag: 'Delivery', duration: '4 hrs', link: 'https://www.atlassian.com/agile' },
    { title: 'Building Tech Teams', description: 'Technical interviews and onboarding engineers.', tag: 'Hiring', duration: '4 hrs', link: 'https://blog.pragmaticengineer.com/' },
  ],

  // ── ADMIN / LEGAL ──
  'Administrative Assistant': [
    { title: 'Office Administration', description: 'Calendar management and office coordination.', tag: 'Admin', duration: '2 hrs', link: 'https://www.youtube.com/watch?v=2v31x-5Y_L8' },
    { title: 'Business Writing', description: 'Memos, meeting minutes, and correspondence.', tag: 'Communication', duration: '2 hrs', link: 'https://www.coursera.org/learn/business-writing' },
    { title: 'MS Office Mastery', description: 'Productivity skills for Word, Excel, PowerPoint.', tag: 'Tools', duration: '3 hrs', link: 'https://support.microsoft.com/en-us/training' },
    { title: 'Confidentiality', description: 'Handling sensitive data and office security.', tag: 'Security', duration: '2 hrs', link: 'https://www.privacy.gov.ph/' },
  ],
  'Executive Assistant': [
    { title: 'Executive Support', description: 'Anticipating needs and complex scheduling.', tag: 'Executive Support', duration: '3 hrs', link: 'https://www.eamasters.com/' },
    { title: 'Project Coordination', description: 'Tracking deliverables and cross-functional projects.', tag: 'Coordination', duration: '3 hrs', link: 'https://www.pmi.org/' },
    { title: 'Corporate Events', description: 'Planning board events and vendor management.', tag: 'Events', duration: '2 hrs', link: 'https://www.eventbrite.com/blog/' },
    { title: 'Stakeholder Relations', description: 'Gatekeeping and professional communications.', tag: 'Relations', duration: '2 hrs', link: 'https://hbr.org/' },
  ],
  'Legal Counsel': [
    { title: 'Corporate Governance', description: 'SEC regulations and corporate compliance.', tag: 'Corporate Law', duration: '6 hrs', link: 'https://www.sec.gov.ph/' },
    { title: 'Contract Drafting', description: 'Provisions, red flags, and negotiation.', tag: 'Contracts', duration: '5 hrs', link: 'https://hbr.org/topic/negotiation' },
    { title: 'Data Privacy (DPA)', description: 'RA 10173 obligations and breach protocols.', tag: 'Privacy', duration: '4 hrs', link: 'https://www.privacy.gov.ph/data-privacy-act/' },
    { title: 'Labor Relations', description: 'Labor Code application and disciplinary rules.', tag: 'Labor Law', duration: '4 hrs', link: 'https://bwc.dole.gov.ph/' },
  ],
  'Compliance Officer': [
    { title: 'Regulatory Frameworks', description: 'Understanding Philippine regulatory landscape.', tag: 'Regulatory', duration: '5 hrs', link: 'https://www.sec.gov.ph/' },
    { title: 'AMLA Fundamentals', description: 'Suspicious transaction reporting and KYC.', tag: 'AML', duration: '4 hrs', link: 'http://www.amlc.gov.ph/' },
    { title: 'Internal Audit', description: 'Compliance audits, risk registers, and testing.', tag: 'Audit', duration: '4 hrs', link: 'https://www.theiia.org/' },
    { title: 'Corporate Integrity', description: 'Code of conduct and whistleblower programs.', tag: 'Ethics', duration: '3 hrs', link: 'https://www.ethicspoint.com/' },
  ],
  'Admin Manager': [
    { title: 'Admin Ops Management', description: 'Managing admin staff and office systems.', tag: 'Management', duration: '4 hrs', link: 'https://www.ifma.org/' },
    { title: 'Budget Control', description: 'Purchase orders and vendor negotiations.', tag: 'Procurement', duration: '3 hrs', link: 'https://www.cips.org/' },
    { title: 'Policy Development', description: 'Writing policies and ensuring compliance.', tag: 'Policy', duration: '3 hrs', link: 'https://www.shrm.org/' },
    { title: 'Asset Management', description: 'Facilities planning and property tracking.', tag: 'Facilities', duration: '2 hrs', link: 'https://www.ibm.com/topics/enterprise-asset-management' },
  ],
};

// Default fallback list kung wala sa taas yung role o kung general 'New Hire' lang ang nailagay
const DEFAULT_MODULES: RecommendedModule[] = [
  { title: 'Company Culture & Values', description: 'Understanding the core mission, vision, and values of the company.', tag: 'Culture', duration: '1 hr', link: 'https://www.ted.com/topics/workplace+culture' },
  { title: 'Cybersecurity Basics', description: 'Basic cyber hygiene, phishing prevention, and data handling.', tag: 'Security', duration: '2 hrs', link: 'https://www.coursera.org/learn/foundations-of-cybersecurity' },
  { title: 'Workplace Communication', description: 'Professional email etiquette and active listening skills.', tag: 'Communication', duration: '1.5 hrs', link: 'https://www.coursera.org/learn/business-writing' },
];

// Tag color map
const TAG_COLORS: Record<string, string> = {
  Foundation: 'bg-purple-100 text-purple-700',
  Legal: 'bg-red-100 text-red-700',
  'Labor Law': 'bg-red-100 text-red-700',
  Tools: 'bg-gray-100 text-gray-700',
  Process: 'bg-teal-100 text-teal-700',
  Leadership: 'bg-indigo-100 text-indigo-700',
  Strategy: 'bg-blue-100 text-blue-700',
  Analytics: 'bg-cyan-100 text-cyan-700',
  Security: 'bg-rose-100 text-rose-700',
  Payroll: 'bg-green-100 text-green-700',
  Tax: 'bg-orange-100 text-orange-700',
  Reporting: 'bg-blue-100 text-blue-700',
  React: 'bg-sky-100 text-sky-700',
  UI: 'bg-pink-100 text-pink-700',
  Backend: 'bg-violet-100 text-violet-700',
  DevOps: 'bg-orange-100 text-orange-700',
  Cloud: 'bg-cyan-100 text-cyan-700',
  Agile: 'bg-teal-100 text-teal-700',
  Recruitment: 'bg-purple-100 text-purple-700',
  Compliance: 'bg-yellow-100 text-yellow-700',
  Culture: 'bg-pink-100 text-pink-700',
  Management: 'bg-indigo-100 text-indigo-700',
  Compensation: 'bg-green-100 text-green-700',
  'CI/CD': 'bg-orange-100 text-orange-700',
  Testing: 'bg-violet-100 text-violet-700',
  Automation: 'bg-blue-100 text-blue-700',
  API: 'bg-teal-100 text-teal-700',
  Research: 'bg-purple-100 text-purple-700',
  Figma: 'bg-pink-100 text-pink-700',
  UX: 'bg-rose-100 text-rose-700',
};

const getTagColor = (tag: string) => TAG_COLORS[tag] || 'bg-[#fce8e8] text-[#810100]';

// ─────────────────────────────────────────────────────────────────────────────

const Training: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [position, setPosition] = useState('');
  const [showAllModules, setShowAllModules] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const fetchUserAndTrainings = async () => {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const empId = data.employeeId || 'TBA';
        const pos = data.position || data.role || data.jobTitle || data.specificRole || '';
        setEmployeeId(empId);
        setPosition(pos);

        const q = query(collection(db, 'trainings'), where('employeeId', '==', empId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: TrainingRecord[] = [];
          snapshot.forEach((d) => { list.push({ id: d.id, ...d.data() } as TrainingRecord); });
          setTrainings(list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
          setLoading(false);
        });
        return unsubscribe;
      } else {
        setLoading(false);
      }
    };
    fetchUserAndTrainings();
  }, []);

  // 🟢 Gamitin ang DEFAULT_MODULES kung walang nahanap na specific role
  const recommendedModules = ROLE_MODULES[position] || DEFAULT_MODULES;
  const displayedModules = showAllModules ? recommendedModules : recommendedModules.slice(0, 3);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-[#810100] w-10 h-10"/>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-[#1B1717] uppercase tracking-tight">Training & Development</h1>
        <p className="text-sm text-gray-500 font-medium">Upskill yourself with assigned corporate trainings and improvement plans.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Assigned" value={trainings.filter(t => t.status !== 'Completed').length} icon={<BookOpen className="w-6 h-6"/>} color="bg-blue-600" />
        <StatCard label="Completed" value={trainings.filter(t => t.status === 'Completed').length} icon={<CheckCircle className="w-6 h-6"/>} color="bg-green-600" />
        <StatCard label="Pending Due" value={trainings.filter(t => t.status === 'Pending').length} icon={<Clock className="w-6 h-6"/>} color="bg-yellow-500" />
      </div>

      {/* ── Recommended Modules based on Role ── */}
      {recommendedModules.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-[#fce8e8] to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#810100] rounded-lg">
                <BookOpen className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-[#1B1717] uppercase tracking-widest text-sm">New Hire Review Modules</h2>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Required study materials for: <span className="text-[#810100] font-black">{position || 'New Employee'}</span>
                </p>
              </div>
            </div>
            <span className="hidden md:flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
              {recommendedModules.length} modules available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {displayedModules.map((mod, i) => (
              <div
                key={i}
                className="p-6 flex flex-col gap-3 hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-black text-[#1B1717] leading-snug">{mod.title}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${getTagColor(mod.tag)}`}>
                    {mod.tag}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 font-medium leading-relaxed flex-1">{mod.description}</p>
                
                {/* 🟢 Clickable "Start Module" Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                  <span className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase">
                    <Clock className="w-3 h-3"/> {mod.duration}
                  </span>
                  <a
                    href={mod.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#fce8e8] text-[#810100] rounded-lg hover:bg-[#810100] hover:text-white transition-all text-[9px] font-black uppercase tracking-widest shadow-sm"
                  >
                    Start Module <ExternalLink className="w-3 h-3"/>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {recommendedModules.length > 3 && (
            <div className="border-t border-gray-100 p-4 flex justify-center bg-gray-50/30">
              <button
                onClick={() => setShowAllModules(!showAllModules)}
                className="flex items-center gap-2 text-[11px] font-black uppercase text-[#810100] hover:text-[#630000] transition-colors tracking-widest"
              >
                {showAllModules ? (
                  <><ChevronUp className="w-4 h-4"/> Show Less</>
                ) : (
                  <><ChevronDown className="w-4 h-4"/> View All {recommendedModules.length} Modules</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Assigned Training List (Manual ng HR or Auto-Gen) ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b flex items-center gap-3 bg-gray-50/50">
          <div className="p-2 bg-[#fce8e8] rounded-lg">
            <GraduationCap className="text-[#810100] w-5 h-5" />
          </div>
          <h2 className="font-black text-[#1B1717] uppercase tracking-widest text-sm">Assigned Courses & Modules (By HR)</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {trainings.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                <BookOpen className="text-gray-300 w-8 h-8" />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No trainings assigned yet.</p>
            </div>
          ) : (
            trainings.map((course) => {
              
              // 🟢 DYNAMIC INTERCEPTOR: Pinapaganda ang text kung galing sa auto-generator
              const isGenericOnboarding = course.title.includes('Onboarding') || course.description.includes('Welcome!');
              
              const displayTitle = isGenericOnboarding 
                ? `Company Onboarding: ${position || 'General'} Masterclass` 
                : course.title;
                
              const displayDescription = isGenericOnboarding
                ? `Welcome to the team! This comprehensive orientation is tailored specifically for your role as a ${position || 'new employee'}. It includes essential tool setups, compliance policies, and your day-one starter kit.`
                : course.description;

              // I-override ang dummy link gamit ang totoong module link
              const displayLink = (course.link === "https://crimsoncloud-hr.com/training/start" || !course.link)
                ? (ROLE_MODULES[position]?.[0]?.link || "https://www.youtube.com/watch?v=bEusrD8g-dM") 
                : course.link;

              return (
                <div key={course.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-gray-50 transition-colors group">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-black text-[#1B1717] group-hover:text-[#810100] transition-colors">
                      {displayTitle}
                    </h3>
                    <p className="text-sm text-gray-600 font-medium line-clamp-2 bg-gray-100 p-3 rounded-xl">
                      {displayDescription}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3"/> Due: {course.dueDate}
                      </span>
                      {course.status === 'Completed' && (
                        <span className="px-3 py-1 bg-green-50 rounded-full text-[10px] font-black uppercase text-green-700 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3"/> Completed on: {course.completionDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                    <StatusBadge status={course.status} />
                    <a
                      href={displayLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-[#810100] text-white rounded-xl hover:bg-[#630000] transition-all font-black uppercase text-[10px] tracking-widest shadow-md"
                    >
                      Go to Course <ExternalLink className="w-3 h-3"/>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
    <div className={`p-4 rounded-2xl text-white ${color} shadow-lg shadow-gray-200`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black text-[#1B1717]">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    Completed: 'bg-green-100 text-green-700 ring-green-500/20',
    Ongoing: 'bg-blue-100 text-blue-700 ring-blue-500/20',
    Pending: 'bg-yellow-100 text-yellow-700 ring-yellow-500/20',
  };
  return (
    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ring-1 ${configs[status] || configs.Pending}`}>
      {status}
    </span>
  );
};

export default Training;