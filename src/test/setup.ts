import '@testing-library/jest-dom'

/**
 * jsdom 26 ships no `scrollIntoView`. Home.tsx calls it when the inline
 * location editor opens, so every test that pressed "Change" threw before it
 * could assert anything — which is why that flow had no render-level test at
 * all and the editor's behaviour was guarded only by grepping Home.tsx for the
 * string "scrollIntoView".
 *
 * A no-op is the right stub: there is no layout in jsdom to scroll, and what
 * the tests need to reach is what happens AFTER the call.
 */
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}
