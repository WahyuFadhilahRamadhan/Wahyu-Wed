(function () {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let partLabels = [];
  let opLabels = [];
  let numTrials = 3;

  const el = {
    numParts: $("#numParts"),
    numOperators: $("#numOperators"),
    numTrials: $("#numTrials"),
    multiplier: $("#multiplier"),
    tolerance: $("#tolerance"),
    methodSelect: $("#methodSelect"),
    btnGenerate: $("#btnGenerate"),
    btnSample: $("#btnSample"),
    inputCard: $("#input-card"),
    dataGrid: $("#dataGrid"),
    btnCompute: $("#btnCompute"),
    btnTemplate: $("#btnTemplate"),
    csvFile: $("#csvFile"),
    csvStatus: $("#csvStatus"),
    inputWarnings: $("#inputWarnings"),
    resultsCard: $("#results-card"),
    resultAnova: $("#resultAnova"),
    resultAverageRange: $("#resultAverageRange"),
  };

  /* ---------------- Tabs (input method + result method) ---------------- */
  $$(".tabs").forEach((tabs) => {
    $$(".tab", tabs).forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab", tabs).forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        if (tab.dataset.tab) {
          $$(".tab-panel").forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
        }
        if (tab.dataset.result) {
          el.resultAnova.hidden = tab.dataset.result !== "anova";
          el.resultAverageRange.hidden = tab.dataset.result !== "average-range";
        }
      });
    });
  });

  /* ---------------- Grid generation ---------------- */
  function buildGrid(parts, operators, trials) {
    partLabels = Array.from({ length: parts }, (_, i) => `Part ${i + 1}`);
    opLabels = Array.from({ length: operators }, (_, j) => `Operator ${j + 1}`);
    numTrials = trials;
    renderGrid(Array.from({ length: parts }, () => Array.from({ length: operators }, () => Array(trials).fill(""))));
  }

  function renderGrid(values) {
    const parts = partLabels.length;
    const operators = opLabels.length;
    const table = el.dataGrid;
    table.innerHTML = "";

    const theadOp = document.createElement("tr");
    theadOp.appendChild(document.createElement("th"));
    opLabels.forEach((label, j) => {
      const th = document.createElement("th");
      th.colSpan = numTrials;
      const input = document.createElement("input");
      input.type = "text";
      input.value = label;
      input.addEventListener("change", () => (opLabels[j] = input.value || `Operator ${j + 1}`));
      th.appendChild(input);
      theadOp.appendChild(th);
    });
    table.appendChild(theadOp);

    const theadTrial = document.createElement("tr");
    theadTrial.appendChild(document.createElement("th"));
    opLabels.forEach(() => {
      for (let k = 0; k < numTrials; k++) {
        const th = document.createElement("th");
        th.textContent = `Trial ${k + 1}`;
        theadTrial.appendChild(th);
      }
    });
    table.appendChild(theadTrial);

    for (let i = 0; i < parts; i++) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      const partInput = document.createElement("input");
      partInput.type = "text";
      partInput.value = partLabels[i];
      partInput.addEventListener("change", () => (partLabels[i] = partInput.value || `Part ${i + 1}`));
      th.appendChild(partInput);
      tr.appendChild(th);

      for (let j = 0; j < operators; j++) {
        for (let k = 0; k < numTrials; k++) {
          const td = document.createElement("td");
          const input = document.createElement("input");
          input.type = "number";
          input.step = "any";
          input.dataset.part = i;
          input.dataset.op = j;
          input.dataset.trial = k;
          input.value = values[i]?.[j]?.[k] ?? "";
          td.appendChild(input);
          tr.appendChild(td);
        }
      }
      table.appendChild(tr);
    }
  }

  function collectGridData() {
    const parts = partLabels.length;
    const operators = opLabels.length;
    const data = Array.from({ length: parts }, () => Array.from({ length: operators }, () => Array(numTrials).fill(null)));
    let missing = 0;
    $$("input[data-part]", el.dataGrid).forEach((input) => {
      const i = Number(input.dataset.part);
      const j = Number(input.dataset.op);
      const k = Number(input.dataset.trial);
      const v = parseFloat(input.value);
      if (Number.isNaN(v)) missing++;
      data[i][j][k] = Number.isNaN(v) ? null : v;
    });
    return { data, missing };
  }

  el.btnGenerate.addEventListener("click", () => {
    const parts = Math.max(2, Math.min(15, Number(el.numParts.value) || 10));
    const operators = Math.max(2, Math.min(10, Number(el.numOperators.value) || 3));
    const trials = Number(el.numTrials.value) || 3;
    el.numParts.value = parts;
    el.numOperators.value = operators;
    buildGrid(parts, operators, trials);
    el.inputCard.hidden = false;
    el.resultsCard.hidden = true;
    el.inputCard.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------------- Sample / dummy data ---------------- */
  function seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  el.btnSample.addEventListener("click", () => {
    const parts = 10, operators = 3, trials = 3;
    el.numParts.value = parts;
    el.numOperators.value = operators;
    el.numTrials.value = String(trials);
    buildGrid(parts, operators, trials);

    const partTrue = [10.2, 12.5, 14.8, 17.1, 19.6, 21.9, 24.3, 26.8, 29.0, 31.4];
    const opBias = [0, 0.45, -0.3];
    const rand = seededRandom(42);
    const values = [];
    for (let i = 0; i < parts; i++) {
      const row = [];
      for (let j = 0; j < operators; j++) {
        const trialsArr = [];
        for (let k = 0; k < trials; k++) {
          const noise = (rand() - 0.5) * 0.5;
          trialsArr.push(Number((partTrue[i] + opBias[j] + noise).toFixed(3)));
        }
        row.push(trialsArr);
      }
      values.push(row);
    }
    renderGrid(values);

    el.inputCard.hidden = false;
    el.csvStatus.textContent = "";
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = "Ini data dummy untuk uji coba tampilan — bukan data pengukuran nyata.";
    el.inputCard.insertBefore(note, el.inputCard.children[el.inputCard.children.length - 1]);
    el.inputCard.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------------- CSV ---------------- */
  el.btnTemplate.addEventListener("click", () => {
    const parts = 10, operators = 3, trials = 3;
    let csv = "Part,Operator,Trial,Value\n";
    for (let i = 1; i <= parts; i++)
      for (let j = 1; j <= operators; j++)
        for (let k = 1; k <= trials; k++) csv += `Part ${i},Operator ${j},${k},\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "template-gage-rr.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length);
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = { part: header.indexOf("part"), operator: header.indexOf("operator"), trial: header.indexOf("trial"), value: header.indexOf("value") };
    if (Object.values(idx).some((v) => v === -1)) {
      throw new Error("Header CSV harus berisi kolom: Part,Operator,Trial,Value");
    }
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const value = parseFloat(cols[idx.value]);
      if (!cols[idx.part] || !cols[idx.operator] || !cols[idx.trial] || Number.isNaN(value)) continue;
      rows.push({ part: cols[idx.part].trim(), operator: cols[idx.operator].trim(), trial: cols[idx.trial].trim(), value });
    }
    if (!rows.length) throw new Error("Tidak ada baris data valid ditemukan di CSV.");

    const parts = [...new Set(rows.map((r) => r.part))];
    const operators = [...new Set(rows.map((r) => r.operator))];
    const trials = [...new Set(rows.map((r) => r.trial))].sort();

    const data = parts.map(() => operators.map(() => Array(trials.length).fill(null)));
    rows.forEach((r) => {
      const i = parts.indexOf(r.part);
      const j = operators.indexOf(r.operator);
      const k = trials.indexOf(r.trial);
      data[i][j][k] = r.value;
    });

    return { data, parts, operators, trials: trials.length };
  }

  el.csvFile.addEventListener("change", async () => {
    const file = el.csvFile.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      partLabels = parsed.parts;
      opLabels = parsed.operators;
      numTrials = parsed.trials;
      el.numParts.value = partLabels.length;
      el.numOperators.value = opLabels.length;
      if (numTrials === 2 || numTrials === 3) el.numTrials.value = String(numTrials);
      renderGrid(parsed.data);
      el.inputCard.hidden = false;
      const missingCells = parsed.data.flat(2).filter((v) => v === null).length;
      el.csvStatus.textContent = `Berhasil memuat ${partLabels.length} part × ${opLabels.length} operator × ${numTrials} trial dari "${file.name}".` + (missingCells ? ` ${missingCells} sel kosong — lengkapi di tabel manual sebelum menghitung.` : "");
    } catch (err) {
      el.csvStatus.textContent = `Gagal membaca CSV: ${err.message}`;
    }
  });

  /* ---------------- Compute & render results ---------------- */
  el.btnCompute.addEventListener("click", () => {
    const { data, missing } = collectGridData();
    el.inputWarnings.hidden = true;
    el.inputWarnings.innerHTML = "";

    if (missing > 0) {
      el.inputWarnings.hidden = false;
      el.inputWarnings.textContent = `Ada ${missing} sel yang belum diisi. Lengkapi seluruh sel sebelum menghitung.`;
      return;
    }

    const multiplier = Number(el.multiplier.value);
    const method = el.methodSelect.value;
    const tolerance = parseFloat(el.tolerance.value);
    const results = {};
    const errors = [];

    if (method === "anova" || method === "both") {
      try {
        results.anova = window.GageRR.computeANOVA(data, { multiplier, poolMode: "auto" });
      } catch (e) {
        errors.push(`ANOVA: ${e.message}`);
      }
    }
    if (method === "average-range" || method === "both") {
      try {
        results.averageRange = window.GageRR.computeAverageRange(data, { multiplier });
      } catch (e) {
        errors.push(`Average & Range: ${e.message}`);
      }
    }

    if (errors.length) {
      el.inputWarnings.hidden = false;
      el.inputWarnings.innerHTML = `<strong>Tidak dapat menghitung:</strong><ul>${errors.map((e) => `<li>${e}</li>`).join("")}</ul>`;
    }

    el.resultAnova.innerHTML = "";
    el.resultAverageRange.innerHTML = "";
    const tabAnova = $('[data-result="anova"]');
    const tabAvgRange = $('[data-result="average-range"]');
    $("#resultTabs").hidden = !(results.anova && results.averageRange);

    if (results.anova) renderResult(el.resultAnova, results.anova, tolerance, "ANOVA");
    if (results.averageRange) renderResult(el.resultAverageRange, results.averageRange, tolerance, "Average & Range");

    tabAnova.hidden = !results.anova;
    tabAvgRange.hidden = !results.averageRange;

    const showAnovaFirst = Boolean(results.anova);
    el.resultAnova.hidden = !showAnovaFirst;
    el.resultAverageRange.hidden = showAnovaFirst;
    tabAnova.classList.toggle("active", showAnovaFirst);
    tabAvgRange.classList.toggle("active", !showAnovaFirst);

    if (results.anova || results.averageRange) {
      el.resultsCard.hidden = false;
      el.resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  function fmt(n, digits = 3) {
    return Number.isFinite(n) ? n.toFixed(digits) : "—";
  }

  function renderResult(container, r, tolerance, label) {
    const verdict = window.GageRR.verdictFor(r.pctGRR);
    const verdictClass = `verdict-${verdict.level}`;

    const summary = document.createElement("div");
    summary.className = "summary-row";
    const tiles = [
      { label: "%GRR (terhadap Total Variation)", value: `${fmt(r.pctGRR, 2)}%` },
      { label: "ndc (kategori berbeda)", value: r.ndc },
      { label: "EV (repeatability)", value: fmt(r.EV) },
      { label: "AV (reproducibility)", value: fmt(r.AV) },
      { label: "PV (part-to-part)", value: fmt(r.PV) },
    ];
    if (Number.isFinite(tolerance) && tolerance > 0) {
      tiles.push({ label: "%GRR terhadap Toleransi", value: `${fmt((100 * r.GRR) / tolerance, 2)}%` });
    }
    tiles.forEach((t) => {
      const tile = document.createElement("div");
      tile.className = "stat-tile";
      tile.innerHTML = `<p class="label">${t.label}</p><p class="value">${t.value}</p>`;
      summary.appendChild(tile);
    });
    container.appendChild(summary);

    const verdictP = document.createElement("p");
    verdictP.innerHTML = `Sistem pengukuran (${label}): <span class="verdict-badge ${verdictClass}">${verdict.label}</span>` +
      (r.method === "anova" ? ` <span class="hint" style="display:inline">— model ${r.pooled ? "reduced (interaksi dipool)" : "full (interaksi signifikan)"}.</span>` : "");
    container.appendChild(verdictP);

    if (r.warnings && r.warnings.length) {
      const w = document.createElement("div");
      w.className = "warnings";
      w.innerHTML = `<strong>Perhatian:</strong><ul>${r.warnings.map((x) => `<li>${x}</li>`).join("")}</ul>`;
      container.appendChild(w);
    }

    const chartWrap = document.createElement("div");
    chartWrap.className = "chart-wrap";
    const components = [
      { name: "Repeatability (EV)", value: r.pctEV, color: "var(--series-1)" },
      { name: "Reproducibility (AV)", value: r.pctAV, color: "var(--series-2)" },
      { name: "Part-to-part (PV)", value: r.pctPV, color: "var(--series-3)" },
    ];
    const maxVal = Math.max(100, ...components.map((c) => c.value));
    components.forEach((c) => {
      const row = document.createElement("div");
      row.className = "chart-row";
      const pct = Math.min(100, (c.value / maxVal) * 100);
      row.innerHTML = `
        <div class="chart-label">${c.name}</div>
        <div class="chart-track"><div class="chart-fill" style="width:${pct}%;background:${c.color}"></div></div>
        <div class="chart-value">${fmt(c.value, 1)}%</div>`;
      chartWrap.appendChild(row);
    });
    container.appendChild(chartWrap);

    const tableWrap = document.createElement("div");
    tableWrap.className = "result-table-wrap";
    if (r.method === "anova") {
      tableWrap.innerHTML = `
        <table>
          <caption>Tabel ANOVA</caption>
          <thead><tr><th>Sumber</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>p</th><th>Var. Komponen</th></tr></thead>
          <tbody>
            ${r.table.map((row) => `<tr>
              <td>${row.source}</td>
              <td>${fmt(row.ss)}</td>
              <td>${row.df}</td>
              <td>${row.ms != null ? fmt(row.ms) : "—"}</td>
              <td>${row.f != null ? fmt(row.f) : "—"}</td>
              <td>${row.pValue != null ? fmt(row.pValue, 4) : "—"}</td>
              <td>${row.varComp != null ? fmt(row.varComp, 5) : "—"}</td>
            </tr>`).join("")}
          </tbody>
        </table>`;
    } else {
      tableWrap.innerHTML = `
        <table>
          <caption>Ringkasan Average &amp; Range</caption>
          <thead><tr><th>Komponen</th><th>Nilai</th><th>% terhadap TV</th></tr></thead>
          <tbody>
            <tr><td>EV (repeatability)</td><td>${fmt(r.EV)}</td><td>${fmt(r.pctEV, 2)}%</td></tr>
            <tr><td>AV (reproducibility)</td><td>${fmt(r.AV)}</td><td>${fmt(r.pctAV, 2)}%</td></tr>
            <tr><td>GRR</td><td>${fmt(r.GRR)}</td><td>${fmt(r.pctGRR, 2)}%</td></tr>
            <tr><td>PV (part-to-part)</td><td>${fmt(r.PV)}</td><td>${fmt(r.pctPV, 2)}%</td></tr>
            <tr><td>TV (total variation)</td><td>${fmt(r.TV)}</td><td>100%</td></tr>
          </tbody>
        </table>`;
    }
    container.appendChild(tableWrap);
  }

  // Show an initial empty grid matching the default setup values, so the
  // input section (including the CSV-upload tab) is usable immediately.
  buildGrid(Number(el.numParts.value), Number(el.numOperators.value), Number(el.numTrials.value));
})();
