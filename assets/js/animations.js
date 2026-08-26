/* ==========================================================================
   Mounstory — animations.js
   Small, dependency-free helpers reused on every page: scroll-reveal via
   IntersectionObserver and a tiny toast notification.
   ========================================================================== */

(function (global) {
  "use strict";

  /**
   * Reveals elements matching `selector` with a fade + slide once they
   * enter the viewport. Falls back to showing everything immediately if
   * IntersectionObserver isn't available.
   */
  function initScrollReveal(selector) {
    selector = selector || ".reveal";
    var items = document.querySelectorAll(selector);
    if (!items.length) return;

    if (!("IntersectionObserver" in global)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    // Toggles .is-visible every time an element crosses into or out of view,
    // rather than revealing once and unobserving — so scrolling back up and
    // down again replays the animation instead of leaving it static.
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  var toastTimer = null;

  /** Shows a brief toast message at the bottom of the screen. */
  function showToast(message, duration) {
    duration = duration || 2200;
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, duration);
  }

  global.Mounstory = global.Mounstory || {};
  global.Mounstory.initScrollReveal = initScrollReveal;
  global.Mounstory.showToast = showToast;
})(window);
