# Notes

## How to Start
1. Create a `.env` file at the root of the project with the following:
```
OPEN_AI_KEY=your-openai-key
AI_MODEL=gpt-4o-mini
```
2. Run `npm install`
3. Run `npm run dev`

## Technologies Used
1. Next.js
2. TypeScript
3. AI SDK by Vercel
4. OpenAI API

## Approach

1. Parse user message for job-related fields in code:
   - job code
   - jurisdiction
   - title words
2. First try to resolve the message against saved options from the
   previous messages.
3. If there is no clear match, match the query to the local job dataset.
4. If multiple jobs match, ask the user to clarify more and save those options
   for the next message.
5. If the result finds a job, keep that job in context
6. Pass only the found job and its salary to the LLM.
7. If salary data is missing, still answer from the matched job description.

For example:
- User: tell me about the probation officer role in ventura
- Parsed as:
  - title words: probation officer
  - jurisdiction: ventura
  - job code: none
- Match flow:
  - first check saved options if they exist
  - search local jobs for ventura county jobs with matching title words
  - if one job matches, send only that job description and salary data to the LLM
  - if multiple jobs match, ask the user to clarify


## Why This Approach

I chose a deterministic matching over fuzzy matching or LLM-based
extraction because it is easier to reason about and test.

- exact code match first
- then exact title match
- then title contains match
- then title token matching
- ask to clarify if multiple jobs match

## Challenges

- Matching natural user language to job titles
- Duplicate job titles across different jurisdictions

## Scale

I would keep the same overall retrieval shape, but probably move the fields into a database-backed index over:

- job code
- cleaned title
- jurisdiction

## Improvements / Scale

I would improve a few areas:

- stronger jurisdiction clean up for inputs like county names
- better handling when a job title exists in multiple places
- more structured parsing of job description sections

## Known Limitations

- Follow-up questions can reuse the last matched job even if the user meant to
  switch jobs but did not give enough new job information and location.

## AI Assistance

AI assistance was limited to:

- Frontend layout implementation of chat
- Regex help for text cleanup and matching (lowercasing input, stripping punctuation like ?, and parsing job title words)
- Tabbed a few functions when the tabbed suggestion was what I planned on implementing or close enough I can just edit afterwards. 