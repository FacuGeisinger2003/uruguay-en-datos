// De 100 niños uruguayos — visualización de pobreza infantil (ECH INE 2024–2025)
(async function () {
  const [tramos, edades, dptos] = await Promise.all([
    d3.json("data/pobreza/pobreza_por_tramo.json"),
    d3.json("data/pobreza/pobreza_por_edad.json"),
    d3.json("data/pobreza/pobreza_infantil_dpto.json"),
  ]);

  const ANIOS = [2024, 2025];
  const TRAMO_LABEL = { "0-5": "0 a 5 años", "6-12": "6 a 12 años", "13-17": "13 a 17 años", "18-64": "18 a 64 años", "65+": "65 años o más" };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const yearColor = (a) => (a === 2024 ? css("--s1") : css("--s2"));
  const fmt = (v) => v.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  const state = { tramo: "0-5", anioHero: 2024, anioMapa: 2024 };

  // ---------- tooltip ----------
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

  // ---------- segmented controls ----------
  function seg(id, options, get, set) {
    const el = document.getElementById(id);
    el.innerHTML = "";
    options.forEach(([val, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.textContent = label;
      b.setAttribute("aria-checked", String(get() === val));
      b.onclick = () => {
        set(val);
        el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", "false"));
        b.setAttribute("aria-checked", "true");
      };
      el.appendChild(b);
    });
  }

  // ---------- 1. Hero: 100 dots ----------
  const dotsSvg = d3.select("#dots").attr("viewBox", "0 0 400 400");
  const cell = 40;
  const dots = dotsSvg.selectAll("circle").data(d3.range(100)).join("circle")
    .attr("cx", (i) => (i % 10) * cell + cell / 2)
    .attr("cy", (i) => Math.floor(i / 10) * cell + cell / 2)
    .attr("r", 14);

  function renderHero() {
    const row = tramos.find((r) => r.anio === state.anioHero && r.tramo === state.tramo);
    const n = Math.round(row.pct_pobreza);
    document.getElementById("hero-num").textContent = n;
    document.getElementById("hero-tramo").textContent = state.tramo === "18-64" || state.tramo === "65+"
      ? "personas de " + TRAMO_LABEL[state.tramo] : TRAMO_LABEL[state.tramo];
    document.getElementById("pobreza-title").firstChild.textContent = (state.tramo === "18-64" || state.tramo === "65+") ? "De 100 " : "De 100 niños de ";
    dots.attr("fill", (i) => (i < n ? css("--pobre") : css("--no-pobre")));
    dotsSvg.attr("aria-label", `${n} de cada 100 ${TRAMO_LABEL[state.tramo]} viven en hogares pobres (${state.anioHero}). Valor exacto: ${fmt(row.pct_pobreza)}.`);
  }
  seg("tramo-seg", Object.keys(TRAMO_LABEL).map((k) => [k, k === "65+" ? "65+" : k]), () => state.tramo, (v) => { state.tramo = v; renderHero(); });
  seg("anio-seg-hero", ANIOS.map((a) => [a, String(a)]), () => state.anioHero, (v) => { state.anioHero = v; renderHero(); });

  // ratio text
  const t24 = (t) => tramos.find((r) => r.anio === 2024 && r.tramo === t).pct_pobreza;
  document.getElementById("ratio").textContent = Math.round(t24("0-5") / t24("65+"));

  // legends for year series
  ["legend-edad"].forEach((id) => {
    const isLine = true;
    document.getElementById(id).innerHTML = ANIOS.map((a) =>
      `<li><span class="sw ${isLine ? "sw-line" : ""}" style="background:${yearColor(a)}"></span>${a}</li>`).join("");
  });



  // ---------- 3. Line by single age ----------
  function rolling(rows) {
    return rows.map((d, i) => {
      const w = rows.slice(Math.max(0, i - 1), i + 2);
      return { edad: d.edad, v: d3.mean(w, (x) => x.pct_pobreza), raw: d.pct_pobreza };
    });
  }
  const series = ANIOS.map((a) => ({
    anio: a,
    values: rolling(edades.filter((d) => d.anio === a).sort((p, q) => p.edad - q.edad)),
  }));

  function renderEdad() {
    const host = document.getElementById("chart-edad");
    const W = host.clientWidth, H = 300, m = { t: 16, r: 44, b: 32, l: 36 };
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "img").attr("aria-label", "Gráfico de líneas: % de pobreza por edad simple, 2024 y 2025");
    const x = d3.scaleLinear().domain([0, 90]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 40]).range([H - m.b, m.t]);

    svg.append("g").attr("class", "gridline").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)).tickFormat(""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat((d) => d + "%").tickSize(0)).call((g) => g.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickValues([0, 6, 13, 18, 30, 45, 65, 80, 90]).tickSize(4).tickFormat((d) => d === 0 ? "0 años" : d));

    // shaded childhood band
    svg.append("rect").attr("x", x(0)).attr("width", x(17.5) - x(0)).attr("y", m.t).attr("height", H - m.t - m.b)
      .attr("fill", css("--grid")).attr("opacity", 0.5);
    svg.append("text").attr("class", "val").attr("x", x(8.75)).attr("y", m.t + 14).attr("text-anchor", "middle").text("Niñez (0–17)");

    const line = d3.line().x((d) => x(d.edad)).y((d) => y(d.v)).curve(d3.curveMonotoneX);
    // dato real de cada edad (puntos) debajo de la línea suavizada
    series.forEach((s) => svg.append("g").selectAll("circle").data(s.values).join("circle")
      .attr("cx", (d) => x(d.edad)).attr("cy", (d) => y(d.raw)).attr("r", 2).attr("fill", yearColor(s.anio)).attr("opacity", 0.35));
    svg.append("g").selectAll("path").data(series).join("path")
      .attr("fill", "none").attr("stroke-width", 2).attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
      .attr("stroke", (s) => yearColor(s.anio)).attr("d", (s) => line(s.values));

    // direct labels at end
    svg.append("g").selectAll("text").data(series).join("text").attr("class", "val")
      .attr("x", W - m.r + 6).attr("dy", "0.35em")
      .attr("y", (s, i) => y(s.values[s.values.length - 1].v) + (i === 0 ? -8 : 8))
      .text((s) => s.anio);

    // crosshair + tooltip
    const cross = svg.append("line").attr("stroke", css("--axis")).attr("y1", m.t).attr("y2", H - m.b).attr("opacity", 0);
    const marks = svg.append("g").selectAll("circle").data(series).join("circle").attr("r", 4.5)
      .attr("fill", (s) => yearColor(s.anio)).attr("stroke", css("--surface")).attr("stroke-width", 2).attr("opacity", 0);
    svg.append("rect").attr("fill", "transparent").attr("x", m.l).attr("y", m.t)
      .attr("width", W - m.l - m.r).attr("height", H - m.t - m.b)
      .on("pointermove", (ev) => {
        const [px] = d3.pointer(ev);
        const e = Math.max(0, Math.min(90, Math.round(x.invert(px))));
        cross.attr("x1", x(e)).attr("x2", x(e)).attr("opacity", 1);
        marks.attr("cx", x(e)).attr("cy", (s) => y(s.values.find((v) => v.edad === e).v)).attr("opacity", 1);
        showTip(`<b>${e} ${e === 1 ? "año" : "años"}</b>` + series.map((s) => {
          const v = s.values.find((p) => p.edad === e);
          return `<div class="row"><span class="sw sw-line" style="background:${yearColor(s.anio)}"></span>${s.anio} (dato de esa edad)<strong>${fmt(v.raw)}</strong></div><div class="row" style="opacity:.75"><span class="sw"></span>promedio 3 edades<strong>${fmt(v.v)}</strong></div>`;
        }).join(""), ev);
      })
      .on("pointerleave", () => { cross.attr("opacity", 0); marks.attr("opacity", 0); hideTip(); });
  }

  // ---------- 4. Map by departamento ----------
  const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
  const color = d3.scaleThreshold().domain([15, 20, 25, 30, 35, 40]).range(RAMP);
  const darkStep = (v) => RAMP.indexOf(color(v)) >= 3;
  const SMALL_N = 250;

  // Tile map: approximate geographic layout (col, row)
  const TILES = {
    "Artigas": [1, 0], "Rivera": [2, 0],
    "Salto": [0, 1], "Tacuarembó": [2, 1], "Cerro Largo": [3, 1],
    "Paysandú": [0, 2], "Río Negro": [1, 2], "Durazno": [2, 2], "Treinta y Tres": [3, 2],
    "Soriano": [0, 3], "Flores": [1, 3], "Florida": [2, 3], "Lavalleja": [3, 3], "Rocha": [4, 3],
    "Colonia": [0, 4], "San José": [1, 4], "Canelones": [2, 4], "Maldonado": [3, 4],
    "Montevideo": [2, 5],
  };

  const SHORT = { "Tacuarembó": "Tacuar.", "Montevideo": "Mvdeo.", "Cerro Largo": "C. Largo", "Treinta y Tres": "T. y Tres",
    "Maldonado": "Maldon.", "Canelones": "Canel.", "Río Negro": "R. Negro", "Paysandú": "Paysan.", "Lavalleja": "Lavall." };

  let geo = null;
  async function loadGeo() {
    const sources = [
      "https://cdn.jsdelivr.net/npm/@highcharts/map-collection/countries/uy/uy-all.geo.json",
    ];
    for (const src of sources) {
      try {
        const g = await d3.json(src);
        if (g && g.features && g.features.length >= 19) return g;
      } catch (e) { /* try next */ }
    }
    return null;
  }

  function deptTip(d, ev) {
    showTip(`<b>${d.nom_dpto} · ${d.anio}</b><div class="row"><span class="sw" style="background:${color(d.pct_pobreza)}"></span>Niños en hogares pobres<strong>${fmt(d.pct_pobreza)}</strong></div><div class="row">Niños encuestados<strong>${d.n_muestra}</strong></div>${d.n_muestra < SMALL_N ? '<div class="row" style="color:var(--warn)">Muestra chica: leer con cuidado</div>' : ""}`, ev);
  }

  function renderMap() {
    const rows = dptos.filter((d) => d.anio === state.anioMapa);
    const byName = new Map(rows.map((d) => [norm(d.nom_dpto), d]));
    const host = document.getElementById("map");
    const W = host.clientWidth;

    if (geo) {
      const H = Math.round(W * 0.95);
      const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img").attr("aria-label", `Mapa de Uruguay: % de pobreza infantil por departamento, ${state.anioMapa}`);
      const sample = geo.features[0].geometry.coordinates.flat(3)[0];
      const isLonLat = Math.abs(sample) <= 180;
      const proj = isLonLat ? d3.geoMercator() : d3.geoIdentity().reflectY(true);
      proj.fitSize([W, H], geo);
      const path = d3.geoPath(proj);
      const nameOf = (f) => { const p = f.properties || {}; return p.name || p.shapeName || p.NAME_1 || p.nombre || p.NOMBRE || ""; };
      svg.append("g").attr("class", "dept").selectAll("path").data(geo.features).join("path")
        .attr("d", path)
        .attr("fill", (f) => { const d = byName.get(norm(nameOf(f))); return d ? color(d.pct_pobreza) : css("--grid"); })
        .on("pointermove", (ev, f) => { const d = byName.get(norm(nameOf(f))); if (d) deptTip(d, ev); })
        .on("pointerleave", hideTip);
    } else {
      const cols = 5, rowsN = 6, gap = 4;
      const s = Math.min((W - gap * (cols - 1)) / cols, 86);
      const Wt = cols * s + gap * (cols - 1), H = rowsN * s + gap * (rowsN - 1);
      const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${Wt} ${H}`)
        .style("max-width", Wt + "px")
        .attr("role", "img").attr("aria-label", `Mapa de grilla de Uruguay: % de pobreza infantil por departamento, ${state.anioMapa}`);
      const t = svg.selectAll("g").data(rows.filter((d) => TILES[d.nom_dpto])).join("g").attr("class", "tile")
        .attr("transform", (d) => `translate(${TILES[d.nom_dpto][0] * (s + gap)},${TILES[d.nom_dpto][1] * (s + gap)})`)
        .on("pointermove", (ev, d) => deptTip(d, ev)).on("pointerleave", hideTip);
      t.append("rect").attr("width", s).attr("height", s).attr("rx", 6).attr("fill", (d) => color(d.pct_pobreza));
      const ink = (d) => (darkStep(d.pct_pobreza) ? "#ffffff" : "#0b0b0b");
      t.append("text").attr("x", 6).attr("y", 16).attr("fill", ink)
        .style("font-size", s < 70 ? "9.5px" : null)
        .text((d) => (s < 80 && SHORT[d.nom_dpto]) || d.nom_dpto);
      t.append("text").attr("x", 6).attr("y", s - 8).attr("fill", ink)
        .style("font-size", Math.max(13, s * 0.22) + "px").style("font-weight", 600)
        .text((d) => Math.round(d.pct_pobreza) + "%" + (d.n_muestra < SMALL_N ? "*" : ""));
    }

    // ranking (accessible companion to the map)
    const sorted = rows.slice().sort((a, b) => b.pct_pobreza - a.pct_pobreza);
    const max = 55;
    document.getElementById("ranking").innerHTML = sorted.map((d) =>
      `<div class="rank-row" data-n="${d.nom_dpto}"><span class="name">${d.nom_dpto}${d.n_muestra < SMALL_N ? ' <span class="warn">*</span>' : ""}</span>` +
      `<div><div class="bar" style="width:${(d.pct_pobreza / max) * 100}%;background:${color(d.pct_pobreza)}"></div></div>` +
      `<span class="num">${fmt(d.pct_pobreza)}</span></div>`).join("");
    document.querySelectorAll(".rank-row").forEach((el) => {
      const d = rows.find((r) => r.nom_dpto === el.dataset.n);
      el.addEventListener("pointermove", (ev) => deptTip(d, ev));
      el.addEventListener("pointerleave", hideTip);
    });

    // legend
    const edges = [null, 15, 20, 25, 30, 35, 40];
    document.getElementById("map-legend").innerHTML = RAMP.map((c, i) =>
      `<div class="step"><div class="chip" style="background:${c}"></div><span>${i === 0 ? "<15%" : edges[i] + (i === RAMP.length - 1 ? "%+" : "")}</span></div>`).join("");
  }

  // ---------- render ----------
  function renderAll() { renderHero(); renderEdad(); renderMap(); }
  renderAll();
  geo = await loadGeo();
  if (geo) renderMap();

  let raf;
  addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { renderEdad(); renderMap(); }); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll);
})();
