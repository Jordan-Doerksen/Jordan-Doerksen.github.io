/* paths.js: the trading-desk page's path tiles become buttons that play their path (CR-31).

   A classic script that loads nothing else, so the page also runs from file://. The tier page switches paths with
   hidden radio inputs and their labels, which works with no script at all; the generator writes the labels as tiles
   (the no-script path) and, beside them, the same tiles as real buttons, shipped `hidden`. This file is the only thing
   that shows the buttons, and it hides the label row when it does, so a script that fails leaves the labels working
   and never leaves a control that does nothing.

   What a button does: it checks its path's radio and fires the same `change` event stage.js already listens for, so
   the stage plays that path exactly as it does when a label is clicked. Tab reaches each button; Enter or Space
   presses it (a button's native behaviour). The radios leave the Tab order, because the buttons stand in for them.
   aria-pressed follows the checked radio, including when stage.js moves to the next path by itself. */
(function () {
  "use strict";

  var wrap = document.querySelector(".fp-pbtns");
  var labels = document.querySelector(".fp-carry-trading .tabs");
  var radios = [].slice.call(document.querySelectorAll('input[name="tour"]'));
  if (!wrap || !labels || !radios.length) {
    return;
  }
  var buttons = [].slice.call(wrap.querySelectorAll("button[data-tour]"));

  function sync() {
    buttons.forEach(function (b) {
      var r = document.getElementById("t-" + b.getAttribute("data-tour"));
      b.setAttribute("aria-pressed", r && r.checked ? "true" : "false");
    });
  }

  function play(b) {
    var r = document.getElementById("t-" + b.getAttribute("data-tour"));
    if (!r) {
      return;
    }
    /* After the last path stage.js shows its finale in place of the panels; a press must bring the panels back,
       or the button would seem to do nothing. The lit mesh is kept. */
    var finale = document.querySelector(".finale");
    var panels = document.querySelector(".panels");
    if (finale && !finale.hidden) {
      finale.hidden = true;
      if (panels) {
        panels.hidden = false;
      }
    }
    r.checked = true;
    r.dispatchEvent(new Event("change", { bubbles: true }));
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      play(b);
    });
  });
  radios.forEach(function (r) {
    r.tabIndex = -1;
  });
  document.addEventListener("change", function (e) {
    if (e.target && e.target.name === "tour") {
      sync();
    }
  });

  sync();
  labels.hidden = true;
  wrap.hidden = false;
})();
