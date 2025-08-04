import React, { useState } from "react";
import jsPDF from "jspdf";

function App() {
  const [totalDose, setTotalDose] = useState("");
  const [fractions, setFractions] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [usedBed, setUsedBed] = useState("");
  const [forgetPercent, setForgetPercent] = useState("");
  const [manualRemainingBed, setManualRemainingBed] = useState("");
  const [remainingFractions, setRemainingFractions] = useState("");
  const [organName, setOrganName] = useState("");
  const [history, setHistory] = useState([]);

  const dpf = Number(totalDose) / Number(fractions) || 0;
  const bed = fractions && dpf && alphaBeta
    ? fractions * dpf * (1 + dpf / alphaBeta)
    : "";

  const eqd2 = bed && alphaBeta
    ? bed / (1 + 2 / alphaBeta)
    : "";

  const forgetRatio = Number(forgetPercent) / 100;
  const realUsedBed = usedBed ? usedBed * (1 - forgetRatio) : 0;
  const autoRemainingBed = bed ? bed - realUsedBed : "";
  const finalRemainingBed = manualRemainingBed || autoRemainingBed;

  const dosePerFractionMax = (finalRemainingBed && remainingFractions && alphaBeta)
    ? solveMaxDosePerFraction(finalRemainingBed, remainingFractions, alphaBeta)
    : "";

  const totalDoseMax = dosePerFractionMax && remainingFractions
    ? dosePerFractionMax * remainingFractions
    : "";

  function solveMaxDosePerFraction(BED, n, ab) {
    // Solve: BED = n * d * (1 + d / ab)
    const a = n / ab;
    const b = n;
    const c = -BED;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return "";
    return ((-b + Math.sqrt(discriminant)) / (2 * a)).toFixed(2);
  }

  const handleReset = () => {
    setTotalDose("");
    setFractions("");
    setAlphaBeta("");
    setUsedBed("");
    setForgetPercent("");
    setManualRemainingBed("");
    setRemainingFractions("");
    setOrganName("");
  };

  const handleSave = () => {
    if (!organName) return;
    const entry = {
      organ: organName,
      bed: finalRemainingBed,
      dpf: dosePerFractionMax,
      total: totalDoseMax,
    };
    setHistory([...history, entry]);
    setOrganName("");
  };

  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BED Simulator - Résultats multi-organes", 10, 20);
    doc.setFontSize(12);
    history.forEach((item, i) => {
      const y = 30 + i * 20;
      doc.text(
        `${item.organ} : BED restante ${item.bed} Gy, dose max/fraction ${item.dpf} Gy, dose totale max ${item.total} Gy`,
        10,
        y
      );
    });
    doc.save("bed-simulator-resultats.pdf");
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial", color: "#003366" }}>
      <h1>BED Simulator</h1>

      <section>
        <h2>1. BED totale autorisée</h2>
        <input placeholder="Dose totale (Gy)" value={totalDose} onChange={(e) => setTotalDose(e.target.value)} />
        <input placeholder="Nombre de fractions" value={fractions} onChange={(e) => setFractions(e.target.value)} />
        <input placeholder="Alpha/Beta" value={alphaBeta} onChange={(e) => setAlphaBeta(e.target.value)} />
        {dpf > 0 && <p>Dose par fraction calculée : <strong>{dpf.toFixed(2)} Gy</strong></p>}
        {bed && <p>BED : <strong>{bed.toFixed(2)} Gy</strong></p>}
        {eqd2 && <p>EQD2 : <strong>{eqd2.toFixed(2)} Gy</strong></p>}
      </section>

      <section>
        <h2>2. BED utilisée (1re irradiation)</h2>
        <input placeholder="BED déjà utilisée (Gy)" value={usedBed} onChange={(e) => setUsedBed(e.target.value)} />
        <input placeholder="% de dose d’oubli (5 à 50%)" value={forgetPercent} onChange={(e) => setForgetPercent(e.target.value)} />
      </section>

      <section>
        <h2>3. BED restante autorisée</h2>
        <input placeholder="BED restante autorisée (manuel)" value={manualRemainingBed} onChange={(e) => setManualRemainingBed(e.target.value)} />
        {finalRemainingBed && <p>BED restante calculée : <strong>{Number(finalRemainingBed).toFixed(2)} Gy</strong></p>}
      </section>

      <section>
        <h2>4. Dose max par fraction autorisée</h2>
        <input placeholder="Nombre de fractions prévues" value={remainingFractions} onChange={(e) => setRemainingFractions(e.target.value)} />
        {dosePerFractionMax && <p>Dose max/fraction : <strong>{dosePerFractionMax} Gy</strong></p>}
        {totalDoseMax && <p>Dose totale max : <strong>{totalDoseMax} Gy</strong></p>}
      </section>

      <section>
        <h2>🧠 Historique multi-organes</h2>
        <input placeholder="Nom de l’organe (ex: Chiasma)" value={organName} onChange={(e) => setOrganName(e.target.value)} />
        <button onClick={handleSave}>📌 Enregistrer</button>
        <ul>
          {history.map((entry, i) => (
            <li key={i}>
              <strong>{entry.organ}</strong> : BED {entry.bed} Gy, {entry.dpf} Gy/fraction, {entry.total} Gy total
            </li>
          ))}
        </ul>
      </section>

      <div style={{ marginTop: 20 }}>
        <button onClick={handleReset}>🔄 Réinitialiser les champs</button>
        <button onClick={handleExport} style={{ marginLeft: 10 }}>📄 Générer PDF</button>
      </div>
    </div>
  );
}

export default App;
