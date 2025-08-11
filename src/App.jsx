import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./index.css";

export default function App() {
  // STATES
  const [totalDoseAuth, setTotalDoseAuth] = useState("");
  const [numFractionsAuth, setNumFractionsAuth] = useState("");
  const [dosePerFractionAuth, setDosePerFractionAuth] = useState("");
  const [alphaBetaAuth, setAlphaBetaAuth] = useState("");
  const [manualBEDAuth, setManualBEDAuth] = useState("");

  const [totalDoseUsed, setTotalDoseUsed] = useState("");
  const [numFractionsUsed, setNumFractionsUsed] = useState("");
  const [dosePerFractionUsed, setDosePerFractionUsed] = useState("");
  const [alphaBetaUsed, setAlphaBetaUsed] = useState("");
  const [manualBEDUsed, setManualBEDUsed] = useState("");

  const [forgetPercent, setForgetPercent] = useState("");
  const [maxFractions, setMaxFractions] = useState("");
  const [alphaBetaMax, setAlphaBetaMax] = useState("");

  const [results, setResults] = useState([]);
  const [savedResults, setSavedResults] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [showTooltip, setShowTooltip] = useState(null);

  // Récupération lente/rapide — table des modèles
  const recoveryModels = {
    paradis: {
      name: "Paradis et al. : récupération rapide",
      details: `0–3 mois : 0 %\n4–6 mois : 10 %\n7–12 mois : 25 %\n≥ 12 mois : 50 % (plateau)`,
    },
    nieder: {
      name: "Nieder et al. : récupération rapide",
      details: `0 % : 0 à 3 mois\n~17 % : 4 mois\n~25 % : 5 mois\n~28 % : 6 mois\n~33 % : 7 mois\n~37 % : 8 mois\n~40 % : 9 mois\n~45 % : 10 mois\n50 % : 11 à 12 mois et plateau`,
    },
    abusaris: {
      name: "Abusaris et al. : récupération rapide",
      details: `0 % < 6 mois\n25 % : 6–12 mois\n50 % : > 12 mois`,
    },
    noel: {
      name: "Noël et al. : récupération lente",
      details: `0 % avant 1 an\n5 % : 1 an\n~10 % : 2 ans\n~15 % : 3 ans\n~20 % : 4 ans\n~25 % : 5 ans\n~30 % : 6 ans\n~35 % : 7 ans\n~40 % : 8 ans\n~45 % : 9 ans\n50 % : 10 ans et plateau`,
    },
  };

  // Fonction calcul champ manquant (section autorisée)
  const handleCalcMissingAuth = () => {
    if (totalDoseAuth && numFractionsAuth && !dosePerFractionAuth) {
      setDosePerFractionAuth((totalDoseAuth / numFractionsAuth).toFixed(2));
    } else if (totalDoseAuth && dosePerFractionAuth && !numFractionsAuth) {
      setNumFractionsAuth((totalDoseAuth / dosePerFractionAuth).toFixed(2));
    } else if (dosePerFractionAuth && numFractionsAuth && !totalDoseAuth) {
      setTotalDoseAuth((dosePerFractionAuth * numFractionsAuth).toFixed(2));
    }
  };

  // Blocage doses < 1.8 Gy
  const handleDosePerFractionChange = (value, setter) => {
    if (value === "" || parseFloat(value) >= 1.8) {
      setter(value);
    }
  };

  // Tooltip toggle
  const toggleTooltip = (key) => {
    setShowTooltip(showTooltip === key ? null : key);
  };

  return (
    <div className="container">
      <h1 className="title">BED Simulator</h1>

      {/* 1. BED totale autorisée */}
      <section>
        <h2>1. BED totale autorisée</h2>
        <input
          type="number"
          placeholder="Dose totale (Gy)"
          value={totalDoseAuth}
          onChange={(e) => setTotalDoseAuth(e.target.value)}
        />
        <input
          type="number"
          placeholder="Nombre de fractions"
          value={numFractionsAuth}
          onChange={(e) => setNumFractionsAuth(e.target.value)}
        />
        <div className="inline-input">
          <input
            type="number"
            placeholder="Dose par fraction (Gy)"
            value={dosePerFractionAuth}
            onChange={(e) =>
              handleDosePerFractionChange(e.target.value, setDosePerFractionAuth)
            }
          />
          <button onClick={handleCalcMissingAuth}>Calculer le champ manquant</button>
        </div>
        <input
          type="number"
          placeholder="Alpha/Beta (Gy)"
          value={alphaBetaAuth}
          onChange={(e) => setAlphaBetaAuth(e.target.value)}
        />
        <input
          type="number"
          placeholder="OU BED autorisée (saisie manuelle)"
          value={manualBEDAuth}
          onChange={(e) => setManualBEDAuth(e.target.value)}
        />
      </section>

      {/* 2. BED utilisée */}
      <section>
        <h2>2. BED utilisée</h2>
        <input
          type="number"
          placeholder="Dose totale reçue (Gy)"
          value={totalDoseUsed}
          onChange={(e) => setTotalDoseUsed(e.target.value)}
        />
        <input
          type="number"
          placeholder="Nombre de fractions"
          value={numFractionsUsed}
          onChange={(e) => setNumFractionsUsed(e.target.value)}
        />
        <input
          type="number"
          placeholder="Alpha/Beta (Gy)"
          value={alphaBetaUsed}
          onChange={(e) => setAlphaBetaUsed(e.target.value)}
        />
        <input
          type="number"
          placeholder="Dose par fraction (calculée)"
          value={dosePerFractionUsed}
          onChange={(e) =>
            handleDosePerFractionChange(e.target.value, setDosePerFractionUsed)
          }
        />
        <input
          type="number"
          placeholder="OU BED utilisée (saisie manuelle)"
          value={manualBEDUsed}
          onChange={(e) => setManualBEDUsed(e.target.value)}
        />
      </section>

      {/* 3. Modèles de récupération */}
      <section>
        <h2>3. Modèle de récupération</h2>
        {Object.entries(recoveryModels).map(([key, model]) => (
          <div key={key} className="model-line">
            <label>
              <input
                type="radio"
                name="model"
                value={key}
                checked={selectedModel === key}
                onChange={() => setSelectedModel(key)}
              />
              {model.name}
            </label>
            <button
              className="tooltip-btn"
              onClick={() => toggleTooltip(key)}
              title="Voir détails"
            >
              ℹ
            </button>
            {showTooltip === key && (
              <div className="tooltip-box">
                <pre>{model.details}</pre>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
