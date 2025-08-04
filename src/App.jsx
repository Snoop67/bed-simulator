import React, { useState } from "react";
import jsPDF from "jspdf";

function App() {
  const [totalDose, setTotalDose] = useState("");
  const [fractions, setFractions] = useState("");
  const [dosePerFraction, setDosePerFraction] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [manualBedAllowed, setManualBedAllowed] = useState("");

  const handleAutoCalculate = () => {
    const td = parseFloat(totalDose.replace(",", "."));
    const fr = parseFloat(fractions.replace(",", "."));
    const dpf = parseFloat(dosePerFraction.replace(",", "."));

    if (!dosePerFraction && td && fr) {
      const calc = td / fr;
      if (!isNaN(calc)) setDosePerFraction(calc.toFixed(2));
    }

    if (!fractions && td && dpf) {
      const calc = td / dpf;
      if (!isNaN(calc)) setFractions(Math.round(calc).toString());
    }
  };

  const bedAllowed = () => {
    const d = parseFloat(dosePerFraction);
    const n = parseFloat(fractions);
    const ab = parseFloat(alphaBeta);
    if (!isNaN(d) && !isNaN(n) && !isNaN(ab)) {
      return (n * d * (1 + d / ab)).toFixed(2);
    }
    return "";
  };

  const eqd2Allowed = () => {
    if (bedAllowed() && alphaBeta) {
      return (parseFloat(bedAllowed()) / (1 + 2 / parseFloat(alphaBeta))).toFixed(2);
    }
    return "";
  };

  const [usedDose, setUsedDose] = useState("");
  const [usedFractions, setUsedFractions] = useState("");
  const [usedAlphaBeta, setUsedAlphaBeta] = useState("");
  const [usedDosePerFraction, setUsedDosePerFraction] = useState("");

  const handleAutoUsed = () => {
    const td = parseFloat(usedDose.replace(",", "."));
    const fr = parseFloat(usedFractions.replace(",", "."));
    if (td && fr) {
      const calc = td / fr;
      if (!isNaN(calc)) setUsedDosePerFraction(calc.toFixed(2));
    }
  };

  const bedUsed = () => {
    const d = parseFloat(usedDosePerFraction);
    const n = parseFloat(usedFractions);
    const ab = parseFloat(usedAlphaBeta);
    if (!isNaN(d) && !isNaN(n) && !isNaN(ab)) {
      return (n * d * (1 + d / ab)).toFixed(2);
    }
    return "";
  };

  const eqd2Used = () => {
    if (bedUsed() && usedAlphaBeta) {
      return (parseFloat(bedUsed()) / (1 + 2 / parseFloat(usedAlphaBeta))).toFixed(2);
    }
    return "";
  };

  const [forgetPercent, setForgetPercent] = useState("");
  const [manualBedRemaining, setManualBedRemaining] = useState("");

  const bedRemaining = () => {
    const total = manualBedAllowed || bedAllowed();
    const used = bedUsed();
    const forget = parseFloat(forgetPercent || 0);
    if (total && used) {
      const result = parseFloat(total) - parseFloat(used) * (1 - forget / 100);
      return result.toFixed(2);
    }
    return "";
  };

  const eqd2Remaining = () => {
    const bed = bedRemaining();
    if (bed && newAlphaBeta) {
      return (parseFloat(bed) / (1 + 2 / parseFloat(newAlphaBeta))).toFixed(2);
    }
    return "";
  };

  const [newFractions, setNewFractions] = useState("");
  const [newAlphaBeta, setNewAlphaBeta] = useState("");

  const maxDosePerFraction = () => {
    const bed = manualBedRemaining || bedRemaining();
    const n = parseFloat(newFractions);
    const ab = parseFloat(newAlphaBeta);
    if (bed && n && ab) {
      const B = parseFloat(bed);
      const d = (-ab + Math.sqrt(ab * ab + 4 * B * ab / n)) / 2;
      return d.toFixed(2);
    }
    return "";
  };

  const maxTotalDose = () => {
    if (maxDosePerFraction() && newFractions) {
      return (parseFloat(maxDosePerFraction()) * parseFloat(newFractions)).toFixed(2);
    }
    return "";
  };

  const [organName, setOrganName] = useState("");
  const [history, setHistory] = useState([]);

  const saveResult = () => {
    const result = {
      organ: organName || `Organe ${history.length + 1}`,
      bed: bedRemaining(),
      eqd2: eqd2Remaining(),
      maxPerFraction: maxDosePerFraction(),
      maxTotal: maxTotalDose(),
    };
    setHistory([...history, result]);
    setOrganName("");
  };

  const resetFields = () => {
    setTotalDose("");
    setFractions("");
    setDosePerFraction("");
    setAlphaBeta("");
    setManualBedAllowed("");
    setUsedDose("");
    setUsedFractions("");
    setUsedAlphaBeta("");
    setUsedDosePerFraction("");
    setForgetPercent("");
    setManualBedRemaining("");
    setNewFractions("");
    setNewAlphaBeta("");
    setOrganName("");
  };

  const generatePDF = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text("BED Simulator - Résultats", 20, 20);
    pdf.setFontSize(12);

    history.forEach((entry, i) => {
      const top = 30 + i * 30;
      pdf.text(`🟦 ${entry.organ}`, 20, top);
      pdf.text(`BED restante : ${entry.bed} Gy`, 30, top + 8);
      pdf.text(`EQD2 restante : ${entry.eqd2} Gy`, 30, top + 16);
      pdf.text(`Dose max/fraction : ${entry.maxPerFraction} Gy`, 30, top + 24);
      pdf.text(`Dose totale max : ${entry.maxTotal} Gy`, 30, top + 32);
    });

    pdf.save("bed-simulator.pdf");
  };

  return (
    <div className="container">
      <h1>BED Simulator</h1>

      <h2>1. BED totale autorisée</h2>
      <label>Dose totale (Gy)</label>
      <input value={totalDose} onChange={(e) => setTotalDose(e.target.value)} onBlur={handleAutoCalculate} />
      <label>Nombre de fractions</label>
      <input value={fractions} onChange={(e) => setFractions(e.target.value)} onBlur={handleAutoCalculate} />
      <label>Dose par fraction (Gy)</label>
      <input value={dosePerFraction} onChange={(e) => setDosePerFraction(e.target.value)} onBlur={handleAutoCalculate} />
      <label>Alpha/Beta (Gy)</label>
      <input value={alphaBeta} onChange={(e) => setAlphaBeta(e.target.value)} />

      <div className="result">
        BED autorisée : {bedAllowed()} Gy<br />
        EQD2 autorisée : {eqd2Allowed()} Gy
      </div>

      <label>OU BED autorisée (saisie manuelle)</label>
      <input value={manualBedAllowed} onChange={(e) => setManualBedAllowed(e.target.value)} />

      <h2>2. BED utilisée</h2>
      <label>Dose totale reçue (Gy)</label>
      <input value={usedDose} onChange={(e) => setUsedDose(e.target.value)} onBlur={handleAutoUsed} />
      <label>Nombre de fractions</label>
      <input value={usedFractions} onChange={(e) => setUsedFractions(e.target.value)} onBlur={handleAutoUsed} />
      <label>Alpha/Beta (Gy)</label>
      <input value={usedAlphaBeta} onChange={(e) => setUsedAlphaBeta(e.target.value)} />
      <label>Dose par fraction (calculée)</label>
      <input value={usedDosePerFraction} readOnly />

      <div className="result">
        BED utilisée : {bedUsed()} Gy<br />
        EQD2 utilisée : {eqd2Used()} Gy
      </div>

      <h2>3. BED restante autorisée</h2>
      <label>% de dose d’oubli</label>
      <input value={forgetPercent} onChange={(e) => setForgetPercent(e.target.value)} />

      <div className="result">
        BED restante : {bedRemaining()} Gy<br />
        EQD2 restante : {eqd2Remaining()} Gy
      </div>

      <label>OU BED restante autorisée (saisie manuelle)</label>
      <input value={manualBedRemaining} onChange={(e) => setManualBedRemaining(e.target.value)} />

      <h2>4. Dose maximale par fraction autorisée</h2>
      <label>Nombre de fractions prévues</label>
      <input value={newFractions} onChange={(e) => setNewFractions(e.target.value)} />
      <label>Alpha/Beta (Gy)</label>
      <input value={newAlphaBeta} onChange={(e) => setNewAlphaBeta(e.target.value)} />

      <div className="result">
        Dose max par fraction : {maxDosePerFraction()} Gy<br />
        Dose totale max possible : {maxTotalDose()} Gy
      </div>

      <label>Nom de l’organe à sauvegarder</label>
      <input value={organName} onChange={(e) => setOrganName(e.target.value)} />
      <button onClick={saveResult}>💾 Sauvegarder</button>
      <button onClick={resetFields}>♻️ Réinitialiser</button>
      <button onClick={generatePDF}>📄 Générer PDF</button>

      <h2>📘 Résultats enregistrés</h2>
      {history.map((entry, i) => (
        <div className="history" key={i}>
          <strong>{entry.organ}</strong><br />
          BED restante : {entry.bed} Gy<br />
          EQD2 restante : {entry.eqd2} Gy<br />
          Dose max/fraction : {entry.maxPerFraction} Gy<br />
          Dose totale max : {entry.maxTotal} Gy
        </div>
      ))}
    </div>
  );
}

export default App;
