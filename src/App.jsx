import React, { useState } from "react";
import "./index.css";

const organAlphaBeta = {
  "Moelle épinière": 2,
  "Tronc cérébral": 2,
  "Nerf optique": 2,
  "Chiasma optique": 2,
  "Rétine": 2,
  "Cristallin": 1.5,
  "Cervelet": 2,
  "Cerveau (parenchyme)": 2,
  "Hippocampe": 2,
  "Glande parotide": 3,
  "Glande sous-maxillaire": 3,
  "Muqueuse orale": 10,
  "Larynx (cartilage)": 3,
  "Larynx (muqueuse)": 10,
  "Œsophage (tardif)": 3,
  "Poumon (tissu normal)": 3,
  "Cœur": 3,
  "Péricarde": 3,
  "Foie": 2.75,
  "Reins": 1.5,
  "Vessie": 3,
  "Rectum": 3,
  "Intestin grêle": 3,
  "Côlon": 3,
  "Peau (réactions tardives)": 3,
  "Peau (réactions aiguës)": 10,
  "Os cortical": 2,
  "Tête fémorale": 2,
  "Testicules": 2,
  "Ovaires": 3,
};

export default function App() {
  const [step1, setStep1] = useState({ doseTot: "", doseFrac: "", nbFrac: "", alphaBeta: "", autoCalc: true });
  const [step2, setStep2] = useState({ doseTot: "", doseFrac: "", nbFrac: "", autoCalc: true });
  const [bedAutorisee, setBedAutorisee] = useState(null);
  const [bedUtilisee, setBedUtilisee] = useState(null);
  const [bedRestante, setBedRestante] = useState(null);
  const [eqd2Restante, setEqd2Restante] = useState(null);
  const [modeleRecup, setModeleRecup] = useState("");
  const [moisEcoules, setMoisEcoules] = useState("");
  const [pourcentRecup, setPourcentRecup] = useState(0);

  const calcDoseFrac = (doseTot, nbFrac) => {
    if (!doseTot || !nbFrac || nbFrac === 0) return "";
    return parseFloat(doseTot) / parseFloat(nbFrac);
  };

  const calcNbFrac = (doseTot, doseFrac) => {
    if (!doseTot || !doseFrac || doseFrac === 0) return "";
    return parseFloat(doseTot) / parseFloat(doseFrac);
  };

  const calcBED = (d, f, ab) => {
    if (!d || !f || !ab) return null;
    return d * (1 + f / ab);
  };

  const calcEQD2 = (bed, ab) => {
    if (!bed || !ab) return null;
    return bed / (1 + 2 / ab);
  };

  const handleStep1Change = (field, value) => {
    let s = { ...step1, [field]: value };

    if (s.autoCalc) {
      if (field === "nbFrac" && s.doseTot && s.nbFrac) {
        s.doseFrac = calcDoseFrac(s.doseTot, s.nbFrac);
      } else if (field === "doseFrac" && s.doseTot && s.doseFrac) {
        s.nbFrac = calcNbFrac(s.doseTot, s.doseFrac);
      }
    }
    setStep1(s);
    if (s.doseTot && s.doseFrac && s.alphaBeta) {
      const bed = calcBED(parseFloat(s.doseTot), parseFloat(s.doseFrac), parseFloat(s.alphaBeta));
      setBedAutorisee(bed);
    }
  };

  const handleStep2Change = (field, value) => {
    let s = { ...step2, [field]: value };

    if (s.autoCalc) {
      if (field === "nbFrac" && s.doseTot && s.nbFrac) {
        s.doseFrac = calcDoseFrac(s.doseTot, s.nbFrac);
      } else if (field === "doseFrac" && s.doseTot && s.doseFrac) {
        s.nbFrac = calcNbFrac(s.doseTot, s.doseFrac);
      }
    }
    setStep2(s);
    if (s.doseTot && s.doseFrac && step1.alphaBeta) {
      const bed = calcBED(parseFloat(s.doseTot), parseFloat(s.doseFrac), parseFloat(step1.alphaBeta));
      setBedUtilisee(bed);
      if (bedAutorisee) {
        const restante = bedAutorisee - bed;
        setBedRestante(restante);
        setEqd2Restante(calcEQD2(restante, parseFloat(step1.alphaBeta)));
      }
    }
  };

  const handleRecupChange = (m) => {
    setMoisEcoules(m);
    let recup = 0;
    const mois = parseInt(m);

    if (modeleRecup === "Paradis") {
      if (mois <= 3) recup = 0;
      else if (mois <= 6) recup = 10;
      else if (mois <= 12) recup = 25;
      else recup = 50;
    } else if (modeleRecup === "Nieder") {
      if (mois <= 3) recup = 0;
      else if (mois === 4) recup = 17;
      else if (mois === 5) recup = 25;
      else if (mois === 6) recup = 28;
      else if (mois === 7) recup = 33;
      else if (mois === 8) recup = 37;
      else if (mois === 9) recup = 40;
      else if (mois === 10) recup = 45;
      else recup = 50;
    } else if (modeleRecup === "Abusaris") {
      if (mois < 6) recup = 0;
      else if (mois < 12) recup = 25;
      else recup = 50;
    } else if (modeleRecup === "Noel") {
      if (mois < 12) recup = 0;
      else if (mois === 12) recup = 5;
      else if (mois === 24) recup = 10;
      else if (mois === 36) recup = 15;
      else if (mois === 48) recup = 20;
      else if (mois === 60) recup = 25;
      else if (mois === 72) recup = 30;
      else if (mois === 84) recup = 35;
      else if (mois === 96) recup = 40;
      else if (mois === 108) recup = 45;
      else recup = 50;
    }

    setPourcentRecup(recup);
    if (bedRestante) {
      const bedAdj = bedRestante * (1 + recup / 100);
      setBedRestante(bedAdj);
      setEqd2Restante(calcEQD2(bedAdj, parseFloat(step1.alphaBeta)));
    }
  };

  return (
    <div className="container">
      <h1>Calculateur BED / EQD2</h1>

      {/* Étape 1 */}
      <section>
        <h2>1️⃣ BED autorisée</h2>
        <select onChange={(e) => handleStep1Change("alphaBeta", organAlphaBeta[e.target.value])}>
          <option value="">-- Choisir un organe --</option>
          {Object.keys(organAlphaBeta).map((org) => (
            <option key={org}>{org}</option>
          ))}
        </select>
        <input type="number" placeholder="Dose totale" value={step1.doseTot} onChange={(e) => handleStep1Change("doseTot", e.target.value)} />
        <input type="number" placeholder="Dose/fraction" value={step1.doseFrac} onChange={(e) => handleStep1Change("doseFrac", e.target.value)} />
        <input type="number" placeholder="Nombre de fractions" value={step1.nbFrac} onChange={(e) => handleStep1Change("nbFrac", e.target.value)} />
        {bedAutorisee && <p>BED autorisée : {bedAutorisee.toFixed(2)} Gy</p>}
      </section>

      {/* Étape 2 */}
      <section>
        <h2>2️⃣ BED utilisée</h2>
        <input type="number" placeholder="Dose totale" value={step2.doseTot} onChange={(e) => handleStep2Change("doseTot", e.target.value)} />
        <input type="number" placeholder="Dose/fraction" value={step2.doseFrac} onChange={(e) => handleStep2Change("doseFrac", e.target.value)} />
        <input type="number" placeholder="Nombre de fractions" value={step2.nbFrac} onChange={(e) => handleStep2Change("nbFrac", e.target.value)} />
        {bedUtilisee && <p>BED utilisée : {bedUtilisee.toFixed(2)} Gy</p>}
      </section>

      {/* Résultats */}
      {bedRestante !== null && (
        <section>
          <h2>3️⃣ Résultats</h2>
          <p>BED restante : {bedRestante.toFixed(2)} Gy</p>
          {eqd2Restante && <p>EQD2 restante : {eqd2Restante.toFixed(2)} Gy</p>}
        </section>
      )}
    </div>
  );
}
