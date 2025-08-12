import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "./index.css"; // On pointe sur index.css

export default function App() {
  const [organe, setOrgane] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [doseTotale, setDoseTotale] = useState("");
  const [nbFractions, setNbFractions] = useState("");
  const [doseParFraction, setDoseParFraction] = useState("");
  const [bedAutorisee, setBedAutorisee] = useState("");
  const [eqd2Autorisee, setEqd2Autorisee] = useState("");
  const [dosePhysiqueAutorisee, setDosePhysiqueAutorisee] = useState("");

  const [doseRecue, setDoseRecue] = useState("");
  const [fractionsRecues, setFractionsRecues] = useState("");
  const [doseParFractionRecue, setDoseParFractionRecue] = useState("");
  const [bedUtilisee, setBedUtilisee] = useState("");
  const [eqd2Utilisee, setEqd2Utilisee] = useState("");

  const [bedRestante, setBedRestante] = useState("");
  const [eqd2Restante, setEqd2Restante] = useState("");

  const [nouveauNbFractions, setNouveauNbFractions] = useState("");
  const [doseMaxFraction, setDoseMaxFraction] = useState("");
  const [doseTotaleMax, setDoseTotaleMax] = useState("");

  const [historique, setHistorique] = useState([]);

  // Calcul automatique dose par fraction
  const calculerDoseFraction = () => {
    if (doseTotale && nbFractions) {
      setDoseParFraction((parseFloat(doseTotale) / parseFloat(nbFractions)).toFixed(2));
    }
  };

  const calculerBedEtEqd2Autorisee = () => {
    if (doseParFraction && nbFractions && alphaBeta) {
      const bed = parseFloat(nbFractions) * parseFloat(doseParFraction) * (1 + parseFloat(doseParFraction) / parseFloat(alphaBeta));
      setBedAutorisee(bed.toFixed(2));
      setEqd2Autorisee((bed / (1 + 2 / parseFloat(alphaBeta))).toFixed(2));
      setDosePhysiqueAutorisee(parseFloat(doseTotale).toFixed(2));
    }
  };

  const calculerBedEtEqd2Utilisee = () => {
    if (doseRecue && fractionsRecues && alphaBeta) {
      const dpf = parseFloat(doseRecue) / parseFloat(fractionsRecues);
      setDoseParFractionRecue(dpf.toFixed(2));
      const bedU = parseFloat(fractionsRecues) * dpf * (1 + dpf / parseFloat(alphaBeta));
      setBedUtilisee(bedU.toFixed(2));
      setEqd2Utilisee((bedU / (1 + 2 / parseFloat(alphaBeta))).toFixed(2));
    }
  };

  const calculerBedEtEqd2Restante = () => {
    if (bedAutorisee && bedUtilisee) {
      const bedR = parseFloat(bedAutorisee) - parseFloat(bedUtilisee);
      setBedRestante(bedR.toFixed(2));
      setEqd2Restante((bedR / (1 + 2 / parseFloat(alphaBeta))).toFixed(2));
    }
  };

  const calculerDoseMaxParFraction = () => {
    if (bedRestante && nouveauNbFractions && alphaBeta) {
      const B = parseFloat(bedRestante);
      const n = parseFloat(nouveauNbFractions);
      const ab = parseFloat(alphaBeta);
      const d = (-ab + Math.sqrt(ab * ab + (4 * B * ab) / n)) / 2;
      setDoseMaxFraction(d.toFixed(2));
      setDoseTotaleMax((d * n).toFixed(2));
    }
  };

  const sauvegarderHistorique = () => {
    const entree = {
      organe,
      bedRestante,
      eqd2Restante,
      doseMaxFraction,
      doseTotaleMax
    };
    setHistorique([...historique, entree]);
  };

  const genererPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Rapport BED", 20, 20);
    historique.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.organe}`, 20, 30 + index * 30);
      doc.text(`BED restante: ${item.bedRestante} Gy`, 30, 38 + index * 30);
      doc.text(`EQD2 restante: ${item.eqd2Restante} Gy`, 30, 46 + index * 30);
      doc.text(`Dose max/fraction: ${item.doseMaxFraction} Gy`, 30, 54 + index * 30);
      doc.text(`Dose totale max: ${item.doseTotaleMax} Gy`, 30, 62 + index * 30);
    });
    doc.save("rapport-bed.pdf");
  };

  return (
    <div className="container">
      <h1>Calculateur BED</h1>

      {/* ÉTAPE 1 */}
      <h2>1. BED totale autorisée</h2>
      <div className="inline-fields">
        <label>Organe :</label>
        <input value={organe} onChange={(e) => setOrgane(e.target.value)} />
        <label>Alpha/Beta (Gy) :</label>
        <input value={alphaBeta} onChange={(e) => setAlphaBeta(e.target.value)} />
      </div>

      <label>Dose totale (Gy) :</label>
      <input value={doseTotale} onChange={(e) => setDoseTotale(e.target.value)} />

      <label>Nombre de fractions :</label>
      <input value={nbFractions} onChange={(e) => setNbFractions(e.target.value)} />

      <label>Dose par fraction (Gy) :</label>
      <input value={doseParFraction} onChange={(e) => setDoseParFraction(e.target.value)} />
      <button onClick={calculerDoseFraction}>Calculer dose/fraction</button>

      <button onClick={calculerBedEtEqd2Autorisee}>Calculer BED & EQD2</button>
      <div className="result-box">
        <p>BED autorisée : {bedAutorisee} Gy</p>
        <p>EQD2 autorisée : {eqd2Autorisee} Gy</p>
        <p>Dose physique autorisée : {dosePhysiqueAutorisee} Gy</p>
      </div>

      {/* ÉTAPE 2 */}
      <h2>2. BED utilisée</h2>
      <label>Dose totale reçue (Gy) :</label>
      <input value={doseRecue} onChange={(e) => setDoseRecue(e.target.value)} />

      <label>Nombre de fractions reçues :</label>
      <input value={fractionsRecues} onChange={(e) => setFractionsRecues(e.target.value)} />

      <button onClick={calculerBedEtEqd2Utilisee}>Calculer BED utilisée</button>
      <div className="result-box">
        <p>Dose par fraction reçue : {doseParFractionRecue} Gy</p>
        <p>BED utilisée : {bedUtilisee} Gy</p>
        <p>EQD2 utilisée : {eqd2Utilisee} Gy</p>
      </div>

      {/* ÉTAPE 3 */}
      <h2>3. BED restante autorisée</h2>
      <button onClick={calculerBedEtEqd2Restante}>Calculer BED restante</button>
      <div className="result-box">
        <p>BED restante : {bedRestante} Gy</p>
        <p>EQD2 restante : {eqd2Restante} Gy</p>
      </div>

      {/* ÉTAPE 4 */}
      <h2>4. Dose maximale par fraction autorisée</h2>
      <label>Nombre de fractions prévues :</label>
      <input value={nouveauNbFractions} onChange={(e) => setNouveauNbFractions(e.target.value)} />

      <button onClick={calculerDoseMaxParFraction}>Calculer dose max/fraction</button>
      <div className="result-box">
        <p>Dose max par fraction : {doseMaxFraction} Gy</p>
        <p>Dose totale max possible : {doseTotaleMax} Gy</p>
      </div>

      <button onClick={sauvegarderHistorique}>💾 Sauvegarder résultat</button>
      <button onClick={genererPDF}>📄 Générer PDF</button>

      {/* Historique */}
      <h2>📘 Résultats enregistrés</h2>
      {historique.map((item, index) => (
        <div key={index} className="history-card">
          <strong>{item.organe}</strong>
          <p>BED restante : {item.bedRestante} Gy</p>
          <p>EQD2 restante : {item.eqd2Restante} Gy</p>
          <p>Dose max/fraction : {item.doseMaxFraction} Gy</p>
          <p>Dose totale max : {item.doseTotaleMax} Gy</p>
        </div>
      ))}
    </div>
  );
}
