/**
 * Gage R&R statistics core.
 * Formulas follow AIAG MSA (Measurement Systems Analysis) 4th ed. conventions:
 * Average & Range method (d2 / d2* control-chart constants) and the
 * ANOVA (crossed, 2-factor with interaction) method with the standard
 * p > 0.25 interaction-pooling rule.
 *
 * Data shape: data[partIdx][opIdx] = [trial1, trial2, ...]
 */

// d2 control-chart constant, subgroup size = number of trials (repeatability ranges).
const D2_TRIALS = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326 };
// D4 (UCL factor for ranges) for the same subgroup sizes, used for the R-chart sanity check.
const D4_TRIALS = { 2: 3.267, 3: 2.575, 4: 2.282, 5: 2.114 };

// d2*(m, g=1): AIAG Table of d2* values for a single range of m items
// (operator averages or part averages). Reciprocal is K2 / K3.
const D2STAR_M = {
  2: 1.41, 3: 1.91, 4: 2.24, 5: 2.48, 6: 2.67, 7: 2.83, 8: 2.96, 9: 3.08,
  10: 3.18, 11: 3.27, 12: 3.35, 13: 3.42, 14: 3.49, 15: 3.55,
};

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function flatten(data) {
  const out = [];
  for (const part of data) for (const op of part) for (const v of op) out.push(v);
  return out;
}

/** Average & Range (classic AIAG) method. Requires 2 or 3 trials. */
function computeAverageRange(data, { multiplier = 5.15 } = {}) {
  const p = data.length;
  const o = data[0].length;
  const r = data[0][0].length;
  const warnings = [];

  if (!D2_TRIALS[r]) {
    throw new Error(
      `Metode Average & Range hanya mendukung 2-5 trial (dapat ${r}). Gunakan metode ANOVA untuk konfigurasi ini.`
    );
  }
  if (!D2STAR_M[o]) throw new Error(`Jumlah operator (${o}) di luar rentang tabel konstanta (2-15).`);
  if (!D2STAR_M[p]) throw new Error(`Jumlah part (${p}) di luar rentang tabel konstanta (2-15).`);

  // Repeatability (EV) from ranges of trials, within each part x operator cell.
  const rangesByOp = [];
  for (let j = 0; j < o; j++) {
    const ranges = [];
    for (let i = 0; i < p; i++) {
      const trials = data[i][j];
      ranges.push(Math.max(...trials) - Math.min(...trials));
    }
    rangesByOp.push(ranges);
  }
  const rBarByOp = rangesByOp.map(mean);
  const rDoubleBar = mean(rBarByOp);

  const ucl = rDoubleBar * D4_TRIALS[r];
  rangesByOp.forEach((ranges, j) => {
    ranges.forEach((rg, i) => {
      if (ucl > 0 && rg > ucl) {
        warnings.push(
          `Range part ${i + 1} / operator ${j + 1} (${rg.toFixed(4)}) melebihi UCL R-chart (${ucl.toFixed(4)}) — cek konsistensi operator tersebut.`
        );
      }
    });
  });

  const sigmaRepeat = rDoubleBar / D2_TRIALS[r];
  const EV = multiplier * sigmaRepeat;

  // Reproducibility (AV) from the range of operator averages.
  const opAvg = [];
  for (let j = 0; j < o; j++) {
    const vals = [];
    for (let i = 0; i < p; i++) vals.push(...data[i][j]);
    opAvg.push(mean(vals));
  }
  const xDiff = Math.max(...opAvg) - Math.min(...opAvg);
  const sigmaOpRaw = xDiff / D2STAR_M[o];
  const AVraw = multiplier * sigmaOpRaw;
  const AVcorrection = (EV * EV) / (p * r);
  const AV = Math.sqrt(Math.max(0, AVraw * AVraw - AVcorrection));

  // Part-to-part variation (PV) from the range of part averages.
  const partAvg = [];
  for (let i = 0; i < p; i++) {
    const vals = [];
    for (let j = 0; j < o; j++) vals.push(...data[i][j]);
    partAvg.push(mean(vals));
  }
  const rp = Math.max(...partAvg) - Math.min(...partAvg);
  const sigmaPart = rp / D2STAR_M[p];
  const PV = multiplier * sigmaPart;

  const GRR = Math.sqrt(EV * EV + AV * AV);
  const TV = Math.sqrt(GRR * GRR + PV * PV);
  const ndc = Math.max(1, Math.floor(1.41 * (PV / GRR)));

  return {
    method: "average-range",
    p, o, r, multiplier,
    EV, AV, GRR, PV, TV, ndc,
    pctEV: (100 * EV) / TV, pctAV: (100 * AV) / TV,
    pctGRR: (100 * GRR) / TV, pctPV: (100 * PV) / TV,
    rDoubleBar, xDiff, rp, opAvg, partAvg,
    warnings,
  };
}

/* ---- Incomplete-beta based F-distribution p-value (Numerical-Recipes style) ---- */
function logGamma(x) {
  const cof = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < cof.length; i++) a += cof[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(x, a, b) {
  const MAXIT = 200, EPS = 3e-9, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta);
  if (x < (a + 1) / (a + b + 2)) return (front * betacf(x, a, b)) / a;
  return 1 - (front * betacf(1 - x, b, a)) / b;
}

/** Upper-tail p-value for F(d1, d2) at observed statistic f. */
function fPValue(f, d1, d2) {
  if (!isFinite(f) || f <= 0 || d1 <= 0 || d2 <= 0) return 1;
  const x = d2 / (d2 + d1 * f);
  return regularizedIncompleteBeta(x, d2 / 2, d1 / 2);
}

/** ANOVA (crossed, 2-factor with interaction) method. */
function computeANOVA(data, { multiplier = 5.15, poolMode = "auto", alpha = 0.25 } = {}) {
  const p = data.length;
  const o = data[0].length;
  const r = data[0][0].length;
  if (r < 2) throw new Error("Metode ANOVA butuh minimal 2 trial per part/operator.");

  const grand = mean(flatten(data));
  const partMean = data.map((rows) => mean(rows.flat()));
  const opMean = [];
  for (let j = 0; j < o; j++) {
    const vals = [];
    for (let i = 0; i < p; i++) vals.push(...data[i][j]);
    opMean.push(mean(vals));
  }
  const cellMean = data.map((rows) => rows.map(mean));

  let ssTotal = 0;
  for (const v of flatten(data)) ssTotal += (v - grand) ** 2;

  let ssPart = 0;
  for (let i = 0; i < p; i++) ssPart += o * r * (partMean[i] - grand) ** 2;

  let ssOperator = 0;
  for (let j = 0; j < o; j++) ssOperator += p * r * (opMean[j] - grand) ** 2;

  let ssPO = 0;
  for (let i = 0; i < p; i++)
    for (let j = 0; j < o; j++)
      ssPO += r * (cellMean[i][j] - partMean[i] - opMean[j] + grand) ** 2;

  let ssEquip = ssTotal - ssPart - ssOperator - ssPO;
  if (ssEquip < 0 && ssEquip > -1e-9) ssEquip = 0;

  const dfPart = p - 1;
  const dfOperator = o - 1;
  const dfPO = (p - 1) * (o - 1);
  const dfEquip = p * o * (r - 1);

  const msPart = ssPart / dfPart;
  const msOperator = ssOperator / dfOperator;
  const msPO = dfPO > 0 ? ssPO / dfPO : 0;
  const msEquip = ssEquip / dfEquip;

  const fPO = dfPO > 0 && msEquip > 0 ? msPO / msEquip : 0;
  const pPO = dfPO > 0 ? fPValue(fPO, dfPO, dfEquip) : 1;

  let pooled;
  if (poolMode === "full") pooled = false;
  else if (poolMode === "reduced") pooled = true;
  else pooled = dfPO > 0 ? pPO > alpha : true;

  let varRepeat, varOperator, varInteraction, varPart, msEquipUsed, dfEquipUsed;
  if (pooled) {
    const ssEquipR = ssEquip + ssPO;
    const dfEquipR = dfEquip + dfPO;
    msEquipUsed = ssEquipR / dfEquipR;
    dfEquipUsed = dfEquipR;
    varRepeat = msEquipUsed;
    varInteraction = 0;
    varOperator = Math.max(0, (msOperator - msEquipUsed) / (p * r));
    varPart = Math.max(0, (msPart - msEquipUsed) / (o * r));
  } else {
    msEquipUsed = msEquip;
    dfEquipUsed = dfEquip;
    varRepeat = msEquip;
    varInteraction = Math.max(0, (msPO - msEquip) / r);
    varOperator = Math.max(0, (msOperator - msPO) / (p * r));
    varPart = Math.max(0, (msPart - msPO) / (o * r));
  }
  const varReproducibility = varOperator + varInteraction;

  const EV = multiplier * Math.sqrt(varRepeat);
  const AV = multiplier * Math.sqrt(varReproducibility);
  const GRR = multiplier * Math.sqrt(varRepeat + varReproducibility);
  const PV = multiplier * Math.sqrt(varPart);
  const TV = Math.sqrt(GRR * GRR + PV * PV);
  const ndc = Math.max(1, Math.floor(1.41 * (PV / GRR)));

  const varTotal = varRepeat + varReproducibility + varPart;

  const fOperatorDenomMS = pooled ? msEquipUsed : msPO || msEquipUsed;
  const fOperator = fOperatorDenomMS > 0 ? msOperator / fOperatorDenomMS : 0;
  const fOperatorDf2 = pooled ? dfEquipUsed : dfPO;
  const pOperator = fOperatorDf2 > 0 ? fPValue(fOperator, dfOperator, fOperatorDf2) : 1;

  const fPart = fOperatorDenomMS > 0 ? msPart / fOperatorDenomMS : 0;
  const pPart = fOperatorDf2 > 0 ? fPValue(fPart, dfPart, fOperatorDf2) : 1;

  const table = [
    { source: "Operator", ss: ssOperator, df: dfOperator, ms: msOperator, f: fOperator, pValue: pOperator, varComp: varOperator },
    { source: "Part", ss: ssPart, df: dfPart, ms: msPart, f: fPart, pValue: pPart, varComp: varPart },
    { source: "Operator × Part", ss: ssPO, df: dfPO, ms: msPO, f: dfPO > 0 ? fPO : null, pValue: dfPO > 0 ? pPO : null, varComp: varInteraction, pooled },
    { source: "Peralatan (repeatability)", ss: pooled ? ssEquip + ssPO : ssEquip, df: dfEquipUsed, ms: msEquipUsed, f: null, pValue: null, varComp: varRepeat },
    { source: "Total", ss: ssTotal, df: p * o * r - 1, ms: null, f: null, pValue: null, varComp: varTotal },
  ];

  return {
    method: "anova",
    p, o, r, multiplier, pooled,
    EV, AV, GRR, PV, TV, ndc,
    pctEV: (100 * EV) / TV, pctAV: (100 * AV) / TV,
    pctGRR: (100 * GRR) / TV, pctPV: (100 * PV) / TV,
    pctContribRepeat: (100 * varRepeat) / varTotal,
    pctContribReproduce: (100 * varReproducibility) / varTotal,
    pctContribPart: (100 * varPart) / varTotal,
    table,
    warnings: [],
  };
}

function verdictFor(pctGRR) {
  if (pctGRR < 10) return { level: "good", label: "Diterima (Acceptable)" };
  if (pctGRR <= 30) return { level: "warning", label: "Bersyarat (Conditional)" };
  return { level: "critical", label: "Ditolak (Unacceptable)" };
}

window.GageRR = { computeAverageRange, computeANOVA, verdictFor, D2STAR_M, D2_TRIALS };
