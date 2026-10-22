import { generateScorecard } from "../modules/copilot/scorecard.js";
import { runCopilot, draftRatings } from "../modules/copilot/copilot.js";
import {
  createScorecardHandler,
  createRefreshHandler,
  createDraftHandler,
} from "../modules/copilot/service.js";

export {
  COPILOT_SCORECARD_JOB,
  COPILOT_REFRESH_JOB,
  COPILOT_DRAFT_JOB,
} from "../modules/copilot/service.js";

/** Background handlers for the interview copilot (see modules/copilot). */
export const createCopilotHandlers = ({ ai, generate = generateScorecard, run = runCopilot, draft = draftRatings }) => ({
  scorecard: createScorecardHandler({ ai, generate }),
  refresh: createRefreshHandler({ ai, run }),
  draft: createDraftHandler({ ai, draft }),
});
