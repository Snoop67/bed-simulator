import React, { useState, useEffect } from "react";

function App() {
  const [totalDose, setTotalDose] = useState('');
  const [fractions, setFractions] = useState('');
  const [alphaBeta, setAlphaBeta] = useState('');
  const [manualBedAllowed, setManualBedAllowed] = useState('');
  const [dosePerFraction, setDosePerFraction] = useState('');

  useEffect(() => {
    if (totalDose && !dosePerFraction && fractions) {
      const dpf = parseFloat(totalDose) / parseFloat(fractions);
      setDosePerFraction(dpf.toFixed(2));
    }
  }, [totalDose, fractions]);

  const bedAllowed = () => {
    if (dosePerFraction && fractions && alphaBeta) {
      const d = parseFloat(dosePerFraction);
      const n = parseFloat(fractions);
      const ab = parseFloat(alphaBeta);
      return (n * d * (1 + d / ab)).toFixed(2);
    }
    return '';
  };

  const eqd2Allowed = () => {
    if (bedAllowed() && alphaBeta) {
      return (parseFloat(bedAllowed()) / (1 + 2 / parseFloat(alphaBeta))).toFixed(2);
    }
    return '';
  };

  const [usedDose, setUsedDose] = useState('');
  const [usedFractions, setUsedFractions] = useState('');
  const [usedAlphaBeta, setUsedAlphaBeta] = useState('');
  const [usedDosePerFraction, setUsedDosePerFraction] = useState('');

  useEffect(() => {
    if (usedDose && usedFractions) {
      const dpf = parseFloat(usedDose) / parseFloat(usedFractions);
      setUsedDosePerFraction(dpf.toFixed(2));
    } else {
      setUsedDosePerFraction('');
    }
  }, [usedDose, usedFractions]);

  const bedUsed = () => {
    if (usedDosePerFraction && usedFractions && usedAlphaBeta) {
      const d = parseFloat(usedDosePerFraction);
      const n = parseFloat(usedFractions);
      const ab = parseFloat(usedAlphaBeta);
      return (n * d * (1 + d / ab)).toFixed(2);
    }
    return '';
  };

  const eqd2Used = () => {
    if (bedUsed() && usedAlphaBeta) {
      return (parseFloat(bedUsed()) / (1 + 2 / parseFloat(usedAlphaBeta))).toFixed(2);
    }
    return '';
  };

  const [forgetPercent, setForgetPercent] = useState('');
  const [manualBedRemaining, setManualBedRemaining] = useState('');

  const bedRemaining = () => {
    const total = manualBedAllowed || bedAllowed();
    const used = bedUsed();
    const forget = parseFloat(forgetPercent || 0);
    if (total && used) {
      const result = parseFloat(total) - parseFloat(used) * (1 - forget / 100);
      return result.toFixed(2);
    }
    return '';
  };

  const [newFractions, setNewFractions] = useState('');
  const [newAlphaBeta, setNewAlphaBeta] = useState('');

  const maxDosePerFraction = () => {
    const bed = manualBedRemaining || bedRemaining();
    const n = parseFloat(newFractions);
    const ab = parseFloat(newAlphaBeta);
    if (bed && n && ab) {
      const B = parseFloat(bed);
      const d = (-ab + Math.sqrt(ab * ab + 4 * B * ab / n)) / 2;
      return d.toFixed(2);
    }
    return '';
  };

  const maxTotalDose = () => {
    if (maxDosePerFraction() && newFractions) {
      return (parseFloat(maxDosePerFraction()) * parseFloat(newFractions)).toFixed(2);
    }
    return '';
  };

  return (
    <div className="container">
      <h1>BED Simulator</h1>

      <h2>1. BED totale autorisée</h2>
      <label>Dose totale (Gy)</label>
      <input type="number" value={totalDose} onChange={e => setTotalDose(e.target.value)} />

      <label>Nombre de fractions</label>
      <input type="number" value={fractions} onChange={e => setFractions(e.target.value)} />

      <label>Dose par fraction (Gy)</label>
      <input type="number" value={dosePerFraction} onChange={e => setDosePerFraction(e.target.value)} />

      <label>Alpha/Beta (Gy)</label>
      <input type="number" value={alphaBeta} onChange={e => setAlphaBeta(e.target.value)} />

      <div className="result">
        BED autorisée (Gy) : {bedAllowed()} <br />
        EQD2 autorisée (Gy) : {eqd2Allowed()}
      </div>

      <label>OU BED autorisée (saisie manuelle)</label>
      <input type="number" value={manualBedAllowed} onChange={e => setManualBedAllowed(e.target.value)} />

      <h2>2. BED utilisée</h2>
      <label>Dose totale reçue (Gy)</label>
      <input type="number" value={usedDose} onChange={e => setUsedDose(e.target.value)} />

      <label>Nombre de fractions</label>
      <input type="number" value={usedFractions} onChange={e => setUsedFractions(e.target.value)} />

      <label>Alpha/Beta (Gy)</label>
      <input type="number" value={usedAlphaBeta} onChange={e => setUsedAlphaBeta(e.target.value)} />

      <label>Dose par fraction (calculée)</label>
      <input type="text" value={usedDosePerFraction} readOnly />

      <div className="result">
        BED utilisée (Gy) : {bedUsed()} <br />
        EQD2 utilisée (Gy) : {eqd2Used()}
      </div>

      <h2>3. BED restante autorisée</h2>
      <label>% de dose d’oubli (entre 5 et 50%)</label>
      <input type="number" value={forgetPercent} onChange={e => setForgetPercent(e.target.value)} />

      <div className="result">
        BED restante (calculée) : {bedRemaining()}
        <br />
        EQD2 restante (calculée) : {bedRemaining() && newAlphaBeta ? (parseFloat(bedRemaining()) / (1 + 2 / parseFloat(newAlphaBeta))).toFixed(2) : ""}
      </div>

      <label>OU BED restante autorisée (saisie manuelle)</label>
      <input type="number" value={manualBedRemaining} onChange={e => setManualBedRemaining(e.target.value)} />

      <h2>4. Dose maximale par fraction autorisée</h2>
      <label>Nombre de fractions prévues</label>
      <input type="number" value={newFractions} onChange={e => setNewFractions(e.target.value)} />

      <label>Alpha/Beta (Gy)</label>
      <input type="number" value={newAlphaBeta} onChange={e => setNewAlphaBeta(e.target.value)} />

      <div className="result">
        Dose max par fraction : {maxDosePerFraction()} Gy <br />
        Dose totale max possible : {maxTotalDose()} Gy
      </div>
    </div>
  );
}

export default App;
