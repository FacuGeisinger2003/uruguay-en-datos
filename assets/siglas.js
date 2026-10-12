// Siglas: la primera vez que aparece en cada capítulo lleva un asterisco; pasando el mouse (o tocando)
// cualquier sigla se ve su significado. La lista completa está en Metodología.
(function () {
  const S = {
    "OCDE": ["Organización para la Cooperación y el Desarrollo Económicos", "Agrupa a 38 países, en su mayoría de ingresos altos (como Estados Unidos, España o Japón; en la región, Chile, México, Colombia y Costa Rica). En esta página su promedio se usa como referencia de país desarrollado."],
    "INEEd": ["Instituto Nacional de Evaluación Educativa", "Organismo público uruguayo que evalúa la educación y publica sus datos."],
    "INE": ["Instituto Nacional de Estadística", "Organismo oficial que produce las estadísticas de Uruguay: pobreza, empleo, población, precios."],
    "ECH": ["Encuesta Continua de Hogares", "Encuesta que el INE hace todo el año a miles de hogares. De ella salen los datos oficiales de pobreza, empleo y educación."],
    "MIEM": ["Ministerio de Industria, Energía y Minería", "Ministerio que define la política energética del país."],
    "MSP": ["Ministerio de Salud Pública", "Registra todos los nacimientos y defunciones del país."],
    "UTU": ["Universidad del Trabajo del Uruguay", "La educación técnica y profesional pública (hoy se llama oficialmente DGETP). Es otra forma de terminar la educación media, además del liceo."],
    "PPA": ["Paridad de poder adquisitivo", "Ajuste que convierte los dólares según lo que cuestan las cosas en cada país, para que las comparaciones sean justas."],
    "PIB": ["Producto Interno Bruto", "El valor de todo lo que produce un país en un año."],
    "US$": ["Dólares estadounidenses", "En las líneas de pobreza internacionales, esos dólares están ajustados por PPA, es decir, por lo que cuestan las cosas en cada país."],
    "FMI": ["Fondo Monetario Internacional", "Organismo internacional que sigue la economía de los países. El Banco Mundial toma de él algunos datos, como la inflación."],
    "OIT": ["Organización Internacional del Trabajo", "Organismo de Naciones Unidas dedicado al empleo. Calcula tasas de desempleo comparables entre países."],
    "UNESCO": ["Organización de las Naciones Unidas para la Educación, la Ciencia y la Cultura", "Produce las estadísticas educativas que permiten comparar países."],
    "UNODC": ["Oficina de las Naciones Unidas contra la Droga y el Delito", "Reúne las cifras de homicidios de todos los países con una misma definición."],
    "WDI": ["World Development Indicators (Indicadores del Desarrollo Mundial)", "Base de datos del Banco Mundial que junta miles de indicadores de todos los países, medidos de la misma forma."],
    "WGI": ["Worldwide Governance Indicators (Indicadores Mundiales de Gobernanza)", "Medición del Banco Mundial sobre la calidad de las instituciones de cada país. Combina más de 30 encuestas y evaluaciones de organismos, ONG y empresas."],
    "ASSE": ["Administración de los Servicios de Salud del Estado", "El prestador público de salud. Atiende, entre otros, a buena parte de las personas presas."],
    "ONG": ["Organización no gubernamental", "Organización sin fines de lucro que no depende del Estado."],
    "W_ANO": ["Ponderador anual de la ECH", "Cada persona encuestada representa a muchas otras; este número dice a cuántas, para que los resultados valgan para todo el país."],
    "JSON": ["JavaScript Object Notation", "Formato de archivo de texto para guardar datos. La página lee estos archivos para dibujar los gráficos."],
    "API": ["Interfaz de programación de aplicaciones", "Una forma de pedirle datos a un sistema de manera automática, sin descargarlos a mano."],
  };
  window.SIGLAS = S;
  const keys = Object.keys(S).sort((a, b) => b.length - a.length).map((k) => k.replace(/\$/g, "\\$"));
  const RE = new RegExp(`(^|[^\\wÁÉÍÓÚáéíóúñ])(${keys.join("|")})(?![\\wÁÉÍÓÚáéíóúñ])`, "g");
  const SKIP = "script,style,svg,abbr.sigla,.sigla-notas,.sigla-nota,#glosario-siglas,.print-meta,.print-note,.topbar,h1,h2,.chapter-num,.tip,button";
  const SCOPES = "#inicio,article.chapter,#metodologia,#autor";
  const BLOCK = "p,li,dd,td,figcaption,.lede";

  function textNodes(root, skip) {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest(skip) ? NodeFilter.FILTER_REJECT : (RE.test(n.nodeValue) ? (RE.lastIndex = 0, NodeFilter.FILTER_ACCEPT) : NodeFilter.FILTER_REJECT)),
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }

  function nota(k) {
    const [nom, frase] = S[k];
    const n = document.createElement("span");
    n.className = "sigla-nota";
    n.innerHTML = `<b>* ${k}:</b> ${nom}. ${frase}`;
    return n;
  }

  // seen: siglas ya explicadas en este alcance. notes: "after" (debajo del bloque), "inside" (al final del contenedor) o false (solo tooltip)
  function annotate(root, seen, notes, container, skip = SKIP + ",[data-sigla-skip]") {
    const pend = new Map(); // bloque -> [siglas]
    textNodes(root, skip).forEach((node) => {
      const frag = document.createDocumentFragment();
      let last = 0, m, txt = node.nodeValue;
      RE.lastIndex = 0;
      while ((m = RE.exec(txt))) {
        const k = m[2], start = m.index + m[1].length;
        frag.append(txt.slice(last, start));
        const ab = document.createElement("abbr");
        ab.className = "sigla"; ab.tabIndex = 0; ab.dataset.sigla = k;
        ab.setAttribute("aria-label", `${k}: ${S[k][0]}`);
        ab.textContent = k;
        if (notes && !seen.has(k)) {
          seen.add(k);
          ab.innerHTML = `${k}<sup aria-hidden="true">*</sup>`;
          if (notes !== "link") {
            let blk;
            if (notes === "inside") blk = container;
            else {
              const b = node.parentElement.closest(BLOCK);
              // párrafos de texto: nota debajo; fuentes: nota dentro; listas, tablas y tarjetas: nota al final de la sección
              if (b && b.matches(".fuente")) blk = b;
              else if (b && b.matches("p,.lede") && !b.closest(".card,.fort-card,li,td,dd")) blk = b;
              else blk = node.parentElement.closest(".card,.fort-grid,section,header,article") || root;
              if (blk.matches(".fort-grid")) blk = blk.parentElement;
            }
            if (!pend.has(blk)) pend.set(blk, []);
            pend.get(blk).push(k);
          }
        }
        frag.append(ab);
        last = start + k.length;
      }
      frag.append(txt.slice(last));
      node.replaceWith(frag);
    });
    pend.forEach((ks, blk) => {
      const inline = blk.matches("p") || blk.matches(".fuente");
      const box = document.createElement(inline ? "span" : "div");
      box.className = "sigla-notas";
      ks.forEach((k) => box.append(nota(k)));
      if (notes === "after" && blk.matches("p,.lede") && !blk.matches(".fuente")) blk.after(box);
      else {
        const prev = blk.querySelector(":scope > .sigla-notas");
        if (prev && !inline) ks.forEach((k) => prev.append(nota(k))); else blk.append(box);
      }
    });
  }

  // glosario de siglas en Metodología (se arma solo con el diccionario)
  function glosario() {
    const host = document.getElementById("glosario-siglas");
    if (!host) return;
    host.innerHTML = Object.keys(S).sort((a, b) => a.localeCompare(b, "es")).map((k) =>
      `<div id="sg-${k.replace(/\W/g, "")}"><dt>${k}</dt><dd><b>${S[k][0]}.</b> ${S[k][1]}</dd></div>`).join("");
  }

  // contenedores que se redibujan al interactuar (comparador)
  const DYN = [[".hero-stats", false], ["#que-mide", "link"], ["#ind-source", "link"], ["#verdict", false], ["#score", false], ["#semaforo", false]];

  function run() {
    glosario();
    document.querySelectorAll(SCOPES).forEach((sc) => {
      const seen = new Set();
      // los contenedores dinámicos se manejan aparte
      const dyn = DYN.map(([s]) => sc.querySelector(s)).filter(Boolean);
      dyn.forEach((d) => d.setAttribute("data-sigla-skip", ""));
      annotate(sc, seen, "link");
    });
    DYN.forEach(([sel, mode]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const go = () => { obs.disconnect(); annotate(el, new Set(), mode, el, SKIP); obs.observe(el, { childList: true, subtree: true, characterData: true }); };
      const obs = new MutationObserver(() => requestAnimationFrame(go));
      go();
    });
  }

  // tooltip
  const tip = () => document.getElementById("tip");
  function show(ev, el) {
    const t = tip(); if (!t) return;
    const [nom, frase] = S[el.dataset.sigla];
    t.innerHTML = `<b>${el.dataset.sigla}</b><div style="margin:2px 0 4px">${nom}</div><div style="opacity:.8;max-width:260px;white-space:normal">${frase}</div>`;
    t.hidden = false;
    const r = el.getBoundingClientRect(), tr = t.getBoundingClientRect();
    let x = Math.min(innerWidth - tr.width - 8, Math.max(8, r.left));
    let y = r.bottom + 8; if (y + tr.height > innerHeight - 8) y = r.top - tr.height - 8;
    t.style.left = x + "px"; t.style.top = y + "px";
  }
  const hide = () => { const t = tip(); if (t) t.hidden = true; };
  document.addEventListener("pointerover", (e) => { const a = e.target.closest && e.target.closest("abbr.sigla"); if (a) show(e, a); });
  document.addEventListener("pointerout", (e) => { if (e.target.closest && e.target.closest("abbr.sigla")) hide(); });
  document.addEventListener("focusin", (e) => { if (e.target.matches && e.target.matches("abbr.sigla")) show(e, e.target); });
  document.addEventListener("focusout", hide);
  document.addEventListener("click", (e) => { const a = e.target.closest && e.target.closest("abbr.sigla"); if (a) { e.stopPropagation(); show(e, a); } }, true);

  // esperar a que las fuentes y los textos dinámicos estén dibujados
  let tries = 0;
  const start = () => (window.FUENTES || tries++ > 30 ? setTimeout(run, 300) : setTimeout(start, 100));
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
