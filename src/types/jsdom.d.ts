// Minimal ambient declaration for the `jsdom` module used in tests.
// jsdom 30 does not ship its own type definitions; we only need the JSDOM
// constructor for test harness setup, so an `any` shim is sufficient and keeps
// `tsc --noEmit` (run in CI build) green.
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: Record<string, unknown>);
    window: any;
    document: any;
  }
}
