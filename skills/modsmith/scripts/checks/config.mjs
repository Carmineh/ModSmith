/** Config checks: the same spec registered more than once. */

export function checkConfig(ctx) {
  const { add, index } = ctx;
  const bySpec = {};
  for (const [spec, loc] of index.configSpecs) (bySpec[spec] ||= []).push(loc);
  for (const [spec, locs] of Object.entries(bySpec)) {
    if (locs.length < 2) continue;
    for (const loc of locs) {
      add("config-registered-twice", "HIGH?",
        `Config spec '${spec}' registered ${locs.length} times (e.g. COMMON and SERVER): two files back the same values and the last one loaded wins.`,
        loc);
    }
  }
}
