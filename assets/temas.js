// Seguridad (homicidios y cárceles) y natalidad — datos en data/seguridad y data/demografia (notebooks 03 y 04)
(async function () {
  const [porAnio, porMotivo, ppl, nac, gasto] = await Promise.all([
    d3.json("data/seguridad/homicidios_por_anio.json"),
    d3.json("data/seguridad/homicidios_por_motivo.json"),
    d3.json("data/seguridad/carceles_poblacion.json"),
    d3.json("data/demografia/nacimientos_por_anio.json"),
    d3.json("data/seguridad/carceles_gasto.json"),
  ]);

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const num = (v) => v.toLocaleString("es-UY");
  const pct = (v) => Math.round(v * 100) + "%";

  // ---------- tooltip (mismo elemento que el capítulo 01) ----------
  const tip = document.getElementById("tip");
  function showTip(html, ev) {
    tip.innerHTML = html;
    tip.hidden = false;
    const pad = 14, r = tip.getBoundingClientRect();
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  const hideTip = () => (tip.hidden = true);
  const sw = (c) => `<span class="sw" style="background:${c}"></span>`;

  function roundedBar(x, y0, w, yt, r = 4) {
    r = Math.max(0, Math.min(r, w / 2, y0 - yt));
    return `M${x},${y0}V${yt + r}Q${x},${yt} ${x + r},${yt}H${x + w - r}Q${x + w},${yt} ${x + w},${yt + r}V${y0}Z`;
  }

  function axes(svg, x, y, W, H, m, yTicks, yFmt, xAxis) {
    svg.append("g").attr("class", "gridline").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(yTicks).tickSize(-(W - m.l - m.r)).tickFormat(""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(yTicks).tickFormat(yFmt).tickSize(0).tickPadding(6)).call((g) => g.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(xAxis);
  }

  // ---------- stat tiles ----------
  const ult = porAnio[porAnio.length - 1];
  const conflictos = porMotivo.find((d) => d.anio === ult.anio && d.motivo === "Conflictos entre criminales").n;
  const pplUlt = ppl[ppl.length - 1], ppl0 = ppl[0];
  document.getElementById("seg-stats").innerHTML = [
    [num(ult.n), `homicidios en ${ult.anio}`],
    [pct(conflictos / ult.n), `fueron conflictos entre criminales (${ult.anio})`],
    [pct(ult.n_fuego / ult.n), `con arma de fuego (${ult.anio})`],
    [num(porAnio[0].n), `homicidios en ${porAnio[0].anio}, para comparar`],
  ].map(([v, l]) => `<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

  // ---------- costo de las cárceles ----------
  const g = gasto[gasto.length - 1], g0 = gasto[0];
  const dec1 = (v) => v.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  document.getElementById("costo-stats").innerHTML = [
    ["$ " + num(g.gasto_mensual_por_persona), `por persona presa por mes (${g.anio})`, `${g0.anio}: $ ${num(g0.gasto_mensual_por_persona)}`],
    [dec1(g.salarios_minimos).replace(",0", ""), `salarios mínimos por persona presa (${g.anio})`, `salario mínimo ${g.anio}: $ ${num(g.salario_minimo)}`],
    ["$ " + num(Math.round(g.gasto_total / 1e6)) + " mill.", `gasto total del programa de cárceles (${g.anio})`, `${g0.anio}: $ ${num(Math.round(g0.gasto_total / 1e6))} millones`],
  ].map(([v, l, d]) => `<div class="stat"><div class="v">${v}</div><div class="l">${l}</div><div class="d">${d}</div></div>`).join("");

  // ---------- homicidios por motivo: barras apiladas (altura = total del año) ----------
  // Izquierda: conflictos entre criminales vs. el resto. Derecha: las cinco categorías.
  const MOTIVOS = ["Conflictos entre criminales", "Altercados y conflictos", "Violencia doméstica", "Rapiña o hurto", "Otros / sin dato"];
  const FOCO = MOTIVOS[0];
  const COLOR_MOT = { "Conflictos entre criminales": "--s2", "Altercados y conflictos": "--s1", "Violencia doméstica": "--c3",
    "Rapiña o hurto": "--c4", "Otros / sin dato": "--c5", "Otros motivos": "--ref" };
  const colMot = (m) => css(COLOR_MOT[m]);
  const ANIOS_MOT = [...new Set(porMotivo.map((d) => d.anio))].sort((a, b) => a - b);
  const porAnioMot = ANIOS_MOT.map((anio) => {
    const fila = { anio, total: 0 };
    MOTIVOS.forEach((m) => { const d = porMotivo.find((r) => r.anio === anio && r.motivo === m); fila[m] = d ? d.n : 0; fila.total += fila[m]; });
    fila["Otros motivos"] = fila.total - fila[FOCO];
    return fila;
  });
  const VISTAS = [
    { id: "a", titulo: "Conflictos entre criminales y el resto", claves: [FOCO, "Otros motivos"], pctFoco: true },
    { id: "b", titulo: "Por motivo", claves: MOTIVOS, pctFoco: false },
  ];
  const leg = (claves) => claves.map((k) => `<li>${sw(colMot(k))}${k}</li>`).join("");

  function stackChart(cell, vista, W, yMax) {
    const H = 300, m = { t: 22, r: 4, b: 28, l: 34 };
    cell.append("div").attr("class", "mot-name").text(vista.titulo);
    cell.append("ul").attr("class", "legend legend-left").html(leg(vista.claves));
    const svg = cell.append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", `Homicidios por año, ${vista.titulo.toLowerCase()}: ${ANIOS_MOT[0]} ${porAnioMot[0].total}, ${ANIOS_MOT[ANIOS_MOT.length - 1]} ${porAnioMot[porAnioMot.length - 1].total}`);
    const x = d3.scaleBand().domain(ANIOS_MOT).range([m.l, W - m.r]).paddingInner(W < 420 ? 0.18 : 0.26);
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([H - m.b, m.t]);
    const every = x.bandwidth() < 22 ? 3 : 2;
    axes(svg, x, y, W, H, m, 4, (d) => d,
      d3.axisBottom(x).tickValues(ANIOS_MOT.filter((a, i) => i % every === 0 || i === ANIOS_MOT.length - 1))
        .tickFormat((a) => (x.bandwidth() < 30 ? "’" + String(a).slice(2) : a)).tickSize(0).tickPadding(8));
    const stack = d3.stack().keys(vista.claves)(porAnioMot);
    const gap = 2;
    stack.forEach((serie, si) => {
      const top = si === stack.length - 1;
      svg.append("g").selectAll("path").data(serie).join("path").attr("fill", colMot(serie.key))
        .attr("d", (d) => {
          const x0 = x(d.data.anio), y0 = y(d[0]) - (si > 0 ? gap / 2 : 0), y1 = y(d[1]) + (top ? 0 : gap / 2);
          if (y0 - y1 <= 0) return null;
          return top ? roundedBar(x0, y0, x.bandwidth(), y1, 3) : `M${x0},${y0}V${y1}H${x0 + x.bandwidth()}V${y0}Z`;
        });
    });
    // % de conflictos entre criminales dentro del segmento, si entra
    if (vista.pctFoco && x.bandwidth() >= 21) {
      svg.append("g").selectAll("text").data(porAnioMot).join("text")
        .attr("x", (d) => x(d.anio) + x.bandwidth() / 2).attr("y", (d) => y(d[FOCO] / 2)).attr("dy", "0.35em")
        .attr("text-anchor", "middle").attr("class", "seg-lbl").text((d) => Math.round((d[FOCO] / d.total) * 100) + "%");
    }
    // total arriba: primer año, pico y último año
    const pico = porAnioMot.reduce((a, b) => (b.total > a.total ? b : a));
    const marcar = [porAnioMot[0], pico, porAnioMot[porAnioMot.length - 1]];
    svg.append("g").selectAll("text").data(marcar).join("text").attr("class", "val").attr("text-anchor", "middle")
      .attr("x", (d) => x(d.anio) + x.bandwidth() / 2).attr("y", (d) => y(d.total) - 6).style("font-weight", 600).text((d) => d.total);
    // hover por año
    const foco = svg.append("rect").attr("fill", "none").attr("stroke", css("--ink")).attr("stroke-width", 1.5).attr("rx", 4).attr("opacity", 0);
    svg.append("g").attr("class", "hit").selectAll("rect").data(porAnioMot).join("rect").attr("fill", "transparent")
      .attr("x", (d) => x(d.anio) - (x.step() - x.bandwidth()) / 2).attr("width", x.step()).attr("y", m.t).attr("height", H - m.t - m.b)
      .on("pointermove", (ev, d) => {
        foco.attr("x", x(d.anio) - 2).attr("width", x.bandwidth() + 4).attr("y", y(d.total) - 2).attr("height", y(0) - y(d.total) + 2).attr("opacity", 1);
        const filas = vista.claves.slice().reverse().map((k) =>
          `<div class="row">${sw(colMot(k))}${k}<strong>${d[k]} · ${pct(d[k] / d.total)}</strong></div>`).join("");
        showTip(`<b>${d.anio} · ${d.total} homicidios</b>${filas}`, ev);
      })
      .on("pointerleave", () => { foco.attr("opacity", 0); hideTip(); });
  }

  function renderMotivo() {
    const host = document.getElementById("chart-motivo");
    host.innerHTML = "";
    const W = host.clientWidth, ancho = W >= 680, gap = 28;
    const grid = d3.select(host).append("div").attr("class", ancho ? "mot-stack" : "mot-stack mot-1col");
    const cw = ancho ? (W - gap) / 2 : W;
    const yMax = d3.max(porAnioMot, (d) => d.total);
    VISTAS.forEach((v) => stackChart(grid.append("div").attr("class", "mot-cell"), v, cw, yMax));
    // tabla con los datos (accesible y para quien prefiera los números)
    const tabla = document.getElementById("tabla-motivo");
    if (tabla) tabla.innerHTML = `<table class="mtable mtable-num"><thead><tr><th>Año</th><th>Total</th>${MOTIVOS.map((k) => `<th>${k}</th>`).join("")}</tr></thead><tbody>` +
      porAnioMot.map((d) => `<tr><td>${d.anio}</td><td>${d.total}</td>${MOTIVOS.map((k) => `<td>${d[k]} <span class="muted">(${pct(d[k] / d.total)})</span></td>`).join("")}</tr>`).join("") + "</tbody></table>";
  }

  // ---------- cárceles: barras por año ----------
  const PPL_OPTS = [["total", "Total"], ["hombres", "Hombres"], ["mujeres", "Mujeres"]];
  let pplKey = "total";
  const segEl = document.getElementById("ppl-seg");
  PPL_OPTS.forEach(([k, label]) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "radio"); b.textContent = label;
    b.setAttribute("aria-checked", String(k === pplKey));
    b.onclick = () => {
      pplKey = k;
      segEl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", "false"));
      b.setAttribute("aria-checked", "true");
      renderPpl();
    };
    segEl.appendChild(b);
  });

  function barChart(hostId, rows, key, opts) {
    const host = document.getElementById(hostId);
    const W = host.clientWidth, H = opts.H || 280, m = { t: 24, r: 8, b: 28, l: 48 };
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", opts.label);
    const x = d3.scaleBand().domain(rows.map((d) => d.anio)).range([m.l, W - m.r]).paddingInner(W < 500 ? 0.15 : 0.25);
    const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d[key])]).nice().range([H - m.b, m.t]);
    const every = Math.ceil(rows.length / Math.max(4, Math.floor(W / 70)));
    axes(svg, x, y, W, H, m, 4, (d) => num(d),
      d3.axisBottom(x).tickValues(rows.map((d) => d.anio).filter((a, i) => i % every === 0 || i === rows.length - 1)).tickSize(0).tickPadding(8));
    const c = css("--s1");
    const g = svg.append("g").selectAll("g").data(rows).join("g");
    g.append("path").attr("fill", c).attr("d", (d) => roundedBar(x(d.anio), y(0), x.bandwidth(), y(d[key])));
    const labelIdx = opts.labelAll ? rows.map((_, i) => i) : [0, rows.length - 1];
    g.filter((d, i) => labelIdx.includes(i)).append("text").attr("class", "val").attr("text-anchor", "middle")
      .attr("x", (d) => x(d.anio) + x.bandwidth() / 2).attr("y", (d) => y(d[key]) - 6).text((d) => num(d[key]));
    g.append("rect").attr("fill", "transparent").attr("x", (d) => x(d.anio) - 1).attr("width", x.bandwidth() + 2)
      .attr("y", m.t).attr("height", H - m.t - m.b)
      .on("pointermove", (ev, d) => showTip(opts.tip(d), ev)).on("pointerleave", hideTip);
  }

  function renderPpl() {
    const label = PPL_OPTS.find(([k]) => k === pplKey)[1];
    barChart("chart-ppl", ppl, pplKey, {
      label: `Personas privadas de libertad (${label.toLowerCase()}), diciembre de cada año, ${ppl[0].anio}–${pplUlt.anio}`,
      tip: (d) => `<b>Diciembre ${d.anio}</b><div class="row">Total<strong>${num(d.total)}</strong></div><div class="row">Hombres<strong>${num(d.hombres)}</strong></div><div class="row">Mujeres<strong>${num(d.mujeres)}</strong></div>`,
    });
  }

  function renderNac() {
    const base = nac[0].nacimientos;
    barChart("chart-nac", nac, "nacimientos", {
      labelAll: document.getElementById("chart-nac").clientWidth > 520,
      label: `Nacimientos por año, ${nac[0].anio}–${nac[nac.length - 1].anio}`,
      tip: (d) => `<b>${d.anio}</b><div class="row">Nacimientos<strong>${num(d.nacimientos)}</strong></div><div class="row">Contra ${nac[0].anio}<strong>${d.anio === nac[0].anio ? "—" : Math.round((d.nacimientos / base - 1) * 100) + "%"}</strong></div>`,
    });
  }

  function renderAll() { renderMotivo(); renderPpl(); renderNac(); }
  renderAll();
  let raf;
  addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderAll); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll);
})();
