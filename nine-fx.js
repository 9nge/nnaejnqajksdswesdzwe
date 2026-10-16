/* NINE FX — enhancements over the React app (no React code touched) */
(function () {
  "use strict";
  if (window.__NFX__) return;
  window.__NFX__ = 1;
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("nfx");

  /* ============ reveal on scroll ============ */
  var REVEAL = [
    [".header", ""], [".top-line", ""],
    [".hero-overline", "left"], [".hero-ascii", "zoom"], [".hero-caption", "right"], [".hero-prompt", ""],
    [".catalog-heading", "left"], [".filters", ""], [".catalog-note", "right"],
    [".product-card", "zoom"], [".coming-card", "zoom"],
    [".back-link", "left"],
    [".detail-grid > *", ""],
    [".download-panel > *", ""],
    [".features > *", ""],
    [".feature-grid article", "zoom"],
    [".about-lead", "left"], [".about-copy", "right"],
    [".footer-main", ""], [".footer-bottom", ""]
  ];
  var io = null;
  function setupReveals() {
    if (REDUCED || !("IntersectionObserver" in window)) return;
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        var batch = 0;
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          e.target.style.setProperty("--nfx-d", (batch++ % 7) * 80 + "ms");
          e.target.classList.add("nfx-in");
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    }
    REVEAL.forEach(function (pair) {
      var els = document.querySelectorAll(pair[0] + ":not([data-nfx])");
      for (var i = 0; i < els.length; i++) {
        if (els[i].closest(".console-preview")) continue;
        els[i].setAttribute("data-nfx", pair[1]);
        io.observe(els[i]);
      }
    });
  }

  /* ============ interactive console ============ */
  var TABS = [
    { name: "render", head: "render ── visual module", rows: [
      { t: "box esp", on: 1 },
      { t: "skeleton", on: 1 },
      { t: "chams", on: 0 },
      { t: "glow", on: 0 },
      { t: "dist limit", val: ["80m", "140m", "220m", "inf"], i: 1 }
    ]},
    { name: "movement", head: "movement ── physics module", rows: [
      { t: "bhop", on: 1 },
      { t: "auto strafe", on: 0 },
      { t: "no flash", on: 1 },
      { t: "smoothing", val: ["0.15", "0.25", "0.35", "0.50"], i: 2 }
    ]},
    { name: "config", head: "config ── profiles", rows: [
      { t: "save as nine.cfg", act: "save" },
      { t: "load slot 1", act: "load" },
      { t: "reset defaults", act: "reset" },
      { t: "autosave", on: 1 }
    ]}
  ];

  var TOKEN = 0;
  function typeInto(el, text, speed, done, token, container) {
    if (!el) return;
    if (el._tiv) clearInterval(el._tiv);
    if (REDUCED) { el.textContent = text; if (done) done(); return; }
    var i = 0;
    el.textContent = "";
    el._tiv = setInterval(function () {
      if (token !== undefined && container && container._token !== token) {
        clearInterval(el._tiv);
        el._tiv = null;
        return;
      }
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(el._tiv); el._tiv = null; if (done) done(); }
    }, speed || 16);
  }

  function typeLines(container, lines, done) {
    var token = container._token;
    var idx = 0;
    (function next() {
      if (container._token !== token) return;
      if (idx >= lines.length) { if (done) done(); return; }
      var div = document.createElement("div");
      div.className = "nfx-pane-h";
      div.style.border = "none";
      container.appendChild(div);
      typeInto(div, lines[idx++], 14, next, token, container);
    })();
  }

  function enhance(cp) {
    if (cp.getAttribute("data-nfx-console")) return;
    var menu = cp.querySelector(".preview-menu");
    var bottom = cp.querySelector(".preview-bottom");
    if (!menu || !bottom || !menu.parentNode) return;
    cp.setAttribute("data-nfx-console", "1");
    cp.classList.add("nfx-console");

    var large = cp.classList.contains("large-preview");
    var st = getComputedStyle(menu);
    var myMenu = document.createElement("div");
    myMenu.className = "nfx-menu";
    myMenu.style.fontSize = st.fontSize;
    myMenu.style.lineHeight = st.lineHeight;
    var labels = ["Render", "Movement", "Config", "Exit"], keys = ["1", "2", "3", "0"];
    var html = '<span class="nfx-muted">modules</span>';
    for (var i = 0; i < 4; i++)
      html += '<div class="nfx-item" data-i="' + i + '"><span class="nfx-num">' + keys[i] + '</span>' + labels[i] + '</div>';
    html += '<p class="nfx-hint">' + (large ? "↑↓ select · enter open · 1-3 · esc close" : "open project ── подробнее") + "</p>";
    myMenu.innerHTML = html;
    menu.parentNode.insertBefore(myMenu, menu);
    menu.style.display = "none";

    var pane = null;
    if (large) {
      pane = document.createElement("div");
      pane.className = "nfx-pane";
      pane.style.fontSize = st.fontSize;
      pane.style.lineHeight = st.lineHeight;
      bottom.parentNode.insertBefore(pane, bottom);
    }

    cp.__nfx = {
      sel: 0, open: -1, large: large, menu: myMenu, pane: pane, tabs: {},
      items: myMenu.querySelectorAll(".nfx-item"),
      hint: myMenu.querySelector(".nfx-hint")
    };
    paint(cp);

    myMenu.addEventListener("click", function (ev) {
      var it = ev.target && ev.target.closest ? ev.target.closest(".nfx-item") : null;
      if (!it) return;
      activate(cp, parseInt(it.getAttribute("data-i"), 10));
    });
    if (pane) pane.addEventListener("click", function (ev) {
      var row = ev.target && ev.target.closest ? ev.target.closest(".nfx-row") : null;
      if (row) rowAct(cp, row);
    });
    cp.addEventListener("keydown", function (ev) { onKey(cp, ev); });
    var ascii = cp.querySelector(".ascii");
    if (ascii) ascii.addEventListener("click", function () {
      cp.classList.remove("nfx-spin");
      void cp.offsetWidth;
      cp.classList.add("nfx-spin");
      setTimeout(function () { cp.classList.remove("nfx-spin"); }, 1150);
    });
    cp.tabIndex = 0;
    cp.setAttribute("aria-label", "Интерактивная консоль Nine Hack: ↑↓ Enter, 1-3, Esc");

    if (!REDUCED) {
      cp.classList.add("nfx-boot");
      setTimeout(function () { cp.classList.remove("nfx-boot"); }, 2600);
    }
    registerTilt(cp);
  }

  function paint(cp) {
    var st = cp.__nfx;
    for (var i = 0; i < st.items.length; i++) {
      st.items[i].classList.toggle("nfx-sel", i === st.sel);
      st.items[i].classList.toggle("nfx-tab-open", st.open === i);
    }
  }

  function pulse(cp) {
    var m = cp.__nfx.menu;
    m.classList.remove("nfx-pulse");
    void m.offsetWidth;
    m.classList.add("nfx-pulse");
  }

  function activate(cp, i) {
    var st = cp.__nfx;
    if (!st.large) { st.sel = i; paint(cp); pulse(cp); return; }
    if (i === 3) { exitFlow(cp); return; }
    if (st.open === i) { closePane(cp); return; }
    st.sel = i;
    st.open = i;
    if (!st.tabs[i]) st.tabs[i] = JSON.parse(JSON.stringify(TABS[i]));
    openPane(cp);
    paint(cp);
    pulse(cp);
  }

  function openPane(cp) {
    var st = cp.__nfx, tab = st.tabs[st.open], pane = st.pane;
    var h = '<div class="nfx-pane-h"></div><div class="nfx-bar"><span></span></div>';
    tab.rows.forEach(function (r, idx) {
      var right;
      if (r.val) right = '<em>' + r.val[r.i] + "</em>";
      else if (r.act) right = "<em>›</em>";
      else right = "<em>" + (r.on ? "on" : "off") + "</em>";
      var box = r.act ? "&gt;" : (r.on ? "[x]" : "[&nbsp;]");
      h += '<div class="nfx-row' + (r.on ? " nfx-on" : "") + '" data-r="' + idx + '"><span class="nfx-box">' + box + "</span>" + r.t + right + "</div>";
    });
    pane.innerHTML = h;
    pane._token = ++TOKEN;
    pane.classList.add("nfx-open");
    cp.classList.add("nfx-tab-open");
    requestAnimationFrame(function () {
      var bar = pane.querySelector(".nfx-bar > span");
      if (bar) bar.style.width = "100%";
    });
    typeInto(pane.querySelector(".nfx-pane-h"), "> " + tab.head, 14, null, TOKEN, pane);
    st.hint.textContent = "esc ── back to modules";
  }

  function closePane(cp) {
    var st = cp.__nfx;
    st.open = -1;
    st.pane.classList.remove("nfx-open");
    cp.classList.remove("nfx-tab-open");
    st.hint.textContent = "↑↓ select · enter open · 1-3 · esc close";
    paint(cp);
  }

  function flash(row) {
    row.classList.remove("nfx-flash");
    void row.offsetWidth;
    row.classList.add("nfx-flash");
  }

  function rowAct(cp, row) {
    var st = cp.__nfx, tab = st.tabs[st.open];
    if (!tab) return;
    var r = tab.rows[parseInt(row.getAttribute("data-r"), 10)];
    var em = row.querySelector("em"), box = row.querySelector(".nfx-box");
    if (r.act) {
      em.textContent = "ok";
      setTimeout(function () { em.textContent = "›"; }, 900);
    } else if (r.val) {
      r.i = (r.i + 1) % r.val.length;
      em.textContent = r.val[r.i];
    } else {
      r.on = r.on ? 0 : 1;
      box.innerHTML = r.on ? "[x]" : "[&nbsp;]";
      em.textContent = r.on ? "on" : "off";
      row.classList.toggle("nfx-on", !!r.on);
    }
    flash(row);
  }

  function exitFlow(cp) {
    var st = cp.__nfx, pane = st.pane;
    st.sel = 3;
    st.open = -2;
    paint(cp);
    pane._token = ++TOKEN;
    var exitToken = pane._token;
    pane.innerHTML = "";
    pane.classList.add("nfx-open");
    cp.classList.add("nfx-tab-open");
    st.hint.textContent = "…";
    typeLines(pane, [
      "> terminating ninehack.exe ...",
      "> wipe: logs, cache, temp -- ok",
      "> exit code 0. restarting_"
    ], function () {
      setTimeout(function () {
        if (pane._token !== exitToken) return;
        closePane(cp);
        cp.classList.add("nfx-reboot");
        setTimeout(function () { cp.classList.remove("nfx-reboot"); }, 900);
        st.sel = 0;
        paint(cp);
      }, 650);
    });
  }

  function onKey(cp, ev) {
    var st = cp.__nfx;
    if (!st) return;
    var k = ev.key;
    if (k === "ArrowDown" || k === "s" || k === "S") {
      ev.preventDefault();
      st.sel = (st.sel + 1) % 4;
      paint(cp);
      return;
    }
    if (k === "ArrowUp" || k === "w" || k === "W") {
      ev.preventDefault();
      st.sel = (st.sel + 3) % 4;
      paint(cp);
      return;
    }
    if (k === "Enter") { ev.preventDefault(); activate(cp, st.sel); return; }
    if (k === "1" || k === "2" || k === "3") { ev.preventDefault(); activate(cp, +k - 1); return; }
    if (k === "0") { ev.preventDefault(); activate(cp, 3); return; }
    if (k === "Escape" && st.large) { ev.preventDefault(); closePane(cp); }
  }

  /* ============ tilt + idle float (rAF) ============ */
  var consoles = [];
  function registerTilt(cp) {
    if (REDUCED) return;
    var rec = {
      el: cp, rx: 0, ry: 0, tx: 0, ty: 0, hov: false, vis: true,
      mini: !cp.classList.contains("large-preview"),
      t0: Math.random() * 6000
    };
    cp.__tilt = rec;
    consoles.push(rec);
    cp.addEventListener("pointermove", function (e) {
      var r = cp.getBoundingClientRect();
      rec.tx = ((e.clientY - r.top) / r.height - 0.5) * -2;
      rec.ty = ((e.clientX - r.left) / r.width - 0.5) * 2;
      rec.hov = true;
    });
    cp.addEventListener("pointerleave", function () { rec.hov = false; });
    var vio = new IntersectionObserver(function (en) { rec.vis = en[0].isIntersecting; }, { threshold: 0 });
    vio.observe(cp);
  }
  function tick(t) {
    for (var i = 0; i < consoles.length; i++) {
      var r = consoles[i];
      if (!r.vis || !r.el.isConnected) continue;
      var amp = r.mini ? 0.55 : 1;
      var gx = r.hov ? r.tx : 0, gy = r.hov ? r.ty : 0;
      r.rx += (gx * 7 * amp - r.rx) * 0.09;
      r.ry += (gy * 10 * amp - r.ry) * 0.09;
      var fz = Math.sin(t * 0.0006 + r.t0) * 0.7 * amp;
      var fy = Math.sin(t * 0.0011 + r.t0) * 4.5 * amp;
      r.el.style.transform = "perspective(1100px) rotateX(" + r.rx.toFixed(2) + "deg) rotateY(" + r.ry.toFixed(2) + "deg) rotateZ(" + fz.toFixed(2) + "deg) translateY(" + fy.toFixed(2) + "px)";
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ============ rescan on React rerenders / route changes ============ */
  var scheduled = false;
  function rescan() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      if (!document.body) return;
      consoles = consoles.filter(function (r) { return r.el.isConnected; });
      var all = document.querySelectorAll(".console-preview");
      for (var i = 0; i < all.length; i++) enhance(all[i]);
      setupReveals();
    }, 60);
  }
  new MutationObserver(rescan).observe(document.documentElement, { childList: true, subtree: true });

  function init() {
    rescan();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
