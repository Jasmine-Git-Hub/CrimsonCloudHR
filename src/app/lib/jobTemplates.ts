// Starter text for job postings. Recruitment.tsx fills the Description and
// Requirements boxes from these; the recruiter can edit freely before saving.

type Level = "Entry" | "Mid" | "Senior";

interface RoleTemplate {
  duties: string[];
  skills: string[];
}

const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  // Human Resources
  "HR Assistant": {
    duties: ["Maintain 201 files and employee records", "Assist with onboarding and offboarding paperwork", "Schedule interviews and coordinate with applicants", "Prepare HR reports and correspondence"],
    skills: ["Basic knowledge of Philippine labor law", "Proficiency in MS Office / Google Workspace", "Strong organization and confidentiality"],
  },
  "HR Generalist": {
    duties: ["Handle employee relations concerns and HR inquiries", "Administer leave, benefits and government contributions (SSS, PhilHealth, Pag-IBIG)", "Support recruitment, onboarding and performance reviews", "Keep HR policies compliant with DOLE regulations"],
    skills: ["Working knowledge of the Labor Code of the Philippines", "Experience with HRIS and payroll processes", "Excellent communication and conflict resolution"],
  },
  "Recruitment Specialist": {
    duties: ["Source candidates through job boards, referrals and social media", "Screen resumes and conduct initial interviews", "Coordinate interviews with hiring managers", "Prepare job offers and manage pre-employment requirements"],
    skills: ["Experience with full-cycle recruitment", "Strong interviewing and candidate assessment skills", "Familiarity with applicant tracking systems"],
  },
  "Payroll Officer": {
    duties: ["Process semi-monthly payroll accurately and on time", "Compute statutory deductions and withholding tax", "Prepare remittance reports for SSS, PhilHealth, Pag-IBIG and BIR", "Resolve employee payroll concerns"],
    skills: ["Knowledge of BIR TRAIN tax tables and statutory contributions", "Strong Excel skills", "High attention to detail and confidentiality"],
  },
  "HR Manager": {
    duties: ["Lead the HR team and HR operations", "Develop and implement HR policies and programs", "Oversee recruitment, compensation, and performance management", "Advise management on employee relations and labor compliance"],
    skills: ["Proven people management experience", "Strong knowledge of Philippine labor law", "Strategic thinking and stakeholder management"],
  },
  "HR Director": {
    duties: ["Set the people strategy aligned with business goals", "Lead organizational development and culture initiatives", "Oversee compensation, benefits and succession planning", "Partner with executives on workforce planning"],
    skills: ["Extensive HR leadership experience", "Change management and organizational design", "Executive-level communication"],
  },

  // Information Technology
  "IT Support Specialist": {
    duties: ["Provide first-line support for hardware, software and network issues", "Set up workstations, accounts and peripherals", "Log and track tickets until resolved", "Maintain IT asset inventory"],
    skills: ["Troubleshooting Windows/macOS and office networks", "Customer-service mindset", "Familiarity with ticketing systems"],
  },
  "Frontend Developer": {
    duties: ["Build responsive user interfaces from designs", "Integrate frontend with REST/Firebase APIs", "Write reusable components and maintain code quality", "Fix UI bugs and improve performance and accessibility"],
    skills: ["HTML, CSS, JavaScript/TypeScript", "Experience with React or a similar framework", "Git and code review practices"],
  },
  "Backend Developer": {
    duties: ["Design and build APIs and backend services", "Model data and write efficient queries", "Implement authentication, authorization and security rules", "Monitor, debug and optimize services"],
    skills: ["Node.js, Java, Python or similar", "SQL/NoSQL databases", "Understanding of API design and security"],
  },
  "Full Stack Software Engineer": {
    duties: ["Deliver features end-to-end, from database to UI", "Write tests and maintain CI pipelines", "Collaborate with product and design on requirements", "Review code and mentor teammates"],
    skills: ["TypeScript, React and a backend stack", "Cloud platforms (Firebase, GCP or AWS)", "Testing and version control"],
  },
  "Systems Administrator": {
    duties: ["Maintain servers, networks and backups", "Manage user access and security patches", "Monitor uptime and respond to incidents", "Document infrastructure and procedures"],
    skills: ["Windows Server/Linux administration", "Networking and firewall configuration", "Scripting (PowerShell or Bash)"],
  },
  "IT Project Manager": {
    duties: ["Plan IT projects, timelines and budgets", "Coordinate developers, vendors and stakeholders", "Track risks, issues and deliverables", "Report project status to management"],
    skills: ["Agile/Scrum or PMP methodology", "Strong communication and organization", "Technical background in software or infrastructure"],
  },
  "CTO": {
    duties: ["Define the technology vision and roadmap", "Lead engineering and IT teams", "Oversee architecture, security and vendor decisions", "Align technology investments with business goals"],
    skills: ["Senior engineering leadership experience", "Architecture and security expertise", "Budgeting and strategic planning"],
  },

  // Finance / Accounting
  "Accounting Assistant": {
    duties: ["Encode transactions and maintain ledgers", "Prepare vouchers, invoices and receipts", "Assist with bank reconciliations", "Organize financial documents for audit"],
    skills: ["Basic accounting principles", "Proficiency in Excel and accounting software", "Accuracy and attention to detail"],
  },
  "Junior Accountant": {
    duties: ["Record journal entries and reconcile accounts", "Prepare monthly financial reports", "Assist in tax filings and compliance", "Support month-end and year-end closing"],
    skills: ["Knowledge of PFRS and BIR requirements", "Excel and accounting systems", "Analytical skills"],
  },
  "Senior Accountant": {
    duties: ["Review journal entries and reconciliations", "Prepare financial statements", "Handle tax compliance and audit requirements", "Supervise junior accounting staff"],
    skills: ["CPA license preferred", "Strong PFRS and tax knowledge", "Supervisory experience"],
  },
  "Financial Analyst": {
    duties: ["Build budgets, forecasts and financial models", "Analyze variances and business performance", "Prepare reports and dashboards for management", "Support pricing and investment decisions"],
    skills: ["Advanced Excel and financial modelling", "Data analysis and visualization", "Business acumen"],
  },
  "Finance Manager": {
    duties: ["Oversee accounting, treasury and reporting", "Manage cash flow and budgets", "Ensure compliance with tax and regulatory requirements", "Lead and develop the finance team"],
    skills: ["CPA license", "Financial management experience", "Leadership and stakeholder management"],
  },
  "CFO": {
    duties: ["Lead financial strategy and planning", "Oversee financial reporting, risk and compliance", "Manage investor, bank and auditor relationships", "Advise the executive team on growth and capital"],
    skills: ["Senior finance leadership experience", "CPA license", "Strategic and risk management expertise"],
  },

  // Sales
  "Sales Representative": {
    duties: ["Generate leads and reach out to prospects", "Present products and close sales", "Maintain customer relationships", "Meet monthly sales targets"],
    skills: ["Strong communication and persuasion", "Target-driven attitude", "Basic CRM use"],
  },
  "Account Executive": {
    duties: ["Manage a portfolio of client accounts", "Run product demos and negotiate deals", "Forecast pipeline and revenue", "Identify upsell and renewal opportunities"],
    skills: ["B2B sales experience", "Negotiation and presentation skills", "CRM (e.g., HubSpot, Salesforce)"],
  },
  "Business Development Manager": {
    duties: ["Identify new markets and partnerships", "Develop business proposals", "Build relationships with key decision makers", "Grow revenue through new channels"],
    skills: ["Business development track record", "Market research and strategy", "Excellent networking"],
  },
  "Sales Manager": {
    duties: ["Lead and coach the sales team", "Set targets and track performance", "Develop sales strategies and territories", "Report sales results to management"],
    skills: ["Sales leadership experience", "Coaching and performance management", "Data-driven decision making"],
  },
  "VP of Sales": {
    duties: ["Own the company revenue plan", "Build and scale the sales organization", "Define pricing and go-to-market strategy", "Manage key enterprise relationships"],
    skills: ["Senior sales leadership", "Strategic planning", "Executive communication"],
  },

  // Marketing
  "Marketing Assistant": {
    duties: ["Support campaigns and events", "Prepare marketing materials", "Monitor social media and website content", "Compile campaign reports"],
    skills: ["Good writing skills", "Familiarity with Canva and social platforms", "Organization and creativity"],
  },
  "Social Media Specialist": {
    duties: ["Plan and publish social media content", "Engage with the online community", "Run and optimize paid social campaigns", "Report on engagement and growth"],
    skills: ["Facebook, Instagram, TikTok and LinkedIn", "Content creation and copywriting", "Analytics tools"],
  },
  "SEO Specialist": {
    duties: ["Conduct keyword research and on-page optimization", "Improve site speed and technical SEO", "Build quality backlinks", "Track rankings and organic traffic"],
    skills: ["Google Search Console and Analytics", "SEO tools (Ahrefs, SEMrush)", "Basic HTML"],
  },
  "Content Writer": {
    duties: ["Write blog posts, web copy and newsletters", "Research topics and follow brand voice", "Edit and proofread content", "Optimize content for SEO"],
    skills: ["Excellent English writing", "Research skills", "Portfolio of written work"],
  },
  "Marketing Manager": {
    duties: ["Plan and execute the marketing strategy", "Manage budget and campaigns", "Lead the marketing team", "Measure ROI and report results"],
    skills: ["Marketing leadership experience", "Digital marketing expertise", "Budget management"],
  },
  "CMO": {
    duties: ["Own brand and marketing strategy", "Drive customer acquisition and growth", "Lead marketing, communications and PR", "Partner with sales on pipeline"],
    skills: ["Senior marketing leadership", "Brand strategy", "Data-driven growth marketing"],
  },

  // Operations
  "Operations Assistant": {
    duties: ["Support day-to-day operations", "Maintain records and inventory", "Coordinate with suppliers and departments", "Prepare operational reports"],
    skills: ["Organization and multitasking", "Excel proficiency", "Good communication"],
  },
  "Operations Analyst": {
    duties: ["Analyze processes and identify improvements", "Track KPIs and prepare reports", "Support process documentation", "Recommend cost-saving measures"],
    skills: ["Data analysis and Excel", "Process improvement (Lean/Six Sigma a plus)", "Problem solving"],
  },
  "Logistics Coordinator": {
    duties: ["Schedule and track deliveries", "Coordinate with couriers and warehouses", "Manage shipping documents", "Resolve delivery issues"],
    skills: ["Logistics or supply chain background", "Attention to detail", "Coordination skills"],
  },
  "Operations Manager": {
    duties: ["Oversee daily operations and staff", "Set operational targets and budgets", "Improve efficiency and quality", "Ensure compliance with company policies"],
    skills: ["Operations management experience", "Leadership", "Planning and budgeting"],
  },
  "COO": {
    duties: ["Run company-wide operations", "Translate strategy into operational plans", "Lead department heads", "Drive efficiency and scale"],
    skills: ["Senior operations leadership", "Strategic execution", "Cross-functional management"],
  },

  // Customer Service / Support
  "Customer Service Representative": {
    duties: ["Respond to customer inquiries via phone, email and chat", "Resolve complaints and issues", "Log interactions accurately", "Meet service level targets"],
    skills: ["Excellent English communication", "Patience and empathy", "Willingness to work shifts"],
  },
  "Technical Support Specialist": {
    duties: ["Troubleshoot technical issues for customers", "Escalate complex cases", "Write help articles", "Track and close support tickets"],
    skills: ["Technical troubleshooting", "Clear communication", "Ticketing system experience"],
  },
  "Customer Success Manager": {
    duties: ["Onboard and train new customers", "Monitor account health and retention", "Act as the customer's advocate internally", "Identify renewal and upsell opportunities"],
    skills: ["Account management experience", "Relationship building", "Data-driven mindset"],
  },
  "BPO Team Lead": {
    duties: ["Supervise a team of agents", "Monitor KPIs (AHT, CSAT, QA)", "Coach and conduct performance reviews", "Handle escalations"],
    skills: ["BPO supervisory experience", "Coaching skills", "Willingness to work shifting schedules"],
  },

  // Engineering / Product Dev
  "QA Engineer": {
    duties: ["Write and run manual and automated tests", "Report and track bugs", "Review requirements for testability", "Maintain test plans"],
    skills: ["Testing methodologies", "Automation tools (Playwright, Cypress, Selenium)", "Attention to detail"],
  },
  "DevOps Engineer": {
    duties: ["Build and maintain CI/CD pipelines", "Manage cloud infrastructure", "Monitor systems and respond to incidents", "Automate deployments"],
    skills: ["Cloud (GCP, AWS or Azure)", "Docker and infrastructure as code", "Scripting"],
  },
  "Product Manager": {
    duties: ["Define product requirements and roadmap", "Prioritize the backlog with engineering", "Gather user feedback and data", "Coordinate launches"],
    skills: ["Product management experience", "User research and analytics", "Strong communication"],
  },
  "UI/UX Designer": {
    duties: ["Design user flows, wireframes and prototypes", "Run usability tests", "Maintain the design system", "Work with developers on implementation"],
    skills: ["Figma", "UX research methods", "Portfolio of design work"],
  },
  "Engineering Manager": {
    duties: ["Lead and grow the engineering team", "Plan delivery and remove blockers", "Ensure code quality and best practices", "Conduct 1:1s and performance reviews"],
    skills: ["Software engineering background", "People leadership", "Agile delivery"],
  },

  // Admin / Legal
  "Administrative Assistant": {
    duties: ["Manage office supplies and facilities", "Handle calls, mail and filing", "Schedule meetings and appointments", "Process purchase requests"],
    skills: ["Organization", "MS Office / Google Workspace", "Good communication"],
  },
  "Executive Assistant": {
    duties: ["Manage executive calendars and travel", "Prepare reports and presentations", "Coordinate meetings and minutes", "Handle confidential correspondence"],
    skills: ["Executive support experience", "Discretion and professionalism", "Excellent written English"],
  },
  "Legal Counsel": {
    duties: ["Draft and review contracts", "Advise on legal and regulatory matters", "Handle labor and corporate cases", "Ensure compliance with Philippine law"],
    skills: ["Member of the Philippine Bar", "Corporate and labor law", "Contract negotiation"],
  },
  "Compliance Officer": {
    duties: ["Monitor regulatory compliance", "Develop compliance policies and training", "Conduct internal audits", "Report compliance risks"],
    skills: ["Regulatory knowledge (SEC, BIR, DOLE, Data Privacy Act)", "Audit experience", "Integrity"],
  },
  "Admin Manager": {
    duties: ["Oversee administrative and facilities operations", "Manage admin staff and vendors", "Control admin budget", "Implement office policies"],
    skills: ["Admin management experience", "Vendor management", "Leadership"],
  },
};

const LEVEL_TEXT: Record<Level, { experience: string; scope: string }> = {
  Entry: { experience: "0–2 years of relevant experience; fresh graduates are welcome to apply", scope: "Under supervision, you will" },
  Mid: { experience: "At least 3 years of relevant experience", scope: "Working independently, you will" },
  Senior: { experience: "At least 5–7 years of relevant experience, including leading teams or projects", scope: "As a senior member of the team, you will" },
};

const GENERIC: RoleTemplate = {
  duties: ["Perform the core responsibilities of the role", "Coordinate with team members and other departments", "Prepare reports as required"],
  skills: ["Relevant technical skills for the role", "Good communication skills"],
};

const bullets = (items: string[]) => items.map((i) => `• ${i}`).join("\n");

export function buildJobDescription(jobTitle: string, department: string, level: Level, employmentType: string) {
  const t = ROLE_TEMPLATES[jobTitle] ?? GENERIC;
  const l = LEVEL_TEXT[level];
  return `We are looking for a ${level}-level ${jobTitle} (${employmentType}) to join our ${department} team.\n\n${l.scope}:\n${bullets(t.duties)}`;
}

export function buildJobRequirements(jobTitle: string, level: Level) {
  const t = ROLE_TEMPLATES[jobTitle] ?? GENERIC;
  return bullets([
    "Bachelor's degree in a related field (or equivalent experience)",
    LEVEL_TEXT[level].experience,
    ...t.skills,
  ]);
}
