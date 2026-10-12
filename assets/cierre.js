// Capítulo 06 — Conclusión: el puesto de Uruguay en todos los indicadores de los capítulos 04 y 05
(async function () {
  const [region, fort] = await Promise.all([
    d3.json("data/region/comparacion_paises.json"),
    d3.json("data/fortalezas/fortalezas_paises.json"),
  ]);
  const PAISES = ["URY", "ARG", "BOL", "BRA", "CHL", "COL", "ECU", "PRY", "PER", "VEN", "CRI", "MEX"];
  const MAX_ANTIG = 5;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // mismas reglas que comparador.js y fortalezas.js
  const IND_REGION = [
    ["NY.GDP.PCAP.PP.KD", "PIB per cápita", "high"], ["NY.GDP.MKTP.KD.ZG", "Crecimiento del PIB", "high"],
    ["FP.CPI.TOTL.ZG", "Inflación", "low"], ["SL.UEM.TOTL.ZS", "Desempleo", "low"],
    ["SL.UEM.1524.ZS", "Desempleo juvenil", "low"], ["SI.POV.GINI", "Desigualdad (Gini)", "low"],
    ["SI.POV.UMIC", "Pobreza (US$ 8,30 por día)", "low"], ["VC.IHR.PSRC.P5", "Homicidios", "low"],
    ["SE.SEC.CUAT.UP.ZS", "Secundaria completa", "high"],
  ];
  const IND_FORT = [
    ["CC.SC", "Control de la corrupción"], ["RL.SC", "Estado de derecho"], ["VA.SC", "Libertades"],
    ["PV.SC", "Estabilidad política"], ["EG.ELC.RNWX.ZS", "Electricidad renovable no hidráulica"], ["IT.NET.BBND.P2", "Banda ancha fija"],
  ];
  const ultimo = (rows, ind, iso) => rows.filter((r) => r.indicador === ind && r.iso3 === iso).sort((a, b) => b.anio - a.anio)[0];

  const filas = [];
  IND_REGION.forEach(([id, label, better]) => {
    const maxAnio = d3.max(region.filter((r) => r.indicador === id), (r) => r.anio);
    const list = PAISES.map((p) => ultimo(region, id, p)).filter((r) => r && r.anio >= maxAnio - MAX_ANTIG)
      .sort((a, b) => (better === "high" ? b.valor - a.valor : a.valor - b.valor));
    filas.push({ label, pos: list.findIndex((r) => r.iso3 === "URY") + 1, n: list.length });
  });
  IND_FORT.forEach(([id, label]) => {
    const list = PAISES.map((p) => ultimo(fort, id, p)).filter((r) => r && r.valor >= 0).sort((a, b) => b.valor - a.valor);
    filas.push({ label, pos: list.findIndex((r) => r.iso3 === "URY") + 1, n: list.length });
  });
  // de mejor a peor puesto relativo
  filas.sort((a, b) => (a.pos - 1) / (a.n - 1) - (b.pos - 1) / (b.n - 1) || a.label.localeCompare(b.label, "es"));

  const estado = (pos, n) => (pos <= 3 ? "good" : pos > n - 3 ? "bad" : "warn");
  const COL = { good: "--good", warn: "--warn-s", bad: "--bad" };
  const ETQ = { good: "Entre los 3 mejores", warn: "En el medio", bad: "Entre los 3 peores" };
  document.getElementById("legend-contraste").innerHTML = ["good", "warn", "bad"].map((k) =>
    `<li><span class="sw" style="background:var(${COL[k]})"></span>${ETQ[k]}</li>`).join("");

  const tip = document.getElementById("tip");
  function showTip(html, ev) {
    tip.innerHTML = html; tip.hidden = false;
    const pad = 14, r = tip.getBoundingClientRect();
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const hideTip = () => (tip.hidden = true);

  function render() {
    const host = document.getElementById("chart-contraste");
    const W = host.clientWidth || 800, narrow = W < 560;
    const rowH = narrow ? 50 : 34, L = narrow ? 12 : 250, R = narrow ? 12 : 86, top = 24;
    const H = top + filas.length * rowH + 4;
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", "Puesto de Uruguay en cada indicador: " + filas.map((f) => `${f.label} ${f.pos}º de ${f.n}`).join("; "));
    const xr = (i, n) => L + (i / (n - 1)) * (W - L - R);
    svg.append("text").attr("x", L).attr("y", 12).attr("class", "val").text("← mejor puesto");
    svg.append("text").attr("x", W - R).attr("y", 12).attr("text-anchor", "end").attr("class", "val").text("peor puesto →");
    filas.forEach((f, i) => {
      const y = top + i * rowH + (narrow ? 32 : rowH / 2);
      const c = css(COL[estado(f.pos, f.n)]);
      const g = svg.append("g");
      if (narrow) g.append("text").attr("class", "lbl").attr("x", L).attr("y", y - 17).style("font-weight", 600).text(`${f.label} · ${f.pos}º de ${f.n}`);
      else {
        g.append("text").attr("class", "lbl").attr("x", L - 14).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "end").style("font-weight", 600).text(f.label);
        g.append("text").attr("class", "lbl").attr("x", W - R + 16).attr("y", y).attr("dy", "0.35em").style("font-weight", 700).text(`${f.pos}º de ${f.n}`);
      }
      g.append("line").attr("x1", xr(0, f.n)).attr("x2", xr(f.n - 1, f.n)).attr("y1", y).attr("y2", y).attr("stroke", css("--grid")).attr("stroke-width", 2);
      for (let k = 0; k < f.n; k++) if (k !== f.pos - 1) g.append("circle").attr("cx", xr(k, f.n)).attr("cy", y).attr("r", 4).attr("fill", css("--axis"));
      g.append("circle").attr("cx", xr(f.pos - 1, f.n)).attr("cy", y).attr("r", 10).attr("fill", c).attr("stroke", css("--surface")).attr("stroke-width", 2);
      g.append("text").attr("x", xr(f.pos - 1, f.n)).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "middle")
        .style("font-size", "10.5px").style("font-weight", 800).style("fill", estado(f.pos, f.n) === "warn" ? "#111" : "#fff").style("pointer-events", "none").text(f.pos);
      g.append("rect").attr("x", 0).attr("y", top + i * rowH).attr("width", W).attr("height", rowH).attr("fill", "transparent")
        .on("pointermove", (ev) => showTip(`<b>${f.label}</b><div class="row">Puesto de Uruguay<strong>${f.pos}º de ${f.n}</strong></div>`, ev))
        .on("pointerleave", hideTip);
    });
  }
  render();
  let raf, lastW = innerWidth;
  addEventListener("resize", () => { if (innerWidth === lastW) return; lastW = innerWidth; cancelAnimationFrame(raf); raf = requestAnimationFrame(render); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
})();
