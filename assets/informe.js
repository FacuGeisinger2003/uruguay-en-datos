// Informe en PDF: gráficos estáticos pensados para A4 (datos: data/*.json, los mismos que usa la web)
(async function () {
  const J = (f) => d3.json(`data/${f}.json`);
  const [F, tramo, edad, dpto, egreso, nini, desemp, nac, hAnio, hMot, ppl, comp, fort, gasto] = await Promise.all([
    J("fuentes"), J("pobreza/pobreza_por_tramo"), J("pobreza/pobreza_por_edad"), J("pobreza/pobreza_infantil_dpto"), J("educacion/educacion_egreso_generacion"),
    J("educacion/educacion_nini_dpto"), J("educacion/educacion_desempleo"), J("demografia/nacimientos_por_anio"), J("seguridad/homicidios_por_anio"),
    J("seguridad/homicidios_por_motivo"), J("seguridad/carceles_poblacion"), J("region/comparacion_paises"), J("fortalezas/fortalezas_paises"), J("seguridad/carceles_gasto"),
  ]);
  window.FUENTES = F;

  const C = { ink: "#111418", ink2: "#3d4148", muted: "#767b84", line: "#dfe1e5", grid: "#eceef1", acc: "#eb6834", blue: "#2a78d6", gray: "#b9bcc2", good: "#0a8a0a", warn: "#c98a00", bad: "#c63434" };
  const FULL = 658, HALF = 316;
  const n1 = (v, d = 1) => v.toLocaleString("es-UY", { minimumFractionDigits: d, maximumFractionDigits: d });
  const int = (v) => Math.round(v).toLocaleString("es-UY");
  const T = (sel, s) => sel.style("font-size", s + "px");

  // ---------- portada y fecha ----------
  document.getElementById("mes").textContent = new Date().toLocaleDateString("es-UY", { month: "long", year: "numeric" });
  document.getElementById("cover-kpis").innerHTML = [
    ["29%", "de los niños de 0 a 5 años vive en hogares pobres"],
    ["47%", "de los jóvenes de 21 a 23 años no terminó la educación media"],
    ["375", "homicidios en 2025, más de la mitad entre criminales"],
    ["−39%", "nacimientos entre 2015 y 2024"],
  ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");

  // ---------- fuentes ----------
  document.querySelectorAll(".src[data-fuente]").forEach((el) => {
    const partes = el.dataset.fuente.split(",").map((k) => F[k.trim()]).filter(Boolean).map((f) => `<b>${f.institucion}</b>, ${f.nombre}`);
    el.innerHTML = `Fuente: ${partes.join("; ")}.${el.dataset.det ? " " + el.dataset.det : ""}`;
  });

  const legend = (id, items) => {
    document.getElementById(id).innerHTML = items.map(([c, t, line]) => `<li><i class="${line ? "line" : ""}" style="background:${c}"></i>${t}</li>`).join("");
  };
  const svgIn = (id, W, H, label) => d3.select("#" + id).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", label);
  function yAxis(svg, y, W, m, ticks, fmt) {
    const g = svg.append("g");
    y.ticks(ticks).forEach((t) => {
      g.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", t === 0 ? C.ink2 : C.grid).attr("stroke-width", t === 0 ? 0.8 : 0.7);
      T(g.append("text").attr("x", m.l - 6).attr("y", y(t)).attr("dy", "0.32em").attr("text-anchor", "end").attr("fill", C.muted).text(fmt(t)), 9.5);
    });
  }
  function xLabels(svg, x, H, m, vals, fmt) {
    vals.forEach((v) => T(svg.append("text").attr("x", x(v)).attr("y", H - m.b + 15).attr("text-anchor", "middle").attr("fill", C.muted).text(fmt(v)), 9.5));
  }

  // ---------- G1: pobreza por tramo (2025) ----------
  (() => {
    const tramos = ["0-5", "6-12", "13-17", "18-64", "65+"], lab = { "0-5": "0 a 5", "6-12": "6 a 12", "13-17": "13 a 17", "18-64": "18 a 64", "65+": "65 o más" };
    const W = FULL, H = 200, m = { t: 16, r: 4, b: 24, l: 34 };
    const svg = svgIn("g-tramo", W, H, "Pobreza por tramo de edad 2025");
    const x = d3.scaleBand().domain(tramos).range([m.l, W - m.r]).paddingInner(0.35).paddingOuter(0.1);
    const y = d3.scaleLinear().domain([0, 40]).range([H - m.b, m.t]);
    yAxis(svg, y, W, m, 4, (d) => d + "%");
    tramo.filter((d) => d.anio === 2025).forEach((d) => {
      const c = d.orden <= 3 ? C.acc : C.gray;
      svg.append("rect").attr("x", x(d.tramo)).attr("y", y(d.pct_pobreza)).attr("width", x.bandwidth()).attr("height", y(0) - y(d.pct_pobreza)).attr("fill", c);
      T(svg.append("text").attr("x", x(d.tramo) + x.bandwidth() / 2).attr("y", y(d.pct_pobreza) - 4).attr("text-anchor", "middle").attr("fill", C.ink).style("font-weight", 700).text(n1(d.pct_pobreza) + "%"), 10);
    });
    tramos.forEach((t) => T(svg.append("text").attr("x", x(t) + x.bandwidth() / 2).attr("y", H - m.b + 15).attr("text-anchor", "middle").attr("fill", C.ink2).text(lab[t] + " años"), 10));
  })();

  // ---------- barras horizontales genéricas ----------
  function hbars(id, rows, { W = FULL, rowH = 17, max, fmt = (v) => n1(v), color, labelW = 110, mark }) {
    const m = { t: 2, r: 40, b: 2, l: labelW };
    const H = m.t + m.b + rows.length * rowH;
    const svg = svgIn(id, W, H, "ranking");
    const x = d3.scaleLinear().domain([0, max]).range([m.l, W - m.r]);
    rows.forEach((d, i) => {
      const yy = m.t + i * rowH, bh = rowH * 0.62, c = color(d);
      T(svg.append("text").attr("x", m.l - 8).attr("y", yy + rowH / 2).attr("dy", "0.33em").attr("text-anchor", "end")
        .attr("fill", d.hi ? C.ink : C.ink2).style("font-weight", d.hi ? 700 : 400).text(d.label + (mark && mark(d) ? " *" : "")), 10);
      svg.append("rect").attr("x", m.l).attr("y", yy + (rowH - bh) / 2).attr("width", Math.max(0.5, x(d.v) - m.l)).attr("height", bh).attr("fill", c);
      T(svg.append("text").attr("x", x(d.v) + 5).attr("y", yy + rowH / 2).attr("dy", "0.33em").attr("fill", C.ink).style("font-weight", d.hi ? 700 : 500).text(fmt(d.v)), 9.5);
    });
  }

  // ---------- barras verticales por año ----------
  function vbars(id, rows, key, { W, H, color, labels = "ends", fmt = int, yfmt = int }) {
    const m = { t: 16, r: 22, b: 22, l: 40 };
    const svg = svgIn(id, W, H, "serie anual");
    const x = d3.scaleBand().domain(rows.map((d) => d.anio)).range([m.l, W - m.r]).paddingInner(0.22);
    const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d[key])]).nice().range([H - m.b, m.t]);
    yAxis(svg, y, W, m, 4, yfmt);
    rows.forEach((d, i) => {
      svg.append("rect").attr("x", x(d.anio)).attr("y", y(d[key])).attr("width", x.bandwidth()).attr("height", y(0) - y(d[key])).attr("fill", typeof color === "function" ? color(d) : color);
      if (labels === "all" || i === 0 || i === rows.length - 1)
        T(svg.append("text").attr("x", x(d.anio) + x.bandwidth() / 2).attr("y", y(d[key]) - 4).attr("text-anchor", "middle").attr("fill", C.ink).style("font-weight", 600).text(fmt(d[key])), 9);
    });
    const step = Math.ceil(rows.length / Math.floor(W / 46));
    rows.forEach((d, i) => { if (i % step === 0 || i === rows.length - 1) T(svg.append("text").attr("x", x(d.anio) + x.bandwidth() / 2).attr("y", H - m.b + 14).attr("text-anchor", "middle").attr("fill", C.muted).text(d.anio), 9); });
    return { svg, x, y };
  }

  // ---------- G7: nacimientos ----------
  vbars("g-nac", nac, "nacimientos", { W: FULL, H: 190, labels: "all", color: C.blue, yfmt: (d) => (d / 1000) + " mil", fmt: (v) => (v / 1000).toLocaleString("es-UY", { maximumFractionDigits: 1 }) + " mil" });

  // ---------- capítulo 03: cifras ----------
  (() => {
    const ult = hAnio[hAnio.length - 1];
    const conf = hMot.find((d) => d.anio === ult.anio && d.motivo === "Conflictos entre criminales").n;
    const p0 = ppl[0], p1 = ppl[ppl.length - 1];
    document.getElementById("seg-stats").innerHTML = [
      [int(ult.n), `homicidios en ${ult.anio}`],
      [Math.round((conf / ult.n) * 100) + "%", `fueron conflictos entre criminales (${ult.anio})`],
      [Math.round((ult.n_fuego / ult.n) * 100) + "%", `con arma de fuego (${ult.anio})`],
      [int(hAnio[0].n), `homicidios en ${hAnio[0].anio}, para comparar`],
    ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("");
  })();

  // ---------- G8: homicidios, conflictos entre criminales y el resto ----------
  (() => {
    const FOCO = "Conflictos entre criminales";
    legend("lg-mot", [[C.acc, FOCO], [C.gray, "Otros motivos"]]);
    const A = [...new Set(hMot.map((d) => d.anio))].sort((a, b) => a - b);
    const rows = A.map((a) => { const t = d3.sum(hMot.filter((d) => d.anio === a), (d) => d.n); const c = hMot.find((d) => d.anio === a && d.motivo === FOCO).n; return { a, t, c }; });
    const W = FULL, H = 220, m = { t: 16, r: 2, b: 22, l: 34 };
    const svg = svgIn("g-mot", W, H, "Homicidios por año: conflictos entre criminales y el resto");
    const x = d3.scaleBand().domain(A).range([m.l, W - m.r]).paddingInner(0.22);
    const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.t)]).nice().range([H - m.b, m.t]);
    yAxis(svg, y, W, m, 4, (d) => d);
    rows.forEach((d) => {
      svg.append("rect").attr("x", x(d.a)).attr("y", y(d.c)).attr("width", x.bandwidth()).attr("height", y(0) - y(d.c)).attr("fill", C.acc);
      svg.append("rect").attr("x", x(d.a)).attr("y", y(d.t)).attr("width", x.bandwidth()).attr("height", y(d.c) - y(d.t) - 1.5).attr("fill", C.gray);
      T(svg.append("text").attr("x", x(d.a) + x.bandwidth() / 2).attr("y", y(d.c / 2)).attr("dy", "0.33em").attr("text-anchor", "middle").attr("fill", "#fff").style("font-weight", 700).text(Math.round((d.c / d.t) * 100) + "%"), 8.5);
      T(svg.append("text").attr("x", x(d.a) + x.bandwidth() / 2).attr("y", y(d.t) - 4).attr("text-anchor", "middle").attr("fill", C.ink).style("font-weight", 600).text(d.t), 8.5);
      T(svg.append("text").attr("x", x(d.a) + x.bandwidth() / 2).attr("y", H - m.b + 14).attr("text-anchor", "middle").attr("fill", C.muted).text(d.a), 9);
    });
  })();

  // ---------- G9: personas presas ----------
  (() => {
    legend("lg-ppl", [[C.blue, "Hombres"], [C.acc, "Mujeres"]]);
    const W = FULL, H = 200, m = { t: 16, r: 2, b: 22, l: 44 };
    const svg = svgIn("g-ppl", W, H, "Personas presas");
    const x = d3.scaleBand().domain(ppl.map((d) => d.anio)).range([m.l, W - m.r]).paddingInner(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(ppl, (d) => d.total)]).nice().range([H - m.b, m.t]);
    yAxis(svg, y, W, m, 4, int);
    ppl.forEach((d, i) => {
      svg.append("rect").attr("x", x(d.anio)).attr("y", y(d.hombres)).attr("width", x.bandwidth()).attr("height", y(0) - y(d.hombres)).attr("fill", C.blue);
      svg.append("rect").attr("x", x(d.anio)).attr("y", y(d.total)).attr("width", x.bandwidth()).attr("height", y(d.hombres) - y(d.total)).attr("fill", C.acc);
      if (i === 0 || i === ppl.length - 1) T(svg.append("text").attr("x", x(d.anio) + x.bandwidth() / 2).attr("y", y(d.total) - 4).attr("text-anchor", "middle").attr("fill", C.ink).style("font-weight", 600).text(int(d.total)), 9);
      if (i % 3 === 0 || i === ppl.length - 1) T(svg.append("text").attr("x", x(d.anio) + x.bandwidth() / 2).attr("y", H - m.b + 14).attr("text-anchor", "middle").attr("fill", C.muted).text(d.anio), 9);
    });
  })();

  // ---------- costo de las cárceles ----------
  (() => {
    const g = gasto[gasto.length - 1], g0 = gasto[0];
    document.getElementById("costo-stats").innerHTML = [
      ["$ " + int(g.gasto_mensual_por_persona), `por persona presa por mes (${g.anio}); ${g0.anio}: $ ${int(g0.gasto_mensual_por_persona)}`],
      [n1(g.salarios_minimos), `salarios mínimos por persona presa (${g.anio})`],
      ["$ " + int(g.gasto_total / 1e6) + " mill.", `gasto ejecutado del programa de cárceles (${g.anio})`],
      [int(g.ppl_promedio), `personas presas en promedio (${g.anio})`],
    ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("");
  })();

  // ---------- capítulo 04: semáforo ----------
  const PAISES = ["URY", "ARG", "BOL", "BRA", "CHL", "COL", "ECU", "PRY", "PER", "VEN", "CRI", "MEX"];
  const NOM = { URY: "Uruguay", ARG: "Argentina", BRA: "Brasil", CHL: "Chile", PRY: "Paraguay", CRI: "Costa Rica", MEX: "México", BOL: "Bolivia", COL: "Colombia", ECU: "Ecuador", PER: "Perú", VEN: "Venezuela", LCN: "América Latina", OED: "OCDE" };
  const ult = (rows, ind, iso) => rows.filter((d) => d.indicador === ind && d.iso3 === iso).sort((a, b) => b.anio - a.anio)[0];
  const pct = (v) => n1(v) + "%";
  const IND = [
    { id: "NY.GDP.PCAP.PP.KD", label: "PIB per cápita (US$ PPA)", better: "high", fmt: (v) => "US$ " + int(v) },
    { id: "NY.GDP.MKTP.KD.ZG", label: "Crecimiento del PIB", better: "high", fmt: pct },
    { id: "FP.CPI.TOTL.ZG", label: "Inflación", better: "low", fmt: pct },
    { id: "SL.UEM.TOTL.ZS", label: "Desempleo", better: "low", fmt: pct },
    { id: "SL.UEM.1524.ZS", label: "Desempleo juvenil (15 a 24)", better: "low", fmt: pct },
    { id: "SI.POV.GINI", label: "Desigualdad (Gini)", better: "low", fmt: (v) => n1(v) },
    { id: "SI.POV.UMIC", label: "Pobreza (US$ 8,30 por día)", better: "low", fmt: pct },
    { id: "VC.IHR.PSRC.P5", label: "Homicidios cada 100.000 hab.", better: "low", fmt: (v) => n1(v) },
    { id: "SE.SEC.CUAT.UP.ZS", label: "Secundaria completa (25+)", better: "high", fmt: pct },
  ];
  function ranking(ind) {
    const maxA = d3.max(comp.filter((r) => r.indicador === ind.id), (r) => r.anio);
    return PAISES.map((iso) => ult(comp, ind.id, iso)).filter((r) => r && r.anio >= maxA - 5)
      .sort((a, b) => (ind.better === "high" ? b.valor - a.valor : a.valor - b.valor));
  }
  (() => {
    const head = `<thead><tr><th>Indicador</th><th class="n">Uruguay</th><th class="n">Año</th><th>Puesto</th><th class="n">América Latina</th><th class="n">OCDE</th></tr></thead>`;
    const body = IND.map((ind) => {
      const rk = ranking(ind), pos = rk.findIndex((r) => r.iso3 === "URY") + 1, u = rk[pos - 1], n = rk.length;
      const kk = n >= 10 ? 3 : 2, col = pos <= kk ? C.good : pos > n - kk ? C.bad : C.warn;
      const ref = (iso) => { const r = ult(comp, ind.id, iso); return r && r.anio >= u.anio - 5 ? ind.fmt(r.valor) : "—"; };
      return `<tr><td>${ind.label}</td><td class="n"><b>${ind.fmt(u.valor)}</b></td><td class="n">${u.anio}</td>
        <td><span class="dot" style="background:${col}"></span>${pos}.º de ${n}</td><td class="n">${ref("LCN")}</td><td class="n">${ref("OED")}</td></tr>`;
    }).join("");
    document.getElementById("t-sema").innerHTML = head + `<tbody>${body}</tbody>`;

    const rk = (id, inc) => {
      const ind = IND.find((i) => i.id === id);
      const rows = ranking(ind).map((r) => ({ label: NOM[r.iso3], v: r.valor, hi: r.iso3 === "URY" }));
      const o = ult(comp, id, "OED"); if (o) rows.push({ label: "OCDE", v: o.valor, ref: true });
      rows.sort((a, b) => (inc ? a.v - b.v : b.v - a.v));
      return rows;
    };
    const col = (d) => (d.hi ? C.acc : d.ref ? "#6b7079" : C.gray);
    hbars("g-rk1", rk("SL.UEM.1524.ZS", true), { W: HALF, rowH: 15, max: 30, labelW: 74, color: col });
    hbars("g-rk2", rk("SE.SEC.CUAT.UP.ZS", false), { W: HALF, rowH: 15, max: 100, labelW: 74, color: col });
  })();

  // ---------- capítulo 05: tabla de fortalezas ----------
  (() => {
    const F5 = [
      ["CC.SC", "Control de la corrupción", (v) => int(v) + "/100"],
      ["RL.SC", "Estado de derecho", (v) => int(v) + "/100"],
      ["VA.SC", "Libertades y rendición de cuentas", (v) => int(v) + "/100"],
      ["PV.SC", "Estabilidad política", (v) => int(v) + "/100"],
      ["EG.ELC.RNWX.ZS", "Electricidad de viento, sol y biomasa", (v) => int(v) + "%"],
      ["IT.NET.BBND.P2", "Banda ancha fija (conexiones cada 100 hab.)", (v) => int(v)],
    ];
    const head = `<thead><tr><th>Indicador</th><th class="n">Uruguay</th><th class="n">Año</th><th>Segundo puesto</th><th class="n">América Latina</th><th class="n">OCDE</th></tr></thead>`;
    const body = F5.map(([id, label, f]) => {
      const rows = PAISES.map((iso) => ult(fort, id, iso)).filter(Boolean).sort((a, b) => b.valor - a.valor);
      const u = rows.find((r) => r.iso3 === "URY"), s = rows.find((r) => r.iso3 !== "URY");
      const lc = ult(fort, id, "LCN"), oc = ult(fort, id, "OED");
      return `<tr><td>${label}</td><td class="n"><b style="color:${C.good}">${f(u.valor)}</b></td><td class="n">${u.anio}</td>
        <td>${NOM[s.iso3]} (${f(s.valor)})</td><td class="n">${lc ? f(lc.valor) : "—"}</td><td class="n">${oc ? f(oc.valor) + (oc.anio !== u.anio ? ` (${oc.anio})` : "") : "—"}</td></tr>`;
    }).join("");
    document.getElementById("t-fort").innerHTML = head + `<tbody>${body}</tbody>`;
  })();

  // ---------- G13: puesto de Uruguay en todos los indicadores ----------
  (() => {
    const filas = IND.map((ind) => { const rk = ranking(ind); return { l: ind.label.replace(" (US$ PPA)", "").replace(" cada 100.000 hab.", "").replace(" (25+)", "").replace(" (15 a 24)", ""), pos: rk.findIndex((r) => r.iso3 === "URY") + 1, n: rk.length }; });
    [["CC.SC", "Control de la corrupción"], ["RL.SC", "Estado de derecho"], ["VA.SC", "Libertades"], ["PV.SC", "Estabilidad política"], ["EG.ELC.RNWX.ZS", "Electricidad renovable no hidráulica"], ["IT.NET.BBND.P2", "Banda ancha fija"]].forEach(([id, l]) => {
      const rk = PAISES.map((iso) => ult(fort, id, iso)).filter((r) => r && r.valor >= 0).sort((a, b) => b.valor - a.valor);
      filas.push({ l, pos: rk.findIndex((r) => r.iso3 === "URY") + 1, n: rk.length });
    });
    filas.sort((a, b) => (a.pos - 1) / (a.n - 1) - (b.pos - 1) / (b.n - 1) || a.l.localeCompare(b.l, "es"));
    const est = (p, n) => (p <= 3 ? C.good : p > n - 3 ? C.bad : C.warn);
    legend("lg-contraste", [[C.good, "Entre los 3 mejores"], [C.warn, "En el medio"], [C.bad, "Entre los 3 peores"]]);
    const W = FULL, rowH = 19, L = 190, R = 64, top = 14, H = top + filas.length * rowH;
    const svg = svgIn("g-contraste", W, H, "Puesto de Uruguay en cada indicador");
    const xr = (i, n) => L + (i / (n - 1)) * (W - L - R);
    T(svg.append("text").attr("x", L).attr("y", 7).attr("fill", C.muted).text("← mejor puesto"), 8.5);
    T(svg.append("text").attr("x", W - R).attr("y", 7).attr("text-anchor", "end").attr("fill", C.muted).text("peor puesto →"), 8.5);
    filas.forEach((f, i) => {
      const y = top + i * rowH + rowH / 2, c = est(f.pos, f.n);
      T(svg.append("text").attr("x", L - 12).attr("y", y).attr("dy", "0.33em").attr("text-anchor", "end").attr("fill", C.ink).style("font-weight", 600).text(f.l), 9.5);
      svg.append("line").attr("x1", xr(0, f.n)).attr("x2", xr(f.n - 1, f.n)).attr("y1", y).attr("y2", y).attr("stroke", C.line).attr("stroke-width", 1.5);
      for (let k = 0; k < f.n; k++) if (k !== f.pos - 1) svg.append("circle").attr("cx", xr(k, f.n)).attr("cy", y).attr("r", 2.6).attr("fill", C.gray);
      svg.append("circle").attr("cx", xr(f.pos - 1, f.n)).attr("cy", y).attr("r", 7).attr("fill", c);
      T(svg.append("text").attr("x", xr(f.pos - 1, f.n)).attr("y", y).attr("dy", "0.34em").attr("text-anchor", "middle").attr("fill", "#fff").style("font-weight", 800).text(f.pos), 8);
      T(svg.append("text").attr("x", W - R + 12).attr("y", y).attr("dy", "0.33em").attr("fill", c).style("font-weight", 700).text(`${f.pos}.º de ${f.n}`), 9);
    });
  })();

  document.documentElement.dataset.listo = "1";
})();
