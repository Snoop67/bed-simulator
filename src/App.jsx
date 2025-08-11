import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "./index.css";

/**
 * App.jsx
 * Version consolidée : calcul BED/EQD2 + modèles avec tooltips + bouton "Calculer le champ manquant"
 * - Blocage doses < 1.8 Gy pour autorisée/utilisée (case alignée)
 * - Sauvegarde / historique / export PDF
 */

const OAR_ALPHA = {
  "": "",
  "Moelle épinière": 2,
  "Tronc cérébral": 2,
  "Nerf optique": 2,
  "Chiasma optique": 2,
  "Rétine": 2,
  "Cristallin": 1.5,
  "Cervelet": 2,
  "Cerveau (parenchyme)": 2,
  "Hippocampe": 2,
  "Glande parotide": 3,
  "Glande sous-maxillaire": 3,
  "Muqueuse orale": 10,
  "Larynx (cartilage)": 3,
  "Larynx (muqueuse)": 10,
  "Œsophage (tardif)": 3,
  "Poumon (tissu normal)": 3,
  "Cœur": 3,
  "Péricarde": 3,
  "Foie": 2.75,
  "Reins": 1.5,
  "Vessie": 3,
  "Rectum": 3,
  "Intestin grêle": 3,
  "Côlon": 3,
  "Peau (réactions tardives)": 3,
  "Peau (réactions aiguës)": 10,
  "Os cortical": 2,
  "Tête fémorale": 2,
  "Testicules": 2,
  "Ovaires": 3
};

const RECOVERY_MODELS = {
  paradis: {
    label: "Paradis et al. : récupération rapide",
    details:
`0–3 mois  : 0 %
4–6 mois  : 10 %
7–12 mois : 25 %
≥ 12 mois : 50 % (plateau)`
  },
  nieder: {
    label: "Nieder et al. : récupération rapide",
    details:
`0 % : 0 à 3 mois
~17 % : 4 mois
~25 % : 5 mois
~28 % : 6 mois
~33 % : 7 mois
~37 % : 8 mois
~40 % : 9 mois
~45 % : 10 mois
50 % : 11 à 12 mois et plateau`
  },
  abusaris: {
    label: "Abusaris et al. : récupération rapide",
    details:
`0 % < 6m
25 % : 6–12m
50 % : >12m`
  },
  noel: {
    label: "Noël et al. : récupération lente",
    details:
`0 % avant 1 an
5 % : 1 an
~10 % : 2 ans
~15 % : 3 ans
~20 % : 4 ans
~25 % : 5 ans
~30 % : 6 ans
~35 % : 7 ans
~40 % : 8 ans
~45 % : 9 ans
50 % : 10 ans et plateau`
  }
};

function safeNum(v) {
  if (v === "" || v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

export default function App() {
  // Step1 autorisée
  const [organ, setOrgan] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [totalAuth, setTotalAuth] = useState("");
  const [nAuth, setNAuth] = useState("");
  const [dpfAuth, setDpfAuth] = useState("");
  const [manualBedAuth, setManualBedAuth] = useState("");

  // Step2 utilisée
  const [totalUsed, setTotalUsed] = useState("");
  const [nUsed, setNUsed] = useState("");
  const [dpfUsed, setDpfUsed] = useState("");
  const [manualBedUsed, setManualBedUsed] = useState("");

  // Block <1.8
  const [blockBelow18, setBlockBelow18] = useState(false);

  // Step3 oubli / dates / model
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthsElapsed, setMonthsElapsed] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [tooltipKey, setTooltipKey] = useState(null);
  const [forgetPercent, setForgetPercent] = useState("");

  // Results
  const [bedAuth, setBedAuth] = useState("");
  const [eqd2Auth, setEqd2Auth] = useState("");
  const [physAuth, setPhysAuth] = useState("");

  const [bedUsed, setBedUsed] = useState("");
  const [eqd2Used, setEqd2Used] = useState("");
  const [physUsed, setPhysUsed] = useState("");

  const [bedRemain, setBedRemain] = useState("");
  const [eqd2Remain, setEqd2Remain] = useState("");
  const [physRemain, setPhysRemain] = useState("");

  // History
  const [titleSave, setTitleSave] = useState("");
  const [history, setHistory] = useState([]);

  // ------------------------------
  // helper : calculate missing field for Step1 (called by button)
  // ------------------------------
  function calcMissingAuth() {
    const t = safeNum(totalAuth);
    const n = safeNum(nAuth);
    const d = safeNum(dpfAuth);

    if (!isNaN(t) && !isNaN(n) && (dpfAuth === "" || dpfAuth === null)) {
      // compute dpf
      const val = t / n;
      setDpfAuth(val.toFixed(2));
      return;
    }
    if (!isNaN(t) && !isNaN(d) && (nAuth === "" || nAuth === null)) {
      const val = t / d;
      setNAuth(Math.round(val).toString());
      return;
    }
    if (!isNaN(n) && !isNaN(d) && (totalAuth === "" || totalAuth === null)) {
      const val = n * d;
      setTotalAuth(val.toFixed(2));
      return;
    }
  }

  // ------------------------------
  // Step2 calculate dose/fraction automatically if total + n provided (no button)
  // but we keep ability to edit
  // ------------------------------
  useEffect(() => {
    const t = safeNum(totalUsed);
    const n = safeNum(nUsed);
    const d = safeNum(dpfUsed);
    if (!isNaN(t) && !isNaN(n) && (dpfUsed === "" || dpfUsed === null)) {
      setDpfUsed((t / n).toFixed(2));
    }
  }, [totalUsed, nUsed]);

  // ------------------------------
  // Step1 calculations: compute BED/EQD2/Phys when user provides required values
  // - If manualBedAuth provided, use it
  // - Apply blockBelow18 when calculating (dpf floor = 1.8)
  // ------------------------------
  useEffect(() => {
    const ab = safeNum(alphaBeta);
    const dpf0 = safeNum(dpfAuth);
    let dpf = dpf0;
    const n = safeNum(nAuth);
    const total = safeNum(totalAuth);

    // if dpf missing but total and n provided, compute dpf for calculation only (do not overwrite)
    if (isNaN(dpf) && !isNaN(total) && !isNaN(n) && n !== 0) {
      dpf = total / n;
    } else if (isNaN(n) && !isNaN(total) && !isNaN(dpf) && dpf !== 0) {
      // compute n if missing
      // but do not overwrite user field here; we only want correct calculations
    }

    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) {
      dpf = 1.8;
    }

    // If manual BED provided, use it for BED auth (and compute EQD2 if ab present)
    const manualBED = safeNum(manualBedAuth);
    if (!isNaN(manualBED)) {
      setBedAuth(manualBED.toFixed(2));
      if (!isNaN(ab) && ab !== 0) {
        setEqd2Auth((manualBED / (1 + 2 / ab)).toFixed(2));
      } else {
        setEqd2Auth("");
      }
      // physical dose: if we have n and dpf (adjusted) compute dpf*n else if total given, use total
      if (!isNaN(n) && !isNaN(dpf)) {
        setPhysAuth((dpf * n).toFixed(2));
      } else if (!isNaN(total)) {
        setPhysAuth(total.toFixed(2));
      } else {
        setPhysAuth("");
      }
      return;
    }

    // calculate BED normally: BED = n * d * (1 + d/ab)
    if (!isNaN(dpf) && !isNaN(ab) && !isNaN(n) && n !== 0) {
      const bed = n * dpf * (1 + dpf / ab);
      setBedAuth(bed.toFixed(2));
      const eqd2 = bed / (1 + 2 / ab);
      setEqd2Auth(eqd2.toFixed(2));
      setPhysAuth((dpf * n).toFixed(2));
    } else if (!isNaN(total) && !isNaN(dpf) && !isNaN(ab)) {
      // If user provided total and dpf: derive n = total/dpf (rounded) and calculate using that n
      if (dpf !== 0) {
        const ncalc = total / dpf;
        const bed = ncalc * dpf * (1 + dpf / ab);
        setBedAuth(bed.toFixed(2));
        const eqd2 = bed / (1 + 2 / ab);
        setEqd2Auth(eqd2.toFixed(2));
        setPhysAuth(total.toFixed(2));
      }
    } else {
      setBedAuth("");
      setEqd2Auth("");
      setPhysAuth("");
    }
  }, [totalAuth, nAuth, dpfAuth, alphaBeta, manualBedAuth, blockBelow18]);

  // ------------------------------
  // Step2 calculations for used BED/EQD2/phys
  // uses alphaBeta from Step1 (global)
  // ------------------------------
  useEffect(() => {
    const ab = safeNum(alphaBeta);
    let dpf = safeNum(dpfUsed);
    const n = safeNum(nUsed);
    const total = safeNum(totalUsed);

    // if dpf missing but total and n provided, compute for calculation
    if (isNaN(dpf) && !isNaN(total) && !isNaN(n) && n !== 0) {
      dpf = total / n;
      // we set but do not overwrite field (we already fill it via other effect)
    }

    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) {
      dpf = 1.8;
    }

    const manualUsed = safeNum(manualBedUsed);
    if (!isNaN(manualUsed)) {
      setBedUsed(manualUsed.toFixed(2));
      if (!isNaN(ab) && ab !== 0) setEqd2Used((manualUsed / (1 + 2 / ab)).toFixed(2));
      if (!isNaN(n) && !isNaN(dpf)) setPhysUsed((dpf * n).toFixed(2));
      else if (!isNaN(total)) setPhysUsed(total.toFixed(2));
      else setPhysUsed("");
      return;
    }

    if (!isNaN(dpf) && !isNaN(n) && !isNaN(ab) && n !== 0) {
      const bed = n * dpf * (1 + dpf / ab);
      setBedUsed(bed.toFixed(2));
      setEqd2Used((bed / (1 + 2 / ab)).toFixed(2));
      setPhysUsed((dpf * n).toFixed(2));
    } else if (!isNaN(total) && !isNaN(dpf) && !isNaN(ab) && dpf !== 0) {
      const ncalc = total / dpf;
      const bed = ncalc * dpf * (1 + dpf / ab);
      setBedUsed(bed.toFixed(2));
      setEqd2Used((bed / (1 + 2 / ab)).toFixed(2));
      setPhysUsed(total.toFixed(2));
    } else {
      setBedUsed("");
      setEqd2Used("");
      setPhysUsed("");
    }
  }, [totalUsed, nUsed, dpfUsed, alphaBeta, manualBedUsed, blockBelow18]);

  // ------------------------------
  // Dates -> months elapsed (approx)
  // ------------------------------
  useEffect(() => {
    if (!startDate || !endDate) {
      setMonthsElapsed("");
      return;
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
      setMonthsElapsed("");
      return;
    }
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    setMonthsElapsed(String(months));
  }, [startDate, endDate]);

  // ------------------------------
  // Recovery model -> forgetPercent auto
  // ------------------------------
  useEffect(() => {
    const m = safeNum(monthsElapsed);
    if (selectedModel === "") return;
    if (isNaN(m)) return;

    let p = 0;
    if (selectedModel === "paradis") {
      if (m <= 3) p = 0;
      else if (m <= 6) p = 10;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (selectedModel === "nieder") {
      if (m <= 3) p = 0;
      else if (m === 4) p = 17;
      else if (m === 5) p = 25;
      else if (m === 6) p = 28;
      else if (m === 7) p = 33;
      else if (m === 8) p = 37;
      else if (m === 9) p = 40;
      else if (m === 10) p = 45;
      else p = 50;
    } else if (selectedModel === "abusaris") {
      if (m < 6) p = 0;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (selectedModel === "noel") {
      // corrected: 0% before 12 months
      if (m < 12) p = 0;
      else if (m === 12) p = 5;
      else if (m === 24) p = 10;
      else if (m === 36) p = 15;
      else if (m === 48) p = 20;
      else if (m === 60) p = 25;
      else if (m === 72) p = 30;
      else if (m === 84) p = 35;
      else if (m === 96) p = 40;
      else if (m === 108) p = 45;
      else p = 50;
    }
    setForgetPercent(String(p));
  }, [selectedModel, monthsElapsed]);

  // ------------------------------
  // Compute remaining BED/EQD2/phys
  // bedRemain = bedAuth - bedUsed * (1 - forget/100)
  // ------------------------------
  useEffect(() => {
    const ba = safeNum(bedAuth);
    const bu = safeNum(bedUsed);
    const forg = safeNum(forgetPercent);

    if (isNaN(ba) || isNaN(bu)) {
      setBedRemain("");
      setEqd2Remain("");
      setPhysRemain("");
      return;
    }
    const remaining = ba - bu * (1 - (isNaN(forg) ? 0 : forg / 100));
    const rem = remaining < 0 ? 0 : remaining;
    setBedRemain(rem.toFixed(2));
    const ab = safeNum(alphaBeta);
    if (!isNaN(ab) && ab !== 0) {
      setEqd2Remain((rem / (1 + 2 / ab)).toFixed(2));
    } else {
      setEqd2Remain("");
    }
    // phys remaining: approx physAuth - physUsed*(1-forget)
    const pa = safeNum(physAuth);
    const pu = safeNum(physUsed);
    if (!isNaN(pa) && !isNaN(pu)) {
      const pres = pa - pu * (1 - (isNaN(forg) ? 0 : forg / 100));
      setPhysRemain((pres < 0 ? 0 : pres).toFixed(2));
    } else {
      setPhysRemain("");
    }
  }, [bedAuth, bedUsed, forgetPercent, alphaBeta, physAuth, physUsed]);

  // ------------------------------
  // Save / history / PDF
  // ------------------------------
  function saveResult() {
    const title = (titleSave && titleSave.trim()) || organ || `Organe ${history.length + 1}`;
    const rec = {
      title,
      organ,
      alphaBeta,
      bedAuth,
      eqd2Auth,
      physAuth,
      bedUsed,
      eqd2Used,
      physUsed,
      forgetPercent,
      bedRemain,
      eqd2Remain,
      physRemain,
      createdAt: new Date().toISOString(),
    };
    setHistory((h) => [...h, rec]);
    setTitleSave("");
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BED Simulator — Rapport", 20, 30);
    doc.setFontSize(11);
    let y = 50;
    history.forEach((r, i) => {
      doc.text(`${i + 1}. ${r.title} (${r.organ || "—"})`, 20, y);
      y += 8;
      doc.text(`  α/β: ${r.alphaBeta || "—"}   BED autorisée: ${r.bedAuth || "—"} Gy   EQD2 autorisée: ${r.eqd2Auth || "—"} Gy`, 22, y);
      y += 8;
      doc.text(`  BED utilisée: ${r.bedUsed || "—"} Gy   EQD2 utilisée: ${r.eqd2Used || "—"} Gy   Dose physique utilisée: ${r.physUsed || "—"} Gy`, 22, y);
      y += 8;
      doc.text(`  % oubli: ${r.forgetPercent || "—"}   BED restante: ${r.bedRemain || "—"} Gy   EQD2 restante: ${r.eqd2Remain || "—"} Gy`, 22, y);
      y += 14;
      if (y > 260) { doc.addPage(); y = 20; }
    });
    doc.save("bed_simulator_report.pdf");
  }

  // tooltip toggle
  function toggleTooltip(k) {
    setTooltipKey(tooltipKey === k ? null : k);
  }

  // small handlers to keep checkbox inline and enforce simple behavior for the dpf in inputs:
  function onChangeDpfAuth(v) {
    // we allow user to set anything; we only enforce block on calculations, not on input
    setDpfAuth(v);
  }

  // Render
  return (
    <div className="app-wrap">
      <div className="card">
        <h1 className="main-title">BED Simulator</h1>

        {/* Step 1 */}
        <section className="section">
          <h2>1. BED totale autorisée</h2>

          <div className="row">
            <select className="select-organ" value={organ} onChange={(e) => { setOrgan(e.target.value); setAlphaBeta(String(OAR_ALPHA[e.target.value] || "")); }}>
              <option value="">-- Choisir un organe --</option>
              {Object.keys(OAR_ALPHA).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>

            <input className="input" placeholder="Dose totale (Gy)" value={totalAuth} onChange={(e) => setTotalAuth(e.target.value)} />
            <input className="input" placeholder="Dose par fraction (Gy)" value={dpfAuth} onChange={(e) => setDpfAuth(e.target.value)} />
            <input className="input" placeholder="Nombre de fractions" value={nAuth} onChange={(e) => setNAuth(e.target.value)} />
          </div>

          <div className="row top-gap">
            <button className="btn" onClick={calcMissingAuth}>⚙️ Calculer le champ manquant</button>

            <label className="inline-checkbox">
              <input type="checkbox" checked={blockBelow18} onChange={(e) => setBlockBelow18(e.target.checked)} />
              Bloquer les doses/fraction &lt; 1.8 Gy
            </label>

            <input className="input alpha" placeholder="Alpha/Beta (Gy)" value={alphaBeta} onChange={(e) => setAlphaBeta(e.target.value)} />
          </div>

          <div className="results-box">
            <div>BED autorisée : <strong>{bedAuth || "-"}</strong> Gy</div>
            <div>EQD2 autorisée : <strong>{eqd2Auth || "-"}</strong> Gy</div>
            <div>Dose physique autorisée : <strong>{physAuth || "-"}</strong> Gy</div>
            <div style={{ marginTop: 8 }}>
              <input className="input wide" placeholder="OU BED autorisée (saisie manuelle)" value={manualBedAuth} onChange={(e) => setManualBedAuth(e.target.value)} />
            </div>
            <div style={{ marginTop: 8 }}>
              <a className="link" href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &lt; 6 Gy</a>
              <br />
              <a className="link" href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &gt; 6 Gy</a>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="section">
          <h2>2. BED utilisée</h2>
          <div className="row">
            <input className="input" placeholder="Dose totale reçue (Gy)" value={totalUsed} onChange={(e) => setTotalUsed(e.target.value)} />
            <input className="input" placeholder="Dose par fraction (Gy)" value={dpfUsed} onChange={(e) => setDpfUsed(e.target.value)} />
            <input className="input" placeholder="Nombre de fractions" value={nUsed} onChange={(e) => setNUsed(e.target.value)} />
          </div>

          <div className="results-box">
            <div>BED utilisée : <strong>{bedUsed || "-"}</strong> Gy</div>
            <div>EQD2 utilisée : <strong>{eqd2Used || "-"}</strong> Gy</div>
            <div>Dose physique utilisée : <strong>{physUsed || "-"}</strong> Gy</div>
            <div style={{ marginTop: 8 }}>
              <input className="input wide" placeholder="OU BED utilisée (saisie manuelle)" value={manualBedUsed} onChange={(e) => setManualBedUsed(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="section">
          <h2>3. BED restante autorisée / % d'oubli</h2>

          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Date début RT</label>
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Date fin RT</label>
              <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div style={{ flex: 0.6 }}>
              <label>Mois écoulés</label>
              <input className="input" placeholder="(calculé)" value={monthsElapsed} readOnly />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>Modèle de récupération (ou saisie manuelle %)</label>
            <div className="model-list">
              {Object.entries(RECOVERY_MODELS).map(([k, m]) => (
                <div key={k} className="model-row">
                  <label>
                    <input type="radio" name="model" checked={selectedModel === k} onChange={() => setSelectedModel(k)} />
                    {" "}{m.label}
                  </label>
                  <button className="info-btn" onClick={() => toggleTooltip(k)}>i</button>
                  {tooltipKey === k && <div className="tooltip">{m.details}</div>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <input className="input" placeholder="% de dose d'oubli (manuel ou calculé)" value={forgetPercent} onChange={(e) => setForgetPercent(e.target.value)} />
            </div>
          </div>

          <div className="results-box" style={{ marginTop: 12 }}>
            <div>BED restante : <strong>{bedRemain || "-"}</strong> Gy</div>
            <div>EQD2 restante : <strong>{eqd2Remain || "-"}</strong> Gy</div>
            <div>Dose physique restante : <strong>{physRemain || "-"}</strong> Gy</div>
          </div>
        </section>

        {/* Save / History / PDF */}
        <section className="section">
          <h2>Enregistrer / Historique</h2>
          <div className="row">
            <input className="input" placeholder="Titre (ex: Chiasma)" value={titleSave} onChange={(e) => setTitleSave(e.target.value)} />
            <button className="btn" onClick={saveResult}>💾 Sauvegarder</button>
            <button className="btn ghost" onClick={() => setHistory([])}>🗑️ Vider historique</button>
            <button className="btn" onClick={exportPDF}>📄 Export PDF</button>
          </div>

          <div className="history-box">
            {history.length === 0 ? <div>Aucun résultat sauvegardé</div> :
              history.slice().reverse().map((h, i) => (
                <div key={i} className="history-item">
                  <div><strong>{h.title}</strong> — {h.organ || "-"}</div>
                  <div>BED restante: {h.bedRemain || "-"} Gy — EQD2: {h.eqd2Remain || "-"} Gy</div>
                </div>
              ))
            }
          </div>
        </section>
      </div>
    </div>
  );
}
