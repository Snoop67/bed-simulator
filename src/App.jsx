import React, { useState, useEffect } from "react";
import "./index.css";

export default function App() {
  const organes = [
    { nom: "Moelle épinière", alphaBeta: 2 },
    { nom: "Rein", alphaBeta: 1.5 },
    { nom: "Foie", alphaBeta: 2.5 },
    { nom: "Poumon", alphaBeta: 3 },
    { nom: "Peau", alphaBeta: 10 },
    { nom: "Tumeur", alphaBeta: 10 },
  ];

  const [organe, setOrgane] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [doseTotale, setDoseTotale] = useState("");
  const [nbFractions, setNbFractions] = useState("");
  const [doseFraction, setDoseFraction] = useState("");
  const [bedAutorisee, setBedAutorisee] = useState("");
  const [eqd2Autorisee, setEqd2Autorisee] = useState("");
  const [dosePhysiqueAutorisee, setDosePhysiqueAutorisee] = useState("");
  const [pourcentageOublie, setPourcentageOublie] = useState("");
  const [bedRestante, setBedRestante] = useState("");
  const [eqd2Restante, setEqd2Restante] = useState("");
  const [doseFractionMax, setDoseFractionMax] = useState("");
  const [doseFractionDisponible, setDoseFractionDisponible] = useState("");

  // Met α/β auto si organe choisi
  useEffect(() => {
    if (organe) {
      const org = organes.find((o) => o.nom === organe);
      if (org && !alphaBeta) {
        setAlphaBeta(org.alphaBeta);
      }
    }
  }, [organe]);

  // Calcul dose par fraction si total + nb fractions
  useEffect(() => {
    if (doseTotale && nbFractions) {
      setDoseFraction(parseFloat(doseTotale) / parseFloat(nbFractions));
    }
  }, [doseTotale, nbFractions]);

  // Calcul BED autorisée
  useEffect(() => {
    if (doseTotale && nbFractions && alphaBeta) {
      const dpf = parseFloat(doseTotale) / parseFloat(nbFractions);
      const bed = parseFloat(doseTotale) * (1 + dpf / parseFloat(alphaBeta));
      setBedAutorisee(bed.toFixed(2));

      const eqd2 = bed / (1 + 2 / parseFloat(alphaBeta));
      setEqd2Autorisee(eqd2.toFixed(2));
      setDosePhysiqueAutorisee(doseTotale);
    }
  }, [doseTotale, nbFractions, alphaBeta]);

  // Calcul BED & EQD2 restantes
  useEffect(() => {
    if (pourcentageOublie && bedAutorisee) {
      const bedR = bedAutorisee * (1 - parseFloat(pourcentageOublie) / 100);
      setBedRestante(bedR.toFixed(2));

      const eqd2R = bedR / (1 + 2 / parseFloat(alphaBeta));
      setEqd2Restante(eqd2R.toFixed(2));
    }
  }, [pourcentageOublie, bedAutorisee, alphaBeta]);

  // Calcul dose/fraction max & dispo
  useEffect(() => {
    if (nbFractions && bedRestante && alphaBeta) {
      const dpfMax = (parseFloat(bedRestante) / parseFloat(nbFractions)) / (1 + (1 / parseFloat(alphaBeta)));
      setDoseFractionMax(dpfMax.toFixed(2));
      setDoseFractionDisponible(dpfMax.toFixed(2));
    }
  }, [nbFractions, bedRestante, alphaBeta]);

  return (
    <div className="container">
      <h1>Simulateur BED / EQD2</h1>

      {/* Étape 1 */}
      <div className="section">
        <h2>1️⃣ Choix de l'organe et paramètres</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1 }}>
            <label>Organe</label>
            <select value={organe} onChange={(e) => setOrgane(e.target.value)}>
              <option value="">-- Sélectionner --</option>
              {organes.map((o, i) => (
                <option key={i} value={o.nom}>
                  {o.nom}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: "150px" }}>
            <label>α/β (Gy)</label>
            <input
              type="number"
              step="0.1"
              value={alphaBeta}
              onChange={(e) => setAlphaBeta(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Étape 2 */}
      <div className="section">
        <h2>2️⃣ BED autorisée</h2>
        <label>Dose totale (Gy)</label>
        <input type="number" value={doseTotale} onChange={(e) => setDoseTotale(e.target.value)} />

        <label>Nombre de fractions</label>
        <input type="number" value={nbFractions} onChange={(e) => setNbFractions(e.target.value)} />

        {bedAutorisee && (
          <div className="result-box">
            <p><strong>BED autorisée :</strong> {bedAutorisee} Gy</p>
            <p><strong>EQD2 autorisée :</strong> {eqd2Autorisee} Gy</p>
            <p><strong>Dose physique autorisée :</strong> {dosePhysiqueAutorisee} Gy</p>
          </div>
        )}
      </div>

      {/* Étape 3 */}
      <div className="section">
        <h2>3️⃣ Calcul de la dose restante</h2>
        <label>% de dose oubliée</label>
        <input type="number" value={pourcentageOublie} onChange={(e) => setPourcentageOublie(e.target.value)} />

        {bedRestante && (
          <div className="result-box">
            <p><strong>BED restante :</strong> {bedRestante} Gy</p>
            <p><strong>EQD2 restante :</strong> {eqd2Restante} Gy</p>
          </div>
        )}
      </div>

      {/* Étape 4 */}
      <div className="section">
        <h2>4️⃣ Dose par fraction possible</h2>
        {doseFractionMax && (
          <div className="result-box">
            <p><strong>Dose/fraction maximale possible :</strong> {doseFractionMax} Gy</p>
            <p><strong>Dose/fraction disponible :</strong> {doseFractionDisponible} Gy</p>
          </div>
        )}
      </div>
    </div>
  );
}
