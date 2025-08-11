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

function num(v) {
  if (v === "" || v == null) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

export default function App() {
  const [alphaBeta, setAlphaBeta] = useState("");
  const [manualAlphaBeta, setManualAlphaBeta] = useState("");
  const [n, setN] = useState("");
  const [d, setD] = useState("");
  const [bed, setBed] = useState("");
  const [eqd2, setEqd2] = useState("");
  const [bedUsed, setBedUsed] = useState("");
  const [forgetPercent, setForgetPercent] = useState("");
  const [bedAllowed, setBedAllowed] = useState("");
  const [manualBEDAuth, setManualBEDAuth] = useState("");
  const [dpf, setDpf] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (n && d && (manualAlphaBeta || alphaBeta)) {
      const abVal = num(manualAlphaBeta) || num(alphaBeta);
      const bedVal = n * d * (1 + d / abVal);
      setBed(bedVal.toFixed(2));
      const eqd2Val = bedVal / (1 + 2 / abVal);
      setEqd2(eqd2Val.toFixed(2));
    } else {
      setBed("");
      setEqd2("");
    }
  }, [n, d, alphaBeta, manualAlphaBeta]);

  useEffect(() => {
    if (bedUsed && forgetPercent) {
      const remaining = num(bedUsed) * (1 - num(forgetPercent) / 100);
      setBedAllowed(remaining.toFixed(2));
    }
  }, [bedUsed, forgetPercent]);

  useEffect(() => {
    if (n && (num(manualBEDAuth) || num(bedAllowed)) && (manualAlphaBeta || alphaBeta)) {
      const abVal = num(manualAlphaBeta) || num(alphaBeta);
      const bedAuth = num(manualBEDAuth) || num(bedAllowed);
      const dpfVal = (-abVal + Math.sqrt(abVal ** 2 + 4 * bedAuth / n * abVal)) / 2;
      setDpf(dpfVal.toFixed(2));
    } else {
      setDpf("");
    }
  }, [n, manualBEDAuth, bedAllowed, alphaBeta, manualAlphaBeta]);

  const reset = () => {
    setAlphaBeta("");
    setManualAlphaBeta("");
    setN("");
    setD("");
    setBed("");
    setEqd2("");
    setBedUsed("");
    setForgetPercent("");
    setBedAllowed("");
    setManualBEDAuth("");
    setDpf("");
  };

  const saveHistory = () => {
    if (!n || !d || !bed) return;
    const abVal = num(manualAlphaBeta) || num(alphaBeta);
    const entry = {
      organ: OARS.find((o) => o.ab === alphaBeta)?.name || "",
      ab: abVal,
      n,
      d,
      bed,
      eqd2
    };
    setHistory([entry, ...history.slice(0, 9)]);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("BED Simulator - Résultats", 10, 10);
    history.forEach((h, idx) => {
      doc.text(
        `${idx + 1}. ${h.organ} | α/β=${h.ab} | n=${h.n} | d=${h.d} Gy | BED=${h.bed} | EQD2=${h.eqd2}`,
        10,
        20 + idx * 10
      );
    });
    doc.save("bed-simulator.pdf");
  };

  return (
    <div className="App">
      <h1>BED Simulator</h1>
      <div>
        <label>Organe :</label>
        <select value={alphaBeta} onChange={(e) => setAlphaBeta(e.target.value)}>
          {OARS.map((o) => (
            <option key={o.name} value={o.ab}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>α/β manuel :</label>
        <input
          type="number"
          value={manualAlphaBeta}
          onChange={(e) => setManualAlphaBeta(e.target.value)}
        />
      </div>
      <div>
        <label>Nombre fractions (n) :</label>
        <input type="number" value={n} onChange={(e) => setN(e.target.value)} />
      </div>
      <div>
        <label>Dose / fraction (d en Gy) :</label>
        <input type="number" value={d} onChange={(e) => setD(e.target.value)} />
      </div>
      <div>
        <p>BED = {bed}</p>
        <p>EQD2 = {eqd2}</p>
      </div>
      <div>
        <label>BED utilisée :</label>
        <input type="number" value={bedUsed} onChange={(e) => setBedUsed(e.target.value)} />
      </div>
      <div>
        <label>% oubli :</label>
        <input
          type="number"
          value={forgetPercent}
          onChange={(e) => setForgetPercent(e.target.value)}
        />
      </div>
      <div>
        <p>BED restante = {bedAllowed}</p>
      </div>
      <div>
        <label>BED autorisée manuelle :</label>
        <input
          type="number"
          value={manualBEDAuth}
          onChange={(e) => setManualBEDAuth(e.target.value)}
        />
      </div>
      <div>
        <p>Dose/fraction possible = {dpf}</p>
      </div>
      <div>
        <button onClick={saveHistory}>Sauvegarder</button>
        <button onClick={reset}>Réinitialiser</button>
        <button onClick={exportPDF}>Exporter PDF</button>
      </div>
      <h2>Historique</h2>
      <ul>
        {history.map((h, idx) => (
          <li key={idx}>
            {h.organ} | α/β={h.ab} | n={h.n} | d={h.d} Gy | BED={h.bed} | EQD2={h.eqd2}
          </li>
        ))}
      </ul>
    </div>
  );
}
