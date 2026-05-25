import type { CompetitorProfile } from './types';
import { buildComparisonRows, ratingToText } from './ilithiyana';

function rowFromProfile(c: CompetitorProfile) {
  return {
    name: c.name,
    model: c.model,
    pricingSummary: c.pricingSummary,
    careerGuidance: ratingToText(c.careerGuidance, {
      yes: 'Included',
      partial: 'Sometimes / add-on',
      varies: 'Depends on tutor or centre',
    }),
    managedProgramme: ratingToText(c.managedProgramme, {
      yes: 'Provider manages programme',
      partial: 'Some support after matching',
      varies: 'Parent manages after sign-up',
    }),
    sciencesFocus: ratingToText(c.sciencesFocus, {
      yes: 'Strong Sciences offering',
      partial: 'English/Maths focus at many locations',
      varies: 'Depends on tutor listed',
    }),
    onlineNationwide: ratingToText(c.onlineNationwide, {
      yes: 'Online, nationwide',
      partial: 'Online in some areas; centres in others',
      varies: 'Varies by tutor or branch',
    }),
  };
}

export const competitors: CompetitorProfile[] = [
  {
    slug: 'superprof',
    name: 'Superprof',
    website: 'https://www.superprof.co.za/',
    type: 'marketplace',
    typeLabel: 'Tutor marketplace',
    model: 'Browse tutors; parent hires and manages directly',
    pricingSummary: 'Contact pass (~R99) + roughly R150–R350/hour (tutor-set)',
    careerGuidance: 'no',
    managedProgramme: 'no',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'Large pool of tutors across many subjects',
      'Flexible hourly booking',
      'In-person or online depending on tutor',
    ],
    limitations: [
      'No programme structure — you vet, schedule, and follow up',
      'Quality and attendance vary tutor to tutor',
      'No bundled career guidance for matric planning',
      'Costs add up quickly for regular multi-subject support',
    ],
    bestFor: [
      'Parents who want maximum choice and will self-manage',
      'One-off help in a subject outside a structured programme',
    ],
    notIdealFor: [
      'Families needing consistent Maths/Science support through matric',
      'Parents tired of cancellations and coordination',
    ],
    whyPeopleSwitch: [
      'Tutors cancel or disappear mid-term',
      'No accountability for understanding before tests',
      'Hourly costs exceed a structured monthly programme',
      'No help with subject choices, university, or bursaries',
    ],
    vsSummary:
      'Superprof is a marketplace: you find a tutor, then you run the relationship. Ilithiyana is a managed CAPS programme for Grades 6–12 — tutor assigned, max 3 learners per session, recurring schedule, and weekly career guidance included from R1,000/month.',
    alternativeIntro:
      'Parents often leave Superprof when marketplace flexibility turns into inconsistency. If you need structure in Pure Maths or Physical Science — not another search — a managed online programme may fit better.',
    faq: [
      {
        question: 'Is Ilithiyana cheaper than Superprof?',
        answer:
          'Superprof can look cheap per hour, but eight hours at R250/hour is about R2,000 with no career support. Package A is R1,000/month for eight lesson hours plus career guidance.',
      },
      {
        question: 'Can I use both Superprof and Ilithiyana?',
        answer:
          'You can, but most families choose one model: self-managed hourly tutoring or Ilithiyana’s managed programme. Mixing often duplicates cost without fixing consistency.',
      },
    ],
    priority: 1,
  },
  {
    slug: 'kip-mcgrath',
    name: 'Kip McGrath',
    website: 'https://www.kipmcgrath.co.za/',
    type: 'franchise-centre',
    typeLabel: 'Franchise tutoring centres',
    model: 'Centre-based tuition; franchise quality varies by location',
    pricingSummary: 'Centre-dependent (contact local branch)',
    careerGuidance: 'no',
    managedProgramme: 'partial',
    sciencesFocus: 'partial',
    onlineNationwide: 'partial',
    strengths: [
      'Established brand with physical centres in many areas',
      'Structured centre programmes where the franchise is strong',
      'Familiar option for English and Maths support',
    ],
    limitations: [
      'Many centres emphasise English/Maths — not full Sciences stack',
      'Quality and format differ between franchises',
      'Travel often required unless your centre offers robust online',
      'Career guidance not bundled like Ilithiyana’s subscription',
    ],
    bestFor: [
      'Families near a strong centre wanting in-person English/Maths',
      'Learners who thrive in a physical classroom environment',
    ],
    notIdealFor: [
      'Physical Science / Life Sciences–heavy matric paths',
      'Families in rural or distant provinces without a nearby centre',
    ],
    whyPeopleSwitch: [
      'Need Physical Sciences or Life Sciences, not only English/Maths',
      'Centre quality did not match expectations',
      'Travel time or branch availability is impractical',
    ],
    vsSummary:
      'Kip McGrath is a franchise centre model — strong in some locations, focused on English/Maths at many branches. Ilithiyana is fully online, CAPS-aligned for Grades 6–12, with Sciences plus career guidance included in one managed programme.',
    alternativeIntro:
      'Kip McGrath suits families who want a local centre. If your child’s gap is in Physical Science or Life Sciences, or you are outside major metros, an online programme with a 1:3 ratio may be more practical.',
    faq: [
      {
        question: 'Does Ilithiyana replace Kip McGrath completely?',
        answer:
          'For many Gr 6–12 CAPS families needing Sciences and career guidance online, yes. If you rely on a trusted local Kip centre for English only, compare subjects and convenience before switching.',
      },
    ],
    priority: 1,
  },
  {
    slug: 'tutor-doctor',
    name: 'Tutor Doctor',
    website:
      'https://tutordoctor.co.za/tutoring-services/education-level/high-school/',
    type: 'premium-1-1',
    typeLabel: 'Premium 1-on-1 franchise',
    model: 'Matched 1-on-1 tutoring (in-home or online)',
    pricingSummary: 'Premium tier — typically well above R1,000/month for regular hours',
    careerGuidance: 'no',
    managedProgramme: 'partial',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'Personalised one-to-one attention',
      'Recognised franchise with matching support',
      'Flexible subject coverage through individual tutors',
    ],
    limitations: [
      'High cost for sustained matric-year support across subjects',
      'No small-group peer dynamic',
      'Career and pathway planning usually separate from tuition fees',
    ],
    bestFor: [
      'Budget-flexible families wanting exclusive 1-on-1',
      'Learners who will not engage in any group setting',
    ],
    notIdealFor: [
      'Price-sensitive families needing multi-subject structure all year',
      'Parents who want career guidance bundled into the monthly fee',
    ],
    whyPeopleSwitch: [
      'Monthly cost for multiple subjects is unsustainable',
      'Want peer learning in small groups, not isolation',
      'Need career guidance without paying a second provider',
    ],
    vsSummary:
      'Tutor Doctor sells premium 1-on-1 matching. Ilithiyana deliberately uses max 3 learners per session for attention at a lower programme price — with weekly career guidance included.',
    alternativeIntro:
      'If Tutor Doctor’s 1-on-1 model works but the invoice does not, compare total monthly cost: eight structured hours plus career sessions vs hourly premium rates.',
    faq: [
      {
        question: 'Is Ilithiyana 1-on-1 like Tutor Doctor?',
        answer:
          'No — Ilithiyana caps groups at three learners by design. Your child is still heard every session; the model is not private 1-on-1 at marketplace hourly rates.',
      },
    ],
    priority: 1,
  },
  {
    slug: 'genius-premium-tuition',
    name: 'Genius Premium Tuition',
    website: 'https://www.geniuspremiumtuition.com/',
    type: 'premium-1-1',
    typeLabel: 'Premium private tuition',
    model: 'High-touch private and small-group tuition (provider-led)',
    pricingSummary: 'Premium pricing — packages vary by grade and intensity',
    careerGuidance: 'partial',
    managedProgramme: 'yes',
    sciencesFocus: 'yes',
    onlineNationwide: 'partial',
    strengths: [
      'Structured premium offering with brand presence',
      'Strong focus on results-oriented tuition',
      'Multiple subjects including high school Sciences',
    ],
    limitations: [
      'Premium price point vs Ilithiyana’s R1,000/month programme',
      'Format and online reach depend on package and location',
      'Career component may not match Ilithiyana’s weekly included sessions',
    ],
    bestFor: [
      'Families prioritising premium positioning and intensive support',
    ],
    notIdealFor: [
      'Parents optimising value at roughly R1,000/month with career included',
    ],
    whyPeopleSwitch: [
      'Need similar structure without premium-tier pricing',
      'Want fully online access from any province',
    ],
    vsSummary:
      'Genius Premium Tuition competes in the premium structured space. Ilithiyana targets affordable managed online groups (1:3) with career guidance baked into Package A — built for CAPS families nationwide.',
    alternativeIntro:
      'Genius and Ilithiyana both sell structure, not a marketplace. Compare monthly all-in cost, group size, and whether career guidance is included or quoted separately.',
    faq: [],
    priority: 2,
  },
  {
    slug: 'the-tutor-company',
    name: 'The Tutor Company',
    website: 'https://thetutorcompany.co.za/',
    type: 'matching-service',
    typeLabel: 'Tutor matching service',
    model: 'Match families to tutors; ongoing relationship usually parent-led',
    pricingSummary: 'Varies by tutor matched',
    careerGuidance: 'no',
    managedProgramme: 'partial',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'Professional matching instead of random marketplace browsing',
      'Can source tutors for multiple subjects',
    ],
    limitations: [
      'After the match, parents often still manage schedule and quality',
      'No standard 1:3 programme or included career guidance',
      'Outcomes depend on the individual tutor placed',
    ],
    bestFor: [
      'Parents who want help finding a tutor once, then self-manage',
    ],
    notIdealFor: [
      'Families wanting Ilithiyana-style admin, scheduling, and term reports handled',
    ],
    whyPeopleSwitch: [
      'Matching solved the search, not the consistency problem',
      'Still coordinating cancellations and exam-season gaps',
    ],
    vsSummary:
      'The Tutor Company helps you find a tutor. Ilithiyana assigns a tutor, sets the recurring schedule, caps sessions at three learners, and includes career guidance — you are enrolling in a programme, not hiring hourly help.',
    alternativeIntro:
      'If matching was the hard part but term-time chaos continued, a managed programme addresses operations — not just the introduction.',
    faq: [],
    priority: 2,
  },
  {
    slug: 'tutors-and-exams',
    name: 'Tutors and Exams',
    website: 'https://www.tutorsandexams.co.za/our-learning-partners/',
    type: 'exam-prep',
    typeLabel: 'Exam prep & learning partners',
    model: 'Partners and resources geared to exam preparation',
    pricingSummary: 'Varies by partner and programme',
    careerGuidance: 'partial',
    managedProgramme: 'varies',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'Useful when exam season urgency is the main driver',
      'Connections to learning partners for targeted support',
    ],
    limitations: [
      'Not always a year-round managed Gr 6–12 programme',
      'Depth varies by partner — less uniform than a single provider',
      'Career pathway support may be fragmented',
    ],
    bestFor: [
      'Short-term exam-focused interventions',
    ],
    notIdealFor: [
      'Foundation-building from Grade 8 through matric with one team',
    ],
    whyPeopleSwitch: [
      'Need year-round consistency, not only exam-season bursts',
      'Want one provider for tutoring and career guidance',
    ],
    vsSummary:
      'Tutors and Exams centres on exam-era needs and partners. Ilithiyana runs year-round intake with Package A for ongoing support and Package B for flexible per-lesson exam prep — both include career guidance.',
    alternativeIntro:
      'Exam partners help in Q3/Q4; Ilithiyana also supports families who want to fix gaps before panic season.',
    faq: [],
    priority: 2,
  },
  {
    slug: 'brightsparkz',
    name: 'BrightSparkz',
    website: 'https://brightsparkz.co.za/all-subjects/',
    type: 'directory',
    typeLabel: 'Tutor directory',
    model: 'Directory of tutors across subjects — parent selects and contracts',
    pricingSummary: 'Tutor-dependent hourly rates',
    careerGuidance: 'no',
    managedProgramme: 'no',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'Broad subject list in one directory',
      'Options for in-person and online tutors',
    ],
    limitations: [
      'Directory model — no Ilithiyana-style programme accountability',
      'No included career guidance',
      'Quality and CAPS alignment vary by listing',
    ],
    bestFor: ['Parents comparing many tutor profiles side by side'],
    notIdealFor: [
      'Managed recurring CAPS programme with term reports',
    ],
    whyPeopleSwitch: [
      'Directory search repeats every time a tutor drops off',
      'Need Sciences programme, not another profile list',
    ],
    vsSummary:
      'BrightSparkz aggregates tutors. Ilithiyana enrols learners into a managed online CAPS programme with fixed ratios and career sessions.',
    alternativeIntro:
      'Directories help you compare; they do not run the term for you.',
    faq: [],
    priority: 3,
  },
  {
    slug: 'tutorhunt',
    name: 'TutorHunt',
    website: 'https://www.tutorhunt.co.za/locations/queenstown/',
    type: 'directory',
    typeLabel: 'Tutor directory (by location)',
    model: 'Location-based tutor listings — parent contacts tutors directly',
    pricingSummary: 'Set by individual tutors',
    careerGuidance: 'no',
    managedProgramme: 'no',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'Local listings (e.g. Queenstown, Eastern Cape)',
      'Simple way to find nearby tutors',
    ],
    limitations: [
      'Thin listings outside major cities',
      'No programme management or career component',
      'Inconsistent tutor availability in smaller towns',
    ],
    bestFor: [
      'Quick local tutor search in areas with many listings',
    ],
    notIdealFor: [
      'Families in Queenstown/Eastern Cape with few quality local options',
    ],
    whyPeopleSwitch: [
      'No strong local tutor for Physical Science',
      'Want online access without depending on town listings',
    ],
    vsSummary:
      'TutorHunt lists who is near you. Ilithiyana brings the same online quality to Queenstown, East London, and every province — tutor assigned, no travel.',
    alternativeIntro:
      'Eastern Cape parents often outgrow local directories when Sciences tutors are scarce — online programmes remove geography as the bottleneck.',
    faq: [
      {
        question: 'Does Ilithiyana serve Queenstown and the Eastern Cape?',
        answer:
          'Yes — fully online. Learners join from multiple provinces; you need device, internet, and the onboarding session.',
      },
    ],
    priority: 3,
  },
  {
    slug: 'my-private-tutor',
    name: 'My Private Tutor',
    website:
      'https://www.myprivatetutor.co.za/tutors-in-east-london-in-queenstown',
    type: 'directory',
    typeLabel: 'Tutor directory',
    model: 'Regional tutor listings — parent hires directly',
    pricingSummary: 'Tutor-set hourly rates',
    careerGuidance: 'no',
    managedProgramme: 'no',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'East London and Queenstown focused search',
      'Multiple subjects available via listings',
    ],
    limitations: [
      'Self-managed after contact',
      'No structured career guidance or term reports',
      'Listing quality varies',
    ],
    bestFor: ['Parents wanting a local private tutor in EC metros'],
    notIdealFor: [
      'Consistent multi-term CAPS support with admin handled',
    ],
    whyPeopleSwitch: [
      'Local tutor unavailable for Sciences',
      'Want online backup when local listings fail',
    ],
    vsSummary:
      'My Private Tutor helps you find someone local. Ilithiyana is for when local search is not enough — managed online groups with career guidance included.',
    alternativeIntro:
      'If East London or Queenstown listings look thin for matric Sciences, online programme enrolment sidesteps local supply limits.',
    faq: [],
    priority: 3,
  },
  {
    slug: 'teachme2',
    name: 'Teach Me 2',
    website: 'https://www.teachme2.co.za/tutors-eastern-cape',
    type: 'directory',
    typeLabel: 'Tutor matching (directory-style)',
    model: 'Browse and book tutors — often regional pages',
    pricingSummary: 'Varies by tutor',
    careerGuidance: 'no',
    managedProgramme: 'no',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'Eastern Cape tutor discovery',
      'Established SA tutoring brand',
    ],
    limitations: [
      'Still parent-managed programme after booking',
      'No bundled Ilithiyana-style career guidance',
    ],
    bestFor: ['Finding an individual tutor in the Eastern Cape'],
    notIdealFor: [
      'Families needing managed schedule and 1:3 CAPS groups',
    ],
    whyPeopleSwitch: [
      'Booking does not guarantee term-long consistency',
    ],
    vsSummary:
      'Teach Me 2 helps you book tutors. Ilithiyana runs the programme — assigned tutor, capped groups, career sessions included.',
    alternativeIntro:
      'Regional tutor pages help discovery; they do not replace a managed matric support plan.',
    faq: [],
    priority: 3,
  },
  {
    slug: 'saving-grace-education',
    name: 'Saving Grace Education',
    website: 'https://www.savinggraceeducation.co.za/find-a-tutor/',
    type: 'directory',
    typeLabel: 'Find-a-tutor directory',
    model: 'Tutor search and placement — parent-led ongoing',
    pricingSummary: 'Varies',
    careerGuidance: 'no',
    managedProgramme: 'no',
    sciencesFocus: 'varies',
    onlineNationwide: 'varies',
    strengths: [
      'Education-focused brand with tutor search',
      'May suit families already in their ecosystem',
    ],
    limitations: [
      'Find-a-tutor is not a full managed CAPS programme',
      'Career guidance and Sciences depth depend on who you find',
    ],
    bestFor: ['Parents exploring tutor options in their network'],
    notIdealFor: [
      'Single-provider accountability for Gr 6–12 Sciences',
    ],
    whyPeopleSwitch: [
      'Want one enrolment covering tutoring and career planning',
    ],
    vsSummary:
      'Saving Grace’s find-a-tutor flow points you to people. Ilithiyana is the programme itself — onboarding, schedule, ratios, and career guidance defined upfront.',
    alternativeIntro:
      'When “find a tutor” becomes a recurring search every term, structured enrolment saves time.',
    faq: [],
    priority: 3,
  },
  {
    slug: 'turtlejar',
    name: 'TurtleJar',
    website: 'https://turtlejar.co.za/tutors/locations/eastern-cape',
    type: 'directory',
    typeLabel: 'Tutor marketplace (regional)',
    model: 'Online tutor listings by location — book individual tutors',
    pricingSummary: 'Tutor-set; platform may add fees',
    careerGuidance: 'no',
    managedProgramme: 'no',
    sciencesFocus: 'varies',
    onlineNationwide: 'partial',
    strengths: [
      'Eastern Cape location pages for online tutors',
      'Digital-first booking',
    ],
    limitations: [
      'Marketplace variability — not one CAPS programme standard',
      'No included career guidance at Ilithiyana’s price point',
    ],
    bestFor: [
      'Parents booking individual online tutors in EC',
    ],
    notIdealFor: [
      'Managed 1:3 groups with term reports and career Mondays',
    ],
    whyPeopleSwitch: [
      'Marketplace tutors change; child needs stable term team',
    ],
    vsSummary:
      'TurtleJar lists Eastern Cape online tutors. Ilithiyana assigns your programme team and keeps the same structure — max 3 learners, career guidance included.',
    alternativeIntro:
      'Eastern Cape online listings are useful; programme stability is what many matric families buy.',
    faq: [],
    priority: 3,
  },
];

export function getCompetitor(slug: string): CompetitorProfile | undefined {
  return competitors.find((c) => c.slug === slug);
}

export function getAllCompetitorSlugs(): string[] {
  return competitors.map((c) => c.slug);
}

export function getComparisonRowsFor(slug: string) {
  const c = getCompetitor(slug);
  if (!c) return [];
  return buildComparisonRows(rowFromProfile(c));
}

/** Related competitors for cross-links (same tier + type neighbours) */
export function getRelatedCompetitors(slug: string, limit = 4): CompetitorProfile[] {
  const current = getCompetitor(slug);
  if (!current) return competitors.slice(0, limit);
  return competitors
    .filter((c) => c.slug !== slug)
    .sort((a, b) => {
      const score = (c: CompetitorProfile) =>
        (c.priority === current.priority ? 2 : 0) +
        (c.type === current.type ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}
