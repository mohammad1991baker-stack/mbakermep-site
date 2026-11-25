// Shared setup for the library pages.
// Fill these two values after the Supabase project is created (Project Settings > API).
window.LIB = {
  SUPABASE_URL: "https://lrbakotvtrcbrhqgfcot.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYmFrb3R2dHJjYnJocWdmY290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1ODc0OTAsImV4cCI6MjExMTE2MzQ5MH0.NaZXMm9WyO5JySzNT5Mji07wamK1-zgglIAzagMbGVI",
  PRICE: "$50",
  BUY_URL: "/#request",            // replaced by the Lemon Squeezy checkout link later
  ADMIN_EMAIL: "mohammad1991baker@gmail.com",
};

(function () {
  // language: same key as the main site
  var l = null; try { l = localStorage.getItem("myb-lang"); } catch (e) {}
  if (!l && /^ar\b/i.test(navigator.language || "")) l = "ar";
  l = l === "ar" ? "ar" : "en";
  var h = document.documentElement;
  h.setAttribute("data-lang", l); h.lang = l; h.dir = l === "ar" ? "rtl" : "ltr";
})();

window.LIBT = function (en, ar) { return document.documentElement.getAttribute("data-lang") === "ar" ? ar : en; };

document.addEventListener("DOMContentLoaded", function () {
  var b = document.getElementById("langBtn");
  if (b) b.addEventListener("click", function () {
    var h = document.documentElement, l = h.getAttribute("data-lang") === "ar" ? "en" : "ar";
    h.setAttribute("data-lang", l); h.lang = l; h.dir = l === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("myb-lang", l); } catch (e) {}
    document.dispatchEvent(new Event("langchange"));
  });
});

window.libClient = function () {
  return window.supabase.createClient(LIB.SUPABASE_URL, LIB.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
};

window.libMsg = function (el, text, kind) {
  el.hidden = false; el.className = "msg " + (kind || ""); el.textContent = text;
};
