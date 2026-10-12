// Capítulo 04 — Uruguay frente a la región (datos: data/region/comparacion_paises.json, notebook 05_comparacion_regional)
(async function () {
  const rows = await d3.json("data/region/comparacion_paises.json");

  const IND = [
    { id: "NY.GDP.PCAP.PP.KD", que: "Cuánto produce el país por persona", explica: "Es el valor de todo lo que produce el país en un año, dividido entre sus habitantes. Está en dólares \"PPA\": se ajusta por lo que cuestan las cosas en cada país, para que un dólar compre lo mismo en todos. Más alto es mejor.", grp: "Economía", label: "PIB per cápita", unit: "US$ PPA", better: "high", fmt: (v) => "US$ " + Math.round(v).toLocaleString("es-UY"), src: "Banco Mundial / ICP · PIB per cápita en paridad de poder adquisitivo, US$ internacionales constantes de 2021" },
    { id: "NY.GDP.MKTP.KD.ZG", que: "Cuánto creció la economía en el año", explica: "Es cuánto aumentó lo que produce el país respecto al año anterior, descontando la suba de precios. Un 2% quiere decir que se produjo un 2% más que el año anterior. Más alto es mejor.", grp: "Economía", label: "Crecimiento del PIB", unit: "%", better: "high", src: "Banco Mundial · Crecimiento anual del PIB a precios constantes" },
    { id: "FP.CPI.TOTL.ZG", que: "Cuánto subieron los precios en el año", explica: "Es cuánto aumentaron en un año los precios de lo que compran los hogares. Con inflación alta, el sueldo alcanza para menos. Más bajo es mejor, mientras no sea negativa.", grp: "Economía", label: "Inflación", unit: "%", better: "low", cap: 25, src: "FMI vía Banco Mundial · Variación anual del índice de precios al consumidor" },
    { id: "SL.UEM.TOTL.ZS", que: "De cada 100 que buscan trabajo, cuántos no lo consiguen", explica: "Porcentaje de personas que quieren trabajar y buscan empleo pero no lo encuentran, sobre el total de quienes trabajan o buscan. No cuenta a quienes no buscan, como estudiantes o jubilados. Es una estimación de la OIT, por lo que puede diferir unas décimas del dato del INE. Más bajo es mejor.", grp: "Economía", label: "Desempleo", unit: "%", better: "low", src: "OIT (estimación modelada) vía Banco Mundial · % de la fuerza laboral" },
    { id: "SL.UEM.1524.ZS", que: "Lo mismo, pero entre los jóvenes de 15 a 24", explica: "Porcentaje de jóvenes de 15 a 24 años que buscan trabajo y no lo consiguen, sobre el total de jóvenes que trabajan o buscan. Los que solo estudian no cuentan. Más bajo es mejor.", grp: "Economía", label: "Desempleo juvenil", unit: "%", better: "low", src: "OIT (estimación modelada) vía Banco Mundial · % de la fuerza laboral de 15 a 24 años" },
    { id: "SI.POV.GINI", que: "Qué tan desigual se reparte el ingreso", explica: "Va de 0 a 100: 0 sería que todos ganan lo mismo y 100 que una sola persona se lleva todo. Más bajo es mejor. Como referencia, los países nórdicos están entre 25 y 30.", grp: "Social", label: "Desigualdad (Gini)", unit: "", better: "low", fmt: (v) => v.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), src: "Banco Mundial, Poverty and Inequality Platform · Índice de Gini (0 = igualdad total, 100 = desigualdad máxima)" },
    { id: "SI.POV.UMIC", que: "Personas que viven con menos de US$ 8,30 por día", explica: "Porcentaje de personas que viven con menos de 8,30 dólares por día, ajustados por costo de vida (PPA). Es una línea internacional, igual para todos los países, para poder compararlos. No es la línea oficial de pobreza de Uruguay: la del INE es más exigente y por eso da un porcentaje más alto. Más bajo es mejor.", grp: "Social", label: "Pobreza", unit: "%", better: "low", src: "Banco Mundial, Poverty and Inequality Platform · % de la población que vive con menos de US$ 8,30 por día (PPA 2021)" },
    { id: "VC.IHR.PSRC.P5", que: "Asesinatos por cada 100.000 habitantes", explica: "Cantidad de homicidios intencionales en un año por cada 100.000 habitantes. Usar una tasa permite comparar países de distinto tamaño. Más bajo es mejor. El promedio mundial ronda los 6.", grp: "Social", label: "Homicidios", unit: "c/100 mil", better: "low", fmt: (v) => v.toLocaleString("es-UY", { maximumFractionDigits: 1 }), src: "UNODC vía Banco Mundial · Homicidios intencionales cada 100.000 habitantes" },
    { id: "SE.SEC.CUAT.UP.ZS", que: "Adultos de 25 años o más que terminaron la educación media", explica: "Porcentaje de personas de 25 años o más que terminaron la educación media superior (en Uruguay, bachillerato de liceo o UTU). Mide a toda la población adulta, no solo a los jóvenes. Más alto es mejor.", grp: "Social", label: "Secundaria completa", unit: "%", better: "high", src: "UNESCO vía Banco Mundial · % de la población de 25 años o más con al menos secundaria superior completa" },
  ];
  const PAISES = ["URY", "ARG", "BOL", "BRA", "CHL", "COL", "ECU", "PRY", "PER", "VEN", "CRI", "MEX"];
  const REFS = ["LCN", "OED"];
  const NOMBRE = { URY: "Uruguay", ARG: "Argentina", BRA: "Brasil", CHL: "Chile", PRY: "Paraguay", CRI: "Costa Rica", MEX: "México", BOL: "Bolivia", COL: "Colombia", ECU: "Ecuador", PER: "Perú", VEN: "Venezuela", LCN: "América Latina", OED: "OCDE" };
  const MAX_ANTIG = 5; // un dato con más de 5 años de atraso no entra al ranking

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmtDef = (v) => v.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  const fmtOf = (ind) => ind.fmt || fmtDef;

  // índice: indicador -> iso3 -> [{anio, valor}]
  const data = d3.group(rows, (d) => d.indicador, (d) => d.iso3);
  const serie = (ind, iso) => (data.get(ind)?.get(iso) || []).slice().sort((a, b) => a.anio - b.anio);
  const ultimo = (ind, iso) => { const s = serie(ind, iso); return s[s.length - 1]; };

  const state = { ind: "SL.UEM.1524.ZS", vs: "CHL" };

  // ---------- tooltip ----------
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

  // ---------- picker de indicador ----------
  const picker = document.getElementById("ind-picker");
  ["Economía", "Social"].forEach((g) => {
    const h = document.createElement("div"); h.className = "grp"; h.textContent = g; picker.appendChild(h);
    IND.filter((i) => i.grp === g).forEach((i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.textContent = i.label; b.dataset.id = i.id;
      b.onclick = () => { state.ind = i.id; syncButtons(); render(); };
      picker.appendChild(b);
    });
  });
  const paisSeg = document.getElementById("pais-seg") || document.createElement("div");
  PAISES.filter((p) => p !== "URY").forEach((p) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "radio"); b.textContent = NOMBRE[p]; b.dataset.id = p;
    b.onclick = () => { state.vs = p; syncButtons(); renderEvo(); };
    paisSeg.appendChild(b);
  });
  function syncButtons() {
    picker.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.id === state.ind)));
    paisSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.id === state.vs)));
  }


  // ---------- semáforo ----------
  function rankingPaises(ind) {
    const maxAnio = d3.max(rows.filter((r) => r.indicador === ind.id), (r) => r.anio);
    const list = PAISES.map((iso) => ({ iso3: iso, ...ultimo(ind.id, iso) }))
      .filter((r) => r.valor !== undefined && r.anio >= maxAnio - MAX_ANTIG);
    list.sort((a, b) => (ind.better === "high" ? b.valor - a.valor : a.valor - b.valor));
    return list;
  }
  function estado(pos, n) {
    const k = n >= 10 ? 3 : 2;
    if (pos <= k) return { k: "good", label: "Bien", icon: "✓" };
    if (pos > n - k) return { k: "bad", label: "Mal", icon: "✗" };
    return { k: "warn", label: "Regular", icon: "!" };
  }
  const isDark = () => document.documentElement.dataset.theme === "dark" ||
    (document.documentElement.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  function colores(k) {
    if (k === "good") return { c: "#0ca30c", t: isDark() ? "#0ca30c" : "#0a7d0a", bg: "rgba(12,163,12,.12)" };
    if (k === "bad") return { c: "#d03b3b", t: isDark() ? "#e66767" : "#c03030", bg: "rgba(208,59,59,.12)" };
    return { c: "#fab219", t: isDark() ? "#fab219" : "#8a5d00", bg: "rgba(250,178,25,.18)" };
  }
  function renderSemaforo() {
    const cards = IND.map((ind) => {
      const list = rankingPaises(ind);
      const pos = list.findIndex((r) => r.iso3 === "URY") + 1;
      const u = list[pos - 1];
      const e = estado(pos, list.length);
      const mejor = (a, b) => (ind.better === "high" ? a > b : a < b);
      const refs = REFS.map((iso) => {
        const r = ultimo(ind.id, iso);
        const maxAnio = d3.max(rows.filter((x) => x.indicador === ind.id), (x) => x.anio);
        if (!r || r.anio < maxAnio - MAX_ANTIG) return "";
        const ok = mejor(u.valor, r.valor);
        return `<span>vs ${NOMBRE[iso]}: <b class="${ok ? "ok" : "no"}">${ok ? "✓ mejor" : "✗ peor"}</b></span>`;
      }).join("");
      return { ind, pos, n: list.length, u, e, refs };
    });
    const cuenta = (k) => cards.filter((c) => c.e.k === k).length;
    document.getElementById("score").innerHTML =
      `De ${cards.length} indicadores, Uruguay está <span class="pill pill-good">${cuenta("good")} en verde</span> ` +
      `<span class="pill pill-warn">${cuenta("warn")} en amarillo</span> <span class="pill pill-bad">${cuenta("bad")} en rojo</span>`;

    // regla: una fila por indicador; puntos grises = otros países ordenados de mejor (izq.) a peor (der.)
    const host = document.getElementById("semaforo");
    const W = host.clientWidth || 800, narrow = W < 560;
    const rowH = narrow ? 52 : 44, L = narrow ? 14 : 190, Rm = narrow ? 14 : 120, top = 26;
    const H = top + cards.length * rowH + 6;
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", "Puesto de Uruguay en cada indicador entre los países de la región");
    const xr = (i, n) => L + (n > 1 ? (i / (n - 1)) : 0) * (W - L - Rm);
    svg.append("text").attr("x", L).attr("y", 12).attr("class", "val").style("fill", css("--muted")).text("← mejor puesto");
    svg.append("text").attr("x", W - Rm).attr("y", 12).attr("text-anchor", "end").attr("class", "val").style("fill", css("--muted")).text("peor puesto →");
    cards.forEach((c, i) => {
      const y = top + i * rowH + (narrow ? 32 : rowH / 2), col = colores(c.e.k);
      const g = svg.append("g").attr("class", "regla-row").style("cursor", "pointer").attr("tabindex", 0).attr("role", "button")
        .attr("aria-label", `${c.ind.label}: Uruguay ${c.pos}º de ${c.n}. Ver detalle`);
      g.append("rect").attr("x", 0).attr("y", top + i * rowH).attr("width", W).attr("height", rowH)
        .attr("fill", c.ind.id === state.ind ? css("--grid") : "transparent").attr("opacity", 0.6).attr("rx", 8);
      if (narrow) g.append("text").attr("x", L).attr("y", y - 16).style("font-size", "13px").style("font-weight", 600).style("fill", css("--ink")).text(`${c.ind.label} · ${fmtOf(c.ind)(c.u.valor)}`);
      else {
        g.append("text").attr("x", L - 14).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "end").style("font-size", "14px").style("font-weight", 600).style("fill", css("--ink")).text(c.ind.label);
        g.append("text").attr("x", W - Rm + 16).attr("y", y).attr("dy", "0.35em").style("font-size", "14px").style("font-weight", 700).style("fill", css("--ink")).text(fmtOf(c.ind)(c.u.valor));
      }
      g.append("line").attr("x1", xr(0, c.n)).attr("x2", xr(c.n - 1, c.n)).attr("y1", y).attr("y2", y).attr("stroke", css("--grid")).attr("stroke-width", 2);
      for (let k = 0; k < c.n; k++) if (k !== c.pos - 1) g.append("circle").attr("cx", xr(k, c.n)).attr("cy", y).attr("r", 4.5).attr("fill", css("--axis"));
      g.append("circle").attr("cx", xr(c.pos - 1, c.n)).attr("cy", y).attr("r", 11).attr("fill", col.c);
      g.append("text").attr("x", xr(c.pos - 1, c.n)).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "middle")
        .style("font-size", "11px").style("font-weight", 800).style("fill", "#fff").text(c.pos);
      const ir = () => { state.ind = c.ind.id; syncButtons(); render(); document.getElementById("detalle").scrollIntoView({ behavior: "smooth", block: "start" }); };
      g.on("click", ir).on("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ir(); } })
        .on("pointermove", (ev) => showTip(`<b>${c.ind.label}</b><div class="row">Uruguay (${c.u.anio})<strong>${fmtOf(c.ind)(c.u.valor)}</strong></div><div class="row">Puesto<strong>${c.pos}º de ${c.n}</strong></div><div style="opacity:.7;margin-top:4px">${c.ind.que}. Tocá para ver el ranking.</div>`, ev))
        .on("pointerleave", hideTip);
    });
    return cards;
  }

  // ---------- veredicto automático ----------
  function veredicto(ind, ranking) {
    const f = fmtOf(ind);
    const paises = ranking.filter((r) => PAISES.includes(r.iso3));
    const pos = paises.findIndex((r) => r.iso3 === "URY") + 1;
    const n = paises.length;
    const u = paises.find((r) => r.iso3 === "URY");
    const mejor = (a, b) => (ind.better === "high" ? a > b : a < b);
    const col = colores(estado(pos, n).k).t;
    let txt = `En <b>${ind.label.toLowerCase()}</b>, Uruguay (${f(u.valor)}) está `;
    txt += `<b style="color:${col}">${pos === 1 ? "primero" : pos === n ? "último" : pos + "º"}</b>`;
    txt += ` entre los ${n} países del grupo.`;
    const l = ranking.find((r) => r.iso3 === "LCN"), o = ranking.find((r) => r.iso3 === "OED");
    if (l) txt += ` ${mejor(u.valor, l.valor) ? "Mejor" : "Peor"} que el promedio de América Latina (${f(l.valor)})`;
    if (o) txt += `${l ? "," : ""} ${mejor(u.valor, o.valor) ? "mejor" : "peor"} que la OCDE (${f(o.valor)})`;
    if (l || o) txt += ".";
    return txt;
  }

  // ---------- ranking (último dato) ----------
  function renderRank() {
    const ind = IND.find((i) => i.id === state.ind);
    const f = fmtOf(ind);
    const maxAnio = d3.max(rows.filter((r) => r.indicador === ind.id), (r) => r.anio);
    let list = [...PAISES, ...REFS].map((iso) => ({ iso3: iso, ...ultimo(ind.id, iso) }))
      .filter((r) => r.valor !== undefined && r.anio >= maxAnio - MAX_ANTIG);
    list.sort((a, b) => (ind.better === "high" ? b.valor - a.valor : a.valor - b.valor));
    document.getElementById("verdict").innerHTML = veredicto(ind, list);
    document.getElementById("que-mide").innerHTML = `<span class="qm-lbl">¿Qué mide?</span> ${ind.explica}`;
    document.getElementById("rank-title").textContent = `${ind.label}: último dato (${ind.better === "high" ? "mejor arriba" : "más bajo es mejor"})`;

    const host = document.getElementById("chart-rank");
    const W = host.clientWidth, rowH = 30, m = { t: 4, r: 100, b: 4, l: 108 };
    const H = m.t + m.b + list.length * rowH;
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "img").attr("aria-label", `Ranking de ${ind.label}, último dato disponible`);
    const cap = ind.cap;
    const vmax = d3.max(list, (d) => (cap ? Math.min(d.valor, cap) : d.valor));
    const vmin = Math.min(0, d3.min(list, (d) => d.valor));
    const x = d3.scaleLinear().domain([vmin, vmax]).nice().range([m.l, W - m.r]);
    const y = d3.scaleBand().domain(list.map((d) => d.iso3)).range([m.t, H - m.b]).paddingInner(0.3);
    const est = estado(list.filter((r) => PAISES.includes(r.iso3)).findIndex((r) => r.iso3 === "URY") + 1, list.filter((r) => PAISES.includes(r.iso3)).length);
    const color = (iso) => (iso === "URY" ? colores(est.k).c : REFS.includes(iso) ? css("--ref") : css("--s1"));

    const g = svg.selectAll("g").data(list).join("g").attr("transform", (d) => `translate(0,${y(d.iso3)})`);
    g.append("text").attr("class", "lbl").attr("x", m.l - 8).attr("y", y.bandwidth() / 2).attr("dy", "0.35em")
      .attr("text-anchor", "end").style("font-weight", (d) => (d.iso3 === "URY" ? 700 : 400))
      .style("fill", (d) => (REFS.includes(d.iso3) ? css("--ink-2") : null))
      .text((d) => NOMBRE[d.iso3]);
    g.append("rect").attr("x", (d) => Math.min(x(0), x(d.valor)))
      .attr("width", (d) => Math.max(2, Math.abs(x(cap ? Math.min(d.valor, cap) : d.valor) - x(0))))
      .attr("height", y.bandwidth()).attr("rx", 3)
      .attr("fill", (d) => color(d.iso3))
      .attr("opacity", (d) => (REFS.includes(d.iso3) ? 0.9 : 1));
    g.append("text").attr("class", "val").attr("y", y.bandwidth() / 2).attr("dy", "0.35em")
      .attr("x", (d) => x(cap ? Math.min(d.valor, cap) : Math.max(d.valor, 0)) + 6)
      .text((d) => f(d.valor) + ` · ${d.anio}` + (cap && d.valor > cap ? " ▸" : ""));
    g.append("rect").attr("fill", "transparent").attr("x", 0).attr("width", W).attr("height", y.bandwidth())
      .on("pointermove", (ev, d) => showTip(`<b>${NOMBRE[d.iso3]}</b><div class="row">${ind.label} (${d.anio})<strong>${f(d.valor)}</strong></div>`, ev))
      .on("pointerleave", hideTip);
  }

  // ---------- evolución ----------
  function renderEvo() {
    const ind = IND.find((i) => i.id === state.ind);
    if (!document.getElementById("chart-evo")) {
      document.getElementById("ind-source").innerHTML = `<span class="f-lbl">Fuente</span> ${ind.src} <a href="https://data.worldbank.org/indicator/${ind.id}" target="_blank" rel="noopener">ver indicador ↗</a>`;
      return;
    }
    const f = fmtOf(ind);
    document.getElementById("evo-title").textContent = `${ind.label}, 2000–2025`;
    const cU = css("--s2"), cV = css("--s1");
    // solo 4 líneas: Uruguay, el país elegido y las dos referencias (con 12 países juntos no se entendía)
    const lineas = [
      { iso: "LCN", color: css("--muted"), w: 2, dash: "2 4", rol: "ref" },
      { iso: "OED", color: css("--ink"), w: 1.6, dash: "7 5", rol: "ref" },
      { iso: state.vs, color: cV, w: 2, dash: null, rol: "vs" },
      { iso: "URY", color: cU, w: 2.5, dash: null, rol: "uy" },
    ].map((l) => ({ ...l, s: serie(ind.id, l.iso) })).filter((l) => l.s.length);
    // la OCDE sin datos recientes no se dibuja
    const maxAnio = d3.max(rows.filter((r) => r.indicador === ind.id), (r) => r.anio);
    const visibles = lineas.filter((l) => l.s[l.s.length - 1].anio >= maxAnio - MAX_ANTIG);

    document.getElementById("legend-evo").innerHTML = visibles.filter((l) => l.rol !== "otro").reverse().map((l) =>
      l.dash ? `<li><span class="sw sw-dash" style="border-color:${l.color};border-top-style:${l.iso === "LCN" ? "dotted" : "dashed"}"></span>${NOMBRE[l.iso]}</li>`
             : `<li><span class="sw sw-line" style="background:${l.color}"></span>${NOMBRE[l.iso]}</li>`).join("") +
      "";

    const host = document.getElementById("chart-evo");
    const W = host.clientWidth, H = 280, m = { t: 12, r: W < 480 ? 70 : 96, b: 26, l: 46 };
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "img").attr("aria-label", `Evolución de ${ind.label}: Uruguay comparado con ${NOMBRE[state.vs]}`);
    const all = visibles.flatMap((l) => l.s.map((p) => p.valor));
    let ymax = d3.max(all), ymin = Math.min(0, d3.min(all));
    if (ind.cap) ymax = Math.min(ymax, ind.cap);
    const x = d3.scaleLinear().domain([2000, 2025]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([ymin, ymax]).nice().range([H - m.b, m.t]);
    const tf = ind.id === "NY.GDP.PCAP.PP.KD" ? (d) => (d / 1000) + " mil" : (d) => d;

    svg.append("defs").append("clipPath").attr("id", "evo-clip").append("rect")
      .attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b);
    svg.append("g").attr("class", "gridline").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat(""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(tf).tickSize(0).tickPadding(6)).call((g) => g.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickValues([2000, 2005, 2010, 2015, 2020, 2025]).tickFormat(d3.format("d")).tickSize(0).tickPadding(8));
    if (ymin < 0) svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", css("--axis"));

    const line = d3.line().x((d) => x(d.anio)).y((d) => y(d.valor)).curve(d3.curveMonotoneX);
    svg.append("g").attr("clip-path", "url(#evo-clip)").selectAll("path").data(visibles).join("path")
      .attr("fill", "none").attr("stroke", (l) => l.color).attr("stroke-width", (l) => l.w)
      .attr("stroke-dasharray", (l) => l.dash).attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
      .attr("d", (l) => line(l.s));

    // etiqueta al final de cada línea (nombre + último valor), separadas para que no se pisen
    const fin = visibles.map((l) => { const p = l.s[l.s.length - 1]; return { l, p, y: y(ind.cap ? Math.min(p.valor, ind.cap) : p.valor) }; })
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < fin.length; i++) if (fin[i].y - fin[i - 1].y < 13) fin[i].y = fin[i - 1].y + 13;
    fin.forEach(({ l, p, y: yy }) => {
      const nom = l.iso === "LCN" ? "Am. Latina" : NOMBRE[l.iso];
      svg.append("text").attr("x", x(p.anio) + 6).attr("y", yy).attr("dy", "0.35em")
        .style("font-size", "11.5px").style("font-weight", l.rol === "uy" ? 700 : 500).style("fill", l.rol === "ref" ? css("--ink-2") : l.color)
        .text(`${nom} ${f(p.valor)}`);
    });

    // nota de escala / datos faltantes
    const notas = [];
    if (ind.cap && d3.max(all) > ind.cap) {
      const pico = serie(ind.id, "ARG").reduce((a, b) => (b.valor > a.valor ? b : a));
      notas.push(`Escala recortada en ${ind.cap}%: Argentina llegó a ${fmtDef(pico.valor)} en ${pico.anio}.`);
    }
    const faltan = ["URY", state.vs, ...REFS].filter((p) => !visibles.find((l) => l.iso === p));
    if (faltan.length) notas.push(`Sin datos recientes: ${faltan.map((p) => NOMBRE[p]).join(", ")}.`);
    document.getElementById("evo-note").textContent = notas.join(" ");
    document.getElementById("ind-source").innerHTML = `<span class="f-lbl">Fuente</span> ${ind.src} <a href="https://data.worldbank.org/indicator/${ind.id}" target="_blank" rel="noopener">ver indicador ↗</a>`;

    // crosshair
    const foco = visibles.filter((l) => l.rol !== "otro");
    const cross = svg.append("line").attr("stroke", css("--axis")).attr("y1", m.t).attr("y2", H - m.b).attr("opacity", 0);
    const dots = svg.append("g").selectAll("circle").data(foco).join("circle").attr("r", 4)
      .attr("fill", (l) => l.color).attr("stroke", css("--surface")).attr("stroke-width", 2).attr("opacity", 0);
    svg.append("rect").attr("fill", "transparent").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b)
      .on("pointermove", (ev) => {
        const a = Math.max(2000, Math.min(2025, Math.round(x.invert(d3.pointer(ev)[0]))));
        cross.attr("x1", x(a)).attr("x2", x(a)).attr("opacity", 1);
        dots.each(function (l) {
          const p = l.s.find((q) => q.anio === a);
          d3.select(this).attr("opacity", p && p.valor <= y.domain()[1] ? 1 : 0).attr("cx", x(a)).attr("cy", p ? y(p.valor) : 0);
        });
        const filas = foco.slice().reverse().map((l) => {
          const p = l.s.find((q) => q.anio === a);
          const sw = l.dash ? `<span class="sw sw-dash" style="border-color:${l.color}"></span>` : `<span class="sw sw-line" style="background:${l.color}"></span>`;
          return `<div class="row">${sw}${NOMBRE[l.iso]}<strong>${p ? f(p.valor) : "s/d"}</strong></div>`;
        }).join("");
        showTip(`<b>${a}</b>${filas}`, ev);
      })
      .on("pointerleave", () => { cross.attr("opacity", 0); dots.attr("opacity", 0); hideTip(); });
  }

  function render() { renderSemaforo(); renderRank(); renderEvo(); }
  syncButtons();
  render();
  let raf;
  addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
})();
