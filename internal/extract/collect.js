// Runs inside the page. Walks visible elements and returns the computed style
// values Astrolabe audits. Values that can't be design-system drift (zero
// spacing, transparent colors, borders that aren't drawn) are dropped here to
// keep the payload small.
async (opts) => {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) {}
  }
  const ignore = opts.ignore || [];
  const max = opts.max || 5000;
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "META", "LINK", "BR", "HEAD", "TITLE"]);
  const SIDES = ["top", "right", "bottom", "left"];
  const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];

  const part = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + CSS.escape(el.id);
    const cls = Array.from(el.classList).slice(0, 2).map((c) => "." + CSS.escape(c)).join("");
    if (cls) return s + cls;
    const p = el.parentElement;
    if (p) {
      const same = Array.from(p.children).filter((c) => c.tagName === el.tagName);
      if (same.length > 1) s += ":nth-of-type(" + (same.indexOf(el) + 1) + ")";
    }
    return s;
  };
  const selector = (el) => {
    const parts = [];
    let e = el;
    while (e && e !== document.body && e !== document.documentElement && parts.length < 3) {
      parts.unshift(part(e));
      if (e.id) break;
      e = e.parentElement;
    }
    return parts.join(" > ");
  };
  const ignored = (el) => ignore.some((s) => { try { return !!el.closest(s); } catch (e) { return false; } });
  const transparent = (v) => v === "transparent" || /^rgba\(.*,\s*0\)$/.test(v) || /\/\s*0\)$/.test(v);
  const zero = (v) => v === "0px" || v === "auto" || v === "normal" || v === "" || v === "0px 0px";

  const out = [];
  let total = 0;
  for (const el of document.querySelectorAll("body *")) {
    if (SKIP.has(el.tagName)) continue;
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    if (ignored(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    total++;
    if (out.length >= max) continue;

    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    const s = {};
    const put = (k, v) => { if (v !== undefined && v !== null && v !== "") s[k] = v; };

    const bg = cs.backgroundColor;
    if (!transparent(bg)) put("background-color", bg);
    for (const side of SIDES) {
      const w = parseFloat(cs.getPropertyValue("border-" + side + "-width")) || 0;
      const style = cs.getPropertyValue("border-" + side + "-style");
      const color = cs.getPropertyValue("border-" + side + "-color");
      if (w > 0 && style !== "none" && style !== "hidden" && !transparent(color)) put("border-" + side + "-color", color);
    }
    // getComputedStyle resolves `margin: auto` to pixels (e.g. 160px when
    // centering). The typed OM keeps the keyword, so auto margins are skipped.
    let typed = null;
    try { typed = el.computedStyleMap ? el.computedStyleMap() : null; } catch (e) {}
    const isAuto = (prop) => {
      try { const v = typed && typed.get(prop); return !!v && v.toString() === "auto"; } catch (e) { return false; }
    };
    for (const side of SIDES) {
      const p = cs.getPropertyValue("padding-" + side);
      if (!zero(p)) put("padding-" + side, p);
      const m = cs.getPropertyValue("margin-" + side);
      if (!zero(m) && !isAuto("margin-" + side)) put("margin-" + side, m);
    }
    const disp = cs.display;
    if (disp.includes("flex") || disp.includes("grid")) {
      if (!zero(cs.rowGap)) put("row-gap", cs.rowGap);
      if (!zero(cs.columnGap)) put("column-gap", cs.columnGap);
    }
    for (const c of CORNERS) {
      const r = cs.getPropertyValue("border-" + c + "-radius");
      if (!zero(r)) put("border-" + c + "-radius", r.split(" ")[0]);
    }
    if (hasText) {
      if (!transparent(cs.color)) put("color", cs.color);
      put("font-size", cs.fontSize);
      put("font-family", cs.fontFamily);
      put("font-weight", cs.fontWeight);
    }
    if (Object.keys(s).length === 0) continue;
    out.push({ selector: selector(el), tag: el.tagName.toLowerCase(), text: hasText, styles: s });
  }
  return { url: location.href, title: document.title, total, elements: out };
}
