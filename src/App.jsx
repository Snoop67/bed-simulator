import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "./index.css";

/**
 * App.jsx
 * Version consolidée : calcul BED/EQD2 + modèles avec tooltips + bouton "Calculer le champ manquant"
 * - Blocage doses < 1.8 Gy pour autorisée/utilisée (case alignée)
 * - Sauvegarde / historique / export PDF
 */

const OAR_ALPHA = {
  "": "",
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
  "Ovaires": 3
};

const RECOVERY_MODELS = {
  paradis: {
    label: "Paradis et al. : récupération rapide",
    details:
`0–3 mois  : 0 %
4–6 mois  : 10 %
7–12 mois : 25 %
≥ 12 mois : 50 % (plateau)`
  },
  nieder: {
    label: "Nieder et al. : récupération rapide",
    details:
`0 % : 0 à 3 mois
~17 % : 4 mois
~25 % : 5 mois
~28 % : 6 mois
~33 % : 7 mois
~37 % : 8 mois
~40 % : 9 mois
~45 % : 10 mois
50 % : 11 à 12 mois et plateau`
  },
  abusaris: {
    label: "Abusaris et al. : récupération rapide",
    details:
`0 % < 6m
25 % : 6–12m
50 % : >12m`
  },
  noel: {
    label: "Noël et al. : récupération lente",
    details:
`0 % avant 1 an
5 % : 1 an
~10 % : 2 ans
~15 % : 3 ans
~20 % : 4 ans
~25 % : 5 ans
~30 % : 6 ans
~35 % : 7 ans
~40 % : 8 ans
~45 % : 9 ans
50 % : 10 ans et plateau`
  }
};

function safeNum(v) {
  if (v === "" || v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

export default function App() {
  // Step1 autorisée
  const [organ, setOrgan] = useState("");
  const [alphaBeta, setAlphaBeta] = useState("");
  const [totalAuth, setTotalAuth] = useState("");
  const [nAuth, setNAuth] = useState("");
  const [dpfAuth, setDpfAuth] = useState("");
  const [manualBedAuth, setManualBedAuth] = useState("");

  // Step2 utilisée
  const [totalUsed, setTotalUsed] = useState("");
  const [nUsed, setNUsed] = useState("");
  const [dpfUsed, setDpfUsed] = useState("");
  const [manualBedUsed, setManualBedUsed] = useState("");

  // Block <1.8
  const [blockBelow18, setBlockBelow18] = useState(false);

  // Step3 oubli / dates / model
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthsElapsed, setMonthsElapsed] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [tooltipKey, setTooltipKey] = useState(null);
  const [forgetPercent, setForgetPercent] = useState("");

  // Results
  const [bedAuth, setBedAuth] = useState("");
  const [eqd2Auth, setEqd2Auth] = useState("");
  const [physAuth, setPhysAuth] = useState("");

  const [bedUsed, setBedUsed] = useState("");
  const [eqd2Used, setEqd2Used] = useState("");
  const [physUsed, setPhysUsed] = useState("");

  const [bedRemain, setBedRemain] = useState("");
  const [eqd2Remain, setEqd2Remain] = useState("");
  const [physRemain, setPhysRemain] = useState("");

  // History
  const [titleSave, setTitleSave] = useState("");
  const [history, setHistory] = useState([]);

  // ------------------------------
  // helper : calculate missing field for Step1 (called by button)
  // ------------------------------
  function calcMissingAuth() {
    const t = safeNum(totalAuth);
    const n = safeNum(nAuth);
    const d = safeNum(dpfAuth);

    if (!isNaN(t) && !isNaN(n) && (dpfAuth === "" || dpfAuth === null)) {
      // compute dpf
      const val = t / n;
      setDpfAuth(val.toFixed(2));
      return;
    }
    if (!isNaN(t) && !isNaN(d) && (nAuth === "" || nAuth === null)) {
      const val = t / d;
      setNAuth(Math.round(val).toString());
      return;
    }
    if (!isNaN(n) && !isNaN(d) && (totalAuth === "" || totalAuth === null)) {
      const val = n * d;
      setTotalAuth(val.toFixed(2));
      return;
    }
  }

  // ------------------------------
  // Step2 calculate dose/fraction automatically if total + n provided (no button)
  // but we keep ability to edit
  // ------------------------------
  useEffect(() => {
    const t = safeNum(totalUsed);
    const n = safeNum(nUsed);
    const d = safeNum(dpfUsed);
    if (!isNaN(t) && !isNaN(n) && (dpfUsed === "" || dpfUsed === null)) {
      setDpfUsed((t / n).toFixed(2));
    }
  }, [totalUsed, nUsed]);

  // ------------------------------
  // Step1 calculations: compute BED/EQD2/Phys when user provides required values
  // - If manualBedAuth provided, use it
  // - Apply blockBelow18 when calculating (dpf floor = 1.8)
  // ------------------------------
  useEffect(() => {
    const ab = safeNum(alphaBeta);
    const dpf0 = safeNum(dpfAuth);
    let dpf = dpf0;
    const n = safeNum(nAuth);
    const total = safeNum(totalAuth);

    // if dpf missing but total and n provided, compute dpf for calculation only (do not overwrite)
    if (isNaN(dpf) && !isNaN(total) && !isNaN(n) && n !== 0) {
      dpf = total / n;
    } else if (isNaN(n) && !isNaN(total) && !isNaN(dpf) && dpf !== 0) {
      // compute n if missing
      // but do not overwrite user field here; we only want correct calculations
    }

    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) {
      dpf = 1.8;
    }

    // If manual BED provided, use it for BED auth (and compute EQD2 if ab present)
    const manualBED = safeNum(manualBedAuth);
    if (!isNaN(manualBED)) {
      setBedAuth(manualBED.toFixed(2));
      if (!isNaN(ab) && ab !== 0) {
        setEqd2Auth((manualBED / (1 + 2 / ab)).toFixed(2));
      } else {
        setEqd2Auth("");
      }
      // physical dose: if we have n and dpf (adjusted) compute dpf*n else if total given, use total
      if (!isNaN(n) && !isNaN(dpf)) {
        setPhysAuth((dpf * n).toFixed(2));
      } else if (!isNaN(total)) {
        setPhysAuth(total.toFixed(2));
      } else {
        setPhysAuth("");
      }
      return;
    }

    // calculate BED normally: BED = n * d * (1 + d/ab)
    if (!isNaN(dpf) && !isNaN(ab) && !isNaN(n) && n !== 0) {
      const bed = n * dpf * (1 + dpf / ab);
      setBedAuth(bed.toFixed(2));
      const eqd2 = bed / (1 + 2 / ab);
      setEqd2Auth(eqd2.toFixed(2));
      setPhysAuth((dpf * n).toFixed(2));
    } else if (!isNaN(total) && !isNaN(dpf) && !isNaN(ab)) {
      // If user provided total and dpf: derive n = total/dpf (rounded) and calculate using that n
      if (dpf !== 0) {
        const ncalc = total / dpf;
        const bed = ncalc * dpf * (1 + dpf / ab);
        setBedAuth(bed.toFixed(2));
        const eqd2 = bed / (1 + 2 / ab);
        setEqd2Auth(eqd2.toFixed(2));
        setPhysAuth(total.toFixed(2));
      }
    } else {
      setBedAuth("");
      setEqd2Auth("");
      setPhysAuth("");
    }
  }, [totalAuth, nAuth, dpfAuth, alphaBeta, manualBedAuth, blockBelow18]);

  // ------------------------------
  // Step2 calculations for used BED/EQD2/phys
  // uses alphaBeta from Step1 (global)
  // ------------------------------
  useEffect(() => {
    const ab = safeNum(alphaBeta);
    let dpf = safeNum(dpfUsed);
    const n = safeNum(nUsed);
    const total = safeNum(totalUsed);

    // if dpf missing but total and n provided, compute for calculation
    if (isNaN(dpf) && !isNaN(total) && !isNaN(n) && n !== 0) {
      dpf = total / n;
      // we set but do not overwrite field (we already fill it via o
