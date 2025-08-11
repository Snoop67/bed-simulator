// src/App.jsx
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "./App.css";

/* Liste OAR (préremplie) */
const OARS = [
  { name: "", ab: "" },
  { name: "Moelle épinière", ab: 2 },
  { name: "Tronc cérébral", ab: 2 },
  { name: "Nerf optique", ab: 2 },
  { name: "Chiasma optique", ab: 2 },
  { name: "Rétine", ab: 2 },
  { name: "Cristallin", ab: 1.5 },
  { name: "Cervelet", ab: 2 },
  { name: "Cerveau (parenchyme)", ab: 2 },
  { name: "Hippocampe", ab: 2 },
  { name: "Glande parotide", ab: 3 },
  { name: "Glande sous-maxillaire", ab: 3 },
  { name: "Muqueuse orale", ab: 10 },
  { name: "Larynx (cartilage)", ab: 3 },
  { name: "Larynx (muqueuse)", ab: 10 },
  { name: "Œsophage (tardif)", ab: 3 },
  { name: "Poumon (tissu normal)", ab: 3 },
  { name: "Cœur", ab: 3 },
  { name: "Péricarde", ab: 3 },
  { name: "Foie", ab: 2.75 },
  { name: "Reins", ab: 1.5 },
  { name: "Vessie", ab: 3 },
  { name: "Rectum", ab: 3 },
  { name: "Intestin grêle", ab: 3 },
  { name: "Côlon", ab: 3 },
  { name: "Peau (tardif)", ab: 3 },
  { name: "Peau (aigu)", ab: 10 },
  { name: "Os cortical", ab: 1.75 },
  { name: "Tête fémorale", ab: 2 },
  { name: "Testicules", ab: 2 },
  { name: "Ovaires", ab: 3 }
];

/* Modèles de récupération (texte pour tooltip) */
const RECOVERY = {
  paradis: {
    title: "Paradis et al. : récupération rapide",
    txt:
`0–3 mois  : 0 %
4–6 mois  : 10 %
7–12 mois : 25 %
≥ 12 mois : 50 % (plateau)`
  },
  nieder: {
    title: "Nieder et al. : récupération rapide",
    txt:
`0 % : 0–3 mois
~17 % : 4 mois
~25 % : 5 mois
~28 % : 6 mois
~33 % : 7 mois
~37 % : 8 mois
~40 % : 9 mois
~45 % : 10 mois
50 % : 11–12 mois et plateau`
  },
  abusaris: {
    title: "Abusaris et al. : récupération rapide",
    txt:
`0 % : < 6 mois
25 % : 6–12 mois
50 % : > 12 mois`
  },
  noel: {
    title: "Noël et al. : récupération lente",
    txt:
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

/* helper parse */
function safeNum(v) {
  if (v === "" || v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

export default function App() {
  // === Step1 ===
  const [organ, setOrgan] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [totalDose, setTotalDose] = useState("");
  const [fractions, setFractions] = useState("");
  const [dosePerFraction, setDosePerFraction] = useState("");
  const [manualBedAllowed, setManualBedAllowed] = useState("");

  // block <1.8 (appliqué aux étapes 1 & 2)
  const [blockBelow18, setBlockBelow18] = useState(false);

  // Step2 (used)
  const [totalDoseUsed, setTotalDoseUsed] = useState("");
  const [fractionsUsed, setFractionsUsed] = useState("");
  const [dosePerFractionUsed, setDosePerFractionUsed] = useState("");
  const [manualBedUsed, setManualBedUsed] = useState("");

  // Step3 (forget)
  const [forgetPercent, setForgetPercent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthsElapsed, setMonthsElapsed] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [tooltipKey, setTooltipKey] = useState(null);
  const [manualBedRemaining, setManualBedRemaining] = useState("");

  // Step4
  const [newFractions, setNewFractions] = useState("");

  // Results
  const [bedAllowed, setBedAllowed] = useState("");
  const [eqd2Allowed, setEqd2Allowed] = useState("");
  const [physAllowed, setPhysAllowed] = useState("");

  const [bedUsed, setBedUsed] = useState("");
  const [eqd2Used, setEqd2Used] = useState("");
  const [physUsed, setPhysUsed] = useState("");

  const [bedRemaining, setBedRemaining] = useState("");
  const [eqd2Remaining, setEqd2Remaining] = useState("");
  const [physRemaining, setPhysRemaining] = useState("");

  const [doseMaxPerFraction, setDoseMaxPerFraction] = useState("");
  const [doseMaxTotal, setDoseMaxTotal] = useState("");

  // history & save
  const [saveTitle, setSaveTitle] = useState("");
  const [history, setHistory] = useState([]);

  // --- when organ changes, prefill alphaBeta ---
  useEffect(() => {
    const found = OARS.find(o => o.name === organ);
    if (found && found.ab !== "") setAlphaBeta(String(found.ab));
  }, [organ]);

  // --- calculate missing in step1 on button click ---
  function calculateDoseOrFractions() {
    const td = safeNum(totalDose);
    const fr = safeNum(fractions);
    const dpf = safeNum(dosePerFraction);

    if (!isNaN(td) && !isNaN(fr) && (dosePerFraction === "" || dosePerFraction === null)) {
      setDosePerFraction((td / fr).toFixed(2));
      return;
    }
    if (!isNaN(td) && !isNaN(dpf) && (fractions === "" || fractions === null)) {
      setFractions(String(Math.round(td / dpf)));
      return;
    }
    if (!isNaN(fr) && !isNaN(dpf) && (totalDose === "" || totalDose === null)) {
      setTotalDose((fr * dpf).toFixed(2));
      return;
    }
  }

  // --- auto compute dpf in step2 when total+fractions provided (but allow manual override) ---
  useEffect(() => {
    const td = safeNum(totalDoseUsed);
    const fr = safeNum(fractionsUsed);
    if (!isNaN(td) && !isNaN(fr) && (dosePerFractionUsed === "" || dosePerFractionUsed === null)) {
      setDosePerFractionUsed((td / fr).toFixed(2));
    }
  }, [totalDoseUsed, fractionsUsed]);

  // --- Step1 calculations (BED/EQD2/phys) ---
  useEffect(() => {
    const ab = safeNum(alphaBeta);
    let dpf = safeNum(dosePerFraction);
    const n = safeNum(fractions);
    const tot = safeNum(totalDose);

    // if missing dpf but tot & n provided => compute for calculation
    if (isNaN(dpf) && !isNaN(tot) && !isNaN(n) && n !== 0) {
      dpf = tot / n;
    }

    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = safeNum(manualBedAllowed);
    if (!isNaN(manual)) {
      setBedAllowed(manual.toFixed(2));
      if (!isNaN(ab) && ab !== 0) setEqd2Allowed((manual / (1 + 2 / ab)).toFixed(2));
      else setEqd2Allowed("");
      if (!isNaN(n) && !isNaN(dpf)) setPhysAllowed((dpf * n).toFixed(2));
      else if (!isNaN(tot)) setPhysAllowed(tot.toFixed(2));
      else setPhysAllowed("");
      return;
    }

    if (!isNaN(dpf) && !isNaN(n) && !isNaN(ab) && n !== 0) {
      const bed = n * dpf * (1 + dpf / ab);
      setBedAllowed(bed.toFixed(2));
      setEqd2Allowed((bed / (1 + 2 / ab)).toFixed(2));
      setPhysAllowed((dpf * n).toFixed(2));
    } else if (!isNaN(tot) && !isNaN(dpf) && !isNaN(ab) && dpf !== 0) {
      const ncalc = tot / dpf;
      const bed = ncalc * dpf * (1 + dpf / ab);
      setBedAllowed(bed.toFixed(2));
      setEqd2Allowed((bed / (1 + 2 / ab)).toFixed(2));
      setPhysAllowed(tot.toFixed(2));
    } else {
      setBedAllowed("");
      setEqd2Allowed("");
      setPhysAllowed("");
    }
  }, [totalDose, fractions, dosePerFraction, alphaBeta, manualBedAllowed, blockBelow18]);

  // --- Step2 calculations ---
  useEffect(() => {
    const ab = safeNum(alphaBeta);
    let dpf = safeNum(dosePerFractionUsed);
    const n = safeNum(fractionsUsed);
    const tot = safeNum(totalDoseUsed);

    if (isNaN(dpf) && !isNaN(tot) && !isNaN(n) && n !== 0) {
      dpf = tot / n;
    }

    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = safeNum(manualBedUsed);
    if (!isNaN(manual)) {
      setBedUsed(manual.toFixed(2));
      if (!isNaN(ab) && ab !== 0) setEqd2Used((manual / (1 + 2 / ab)).toFixed(2));
      else setEqd2Used("");
      if (!isNaN(n) && !isNaN(dpf)) setPhysUsed((dpf * n).toFixed(2));
      else if (!isNaN(tot)) setPhysUsed(tot.toFixed(2));
      else setPhysUsed("");
      return;
    }

    if (!isNaN(dpf) && !isNaN(n) && !isNaN(ab) && n !== 0) {
      const bed = n * dpf * (1 + dpf / ab);
      setBedUsed(bed.toFixed(2));
      setEqd2Used((bed / (1 + 2 / ab)).toFixed(2));
      setPhysUsed((dpf * n).toFixed(2));
    } else if (!isNaN(tot) && !isNaN(dpf) && !isNaN(ab) && dpf !== 0) {
      const ncalc = tot / dpf;
      const bed = ncalc * dpf * (1 + dpf / ab);
      setBedUsed(bed.toFixed(2));
      setEqd2Used((bed / (1 + 2 / ab)).toFixed(2));
      setPhysUsed(tot.toFixed(2));
    } else {
      setBedUsed("");
      setEqd2Used("");
      setPhysUsed("");
    }
  }, [totalDoseUsed, fractionsUsed, dosePerFractionUsed, alphaBeta, manualBedUsed, blockBelow18]);

  // --- dates -> monthsElapsed ---
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

  // --- model -> forgetPercent auto (but manual override allowed) ---
  useEffect(() => {
    if (!selectedModel || monthsElapsed === "") return;
    const m = safeNum(monthsElapsed);
    if (isNaN(m)) return;
    let p = NaN;
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
      if (m < 12) p = 0;          // corrected: 0% before 1 year
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
    if (!isNaN(p)) setForgetPercent(String(p));
  }, [selectedModel, monthsElapsed]);

  // --- compute remaining BED/EQD2/phys (step3) ---
  useEffect(() => {
    const total = safeNum(manualBedAllowed) || safeNum(bedAllowed);
    const used = safeNum(bedUsed);
    const forg = safeNum(forgetPercent);
    if (isNaN(total) || isNaN(used)) {
      setBedRemaining("");
      setEqd2Remaining("");
      setPhysRemaining("");
      return;
    }
    const remaining = total - used * (1 - (isNaN(forg) ? 0 : forg / 100));
    const rem = remaining < 0 ? 0 : remaining;
    setBedRemaining(rem.toFixed(2));
    const ab = safeNum(alphaBeta);
    if (!isNaN(ab) && ab !== 0) setEqd2Remaining((rem / (1 + 2 / ab)).toFixed(2));
    else setEqd2Remaining("");
    const physA = safeNum(physAllowed);
    const physU = safeNum(physUsed);
    if (!isNaN(physA) && !isNaN(physU)) {
      const physRem = physA - physU * (1 - (isNaN(forg) ? 0 : forg / 100));
      setPhysRemaining((physRem < 0 ? 0 : physRem).toFixed(2));
    } else setPhysRemaining("");
  }, [bedAllowed, manualBedAllowed, bedUsed, physAllowed, physUsed, forgetPercent, alphaBeta]);

  // --- Step4: compute max dose per fraction allowed (solve quadratic) ---
  useEffect(() => {
    // B = n*d*(1 + d/ab)  -> (n/ab) d^2 + n d - B = 0
    const B = safeNum(manualBedRemaining) || safeNum(bedRemaining);
    const n = safeNum(newFractions);
    const ab = safeNum(alphaBeta); // use alphaBeta of step1 (per your instruction)
    if (isNaN(B) || isNaN(n) || n === 0 || isNaN(ab) || ab === 0) {
      setDoseMaxPerFraction("");
      setDoseMaxTotal("");
      return;
    }
    const a = n / ab;
    const b = n;
    const c = -B;
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      setDoseMaxPerFraction("");
      setDoseMaxTotal("");
      return;
    }
    const root = (-b + Math.sqrt(disc)) / (2 * a);
    if (root <= 0) {
      setDoseMaxPerFraction("");
      setDoseMaxTotal("");
      return;
    }
    setDoseMaxPerFraction(root.toFixed(2));
    setDoseMaxTotal((root * n).toFixed(2));
  }, [bedRemaining, manualBedRemaining, newFractions, alphaBeta]);

  // --- Save / Reset / PDF ---
  function saveResult() {
    const title = (saveTitle && saveTitle.trim()) || organ || `Organe ${history.length + 1}`;
    const rec = {
      title,
      organ,
      alphaBeta,
      bedAllowed,
      eqd2Allowed,
      physAllowed,
      bedUsed,
      eqd2Used,
      physUsed,
      forgetPercent,
      bedRemaining,
      eqd2Remaining,
      physRemaining,
      doseMaxPerFraction,
      doseMaxTotal,
      createdAt: new Date().toISOString()
    };
    setHistory(h => [...h, rec]);
    setSaveTitle("");
  }

  function resetAll() {
    setOrgan("");
    setAlphaBeta("");
    setTotalDose("");
    setFractions("");
    setDosePerFraction("");
    setManualBedAllowed("");
    setBlockBelow18(false);
    setTotalDoseUsed("");
    setFractionsUsed("");
    setDosePerFractionUsed("");
    setManualBedUsed("");
    setStartDate("");
    setEndDate("");
    setMonthsElapsed("");
    setSelectedModel("");
    setForgetPercent("");
    setManualBedRemaining("");
    setNewFractions("");
    setDoseMaxPerFraction("");
    setDoseMaxTotal("");
    setBedAllowed("");
    setEqd2Allowed("");
    setPhysAllowed("");
    setBedUsed("");
    setEqd2Used("");
    setPhysUsed("");
    setBedRemaining("");
    setEqd2Remaining("");
    setPhysRemaining("");
    setSaveTitle("");
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BED Simulator — Rapport", 20, 20);
    doc.setFontSize(11);
    let y = 36;
    history.forEach((r, i) => {
      doc.text(`${i + 1}. ${r.title} (${r.organ || "-"})`, 20, y); y += 8;
      doc.text(`α/β: ${r.alphaBeta || "-"} — BED autorisée: ${r.bedAllowed || "-"} Gy — EQD2: ${r.eqd2Allowed || "-"}`, 22, y); y += 8;
      doc.text(`BED utilisée: ${r.bedUsed || "-"} Gy — EQD2 utilisée: ${r.eqd2Used || "-"} Gy — Phys: ${r.physUsed || "-"}`, 22, y); y += 8;
      doc.text(`% oubli: ${r.forgetPercent || "-"} — BED restante: ${r.bedRemaining || "-"} Gy — EQD2 restante: ${r.eqd2Remaining || "-"}`, 22, y); y += 12;
      if (y > 260) { doc.addPage(); y = 20; }
    });
    doc.save("bed_simulator_report.pdf");
  }

  // Small UI convenience state
  const [saveTitleLocal, setSaveTitle] = useState("");
  function handleSaveClick() {
    const title = (saveTitleLocal && saveTitleLocal.trim()) || organ || `Organe ${history.length + 1}`;
    const rec = {
      title,
      organ,
      alphaBeta,
      bedAllowed,
      eqd2Allowed,
      physAllowed,
      bedUsed,
      eqd2Used,
      physUsed,
      forgetPercent,
      bedRemaining,
      eqd2Remaining,
      physRemaining,
      doseMaxPerFraction,
      doseMaxTotal,
      createdAt: new Date().toISOString()
    };
    setHistory(h => [...h, rec]);
    setSaveTitleLocal("");
  }

  return (
    <div className="container">
      <h1 className="title">BED Simulator</h1>

      {/* --- STEP 1 --- */}
      <div className="step">
        <h2>1. BED totale autorisée</h2>

        <label>Organe (prérempli α/β)</label>
        <select value={organ} onChange={(e) => setOrgan(e.target.value)} className="field">
          {OARS.map(o => <option key={o.name} value={o.name}>{o.name}{o.ab ? ` (α/β=${o.ab})` : ""}</option>)}
        </select>

        <label>Dose totale (Gy)</label>
        <input className="field" value={totalDose} onChange={e => setTotalDose(e.target.value)} />

        <label>Nombre de fractions</label>
        <input className="field" value={fractions} onChange={e => setFractions(e.target.value)} />

        <label>Dose par fraction (Gy)</label>
        <input className="field" value={dosePerFraction} onChange={e => setDosePerFraction(e.target.value)} />

        <div className="row-inline">
          <button className="btn" onClick={calculateDoseOrFractions}>⚙️ Calculer le champ manquant</button>

          <label className="inline-checkbox">
            <input type="checkbox" checked={blockBelow18} onChange={(e) => setBlockBelow18(e.target.checked)} />
            Bloquer doses par fraction &lt; 1.8 Gy
          </label>

          <input className="field alpha" placeholder="α/β (Gy) manuel" value={alphaBeta} onChange={e => setAlphaBeta(e.target.value)} />
        </div>

        <div className="links">
          <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &lt; 6 Gy</a>
          <br />
          <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &gt; 6 Gy</a>
        </div>

        <div className="result">
          <div>BED autorisée : <strong>{bedAllowed || "-"}</strong> Gy</div>
          <div>EQD2 autorisée : <strong>{eqd2Allowed || "-"}</strong> Gy</div>
          <div>Dose physique autorisée : <strong>{physAllowed || "-"}</strong> Gy</div>
        </div>

        <label>OU BED totale autorisée (saisie manuelle)</label>
        <input className="field" value={manualBedAllowed} onChange={e => setManualBedAllowed(e.target.value)} />
      </div>

      {/* --- STEP 2 --- */}
      <div className="step">
        <h2>2. BED utilisée</h2>

        <label>Dose totale reçue (Gy)</label>
        <input className="field" value={totalDoseUsed} onChange={e => setTotalDoseUsed(e.target.value)} />

        <label>Nombre de fractions</label>
        <input className="field" value={fractionsUsed} onChange={e => setFractionsUsed(e.target.value)} />

        <label>Dose par fraction (Gy)</label>
        <input className="field" value={dosePerFractionUsed} onChange={e => setDosePerFractionUsed(e.target.value)} />

        <div className="result">
          <div>BED utilisée : <strong>{bedUsed || "-"}</strong> Gy</div>
          <div>EQD2 utilisée : <strong>{eqd2Used || "-"}</strong> Gy</div>
          <div>Dose physique utilisée : <strong>{physUsed || "-"}</strong> Gy</div>
        </div>

        <label>OU BED utilisée (saisie manuelle)</label>
        <input className="field" value={manualBedUsed} onChange={e => setManualBedUsed(e.target.value)} />
      </div>

      {/* --- STEP 3 --- */}
      <div className="step">
        <h2>3. BED restante autorisée</h2>

        <label>% de dose d'oubli (manuel)</label>
        <input className="field" value={forgetPercent} onChange={e => setForgetPercent(e.target.value)} />

        <label>Date début RT</label>
        <input type="date" className="field" value={startDate} onChange={e => setStartDate(e.target.value)} />

        <label>Date fin RT</label>
        <input type="date" className="field" value={endDate} onChange={e => setEndDate(e.target.value)} />

        <label>Mois écoulés (calculé)</label>
        <input className="field" value={monthsElapsed} readOnly />
