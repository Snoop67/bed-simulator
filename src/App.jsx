// src/App.jsx
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

const RECOVERY = {
  paradis: {
    title: "Paradis et al. : récupération rapide",
    text: `0–3 mois  : 0 %
4–6 mois  : 10 %
7–12 mois : 25 %
≥ 12 mois : 50 % (plateau)`,
  },
  nieder: {
    title: "Nieder et al. : récupération rapide",
    text: `0 % : 0–3 mois
~17 % : 4 mois
~25 % : 5 mois
~28 % : 6 mois
~33 % : 7 mois
~37 % : 8 mois
~40 % : 9 mois
~45 % : 10 mois
50 % : 11–12 mois et plateau`,
  },
  abusaris: {
    title: "Abusaris et al. : récupération rapide",
    text: `0 % : < 6 mois
25 % : 6–12 mois
50 % : > 12 mois`,
  },
  noel: {
    title: "Noël et al. : récupération lente",
    text: `0 % avant 1 an
5 % : 1 an
~10 % : 2 ans
~15 % : 3 ans
~20 % : 4 ans
~25 % : 5 ans
~30 % : 6 ans
~35 % : 7 ans
~40 % : 8 ans
~45 % : 9 ans
50 % : 10 ans et plateau`,
  },
};

// small safe parse
function num(v) {
  if (v === "" || v == null) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

export default function App() {
  // step1
  const [organ, setOrgan] = useState("");
  const [manualAB, setManualAB] = useState("");
  const [alphaBeta, setAlphaBeta] = useState(""); // used globally
  const [doseTotalAuth, setDoseTotalAuth] = useState("");
  const [nAuth, setNAuth] = useState("");
  const [dpfAuth, setDpfAuth] = useState("");
  const [manualBEDAuth, setManualBEDAuth] = useState("");

  // step2
  const [doseTotalUsed, setDoseTotalUsed] = useState("");
  const [nUsed, setNUsed] = useState("");
  const [dpfUsed, setDpfUsed] = useState("");
  const [manualBEDUsed, setManualBEDUsed] = useState("");

  // step3
  const [forgetPercent, setForgetPercent] = useState("");
  const [startRT, setStartRT] = useState("");
  const [endRT, setEndRT] = useState("");
  const [monthsElapsed, setMonthsElapsed] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const [manualBEDRemaining, setManualBEDRemaining] = useState("");

  // step4
  const [newFractions, setNewFractions] = useState("");
  // block <1.8
  const [blockBelow18, setBlockBelow18] = useState(false);

  // results
  const [bedAllowed, setBedAllowed] = useState("");
  const [eqd2Allowed, setEqd2Allowed] = useState("");
  const [physAllowed, setPhysAllowed] = useState("");

  const [bedUsed, setBedUsed] = useState("");
  const [eqd2Used, setEqd2Used] = useState("");
  const [physUsed, setPhysUsed] = useState("");

  const [bedRemaining, setBedRemaining] = useState("");
  const [eqd2Remaining, setEqd2Remaining] = useState("");
  const [physRemaining, setPhysRemaining] = useState("");

  const [dpfMax, setDpfMax] = useState("");
  const [totalMaxPossible, setTotalMaxPossible] = useState("");

  // history
  const [titleSave, setTitleSave] = useState("");
  const [history, setHistory] = useState([]);

  // --- When organ selects, prefill AB unless user typed customAB ---
  useEffect(() => {
    const found = OARS.find((o) => o.name === organ);
    if (found && found.ab !== "" && !manualAB) {
      setAlphaBeta(String(found.ab));
    } else if (manualAB) {
      setAlphaBeta(manualAB);
    } else if (!found) {
      setAlphaBeta(manualAB || "");
    }
  }, [organ, manualAB]);

  // --- Step1 calculate on explicit button (keeps behavior predictable) ---
  function calcMissingStep1() {
    const TD = num(doseTotalAuth);
    const N = num(nAuth);
    const DPF = num(dpfAuth);

    if (!isNaN(TD) && !isNaN(N) && (dpfAuth === "" || dpfAuth == null)) {
      setDpfAuth((TD / N).toFixed(2));
      return;
    }
    if (!isNaN(TD) && !isNaN(DPF) && (nAuth === "" || nAuth == null)) {
      setNAuth(String(Math.round(TD / DPF)));
      return;
    }
    if (!isNaN(N) && !isNaN(DPF) && (doseTotalAuth === "" || doseTotalAuth == null)) {
      setDoseTotalAuth((N * DPF).toFixed(2));
      return;
    }
  }

  // compute BED/EQD2/phys for step1 whenever inputs change
  useEffect(() => {
    const ab = num(alphaBeta);
    let dpf = num(dpfAuth);
    let n = num(nAuth);
    const tot = num(doseTotalAuth);

    if (isNaN(dpf) && !isNaN(tot) && !isNaN(n) && n !== 0) {
      dpf = tot / n;
    }
    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = num(manualBEDAuth);
    if (!isNaN(manual)) {
      setBedAllowed(manual.toFixed(2));
      if (!isNaN(ab) && ab !== 0) setEqd2Allowed((manual / (1 + 2 / ab)).toFixed(2));
      else setEqd2Allowed("");
      if (!isNaN(n) && !isNaN(dpf)) setPhysAllowed((dpf * n).toFixed(2));
      else if (!isNaN(tot)) setPhysAllowed(tot.toFixed(2));
      else setPhysAllowed("");
      return;
    }

    if (!isNaN(dpf) && !isNaN(n) && !isNaN(ab) && n !== 0) {
      const bed = n * dpf * (1 + dpf / ab);
      setBedAllowed(bed.toFixed(2));
      setEqd2Allowed((bed / (1 + 2 / ab)).toFixed(2));
      setPhysAllowed((dpf * n).toFixed(2));
    } else if (!isNaN(tot) && !isNaN(dpf) && !isNaN(ab) && dpf !== 0) {
      const ncalc = tot / dpf;
      const bed = ncalc * dpf * (1 + dpf / ab);
      setBedAllowed(bed.toFixed(2));
      setEqd2Allowed((bed / (1 + 2 / ab)).toFixed(2));
      setPhysAllowed(tot.toFixed(2));
    } else {
      setBedAllowed("");
      setEqd2Allowed("");
      setPhysAllowed("");
    }
  }, [doseTotalAuth, nAuth, dpfAuth, alphaBeta, manualBEDAuth, blockBelow18]);

  // --- Step2 auto-calc dpf if total + n provided (but editable) ---
  useEffect(() => {
    const td = num(doseTotalUsed);
    const n = num(nUsed);
    if (!isNaN(td) && !isNaN(n) && (dpfUsed === "" || dpfUsed == null)) {
      setDpfUsed((td / n).toFixed(2));
    }
  }, [doseTotalUsed, nUsed]);

  // compute BED used
  useEffect(() => {
    const ab = num(alphaBeta);
    let dpf = num(dpfUsed);
    const n = num(nUsed);
    const tot = num(doseTotalUsed);

    if (isNaN(dpf) && !isNaN(tot) && !isNaN(n) && n !== 0) {
      dpf = tot / n;
    }
    if (blockBelow18 && !isNaN(dpf) && dpf < 1.8) dpf = 1.8;

    const manual = num(manualBEDUsed);
    if (!isNaN(manual)) {
      setBedUsed(manual.toFixed(2));
      if (!isNaN(ab) && ab !== 0) setEqd2Used((manual / (1 + 2 / ab)).toFixed(2));
      else setEqd2Used("");
      if (!isNaN(n) && !isNaN(dpf)) setPhysUsed((dpf * n).toFixed(2));
      else if (!isNaN(tot)) setPhysUsed(tot.toFixed(2));
      else setPhysUsed("");
      return;
    }

    if (!isNaN(dpf) && !isNaN(n) && !isNaN(ab) && n !== 0) {
      const bed = n * dpf * (1 + dpf / ab);
      setBedUsed(bed.toFixed(2));
      setEqd2Used((bed / (1 + 2 / ab)).toFixed(2));
      setPhysUsed((dpf * n).toFixed(2));
    } else if (!isNaN(tot) && !isNaN(dpf) && !isNaN(ab) && dpf !== 0) {
      const ncalc = tot / dpf;
      const bed = ncalc * dpf * (1 + dpf / ab);
      setBedUsed(bed.toFixed(2));
      setEqd2Used((bed / (1 + 2 / ab)).toFixed(2));
      setPhysUsed(tot.toFixed(2));
    } else {
      setBedUsed("");
      setEqd2Used("");
      setPhysUsed("");
    }
  }, [doseTotalUsed, nUsed, dpfUsed, alphaBeta, manualBEDUsed, blockBelow18]);

  // --- dates months elapsed ---
  useEffect(() => {
    if (!startRT || !endRT) {
      setMonthsElapsed("");
      return;
    }
    const s = new Date(startRT);
    const e = new Date(endRT);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
      setMonthsElapsed("");
      return;
    }
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    setMonthsElapsed(String(months));
  }, [startRT, endRT]);

  // recovery models -> set forgetPercent (auto, but user can override)
  useEffect(() => {
    if (!selectedModel || monthsElapsed === "") return;
    const m = num(monthsElapsed);
    if (isNaN(m)) return;
    let p = NaN;
    if (selectedModel === "paradis") {
      if (m <= 3) p = 0;
      else if (m <= 6) p = 10;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (selectedModel === "nieder") {
      if (m <= 3) p = 0;
      else if (m === 4) p = 17;
      else if (m === 5) p = 25;
      else if (m === 6) p = 28;
      else if (m === 7) p = 33;
      else if (m === 8) p = 37;
      else if (m === 9) p = 40;
      else if (m === 10) p = 45;
      else p = 50;
    } else if (selectedModel === "abusaris") {
      if (m < 6) p = 0;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (selectedModel === "noel") {
      if (m < 12) p = 0;
      else if (m === 12) p = 5;
      else if (m === 24) p = 10;
      else if (m === 36) p = 15;
      else if (m === 48) p = 20;
      else if (m === 60) p = 25;
      else if (m === 72) p = 30;
      else if (m === 84) p = 35;
      else if (m === 96) p = 40;
      else if (m === 108) p = 45;
      else p = 50;
    }
    if (!isNaN(p)) setForgetPercent(String(p));
  }, [selectedModel, monthsElapsed]);

  // --- compute remaining BED/EQD2/phys (corrigé)
  useEffect(() => {
    const bAllowed = !isNaN(num(manualBEDAuth)) ? num(manualBEDAuth) : num(bedAllowed);
    const bUsed = num(bedUsed);
    const forg = num(forgetPercent);
    if (isNaN(bAllowed) || isNaN(bUsed)) {
      setBedRemaining("");
      setEqd2Remaining("");
      setPhysRemaining("");
      return;
    }
    const remaining = bAllowed - bUsed * (1 - (isNaN(forg) ? 0 : forg / 100));
    const rem = remaining < 0 ? 0 : remaining;
    setBedRemaining(rem.toFixed(2));
    const ab = num(alphaBeta);
    if (!isNaN(ab) && ab !== 0) {
      setEqd2Remaining((rem / (1 + 2 / ab)).toFixed(2));
    } else {
      setEqd2Remaining("");
    }
    const physA = num(physAllowed);
    const physU = num(physUsed);
    if (!isNaN(physA) && !isNaN(physU)) {
      const pres = physA - physU * (1 - (isNaN(forg) ? 0 : forg / 100));
      setPhysRemaining((pres < 0 ? 0 : pres).toFixed(2));
    } else {
      setPhysRemaining("");
    }
  }, [bedAllowed, manualBEDAuth, bedUsed, physAllowed, physUsed, forgetPercent, alphaBeta]);

  // --- Step4 compute dpf max solving quadratic (corrigé)
  useEffect(() => {
    const B = !isNaN(num(manualBEDRemaining)) ? num(manualBEDRemaining) : num(bedRemaining);
    const n = num(newFractions);
    const ab = num(alphaBeta);
    if (isNaN(B) || isNaN(n) || n === 0 || isNaN(ab) || ab === 0) {
      setDpfMax("");
      setTotalMaxPossible("");
      return;
    }
    const a = n / ab;
    const b = n;
    const c = -B;
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      setDpfMax("");
      setTotalMaxPossible("");
      return;
    }
    const root = (-b + Math.sqrt(disc)) / (2 * a);
    if (root <= 0) {
      setDpfMax("");
      setTotalMaxPossible("");
      return;
    }
    setDpfMax(root.toFixed(2));
    setTotalMaxPossible((root * n).toFixed(2
