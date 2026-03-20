import {
  jobByKey,
  matchJurisdiction,
  cleanedTitle,
  cleanedJobs,
  type CleanedJobRec,
} from './data';

export type ParsedChatQuery = {
  code: string | null;
  hasJobInfo: boolean;
  jurisdiction: string | null;
  titleQuery: string;
};

export type MatchResult =
  | {
      type: 'matched';
      job: CleanedJobRec;
    }
  | {
      type: 'multiple_matches';
      options: CleanedJobRec[];
    }
  | {
      type: 'ask_again';
      job: CleanedJobRec;
    }
  | {
      type: 'none';
    };

type ResJobMatchInput = {
  currentJobKey?: string | null;
  possibleJobs?: string[] | null;
  query: ParsedChatQuery;
};

const knownTitles = new Set(
  cleanedJobs.flatMap((job) => job.cleanedTitle.split(' ')),
);

export const parseChatQuery = (message: string): ParsedChatQuery => {
  const cleanedMsg = cleanedTitle(message);
  const code = message.match(/\b\d{3,5}\b/)?.[0] ?? null;
  const jurisdiction = matchJurisdiction(cleanedMsg);
  const titleQuery = cleanedMsg
    .replace(/\b\d{3,5}\b/g, ' ')
    .split(' ')
    .filter((token) => knownTitles.has(token))
    .join(' ')
    .trim();

  return {
    code,
    hasJobInfo: Boolean(code || titleQuery || jurisdiction),
    jurisdiction,
    titleQuery,
  };
};

export const resJobMatch = ({
  currentJobKey,
  possibleJobs,
  query,
}: ResJobMatchInput): MatchResult => {
  const pickResult = (matches: CleanedJobRec[]) => {
    if (matches.length === 1)
      return { type: 'matched', job: matches[0] } as const;
    if (matches.length > 1)
      return { type: 'multiple_matches', options: matches } as const;
    return null;
  };

  const resFromJobOptions = (jobOptions: CleanedJobRec[]) => {
    if (query.code) {
      const codeMatches = filterByJurisdiction(
        jobOptions.filter((job) => job.code === query.code),
        query.jurisdiction,
      );
      const codeResult = pickResult(codeMatches);

      if (codeResult) return codeResult;
    }

    if (!query.titleQuery) {
      if (!query.jurisdiction) return null;

      return pickResult(filterByJurisdiction(jobOptions, query.jurisdiction));
    }

    const queryTokens = query.titleQuery.split(' ').filter(Boolean);
    const exactMatches = filterByJurisdiction(
      jobOptions.filter((job) => job.cleanedTitle === query.titleQuery),
      query.jurisdiction,
    );
    const exactResult = pickResult(exactMatches);

    if (exactResult) return exactResult;

    const containsMatches = filterByJurisdiction(
      jobOptions.filter((job) => job.cleanedTitle.includes(query.titleQuery)),
      query.jurisdiction,
    );
    const containsResult = pickResult(containsMatches);

    if (containsResult) return containsResult;

    const tokenMatches = filterByJurisdiction(
      jobOptions.filter((job) =>
        queryTokens.every((token) =>
          job.cleanedTitle.split(' ').includes(token),
        ),
      ),
      query.jurisdiction,
    );

    return pickResult(tokenMatches);
  };

  const possibleJobMatches = getPossibleJobs(possibleJobs);

  if (possibleJobMatches.length > 0 && query.hasJobInfo) {
    const possibleResult = resFromJobOptions(possibleJobMatches);
    if (possibleResult) return possibleResult;
    if (!query.code && !query.titleQuery) return { type: 'none' };
  }
  if (!query.code && !query.titleQuery) {
    const currentJob = currentJobKey ? jobByKey.get(currentJobKey) : null;

    if (currentJob) return { type: 'ask_again', job: currentJob };

    return { type: 'none' };
  }

  const result = resFromJobOptions(cleanedJobs);

  if (result) return result;
  return { type: 'none' };
};

const filterByJurisdiction = (
  matches: CleanedJobRec[],
  jurisdiction: string | null,
) =>
  jurisdiction
    ? matches.filter((job) => job.jurisdiction === jurisdiction)
    : matches;

const getPossibleJobs = (possibleJobs?: string[] | null) =>
  possibleJobs
    ? possibleJobs
        .map((jobKey) => jobByKey.get(jobKey) ?? null)
        .filter((job): job is CleanedJobRec => job !== null)
    : [];
