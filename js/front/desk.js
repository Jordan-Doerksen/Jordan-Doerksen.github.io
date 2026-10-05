/* desk.js: the Tool Desk (D-A27). A classic script that loads nothing else, so the page also runs from file://.

   What the page already has with this file dead: every project row (static markup written by
   scripts/front_screens.py), the pinned links, the nav, and a sentence saying the toolkit list needs
   JavaScript. Everything below is an addition, and everything it needs ships `hidden`:

     * Filters. Section and Status filter the Projects panel. "Tool category" and "Starred only"
       filter the Toolkit panel. Each facet filters its own panel and leaves the other alone. The bar's
       search box filters both. Several values in one facet are OR; separate facets and the search are
       AND. A search of several words needs every word.
     * The Toolkit panel. Rows are built here from window.IT_TOOLKIT (data/toolkit.js) merged with
       window.FP_TOOLKIT_OVERLAY (stars and install commands from data/desk.json), starred first.
     * Copy. The install command is copied with navigator.clipboard.writeText. If the browser blocks the
       write, the command is selected instead and the button says so. A copy that did not happen is never
       confirmed.
   If window.IT_TOOLKIT is missing the toolkit says it did not load. Nothing throws.

   All text comes from the page's data-* attributes (written from scripts/front_page.config.json), and
   every node is built with textContent, so nothing here is HTML that could be injected.
*/
(function () {
  "use strict";

  var toolbar = document.getElementById("fp-toolbar");
  if (!toolbar) {
    return; /* not the Tool Desk */
  }

  var FLASH_MS = 2000; /* how long a copy button says "Copied" (or "Selected") before it says "Copy" again */

  var box = document.getElementById("fp-q");
  var resetBtn = document.getElementById("fp-reset");
  var starBtn = document.getElementById("fp-starred");
  var facets = [].slice.call(toolbar.querySelectorAll(".fp-facet"));
  var catFacet = toolbar.querySelector('.fp-facet[data-f="k"]');
  var proj = {
    rows: [].slice.call(document.querySelectorAll("#fp-proj-rows tr")),
    count: document.getElementById("fp-proj-count"),
    none: document.getElementById("fp-proj-none")
  };
  var kit = {
    rows: [],
    box: document.getElementById("fp-kit"),
    body: document.getElementById("fp-kit-rows"),
    count: document.getElementById("fp-kit-count"),
    none: document.getElementById("fp-kit-none"),
    note: document.getElementById("fp-kit-note"),
    msg: document.getElementById("fp-kit-msg")
  };

  function fmt(template, n) {
    return String(template || "").replace("{n}", String(n));
  }

  function make(tag, className, text) {
    var el = document.createElement(tag);
    if (className) {
      el.className = className;
    }
    if (text !== undefined && text !== null) {
      el.textContent = text;
    }
    return el;
  }

  /* -- filtering ------------------------------------------------------------------------------- */

  function hasAll(text, words) {
    for (var i = 0; i < words.length; i++) {
      if (text.indexOf(words[i]) < 0) {
        return false;
      }
    }
    return true;
  }

  /* Updates each facet's badge and returns {c: [...], s: [...], k: [...]} of the ticked values. */
  function readFacets() {
    var picked = {};
    facets.forEach(function (f) {
      var values = [];
      var names = [];
      [].forEach.call(f.querySelectorAll("input:checked"), function (input) {
        values.push(input.value);
        names.push(input.parentNode.getAttribute("data-name"));
      });
      picked[f.getAttribute("data-f")] = values;
      var sep = f.querySelector(".fp-vsep");
      var badge = f.querySelector(".fp-badge");
      sep.hidden = badge.hidden = !values.length;
      badge.textContent = names.length > 2 ? fmt(toolbar.getAttribute("data-selected"), names.length) : names.join(", ");
    });
    return picked;
  }

  function apply() {
    var picked = readFacets();
    var words = (box ? box.value : "").toLowerCase().split(/\s+/).filter(Boolean);
    var starredOnly = starBtn.getAttribute("aria-pressed") === "true";
    var filtered = words.length > 0 || starredOnly || facets.some(function (f) {
      return picked[f.getAttribute("data-f")].length > 0;
    });

    var shown = 0;
    proj.rows.forEach(function (tr) {
      var ok = (!picked.c.length || picked.c.indexOf(tr.getAttribute("data-c")) > -1) &&
        (!picked.s.length || picked.s.indexOf(tr.getAttribute("data-s")) > -1) &&
        hasAll(tr.getAttribute("data-q") || "", words);
      tr.hidden = !ok;
      if (ok) {
        shown++;
      }
    });
    proj.count.textContent = fmt(proj.count.getAttribute("data-fmt"), shown);
    proj.none.hidden = shown > 0;

    if (kit.rows.length) {
      var kitShown = 0;
      var cats = picked.k || [];
      kit.rows.forEach(function (r) {
        var ok = (!cats.length || cats.indexOf(r.k) > -1) && (!starredOnly || r.star) && hasAll(r.q, words);
        r.tr.hidden = !ok;
        if (ok) {
          kitShown++;
        }
      });
      kit.count.textContent = fmt(kit.count.getAttribute("data-fmt"), kitShown);
      kit.none.hidden = kitShown > 0;
    }
    resetBtn.hidden = !filtered;
  }

  /* -- popovers: one open at a time, Escape and an outside click close ------------------------- */

  function closeAll(except) {
    facets.forEach(function (f) {
      if (f !== except && f.open) {
        f.removeAttribute("open");
      }
    });
  }

  facets.forEach(function (f) {
    f.addEventListener("toggle", function () {
      if (f.open) {
        closeAll(f);
      }
    });
    /* Tabbing out of an open checklist closes it. A null relatedTarget (a click on plain text, the
       window losing focus) is ignored, or the click that ticks a box would close the box first. */
    f.addEventListener("focusout", function (ev) {
      if (f.open && ev.relatedTarget && !f.contains(ev.relatedTarget)) {
        f.removeAttribute("open");
      }
    });
  });

  document.addEventListener("click", function (ev) {
    if (!ev.target.closest || !ev.target.closest(".fp-facet")) {
      closeAll();
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") {
      return;
    }
    var open = facets.filter(function (f) {
      return f.open;
    })[0];
    if (open) {
      open.removeAttribute("open");
      open.querySelector("summary").focus();
    }
  });

  /* -- copy ------------------------------------------------------------------------------------ */

  function selectNode(el) {
    var range = document.createRange();
    var sel = window.getSelection();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* The button's name always starts with its visible label: "Copy: <command>", "Copied: <command>". */
  function setButtonLabel(btn, text) {
    btn.textContent = text;
    btn.setAttribute("aria-label", text + ": " + btn.fpCommand);
  }

  function flash(btn, text) {
    setButtonLabel(btn, text);
    window.clearTimeout(btn.fpTimer);
    btn.fpTimer = window.setTimeout(function () {
      setButtonLabel(btn, kit.box.getAttribute("data-copy"));
    }, FLASH_MS);
  }

  function copyCommand(btn) {
    var code = btn.previousElementSibling;
    var copied = function () {
      flash(btn, kit.box.getAttribute("data-copied"));
    };
    var blocked = function () {
      selectNode(code); /* the browser refused the write: leave the text selected, and say only that */
      flash(btn, kit.box.getAttribute("data-selected"));
    };
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      blocked();
      return;
    }
    try {
      navigator.clipboard.writeText(code.textContent).then(copied, blocked);
    } catch (err) {
      blocked();
    }
  }

  function commandNode(command) {
    var frag = document.createDocumentFragment();
    var code = make("code", "", command);
    var btn = make("button", "fp-copy");
    btn.type = "button";
    btn.fpCommand = command;
    setButtonLabel(btn, kit.box.getAttribute("data-copy"));
    frag.appendChild(code);
    frag.appendChild(document.createTextNode(" "));
    frag.appendChild(btn);
    return frag;
  }

  /* -- the Toolkit panel ----------------------------------------------------------------------- */

  function toolRow(tool, over, catTitle) {
    var tr = document.createElement("tr");
    var star = over.star === true;
    var td = make("td", "fp-name");
    if (star) {
      /* The shape is drawn by front.parts.css (.fp-star::before), so the span is empty; the label is for readers. */
      var mark = make("span", "fp-star");
      mark.setAttribute("role", "img");
      mark.setAttribute("aria-label", kit.box.getAttribute("data-starred"));
      td.appendChild(mark);
    }
    if (/^https?:\/\//i.test(String(tool.url || ""))) {
      var a = make("a", "", tool.name);
      a.href = tool.url;
      a.target = "_blank";
      a.rel = "noopener";
      td.appendChild(a);
    } else {
      td.appendChild(document.createTextNode(tool.name));
    }
    tr.appendChild(td);
    tr.appendChild(make("td", "fp-cat", catTitle));

    var what = make("td", "fp-blurb", tool.desc || "");
    if (over.snippet) {
      what.appendChild(document.createElement("br"));
      what.appendChild(commandNode(over.snippet));
    }
    tr.appendChild(what);
    tr.appendChild(make("td", "fp-plat", tool.platform || "—"));
    tr.appendChild(make("td", "fp-lic", tool.license || "—"));

    var inst = make("td", "fp-inst");
    inst.setAttribute("aria-live", "polite");
    if (over.install) {
      inst.appendChild(commandNode(over.install));
    }
    tr.appendChild(inst);

    tr.setAttribute("data-k", String(tool.cat));
    tr.setAttribute("data-star", star ? "1" : "0");
    var q = [tool.name, catTitle, tool.desc, tool.platform, tool.license, over.install, over.snippet].join(" ").toLowerCase();
    return { tr: tr, k: String(tool.cat), star: star, q: q };
  }

  function buildCategoryFacet(categories, counts) {
    var pop = catFacet.querySelector(".fp-pop");
    categories.forEach(function (c) {
      if (!counts[c.id]) {
        return;
      }
      var label = document.createElement("label");
      var input = document.createElement("input");
      label.setAttribute("data-name", c.title);
      input.type = "checkbox";
      input.value = String(c.id);
      label.appendChild(input);
      label.appendChild(document.createTextNode(c.title));
      label.appendChild(make("span", "fp-n", String(counts[c.id])));
      pop.appendChild(label);
    });
    catFacet.hidden = false;
  }

  function toolkitFailed() {
    kit.msg.textContent = kit.msg.getAttribute("data-failed");
  }

  /* All or nothing: the rows are built first and put on the page only if every one was made. */
  function buildToolkit() {
    var data = window.IT_TOOLKIT;
    if (!data || !data.tools || !data.tools.length || !data.categories) {
      toolkitFailed();
      return;
    }
    var overlay = window.FP_TOOLKIT_OVERLAY || {};
    var titles = {};
    var counts = {};
    data.categories.forEach(function (c) {
      titles[c.id] = c.title;
    });
    var entries = data.tools.map(function (tool) {
      counts[tool.cat] = (counts[tool.cat] || 0) + 1;
      var over = Object.prototype.hasOwnProperty.call(overlay, tool.name) ? overlay[tool.name] : {};
      return { tool: tool, over: over, star: over.star === true };
    });
    entries.sort(function (a, b) {
      if (a.star !== b.star) {
        return a.star ? -1 : 1;
      }
      return a.tool.name.localeCompare(b.tool.name, undefined, { sensitivity: "base" });
    });

    var built = entries.map(function (e) {
      return toolRow(e.tool, e.over, titles[e.tool.cat] || String(e.tool.cat));
    });
    var frag = document.createDocumentFragment();
    built.forEach(function (row) {
      frag.appendChild(row.tr);
    });
    kit.body.appendChild(frag);
    kit.rows = built;
    buildCategoryFacet(data.categories, counts);
    kit.note.hidden = true;
    kit.box.hidden = false;
    kit.count.hidden = false;
    starBtn.hidden = false;
  }

  kit.body.addEventListener("click", function (ev) {
    var btn = ev.target.closest ? ev.target.closest(".fp-copy") : null;
    if (btn) {
      copyCommand(btn);
    }
  });

  /* -- start ----------------------------------------------------------------------------------- */

  /* The tool-category facet is in the markup (hidden, empty), so `facets` already holds it and the
     popover handlers above are already attached to it. */
  try {
    buildToolkit();
  } catch (err) {
    toolkitFailed();
    kit.rows = [];
    if (window.console && console.error) {
      console.error("Tool Desk: the toolkit list could not be built: " + err.message);
    }
  }

  toolbar.addEventListener("change", apply);
  if (box) {
    box.addEventListener("input", apply);
    if (box.form) {
      box.form.addEventListener("submit", function (ev) {
        ev.preventDefault(); /* the page filters as you type; a reload would only clear it */
      });
    }
  }
  starBtn.addEventListener("click", function () {
    starBtn.setAttribute("aria-pressed", starBtn.getAttribute("aria-pressed") === "true" ? "false" : "true");
    apply();
  });
  resetBtn.addEventListener("click", function () {
    [].forEach.call(toolbar.querySelectorAll("input"), function (input) {
      input.checked = false;
    });
    if (box) {
      box.value = "";
    }
    starBtn.setAttribute("aria-pressed", "false");
    apply();
    /* Reset hides itself, so keyboard focus goes to the first filter rather than to nothing. */
    var first = toolbar.querySelector(".fp-facet summary");
    if (first) {
      first.focus();
    }
  });

  if (box && window.URLSearchParams) {
    var preset = new URLSearchParams(window.location.search).get("q");
    if (preset) {
      box.value = preset;
    }
  }
  toolbar.hidden = false;
  apply();
  /* Browsers restore ticked boxes and typed text after a back navigation, sometimes after this script
     ran. Reading the controls again on pageshow keeps the badges and the rows in step with them. */
  window.addEventListener("pageshow", apply);
})();
