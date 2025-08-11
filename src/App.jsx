// src/App.jsx
import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "./App.css";

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
  { name: "Peau (réactions tardives)", ab: 3 },
  { name: "Peau (réactions aiguës)", ab: 10 },
  { name: "Os cortical", ab: 1.75 },
  { name: "Tête fémorale", ab: 2 },
  { name: "Testicules", ab: 2 },
  { name: "Ovaires", ab: 3 },
];

const RECOVERY = {
  paradis: {
    title: "Paradis et al. : récupération rapide",
    text: `0–3 mois  : 0 %
4–6 mois  : 10 %
7–12 mois : 25 %
≥ 12 mois : 50 % (plateau)`,
  },
  nieder: {
    title: "Nieder et al. : récupération rapide",
    text: `0 % : 0–3 mois
~17 % : 4 mois
~25 % : 5 mois
~28 % : 6 mois
~33 % : 7 mois
~37 % : 8 mois
~40 % : 9 mois
~45 % : 10 mois
50 % : 11–12 mois et plateau`,
  },
  abusaris: {
    title: "Abusaris et al. : récupération rapide",
    text: `0 % : < 6 mois
25 % : 6–12 mois
50 % : > 12 mois`,
  },
  noel: {
    title: "Noël et al. : récupération lente",
    text: `0 % avant 1 an
5 % : 1 an
~10 % : 2 ans
~15 % : 3 ans
~20 % : 4 ans
~25 % : 5 ans
~30 % : 6 ans
~35 % : 7 ans
~40 % : 8 ans
~45 % : 9 ans
50 % : 10 ans et plateau`,
  },
};

// small safe parse
function num(v) {
  if (v === "" || v == null) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

export default function App() {
  // step1
  const [organ, setOrgan] = useState("");
  const [manualAB, setManualAB] = useState("");
  const [alphaBeta, setAlphaBeta] = useState(""); // used globally
  const [doseTotalAuth, setDoseTotalAuth] = useState("");
  const [nAuth, setNAuth] = useState("");
  const [dpfAuth, setDpfAuth] = useState("");
  const [manualBEDAuth, setManualBEDAuth] = useState("");

  // step2
  const [doseTotalUsed, setDoseTotalUsed] = useState("");
  const [nUsed, setNUsed] = useState("");
  const [dpfUsed, setDpfUsed] = useState("");
  const [manualBEDUsed, setManualBEDUsed] = useState("");

  // step3
  const [forgetPercent, setForgetPercent] = useState("");
  const [startRT, setStartRT] = useState("");
  const [endRT, setEndRT] = useState("");
  const [monthsElapsed, setMonthsElapsed] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const [manualBEDRemaining, setManualBEDRemaining] = useState("");

  // step4
  const [newFractions, setNewFractions] = useState("");
  // block <1.8
  const [blockBelow18, setBlockBelow18] = useState(false);

  // results
  const [bedAllowed, setBedAllowed] = useState("");
  const [eqd2Allowed, setEqd2Allowed] = useState("");
  const [physAllowed, setPhysAllowed] = useState("");

  const [bedUsed, setBedUsed] = useState("");
  const [eqd2Used, setEqd2Used] = useState("");
  const [physUsed, setPhysUsed] = useState("");

  const [bedRemaining, setBedRemaining] = useState("");
  const [eqd2Remaining, setEqd2Remaining] = useState("");
  const [physRemaining, setPhysRemaining] = useState("");

  const [dpfMax, setDpfMax] = useState("");
  const [totalMaxPossible, setTotalMaxPossible] = useState("");

  // history
  const [titleSave, setTitleSave] = useState("");
  const [history, setHistory] = useState([]);

  // --- When organ selects, prefill AB unless user typed customAB ---
  useEffect(() => {
    const found = OARS.find((o) => o.name === organ);
    if (found && found.ab !== "" && !manualAB) {
      setAlphaBeta(String(found.ab));
    } else if (manualAB) {
      setAlphaBeta(manualAB);
    } else if (!found) {
      setAlphaBeta(manualAB || "");
    }
  }, [organ, manualAB]);

  // --- Step1 calculate on explicit button (keeps behavior predictable) ---
  function calcMissingStep1() {
    const TD = num(doseTotalAuth);
    const N = num(nAuth);
    const DPF = num(dpfAuth);

    if (!isNaN(TD) && !isNaN(N) && (dpfAuth === "" || dpfAuth == null)) {
      setDpfAuth((TD / N).toFixed(2));
      return;
    }
    if (!isNaN(TD) && !isNaN(DPF) && (nAuth === "" || nAuth == null)) {
      setNAuth(String(Math.round(TD / DPF)));
      return;
    }
    if (!isNaN(N) && !isNaN(DPF) && (doseTotalAuth === "" || doseTotalAuth == null)) {
      setDoseTotalAuth((N * DPF).toFixed(2));
      return;
    }
  }

  // compute BED/EQD2/phys for step1 whenever inputs change
  useEffect(() => {
    const ab = num(alphaBeta);
    let dpf = num(dpfAuth);
    let n = num(nAuth);
    const tot = num(doseTotalAuth);

    if (isNaN(dpf) && !isNaN(tot) && !isNaN(n) && n !== 0) {
      dpf = tot / n;
    }
    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = num(manualBEDAuth);
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
  }, [doseTotalAuth, nAuth, dpfAuth, alphaBeta, manualBEDAuth, blockBelow18]);

  // --- Step2 auto-calc dpf if total + n provided (but editable) ---
  useEffect(() => {
    const td = num(doseTotalUsed);
    const n = num(nUsed);
    if (!isNaN(td) && !isNaN(n) && (dpfUsed === "" || dpfUsed == null)) {
      setDpfUsed((td / n).toFixed(2));
    }
  }, [doseTotalUsed, nUsed]);

  // compute BED used
  useEffect(() => {
    const ab = num(alphaBeta);
    let dpf = num(dpfUsed);
    const n = num(nUsed);
    const tot = num(doseTotalUsed);

    if (isNaN(dpf) && !isNaN(tot) && !isNaN(n) && n !== 0) {
      dpf = tot / n;
    }
    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = num(manualBEDUsed);
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
  }, [doseTotalUsed, nUsed, dpfUsed, alphaBeta, manualBEDUsed, blockBelow18]);

  // --- dates months elapsed ---
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

  // recovery models -> set forgetPercent (auto, but user can override by editing forgetPercent)
  useEffect(() => {
    if (!selectedModel || monthsElapsed === "") return;
    const m = num(monthsElapsed);
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
  }, [selectedModel, monthsElapsed]);

  // --- compute remaining BED/EQD2/phys
  useEffect(() => {
    const bAllowed = num(manualBEDAuth) || num(bedAllowed);
    const bUsed = num(bedUsed);
    const forg = num(forgetPercent);
    if (isNaN(bAllowed) || isNaN(bUsed)) {
      setBedRemaining("");
      setEqd2Remaining("");
      setPhysRemaining("");
      return;
    }
    const remaining = bAllowed - bUsed * (1 - (isNaN(forg) ? 0 : forg / 100));
    const rem = remaining < 0 ? 0 : remaining;
    setBedRemaining(rem.toFixed(2));
    const ab = num(alphaBeta);
    if (!isNaN(ab) && ab !== 0) setEqd2Remaining((rem / (1 + 2 / ab)).toFixed(2));
    else setEqd2Remaining("");
    const physA = num(physAllowed);
    const physU = num(physUsed);
    if (!isNaN(physA) && !isNaN(physU)) {
      const pres = physA - physU * (1 - (isNaN(forg) ? 0 : forg / 100));
      setPhysRemaining((pres < 0 ? 0 : pres).toFixed(2));
    } else setPhysRemaining("");
  }, [bedAllowed, manualBEDAuth, bedUsed, physAllowed, physUsed, forgetPercent, alphaBeta]);

  // --- Step4 compute dpf max solving quadratic
  useEffect(() => {
    const B = num(manualBEDRemaining) || num(bedRemaining);
    const n = num(newFractions);
    const ab = num(alphaBeta);
    if (isNaN(B) || isNaN(n) || n === 0 || isNaN(ab) || ab === 0) {
      setDpfMax("");
      setTotalMaxPossible("");
      return;
    }
    // (n/ab) d^2 + n d - B = 0
    const a = n / ab;
    const b = n;
    const c = -B;
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      setDpfMax("");
      setTotalMaxPossible("");
      return;
    }
    const root = (-b + Math.sqrt(disc)) / (2 * a);
    if (root <= 0) {
      setDpfMax("");
      setTotalMaxPossible("");
      return;
    }
    setDpfMax(root.toFixed(2));
    setTotalMaxPossible((root * n).toFixed(2));
  }, [bedRemaining, manualBEDRemaining, newFractions, alphaBeta]);

  // --- Save / reset / PDF ---
  function handleSave() {
    const title = (titleSave && titleSave.trim()) || organ || `Organe ${history.length + 1}`;
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
      dpfMax,
      totalMaxPossible,
      createdAt: new Date().toISOString(),
    };
    setHistory((h) => [...h, rec]);
    setTitleSave("");
  }

  function handleResetAll() {
    setOrgan("");
    setManualAB("");
    setAlphaBeta("");
    setDoseTotalAuth("");
    setNAuth("");
    setDpfAuth("");
    setManualBEDAuth("");
    setDoseTotalUsed("");
    setNUsed("");
    setDpfUsed("");
    setManualBEDUsed("");
    setForgetPercent("");
    setStartRT("");
    setEndRT("");
    setMonthsElapsed("");
    setSelectedModel("");
    setTooltip(null);
    setManualBEDRemaining("");
    setNewFractions("");
    setDpfMax("");
    setTotalMaxPossible("");
    setBedAllowed("");
    setEqd2Allowed("");
    setPhysAllowed("");
    setBedUsed("");
    setEqd2Used("");
    setPhysUsed("");
    setBedRemaining("");
    setEqd2Remaining("");
    setPhysRemaining("");
    setTitleSave("");
  }

  function handleExportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BED Simulator — Rapport", 20, 20);
    doc.setFontSize(11);
    let y = 36;
    history.forEach((r, i) => {
      doc.text(`${i + 1}. ${r.title || "-"}`, 20, y);
      y += 8;
      doc.text(`α/β: ${r.alphaBeta || "-"}  BED autorisée: ${r.bedAllowed || "-"} Gy  EQD2: ${r.eqd2Allowed || "-"}`, 22, y);
      y += 8;
      doc.text(`BED utilisée: ${r.bedUsed || "-"} Gy  EQD2 utilisée: ${r.eqd2Used || "-"} Gy`, 22, y);
      y += 8;
      doc.text(`% oubli: ${r.forgetPercent || "-"}  BED restante: ${r.bedRemaining || "-"} Gy  EQD2 restante: ${r.eqd2Remaining || "-"}`, 22, y);
      y += 12;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save("bed_simulator_report.pdf");
  }

  // small UI helper to show AB next to organ
  const showAB = () => {
    if (manualAB) return manualAB;
    const found = OARS.find((o) => o.name === organ);
    return found ? found.ab : "";
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1 className="main-title">BED Simulator</h1>

        {/* STEP 1 */}
        <section className="step">
          <h2 className="step-title">1. BED totale autorisée</h2>

          <label className="field-label">Organe</label>
          <div className="inline-row">
            <select className="field" value={organ} onChange={(e) => setOrgan(e.target.value)}>
              {OARS.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name || "-- aucun --"}
                </option>
              ))}
            </select>

            <label className="field-label small">α/β</label>
            <input
              className="field small"
              placeholder={showAB() ? `prérempli ${showAB()}` : "α/β (Gy)"}
              value={manualAB}
              onChange={(e) => setManualAB(e.target.value)}
            />
          </div>

          <label className="field-label">Dose totale (Gy)</label>
          <input className="field" value={doseTotalAuth} onChange={(e) => setDoseTotalAuth(e.target.value)} />

          <label className="field-label">Nombre de fractions</label>
          <input className="field" value={nAuth} onChange={(e) => setNAuth(e.target.value)} />

          <label className="field-label">Dose par fraction (Gy)</label>
          <input className="field" value={dpfAuth} onChange={(e) => setDpfAuth(e.target.value)} />

          <div className="controls-row">
            <button className="btn primary" onClick={calcMissingStep1}>⚙️ Calculer le champ manquant</button>

            <label className="inline-checkbox">
              <input type="checkbox" checked={blockBelow18} onChange={(e) => setBlockBelow18(e.target.checked)} />
              Bloquer les doses par fraction &lt; 1.8 Gy
            </label>
          </div>

          <div className="links">
            <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &lt; 6 Gy</a>
            <br />
            <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &gt; 6 Gy</a>
          </div>

          <div className="result-box highlight">
            <div className="result-line"><span className="result-label">BED autorisée :</span> <strong>{bedAllowed || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">EQD2 autorisée :</span> <strong>{eqd2Allowed || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">Dose physique autorisée :</span> <strong>{physAllowed || "-"}</strong> Gy</div>
          </div>

          <label className="field-label">OU BED totale autorisée (saisie manuelle)</label>
          <input className="field" value={manualBEDAuth} onChange={(e) => setManualBEDAuth(e.target.value)} />
        </section>

        {/* STEP 2 */}
        <section className="step">
          <h2 className="step-title">2. BED utilisée</h2>

          <label className="field-label">Dose totale reçue (Gy)</label>
          <input className="field" value={doseTotalUsed} onChange={(e) => setDoseTotalUsed(e.target.value)} />

          <label className="field-label">Nombre de fractions</label>
          <input className="field" value={nUsed} onChange={(e) => setNUsed(e.target.value)} />

          <label className="field-label">Dose par fraction (Gy)</label>
          <input className="field" value={dpfUsed} onChange={(e) => setDpfUsed(e.target.value)} />

          <div className="result-box">
            <div className="result-line"><span className="result-label">BED utilisée :</span> <strong>{bedUsed || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">EQD2 utilisée :</span> <strong>{eqd2Used || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">Dose physique utilisée :</span> <strong>{physUsed || "-"}</strong> Gy</div>
          </div>

          <label className="field-label">OU BED utilisée (saisie manuelle)</label>
          <input className="field" value={manualBEDUsed} onChange={(e) => setManualBEDUsed(e.target.value)} />
        </section>

        {/* STEP 3 */}
        <section className="step">
          <h2 className="step-title">3. BED restante autorisée</h2>

          <label className="field-label">% de dose d'oubli (manuel)</label>
          <input className="field" value={forgetPercent} onChange={(e) => setForgetPercent(e.target.value)} />

          <label className="field-label">Date début RT</label>
          <input className="field" type="date" value={startRT} onChange={(e) => setStartRT(e.target.value)} />

          <label className="field-label">Date fin RT</label>
          <input className="field" type="date" value={endRT} onChange={(e) => setEndRT(e.target.value)} />

          <label className="field-label">Mois écoulés (calculé)</label>
          <input className="field" value={monthsElapsed} readOnly />

          <label className="field-label">Choisir modèle de récupération (ou laisser % manuel)</label>
          <div className="model-list">
            {Object.entries(RECOVERY).map(([k, v]) => (
              <div key={k} className="model-row">
                <label>
                  <input type="radio" name="model" checked={selectedModel === k} onChange={() => setSelectedModel(k)} />
                  {" "}{v.title}
                </label>
                <button className="info" onClick={() => setTooltip(tooltip === k ? null : k)}>i</button>
                {tooltip === k && <div className="tooltip">{v.text}</div>}
              </div>
            ))}
          </div>

          <div className="result-box highlight">
            <div className="result-line"><span className="result-label">BED restante :</span> <strong>{bedRemaining || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">EQD2 restante :</span> <strong>{eqd2Remaining || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">Dose physique restante :</span> <strong>{physRemaining || "-"}</strong> Gy</div>
          </div>

          <label className="field-label">OU BED restante autorisée (saisie manuelle)</label>
          <input className="field" value={manualBEDRemaining} onChange={(e) => setManualBEDRemaining(e.target.value)} />
        </section>

        {/* STEP 4 */}
        <section className="step">
          <h2 className="step-title">4. Dose maximale par fraction autorisée</h2>

          <label className="field-label">Nombre de fractions prévues</label>
          <input className="field" value={newFractions} onChange={(e) => setNewFractions(e.target.value)} />

          <div className="result-box">
            <div className="result-line"><span className="result-label">Dose max par fraction :</span> <strong>{dpfMax || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">Dose totale max possible :</span> <strong>{totalMaxPossible || "-"}</strong> Gy</div>
          </div>
        </section>

        {/* actions */}
        <div className="actions-row">
          <label className="field-label">Titre (ex : Chiasma)</label>
          <input className="field" value={titleSave} onChange={(e) => setTitleSave(e.target.value)} />

          <div className="buttons">
            <button className="btn primary" onClick={handleSave}>💾 Sauvegarder</button>
            <button className="btn" onClick={handleResetAll}>♻️ Réinitialiser</button>
            <button className="btn" onClick={handleExportPDF}>📄 Export PDF</button>
          </div>
        </div>

        <div className="history">
          <h3 className="history-title">📘 Résultats enregistrés</h3>
          {history.length === 0 ? <div className="hint">Aucun résultat enregistré</div> :
            history.slice().reverse().map((h, i) => (
              <div key={i} className="history-item">
                <strong>{h.title}</strong> — {h.organ || "-"}<br />
                BED restante: {h.bedRemaining || "-"} Gy — EQD2: {h.eqd2Remaining || "-"} Gy
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
