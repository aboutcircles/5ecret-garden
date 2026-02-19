export function buildBurnInStages(stagesCfg) {
  const stages = [];

  stages.push({
    target: stagesCfg.warmupRate,
    duration: `${stagesCfg.warmupMinutes}m`,
  });

  let target = stagesCfg.warmupRate;
  for (let i = 0; i < stagesCfg.steps; i++) {
    target += stagesCfg.stepRateDelta;
    stages.push({ target, duration: `${stagesCfg.stepMinutes}m` });
  }

  return stages;
}
