import React, { useState } from "react";
import "./App.css";

export default function App() {
  // --- États ---
  const [organe, setOrgane] = useState("");
  const [customAlphaBeta, setCustomAlphaBeta] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [doseTotaleAutorisee, setDoseTotaleAutorisee] = useState("");
  const [nbFractionsAutorisee, setNbFractionsAutorisee] = useState("");
  const [doseParFractionAutorisee, setDoseParFractionAutorisee] = useState("");
  const [bedAutorisee, setBedAutorisee] = useState("");
  const [eqd2Autorisee, setEqd2Autorisee] = useState("");
  const [doseTotaleUtilisee, setDoseTotaleUtilisee] = useState("");
  const [nbFractionsUtilisee, setNbFractionsUtilisee] = useState("");
  const [doseParFractionUtilisee, setDoseParFractionUtilisee] = useState("");
  const [bedUtilisee, setBedUtilisee] = useState("");
  const [bedRestante, setBedRestante] = useState("");
  const [eqd2Restante, setEqd2Restante] = useState("");
  const [pourcentageRecup, setPourcentageRecup] = useState("");
  const [dpfMax, setDpfMax] = useState("");

  // Table α/β
  const alphaBetaData = {
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
    "Foie": 2.5,
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
    "Ovaires": 3
  };

  // Gestion choix organe
  const handleOrganeChange = (e) => {
    const selected = e.target.value;
    setOrgane(selected);
    if (selected && !customAlphaBeta) {
      setAlphaBeta(alphaBetaData[selected] || "");
    }
  };

  // --- Calcul BED & EQD2 ---
  const calcBED = (doseTot, dpf, ab) => {
    return doseTot * (1 + dpf / ab);
  };

  const calcEQD2 = (bed, ab) => {
    return bed / (1 + 2 / ab);
  };

  // Etape 1 : calcul auto
  const handleAutoriseeChange = () => {
    let dpf = doseParFractionAutorisee;
    let nbf = nbFractionsAutorisee;

    if (doseTotaleAutorisee && dpf && !nbf) {
      nbf = doseTotaleAutorisee / dpf;
      setNbFractionsAutorisee(nbf.toFixed(2));
    } else if (doseTotaleAutorisee && nbf && !dpf) {
      dpf = doseTotaleAutorisee / nbf;
      setDoseParFractionAutorisee(parseFloat(dpf).toFixed(2));
    }

    const ab = customAlphaBeta || alphaBeta;
    if (doseTotaleAutorisee && dpf && ab) {
      const bed = calcBED(parseFloat(doseTotaleAutorisee), parseFloat(dpf), parseFloat(ab));
      const eqd2 = calcEQD2(bed, parseFloat(ab));
      setBedAutorisee(bed.toFixed(2));
      setEqd2Autorisee(eqd2.toFixed(2));
    }
  };

  // Etape 2 : calcul BED utilisée
  const handleUtiliseeChange = () => {
    let dpf = doseParFractionUtilisee;
    let nbf = nbFractionsUtilisee;

    if (doseTotaleUtilisee && dpf && !nbf) {
      nbf = doseTotaleUtilisee / dpf;
      setNbFractionsUtilisee(nbf.toFixed(2));
    } else if (doseTotaleUtilisee && nbf && !dpf) {
      dpf = doseTotaleUtilisee / nbf;
      setDoseParFractionUtilisee(parseFloat(dpf).toFixed(2));
    }

    const ab = customAlphaBeta || alphaBeta;
    if (doseTotaleUtilisee && dpf && ab) {
      const bed = calcBED(parseFloat(doseTotaleUtilisee), parseFloat(dpf), parseFloat(ab));
      setBedUtilisee(bed.toFixed(2));

      if (bedAutorisee) {
        const restante = parseFloat(bedAutorisee) - bed;
        setBedRestante(restante.toFixed(2));
        const eqd2rest = calcEQD2(restante, parseFloat(ab));
        setEqd2Restante(eqd2rest.toFixed(2));
      }
    }
  };

  // Etape 4 : calcul dpf max possible
  const handleCalcDpfMax = () => {
    const ab = customAlphaBeta || alphaBeta;
    if (nbFractionsUtilisee && bedRestante && ab) {
      const dpfmax = (-parseFloat(ab) + Math.sqrt(parseFloat(ab) ** 2 + (4 * parseFloat(ab) * (parseFloat(bedRestante) / parseFloat(nbFractionsUtilisee))))) / 2;
      setDpfMax(dpfmax.toFixed(2));
    }
  };

  return (
    <div className="container">
      <h1>Calculateur BED / EQD2</h1>

      {/* ÉTAPE 1 */}
      <h2>1️⃣ BED autorisée</h2>
      <div className="inline-fields">
        <label>Organe :</label>
        <select value={organe} onChange={handleOrganeChange}>
          <option value="">-- Choisir --</option>
          {Object.keys(alphaBetaData).map((org) => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
        <label>α/β :</label>
        <input
          type="number"
          value={customAlphaBeta}
          onChange={(e) => setCustomAlphaBeta(e.target.value)}
          placeholder={alphaBeta || ""}
        />
      </div>

      <label>Dose totale (Gy)</label>
      <input type="number" value={doseTotaleAutorisee} onChange={(e) => setDoseTotaleAutorisee(e.target.value)} />
      <label>Nombre de fractions</label>
      <input type="number" value={nbFractionsAutorisee} onChange={(e) => setNbFractionsAutorisee(e.target.value)} />
      <label>Dose par fraction (Gy)</label>
      <input type="number" value={doseParFractionAutorisee} onChange={(e) => setDoseParFractionAutorisee(e.target.value)} />

      <button onClick={handleAutoriseeChange}>Calculer BED autorisée</button>

      {bedAutorisee && (
        <div className="result-block">
          <p><strong>BED autorisée :</strong> {bedAutorisee} Gy</p>
          <p><strong>EQD2 autorisée :</strong> {eqd2Autorisee} Gy</p>
          <p><strong>Dose physique autorisée :</strong> {doseTotaleAutorisee} Gy</p>
        </div>
      )}

      {/* ÉTAPE 2 */}
      <h2>2️⃣ BED utilisée</h2>
      <label>Dose totale (Gy)</label>
      <input type="number" value={doseTotaleUtilisee} onChange={(e) => setDoseTotaleUtilisee(e.target.value)} />
      <label>Nombre de fractions</label>
      <input type="number" value={nbFractionsUtilisee} onChange={(e) => setNbFractionsUtilisee(e.target.value)} />
      <label>Dose par fraction (Gy)</label>
      <input type="number" value={doseParFractionUtilisee} onChange={(e) => setDoseParFractionUtilisee(e.target.value)} />

      <button onClick={handleUtiliseeChange}>Calculer BED utilisée</button>

      {bedRestante && (
        <>
          <p><strong>BED restante :</strong> {bedRestante} Gy</p>
          <p><strong>EQD2 restante :</strong> {eqd2Restante} Gy</p>
        </>
      )}

      {/* ÉTAPE 4 */}
      <h2>4️⃣ Dose max par fraction possible</h2>
      <button onClick={handleCalcDpfMax}>Calculer</button>
      {dpfMax && <p><strong>Dose max/fraction possible :</strong> {dpfMax} Gy</p>}
    </div>
  );
}
