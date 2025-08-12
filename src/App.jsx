import React, { useEffect, useState } from "react";
import "./index.css";

/*
  BED Simulator - App.jsx
  - Liste complète d'OAR avec α/β préremplis
  - α/β manuel sur la même ligne
  - STEP1: dose totale / n / dpf (bouton "Calculer le champ manquant")
  - STEP2: calcul dpf uniquement au onBlur (corrige le bug 1.9 -> 19)
  - STEP3: modèles de récupération (Paradis, Nieder, Abusaris, Noël)
  - STEP4: résolution quadratique pour dpf max
  - Historique (titre saisi uniquement)
  - Nouvelle section "Conversion Vx%" (plusieurs lignes possibles)
*/

const OARS = [
  { name: "", ab: "" },
  { name: "Moelle épinière", ab: 2 },
  { name: "Tronc cérébral", ab: 2 },
  { name: "Nerf optique", ab: 2 },
  { name: "Chiasma optique", ab: 2 },
  { name: "Rétine", ab: 2 },
  { name: "Cristallin", ab: 1.25 }, // approx 1–1.5 -> 1.25
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
  { name: "Foie", ab: 2.75 }, // 2.5–3 -> 2.75
  { name: "Reins", ab: 1.5 },
  { name: "Vessie", ab: 3 },
  { name: "Rectum", ab: 3 },
  { name: "Intestin grêle", ab: 3 },
  { name: "Côlon", ab: 3 },
  { name: "Peau (réactions tardives)", ab: 3 },
  { name: "Peau (réactions aiguës)", ab: 10 },
  { name: "Os cortical", ab: 1.75 }, // ≈1.5–2 -> 1.75
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
≥ 12 mois : 50 %`,
  },
  nieder: {
    title: "Nieder et al. : récupération rapide",
    text: `0–3 mois : 0 %
4 mois : 17 %
5 mois : 25 %
6 mois : 28 %
7 mois : 33 %
8 mois : 37 %
9 mois : 40 %
10 mois : 45 %
≥ 11 mois : 50%`,
  },
  abusaris: {
    title: "Abusaris et al. : récupération rapide",
    text: `<6 mois : 0%
6–12 mois : 25%
>12 mois : 50%`,
  },
  noel: {
    title: "Noël et al. : récupération lente",
    text: `0 % avant 1 an
Puis 5% par an jusqu'à 10 ans
≥ 10 ans : 50%`,
  },
};

function parseNum(v) {
  if (v === "" || v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

export default function App() {
  // STEP1: authorized
  const [organ, setOrgan] = useState("");
  const [manualAB, setManualAB] = useState(""); // input text for alpha/beta
  const [alphaBeta, setAlphaBeta] = useState(""); // used value (string)
  const [doseTotalAuth, setDoseTotalAuth] = useState("");
  const [nAuth, setNAuth] = useState("");
  const [dpfAuth, setDpfAuth] = useState("");
  const [manualBEDAuth, setManualBEDAuth] = useState("");

  // STEP2: used
  const [doseTotalUsed, setDoseTotalUsed] = useState("");
  const [nUsed, setNUsed] = useState("");
  const [dpfUsed, setDpfUsed] = useState("");
  const [manualBEDUsed, setManualBEDUsed] = useState("");

  // STEP3: forget
  const [forgetPercent, setForgetPercent] = useState("");
  const [startRT, setStartRT] = useState("");
  const [endRT, setEndRT] = useState("");
  const [monthsElapsed, setMonthsElapsed] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [tooltipKey, setTooltipKey] = useState(null);
  const [manualBEDRemaining, setManualBEDRemaining] = useState("");

  // STEP4 / options / results / history
  const [newFractions, setNewFractions] = useState("");
  const [blockBelow18, setBlockBelow18] = useState(false);

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

  const [titleSave, setTitleSave] = useState("");
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("bed_history_v3");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Vx conversion rows
  const [vxRows, setVxRows] = useState([
    { id: Date.now(), seuil: "", fracInit: "", nNew: "", dNew: "" },
  ]);

  // keep alphaBeta in sync: prefer manualAB if set, otherwise prefill from OARS
  useEffect(() => {
    const found = OARS.find((o) => o.name === organ);
    if (manualAB && manualAB !== "") {
      setAlphaBeta(manualAB);
    } else if (found && found.ab !== "") {
      setAlphaBeta(String(found.ab));
    } else {
      setAlphaBeta("");
    }
  }, [organ, manualAB]);

  // STEP1: calculate missing (button)
  function calculateMissingStep1() {
    const TD = parseNum(doseTotalAuth);
    const N = parseNum(nAuth);
    const DPF = parseNum(dpfAuth);

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

  // auto-calc of dpfAuth when total & n provided but keep editable
  useEffect(() => {
    const TD = parseNum(doseTotalAuth);
    const N = parseNum(nAuth);
    if (!isNaN(TD) && !isNaN(N) && (dpfAuth === "" || dpfAuth == null)) {
      setDpfAuth((TD / N).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doseTotalAuth, nAuth]);

  // STEP1 compute BED/EQD2/physAllowed
  useEffect(() => {
    const ab = parseNum(alphaBeta);
    let dpf = parseNum(dpfAuth);
    const n = parseNum(nAuth);
    const tot = parseNum(doseTotalAuth);

    if (isNaN(dpf) && !isNaN(tot) && !isNaN(n) && n !== 0) {
      dpf = tot / n;
    }
    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = parseNum(manualBEDAuth);
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

  // ---------- STEP2 fix: calculate missing fields only onBlur ----------
  function calculateMissingStep2() {
    const TD = parseNum(doseTotalUsed);
    const N = parseNum(nUsed);
    const DPF = parseNum(dpfUsed);

    if (!isNaN(TD) && !isNaN(N) && (dpfUsed === "" || dpfUsed == null)) {
      setDpfUsed((TD / N).toFixed(2));
      return;
    }
    if (!isNaN(TD) && !isNaN(DPF) && (nUsed === "" || nUsed == null)) {
      setNUsed(String(Math.round(TD / DPF)));
      return;
    }
    if (!isNaN(N) && !isNaN(DPF) && (doseTotalUsed === "" || doseTotalUsed == null)) {
      setDoseTotalUsed((N * DPF).toFixed(2));
      return;
    }
  }

  // STEP2 compute bedUsed/eqd2Used/physUsed
  useEffect(() => {
    const ab = parseNum(alphaBeta);
    let dpf = parseNum(dpfUsed);
    const n = parseNum(nUsed);
    const tot = parseNum(doseTotalUsed);

    if (isNaN(dpf) && !isNaN(tot) && !isNaN(n) && n !== 0) {
      dpf = tot / n;
    }
    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = parseNum(manualBEDUsed);
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

  // dates -> monthsElapsed
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

  // recovery model -> set forgetPercent automatically
  useEffect(() => {
    if (!selectedModel || monthsElapsed === "") return;
    const m = parseNum(monthsElapsed);
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
      else {
        const years = Math.floor(m / 12);
        const percent = Math.min(50, Math.max(0, 5 * years));
        p = percent;
      }
    }
    if (!isNaN(p)) setForgetPercent(String(p));
  }, [selectedModel, monthsElapsed]);

  // compute remaining BED/EQD2/phys (STEP3)
  useEffect(() => {
    const ba = parseNum(manualBEDAuth) || parseNum(bedAllowed);
    const bu = parseNum(bedUsed);
    const forg = parseNum(forgetPercent);
    if (isNaN(ba) || isNaN(bu)) {
      setBedRemaining("");
      setEqd2Remaining("");
      setPhysRemaining("");
      return;
    }
    // remaining = BA - BU * (1 - forg/100)
    const remaining = ba - bu * (1 - (isNaN(forg) ? 0 : forg / 100));
    const rem = remaining < 0 ? 0 : remaining;
    setBedRemaining(rem.toFixed(2));
    const ab = parseNum(alphaBeta);
    if (!isNaN(ab) && ab !== 0) setEqd2Remaining((rem / (1 + 2 / ab)).toFixed(2));
    else setEqd2Remaining("");
    const pa = parseNum(physAllowed);
    const pu = parseNum(physUsed);
    if (!isNaN(pa) && !isNaN(pu)) {
      const physRem = pa - pu * (1 - (isNaN(forg) ? 0 : forg / 100));
      setPhysRemaining((physRem < 0 ? 0 : physRem).toFixed(2));
    } else setPhysRemaining("");
  }, [bedAllowed, manualBEDAuth, bedUsed, physAllowed, physUsed, forgetPercent, alphaBeta]);

  // STEP4: solve quadratic for dpfMax
  useEffect(() => {
    const B = parseNum(manualBEDRemaining) || parseNum(bedRemaining);
    const n = parseNum(newFractions);
    const ab = parseNum(alphaBeta);
    if (isNaN(B) || isNaN(n) || n <= 0 || isNaN(ab) || ab === 0) {
      setDpfMax("");
      setTotalMaxPossible("");
      return;
    }
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

  // persist history
  useEffect(() => {
    try {
      localStorage.setItem("bed_history_v3", JSON.stringify(history));
    } catch {}
  }, [history]);

  // Save to history
  function handleSave() {
    const title = (titleSave && titleSave.trim()) || organ || "Sans titre";
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
      newFractions,
      createdAt: new Date().toISOString(),
    };
    setHistory((h) => [...h, rec]);
    setTitleSave("");
  }

  function handleResetAll() {
    // keep history in localStorage? user wanted reset all earlier -> we clear everything except history
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
    setTooltipKey(null);
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

  // Vx helpers
  function addVxRow() {
    setVxRows((r) => [...r, { id: Date.now() + Math.random(), seuil: "", fracInit: "", nNew: "", dNew: "" }]);
  }
  function removeVxRow(id) {
    setVxRows((r) => r.filter((row) => row.id !== id));
  }
  function updateVxRow(id, field, value) {
    setVxRows((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }
  function computeVxForRow(row) {
    const ab = parseNum(alphaBeta);
    const seuil = parseNum(row.seuil);
    const fracInit = parseNum(row.fracInit);
    const dNew = parseNum(row.dNew);
    const nNew = parseNum(row.nNew);
    if (isNaN(ab) || isNaN(seuil) || isNaN(fracInit) || isNaN(dNew)) return null;
    // BED_ref = D_seuil * (1 + d1 / ab)   (since D_seuil = n1*d1)
    const bedRef = seuil * (1 + fracInit / ab);
    // New total dose equivalent in new fractionation with dose per fraction dNew:
    const Dnew_total = bedRef / (1 + dNew / ab);
    // If nNew provided, compute required d_per_fraction (Dnew_total / nNew)
    const d_per_frac_needed = !isNaN(nNew) && nNew > 0 ? Dnew_total / nNew : null;
    return {
      Dnew_total: Number.isFinite(Dnew_total) ? Dnew_total : null,
      d_per_frac_needed: d_per_frac_needed && Number.isFinite(d_per_frac_needed) ? d_per_frac_needed : null,
    };
  }

  // small helper for shown AB placeholder
  const shownAB = () => {
    if (manualAB && manualAB !== "") return manualAB;
    const f = OARS.find((o) => o.name === organ);
    return f ? f.ab : "";
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
              {OARS.map((o) => <option key={o.name} value={o.name}>{o.name || "-- Sélectionner --"}</option>)}
            </select>

            <div style={{ width: 160 }}>
              <label className="field-label small">α/β (Gy)</label>
              <input className="field small" placeholder={shownAB() ? `prérempli ${shownAB()}` : "α/β (Gy)"} value={manualAB} onChange={(e) => setManualAB(e.target.value)} />
            </div>
          </div>

          <label className="field-label">Dose totale (Gy)</label>
          <input className="field" value={doseTotalAuth} onChange={(e) => setDoseTotalAuth(e.target.value)} />

          <label className="field-label">Nombre de fractions</label>
          <input className="field" value={nAuth} onChange={(e) => setNAuth(e.target.value)} />

          <label className="field-label">Dose par fraction (Gy)</label>
          <input className="field" value={dpfAuth} onChange={(e) => setDpfAuth(e.target.value)} />

          <div className="controls-row">
            <button className="btn primary" onClick={calculateMissingStep1}>⚙️ Calculer le champ manquant</button>
            <label className="inline-checkbox">
              <input type="checkbox" checked={blockBelow18} onChange={(e) => setBlockBelow18(e.target.checked)} />
              Bloquer doses &lt; 1.8 Gy
            </label>
          </div>

          <div className="links">
            <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &lt; 6 Gy</a><br />
            <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &gt; 6 Gy</a>
          </div>

          <div className="result-box highlight">
            <div className="result-line"><span className="result-label">BED autorisée :</span> <strong>{bedAllowed || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">EQD2 autorisée :</span> <strong>{eqd2Allowed || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">Dose physique autorisée :</span> <strong>{physAllowed || "-"}</strong> Gy</div>
          </div>

          <label className="field-label">OU BED autorisée (saisie manuelle)</label>
          <input className="field" value={manualBEDAuth} onChange={(e) => setManualBEDAuth(e.target.value)} />
        </section>

        {/* STEP 2 */}
        <section className="step">
          <h2 className="step-title">2. BED utilisée</h2>

          <label className="field-label">Dose totale reçue (Gy)</label>
          <input
            className="field"
            value={doseTotalUsed}
            onChange={(e) => setDoseTotalUsed(e.target.value)}
            onBlur={calculateMissingStep2}
          />

          <label className="field-label">Nombre de fractions</label>
          <input
            className="field"
            value={nUsed}
            onChange={(e) => setNUsed(e.target.value)}
            onBlur={calculateMissingStep2}
          />

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

          <div className="row-dates">
            <div style={{ flex: 1 }}>
              <label className="field-label">Date début RT</label>
              <input className="field" type="date" value={startRT} onChange={(e) => setStartRT(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Date fin RT</label>
              <input className="field" type="date" value={endRT} onChange={(e) => setEndRT(e.target.value)} />
            </div>
            <div style={{ width: 140 }}>
              <label className="field-label">Mois écoulés</label>
              <input className="field" value={monthsElapsed} readOnly />
            </div>
          </div>

          <label className="field-label">Choisir modèle de récupération (ou laisser % manuel)</label>
          <div className="model-list">
            {Object.entries(RECOVERY).map(([k, v]) => (
              <div key={k} className="model-row">
                <label>
                  <input type="radio" name="model" checked={selectedModel === k} onChange={() => setSelectedModel(k)} />
                  {" "}{v.title}
                </label>
                <button className="info" onClick={() => setTooltipKey(tooltipKey === k ? null : k)}>i</button>
                {tooltipKey === k && <div className="tooltip">{v.text}</div>}
              </div>
            ))}
          </div>

          <div className="result-box highlight">
            <div className="result-line"><span className="result-label">BED restante :</span> <strong>{bedRemaining || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">EQD2 restante :</span> <strong>{eqd2Remaining || "-"}</strong> Gy</div>
            <div className="result-line"><span className="result-label">Dose physique restante :</span> <strong>{physRemaining || "-"}</strong> Gy</div>
          </div>

          <label className="field-label">OU BED restante (saisie manuelle)</label>
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

        {/* Actions */}
        <div className="actions-row">
          <label className="field-label">Titre (ex : Chiasma)</label>
          <input className="field" value={titleSave} onChange={(e) => setTitleSave(e.target.value)} placeholder="Titre (sera affiché tel quel)" />

          <div className="buttons">
            <button className="btn primary" onClick={handleSave}>💾 Sauvegarder</button>
            <button className="btn" onClick={handleResetAll}>♻️ Réinitialiser</button>
          </div>
        </div>

        {/* History */}
        <div className="history">
          <h3 className="history-title">📘 Résultats enregistrés</h3>
          {history.length === 0 ? <div className="hint">Aucun résultat enregistré</div> :
            history.slice().reverse().map((h, i) => (
              <div key={i} className="history-item">
                <div style={{ fontWeight: 800 }}>{h.title}</div>
                <div>BED restante: {h.bedRemaining || "-"} Gy — EQD2 restante: {h.eqd2Remaining || "-"} Gy</div>
                <div>Dose physique restante: {h.physRemaining || "-"} Gy</div>
                <div>Dose max / fraction : {h.dpfMax || "-"} Gy — Nb fractions planifiées : {h.newFractions || "-"}</div>
              </div>
            ))}
        </div>

        {/* Conversion Vx% module */}
        <section className="step">
          <h2 className="step-title">Conversion Vx% — équivalent physique</h2>
          <div className="hint small">α/β utilisé : <strong>{alphaBeta || "-"}</strong> (repris depuis l'étape 1)</div>

          {vxRows.map((row) => {
            const res = computeVxForRow(row);
            return (
              <div key={row.id} className="vx-row">
                <input className="field vx" type="number" placeholder="Dose seuil initiale (Gy)" value={row.seuil} onChange={(e) => updateVxRow(row.id, "seuil", e.target.value)} />
                <input className="field vx" type="number" placeholder="Fractionnement initial (d₁ Gy)" value={row.fracInit} onChange={(e) => updateVxRow(row.id, "fracInit", e.target.value)} />
                <input className="field vx" type="number" placeholder="Nouveau n (optionnel)" value={row.nNew} onChange={(e) => updateVxRow(row.id, "nNew", e.target.value)} />
                <input className="field vx" type="number" placeholder="Nouveau d (d₂ Gy)" value={row.dNew} onChange={(e) => updateVxRow(row.id, "dNew", e.target.value)} />
                <div className="vx-result">
                  {res && res.Dnew_total ? (
                    <>
                      <div><strong>Équiv. totale :</strong> {res.Dnew_total.toFixed(2)} Gy</div>
                      {res.d_per_frac_needed && <div><strong>Si n={row.nNew} → d/f nécessaire :</strong> {res.d_per_frac_needed.toFixed(2)} Gy</div>}
                    </>
                  ) : <div className="muted">Remplir seuil, d₁ et d₂</div>}
                </div>
                <button className="vx-remove" onClick={() => removeVxRow(row.id)}>✕</button>
              </div>
            );
          })}

          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={addVxRow}>+ Ajouter contrainte (Vx)</button>
          </div>
        </section>

      </div>
    </div>
  );
}
