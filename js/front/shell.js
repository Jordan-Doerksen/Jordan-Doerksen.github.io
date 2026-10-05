/* shell.js: behaviour shared by every front-page screen (D-A27).

   A classic script that loads nothing else, so the pages also run from file://.
   Everything here is an addition. The nav, every link and all the content work with this file dead;
   what needs a script ships `hidden` in the markup and is unhidden here, so a script that fails
   leaves no control that does nothing.

   Four jobs:
     1. Theme toggle. Stored under "fp-theme". The inline script in <head> has already set
        data-theme before first paint; this keeps the button and the attribute in step.
     2. Unhide what needs a script: the bar's search form, the theme button, [data-needs-js].
     3. Menu. At 768px and below the nav folds behind #fp-menu-btn. The 768 here and in
        front.shell.css is the same literal (a media query cannot read a token), and a check
        asserts the two agree.
     4. "/" focuses the search box, unless the person is already typing somewhere.
*/
(function () {
  "use strict";

  var KEY = "fp-theme";
  var root = document.documentElement;
  var themeBtn = document.getElementById("fp-theme");
  var menuBtn = document.getElementById("fp-menu-btn");
  var nav = document.getElementById("fp-nav");
  var narrow = window.matchMedia("(max-width: 768px)");

  /* -- storage: every call is wrapped, because it throws with site data blocked or in a private window */
  function store(value) {
    try {
      window.localStorage.setItem(KEY, value);
    } catch (err) {
      /* Storage is unavailable. The choice then lasts for this page only, which is the honest fallback. */
    }
  }

  /* -- theme */
  function isDark() {
    return root.getAttribute("data-theme") === "dark";
  }

  function syncTheme() {
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", isDark() ? "true" : "false");
    }
  }

  function toggleTheme() {
    if (isDark()) {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", "dark");
    }
    store(isDark() ? "dark" : "light");
    syncTheme();
  }

  /* -- menu */
  function setMenu(open) {
    nav.hidden = !open;
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function syncMenu() {
    if (narrow.matches) {
      menuBtn.hidden = false;
      setMenu(false);
    } else {
      menuBtn.hidden = true;
      nav.hidden = false;
    }
  }

  /* -- "/" */
  /* A text field, a select or an editable region takes the key. A checkbox or a button does not type
     anything, so "/" still jumps to the search from a ticked filter. */
  function isTyping(el) {
    if (!el) {
      return false;
    }
    var tag = el.tagName;
    if (tag === "INPUT") {
      return !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/i.test(el.type || "text");
    }
    return tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true;
  }

  function onKeydown(ev) {
    if (ev.key === "Escape" && menuBtn && nav && narrow.matches && !nav.hidden) {
      setMenu(false);
      menuBtn.focus();
      return;
    }
    /* Shift is allowed: on some keyboard layouts "/" is a shifted key. */
    if (ev.key !== "/" || ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing || ev.defaultPrevented) {
      return;
    }
    var box = document.getElementById("fp-q");
    if (!box || isTyping(document.activeElement) || !box.getClientRects().length) {
      return;
    }
    ev.preventDefault();
    box.focus();
    box.select();
  }

  /* -- start */
  var find = document.querySelector(".fp-find");
  if (find) {
    find.hidden = false;
  }
  [].forEach.call(document.querySelectorAll("[data-needs-js]"), function (el) {
    el.hidden = false;
  });

  if (themeBtn) {
    themeBtn.hidden = false;
    syncTheme();
    themeBtn.addEventListener("click", toggleTheme);
  }

  if (menuBtn && nav) {
    syncMenu();
    if (narrow.addEventListener) {
      narrow.addEventListener("change", syncMenu);
    } else if (narrow.addListener) {
      narrow.addListener(syncMenu);
    }
    menuBtn.addEventListener("click", function () {
      setMenu(nav.hidden);
    });
  }

  document.addEventListener("keydown", onKeydown);
})();
