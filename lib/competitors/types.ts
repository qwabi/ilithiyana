export type CompetitorType =
  | 'marketplace'
  | 'matching-service'
  | 'franchise-centre'
  | 'premium-1-1'
  | 'directory'
  | 'exam-prep';

export type ComparisonRating = 'yes' | 'no' | 'partial' | 'varies';

export type ComparisonRow = {
  label: string;
  ilithiyana: string;
  competitor: string;
};

export type CompetitorProfile = {
  slug: string;
  name: string;
  website: string;
  type: CompetitorType;
  typeLabel: string;
  model: string;
  pricingSummary: string;
  careerGuidance: ComparisonRating;
  managedProgramme: ComparisonRating;
  sciencesFocus: ComparisonRating;
  onlineNationwide: ComparisonRating;
  /** Short honest strengths — acknowledge competitor fairly */
  strengths: string[];
  /** Limitations relevant to Ilithiyana's audience */
  limitations: string[];
  bestFor: string[];
  notIdealFor: string[];
  /** Why parents search for an alternative to this provider */
  whyPeopleSwitch: string[];
  /** One paragraph for "vs" pages — how they differ from Ilithiyana */
  vsSummary: string;
  /** Extra paragraph for alternative pages */
  alternativeIntro: string;
  faq: { question: string; answer: string }[];
  priority: 1 | 2 | 3;
};
