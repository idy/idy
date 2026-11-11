import { initSite } from "./index.js";
export * from "./index.js";

// The browser bundle runs synchronously in <head>, before styles paint.
// The regular ESM entry deliberately has no initialization side effects.
if (typeof window !== "undefined" && window.document) {
  window.IdySite = initSite();
}
