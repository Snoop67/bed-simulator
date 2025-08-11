// src/App.jsx
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "./index.css";

/*
  BED Simulator
  - Présentation conforme à la capture fournie
  - 4 étapes sur la même page (pas d'onglets)
  - Calculs BED / EQD2 / Dose physique
  - Calcul du champ manquant (bouton) en étape 1
  - Blocage des doses < 1.8 Gy (appliqué aux doses autorisées et utilisées)
  - Modèles de récupération avec tooltip au clic
  - Sauvegarde par organe, historique, export PDF, reset
*/

const OAR_LIST = [
  { name: "", ab: "" },
  { name: "Moelle épinière", ab: 2 },
  { name: "Tronc cérébral", ab: 2 },
  { name: "Nerf optique", ab: 2 },
  { name: "Chiasma optique", ab: 2 },
  { name: "Rétine", ab: 2 },
  { name: "Cristallin", ab: 1.3 },
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

const RECOVERY_MODELS = {
  paradis: {
    title: "Paradis et al. : récupération rapide",
    text:
`0–3 mois  : 0 %
4–6 mois  : 10 %
7–12 mois : 25 %
≥ 12 mois : 50 % (plateau)`
  },
  nieder: {
    title: "Nieder et al. : récupération rapide",
    text:
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
    title: "Abusaris et al. : récupération rapide",
    text:
`0 % <6 mois
25 % : 6–12 mois
50 % : >12 mois`
  },
  noel: {
    title: "Noël et al. : récupération lente",
    text:
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

// Helpers
function safeParse(v) {
  if (v === "" || v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return parseFloat(s);
}

export default function App() {
  // Step 1 - BED autorisée
  const [organ, setOrgan] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [doseTotalAuth, setDoseTotalAuth] = useState("");
  const [nbFractionsAuth, setNbFractionsAuth] = useState("");
  const [doseParFractionAuth, setDoseParFractionAuth] = useState("");
  const [manualBEDAuth, setManualBEDAuth] = useState("");

  // Step 2 - BED utilisée
  const [doseTotalUsed, setDoseTotalUsed] = useState("");
  const [nbFractionsUsed, setNbFractionsUsed] = useState("");
  const [doseParFractionUsed, setDoseParFractionUsed] = useState("");
  const [manualBEDUsed, setManualBEDUsed] = useState("");

  // Block <1.8
  const [blockMin18, setBlockMin18] = useState(false);

  // Step 3 - oubli
  const [startRT, setStartRT] = useState("");
  const [endRT, setEndRT] = useState("");
  const [monthsElapsed, setMonthsElapsed] = useState("");
  const [selectedRecovery, setSelectedRecovery] = useState("");
  const [forgetPercent, setForgetPercent] = useState("");

  // Step 4 - new course
  const [nbFractionsNew, setNbFractionsNew] = useState("");
  const [alphaBetaNew, setAlphaBetaNew] = useState("");

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
  const [doseMaxTotalPossible, setDoseMaxTotalPossible] = useState("");

  // History and UI
  const [saveTitle, setSaveTitle] = useState("");
  const [history, setHistory] = useState([]);
  const [tooltipKey, setTooltipKey] = useState(null);

  // Tooltip toggle
  function toggleTooltip(k) {
    setTooltipKey(tooltipKey === k ? null : k);
  }

  // Fill alphaBeta when organ selected
  useEffect(() => {
    const found = OAR_LIST.find(o => o.name === organ);
    if (found && found.ab !== "") {
      setAlphaBeta(String(found.ab));
    }
  }, [organ]);

  // Calculate months between dates (approx months)
  useEffect(() => {
    if (!startRT || !endRT) {
      setMonthsElapsed("");
      return;
    }
    const s = new Date(startRT);
    const e = new Date(endRT);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
      setMonthsElapsed("");
      return;
    }
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    setMonthsElapsed(String(months));
  }, [startRT, endRT]);

  // Recovery model -> forgetPercent auto
  useEffect(() => {
    if (!selectedRecovery || monthsElapsed === "") return;
    const m = safeParse(monthsElapsed);
    let p = NaN;
    if (selectedRecovery === "paradis") {
      if (m <= 3) p = 0;
      else if (m <= 6) p = 10;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (selectedRecovery === "nieder") {
      if (m <= 3) p = 0;
      else if (m === 4) p = 17;
      else if (m === 5) p = 25;
      else if (m === 6) p = 28;
      else if (m === 7) p = 33;
      else if (m === 8) p = 37;
      else if (m === 9) p = 40;
      else if (m === 10) p = 45;
      else p = 50;
    } else if (selectedRecovery === "abusaris") {
      if (m < 6) p = 0;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (selectedRecovery === "noel") {
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
    if (!isNaN(p)) setForgetPercent(String(p));
  }, [selectedRecovery, monthsElapsed]);

  // ---- Step1: calculate dose per fraction OR nb fractions with button (explicit)
  function calculateMissingStep1() {
    const t = safeParse(doseTotalAuth);
    const n = safeParse(nbFractionsAuth);
    const d = safeParse(doseParFractionAuth);

    if (!isNaN(t) && !isNaN(n) && (doseParFractionAuth === "" || doseParFractionAuth === null)) {
      setDoseParFractionAuth((t / n).toFixed(2));
      return;
    }
    if (!isNaN(t) && !isNaN(d) && (nbFractionsAuth === "" || nbFractionsAuth === null)) {
      setNbFractionsAuth(String(Math.round(t / d)));
      return;
    }
    if (!isNaN(n) && !isNaN(d) && (doseTotalAuth === "" || doseTotalAuth === null)) {
      setDoseTotalAuth((n * d).toFixed(2));
      return;
    }
  }

  // ---- Step1: compute BED / EQD2 / phys
  useEffect(() => {
    const ab = safeParse(alphaBeta);
    let dpf = safeParse(doseParFractionAuth);
    const n = safeParse(nbFractionsAuth);
    const total = safeParse(doseTotalAuth);

    if (isNaN(dpf) && !isNaN(total) && !isNaN(n) && n !== 0) {
      dpf = total / n;
    }

    if (blockMin18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = safeParse(manualBEDAuth);
    if (!isNaN(manual)) {
      setBedAllowed(manual.toFixed(2));
      if (!isNaN(ab) && ab !== 0) setEqd2Allowed((manual / (1 + 2 / ab)).toFixed(2));
      else setEqd2Allowed("");
      if (!isNaN(n) && !isNaN(dpf)) setPhysAllowed((dpf * n).toFixed(2));
      else if (!isNaN(total)) setPhysAllowed(total.toFixed(2));
      else setPhysAllowed("");
      return;
    }

    if (!isNaN(dpf) && !isNaN(n) && !isNaN(ab) && n !== 0) {
      const bed = n * dpf * (1 + dpf / ab);
      setBedAllowed(bed.toFixed(2));
      setEqd2Allowed((bed / (1 + 2 / ab)).toFixed(2));
      setPhysAllowed((dpf * n).toFixed(2));
    } else if (!isNaN(total) && !isNaN(dpf) && !isNaN(ab) && dpf !== 0) {
      // compute n from total/dpf for calc
      const ncalc = total / dpf;
      const bed = ncalc * dpf * (1 + dpf / ab);
      setBedAllowed(bed.toFixed(2));
      setEqd2Allowed((bed / (1 + 2 / ab)).toFixed(2));
      setPhysAllowed(total.toFixed(2));
    } else {
      setBedAllowed("");
      setEqd2Allowed("");
      setPhysAllowed("");
    }
  }, [doseTotalAuth, nbFractionsAuth, doseParFractionAuth, alphaBeta, manualBEDAuth, blockMin18]);

  // ---- Step2: compute BED used
  useEffect(() => {
    const ab = safeParse(alphaBeta);
    let dpf = safeParse(doseParFractionUsed);
    const n = safeParse(nbFractionsUsed);
    const total = safeParse(doseTotalUsed);

    if (isNaN(dpf) && !isNaN(total) && !isNaN(n) && n !== 0) {
      dpf = total / n;
    }

    if (blockMin18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = safeParse(manualBEDUsed);
    if (!isNaN(manual)) {
      setBedUsed(manual.toFixed(2));
      if (!isNaN(ab) && ab !== 0) setEqd2Used((manual / (1 + 2 / ab)).toFixed(2));
      else setEqd2Used("");
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
  }, [doseTotalUsed, nbFractionsUsed, doseParFractionUsed, alphaBeta, manualBEDUsed, blockMin18]);

  // ---- Step3: compute remaining using forgetPercent
  useEffect(() => {
    const ba = safeParse(bedAllowed);
    const bu = safeParse(bedUsed);
    const forg = safeParse(forgetPercent);

    if (isNaN(ba) || isNaN(bu)) {
      setBedRemaining("");
      setEqd2Remaining("");
      setPhysRemaining("");
      return;
    }
    const remaining = ba - bu * (1 - (isNaN(forg) ? 0 : forg / 100));
    const rem = remaining < 0 ? 0 : remaining;
    setBedRemaining(rem.toFixed(2));
    const ab = safeParse(alphaBeta);
    if (!isNaN(ab) && ab !== 0) {
      setEqd2Remaining((rem / (1 + 2 / ab)).toFixed(2));
    } else setEqd2Remaining("");
    const pa = safeParse(physAllowed);
    const pu = safeParse(physUsed);
    if (!isNaN(pa) && !isNaN(pu)) {
      const physRem = pa - pu * (1 - (isNaN(forg) ? 0 : forg / 100));
      setPhysRemaining((physRem < 0 ? 0 : physRem).toFixed(2));
    } else setPhysRemaining("");
  }, [bedAllowed, bedUsed, forgetPercent, alphaBeta, physAllowed, physUsed]);

  // ---- Step4: compute max dose per fraction allowed given bedRemaining, nbFractionsNew, alphaBetaNew (alphaBeta taken from step1 if new not given)
  useEffect(() => {
    const B = safeParse(bedRemaining);
    const n = safeParse(nbFractionsNew);
    const abNew = safeParse(alphaBetaNew) || safeParse(alphaBeta);
    if (isNaN(B) || isNaN(n) || n === 0 || isNaN(abNew)) {
      setDoseMaxPerFraction("");
      setDoseMaxTotalPossible("");
      return;
    }
    // Equation: B = n * d * (1 + d/ab) -> (n/ab) d^2 + n d - B = 0
    // Solve for d (positive root):
    const a = n / abNew;
    const b = n;
    const c = -B;
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      setDoseMaxPerFraction("");
      setDoseMaxTotalPossible("");
      return;
    }
    const root = (-b + Math.sqrt(disc)) / (2 * a); // positive root
    if (root <= 0) {
      setDoseMaxPerFraction("");
      setDoseMaxTotalPossible("");
      return;
    }
    setDoseMaxPerFraction(root.toFixed(2));
    setDoseMaxTotalPossible((root * n).toFixed(2));
  }, [bedRemaining, nbFractionsNew, alphaBetaNew, alphaBeta]);

  // ---------------- Save / history / PDF ----------------
  function handleSave() {
    const title = (saveTitle && saveTitle.trim()) || organ || `Organe ${history.length + 1}`;
    const rec = {
      title,
      organ,
      alphaBeta,
      doseTotalAuth,
      nbFractionsAuth,
      doseParFractionAuth,
      bedAllowed,
      eqd2Allowed,
      physAllowed,
      doseTotalUsed,
      nbFractionsUsed,
      doseParFractionUsed,
      bedUsed,
      eqd2Used,
      physUsed,
      forgetPercent,
      bedRemaining,
      eqd2Remaining,
      physRemaining,
      doseMaxPerFraction,
      doseMaxTotalPossible,
      createdAt: new Date().toISOString()
    };
    setHistory(h => [...h, rec]);
    setSaveTitle("");
  }

  function handleReset() {
    setOrgan("");
    setAlphaBeta("");
    setDoseTotalAuth("");
    setNbFractionsAuth("");
    setDoseParFractionAuth("");
    setManualBEDAuth("");
    setDoseTotalUsed("");
    setNbFractionsUsed("");
    setDoseParFractionUsed("");
    setManualBEDUsed("");
    setBlockMin18(false);
    setStartRT("");
    setEndRT("");
    setMonthsElapsed("");
    setSelectedRecovery("");
    setForgetPercent("");
    setNbFractionsNew("");
    setAlphaBetaNew("");
    setBedAllowed("");
    setEqd2Allowed("");
    setPhysAllowed("");
    setBedUsed("");
    setEqd2Used("");
    setPhysUsed("");
    setBedRemaining("");
    setEqd2Remaining("");
    setPhysRemaining("");
    setDoseMaxPerFraction("");
    setDoseMaxTotalPossible("");
    setSaveTitle("");
  }

  function handleExportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BED Simulator — Rapport", 20, 20);
    doc.setFontSize(11);
    let y = 36;
    history.forEach((r, i) => {
      doc.text(`${i + 1}. ${r.title} (${r.organ || "-"})`, 20, y);
      y += 8;
      doc.text(` α/β: ${r.alphaBeta || "-"}  BED autorisée: ${r.bedAllowed || "-"} Gy  EQD2: ${r.eqd2Allowed || "-"}`, 22, y);
      y += 8;
      doc.text(` BED utilisée: ${r.bedUsed || "-"} Gy  EQD2 utilisée: ${r.eqd2Used || "-"} Gy  Phys utilisée: ${r.physUsed || "-"}`, 22, y);
      y += 8;
      doc.text(` % oubli: ${r.forgetPercent || "-"}  BED restante: ${r.bedRemaining || "-"} Gy  EQD2 restante: ${r.eqd2Remaining || "-"}`, 22, y);
      y += 12;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save("bed_simulator_report.pdf");
  }

  // ---------------- UI ----------------
  return (
    <div className="page">
      <div className="panel">
        <h1 className="title">BED Simulator</h1>

        {/* 1 */}
        <div className="section">
          <h2>1. BED totale autorisée</h2>

          <label>Organe</label>
          <select className="full" value={organ} onChange={(e) => setOrgan(e.target.value)}>
            {OAR_LIST.map(o => <option key={o.name} value={o.name}>{o.name}{o.ab ? ` (α/β=${o.ab})` : ""}</option>)}
          </select>

          <label>Dose totale (Gy)</label>
          <input className="full" value={doseTotalAuth} onChange={e => setDoseTotalAuth(e.target.value)} />

          <label>Nombre de fractions</label>
          <input className="full" value={nbFractionsAuth} onChange={e => setNbFractionsAuth(e.target.value)} />

          <label>Dose par fraction (Gy)</label>
          <input className="full" value={doseParFractionAuth} onChange={e => setDoseParFractionAuth(e.target.value)} />

          <div className="row-controls">
            <button className="btn" onClick={calculateMissingStep1}>⚙️ Calculer le champ manquant</button>

            <label className="inline">
              <input type="checkbox" checked={blockMin18} onChange={e => setBlockMin18(e.target.checked)} />
              Bloquer doses par fraction &lt; 1.8 Gy
            </label>

            <input className="alpha" placeholder="Alpha/Beta (Gy)" value={alphaBeta} onChange={e => setAlphaBeta(e.target.value)} />
          </div>

          <div className="result-box">
            <div>BED autorisée : <strong>{bedAllowed || "-"}</strong> Gy</div>
            <div>EQD2 autorisée : <strong>{eqd2Allowed || "-"}</strong> Gy</div>
            <div>Dose physique autorisée : <strong>{physAllowed || "-"}</strong> Gy</div>
          </div>

          <label>OU BED autorisée (saisie manuelle)</label>
          <input className="full" value={manualBEDAuth} onChange={e => setManualBEDAuth(e.target.value)} />
          <div className="links">
            <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &lt; 6 Gy</a>
            <br />
            <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &gt; 6 Gy</a>
          </div>
        </div>

        {/* 2 */}
        <div className="section">
          <h2>2. BED utilisée</h2>

          <label>Dose totale reçue (Gy)</label>
          <input className="full" value={doseTotalUsed} onChange={e => setDoseTotalUsed(e.target.value)} />

          <label>Nombre de fractions</label>
          <input className="full" value={nbFractionsUsed} onChange={e => setNbFractionsUsed(e.target.value)} />

          <label>Dose par fraction (Gy)</label>
          <input className="full" value={doseParFractionUsed} onChange={e => setDoseParFractionUsed(e.target.value)} />

          <div className="result-box">
            <div>BED utilisée : <strong>{bedUsed || "-"}</strong> Gy</div>
            <div>EQD2 utilisée : <strong>{eqd2Used || "-"}</strong> Gy</div>
            <div>Dose physique utilisée : <strong>{physUsed || "-"}</strong> Gy</div>
          </div>

          <label>OU BED utilisée (saisie manuelle)</label>
          <input className="full" value={manualBEDUsed} onChange={e => setManualBEDUsed(e.target.value)} />
        </div>

        {/* 3 */}
        <div className="section">
          <h2>3. BED restante autorisée</h2>

          <label>% de dose d'oubli (manuel)</label>
          <input className="full" value={forgetPercent} onChange={e => setForgetPercent(e.target.value)} />

          <div className="row-dates">
            <div style={{flex:1}}>
              <label>Date début RT</label>
              <input type="date" className="full" value={startRT} onChange={e => setStartRT(e.target.value)} />
            </div>
            <div style={{flex:1}}>
              <label>Date fin RT</label>
              <input type="date" className="full" value={endRT} onChange={e => setEndRT(e.target.value)} />
            </div>
            <div style={{width:140}}>
              <label>Mois écoulés</label>
              <input className="full" value={monthsElapsed} readOnly />
            </div>
          </div>

          <label>Choisir modèle de récupération (ou laisser % manuel)</label>
          <div className="model-list">
            {Object.entries(RECOVERY_MODELS).map(([k, m]) => (
              <div key={k} className="model-line">
                <label>
                  <input type="radio" name="model" checked={selectedRecovery === k} onChange={() => setSelectedRecovery(k)} />
                  {" "}{m.title}
                </label>
                <button className="info" onClick={() => toggleTooltip(k)}>i</button>
                {tooltipKey === k && <div className="tooltip">{m.text}</div>}
              </div>
            ))}
          </div>

          <div className="result-box">
            <div>BED restante : <strong>{bedRemaining || "-"}</strong> Gy</div>
            <div>EQD2 restante : <strong>{eqd2Remaining || "-"}</strong> Gy</div>
            <div>Dose physique restante : <strong>{physRemaining || "-"}</strong> Gy</div>
          </div>

          <label>OU BED restante autorisée (saisie manuelle)</label>
          <input className="full" value={bedRemaining} onChange={e => setBedRemaining(e.target.value)} />
        </div>

        {/* 4 */}
        <div className="section">
          <h2>4. Dose maximale par fraction autorisée</h2>

          <label>Nombre de fractions prévues</label>
          <input className="full" value={nbFractionsNew} onChange={e => setNbFractionsNew(e.target.value)} />

          <label>Alpha/Beta (Gy) — si vide, on utilise α/β de l'étape 1</label>
          <input className="full" value={alphaBetaNew} onChange={e => setAlphaBetaNew(e.target.value)} />

          <div className="result-box">
            <div>Dose max par fraction : <strong>{doseMaxPerFraction || "-"}</strong> Gy</div>
            <div>Dose totale max possible : <strong>{doseMaxTotalPossible || "-"}</strong> Gy</div>
          </div>
        </div>

        {/* Save / reset / PDF / history */}
        <div className="section">
          <h2>Enregistrer</h2>
          <label>Nom de l'organe</label>
          <input className="full" value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder="ex: Chiasma" />

          <div className="actions">
            <button className="btn" onClick={handleSave}>💾 Sauvegarder</button>
            <button className="btn ghost" onClick={handleReset}>♻️ Réinitialiser</button>
            <button className="btn" onClick={handleExportPDF}>📄 Générer PDF</button>
          </div>

          <h3>Résultats enregistrés</h3>
          <div className="history">
            {history.length === 0 && <div className="hint">Aucun résultat enregistré</div>}
            {history.slice().reverse().map((h, i) => (
              <div className="history-item" key={i}>
                <div><strong>{h.title}</strong> — {h.organ || "-"}</div>
                <div>BED restante: {h.bedRemaining || "-"} Gy — EQD2: {h.eqd2Remaining || "-"} Gy</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
