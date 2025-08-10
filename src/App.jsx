import React, { useState, useEffect } from "react";

const organAlphaBeta = {
  "Moelle épinière": 2,
  "Tronc cérébral": 2,
  "Nerf optique": 2,
  "Chiasma optique": 2,
  "Rétine": 2,
  "Cristallin": 1.2,
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
  "Os cortical": 1.75,
  "Tête fémorale": 2,
  "Testicules": 2,
  "Ovaires": 3,
};

export default function App() {
  const [alphaBeta, setAlphaBeta] = useState(2);
  const [selectedOrgan, setSelectedOrgan] = useState("");
  const [blockBelow18, setBlockBelow18] = useState(false);

  // BED autorisée
  const [totalDoseAuth, setTotalDoseAuth] = useState("");
  const [fractionsAuth, setFractionsAuth] = useState("");
  const [dosePerFractionAuth, setDosePerFractionAuth] = useState("");

  // BED utilisée
  const [totalDoseUsed, setTotalDoseUsed] = useState("");
  const [fractionsUsed, setFractionsUsed] = useState("");
  const [dosePerFractionUsed, setDosePerFractionUsed] = useState("");

  // Pourcentage d'oubli
  const [forgetPercent, setForgetPercent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recoveryModel, setRecoveryModel] = useState("");

  // Résultats
  const [bedAuth, setBedAuth] = useState(0);
  const [eqd2Auth, setEqd2Auth] = useState(0);
  const [physDoseAuth, setPhysDoseAuth] = useState(0);

  const [bedUsed, setBedUsed] = useState(0);
  const [eqd2Used, setEqd2Used] = useState(0);
  const [physDoseUsed, setPhysDoseUsed] = useState(0);

  const [bedRemaining, setBedRemaining] = useState(0);
  const [eqd2Remaining, setEqd2Remaining] = useState(0);
  const [physDoseRemaining, setPhysDoseRemaining] = useState(0);

  // Calcul automatique dose/fraction si possible
  useEffect(() => {
    if (totalDoseAuth && fractionsAuth && !dosePerFractionAuth) {
      setDosePerFractionAuth((parseFloat(totalDoseAuth) / parseFloat(fractionsAuth)).toFixed(2));
    }
  }, [totalDoseAuth, fractionsAuth]);

  useEffect(() => {
    if (totalDoseUsed && fractionsUsed && !dosePerFractionUsed) {
      setDosePerFractionUsed((parseFloat(totalDoseUsed) / parseFloat(fractionsUsed)).toFixed(2));
    }
  }, [totalDoseUsed, fractionsUsed]);

  // Calcul BED/EQD2/Dose physique autorisée
  useEffect(() => {
    if (dosePerFractionAuth && totalDoseAuth && alphaBeta) {
      let dpf = parseFloat(dosePerFractionAuth);
      if (blockBelow18 && dpf < 1.8) dpf = 1.8;
      const bed = parseFloat(totalDoseAuth) * (1 + dpf / alphaBeta);
      const eqd2 = bed / (1 + 2 / alphaBeta);
      setBedAuth(bed.toFixed(2));
      setEqd2Auth(eqd2.toFixed(2));
      setPhysDoseAuth((dpf * (totalDoseAuth / dpf)).toFixed(2));
    }
  }, [dosePerFractionAuth, totalDoseAuth, alphaBeta, blockBelow18]);

  // Calcul BED/EQD2/Dose physique utilisée
  useEffect(() => {
    if (dosePerFractionUsed && totalDoseUsed && alphaBeta) {
      let dpf = parseFloat(dosePerFractionUsed);
      if (blockBelow18 && dpf < 1.8) dpf = 1.8;
      const bed = parseFloat(totalDoseUsed) * (1 + dpf / alphaBeta);
      const eqd2 = bed / (1 + 2 / alphaBeta);
      setBedUsed(bed.toFixed(2));
      setEqd2Used(eqd2.toFixed(2));
      setPhysDoseUsed((dpf * (totalDoseUsed / dpf)).toFixed(2));
    }
  }, [dosePerFractionUsed, totalDoseUsed, alphaBeta, blockBelow18]);

  // Durée en mois
  const durationMonths = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += end.getMonth();
    return months <= 0 ? 0 : months;
  };

  // Calcul % d'oubli selon modèle choisi
  useEffect(() => {
    if (!recoveryModel || !durationMonths()) return;
    let months = durationMonths();
    let percent = 0;
    if (recoveryModel === "Paradis") {
      if (months <= 3) percent = 0;
      else if (months <= 6) percent = 10;
      else if (months <= 12) percent = 25;
      else percent = 50;
    }
    if (recoveryModel === "Nieder") {
      if (months <= 3) percent = 0;
      else if (months === 4) percent = 17;
      else if (months === 5) percent = 25;
      else if (months === 6) percent = 28;
      else if (months === 7) percent = 33;
      else if (months === 8) percent = 37;
      else if (months === 9) percent = 40;
      else if (months === 10) percent = 45;
      else percent = 50;
    }
    if (recoveryModel === "Abusaris") {
      if (months < 6) percent = 0;
      else if (months <= 12) percent = 25;
      else percent = 50;
    }
    if (recoveryModel === "Noël") {
      if (months === 12) percent = 5;
      else if (months === 24) percent = 10;
      else if (months === 36) percent = 15;
      else if (months === 48) percent = 20;
      else if (months === 60) percent = 25;
      else if (months === 72) percent = 30;
      else if (months === 84) percent = 35;
      else if (months === 96) percent = 40;
      else if (months === 108) percent = 45;
      else if (months >= 120) percent = 50;
    }
    setForgetPercent(percent);
  }, [recoveryModel, startDate, endDate]);

  // Calcul BED restante
  useEffect(() => {
    if (bedAuth && bedUsed) {
      const remaining = parseFloat(bedAuth) - (parseFloat(bedUsed) * (1 - forgetPercent / 100));
      const eqd2rem = remaining / (1 + 2 / alphaBeta);
      setBedRemaining(remaining.toFixed(2));
      setEqd2Remaining(eqd2rem.toFixed(2));
      setPhysDoseRemaining(((eqd2rem * (1 + 2 / alphaBeta))).toFixed(2));
    }
  }, [bedAuth, bedUsed, forgetPercent, alphaBeta]);

  return (
    <div style={{ padding: "20px", color: "blue" }}>
      <h1>BED Simulator</h1>

      {/* Case blocage <1.8Gy */}
      <label>
        <input type="checkbox" checked={blockBelow18} onChange={(e) => setBlockBelow18(e.target.checked)} />
        Bloquer les doses par fraction < 1.8 Gy (autorisé/disponible)
      </label>

      {/* Sélection OAR */}
      <div>
        <label>Organe à risque :</label>
        <select
          value={selectedOrgan}
          onChange={(e) => {
            setSelectedOrgan(e.target.value);
            setAlphaBeta(organAlphaBeta[e.target.value] || "");
          }}
        >
          <option value="">-- Choisir --</option>
          {Object.keys(organAlphaBeta).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
      <div>
        <label>α/β :</label>
        <input type="number" value={alphaBeta} onChange={(e) => setAlphaBeta(e.target.value)} />
      </div>

      {/* Étape 1 : BED autorisée */}
      <h2>BED totale autorisée</h2>
      <div>
        <label>Dose totale (Gy):</label>
        <input type="number" value={totalDoseAuth} onChange={(e) => setTotalDoseAuth(e.target.value)} />
      </div>
      <div>
        <label>Nombre de fractions:</label>
        <input type="number" value={fractionsAuth} onChange={(e) => setFractionsAuth(e.target.value)} />
      </div>
      <div>
        <label>Dose par fraction (Gy):</label>
        <input type="number" value={dosePerFractionAuth} onChange={(e) => setDosePerFractionAuth(e.target.value)} />
      </div>
      <p>
        <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose/fraction &lt; 6 Gy</a><br />
        <a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes Recorad : dose/fraction &gt; 6 Gy</a>
      </p>
      <p>BED autorisée : {bedAuth} Gy</p>
      <p>EQD2 autorisée : {eqd2Auth} Gy</p>
      <p>Dose physique : {physDoseAuth} Gy</p>

      {/* Étape 2 : BED utilisée */}
      <h2>BED utilisée</h2>
      <div>
        <label>Dose totale (Gy):</label>
        <input type="number" value={totalDoseUsed} onChange={(e) => setTotalDoseUsed(e.target.value)} />
      </div>
      <div>
        <label>Nombre de fractions:</label>
        <input type="number" value={fractionsUsed} onChange={(e) => setFractionsUsed(e.target.value)} />
      </div>
      <div>
        <label>Dose par fraction (Gy):</label>
        <input type="number" value={dosePerFractionUsed} onChange={(e) => setDosePerFractionUsed(e.target.value)} />
      </div>
      <p>BED utilisée : {bedUsed} Gy</p>
      <p>EQD2 utilisée : {eqd2Used} Gy</p>
      <p>Dose physique : {physDoseUsed} Gy</p>

      {/* Étape 3 : Oubli */}
      <h2>Oubli de dose</h2>
      <label>% d'oubli (manuel):</label>
      <input type="number" value={forgetPercent} onChange={(e) => setForgetPercent(e.target.value)} />
      <div>
        <label>Date début RT :</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div>
        <label>Date fin RT :</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <p>Durée : {durationMonths()} mois</p>
      <label>Modèle :</label>
      <select value={recoveryModel} onChange={(e) => setRecoveryModel(e.target.value)}>
        <option value="">-- Choisir --</option>
        <option value="Paradis">Récupération rapide (Paradis)</option>
        <option value="Nieder">Récupération rapide (Nieder)</option>
        <option value="Abusaris">Récupération rapide (Abusaris)</option>
        <option value="Noël">Récupération lente (Noël)</option>
      </select>

      {/* Résultats */}
      <h2>Résultats</h2>
      <p>BED restante : {bedRemaining} Gy</p>
      <p>EQD2 restante : {eqd2Remaining} Gy</p>
      <p>Dose physique restante : {physDoseRemaining} Gy</p>
    </div>
  );
}
