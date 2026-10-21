// Same-origin proxy: btrfs.openfreemap.com sends no CORS headers, so
// browsers cannot read osm_date directly. This runs server-side on Vercel,
// where CORS does not apply. Third-party CORS proxies proved unreliable
// (allorigins CORS-fails, cors.lol rate-limits), so the page uses this.
module.exports = async function handler(req, res) {
  try {
    var version = (req.query && req.query.version) || "";
    if (!/^\d{8}_\d{6}_pt$/.test(version)) {
      res.status(400).send("bad version");
      return;
    }
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 9000);
    var r = await fetch(
      "https://btrfs.openfreemap.com/areas/planet/" + version + "/osm_date",
      { signal: ctl.signal }
    );
    clearTimeout(timer);
    if (!r.ok) {
      res.status(502).send("upstream " + r.status);
      return;
    }
    var text = (await r.text()).trim();
    if (!text) {
      res.status(502).send("empty upstream");
      return;
    }
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(text);
  } catch (e) {
    res.status(502).send("proxy failed");
  }
};
