'use server';

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { salaryByKey, type CleanedJobRec, type CleanedSalaryRec } from './data';
import { parseChatQuery, resJobMatch } from './matcher';

export type ChatMessage = {
  content: string;
  role: 'assistant' | 'user';
};

export type ChatActionInput = {
  currentJobKey?: string | null;
  history: ChatMessage[];
  message: string;
  possibleJobs?: string[] | null;
};

export type ChatActionResult = {
  currentJobKey: string | null;
  possibleJobs: string[] | null;
  reply: string;
};

type JobContextInput = {
  job: CleanedJobRec;
  salary: CleanedSalaryRec | undefined;
};

export const sendChatMessage = async (
  input: ChatActionInput,
): Promise<ChatActionResult> => {
  const message = input.message;
  const query = parseChatQuery(message);
  const match = resJobMatch({
    currentJobKey: input.currentJobKey,
    possibleJobs: input.possibleJobs,
    query,
  });
  const openai = createOpenAI({ apiKey: process.env.OPEN_AI_KEY });

  if (match.type === 'multiple_matches')
    return {
      currentJobKey: null,
      possibleJobs: match.options.map((job) => job.jobKey),
      reply: `I found multiple matches: ${match.options
        .map((job) => `${job.title} (${job.jurisdiction})`)
        .join(', ')}. Reply with the just the county name.`,
    };

  if (match.type === 'none')
    return {
      currentJobKey: null,
      possibleJobs: null,
      reply: 'Which job are you asking about?',
    };

  const job = match.job;
  const salary = salaryByKey.get(job.jobKey);
  const context = buildJobContext({ job, salary });

  const { text } = await generateText({
    model: openai(process.env.AI_MODEL!),
    system:
      'You are Holly, a helpful assistant. Use only the provided job context. If the job context does not contain the answer then say so.',
    messages: [
      ...input.history,
      {
        role: 'user',
        content: `${message}\n\nUse this job context:\n${context}`,
      },
    ],
  });

  return {
    currentJobKey: job.jobKey,
    possibleJobs: null,
    reply: text,
  };
};

const buildJobContext = ({ job, salary }: JobContextInput) => {
  const sections = [
    `Title: ${job.title}`,
    `Jurisdiction: ${job.jurisdiction}`,
    `Job Code: ${job.code}`,
    `Description:\n${job.description}`,
  ];

  if (salary && salary.grades.length > 0) {
    sections.push(
      `Salary:\n${salary.grades
        .map(({ amount, grade }) => `Grade ${grade}: ${amount}`)
        .join('\n')}`,
    );
  } else {
    sections.push('Salary:\nUnavailable for this job in the provided data.');
  }

  return sections.join('\n\n');
};
