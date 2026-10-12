// Capítulo 05 — Lo que sí funciona (datos: data/fortalezas/fortalezas_paises.json, notebook 06_fortalezas)
(async function () {
  const data = await d3.json("data/fortalezas/fortalezas_paises.json");
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const f1 = (v) => v.toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const PAISES = ["URY", "ARG", "BOL", "BRA", "CHL", "COL", "ECU", "PRY", "PER", "VEN", "CRI", "MEX"];

  const IND = [
    { id: "CC.SC", nombre: "Control de la corrupción", unidad: "/100", max: 100,
      que: "Qué tan bien se evita que el poder público se use para beneficio privado: coimas, favores, captura del Estado." },
    { id: "RL.SC", nombre: "Estado de derecho", unidad: "/100", max: 100,
      que: "Cuánto se confía en las reglas y en que se cumplan: contratos, propiedad, policía y justicia." },
    { id: "VA.SC", nombre: "Libertades y rendición de cuentas", unidad: "/100", max: 100,
      que: "Si la gente puede elegir a su gobierno y tiene libertad de expresión, de prensa y de asociación." },
    { id: "PV.SC", nombre: "Estabilidad política", unidad: "/100", max: 100,
      que: "Qué tan poco probable es que el gobierno caiga por medios violentos o fuera de la Constitución." },
    { id: "EG.ELC.RNWX.ZS", nombre: "Electricidad renovable no hidráulica", unidad: "%", max: 70,
      que: "Porcentaje de la electricidad que sale de fuentes renovables, sin contar las represas." },
    { id: "IT.NET.BBND.P2", nombre: "Banda ancha fija", unidad: " cada 100", max: 40,
      que: "Conexiones fijas de banda ancha cada 100 habitantes." },
  ];

  const ultimo = (ind, iso) => data.filter((d) => d.indicador === ind && d.iso3 === iso).sort((a, b) => b.anio - a.anio)[0];

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

  // ---------- tarjetas ----------
  function renderCards() {
    const grid = document.getElementById("fort-grid");
    grid.innerHTML = IND.map((ind) => {
      const rows = PAISES.map((iso) => ultimo(ind.id, iso)).filter((r) => r && r.valor >= 0).sort((a, b) => b.valor - a.valor); // valores negativos = error de la fuente
      const u = rows.find((r) => r.iso3 === "URY");
      const puesto = rows.indexOf(u) + 1;
      const oc = ultimo(ind.id, "OED");
      const pos = (v) => Math.max(0, Math.min(100, (v / ind.max) * 100));
      const segundo = rows.find((r) => r.iso3 !== "URY");
      const prom = d3.mean(rows, (r) => r.valor);
      const fila = (n, v, a, cls) => `
        <div class="fb-row ${cls}" data-p="${n}" data-v="${v}" data-a="${a}">
          <span class="fb-n">${n}</span>
          <span class="fb-track"><span class="fb-bar" style="width:${pos(v)}%"></span></span>
          <span class="fb-v">${f1(v)}</span>
        </div>`;
      const barras = [
        fila("Uruguay", u.valor, u.anio, "is-uy"),
        fila(segundo.pais + " (2º)", segundo.valor, segundo.anio, "is-2"),
        fila("Promedio de los " + rows.length, prom, "último dato de cada país", "is-avg"),
        oc ? fila("Promedio OCDE", oc.valor, oc.anio, "is-oc") : "",
      ].join("");
      return `<div class="fort-card">
        <div class="fort-top"><span class="pill pill-good">${puesto}º de ${rows.length}</span><span class="fort-anio">${u.anio}</span></div>
        <h4>${ind.nombre}</h4>
        <div class="fort-big">${f1(u.valor)}<small>${ind.unidad}</small></div>
        <p class="fort-que">${ind.que}</p>
        <div class="fort-bars">${barras}</div>
      </div>`;
    }).join("");
    grid.querySelectorAll(".fb-row").forEach((el) => {
      el.addEventListener("pointermove", (ev) => showTip(`<b>${el.dataset.p}</b><div class="row">Valor<strong>${(+el.dataset.v).toLocaleString("es-UY", { maximumFractionDigits: 1 })}</strong></div><div class="row">Año<strong>${el.dataset.a}</strong></div>`, ev));
      el.addEventListener("pointerleave", hideTip);
    });
  }

  // ---------- evolución de la electricidad renovable sin hidro ----------
  function renderRen() {
    const ID = "EG.ELC.RNWX.ZS";
    const SER = [["URY", "Uruguay", css("--good"), 3, null], ["OED", "Promedio OCDE", css("--s1"), 2, "6 4"], ["LCN", "América Latina y el Caribe", css("--ref"), 2, "2 4"]];
    document.getElementById("legend-ren").innerHTML = SER.map(([, n, c, , dash]) =>
      `<li><span class="sw" style="background:${c};${dash ? "height:3px;border-radius:2px" : ""}"></span>${n}</li>`).join("");
    const host = document.getElementById("chart-ren");
    const W = host.clientWidth, H = W < 500 ? 240 : 300, m = { t: 16, r: W < 500 ? 40 : 56, b: 28, l: 40 };
    const series = SER.map(([iso, n, c, sw, dash]) => ({ iso, n, c, sw, dash, rows: data.filter((d) => d.indicador === ID && d.iso3 === iso).sort((a, b) => a.anio - b.anio) }));
    const all = series.flatMap((s) => s.rows);
    const x = d3.scaleLinear().domain(d3.extent(all, (d) => d.anio)).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 70]).range([H - m.b, m.t]);
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", "Electricidad de viento, sol y biomasa: Uruguay pasó de 13% en 2012 a 51% en 2021; la OCDE llegó a 17%.");
    svg.append("g").attr("class", "gridline").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)).tickFormat(""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat((d) => d + "%").tickSize(0).tickPadding(6)).call((g) => g.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).ticks(W < 500 ? 4 : 8).tickFormat(d3.format("d")).tickSize(0).tickPadding(8));
    const line = d3.line().x((d) => x(d.anio)).y((d) => y(d.valor)).curve(d3.curveMonotoneX);
    series.slice().reverse().forEach((s) => {
      svg.append("path").datum(s.rows).attr("fill", "none").attr("stroke", s.c).attr("stroke-width", s.sw)
        .attr("stroke-dasharray", s.dash).attr("stroke-linecap", "round").attr("d", line);
      const l = s.rows[s.rows.length - 1];
      svg.append("text").attr("x", x(l.anio) + 6).attr("y", y(l.valor) + (s.iso === "LCN" ? 7 : s.iso === "OED" ? -5 : 0)).attr("dy", "0.35em")
        .style("font-size", "13px").style("font-weight", s.iso === "URY" ? 700 : 500).style("fill", s.iso === "URY" ? s.c : css("--ink-2"))
        .text(Math.round(l.valor) + "%");
    });
    const u0 = series[0].rows[0];
    svg.append("circle").attr("cx", x(u0.anio)).attr("cy", y(u0.valor)).attr("r", 4).attr("fill", series[0].c);
    svg.append("text").attr("x", x(u0.anio) + 6).attr("y", y(u0.valor) - 10).style("font-size", "13px").style("font-weight", 700)
      .style("fill", series[0].c).text(Math.round(u0.valor) + "%");
    const guide = svg.append("line").attr("y1", m.t).attr("y2", H - m.b).attr("stroke", css("--axis")).attr("opacity", 0);
    svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b).attr("fill", "transparent")
      .on("pointermove", (ev) => {
        const a = Math.round(x.invert(d3.pointer(ev)[0]));
        guide.attr("x1", x(a)).attr("x2", x(a)).attr("opacity", 1);
        showTip(`<b>${a}</b>` + series.map((s) => { const d = s.rows.find((r) => r.anio === a); return d ? `<div class="row"><span class="sw" style="background:${s.c}"></span>${s.n}<strong>${d.valor.toLocaleString("es-UY", { maximumFractionDigits: 1 })}%</strong></div>` : ""; }).join(""), ev);
      })
      .on("pointerleave", () => { guide.attr("opacity", 0); hideTip(); });
  }

  function renderAll() { renderCards(); renderRen(); }
  renderAll();
  let raf, lastW = innerWidth;
  addEventListener("resize", () => { if (innerWidth === lastW) return; lastW = innerWidth; cancelAnimationFrame(raf); raf = requestAnimationFrame(renderRen); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll);
})();
