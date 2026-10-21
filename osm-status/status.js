// OSM update status: live TileJSON + osm_date with clock fallback.
(function () {
  "use strict";

  var TILEJSON_URL = "https://tiles.openfreemap.org/planet";
  var OSM_DATE_TPL = "https://btrfs.openfreemap.com/areas/planet/VERSION/osm_date";

  var elVersion = document.getElementById("v-version");
  var elVersionSub = document.getElementById("v-version-sub");
  var elOsmDate = document.getElementById("v-osmdate");
  var elOsmDateSub = document.getElementById("v-osmdate-sub");
  var elCutoff = document.getElementById("v-cutoff");
  var elCutoffUtc = document.getElementById("v-cutoff-utc");
  var elCutoffSub = document.getElementById("v-cutoff-sub");
  var elRelease = document.getElementById("v-release");
  var elReleaseUtc = document.getElementById("v-release-utc");
  var elReleaseSub = document.getElementById("v-release-sub");

  var STR = {
    ms: {
      checking: "Menyemak…",
      liveFail: "Tidak dapat disemak (rangkaian/CORS) — anggaran jadual di bawah.",
      liveOk: "Versi live daripada TileJSON.",
      osmDirect: "Nilai live, diambil terus daripada storan OpenFreeMap.",
      osmProxy: "Nilai live, diambil melalui proksi fallback (storannya sekat bacaan pelayar).",
      osmEstimate: "* Anggaran daripada ID build (corak: dump Isnin, ~6 hari sebelum build). Boleh tersasar 1–2 hari.",
      osmFail: "Storannya sekat bacaan pelayar (tiada CORS) dan proksi fallback gagal — memaparkan anggaran ID build sahaja.",
      inH: function (d, h, m) { return "Lagi " + d + "h " + hj(h) + "j " + m + "m"; },
      now: "Sekarang"
    },
    en: {
      checking: "Checking…",
      liveFail: "Unavailable (network/CORS) — schedule estimate below.",
      liveOk: "Live version from TileJSON.",
      osmDirect: "Live value, fetched directly from OpenFreeMap storage.",
      osmProxy: "Live value, fetched via fallback proxy (direct storage blocks browser reads).",
      osmEstimate: "* Estimate from build ID (pattern: Monday dump, ~6 days before build). May be off by 1–2 days.",
      osmFail: "Direct storage blocks browser reads (no CORS) and the fallback proxy failed — showing build-ID estimate only.",
      inH: function (d, h, m) { return "In " + d + "d " + h + "h " + m + "m"; },
      now: "now"
    }
  };

  function hj(n) { return n; }

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ms";
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  var DAYS = {
    ms: ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  };
  var MONTHS = {
    ms: ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogs", "Sep", "Okt", "Nov", "Dis"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  };

  // Main line: MYT with full day name. Sub line: UTC equivalent.
  function fmtMYT(d) {
    var L = lang();
    var m = new Date(d.getTime() + 8 * 3600 * 1000);
    return DAYS[L][m.getUTCDay()] + " " + m.getUTCDate() + " " + MONTHS[L][m.getUTCMonth()] +
      " · " + pad(m.getUTCHours()) + ":" + pad(m.getUTCMinutes()) + " MYT";
  }

  function fmtUTC(d) {
    var L = lang();
    return DAYS[L][d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[L][d.getUTCMonth()] +
      " · " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + " UTC";
  }

  // Next Sunday 08:00 UTC strictly after now (if exactly on it, count as now).
  function nextWeekdayUTC(now, weekday) {
    var d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0));
    var delta = (weekday - d.getUTCDay() + 7) % 7;
    if (delta === 0 && d <= now) delta = 7;
    d.setUTCDate(d.getUTCDate() + delta);
    return d;
  }

  function countdown(to, now) {
    var s = Math.max(0, Math.floor((to - now) / 1000));
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    return STR[lang()].inH(d, h, m);
  }

  function renderSchedule() {
    var now = new Date();
    var cutoff = nextWeekdayUTC(now, 0); // Sunday
    var release = nextWeekdayUTC(now, 2); // Tuesday
    elCutoff.textContent = fmtMYT(cutoff);
    elCutoffUtc.textContent = fmtUTC(cutoff);
    elCutoffSub.textContent = countdown(cutoff, now);
    elRelease.textContent = fmtMYT(release);
    elReleaseUtc.textContent = fmtUTC(release);
    elReleaseSub.textContent = countdown(release, now);
  }

  // btrfs.openfreemap.com sends no CORS headers, so browsers block direct
  // reads. Fall back to public CORS proxies; verified 2026-10-21.
  // Timeouts included so a hanging proxy fails fast instead of leaving "…".
  function fetchTextTimeout(url, ms) {
    if (typeof AbortController !== "undefined") {
      var ctl = new AbortController();
      var timer = setTimeout(function () { ctl.abort(); }, ms);
      return fetch(url, { cache: "no-store", signal: ctl.signal })
        .then(function (r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error("http " + r.status);
          return r.text();
        })
        .catch(function (e) {
          clearTimeout(timer);
          throw e;
        });
    }
    return fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); });
  }

  function firstSuccess(promises) {
    return new Promise(function (resolve, reject) {
      var pending = promises.length;
      if (!pending) { reject(new Error("all failed")); return; }
      promises.forEach(function (p) {
        Promise.resolve(p).then(resolve, function () {
          if (--pending === 0) reject(new Error("all failed"));
        });
      });
    });
  }

  // Observed 2026-10: osm_date is always the Monday 6 days before the
  // Sunday build ID (20261011->10-05, 20261018->10-12). Estimate only.
  function estimateOsmDate(version) {
    var m = /^(20\d\d)(\d\d)(\d\d)_/.exec(version || "");
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    d.setUTCDate(d.getUTCDate() - 6);
    return d.toISOString().slice(0, 10);
  }

  function fetchOsmDate(version) {
    var direct = OSM_DATE_TPL.replace("VERSION", version);
    var proxies = [
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(direct),
      "https://api.cors.lol/?url=" + encodeURIComponent(direct)
    ];
    return fetchTextTimeout(direct, 6000)
      .then(function (t) { return { value: t.trim(), via: "direct" }; })
      .catch(function () {
        return firstSuccess(proxies.map(function (u) {
          return fetchTextTimeout(u, 10000).then(function (t) { return t.trim(); });
        })).then(function (value) { return { value: value, via: "proxy" }; });
      })
      .then(function (res) {
        if (res.value) return res;
        var est = estimateOsmDate(version);
        if (est) return { value: est + " *", via: "estimate" };
        throw new Error("empty");
      })
      .catch(function () {
        var est = estimateOsmDate(version);
        if (est) return { value: est + " *", via: "estimate" };
        throw new Error("no osm_date");
      });
  }

  function setOsmNote(via) {
    if (!elOsmDateSub) return;
    var L = lang();
    if (via === "direct") elOsmDateSub.textContent = STR[L].osmDirect;
    else if (via === "proxy") elOsmDateSub.textContent = STR[L].osmProxy;
    else if (via === "estimate") elOsmDateSub.textContent = STR[L].osmEstimate;
    else elOsmDateSub.textContent = STR[L].osmFail;
  }
  function extractVersion(tilejson) {
    if (!tilejson || !tilejson.tiles || !tilejson.tiles[0]) return null;
    var m = /\/planet\/([^/]+)\//.exec(tilejson.tiles[0]);
    return m ? m[1] : null;
  }

  function refreshLive() {
    var L = lang();
    elVersionSub.textContent = STR[L].checking;
    fetch(TILEJSON_URL, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("tilejson " + r.status); return r.json(); })
      .then(function (tj) {
        var v = extractVersion(tj);
        if (!v) throw new Error("no version");
        elVersion.textContent = v;
        elVersionSub.textContent = STR[lang()].liveOk;
        return fetchOsmDate(v)
          .then(function (res) {
            elOsmDate.textContent = res.value || "—";
            setOsmNote(res.via);
          })
          .catch(function () {
            elOsmDate.textContent = "—";
            setOsmNote("fail");
          });
      })
      .catch(function () {
        var Ll = lang();
        elVersion.textContent = "—";
        elOsmDate.textContent = "—";
        elVersionSub.textContent = STR[Ll].liveFail;
      });
  }

  function setLang(next) {
    document.documentElement.lang = next;
    document.querySelectorAll("[data-ms]").forEach(function (el) {
      el.textContent = next === "en" ? el.getAttribute("data-en") : el.getAttribute("data-ms");
    });
    document.getElementById("btn-ms").classList.toggle("active", next === "ms");
    document.getElementById("btn-en").classList.toggle("active", next === "en");
    renderSchedule();
    refreshLive();
  }

  document.getElementById("btn-ms").addEventListener("click", function () { setLang("ms"); });
  document.getElementById("btn-en").addEventListener("click", function () { setLang("en"); });

  renderSchedule();
  refreshLive();
  setInterval(renderSchedule, 60000);
})();
