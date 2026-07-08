/*
  Daybreak Editorial — cmdk.js
  ============================================================================
  Accessible command-palette / site search. Hand-ported pattern (the
  combobox/listbox keyboard model documented at react-aria.adobe.com) — plain
  vanilla JS, no dependencies, file://-safe.

  Opens on the #cmdk-trigger element's click, or Ctrl/Cmd+K anywhere on the
  page. Reads its item list from a JSON <script> tag:

    <script type="application/json" id="cmdk-data">
      [{ "label": "Work", "tag": "Section", "href": "#work" }]
    </script>

  Missing #cmdk-data means this file does nothing (same convention as
  effects.js — optional hooks are safely ignored).

  ACCESSIBILITY: role="dialog"/"listbox"/"option", aria-activedescendant
  tracks the highlighted row, Escape closes and returns focus to whatever
  opened it, Arrow keys move the highlight, Enter activates.
  ============================================================================
*/
(function () {
  "use strict";

  function start() {
    var dataEl = document.getElementById("cmdk-data");
    if (!dataEl) return;

    var items;
    try { items = JSON.parse(dataEl.textContent); } catch (e) { items = []; }
    if (!items.length) return;

    var trigger = document.getElementById("cmdk-trigger");

    var overlay = document.createElement("div");
    overlay.className = "cmdk-overlay";
    overlay.innerHTML =
      '<div class="cmdk" role="dialog" aria-modal="true" aria-label="Search">' +
        '<input type="text" placeholder="Search…" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list">' +
        '<ul id="cmdk-list" role="listbox"></ul>' +
      '</div>';
    document.body.appendChild(overlay);

    var input = overlay.querySelector("input");
    var list = overlay.querySelector("ul");
    var activeIndex = -1;
    var filtered = items;
    var lastFocus = null;

    function render() {
      list.innerHTML = "";
      if (!filtered.length) {
        var empty = document.createElement("li");
        empty.className = "cmdk-empty";
        empty.textContent = "No matches.";
        list.appendChild(empty);
        input.removeAttribute("aria-activedescendant");
        return;
      }
      filtered.forEach(function (item, i) {
        var li = document.createElement("li");
        li.setAttribute("role", "option");
        li.id = "cmdk-opt-" + i;
        li.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
        li.innerHTML = "<span>" + item.label + "</span>" +
          (item.tag ? '<span class="cmdk-tag">' + item.tag + "</span>" : "");
        li.addEventListener("mousedown", function (e) { e.preventDefault(); go(item); });
        li.addEventListener("mouseenter", function () { activeIndex = i; render(); });
        list.appendChild(li);
      });
      if (activeIndex >= 0) input.setAttribute("aria-activedescendant", "cmdk-opt-" + activeIndex);
      else input.removeAttribute("aria-activedescendant");
    }

    function go(item) {
      close();
      if (item.href) window.location.href = item.href;
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.classList.add("open");
      input.value = "";
      filtered = items;
      activeIndex = -1;
      render();
      requestAnimationFrame(function () { input.focus(); });
      document.addEventListener("keydown", onKey);
    }

    function close() {
      overlay.classList.remove("open");
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); render(); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); render(); return; }
      if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIndex]) go(filtered[activeIndex]); return; }
      if (e.key === "Tab") { e.preventDefault(); } /* single-field dialog: keep focus trapped on input */
    }

    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      filtered = !q ? items : items.filter(function (it) { return it.label.toLowerCase().indexOf(q) !== -1; });
      activeIndex = filtered.length ? 0 : -1;
      render();
    });

    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });

    if (trigger) trigger.addEventListener("click", open);
    document.addEventListener("keydown", function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
