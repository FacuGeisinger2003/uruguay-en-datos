// Capítulo 02 — Educación (datos: data/educacion/*.json, notebook 02_educacion)
(async function () {
  const [egreso, niniSexo] = await Promise.all([
    d3.json("data/educacion/educacion_egreso_generacion.json"),
    d3.json("data/educacion/educacion_nini_sexo.json"),
  ]);

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = (v) => v.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  const ORDEN = ["65+", "50-64", "40-49", "30-39", "25-29", "21-23"];
  const ETIQ = { "65+": "65 años o más", "50-64": "50 a 64", "40-49": "40 a 49", "30-39": "30 a 39", "25-29": "25 a 29", "21-23": "21 a 23" };

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
  const sw = (c) => `<span class="sw" style="background:${c}"></span>`;

  // ---------- 1. egreso por generación (dumbbell) ----------
  function renderEgreso() {
    const cH = css("--s1"), cM = css("--s2");
    document.getElementById("legend-egreso").innerHTML = `<li>${sw(cH)}Hombres</li><li>${sw(cM)}Mujeres</li><li><span class="sw sw-tick"></span>Total</li>`;
    const rows = ORDEN.map((g) => egreso.find((d) => d.generacion === g)).filter(Boolean);
    const host = document.getElementById("chart-egreso");
    const W = host.clientWidth, rowH = 44, m = { t: 22, r: 56, b: 8, l: W < 480 ? 92 : 118 };
    const H = m.t + m.b + rows.length * rowH;
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "img").attr("aria-label", "Porcentaje que terminó la educación media superior por generación y sexo");
    const x = d3.scaleLinear().domain([0, 70]).range([m.l, W - m.r]);
    const y = d3.scaleBand().domain(rows.map((d) => d.generacion)).range([m.t, H - m.b]).paddingInner(0.2);

    svg.append("g").attr("class", "gridline").attr("transform", `translate(0,${m.t - 6})`)
      .call(d3.axisTop(x).tickValues([0, 25, 50]).tickSize(-(H - m.t - m.b + 6)).tickFormat(""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${m.t - 8})`)
      .call(d3.axisTop(x).tickValues([0, 25, 50]).tickFormat((d) => d + "%").tickSize(0)).call((g) => g.select(".domain").remove());

    const g = svg.selectAll("g.row").data(rows).join("g").attr("class", "row")
      .attr("transform", (d) => `translate(0,${y(d.generacion) + y.bandwidth() / 2})`);
    g.append("text").attr("class", "lbl").attr("x", m.l - 10).attr("dy", "0.35em").attr("text-anchor", "end")
      .style("font-weight", (d) => (d.generacion === "21-23" ? 700 : 400)).text((d) => ETIQ[d.generacion]);
    g.append("line").attr("x1", (d) => x(d.Hombres)).attr("x2", (d) => x(d.Mujeres))
      .attr("stroke", css("--axis")).attr("stroke-width", 3).attr("stroke-linecap", "round");
    g.append("line").attr("x1", (d) => x(d.pct_total)).attr("x2", (d) => x(d.pct_total)).attr("y1", -9).attr("y2", 9)
      .attr("stroke", css("--ink")).attr("stroke-width", 2);
    g.append("circle").attr("cx", (d) => x(d.Hombres)).attr("r", 7).attr("fill", cH).attr("stroke", css("--surface")).attr("stroke-width", 2);
    g.append("circle").attr("cx", (d) => x(d.Mujeres)).attr("r", 7).attr("fill", cM).attr("stroke", css("--surface")).attr("stroke-width", 2);
    g.append("text").attr("class", "val").attr("x", (d) => x(Math.max(d.Hombres, d.Mujeres)) + 14).attr("dy", "0.35em")
      .style("font-weight", 600).style("fill", css("--ink")).text((d) => Math.round(d.pct_total) + "%");
    g.append("rect").attr("x", 0).attr("y", -y.bandwidth() / 2).attr("width", W).attr("height", y.bandwidth()).attr("fill", "transparent")
      .on("pointermove", (ev, d) => showTip(`<b>${ETIQ[d.generacion]} años</b>
        <div class="row"><span class="sw sw-tick"></span>Total<strong>${fmt(d.pct_total)}</strong></div>
        <div class="row">${sw(cH)}Hombres<strong>${fmt(d.Hombres)}</strong></div>
        <div class="row">${sw(cM)}Mujeres<strong>${fmt(d.Mujeres)}</strong></div>
        <div class="row">Personas encuestadas<strong>${d.n_muestra.toLocaleString("es-UY")}</strong></div>`, ev))
      .on("pointerleave", hideTip);
  }

  // ---------- 4. actividad de todos los jóvenes (aparece cuando existe el JSON) ----------
  let actividad = null;
  try { actividad = await d3.json("data/educacion/educacion_actividad.json"); } catch (e) { actividad = null; }
  function renderActividad() {
    if (!actividad || !actividad.length) return;
    document.getElementById("card-actividad").hidden = false;
    const K = [["pct_ocupados", "Trabajan", css("--s1")], ["pct_desocupados", "Buscan y no consiguen", css("--bad")], ["pct_inactivos", "Ni trabajan ni buscan", css("--ref")]];
    document.getElementById("legend-actividad").innerHTML = K.map(([, l, c]) => `<li>${sw(c)}${l}</li>`).join("");
    const rows = ["No terminó el liceo", "Terminó el liceo"].map((k) => actividad.find((d) => d.educacion === k)).filter(Boolean);
    const host = document.getElementById("chart-actividad");
    const W = host.clientWidth, rowH = 48, m = { t: 4, r: 8, b: 4, l: W < 480 ? 120 : 160 }, H = m.t + m.b + rows.length * rowH;
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Actividad de los jóvenes de 18 a 29 según educación");
    const x = d3.scaleLinear().domain([0, 100]).range([m.l, W - m.r]);
    rows.forEach((d, i) => {
      const y0 = m.t + i * rowH + 8, bh = rowH - 16;
      svg.append("text").attr("class", "lbl").attr("x", m.l - 10).attr("y", y0 + bh / 2).attr("dy", "0.35em").attr("text-anchor", "end").text(d.educacion.replace("el liceo", "la media"));
      let acc = 0;
      K.forEach(([k, l, c]) => {
        const v = d[k], x0 = x(acc);
        svg.append("rect").attr("x", x0).attr("y", y0).attr("width", x(acc + v) - x0).attr("height", bh).attr("fill", c)
          .on("pointermove", (ev) => showTip(`<b>${d.educacion}</b><div class="row">${sw(c)}${l}<strong>${fmt(v)}</strong></div>`, ev)).on("pointerleave", hideTip);
        if (v >= 8) svg.append("text").attr("x", x0 + (x(acc + v) - x0) / 2).attr("y", y0 + bh / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
          .style("fill", "#fff").style("font-weight", 700).style("font-size", "13px").style("pointer-events", "none").text(fmt(v));
        acc += v;
      });
    });
  }

  function renderAll() {
    renderEgreso();
    renderActividad();
    document.getElementById("nini-sexo").innerHTML = ["Mujeres", "Hombres"].map((k) => {
      const d = niniSexo.find((r) => r.sexo === k);
      const c = k === "Hombres" ? css("--s1") : css("--s2");
      return `<div class="nini-stat" style="--c:${c}"><span class="ns-v">${fmt(d.pct_nini)}</span><span class="ns-l">${k === "Mujeres" ? "de las mujeres" : "de los hombres"}</span></div>`;
    }).join("");
  }
  renderAll();
  let raf;
  addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderAll); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll);
})();
