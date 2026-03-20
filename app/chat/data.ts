import jobDescsData from '../../data/job-descriptions.json';
import salariesData from '../../data/salaries.json'

type UncleanJobDescriptionRec = {
  code: string;
  description: string;
  jurisdiction: string;
  title: string;
};

type UncleanSalaryRec = {
  'Job Code': string;
  Jurisdiction: string;
  [key: string]: string | undefined;
};

export type CleanedJobRec = {
  code: string;
  description: string;
  jurisdiction: string;
  jobKey: string;
  cleanedTitle: string;
  title: string;
};

export type SalaryGrade = {
  amount: string;
  grade: number;
};

export type CleanedSalaryRec = {
  code: string;
  jurisdiction: string;
  grades: SalaryGrade[];
  jobKey: string;
};

type JurisdictionRec = {
  key: string;
  searchTerms: string[];
};

const uncleanJobDescs = jobDescsData as UncleanJobDescriptionRec[];
const uncleanSalaries = salariesData as UncleanSalaryRec[];

export const cleanedTitle = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const matchJurisdiction = (message: string) =>
  jurisdictions.find((rec) =>
    rec.searchTerms.some((term) => message.includes(term)),
  )?.key ?? null;

const getSalaryGrades = (rec: UncleanSalaryRec): SalaryGrade[] => {
  const grades: SalaryGrade[] = [];

  for (let grade = 1; grade <= 14; grade += 1) {
    const amount = rec[`Salary grade ${grade}`]?.trim();

    if (amount) {
      grades.push({ amount, grade });
    }
  }

  return grades;
};

export const cleanedJobs: CleanedJobRec[] = uncleanJobDescs.map((rec) => ({
  code: rec.code,
  description: rec.description,
  jurisdiction: rec.jurisdiction,
  jobKey: `${rec.jurisdiction}:${rec.code}`,
  cleanedTitle: cleanedTitle(rec.title),
  title: rec.title,
}));

export const cleanedSalaries: CleanedSalaryRec[] = uncleanSalaries.map((rec) => ({
  code: rec['Job Code'],
  jurisdiction: rec.Jurisdiction,
  grades: getSalaryGrades(rec),
  jobKey: `${rec.Jurisdiction}:${rec['Job Code']}`,
}));

export const jobByKey = new Map(
  cleanedJobs.map((rec) => [rec.jobKey, rec] as const),
);

export const salaryByKey = new Map(
  cleanedSalaries.map((rec) => [rec.jobKey, rec] as const),
);

const jurisdictions: JurisdictionRec[] = Array.from(
  new Set(cleanedJobs.map((rec) => rec.jurisdiction)),
).map((key) => {
  const cleanedKey = cleanedTitle(key);
  const searchTerms = Array.from(
    new Set([
      cleanedKey,
      cleanedKey
        .replace(/\bcounty\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    ]),
  ).filter(Boolean);

  return {
    key,
    searchTerms,
  };
});
