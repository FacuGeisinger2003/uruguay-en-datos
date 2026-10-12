// 01 · Pobreza infantil — de 100 personas de cada tramo de edad, cuántas viven en hogares pobres (INE, ECH 2025)
(async function () {
  const tramos = await d3.json("data/pobreza/pobreza_por_tramo.json");
  const ANIO = 2025;
  const TRAMO_LABEL = { "0-5": "0 a 5 años", "6-12": "6 a 12 años", "13-17": "13 a 17 años", "18-64": "18 a 64 años", "65+": "65 años o más" };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = (v) => v.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  const state = { tramo: "0-5" };
  const fila = (t) => tramos.find((r) => r.anio === ANIO && r.tramo === t);

  // ---------- selector de tramo ----------
  const el = document.getElementById("tramo-seg");
  Object.keys(TRAMO_LABEL).forEach((k) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "radio"); b.textContent = k;
    b.setAttribute("aria-checked", String(k === state.tramo));
    b.onclick = () => {
      state.tramo = k;
      el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", "false"));
      b.setAttribute("aria-checked", "true");
      render();
    };
    el.appendChild(b);
  });

  // ---------- grilla de 100 ----------
  const svg = d3.select("#dots").attr("viewBox", "0 0 400 400");
  const dots = svg.selectAll("circle").data(d3.range(100)).join("circle")
    .attr("cx", (i) => (i % 10) * 40 + 20).attr("cy", (i) => Math.floor(i / 10) * 40 + 20).attr("r", 14);

  function render() {
    const row = fila(state.tramo), n = Math.round(row.pct_pobreza);
    const adultos = state.tramo === "18-64" || state.tramo === "65+";
    document.getElementById("hero-num").textContent = n;
    document.getElementById("hero-tramo").textContent = adultos ? "personas de " + TRAMO_LABEL[state.tramo] : TRAMO_LABEL[state.tramo];
    document.getElementById("pobreza-title").firstChild.textContent = adultos ? "De 100 " : "De 100 niños de ";
    dots.attr("fill", (i) => (i < n ? css("--pobre") : css("--no-pobre")));
    svg.attr("aria-label", `${n} de cada 100 personas de ${TRAMO_LABEL[state.tramo]} viven en hogares pobres (${ANIO}). Valor exacto: ${fmt(row.pct_pobreza)}.`);
  }
  document.getElementById("ratio").textContent = Math.round(fila("0-5").pct_pobreza / fila("65+").pct_pobreza);
  render();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
})();
