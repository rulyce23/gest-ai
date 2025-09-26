# TODO: Enhance Fist Pose Detection

## Steps to Complete:

- [ ] Tune fist detection thresholds in `src/utils/gestureClassifier.ts` (tighten curled finger check to `tip.y >= pip.y - 0.02` for stricter matching to the pasted image's tight curl; adjust avgTipToPalmNorm < 0.70 and maxTipSpreadNorm < 0.50 if needed for compactness).
- [ ] Add enhanced logging in fist detection block to output normalized metrics (curledCount, avgTipToPalmNorm, maxTipSpreadNorm) for verification against the image pose.
- [ ] Test changes: Run `npm run dev`, use browser_action to launch the app, enable camera, perform fist pose similar to the image, and check console logs/debug panel for 'Fist' detection.
- [ ] Verify integration: Ensure 'Fist' triggers the mapped TTS text from defaultMappings.ts.
- [ ] Update TODO.md with completion status and finalize (e.g., document in README.md if thresholds are tuned significantly).
