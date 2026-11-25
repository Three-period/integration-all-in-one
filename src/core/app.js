/**
 * Extension points shared across modules.
 *
 * Functions registered here are wrapped or replaced by later feature modules
 * (for example `const base = App.renderTesting; App.renderTesting = ...`).
 * Always call them through `App` so the latest implementation is used.
 */
export const App = {};
