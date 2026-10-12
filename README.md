# Uruguay en datos · El relato de la estabilidad

**Por qué estar "mejor que el resto" no es estar bien.** Investigación personal con datos públicos sobre pobreza infantil, educación, seguridad, natalidad, la comparación de Uruguay con la región y lo que sí funciona. Los datos se procesan en Databricks y se muestran en una web interactiva.

🔗 **Sitio:** [datos-criticos-uy.vercel.app](https://datos-criticos-uy.vercel.app/)

![Portada del sitio](docs/portada_2.png)

---

## Hallazgos principales

| Tema | Dato | Fuente |
|---|---|---|
| Pobreza infantil | **29,1%** de los niños de 0 a 5 años vive en hogares pobres, contra **6,0%** de los mayores de 65 (2025) | INE, ECH 2025 |
| Educación y jóvenes | Solo el **53,2%** de los jóvenes de 21 a 23 años terminó la educación media superior (2024), y el desempleo juvenil (**25,2%**) es el más alto de 12 países de la región | INE, ECH 2024; Banco Mundial |
| Homicidios | Los homicidios por conflictos entre criminales pasaron de **77** (2013) a **215** (2025) | Ministerio del Interior |
| Cárceles | La población presa pasó de **6.757** (2003) a **16.107** (2024) | Ministerio del Interior |
| Costo de las cárceles | Cada persona presa cuesta unos **$ 31.000 por mes** (2024), 1,4 salarios mínimos | Ministerio del Interior (ejecución presupuestal) |
| Natalidad | Los nacimientos cayeron **39%** entre 2015 y 2024 | MSP |
| Lo que sí funciona | Uruguay es **1º de 12** (10 de Sudamérica, Costa Rica y México) en control de la corrupción, estado de derecho, libertades, estabilidad política, electricidad renovable sin hidro (**51%**, OCDE 17%) e internet fijo | Banco Mundial (WGI y WDI) |
| Región | Uruguay tiene el desempleo juvenil más alto (**25,2%**) y la menor proporción de adultos con secundaria completa (**35%**) entre 12 países comparados (10 de Sudamérica, Costa Rica y México) | Banco Mundial |

## Estructura del repositorio

```
uruguay-en-datos/
├── index.html              # sitio web (estático)
├── assets/                 # JS (D3.js), CSS
├── data/                   # tablas gold exportadas a JSON, una carpeta por tema
│   ├── fuentes.json             # fuente de cada gráfico
│   ├── pobreza/
│   ├── educacion/
│   ├── seguridad/               # homicidios, población presa y gasto en cárceles
│   ├── demografia/
│   ├── region/
│   └── fortalezas/
├── notebooks/              # pipeline en Databricks (uno por capítulo)
│   ├── 00_setup                 # schema y volume en Unity Catalog
│   ├── 01_pobreza               # ECH: pobreza por edad y departamento
│   ├── 02_educacion             # ECH: egreso, ni estudian ni trabajan, desempleo
│   ├── 03_seguridad             # Ministerio del Interior: homicidios, cárceles y su gasto
│   ├── 04_demografia            # MSP: nacimientos
│   ├── 05_comparacion_regional  # Banco Mundial: 9 indicadores, 12 países
│   └── 06_fortalezas            # Banco Mundial: instituciones (WGI), energía e internet
└── docs/                   # capturas
```

## Metodología

Cada notebook sigue la **arquitectura medallion**:

1. **Bronze:** el dato crudo, tal como viene de la fuente oficial.
2. **Silver:** selección de variables, limpieza y unión de años.
3. **Gold:** indicadores finales (tasas ponderadas, conteos, rankings), exportados a `data/<tema>/*.json`.

La web lee esos JSON y los dibuja con D3.js. Debajo de cada gráfico aparece su fuente con un link al dataset original.

**Decisiones importantes**

- Las tasas que salen de la ECH están ponderadas con `W_ANO` (ponderador anual).
- Pobreza: variable `pobre17` (metodología INE 2017).
- Egreso de media superior: bachillerato completo en liceo (`e201_1c`) o UTU (`e201_1d`), o estudios terciarios. **Validación:** a los 21-23 años da 53,2% en 2024, contra 51,6% publicado por el INEEd para 2023.
- Comparación regional: todos los países salen de la misma fuente (Banco Mundial), para que las definiciones coincidan.

**Limitaciones**

- La ECH 2025 es el primer año con el nuevo diseño de la encuesta (implantación), así que la web usa 2025 sin compararlo con años anteriores.
- Nacimientos: no hay un dataset abierto actualizado del MSP, así que las cifras se transcribieron de su informe oficial, con la fuente en cada fila.
- Gasto en cárceles: el Ministerio del Interior publica la ejecución por programa solo como tabla web (2023 y 2024), así que se transcribió. Es el gasto del programa 461 (*Gestión de la privación de libertad*); costos registrados en otros organismos, como la salud a cargo de ASSE, no están incluidos.

## Fuentes

- **INE:** [Encuesta Continua de Hogares 2024, microdatos](https://www.gub.uy/instituto-nacional-estadistica/comunicacion/publicaciones/microdatos-encuesta-continua-hogares-ech-2024)
- **Ministerio del Interior:** [Delitos denunciados / homicidios](https://catalogodatos.gub.uy/dataset/ministerio-del-interior-delitos_denunciados_en_el_uruguay), [Sistema carcelario](https://catalogodatos.gub.uy/dataset/ministerio-del-interior-sistema-carcelario) y [ejecución presupuestal por programa](https://www.gub.uy/ministerio-interior/institucional/informacion-gestion/presupuesto/ejecucion-presupuestal-del-ministerio-del-interior)
- **MSP:** [Natalidad y mortalidad infantil 2023, informe preliminar](https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/documentos/publicaciones/Informe%20DIGESA_N%20y%20M%202023_final%20al%2020_03_2024_0.pdf)
- **INEEd:** [Mirador Educativo](https://mirador.ineed.edu.uy/)
- **Banco Mundial:** [World Development Indicators](https://data.worldbank.org/) y [Worldwide Governance Indicators](https://www.worldbank.org/en/publication/worldwide-governance-indicators)

## Cómo reproducirlo

1. Crear una cuenta en [Databricks Free Edition](https://www.databricks.com/learn/free-edition) y conectar este repo como Git folder.
2. Correr `notebooks/00_setup`.
3. Descargar los microdatos de la ECH 2024 y 2025 del INE y subirlos al volume `raw`. Los demás notebooks descargan sus datos solos.
4. Correr los notebooks en orden. Cada uno exporta sus JSON a su carpeta dentro de `data/`.
5. Servir el sitio localmente: `python3 -m http.server` en la raíz del repo y abrir `http://localhost:8000`.

## Stack

Databricks (PySpark, Delta Lake, Unity Catalog) · D3.js · HTML/CSS · Vercel

## Uso de inteligencia artificial

- **Desarrollo:** el código de la web, los gráficos y el procesamiento de los datos se hicieron con **Claude (Anthropic)**.
- **Revisión cruzada:** las decisiones de modelado, la selección de indicadores y el diseño se contrastaron con **ChatGPT (OpenAI)** y **Gemini (Google)**, comparando sus recomendaciones y críticas antes de definir cada criterio.
- **Autoría y control:** la elección de los temas, el enfoque y las conclusiones son míos; la redacción la trabajé junto a la IA, y cada dato está verificado contra su fuente oficial.

## Autor

**Facundo Geisinger**, estudiante de Ciencia de Datos (Universidad de Montevideo). [GitHub](https://github.com/FacuGeisinger2003)

## Licencia

El código está bajo licencia [MIT](LICENSE). Los datos pertenecen a sus fuentes oficiales y se usan según sus términos de publicación.
