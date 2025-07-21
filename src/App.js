import React, { useState } from "react";

function bedCalculator(n, d, ab) {
  return n * d * (1 + d / ab);
}

function eqd2Calculator(bed, ab) {
  return bed / (1 + 2 / ab);
}

export default function App() {
  const [n, setN] = useState(5);
  const [d, setD] = useState(3);
  const [ab, setAB] = useState(2);
  const [bed, setBED] = useState(null);
  const [eqd2, setEQD2] = useState(null);

  const calculate = () => {
    const b = bedCalculator(n, d, ab);
    const e = eqd2Calculator(b, ab);
    setBED(b.toFixed(2));
    setEQD2(e.toFixed(2));
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>BED Simulator</h1>
      <label>Nombre de fractions (n) : </label>
      <input type="number" value={n} onChange={(e) => setN(Number(e.target.value))} /><br /><br />
      <label>Dose par fraction (d) : </label>
      <input type="number" value={d} onChange={(e) => setD(Number(e.target.value))} /><br /><br />
      <label>Alpha/Beta : </label>
      <input type="number" value={ab} onChange={(e) => setAB(Number(e.target.value))} /><br /><br />
      <button onClick={calculate}>Calculer</button>
      {bed && <div><p><strong>BED :</strong> {bed}</p><p><strong>EQD2 :</strong> {eqd2}</p></div>}
    </div>
  );
}
