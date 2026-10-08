import { runStage13Verification } from '../utils/verifyStage13.js';

runStage13Verification()
  .then((summary) => {
    if (summary.failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal verification error:', err);
    process.exit(1);
  });
