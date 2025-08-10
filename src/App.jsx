// src/App.jsx
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";

const OAR_LIST = [
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
  { name: "Peau (réactions tardives)", ab: 3 },
  { name: "Peau (réactions aiguës)", ab: 10 },
  { name: "Os cortical", ab: 1.75 },
  { name: "Tête fémorale", ab: 2 },
  { name: "Testicules", ab: 2 },
  { name: "Ovaires", ab: 3 },
];

function parseNum(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return parseFloat(s);
}

export default function App() {
  // OAR / alpha-beta
  const [selectedOAR, setSelectedOAR] = useState("");
  const [alphaBeta, setAlphaBeta] = useState(""); // valeur unique, étape 1 -> utilisée partout
  // option blocage doses < 1.8 (appliquée aux étapes 1 & 3 calculs)
  const [blockBelow18, setBlockBelow18] = useState(false);

  // -------- Étape 1 - BED totale autorisée --------
  const [totalDoseAuth, setTotalDoseAuth] = useState("");
  const [fractionsAuth, setFractionsAuth] = useState("");
  const [dosePerFractionAuth, setDosePerFractionAuth] = useState("");
  const [manualBedAllowed, setManualBedAllowed] = useState(""); // option saisie manuelle BED totale autorisée

  const [bedAllowed, setBedAllowed] = useState("");
  const [eqd2Allowed, setEqd2Allowed] = useState("");
  const [physDoseAllowed, setPhysDoseAllowed] = useState("");

  // -------- Étape 2 - BED utilisée --------
  const [totalDoseUsed, setTotalDoseUsed] = useState("");
  const [fractionsUsed, setFractionsUsed] = useState("");
  const [dosePerFractionUsed, setDosePerFractionUsed] = useState("");

  const [bedUsed, setBedUsed] = useState("");
  const [eqd2Used, setEqd2Used] = useState("");
  const [physDoseUsed, setPhysDoseUsed] = useState("");

  // -------- Étape 3 - Oubli --------
  const [forgetPercent, setForgetPercent] = useState(""); // valeur manuelle ou calculée via modèle
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recoveryModel, setRecoveryModel] = useState("");

  const [durationMonths, setDurationMonths] = useState(0);
  const [bedRemaining, setBedRemaining] = useState("");
  const [eqd2Remaining, setEqd2Remaining] = useState("");
  const [physDoseRemaining, setPhysDoseRemaining] = useState("");

  // -------- Historique / sauvegarde --------
  const [organTitle, setOrganTitle] = useState("");
  const [history, setHistory] = useState([]);

  // ---- Sélection OAR met α/β par défaut ----
  useEffect(() => {
    if (selectedOAR) {
      const found = OAR_LIST.find((o) => o.name === selectedOAR);
      if (found) setAlphaBeta(String(found.ab));
    }
  }, [selectedOAR]);

  // ---- Auto-calcul (étape 1) : dose par fraction <-> nb fractions ----
  // On calcule uniquement si les deux champs utiles sont présents et l'autre vide.
  // (Prudence pour éviter recalc automatique intempestif)
  useEffect(() => {
    const td = parseNum(totalDoseAuth);
    const fr = parseNum(fractionsAuth);
    const dpf = parseNum(dosePerFractionAuth);

    // si total + fractions et pas dosePerFraction -> calcule dosePerFraction
    if (!isNaN(td) && !isNaN(fr) && (dosePerFractionAuth === "" || dosePerFractionAuth === null)) {
      const calc = td / fr;
      if (isFinite(calc)) setDosePerFractionAuth(calc.toFixed(2));
      return;
    }

    // si total + dosePerFraction et pas fractions -> calcule fractions
    if (!isNaN(td) && !isNaN(dpf) && (fractionsAuth === "" || fractionsAuth === null)) {
      const calc = td / dpf;
      if (isFinite(calc)) setFractionsAuth(Math.round(calc).toString());
      return;
    }
    // sinon ne change rien (on laisse l'utilisateur contrôler)
  }, [totalDoseAuth, fractionsAuth, dosePerFractionAuth]);

  // ---- Calcul BED/EQD2/Dose physique autorisée (étape 1) ----
  useEffect(() => {
    // priorité : si user a saisi manualBedAllowed → on l'utilise
    const manualBed = parseNum(manualBedAllowed);
    const td = parseNum(totalDoseAuth);
    let fr = parseNum(fractionsAuth);
    let dpf = parseNum(dosePerFractionAuth);
    const ab = parseNum(alphaBeta);

    if (!isNaN(manualBed)) {
      // si user a donné une BED manuelle, on calcule EQD2 à partir de ça
      if (!isNaN(ab) && ab !== 0) {
        const eqd2 = manualBed / (1 + 2 / ab);
        setBedAllowed(manualBed.toFixed ? manualBed.toFixed(2) : String(manualBed));
        setEqd2Allowed(eqd2.toFixed(2));
      } else {
        setBedAllowed(manualBed.toFixed ? manualBed.toFixed(2) : String(manualBed));
        setEqd2Allowed("");
      }
      // dose physique autorisée : si on a dpf & fr, on affiche dpf*fr; sinon try td or blank
      if (!isNaN(dpf) && !isNaN(fr)) {
        setPhysDoseAllowed((dpf * fr).toFixed(2));
      } else if (!isNaN(td)) {
        setPhysDoseAllowed(td.toFixed(2));
      } else {
        setPhysDoseAllowed("");
      }
      return;
    }

    // sinon, on calcule à partir des doses/fractions + alphaBeta
    if (!isNaN(dpf)) {
      if (blockBelow18 && dpf < 1.8) dpf = 1.8;
    }
    if (isNaN(fr) && !isNaN(td) && !isNaN(dpf)) {
      // si nb fractions manquant, on le calcule mais *sans* forcer l'utilisateur si td/dpf mal saisis
      fr = Math.round(td / dpf);
    }
    if (!isNaN(dpf) && !isNaN(fr) && !isNaN(ab) && ab !== 0) {
      const bed = fr * dpf * (1 + dpf / ab); // classique BED = n*d*(1 + d/αβ)
      const eqd2 = bed / (1 + 2 / ab);
      setBedAllowed(bed.toFixed(2));
      setEqd2Allowed(eqd2.toFixed(2));
      setPhysDoseAllowed((dpf * fr).toFixed(2));
    } else {
      // clear if incomplete
      setBedAllowed("");
      setEqd2Allowed("");
      setPhysDoseAllowed("");
    }
  }, [totalDoseAuth, fractionsAuth, dosePerFractionAuth, alphaBeta, manualBedAllowed, blockBelow18]);

  // ---- Auto-calcul étape 2 : dose/fraction si total + fractions fournis (pour l'utilisateur) ----
  useEffect(() => {
    const td = parseNum(totalDoseUsed);
    const fr = parseNum(fractionsUsed);
    const dpf = parseNum(dosePerFractionUsed);

    if (!isNaN(td) && !isNaN(fr) && (dosePerFractionUsed === "" || dosePerFractionUsed === null)) {
      const calc = td / fr;
      if (isFinite(calc)) setDosePerFractionUsed(calc.toFixed(2));
    }
  }, [totalDoseUsed, fractionsUsed]);

  // ---- Calcul BED/EQD2/Dose physique utilisée (étape 2) ----
  useEffect(() => {
    let dpf = parseNum(dosePerFractionUsed);
    let fr = parseNum(fractionsUsed);
    const td = parseNum(totalDoseUsed);
    const ab = parseNum(alphaBeta);

    if (isNaN(dpf) && !isNaN(td) && !isNaN(fr) && fr !== 0) {
      dpf = td / fr;
      setDosePerFractionUsed(dpf.toFixed(2));
    }

    if (!isNaN(dpf)) {
      if (blockBelow18 && dpf < 1.8) dpf = 1.8;
    }

    if (!isNaN(dpf) && !isNaN(fr) && !isNaN(ab) && ab !== 0) {
      const bed = fr * dpf * (1 + dpf / ab);
      const eqd2 = bed / (1 + 2 / ab);
      setBedUsed(bed.toFixed(2));
      setEqd2Used(eqd2.toFixed(2));
      setPhysDoseUsed((dpf * fr).toFixed(2));
    } else {
      setBedUsed("");
      setEqd2Used("");
      setPhysDoseUsed("");
    }
  }, [totalDoseUsed, fractionsUsed, dosePerFractionUsed, alphaBeta, blockBelow18]);

  // ---- Calcul durée (en mois) entre startDate et endDate ----
  useEffect(() => {
    if (!startDate || !endDate) {
      setDurationMonths(0);
      return;
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
      setDurationMonths(0);
      return;
    }
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    setDurationMonths(months);
  }, [startDate, endDate]);

  // ---- Déterminer % oubli automatiquement selon modèle et durée ----
  useEffect(() => {
    if (!recoveryModel) return;
    const m = durationMonths;
    let p = 0;
    if (recoveryModel === "Paradis") {
      if (m <= 3) p = 0;
      else if (m <= 6) p = 10;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (recoveryModel === "Nieder") {
      if (m <= 3) p = 0;
      else if (m === 4) p = 17;
      else if (m === 5) p = 25;
      else if (m === 6) p = 28;
      else if (m === 7) p = 33;
      else if (m === 8) p = 37;
      else if (m === 9) p = 40;
      else if (m === 10) p = 45;
      else p = 50;
    } else if (recoveryModel === "Abusaris") {
      if (m < 6) p = 0;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (recoveryModel === "Noel") {
      if (m <= 12) p = 5;
      else if (m <= 24) p = 10;
      else if (m <= 36) p = 15;
      else if (m <= 48) p = 20;
      else if (m <= 60) p = 25;
      else if (m <= 72) p = 30;
      else if (m <= 84) p = 35;
      else if (m <= 96) p = 40;
      else if (m <= 108) p = 45;
      else p = 50;
    }
    setForgetPercent(String(p));
  }, [recoveryModel, durationMonths]);

  // ---- Calcul BED restante (étape 3) ----
  useEffect(() => {
    // on calcule bedRemaining = bedAllowed - bedUsed * (1 - forgetPercent/100)
    const bAllowed = parseNum(bedAllowed);
    const bUsed = parseNum(bedUsed);
    const forget = parseNum(forgetPercent);
    const ab = parseNum(alphaBeta);

    if (!isNaN(bAllowed) && !isNaN(bUsed)) {
      const remaining = bAllowed - bUsed * (1 - (isNaN(forget) ? 0 : forget / 100));
      // guard negative
      const rem = remaining < 0 ? 0 : remaining;
      setBedRemaining(rem.toFixed(2));
      if (!isNaN(ab) && ab !== 0) {
        const eqd2 = rem / (1 + 2 / ab);
        setEqd2Remaining(eqd2.toFixed(2));
      } else {
        setEqd2Remaining("");
      }
      // Dose physique restante: calcul simple = physAllowed - physUsed*(1 - forget)
      const physAllowedN = parseNum(physDoseAllowed);
      const physUsedN = parseNum(physDoseUsed);
      if (!isNaN(physAllowedN) && !isNaN(physUsedN)) {
        const physRem = physAllowedN - physUsedN * (1 - (isNaN(forget) ? 0 : forget / 100));
        setPhysDoseRemaining(physRem < 0 ? "0.00" : physRem.toFixed(2));
      } else {
        setPhysDoseRemaining("");
      }
    } else {
      setBedRemaining("");
      setEqd2Remaining("");
      setPhysDoseRemaining("");
    }
  }, [bedAllowed, bedUsed, forgetPercent, eqd2Allowed, physDoseAllowed, physDoseUsed, alphaBeta]);

  // ---- Sauvegarde résultats (historique) ----
  function saveCurrentResult() {
    const title = organTitle && organTitle.trim() !== "" ? organTitle.trim() : selectedOAR || `Result ${history.length + 1}`;
    const r = {
      title,
      timestamp: new Date().toISOString(),
      bedAllowed,
      eqd2Allowed,
      physDoseAllowed,
      bedUsed,
      eqd2Used,
      physDoseUsed,
      forgetPercent,
      bedRemaining,
      eqd2Remaining,
      physDoseRemaining,
    };
    setHistory((h) => [...h, r]);
    setOrganTitle("");
  }

  // ---- Export PDF (simple) ----
  function exportPDF() {
    const doc = new jsPDF({ unit: "pt" });
    doc.setFontSize(14);
    doc.text("BED Simulator - Rapport", 40, 40);
    let y = 70;
    history.forEach((r, i) => {
      doc.setFontSize(12);
      doc.text(`${i + 1}. ${r.title} (${new Date(r.timestamp).toLocaleString()})`, 40, y);
      y += 18;
      doc.setFontSize(10);
      doc.text(`BED autorisée: ${r.bedAllowed} Gy  | EQD2 autorisée: ${r.eqd2Allowed} Gy  | Dose phys.: ${r.physDoseAllowed} Gy`, 50, y);
      y += 14;
      doc.text(`BED utilisée: ${r.bedUsed} Gy  | EQD2 utilisée: ${r.eqd2Used} Gy  | Dose phys.: ${r.physDoseUsed} Gy`, 50, y);
      y += 14;
      doc.text(`% oubli: ${r.forgetPercent}  | BED restante: ${r.bedRemaining} Gy  | EQD2 restante: ${r.eqd2Remaining} Gy  | Dose phys. restante: ${r.physDoseRemaining} Gy`, 50, y);
      y += 26;
      if (y > 700) {
        doc.addPage();
        y = 40;
      }
    });
    doc.save("bed_simulator_report.pdf");
  }

  // ---- Petite UI simple (tu peux ajouter tes classes CSS) ----
  return (
    <div style={{ maxWidth: 980, margin: "20px auto", fontFamily: "Arial, Helvetica, sans-serif", color: "#0b3d91" }}>
      <h1>BED Simulator</h1>

      {/* OAR selection et alpha/beta global */}
      <div style={{ marginBottom: 12 }}>
        <label>Organe (OAR)</label>
        <select value={selectedOAR} onChange={(e) => setSelectedOAR(e.target.value)} style={{ width: "100%", padding: 8 }}>
          <option value="">-- Choisir (ou entrer α/β manuellement) --</option>
          {OAR_LIST.map((o) => (
            <option key={o.name} value={o.name}>
              {o.name} (α/β = {o.ab})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label>α/β (Gy) — valeur globale utilisée dans tous les calculs</label>
        <input type="number" step="0.1" value={alphaBeta} onChange={(e) => setAlphaBeta(e.target.value)} style={{ width: "100%", padding: 8 }} />
      </div>

      <label style={{ display: "block", marginBottom: 8 }}>
        <input type="checkbox" checked={blockBelow18} onChange={(e) => setBlockBelow18(e.target.checked)} />{" "}
        Bloquer les doses par fraction &lt; 1.8 Gy (appliqué aux doses autorisées & utilisées)
      </label>

      <hr />

      {/* Étape 1 */}
      <section style={{ marginBottom: 20 }}>
        <h2>1) BED totale autorisée</h2>
        <div style={{ marginBottom: 8 }}>
          <label>Dose totale (Gy)</label>
          <input type="number" value={totalDoseAuth} onChange={(e) => setTotalDoseAuth(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Nombre de fractions</label>
          <input type="number" value={fractionsAuth} onChange={(e) => setFractionsAuth(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Dose par fraction (Gy)</label>
          <input type="number" step="0.01" value={dosePerFractionAuth} onChange={(e) => setDosePerFractionAuth(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>

        <div style={{ marginTop: 8 }}>
          <label>OU BED totale autorisée (saisie manuelle)</label>
          <input type="number" value={manualBedAllowed} onChange={(e) => setManualBedAllowed(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>

        <div style={{ marginTop: 10, padding: 12, background: "#eef6ff", borderLeft: "4px solid #0b3d91", borderRadius: 6 }}>
          <strong>Résultats (autorisé)</strong><br />
          BED autorisée: {bedAllowed || "-"} Gy<br />
          EQD2 autorisée: {eqd2Allowed || "-"} Gy<br />
          Dose physique (dpf × n): {physDoseAllowed || "-"} Gy
        </div>

        <div style={{ marginTop: 10 }}>
          <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &lt; 6 Gy</a>
          <br />
          <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose par fraction &gt; 6 Gy</a>
        </div>
      </section>

      {/* Étape 2 */}
      <section style={{ marginBottom: 20 }}>
        <h2>2) BED utilisée</h2>
        <div style={{ marginBottom: 8 }}>
          <label>Dose totale reçue (Gy)</label>
          <input type="number" value={totalDoseUsed} onChange={(e) => setTotalDoseUsed(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Nombre de fractions</label>
          <input type="number" value={fractionsUsed} onChange={(e) => setFractionsUsed(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Dose par fraction (Gy)</label>
          <input type="number" step="0.01" value={dosePerFractionUsed} onChange={(e) => setDosePerFractionUsed(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ marginTop: 10, padding: 12, background: "#eef6ff", borderLeft: "4px solid #0b3d91", borderRadius: 6 }}>
          <strong>Résultats (utilisée)</strong><br />
          BED utilisée: {bedUsed || "-"} Gy<br />
          EQD2 utilisée: {eqd2Used || "-"} Gy<br />
          Dose physique (dpf × n): {physDoseUsed || "-"} Gy
        </div>
      </section>

      {/* Étape 3 */}
      <section style={{ marginBottom: 20 }}>
        <h2>3) BED restante — % d'oubli</h2>
        <div style={{ marginBottom: 8 }}>
          <label>% d'oubli (manuel ou via modèle)</label>
          <input type="number" value={forgetPercent} onChange={(e) => setForgetPercent(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Date début RT</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Date fin RT</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <label>Modèle de récupération</label>
          <select value={recoveryModel} onChange={(e) => setRecoveryModel(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">-- Choisir --</option>
            <option value="Paradis">Paradis (0–3m:0%, 4–6m:10%, 7–12m:25%, ≥12m:50%)</option>
            <option value="Nieder">Nieder (progressif 4→11+ mois)</option>
            <option value="Abusaris">Abusaris (0&lt;6m:0%, 6–12m:25%, &gt;12m:50%)</option>
            <option value="Noel">Noël (récupération lente — % par années)</option>
          </select>
        </div>

        <div style={{ marginTop: 10, padding: 12, background: "#eef6ff", borderLeft: "4px solid #0b3d91", borderRadius: 6 }}>
          <strong>Résultats (restant)</strong><br />
          Durée entre RT: {durationMonths} mois<br />
          BED restante: {bedRemaining || "-"} Gy<br />
          EQD2 restante: {eqd2Remaining || "-"} Gy<br />
          Dose physique restante (approx): {physDoseRemaining || "-"} Gy
        </div>
      </section>

      {/* Sauvegarde + historique + PDF */}
      <section style={{ marginBottom: 40 }}>
        <h2>Enregistrer / Historique</h2>
        <div style={{ marginBottom: 8 }}>
          <label>Titre (ex: Chiasma)</label>
          <input type="text" value={organTitle} onChange={(e) => setOrganTitle(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={saveCurrentResult}>💾 Sauvegarder</button>
          <button onClick={() => { setHistory([]); }}>🗑️ Vider historique</button>
          <button onClick={exportPDF}>📄 Export PDF (historique)</button>
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Historique (dernier 10 affichés)</h3>
          <ul>
            {history.slice(-10).map((r, i) => (
              <li key={i}>
                <strong>{r.title}</strong> — BED rest: {r.bedRemaining || "-"} Gy — EQD2: {r.eqd2Remaining || "-"} Gy
              </li>
            ))}
            {history.length === 0 && <li>Aucun résultat sauvegardé</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
