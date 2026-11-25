// Splits the single-file interactive book into one page per chapter and language.
// Each page keeps the book's own CSS and script, but carries only one chapter, so the
// reader never receives the whole book. Used by the dashboard when a book is uploaded.
(function (root) {
  var PATCH = function () {
    /* runs inside each chapter page, after the book's own script */
    var NAV = window.__NAV || {}, TOC = window.__TOC || {}, CUR = NAV.ch, LANG = NAV.lang;
    var locked = {}, mode = "";
    function post(m) { try { parent.postMessage(Object.assign({ ffs: 1 }, m), "*"); } catch (e) {} }
    function chOf(id) { var m = /^(?:ch|ar|c|a)(\d+)/.exec(id || ""); return m ? +m[1] : null; }
    function label(c) { return (c.k || String(c.n).padStart(2, "0")); }
    // language switch: ask the reader to load the same chapter in the other language
    addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("#langBtn");
      if (b) { e.preventDefault(); e.stopImmediatePropagation(); post({ type: "lang", lang: LANG === "ar" ? "en" : "ar", ch: CUR }); return; }
      var a = e.target.closest && e.target.closest("a[href^='#'],[data-goch]");
      if (!a) return;
      var go = a.getAttribute("data-goch");
      if (go) { e.preventDefault(); e.stopImmediatePropagation(); post({ type: "go", ch: +go }); return; }
      var id = decodeURIComponent(a.getAttribute("href").slice(1));
      if (id && !document.getElementById(id)) {
        var n = chOf(id);
        if (n && n !== CUR) { e.preventDefault(); e.stopImmediatePropagation(); post({ type: "go", ch: n, anchor: id }); }
      }
    }, true);
    // full table of contents: the current chapter keeps its sections, the others load on click
    function paintToc() {
      var rail = document.getElementById("rail"); if (!rail) return;
      var list = TOC[LANG] || [], cur = rail.querySelector(".chap"), box = rail.querySelector(".srch") || rail;
      var curHtml = cur ? cur.outerHTML : "";
      var h = "";
      list.forEach(function (c) {
        if (c.n === CUR) { h += curHtml; return; }
        var lk = locked[c.n] ? ' <span title="" style="opacity:.6">🔒</span>' : "";
        h += '<div class="chap" data-ch="x' + c.n + '"><a href="#" data-goch="' + c.n + '"><span class="n">' + label(c) + "</span><span>" +
          c.t.replace(/&/g, "&amp;").replace(/</g, "&lt;") + lk + "</span></a></div>";
      });
      Array.prototype.slice.call(rail.querySelectorAll(".chap")).forEach(function (x) { x.remove(); });
      var tools = rail.querySelector(".tools"), wrap = document.createElement("div"); wrap.innerHTML = h;
      while (wrap.firstChild) (tools ? tools.parentNode.insertBefore(wrap.firstChild, tools) : box.appendChild(wrap.firstChild));
      try { if (typeof paintProgress === "function") paintProgress(); } catch (e) {}
    }
    // previous / next chapter at the end of the chapter
    function addNav() {
      var art = document.querySelector('.lang:not([hidden]) article.chapter'); if (!art || art.querySelector(".ffsnav")) return;
      var list = TOC[LANG] || [], i = list.findIndex(function (c) { return c.n === CUR; });
      var prev = list[i - 1], next = list[i + 1], ar = LANG === "ar";
      var d = document.createElement("div"); d.className = "ffsnav";
      d.style.cssText = "display:flex;justify-content:space-between;gap:12px;margin:32px 0 8px;flex-wrap:wrap";
      function btn(c, txt) { return c ? '<a href="#" data-goch="' + c.n + '" style="display:inline-block;padding:10px 16px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink)">' + txt + " " + c.t.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</a>" : "<span></span>"; }
      d.innerHTML = btn(prev, ar ? "→" : "←") + btn(next, ar ? "←" : "→");
      art.appendChild(d);
    }
    try { if (typeof langHooks !== "undefined") langHooks.push(function () { paintToc(); }); } catch (e) {}
    paintToc(); addNav();
    try { var lp = document.getElementById("langPick"); if (lp) lp.hidden = true; } catch (e) {}
    if (NAV.anchor) { var t = document.getElementById(NAV.anchor); if (t) setTimeout(function () { t.scrollIntoView({ block: "start" }); }, 60); }
    addEventListener("message", function (e) {
      var m = e.data || {}; if (!m.ffs || m.type !== "access") return;
      locked = {}; (m.locked || []).forEach(function (n) { locked[n] = 1; }); mode = m.mode || ""; paintToc();
    });
    post({ type: "ready", ch: CUR, lang: LANG });
  };

  function findDivEnd(s, from) {
    // end index (exclusive) of the <div> that opens at `from`, counting nested divs
    var re = /<div\b|<\/div>/g, depth = 0, m; re.lastIndex = from;
    while ((m = re.exec(s))) { if (m[0] === "</div>") { depth--; if (depth === 0) return m.index + 6; } else depth++; }
    return -1;
  }

  function split(s) {
    var enOpenRe = /<div class="lang" data-lang="en"[^>]*>/, arOpenRe = /<div class="lang" data-lang="ar"[^>]*>/;
    var enM = enOpenRe.exec(s), arM = arOpenRe.exec(s);
    if (!enM || !arM) throw new Error("This file does not look like the interactive book (language blocks not found).");
    var enEnd = findDivEnd(s, enM.index), arEnd = findDivEnd(s, arM.index);
    var head = s.slice(0, enM.index), mid = s.slice(enEnd, arM.index), tail = s.slice(arEnd);
    function arts(open, end) {
      var block = s.slice(open, end), out = {}, re = /<article class="chapter" id="(ch|ar)(\d+)"[^>]*>/g, m;
      while ((m = re.exec(block))) {
        var st = m.index, en = block.indexOf("</article>", st) + 10;
        var tag = m[0], title = (/data-title="([^"]*)"/.exec(tag) || [])[1] || "", k = (/data-k="([^"]*)"/.exec(tag) || [])[1] || "";
        var secs = []; block.slice(st, en).replace(/<section class="s" id="([^"]+)" data-t="([^"]*)"/g, function (_, id, t) { secs.push([id, t]); });
        out[+m[2]] = { html: block.slice(st, en), n: +m[2], t: title.replace(/&amp;/g, "&").replace(/&quot;/g, '"'), k: k, secs: secs };
      }
      var foot = (/<footer class="ft">[\s\S]*?<\/footer>/.exec(block) || [""])[0];
      return { arts: out, foot: foot };
    }
    var EN = arts(enM.index, enEnd), AR = arts(arM.index, arEnd);
    var toc = { en: [], ar: [] };
    Object.keys(EN.arts).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      toc.en.push({ n: n, t: EN.arts[n].t, k: EN.arts[n].k });
      if (AR.arts[n]) toc.ar.push({ n: n, t: AR.arts[n].t, k: AR.arts[n].k });
    });
    var mainScript = tail.lastIndexOf("<script>");
    if (mainScript < 0) throw new Error("Book script not found.");
    var scriptEnd = tail.indexOf("</script>", mainScript) + 9;
    var patch = "<script>(" + PATCH.toString() + ")();<\/script>";
    var guard = "<style>@media print{body{display:none!important}}</style><script>document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('copy',e=>e.preventDefault());document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&/^[spu]$/i.test(e.key))e.preventDefault()});<\/script>";
    var pages = {};
    ["en", "ar"].forEach(function (lang) {
      var src = lang === "en" ? EN : AR;
      Object.keys(src.arts).forEach(function (nk) {
        var n = +nk, a = src.arts[n];
        var nav = { ch: n, lang: lang };
        var pre = "<script>window.__NAV=" + JSON.stringify(nav) + ";window.__TOC=" + JSON.stringify(toc) +
          ";try{localStorage.setItem('ffs1:lang',JSON.stringify('" + lang + "'))}catch(e){}<\/script>";
        var enDiv = enM[0] + (lang === "en" ? a.html + EN.foot : "") + "</div>";
        var arDiv = arM[0] + (lang === "ar" ? a.html + AR.foot : "") + "</div>";
        var t2 = tail.slice(0, mainScript) + pre + tail.slice(mainScript, scriptEnd) + patch + tail.slice(scriptEnd);
        pages[lang + "-" + n] = head.replace(/<\/head>/i, guard + "</head>") + enDiv + mid + arDiv + t2;
      });
    });
    return { toc: toc, pages: pages };
  }
  root.FFSSplit = { split: split };
  if (typeof module !== "undefined") module.exports = root.FFSSplit;
})(typeof window !== "undefined" ? window : globalThis);
