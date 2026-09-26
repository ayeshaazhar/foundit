# FoundIt

FoundIt is a realtime lost-and-found matching application built with DeepSpace.

Users can report lost or found items, upload an optional photo, and discover potential matches. FoundIt combines deterministic filtering with AI-assisted semantic comparison to help users evaluate possible matches.

## Live App

https://foundit.app.space

## How It Works

1. A user signs in.
2. They create a Lost or Found report.
3. Reports are stored and synchronized in realtime.
4. FoundIt narrows possible lost/found candidates using structured information.
5. AI analyzes candidate pairs and returns:
   - a match score
   - an explanation
   - possible conflicts
6. The user decides whether to confirm the match.
7. A confirmed lost report is marked as matched.

AI suggests matches rather than deciding ownership.

## DeepSpace Features Used

- Authentication
- Records and permissions
- Realtime data synchronization
- R2 file storage
- OpenAI integration

## Matching Approach

FoundIt uses a hybrid approach.

Structured information is used to narrow the candidate set before AI analysis. AI is then used for fuzzy semantic comparisons where exact string matching would perform poorly.

For example:

- `AirPods` and `pods` may refer to the same item.
- Two reports may describe the same type of item but disagree on color or location.
- A `bag` and `AirPods` can be identified as conflicting candidates.

This keeps predictable filtering in normal application logic while using an LLM where natural-language reasoning is useful.

## Match Confirmation

AI does not automatically determine that two reports belong to the same physical item.

The owner of a lost report can review the AI analysis and manually confirm a suggested match. The lost report is then marked as resolved.

## Tech

- React
- TypeScript
- DeepSpace
- DeepSpace Records / Realtime
- DeepSpace R2 Storage
- OpenAI integration

## Running Locally

Install dependencies:

```bash
npm install
