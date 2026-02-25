// ============================================================
// VenCap — Procedural Content Generation System
// Pure functions only. No side effects.
// ============================================================

import type {
  FundStage,
  MarketCycle,
  Startup,
  CoInvestor,
  AcquirerType,
  DiscoverySource,
  UnitEconomics,
  CompanyMetrics,
  MarketData,
  FounderTraits,
  StartupRegion,
  GeographicFocus,
} from './types';
import { uuid, randomBetween, randomInt, pickRandom, weightedRandom } from '@/lib/utils';
import { getBaseValuationRange, getValuationMultiplier } from './vcRealism';

// ============================================================
// SECTOR DATA — 15 sectors
// ============================================================

interface SectorInfo {
  nameWords: string[][];
  descriptionTemplates: string[];
  strengthPool: string[];
  riskPool: string[];
  redFlagPool: string[];
  ddPool: string[];
}

export const SECTOR_DATA: Record<string, SectorInfo> = {
  SaaS: {
    nameWords: [
      ['Cloud', 'Stack', 'Flow', 'Sync', 'Relay', 'Layer', 'Mesh', 'Pulse', 'Arc', 'Beam'],
      ['Base', 'Hub', 'OS', 'HQ', 'Ops', 'Kit', 'Lab', 'AI', 'Works', 'ify'],
    ],
    descriptionTemplates: [
      'Enterprise workflow automation platform reducing operational overhead for mid-market companies.',
      'Vertical SaaS solution streamlining back-office operations for a fragmented industry.',
      'AI-powered productivity suite replacing legacy enterprise tools with a modern, unified interface.',
      'Cloud-native infrastructure management platform for DevOps teams at scale.',
      'Collaboration platform enabling distributed teams to manage complex projects seamlessly.',
    ],
    strengthPool: [
      'Strong net revenue retention (130%+)',
      'Fast enterprise sales cycle (< 60 days)',
      'Low CAC via product-led growth',
      'Deep integration moat with customer workflows',
      'High switching costs once deployed',
      'Land-and-expand proven across 3 verticals',
      'Strong NPS (70+) from early customers',
      'Category-defining product positioning',
    ],
    riskPool: [
      'Long enterprise sales cycles in some verticals',
      'Feature parity risk from incumbent vendors',
      'Key customer concentration (top 3 = 40% rev)',
      'Engineering team stretched across too many features',
      'Pricing pressure from open-source alternatives',
      'Dependency on third-party API integrations',
      'Competitive market with well-funded players',
      'Churn elevated in SMB segment',
    ],
    redFlagPool: [
      'Founder previously had a startup fail in same space',
      'Burn rate exceeds industry norms by 2x',
      'Key technical co-founder considering departure',
      'Revenue metrics appear inflated by one-time contracts',
      'No clear path to positive unit economics',
    ],
    ddPool: [
      'Customer references uniformly positive on product quality.',
      'Technical architecture well-suited for scale; microservices-based.',
      'Sales pipeline looks healthy with 3x coverage on next quarter targets.',
      'Competitive landscape crowded but company has differentiated positioning.',
      'Management team has prior exits in adjacent spaces.',
    ],
  },
  Fintech: {
    nameWords: [
      ['Pay', 'Fin', 'Cash', 'Vault', 'Ledger', 'Mint', 'Clear', 'Swift', 'Bond', 'Lend'],
      ['ly', 'ify', 'Hub', 'Stack', 'Base', 'Path', 'Flow', 'Grid', 'Link', 'Pro'],
    ],
    descriptionTemplates: [
      'Next-gen payment infrastructure enabling instant cross-border transactions for SMBs.',
      'Embedded finance platform allowing any SaaS company to offer banking services.',
      'AI-driven lending platform for underserved small business segments.',
      'Digital treasury management solution helping mid-market CFOs optimize cash positions.',
      'Compliance automation platform for financial services firms navigating regulatory complexity.',
    ],
    strengthPool: [
      'Payment volume growing 25% MoM',
      'Banking-as-a-service moat with regulatory licenses',
      'Strong unit economics on transaction fees',
      'Embedded in customer money flows',
      'Capital-light business model',
      'Regulatory approvals already secured in 3 markets',
      'Former Stripe/Square leadership on team',
      'Network effects from two-sided marketplace',
    ],
    riskPool: [
      'Regulatory environment could shift unfavorably',
      'Fraud risk inherent in payments infrastructure',
      'Banking partner dependency',
      'Intense competition from well-funded neobanks',
      'Customer acquisition costs high in financial services',
      'Revenue concentration in one geographic market',
      'Compliance costs may scale non-linearly',
      'Interest rate sensitivity on lending margins',
    ],
    redFlagPool: [
      'Pending regulatory investigation in one market',
      'Key banking partnership at risk of non-renewal',
      'Fraud losses trending upward quarter over quarter',
      'Founder has no financial services background',
      'Revenue booked before delivery of services',
    ],
    ddPool: [
      'Regulatory counsel confirms compliance posture is strong.',
      'Transaction volume data verified; growth trajectory real.',
      'Fraud rates within acceptable range for the vertical.',
      'Banking partner relationship appears stable and expandable.',
      'Unit economics improve meaningfully at scale.',
    ],
  },
  HealthTech: {
    nameWords: [
      ['Med', 'Health', 'Care', 'Vita', 'Cure', 'Heal', 'Bio', 'Life', 'Well', 'Pulse'],
      ['ify', 'Bridge', 'Link', 'OS', 'Hub', 'AI', 'Path', 'Flow', 'Labs', 'Stack'],
    ],
    descriptionTemplates: [
      'Clinical decision support platform using AI to improve diagnostic accuracy.',
      'Remote patient monitoring system for chronic disease management.',
      'Digital therapeutics platform delivering evidence-based interventions via mobile.',
      'Healthcare interoperability solution connecting fragmented EHR systems.',
      'Mental health platform matching patients with therapists using AI-driven assessments.',
    ],
    strengthPool: [
      'FDA clearance already obtained',
      'Clinical trial data showing 40% improvement in outcomes',
      'Strong physician adoption and referral network',
      'EHR integration with top 5 health systems',
      'Insurance reimbursement codes secured',
      'HIPAA-compliant infrastructure from day one',
      'Former hospital CIO on advisory board',
      'Recurring revenue from per-patient-per-month model',
    ],
    riskPool: [
      'Long sales cycles with hospital systems (12-18 months)',
      'Regulatory approval timeline unpredictable',
      'Reimbursement landscape shifting',
      'Clinical validation still in early stages',
      'Data privacy regulations vary by jurisdiction',
      'Healthcare procurement notoriously slow',
      'Physician adoption requires significant change management',
      'Competition from established health IT vendors',
    ],
    redFlagPool: [
      'Clinical data not peer-reviewed',
      'FDA submission delayed twice',
      'Key hospital partner pulled out of pilot',
      'Patient data breach in early beta testing',
      'CEO making clinical claims not supported by evidence',
    ],
    ddPool: [
      'Clinical advisors confirm product efficacy in target population.',
      'Hospital pilot data shows strong adoption metrics.',
      'Regulatory pathway is clear with FDA pre-submission feedback positive.',
      'Competitive moat primarily around clinical validation data.',
      'Reimbursement strategy well-defined with early payor engagement.',
    ],
  },
  'AI/ML': {
    nameWords: [
      ['Neural', 'Deep', 'Cortex', 'Tensor', 'Synth', 'Cognit', 'Logic', 'Vertex', 'Atlas', 'Prime'],
      ['AI', 'Labs', 'Mind', 'Net', 'Core', 'Sense', 'IQ', 'Engine', 'io', 'X'],
    ],
    descriptionTemplates: [
      'Foundation model fine-tuning platform enabling enterprise-specific AI deployments.',
      'Computer vision system automating quality control for manufacturing.',
      'NLP platform converting unstructured data into actionable business intelligence.',
      'AI agent framework for automating complex multi-step business workflows.',
      'MLOps platform simplifying model deployment, monitoring, and governance at scale.',
    ],
    strengthPool: [
      'Proprietary training data from industry partnerships',
      'Model performance exceeds GPT-4 on domain tasks',
      'Strong research team with published papers',
      'Data flywheel creating compounding advantage',
      'Enterprise-ready security and compliance',
      'Cost-efficient inference architecture',
      'First-mover in underserved vertical AI niche',
      'Repeat enterprise customers expanding usage quarterly',
    ],
    riskPool: [
      'OpenAI/Google could launch competing features',
      'Compute costs high and scaling unpredictably',
      'Talent market for ML engineers extremely competitive',
      'Model accuracy inconsistent across edge cases',
      'Customer data handling creates liability exposure',
      'Rapid pace of foundational model improvements',
      'Open-source models closing performance gap',
      'Unclear moat if not data-driven',
    ],
    redFlagPool: [
      'Demo performance doesn\'t match production metrics',
      'Founder overpromising AGI-level capabilities',
      'Key researcher poached by major tech company',
      'IP ownership dispute with former employer',
      'Compute costs growing faster than revenue',
    ],
    ddPool: [
      'Technical deep-dive confirms model architecture is sound.',
      'Benchmark results independently verified.',
      'Customer interviews confirm real productivity improvements.',
      'Compute cost trajectory manageable with planned optimizations.',
      'Team depth in ML research is a clear competitive advantage.',
    ],
  },
  DevTools: {
    nameWords: [
      ['Code', 'Dev', 'Ship', 'Build', 'Git', 'Deploy', 'Stack', 'Pipe', 'Test', 'Run'],
      ['ly', 'Base', 'Ops', 'Kit', 'Hub', 'Flow', 'Craft', 'ify', 'Space', 'Lab'],
    ],
    descriptionTemplates: [
      'Developer productivity platform reducing CI/CD pipeline complexity by 80%.',
      'Code review automation tool using AI to catch bugs before production.',
      'Database management platform simplifying schema migrations for distributed teams.',
      'Observability platform providing real-time debugging for microservices architectures.',
      'API development toolkit accelerating integration builds from weeks to hours.',
    ],
    strengthPool: [
      'Developer NPS of 80+ with organic virality',
      'Bottom-up adoption in Fortune 500 companies',
      'Open-source community with 10K+ GitHub stars',
      'Integration with every major cloud provider',
      'Product-led growth with < $500 CAC',
      'Usage-based pricing aligned with customer value',
      'Strong developer brand and content marketing',
      'Time-to-value under 30 minutes for new users',
    ],
    riskPool: [
      'Platform risk from major cloud providers building similar',
      'Developer tools notoriously hard to monetize',
      'Open-source competitors with active communities',
      'Enterprise sales motion still unproven',
      'Pricing pushback from developer-led organizations',
      'Category may be absorbed into larger platforms',
      'Free tier usage doesn\'t convert well to paid',
      'Technical debt from rapid feature shipping',
    ],
    redFlagPool: [
      'Free tier represents 95% of users with no conversion path',
      'AWS announced a competing service last quarter',
      'Key engineering leads burned out from 18-month sprint',
      'Community sentiment turning negative on recent changes',
      'Revenue metrics include heavy discounting',
    ],
    ddPool: [
      'Developer community highly engaged and growing.',
      'Paid conversion rate improving quarter over quarter.',
      'Technical architecture elegant and well-documented.',
      'Competitive analysis shows clear differentiation on speed.',
      'Enterprise pilot results promising with strong expansion signals.',
    ],
  },
  Marketplace: {
    nameWords: [
      ['Trade', 'Swap', 'Fair', 'Bazaar', 'Market', 'Source', 'Link', 'Match', 'Connect', 'Deal'],
      ['ify', 'Hub', 'ly', 'Base', 'Port', 'Net', 'Place', 'Zone', 'Dock', 'Go'],
    ],
    descriptionTemplates: [
      'B2B marketplace connecting suppliers directly with retailers, cutting out distributors.',
      'Vertical marketplace for professional services with built-in escrow and project management.',
      'Two-sided platform matching freelance specialists with enterprise project needs.',
      'Supply chain marketplace digitizing procurement for a $500B offline industry.',
      'Rental marketplace for underutilized commercial assets and equipment.',
    ],
    strengthPool: [
      'Strong liquidity on both sides of marketplace',
      'Take rate above 15% with room to expand',
      'Network effects accelerating with scale',
      'Supply side locked in with exclusive partnerships',
      'Transaction volume growing 30% MoM',
      'Repeat transaction rate above 60%',
      'Geographic expansion playbook proven in 3 cities',
      'Managed marketplace model increases trust and conversion',
    ],
    riskPool: [
      'Chicken-and-egg problem in new markets',
      'Disintermediation risk once buyers and sellers connect',
      'Capital-intensive market expansion',
      'Marketplace leakage to direct relationships',
      'Regulatory risk in certain categories',
      'Unit economics negative in early markets',
      'Competition from established horizontal marketplaces',
      'Quality control at scale is challenging',
    ],
    redFlagPool: [
      'GMV growth masking declining take rates',
      'High supplier churn indicating poor value proposition',
      'Customer acquisition subsidized by unsustainable incentives',
      'Single market dependency for 80% of volume',
      'Marketplace quality complaints trending upward',
    ],
    ddPool: [
      'Both sides of marketplace report strong satisfaction scores.',
      'Take rate sustainable based on value delivered.',
      'Geographic expansion economics improving with each new market.',
      'Competitive moat deepening through data and network effects.',
      'Supply acquisition costs declining as brand awareness grows.',
    ],
  },
  Consumer: {
    nameWords: [
      ['Pop', 'Snap', 'Glow', 'Buzz', 'Drift', 'Vibe', 'Echo', 'Spark', 'Wave', 'Rise'],
      ['ly', 'App', 'Club', 'Box', 'Me', 'Go', 'Up', 'Now', 'Play', 'Joy'],
    ],
    descriptionTemplates: [
      'Social commerce platform turning influencer content into shoppable experiences.',
      'Subscription wellness brand with personalized health products delivered monthly.',
      'Mobile-first personal finance app gamifying savings for Gen Z.',
      'Creator economy platform enabling fans to directly support and interact with creators.',
      'Consumer social app connecting people through shared real-world activities.',
    ],
    strengthPool: [
      'Viral growth coefficient above 1.3',
      'DAU/MAU ratio exceeding 50%',
      'Strong brand affinity with target demographic',
      'Organic install rate above 60% (low CAC)',
      'Retention curves flattening at healthy levels',
      'User-generated content driving engagement loop',
      'Celebrity/influencer partnerships secured',
      'Category-defining brand positioning',
    ],
    riskPool: [
      'Consumer preferences shift rapidly',
      'Platform dependency (App Store, social media algorithms)',
      'Monetization model unproven at scale',
      'High churn typical of consumer apps',
      'CAC rising as easy-to-reach users saturated',
      'Competition from well-funded incumbents',
      'Engagement metrics may not translate to revenue',
      'Regulatory risk around data collection',
    ],
    redFlagPool: [
      'Engagement metrics declining month over month',
      'Influencer partnerships are paid, not organic',
      'App Store rating below 3.5 stars',
      'Revenue heavily dependent on advertising',
      'Founder building for personal taste, not market demand',
    ],
    ddPool: [
      'User interviews reveal strong emotional connection to product.',
      'Retention data shows healthy long-term engagement.',
      'Monetization tests showing promising early conversion.',
      'Brand positioning resonates clearly with target demographic.',
      'Organic growth channels validated through attribution analysis.',
    ],
  },
  CleanTech: {
    nameWords: [
      ['Green', 'Solar', 'Terra', 'Eco', 'Volt', 'Wind', 'Carbon', 'Hydro', 'Flux', 'Amp'],
      ['ify', 'Grid', 'Power', 'Labs', 'Energy', 'Tech', 'Works', 'Source', 'Flow', 'Neutral'],
    ],
    descriptionTemplates: [
      'Carbon capture technology converting industrial emissions into commercial building materials.',
      'Smart grid management platform optimizing renewable energy distribution.',
      'Next-generation battery technology for grid-scale energy storage.',
      'EV charging infrastructure platform for commercial fleets.',
      'Agricultural carbon credit marketplace connecting farms with corporate buyers.',
    ],
    strengthPool: [
      'Patented technology with clear IP protection',
      'Government contracts and subsidies secured',
      'Strong tailwinds from climate regulation',
      'Unit costs declining on predictable curve',
      'Strategic partnerships with energy majors',
      'First commercial deployment generating revenue',
      'World-class scientific advisory board',
      'Carbon credit revenue providing second revenue stream',
    ],
    riskPool: [
      'Long development timelines before commercialization',
      'Capital-intensive manufacturing scale-up',
      'Dependent on government policy and incentives',
      'Technology risk — unproven at commercial scale',
      'Commodity price exposure',
      'Permitting and regulatory approval timelines',
      'Competition from established energy companies',
      'Customer adoption requires behavior change',
    ],
    redFlagPool: [
      'Lab results not replicated at pilot scale',
      'Key government subsidy program under political threat',
      'Manufacturing partner experiencing financial difficulties',
      'Founder overselling climate impact claims',
      'Technology relies on rare earth minerals with supply risk',
    ],
    ddPool: [
      'Independent lab verification of core technology claims.',
      'Pilot deployment data tracking expectations.',
      'Government policy analysis suggests stable incentive environment.',
      'Manufacturing cost projections realistic based on comparable tech.',
      'IP portfolio strong with multiple granted patents.',
    ],
  },
  EdTech: {
    nameWords: [
      ['Learn', 'Edu', 'Skill', 'Class', 'Study', 'Mind', 'Tutor', 'Scholar', 'Brain', 'Know'],
      ['ly', 'Path', 'Hub', 'ify', 'Forge', 'Stack', 'Quest', 'Pro', 'Lab', 'Up'],
    ],
    descriptionTemplates: [
      'AI-powered adaptive learning platform personalizing curriculum for K-12 students.',
      'Corporate upskilling platform with hands-on simulations for technical roles.',
      'Micro-credentialing platform partnering with universities for industry-recognized certifications.',
      'Language learning app using AI conversation partners for immersive practice.',
      'Cohort-based learning platform for professional development communities.',
    ],
    strengthPool: [
      'Measurable learning outcomes improving student performance 30%',
      'School district contracts with multi-year renewals',
      'Strong content library covering core curriculum areas',
      'Enterprise training budget shift to digital accelerating',
      'High completion rates vs industry average',
      'AI personalization creating measurable engagement lift',
      'Strategic university partnerships for accreditation',
      'Low marginal cost of content delivery',
    ],
    riskPool: [
      'School procurement cycles are long and seasonal',
      'Consumer willingness to pay for education declining',
      'Content quality hard to maintain at scale',
      'Competition from free educational content platforms',
      'Teacher adoption requires training and change management',
      'Enterprise budget cuts in economic downturns',
      'Engagement drops off after initial enthusiasm',
      'Platform dependency on school technology infrastructure',
    ],
    redFlagPool: [
      'Completion rates below 15% for paid courses',
      'School contracts churning after first year',
      'Content largely aggregated from free sources',
      'No measurable learning outcome improvements',
      'Founder has no education sector experience',
    ],
    ddPool: [
      'Pilot data from school districts shows strong engagement.',
      'Content quality verified by curriculum experts.',
      'Enterprise customer interviews confirm training ROI.',
      'Competitive differentiation clear in AI personalization.',
      'Pricing model aligned with customer willingness to pay.',
    ],
  },
  Cybersecurity: {
    nameWords: [
      ['Shield', 'Guard', 'Sentinel', 'Cipher', 'Armor', 'Fort', 'Lock', 'Watch', 'Defend', 'Proof'],
      ['AI', 'Labs', 'Net', 'Sec', 'io', 'X', 'Gate', 'Core', 'Base', 'Ops'],
    ],
    descriptionTemplates: [
      'AI-powered threat detection platform identifying zero-day attacks in real time.',
      'Identity and access management solution for multi-cloud enterprise environments.',
      'Security posture management platform for DevSecOps teams.',
      'Email security platform using behavioral analysis to prevent phishing.',
      'Data loss prevention solution for remote and hybrid workforces.',
    ],
    strengthPool: [
      'Zero-day detection rate above 95% in independent tests',
      'SOC 2 Type II certification completed',
      'CISO advisory board with Fortune 100 representation',
      'Threat intelligence database updated in real time',
      'Low false positive rate vs competitors',
      'Regulatory tailwinds increasing security spend',
      'Channel partnerships with major SIs and MSSPs',
      'Average deal size growing quarterly',
    ],
    riskPool: [
      'Cybersecurity buyer fatigue (too many vendors)',
      'Large incumbents (CrowdStrike, Palo Alto) expanding into space',
      'Sales cycle lengthening due to procurement complexity',
      'Talent scarcity for security engineers',
      'Customer evaluation cycles include lengthy POCs',
      'Product liability if a breach occurs despite tool',
      'Rapid threat landscape changes require constant R&D',
      'Channel partner conflicts in enterprise accounts',
    ],
    redFlagPool: [
      'Product missed a major vulnerability in recent audit',
      'Former customer experienced breach while using platform',
      'Key security researcher left for competitor',
      'SOC 2 audit findings not yet remediated',
      'Over-reliance on signature-based detection',
    ],
    ddPool: [
      'Independent security audit confirms detection capabilities.',
      'Customer references from regulated industries positive.',
      'Architecture review shows modern, scalable design.',
      'Threat intelligence data is differentiated and proprietary.',
      'Sales pipeline weighted toward enterprise accounts.',
    ],
  },
  DeepTech: {
    nameWords: [
      ['Quantum', 'Photon', 'Axion', 'Nano', 'Fusion', 'Helix', 'Proton', 'Nebula', 'Cryo', 'Ion'],
      ['Labs', 'Tech', 'Works', 'Dynamics', 'Systems', 'io', 'X', 'Core', 'ium', 'Ware'],
    ],
    descriptionTemplates: [
      'Quantum computing platform offering error-corrected qubits for enterprise simulation.',
      'Novel semiconductor material enabling 10x more efficient edge computing.',
      'Autonomous robotics system for warehouse and logistics automation.',
      'Photonic computing architecture achieving orders of magnitude energy savings.',
      'Advanced materials company developing next-gen composites for aerospace.',
    ],
    strengthPool: [
      'Breakthrough technology with granted patents',
      'Team includes 3 PhDs from top research institutions',
      'Government and defense contracts providing stable revenue',
      'Technology validated by independent research labs',
      'First-mover advantage in emerging technical category',
      'Strategic partnerships with manufacturing leaders',
      'Published peer-reviewed research validating approach',
      'Technology applicable across multiple large industries',
    ],
    riskPool: [
      'Multi-year R&D timeline before commercial product',
      'Capital requirements significantly above typical startups',
      'Technology risk — approach may not scale',
      'Market timing uncertain for breakthrough technology',
      'Talent highly concentrated in small academic pool',
      'Manufacturing scale-up is an unsolved problem',
      'Customer education needed for novel technology',
      'Competitor with different approach may win',
    ],
    redFlagPool: [
      'Lab results can\'t be independently replicated',
      'Key patent challenged by university IP claim',
      'Lead scientist splitting time with academic position',
      'Technology requires materials that aren\'t commercially available',
      'Burn rate unsustainable without next funding round',
    ],
    ddPool: [
      'Technical advisory board includes recognized domain experts.',
      'Patent portfolio appears defensible and broad.',
      'Lab demonstrations validated during due diligence visit.',
      'Government grant funding provides non-dilutive runway.',
      'Market sizing analysis conservative but still attractive.',
    ],
  },
  Biotech: {
    nameWords: [
      ['Gene', 'Syn', 'Vivo', 'Evo', 'Omni', 'Cellu', 'Regen', 'Proto', 'Stem', 'Lyric'],
      ['Bio', 'Med', 'Therapeutics', 'Gen', 'Labs', 'Rx', 'Science', 'Pharma', 'ics', 'ix'],
    ],
    descriptionTemplates: [
      'Gene therapy platform targeting rare diseases with high unmet medical need.',
      'Synthetic biology company engineering microbes for industrial chemical production.',
      'Drug discovery platform using AI to accelerate lead compound identification.',
      'Cell therapy manufacturing platform reducing production costs by 80%.',
      'Precision medicine company developing companion diagnostics for targeted therapies.',
    ],
    strengthPool: [
      'Orphan drug designation providing 7-year market exclusivity',
      'Phase 2 clinical data showing strong efficacy signal',
      'Strategic pharma partnership with milestone payments',
      'Platform applicable across multiple therapeutic areas',
      'Experienced drug development leadership team',
      'First-in-class mechanism with clear biological rationale',
      'Manufacturing process validated at commercial scale',
      'Strong IP portfolio with freedom to operate',
    ],
    riskPool: [
      'Clinical trial failure rate historically high (90%)',
      'Regulatory pathway complex and expensive',
      'Manufacturing scale-up challenges for biologics',
      'Patent cliff risk on core technology',
      'Reimbursement uncertainty for novel therapies',
      'Competition from large pharma companies',
      'Long time to market (7-12 years typical)',
      'Capital requirements in hundreds of millions',
    ],
    redFlagPool: [
      'Phase 1 safety signal that hasn\'t been fully addressed',
      'Key opinion leader withdrew support',
      'Manufacturing process relies on single-source supplier',
      'Regulatory feedback letter raised significant concerns',
      'Science based on retracted or questioned research paper',
    ],
    ddPool: [
      'Scientific advisory board strongly endorses approach.',
      'Clinical data reviewed by independent statistician.',
      'Regulatory strategy reviewed by former FDA examiner.',
      'Manufacturing partner relationship stable and scalable.',
      'IP landscape analysis confirms freedom to operate.',
    ],
  },
  SpaceTech: {
    nameWords: [
      ['Orbit', 'Astro', 'Stellar', 'Cosmos', 'Rocket', 'Lunar', 'Nova', 'Apex', 'Astra', 'Sky'],
      ['Labs', 'Tech', 'Dynamics', 'Works', 'Systems', 'Space', 'X', 'Link', 'Sat', 'Net'],
    ],
    descriptionTemplates: [
      'Small satellite constellation providing global IoT connectivity.',
      'Space debris tracking and removal technology for orbital sustainability.',
      'In-orbit manufacturing platform for advanced materials.',
      'Earth observation analytics platform for agriculture and climate monitoring.',
      'Launch vehicle component manufacturer reducing mission costs.',
    ],
    strengthPool: [
      'First successful orbital deployment completed',
      'Government launch contracts secured',
      'Proprietary propulsion technology with cost advantages',
      'Strategic partnership with major aerospace prime',
      'Satellite-as-a-service model creating recurring revenue',
      'Ground station network providing global coverage',
      'Team includes former NASA/SpaceX engineers',
      'Commercial and defense dual-use applications',
    ],
    riskPool: [
      'Extremely capital-intensive development',
      'Launch failure risk (single mission can set back years)',
      'Regulatory complexity around orbital slots and spectrum',
      'Long sales cycles with government customers',
      'SpaceX/Blue Origin competitive pressure',
      'Space debris creating operational risk',
      'Limited commercial market for some applications',
      'Insurance costs for space assets',
    ],
    redFlagPool: [
      'Last launch attempt failed',
      'Key regulatory approval denied',
      'Primary launch provider raising prices significantly',
      'Satellite performance below specification on orbit',
      'Founder promising timelines inconsistent with physics',
    ],
    ddPool: [
      'Engineering team has relevant flight heritage.',
      'Launch manifest secured with reliable provider.',
      'Revenue model validated through customer LOIs.',
      'Regulatory strategy reviewed by space law experts.',
      'Technology readiness level appropriate for stage.',
    ],
  },
  AgTech: {
    nameWords: [
      ['Farm', 'Crop', 'Seed', 'Grow', 'Harvest', 'Field', 'Root', 'Terra', 'Grain', 'Bloom'],
      ['ify', 'AI', 'Tech', 'Labs', 'OS', 'Hub', 'Works', 'Data', 'Link', 'Sense'],
    ],
    descriptionTemplates: [
      'Precision agriculture platform using satellite and drone data for crop optimization.',
      'Indoor farming technology enabling year-round production with 90% less water.',
      'Soil health monitoring system providing real-time microbiome analysis.',
      'Farm-to-table supply chain platform reducing food waste by 40%.',
      'Agricultural biotechnology company developing drought-resistant seed variants.',
    ],
    strengthPool: [
      'Yield improvements of 20-30% in field trials',
      'USDA grant funding secured',
      'Partnerships with major agricultural cooperatives',
      'Hardware costs declining with each production run',
      'Recurring SaaS revenue from farm management tools',
      'Sustainability premium from ESG-focused buyers',
      'Data moat from millions of acres of soil data',
      'Regulatory tailwinds from sustainability mandates',
    ],
    riskPool: [
      'Farmer adoption requires significant behavior change',
      'Seasonal revenue patterns create cash flow challenges',
      'Hardware deployment logistics complex at scale',
      'Weather and climate variability affect outcomes',
      'Competition from large agricultural incumbents',
      'Pricing sensitivity in agricultural markets',
      'Technology effectiveness varies by crop and region',
      'Long sales cycles with conservative farming operations',
    ],
    redFlagPool: [
      'Field trial results not replicated across geographies',
      'Hardware reliability issues in harsh conditions',
      'Key agricultural partnership was non-binding LOI only',
      'Farmer churn rate above 40% after first season',
      'Technology only works for specific crop types',
    ],
    ddPool: [
      'Farm visits confirm technology works in real conditions.',
      'Farmer testimonials consistently positive on ROI.',
      'Hardware reliability improving with each product generation.',
      'Sales pipeline includes multiple large cooperative deals.',
      'Cost-per-acre economics attractive vs manual methods.',
    ],
  },
  PropTech: {
    nameWords: [
      ['Home', 'Estate', 'Space', 'Build', 'Tower', 'Urban', 'Nest', 'Place', 'Roof', 'Key'],
      ['ify', 'Hub', 'Base', 'OS', 'ly', 'Works', 'Tech', 'Grid', 'Link', 'Flow'],
    ],
    descriptionTemplates: [
      'Property management platform automating operations for mid-size landlords.',
      'Construction technology platform reducing project delays through AI scheduling.',
      'Real estate investment analytics platform for institutional investors.',
      'Smart building management system optimizing energy use in commercial properties.',
      'Tenant experience platform increasing retention for multifamily operators.',
    ],
    strengthPool: [
      'Managing 50K+ units on platform',
      'Average property saves $200/unit/year on operations',
      'Integration with top property management systems',
      'Strong net revenue retention from expansion within portfolios',
      'Dual revenue from SaaS fees and transaction revenue',
      'Real estate operators notoriously sticky once onboarded',
      'IoT sensor network creating proprietary building data',
      'Partnerships with top real estate developers',
    ],
    riskPool: [
      'Real estate market cyclicality affects customer budgets',
      'Long sales cycles with property management companies',
      'Technology adoption slow in conservative industry',
      'Competition from incumbent property management software',
      'Hardware deployment costs in existing buildings',
      'Interest rate environment affecting real estate market',
      'Geographic fragmentation of real estate markets',
      'Building-specific customization requirements',
    ],
    redFlagPool: [
      'Key customer representing 35% of revenue churned',
      'Hardware installation costs running 3x estimates',
      'Building code compliance issues in some markets',
      'Founder has no real estate industry experience',
      'Product roadmap overly ambitious for team size',
    ],
    ddPool: [
      'Property manager references confirm operational improvements.',
      'Unit economics improve significantly at portfolio scale.',
      'Technology stack well-suited for commercial building environments.',
      'Competitive positioning clear against legacy property software.',
      'Expansion strategy within existing customers well-defined.',
    ],
  },
};

// ============================================================
// REGION MODIFIERS — Feature 5
// ============================================================

export const REGION_MODIFIERS: Record<StartupRegion, {
  exitMultipleMod: number;
  regulatoryRiskMod: number;
  tier1CoInvestorMod: number;
  talentQualityMod: number;
  label: string;
  shortLabel: string;
}> = {
  silicon_valley: { exitMultipleMod: 1.25, regulatoryRiskMod: 0.9,  tier1CoInvestorMod: 1.3,  talentQualityMod: 1.2,  label: 'Silicon Valley', shortLabel: 'SV' },
  nyc:            { exitMultipleMod: 1.10, regulatoryRiskMod: 1.1,  tier1CoInvestorMod: 1.1,  talentQualityMod: 1.1,  label: 'New York City',   shortLabel: 'NYC' },
  boston:         { exitMultipleMod: 1.05, regulatoryRiskMod: 1.0,  tier1CoInvestorMod: 0.9,  talentQualityMod: 1.15, label: 'Boston',          shortLabel: 'BOS' },
  london:         { exitMultipleMod: 1.00, regulatoryRiskMod: 1.3,  tier1CoInvestorMod: 0.8,  talentQualityMod: 1.0,  label: 'London',          shortLabel: 'LON' },
  berlin:         { exitMultipleMod: 0.95, regulatoryRiskMod: 1.2,  tier1CoInvestorMod: 0.7,  talentQualityMod: 1.0,  label: 'Berlin',          shortLabel: 'BER' },
  singapore:      { exitMultipleMod: 1.00, regulatoryRiskMod: 1.25, tier1CoInvestorMod: 0.75, talentQualityMod: 1.0,  label: 'Singapore',       shortLabel: 'SG' },
  austin:         { exitMultipleMod: 0.90, regulatoryRiskMod: 0.85, tier1CoInvestorMod: 0.65, talentQualityMod: 0.95, label: 'Austin',          shortLabel: 'ATX' },
  chicago:        { exitMultipleMod: 0.90, regulatoryRiskMod: 0.9,  tier1CoInvestorMod: 0.7,  talentQualityMod: 0.95, label: 'Chicago',         shortLabel: 'CHI' },
};

const ALL_REGIONS: StartupRegion[] = ['silicon_valley', 'nyc', 'boston', 'london', 'berlin', 'singapore', 'austin', 'chicago'];

function pickRegion(geographicFocus?: GeographicFocus): StartupRegion {
  if (!geographicFocus || geographicFocus === 'global') {
    return pickRandom(ALL_REGIONS);
  }
  // 60% chance from focused region, 40% from others
  if (Math.random() < 0.60) {
    return geographicFocus as StartupRegion;
  }
  const others = ALL_REGIONS.filter(r => r !== geographicFocus);
  return pickRandom(others);
}

// ============================================================
// CO-INVESTOR NAMES — 30+ realistic VC firm names
// ============================================================

export const COINVESTOR_NAMES: string[] = [
  'Sequoia Capital',
  'Andreessen Horowitz',
  'Accel Partners',
  'Benchmark Capital',
  'Lightspeed Venture Partners',
  'Greylock Partners',
  'Founders Fund',
  'Union Square Ventures',
  'Bessemer Venture Partners',
  'Index Ventures',
  'General Catalyst',
  'NEA',
  'Insight Partners',
  'Tiger Global',
  'Ribbit Capital',
  'Thrive Capital',
  'Spark Capital',
  'First Round Capital',
  'Redpoint Ventures',
  'Lux Capital',
  'Felicis Ventures',
  'Craft Ventures',
  'Addition',
  'Coatue Management',
  'Altimeter Capital',
  'IVP',
  'Battery Ventures',
  'Sapphire Ventures',
  'Norwest Venture Partners',
  'Scale Venture Partners',
  'Menlo Ventures',
  'GV',
  'Khosla Ventures',
  'Bain Capital Ventures',
  'Canaan Partners',
];

// ============================================================
// ACQUIRER NAMES
// ============================================================

const FAANG_ACQUIRERS = [
  'Alphabet', 'Meta', 'Apple', 'Amazon', 'Microsoft',
  'Nvidia', 'Salesforce', 'Oracle', 'Adobe', 'Netflix',
];

const ENTERPRISE_ACQUIRERS = [
  'ServiceNow', 'Workday', 'Snowflake', 'Datadog', 'Palo Alto Networks',
  'CrowdStrike', 'Atlassian', 'HubSpot', 'Twilio', 'Splunk',
  'Cisco Systems', 'SAP', 'IBM', 'VMware', 'Intuit',
];

const PE_ACQUIRERS = [
  'Thoma Bravo', 'Vista Equity Partners', 'Silver Lake', 'Hellman & Friedman',
  'Francisco Partners', 'Insight Partners PE', 'KKR Tech', 'Bain Capital PE',
  'Permira', 'Blackstone Growth',
];

const ACQUIHIRE_COMPANIES = [
  'Shopify', 'Stripe', 'Square', 'Figma', 'Notion',
  'Vercel', 'Supabase', 'Linear', 'Retool', 'Airtable',
  'Plaid', 'Brex', 'Rippling', 'Ramp', 'Mercury',
];

function generateStrategicRivalName(sector: string): string {
  const sectorKey = Object.keys(SECTOR_DATA).find(k => k === sector) ?? 'SaaS';
  const data = SECTOR_DATA[sectorKey];
  const w1 = pickRandom(data.nameWords[0]);
  const w2 = pickRandom(data.nameWords[1]);
  return `${w1}${w2}`;
}

export function generateAcquirerName(type: AcquirerType, sector?: string): string {
  switch (type) {
    case 'faang':          return pickRandom(FAANG_ACQUIRERS);
    case 'enterprise':     return pickRandom(ENTERPRISE_ACQUIRERS);
    case 'pe':             return pickRandom(PE_ACQUIRERS);
    case 'acquihire':      return pickRandom(ACQUIHIRE_COMPANIES);
    case 'strategic_rival': return generateStrategicRivalName(sector ?? 'SaaS');
  }
}

// ============================================================
// ACQUIRER MULTIPLE RANGES
// ============================================================

export function getAcquirerMultipleRange(type: AcquirerType): { min: number; max: number } {
  switch (type) {
    case 'faang':           return { min: 10, max: 20 };
    case 'enterprise':      return { min: 3,  max: 7 };
    case 'acquihire':       return { min: 0.5, max: 2 };
    case 'pe':              return { min: 2,  max: 5 };
    case 'strategic_rival': return { min: 4,  max: 10 };
  }
}

// ============================================================
// FOUNDER NAME GENERATION
// ============================================================

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'James', 'Sarah', 'Michael', 'Priya', 'David', 'Lisa', 'Carlos', 'Wei',
  'Aisha', 'Nathan', 'Mei', 'Daniel', 'Sophia', 'Raj', 'Elena', 'Marcus',
  'Hannah', 'Omar', 'Yuki', 'Tobias', 'Amara', 'Liam', 'Zara', 'Ethan',
  'Nadia', 'Chris', 'Samira', 'Leo', 'Ava', 'Mateo', 'Isla', 'Arjun',
];

const LAST_NAMES = [
  'Chen', 'Patel', 'Kim', 'Nguyen', 'Singh', 'O\'Brien', 'Martinez', 'Zhang',
  'Williams', 'Tanaka', 'Khan', 'Anderson', 'Park', 'Larson', 'Gupta', 'Torres',
  'Suzuki', 'Hoffman', 'Ali', 'Müller', 'Sato', 'Brown', 'Garcia', 'Wilson',
  'Lee', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis',
  'Robinson', 'Walker', 'Young', 'Hall', 'Allen', 'King', 'Wright', 'Scott',
];

function generateFounderName(): string {
  return `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`;
}

// ============================================================
// CO-INVESTOR GENERATION
// ============================================================

export function generateCoInvestor(): CoInvestor {
  const tier = weightedRandom<CoInvestor['tier']>(
    ['tier1', 'friendly', 'competitive', 'strategic'],
    [15, 40, 25, 20]
  );

  const tierStats: Record<CoInvestor['tier'], { failMod: number; exitMod: number; growthMod: number; repMin: number; repMax: number }> = {
    tier1:       { failMod: 0.90, exitMod: 1.15, growthMod: 1.10, repMin: 80, repMax: 100 },
    friendly:    { failMod: 0.95, exitMod: 1.05, growthMod: 1.05, repMin: 50, repMax: 80 },
    competitive: { failMod: 1.00, exitMod: 1.05, growthMod: 0.95, repMin: 60, repMax: 90 },
    strategic:   { failMod: 0.95, exitMod: 1.20, growthMod: 1.00, repMin: 40, repMax: 70 },
  };

  const stats = tierStats[tier];

  return {
    name: pickRandom(COINVESTOR_NAMES),
    tier,
    failMod: stats.failMod,
    exitMod: stats.exitMod,
    growthMod: stats.growthMod,
    reputation: randomInt(stats.repMin, stats.repMax),
  };
}

// ============================================================
// STARTUP GENERATION
// ============================================================

function generateUnitEconomics(stage: FundStage): UnitEconomics {
  const ranges: Record<FundStage, { cacMin: number; cacMax: number; ltvMin: number; ltvMax: number; marginMin: number; marginMax: number }> = {
    pre_seed: { cacMin: 50,  cacMax: 500,  ltvMin: 100,  ltvMax: 1000,  marginMin: 30, marginMax: 70 },
    seed:     { cacMin: 100, cacMax: 800,  ltvMin: 300,  ltvMax: 3000,  marginMin: 40, marginMax: 75 },
    series_a: { cacMin: 200, cacMax: 1500, ltvMin: 800,  ltvMax: 8000,  marginMin: 50, marginMax: 80 },
    growth:   { cacMin: 300, cacMax: 2500, ltvMin: 1500, ltvMax: 15000, marginMin: 55, marginMax: 85 },
  };

  const r = ranges[stage];
  const cac = randomInt(r.cacMin, r.cacMax);
  const ltv = randomInt(r.ltvMin, r.ltvMax);
  const ltvCacRatio = ltv / cac;
  const grossMargin = randomInt(r.marginMin, r.marginMax);
  // Payback = CAC / monthly gross profit per customer
  // Monthly revenue per customer ≈ LTV / 24 months avg lifetime
  // Monthly gross profit = monthly revenue * gross margin
  const monthlyRevPerCustomer = ltv / 24;
  const monthlyGrossProfit = monthlyRevPerCustomer * (grossMargin / 100);
  const paybackMonths = monthlyGrossProfit > 0 ? Math.round(cac / monthlyGrossProfit) : 36;

  return { cac, ltv, ltvCacRatio: Math.round(ltvCacRatio * 100) / 100, grossMargin, paybackMonths };
}

function generateCompanyMetrics(stage: FundStage): CompanyMetrics {
  const ranges: Record<FundStage, { mrrMin: number; mrrMax: number; growthMin: number; growthMax: number; churnMin: number; churnMax: number }> = {
    pre_seed: { mrrMin: 0,      mrrMax: 5000,    growthMin: 0.05, growthMax: 0.40, churnMin: 0.08, churnMax: 0.20 },
    seed:     { mrrMin: 5000,   mrrMax: 50000,   growthMin: 0.10, growthMax: 0.25, churnMin: 0.05, churnMax: 0.15 },
    series_a: { mrrMin: 50000,  mrrMax: 500000,  growthMin: 0.08, growthMax: 0.15, churnMin: 0.03, churnMax: 0.08 },
    growth:   { mrrMin: 500000, mrrMax: 5000000, growthMin: 0.05, growthMax: 0.10, churnMin: 0.01, churnMax: 0.05 },
  };

  const r = ranges[stage];
  const mrr = randomInt(r.mrrMin, r.mrrMax);
  const growthRate = randomBetween(r.growthMin, r.growthMax);
  const churn = randomBetween(r.churnMin, r.churnMax);
  const burnRate = randomInt(Math.max(mrr * 1.5, 20000), Math.max(mrr * 4, 100000));
  // Runway = estimated months of cash remaining based on net burn
  const netBurn = burnRate - mrr;
  const runway = netBurn > 0 ? Math.min(36, Math.max(3, randomInt(6, Math.round(24 * (mrr / burnRate + 0.5))))) : randomInt(18, 36);
  const customers = stage === 'pre_seed' ? randomInt(0, 50) : randomInt(10, 5000 * (['seed', 'series_a', 'growth'].indexOf(stage) + 1));

  return {
    mrr,
    growthRate: Math.round(growthRate * 1000) / 1000,
    customers,
    churn: Math.round(churn * 1000) / 1000,
    burnRate,
    runway,
  };
}

function generateMarketData(stage?: FundStage): MarketData {
  // Stage-appropriate TAM ranges
  const tamRanges: Record<FundStage, { min: number; max: number }> = {
    pre_seed: { min: 100_000_000, max: 5_000_000_000 },
    seed:     { min: 500_000_000, max: 10_000_000_000 },
    series_a: { min: 1_000_000_000, max: 25_000_000_000 },
    growth:   { min: 5_000_000_000, max: 50_000_000_000 },
  };
  const range = tamRanges[stage ?? 'seed'];
  const tamSize = randomInt(range.min, range.max);
  const tamGrowthRate = randomBetween(0.05, 0.30);
  const competitionLevel = weightedRandom<MarketData['competitionLevel']>(
    ['low', 'medium', 'high', 'saturated'],
    [20, 40, 30, 10]
  );

  return {
    tamSize,
    tamGrowthRate: Math.round(tamGrowthRate * 100) / 100,
    competitionLevel,
  };
}

function generateFounderTraits(stage: FundStage): FounderTraits {
  // Growth founders have slightly more experience
  const expBonus = stage === 'growth' ? 2 : stage === 'series_a' ? 1 : 0;

  return {
    grit: randomInt(3, 10),
    clarity: randomInt(3, 10),
    charisma: randomInt(2, 10),
    experience: Math.min(10, randomInt(2, 8) + expBonus),
  };
}

function generateStartupName(sector: string): string {
  const sectorKey = Object.keys(SECTOR_DATA).find(k => k === sector);
  if (!sectorKey) return `Startup${randomInt(100, 999)}`;

  const data = SECTOR_DATA[sectorKey];
  const w1 = pickRandom(data.nameWords[0]);
  const w2 = pickRandom(data.nameWords[1]);
  return `${w1}${w2}`;
}

function generateTeamSize(stage: FundStage): number {
  switch (stage) {
    case 'pre_seed': return randomInt(2, 5);
    case 'seed':     return randomInt(4, 15);
    case 'series_a': return randomInt(10, 50);
    case 'growth':   return randomInt(30, 200);
  }
}

export function generateStartup(stage: FundStage, market: MarketCycle, skillLevel: number, geographicFocus?: GeographicFocus): Startup {
  const sectors = Object.keys(SECTOR_DATA);
  const sector = pickRandom(sectors);
  const sectorData = SECTOR_DATA[sector];

  const name = generateStartupName(sector);
  const description = pickRandom(sectorData.descriptionTemplates);

  // Strengths, risks, red flags, DD notes
  const numStrengths = randomInt(2, 4);
  const numRisks = randomInt(1, 3);
  const numRedFlags = randomInt(0, 2);
  const numDD = randomInt(2, 4);

  // Skill level improves deal quality: fewer red flags, more strengths
  // Level 1: 10% chance of fewer flags. Level 5: 50%. Level 10: 100%.
  const skillBonus = Math.min(1, skillLevel * 0.10);

  const strengths = shuffleAndTake(sectorData.strengthPool, numStrengths + (skillLevel >= 5 ? 1 : 0));
  const risks = shuffleAndTake(sectorData.riskPool, numRisks);
  const redFlags = Math.random() < skillBonus
    ? shuffleAndTake(sectorData.redFlagPool, Math.max(0, numRedFlags - 1))
    : shuffleAndTake(sectorData.redFlagPool, numRedFlags);
  const ddNotes = shuffleAndTake(sectorData.ddPool, numDD);

  // Discovery source
  const discoverySource = weightedRandom<DiscoverySource>(
    ['inbound', 'referral', 'conference', 'news', 'cold_outreach'],
    [25, 30, 20, 10, 15]
  );

  // Founder willingness: 40-100, affected by market
  const marketWillingnessAdj: Record<MarketCycle, number> = {
    bull: -15,    // Founders have options
    normal: 0,
    cooldown: 10,
    hard: 20,     // Founders desperate
  };
  const founderWillingness = Math.min(100, Math.max(40,
    randomInt(40, 85) + marketWillingnessAdj[market]
  ));

  // Region (Feature 5)
  const region = pickRegion(geographicFocus);
  const regionMods = REGION_MODIFIERS[region];

  // Co-investors: 0-2 (tier1 probability affected by region)
  const numCoInvestors = weightedRandom([0, 1, 2], [40, 40, 20]);
  const coInvestors: CoInvestor[] = [];
  for (let i = 0; i < numCoInvestors; i++) {
    const ci = generateCoInvestor();
    // Reduce tier1 probability for lower-tier regions
    if (ci.tier === 'tier1' && Math.random() > regionMods.tier1CoInvestorMod) {
      ci.tier = 'friendly';
    }
    coInvestors.push(ci);
  }

  // Valuation
  const valRange = getBaseValuationRange(stage);
  const marketMult = getValuationMultiplier(stage, market);
  const valuation = Math.round(randomBetween(valRange.min, valRange.max) * marketMult);

  return {
    id: uuid(),
    name,
    sector,
    stage,
    description,
    founderName: generateFounderName(),
    founderTraits: generateFounderTraits(stage),
    teamSize: generateTeamSize(stage),
    unitEconomics: generateUnitEconomics(stage),
    metrics: generateCompanyMetrics(stage),
    marketData: generateMarketData(stage),
    valuation,
    strengths,
    risks,
    redFlags,
    ddNotes,
    discoverySource,
    founderWillingness,
    coInvestors,
    region,
  };
}

// ============================================================
// HELPERS
// ============================================================

function shuffleAndTake<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
