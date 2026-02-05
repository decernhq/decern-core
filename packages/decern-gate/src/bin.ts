#!/usr/bin/env node

import { run } from "./main.js";

run()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("decern-gate: unexpected error");
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
