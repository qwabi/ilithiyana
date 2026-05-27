import {
  percentageToLevel,
  percentageToBand,
  levelToBand,
  type ClassBand,
} from "@/lib/reports/nsc";

export type { ClassBand };

/** Canonical names stored on `classes.subject` and used across admin, enrollment, and reports. */
export const TUTORING_SUBJECTS = [
  "English",
  "Pure Maths",
  "Natural Sciences",
  "Social Sciences",
  "Technology",
  "Economic Management Sciences",
  "Life Orientation",
  "Creative Arts",
  "Physical Science",
  "Life Sciences",
] as const;

export type TutoringSubject = (typeof TUTORING_SUBJECTS)[number];

/** Weekly default slot (SAST) per tutoring subject — shared by class seeding and session generation. */
export const TUTORING_SUBJECT_SCHEDULE_DAY: Record<TutoringSubject, string> = {
  English: "wednesday",
  "Pure Maths": "tuesday",
  "Natural Sciences": "monday",
  "Social Sciences": "thursday",
  Technology: "friday",
  "Economic Management Sciences": "monday",
  "Life Orientation": "saturday",
  "Creative Arts": "saturday",
  "Physical Science": "thursday",
  "Life Sciences": "friday",
};

export const TUTORING_SUBJECT_SCHEDULE_TIME: Partial<
  Record<TutoringSubject, string>
> = {
  "Economic Management Sciences": "17:00",
  "Life Orientation": "10:00",
  "Creative Arts": "11:00",
};

const SENIOR_PHASE_GRADES = [6, 7, 8, 9] as const;
const FET_GRADES = [10, 11, 12] as const;

/** Display order for admin class groups and forms. */
const SENIOR_TUTORING_ORDER: TutoringSubject[] = [
  "English",
  "Pure Maths",
  "Natural Sciences",
  "Social Sciences",
  "Technology",
  "Economic Management Sciences",
  "Life Orientation",
  "Creative Arts",
];

const FET_TUTORING_ORDER: TutoringSubject[] = [
  "English",
  "Pure Maths",
  "Physical Science",
  "Life Sciences",
];

export type SubjectEntry = {
  id: string;
  name: string;
  category: "language" | "content" | "elective";
  phase: "junior" | "fet" | "both";
  grades: number[];
  is_offered: boolean;
  requires_level?: "HL" | "FAL" | "SAL" | null;
  /** Maps to canonical tutoring subject when is_offered */
  tutoringSubject?: TutoringSubject | null;
};

export const JUNIOR_CONTENT_SUBJECTS: SubjectEntry[] = [
  {
    id: "mathematics",
    name: "Mathematics",
    category: "content",
    phase: "junior",
    grades: [6, 7, 8, 9],
    is_offered: true,
    tutoringSubject: "Pure Maths",
  },
  {
    id: "natural-sciences",
    name: "Natural Sciences",
    category: "content",
    phase: "junior",
    grades: [6, 7, 8, 9],
    is_offered: true,
    tutoringSubject: "Natural Sciences",
  },
  {
    id: "social-sciences",
    name: "Social Sciences",
    category: "content",
    phase: "junior",
    grades: [6, 7, 8, 9],
    is_offered: true,
    tutoringSubject: "Social Sciences",
  },
  {
    id: "technology",
    name: "Technology",
    category: "content",
    phase: "junior",
    grades: [6, 7, 8, 9],
    is_offered: true,
    tutoringSubject: "Technology",
  },
  {
    id: "economic-management-sciences",
    name: "Economic and Management Sciences",
    category: "content",
    phase: "junior",
    grades: [6, 7, 8, 9],
    is_offered: true,
    tutoringSubject: "Economic Management Sciences",
  },
  {
    id: "life-orientation-junior",
    name: "Life Orientation",
    category: "content",
    phase: "junior",
    grades: [6, 7, 8, 9],
    is_offered: true,
    tutoringSubject: "Life Orientation",
  },
  {
    id: "creative-arts",
    name: "Creative Arts",
    category: "content",
    phase: "junior",
    grades: [6, 7, 8, 9],
    is_offered: true,
    tutoringSubject: "Creative Arts",
  },
];

const juniorLanguageBases = [
  "Afrikaans",
  "English",
  "IsiNdebele",
  "IsiXhosa",
  "IsiZulu",
  "Sepedi",
  "Sesotho",
  "Setswana",
  "Siswati",
  "Tshivenda",
  "Xitsonga",
] as const;

function juniorLanguages(): SubjectEntry[] {
  const entries: SubjectEntry[] = [];
  for (const name of juniorLanguageBases) {
    const offered = name === "English";
    for (const level of ["HL", "FAL"] as const) {
      const slug = name.toLowerCase().replace(/\s+/g, "");
      entries.push({
        id: `${slug}-${level.toLowerCase()}`,
        name: `${name} (${level})`,
        category: "language",
        phase: "junior",
        grades: [6, 7, 8, 9],
        is_offered: offered,
        requires_level: level,
        tutoringSubject: offered ? "English" : null,
      });
    }
  }
  return entries;
}

export const JUNIOR_LANGUAGES = juniorLanguages();

export const FET_COMPULSORY_SUBJECTS: SubjectEntry[] = [
  {
    id: "life-orientation-fet",
    name: "Life Orientation",
    category: "content",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "mathematics-fet",
    name: "Mathematics",
    category: "content",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: true,
    tutoringSubject: "Pure Maths",
  },
  {
    id: "mathematical-literacy",
    name: "Mathematical Literacy",
    category: "content",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
];

function fetLanguages(): SubjectEntry[] {
  const entries: SubjectEntry[] = [];
  for (const name of juniorLanguageBases) {
    const offered = name === "English";
    for (const level of ["HL", "FAL"] as const) {
      const slug = name.toLowerCase().replace(/\s+/g, "");
      entries.push({
        id: `${slug}-${level.toLowerCase()}-fet`,
        name: `${name} (${level})`,
        category: "language",
        phase: "fet",
        grades: [10, 11, 12],
        is_offered: offered,
        requires_level: level,
        tutoringSubject: offered ? "English" : null,
      });
    }
  }
  return entries;
}

export const FET_LANGUAGES = fetLanguages();

export const FET_ELECTIVE_SUBJECTS: SubjectEntry[] = [
  {
    id: "accounting",
    name: "Accounting",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "agricultural-management",
    name: "Agricultural Management Practices",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "agricultural-sciences",
    name: "Agricultural Sciences",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "agricultural-technology",
    name: "Agricultural Technology",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "business-studies",
    name: "Business Studies",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "civil-technology",
    name: "Civil Technology",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "computer-applications-tech",
    name: "Computer Applications Technology",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "consumer-studies",
    name: "Consumer Studies",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "dance-studies",
    name: "Dance Studies",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "design-studies",
    name: "Design Studies",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "dramatic-arts",
    name: "Dramatic Arts",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "economics",
    name: "Economics",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "electrical-technology",
    name: "Electrical Technology",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "engineering-graphics-design",
    name: "Engineering Graphics and Design",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "geography",
    name: "Geography",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "history",
    name: "History",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "hospitality-studies",
    name: "Hospitality Studies",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "information-technology",
    name: "Information Technology",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "life-sciences",
    name: "Life Sciences",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: true,
    tutoringSubject: "Life Sciences",
  },
  {
    id: "mechanical-technology",
    name: "Mechanical Technology",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "music",
    name: "Music",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "physical-sciences",
    name: "Physical Sciences",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: true,
    tutoringSubject: "Physical Science",
  },
  {
    id: "religion-studies",
    name: "Religion Studies",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "sport-exercise-science",
    name: "Sport and Exercise Science",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "technical-mathematics",
    name: "Technical Mathematics",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "technical-sciences",
    name: "Technical Sciences",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "tourism",
    name: "Tourism",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
  {
    id: "visual-arts",
    name: "Visual Arts",
    category: "elective",
    phase: "fet",
    grades: [10, 11, 12],
    is_offered: false,
  },
];

const ALL_SUBJECTS = [
  ...JUNIOR_CONTENT_SUBJECTS,
  ...JUNIOR_LANGUAGES,
  ...FET_COMPULSORY_SUBJECTS,
  ...FET_LANGUAGES,
  ...FET_ELECTIVE_SUBJECTS,
];

const byId = new Map(ALL_SUBJECTS.map((s) => [s.id, s]));

export function getSubjectById(id: string): SubjectEntry | undefined {
  return byId.get(id);
}

export function getSubjectsForGrade(grade: number): SubjectEntry[] {
  return ALL_SUBJECTS.filter((s) => s.grades.includes(grade));
}

export function getOfferedSubjectsForGrade(grade: number): SubjectEntry[] {
  return getSubjectsForGrade(grade).filter((s) => s.is_offered);
}

export function subjectDisplayName(subject: SubjectEntry): string {
  if (subject.requires_level) {
    return `${subject.name}`;
  }
  return subject.name;
}

export function toTutoringSubjectName(
  subject: SubjectEntry
): TutoringSubject | null {
  return subject.tutoringSubject ?? null;
}

export function getCurriculumPhase(
  grade: number
): "senior" | "fet" | null {
  if ((SENIOR_PHASE_GRADES as readonly number[]).includes(grade)) return "senior";
  if ((FET_GRADES as readonly number[]).includes(grade)) return "fet";
  return null;
}

/** Tutoring subjects Ilithiyana offers for a grade (CAPS Senior vs FET). */
export function getTutoringSubjectsForGrade(grade: number): TutoringSubject[] {
  const phase = getCurriculumPhase(grade);
  if (phase === "senior") {
    const offered = new Set(
      getOfferedSubjectsForGrade(grade)
        .map((s) => s.tutoringSubject)
        .filter((s): s is TutoringSubject => s != null)
    );
    return SENIOR_TUTORING_ORDER.filter((s) => offered.has(s));
  }
  if (phase === "fet") {
    const offered = new Set(
      getOfferedSubjectsForGrade(grade)
        .map((s) => s.tutoringSubject)
        .filter((s): s is TutoringSubject => s != null)
    );
    return FET_TUTORING_ORDER.filter((s) => offered.has(s));
  }
  return [];
}

export function isTutoringSubjectValidForGrade(
  grade: number,
  subject: string
): boolean {
  return getTutoringSubjectsForGrade(grade).includes(subject as TutoringSubject);
}

export function scheduleForTutoringSubject(subject: string): {
  schedule_day: string;
  schedule_time: string;
} {
  const key = subject as TutoringSubject;
  return {
    schedule_day:
      TUTORING_SUBJECT_SCHEDULE_DAY[key] ??
      TUTORING_SUBJECT_SCHEDULE_DAY["Pure Maths"],
    schedule_time: TUTORING_SUBJECT_SCHEDULE_TIME[key] ?? "18:00",
  };
}

export function nscLevel(percentage: number): number {
  return percentageToLevel(percentage);
}

export function nscDescriptor(level: number): string {
  const map: Record<number, string> = {
    7: "Outstanding Achievement",
    6: "Meritorious Achievement",
    5: "Substantial Achievement",
    4: "Adequate Achievement",
    3: "Moderate Achievement",
    2: "Elementary Achievement",
    1: "Not Achieved",
  };
  return map[level] ?? "Unknown";
}

export { levelToBand, percentageToLevel, percentageToBand };
