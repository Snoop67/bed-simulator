import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

/**
 * BED Simulator — App.jsx (version complète)
 * Présentation identique à “hier” (typographie, couleurs, disposition).
 *
 * Contenu :
 *  - Étape 1 : OAR + α/β manuel, dose totale / n / dpf + bouton "Calculer le champ manquant"
 *              Options : "Bloquer les doses/fraction < 1.8 Gy"
 *              Affichage : BED/EQD2/Dose physique autorisées OU saisie manuelle de BED autorisée
 *  - Étape 2 : BED utilisée (calcul du champ manquant sur onBlur), BED/EQD2/physique utilisées
 *              OU saisie manuelle de BED utilisée
 *  - Étape 3 : Récupération (dates → mois), modèles (Paradis/Nieder/Abusaris/Noël) → % d’oubli
 *              Affichage : BED/EQD2/physique restantes
 *              OU saisie manuelle de BED restante
 *  - Étape 4 : Résolution quadratique → dose max par fraction autorisée et dose totale max
 *  - Historique localStorage : enregistre le titre saisi tel quel
 *  - Conversion VxGy < x% — équivalent :
 *        * Labels au-dessus de chaque champ
 *        * α/β modifiable par ligne (par défaut reprend α/β de l’étape 1)
 *        * Entrée du pourcentage (% du volume) à ne pas dépasser (ex : 30)
 *        * Affiche en CADRE BLEU :
 *            “Équivalence calculée : **V{Dequiv_total} Gy < {pourcentage}%** ;
 *             dose/fraction max : {d_per_frac_needed} Gy (si n saisi)”
 *          (suppression de l’ancienne ligne “Nouvelle contrainte : …”)
 *        * Croix de suppression rouges réduites pour ne pas dépasser le cadre
 */

/* ========================================================================== */
/* OARs et α/β par défaut                                                     */
/* ========================================================================== */
const OARS = [
  { name: "", ab: "" },
  { name: "Moelle épinière", ab: 2 },
  { name: "Tronc cérébral", ab: 2 },
  { name: "Nerf optique", ab: 2 },
  { name: "Chiasma optique", ab: 2 },
  { name: "Rétine", ab: 2 },
  { name: "Cerveau (parenchyme)", ab: 2 },
  { name: "Hippocampe", ab: 2 },
  { name: "Glande parotide", ab: 3 },
  { name: "Glande sous-maxillaire", ab: 3 },
  { name: "Muqueuse orale", ab: 10 },
  { name: "Larynx (cartilage)", ab: 3 },
  { name: "Larynx (muqueuse)", ab: 10 },
  { name: "Poumon", ab: 3 },
  { name: "Cœur", ab: 3 },
  { name: "Foie", ab: 3 }, // 2.5–3
  { name: "Reins", ab: 3 },
  { name: "Vessie", ab: 3 },
  { name: "Rectum", ab: 3 },
  { name: "Intestin grêle", ab: 3 },
  { name: "Côlon", ab: 3 },
  { name: "Peau (réactions tardives)", ab: 3 },
  { name: "Peau (réactions aiguës)", ab: 10 },
  { name: "Os", ab: 2 }, // ≈ 1.5–2
  { name: "Tête fémorale", ab: 2 },
  { name: "Testicules", ab: 2 },
  { name: "Ovaires", ab: 2 },
];

/* ========================================================================== */
/* Modèles de récupération                                                    */
/* ========================================================================== */
const RECOVERY_MODELS = {
  paradis: {
    title: "Paradis et al. : récupération rapide",
    tooltip: `0–3 mois  : 0 %
4–6 mois  : 10 %
7–12 mois : 25 %
≥ 12 mois : 50 %`,
  },
  nieder: {
    title: "Nieder et al. : récupération rapide",
    tooltip: `0–3 mois : 0 %
4 mois : 17 %
5 mois : 25 %
6 mois : 28 %
7 mois : 33 %
8 mois : 37 %
9 mois : 40 %
10 mois : 45 %
≥ 11 mois : 50%`,
  },
  abusaris: {
    title: "Abusaris et al. : récupération rapide",
    tooltip: `<6 mois : 0%
6–12 mois : 25%
>12 mois : 50%`,
  },
  noel: {
    title: "Noël et al. : récupération lente",
    tooltip: `0 % avant 1 an
Puis 5% par an jusqu'à 10 ans
≥ 10 ans : 50%`,
  },
};

/* ========================================================================== */
/* Utils                                                                      */
/* ========================================================================== */
const toNum = (v) => {
  if (v === "" || v === null || v === undefined) return NaN;
  const s = String(v).replace(",", ".").trim();
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};
const fmt = (v, d = 2) => (v === "" || isNaN(v) ? "" : Number(v).toFixed(d));

/* Formules */
const bedFrom = (n, d, ab) => n * d * (1 + d / ab);
const eqd2From = (bed, ab) => bed / (1 + 2 / ab);

/* ========================================================================== */
/* Composant principal                                                        */
/* ========================================================================== */
export default function App() {
  /* --------------------------- États globaux ---------------------------- */

  // Étape 1 — autorisée
  const [organ, setOrgan] = useState("");
  const [abManual, setAbManual] = useState(""); // saisie manuelle à côté de l'organe
  const abDefault = useMemo(
    () => (OARS.find((o) => o.name === organ)?.ab ?? ""),
    [organ]
  );
  const alphaBeta = abManual !== "" ? abManual : abDefault;

  const [tdAuth, setTdAuth] = useState(""); // dose totale
  const [nAuth, setNAuth] = useState(""); // nombre de fractions
  const [dAuth, setDAuth] = useState(""); // dose par fraction
  const [bedAuthManual, setBedAuthManual] = useState(""); // saisie directe de BED autorisée
  const [blockBelow18, setBlockBelow18] = useState(false); // bloquer dose/fraction < 1.8 Gy

  // Étape 2 — utilisée
  const [tdUsed, setTdUsed] = useState("");
  const [nUsed, setNUsed] = useState("");
  const [dUsed, setDUsed] = useState("");
  const [bedUsedManual, setBedUsedManual] = useState("");

  // Étape 3 — récupération
  const [forgetPercent, setForgetPercent] = useState(""); // % override manuel
  const [dStart, setDStart] = useState("");
  const [dEnd, setDEnd] = useState("");
  const [months, setMonths] = useState("");
  const [recoveryModel, setRecoveryModel] = useState(""); // paradis | nieder | abusaris | noel
  const [openTip, setOpenTip] = useState(null); // info-bulle
  const [bedRemainManual, setBedRemainManual] = useState("");

  // Étape 4 — dpf max autorisée
  const [nPlan, setNPlan] = useState("");
  const [dpfMax, setDpfMax] = useState("");
  const [totMax, setTotMax] = useState("");

  // Historique
  const [titleSave, setTitleSave] = useState("");
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("bed_history_full");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Conversion Vx — lignes
  const [vxRows, setVxRows] = useState([
    // ab vide -> utilise alphaBeta de l'étape 1
    { id: Date.now(), seuil: "", dInit: "", nNew: "", dNew: "", ab: "", percent: "" },
  ]);

  /* ------------------------- Étape 1 — calculs ------------------------- */

  const calcMissingStep1 = () => {
    const TD = toNum(tdAuth);
    const N = toNum(nAuth);
    const D = toNum(dAuth);

    if (!isNaN(TD) && !isNaN(N) && (dAuth === "" || dAuth == null)) {
      setDAuth((TD / N).toFixed(2));
      return;
    }
    if (!isNaN(TD) && !isNaN(D) && (nAuth === "" || nAuth == null)) {
      setNAuth(String(Math.round(TD / D)));
      return;
    }
    if (!isNaN(N) && !isNaN(D) && (tdAuth === "" || tdAuth == null)) {
      setTdAuth((N * D).toFixed(2));
      return;
    }
  };

  const [bedAllowed, eqd2Allowed, physAllowed] = useMemo(() => {
    const ab = toNum(alphaBeta);
    if (isNaN(ab) || ab === 0) return ["", "", ""];

    let d = toNum(dAuth);
    const n = toNum(nAuth);
    const TD = toNum(tdAuth);

    if (isNaN(d) && !isNaN(TD) && !isNaN(n) && n !== 0) d = TD / n;
    if (blockBelow18 && !isNaN(d) && d < 1.8) d = 1.8;

    const bedManual = toNum(bedAuthManual);
    if (!isNaN(bedManual)) {
      const eq = bedManual / (1 + 2 / ab);
      const phys = !isNaN(n) && !isNaN(d) ? n * d : !isNaN(TD) ? TD : "";
      return [fmt(bedManual), fmt(eq), fmt(phys)];
    }

    if (!isNaN(d) && !isNaN(n) && n !== 0) {
      const bed = bedFrom(n, d, ab);
      const eq = eqd2From(bed, ab);
      return [fmt(bed), fmt(eq), fmt(n * d)];
    }
    if (!isNaN(TD) && !isNaN(d) && d !== 0) {
      const ncalc = TD / d;
      const bed = bedFrom(ncalc, d, ab);
      const eq = eqd2From(bed, ab);
      return [fmt(bed), fmt(eq), fmt(TD)];
    }
    return ["", "", ""];
  }, [alphaBeta, dAuth, nAuth, tdAuth, bedAuthManual, blockBelow18]);

  /* ------------------------- Étape 2 — calculs ------------------------- */

  const calcMissingStep2 = () => {
    const TD = toNum(tdUsed);
    const N = toNum(nUsed);
    const D = toNum(dUsed);

    if (!isNaN(TD) && !isNaN(N) && (dUsed === "" || dUsed == null)) {
      setDUsed((TD / N).toFixed(2));
      return;
    }
    if (!isNaN(TD) && !isNaN(D) && (nUsed === "" || nUsed == null)) {
      setNUsed(String(Math.round(TD / D)));
      return;
    }
    if (!isNaN(N) && !isNaN(D) && (tdUsed === "" || tdUsed == null)) {
      setTdUsed((N * D).toFixed(2));
      return;
    }
  };

  const [bedUsed, eqd2Used, physUsed] = useMemo(() => {
    const ab = toNum(alphaBeta);
    if (isNaN(ab) || ab === 0) return ["", "", ""];

    let d = toNum(dUsed);
    const n = toNum(nUsed);
    const TD = toNum(tdUsed);

    if (isNaN(d) && !isNaN(TD) && !isNaN(n) && n !== 0) d = TD / n;
    if (blockBelow18 && !isNaN(d) && d < 1.8) d = 1.8;

    const bedManual = toNum(bedUsedManual);
    if (!isNaN(bedManual)) {
      const eq = bedManual / (1 + 2 / ab);
      const phys = !isNaN(n) && !isNaN(d) ? n * d : !isNaN(TD) ? TD : "";
      return [fmt(bedManual), fmt(eq), fmt(phys)];
    }

    if (!isNaN(d) && !isNaN(n) && n !== 0) {
      const bed = bedFrom(n, d, ab);
      const eq = eqd2From(bed, ab);
      return [fmt(bed), fmt(eq), fmt(n * d)];
    }
    if (!isNaN(TD) && !isNaN(d) && d !== 0) {
      const ncalc = TD / d;
      const bed = bedFrom(ncalc, d, ab);
      const eq = eqd2From(bed, ab);
      return [fmt(bed), fmt(eq), fmt(TD)];
    }
    return ["", "", ""];
  }, [alphaBeta, dUsed, nUsed, tdUsed, bedUsedManual, blockBelow18]);

  /* ------------------------- Étape 3 — récup --------------------------- */

  // Dates → mois
  useEffect(() => {
    if (!dStart || !dEnd) {
      setMonths("");
      return;
    }
    const s = new Date(dStart);
    const e = new Date(dEnd);
    if (isNaN(s) || isNaN(e) || e < s) {
      setMonths("");
      return;
    }
    const m =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    setMonths(String(m));
  }, [dStart, dEnd]);

  // Modèle → % d’oubli
  useEffect(() => {
    if (!recoveryModel) return;
    const m = toNum(months);
    if (isNaN(m)) return;

    let p = 0;
    if (recoveryModel === "paradis") {
      if (m <= 3) p = 0;
      else if (m <= 6) p = 10;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (recoveryModel === "nieder") {
      if (m <= 3) p = 0;
      else if (m === 4) p = 17;
      else if (m === 5) p = 25;
      else if (m === 6) p = 28;
      else if (m === 7) p = 33;
      else if (m === 8) p = 37;
      else if (m === 9) p = 40;
      else if (m === 10) p = 45;
      else p = 50;
    } else if (recoveryModel === "abusaris") {
      if (m < 6) p = 0;
      else if (m <= 12) p = 25;
      else p = 50;
    } else if (recoveryModel === "noel") {
      if (m < 12) p = 0;
      else {
        const years = Math.floor(m / 12);
        p = Math.min(50, Math.max(0, 5 * years));
      }
    }
    setForgetPercent(String(p));
  }, [recoveryModel, months]);

  // BED/EQD2/phys restantes (prend en compte la saisie manuelle de BED restante)
  const [bedRemain, eqd2Remain, physRemain] = useMemo(() => {
    const bedAut = toNum(bedAuthManual) || toNum(bedAllowed);
    const bedUse = toNum(bedUsed);
    if (isNaN(bedAut) || isNaN(bedUse)) return ["", "", ""];

    const p = toNum(forgetPercent);
    const forget = isNaN(p) ? 0 : p / 100;

    let remaining = bedAut - bedUse * (1 - forget);
    if (remaining < 0) remaining = 0;

    const ab = toNum(alphaBeta);
    const eq = !isNaN(ab) && ab !== 0 ? remaining / (1 + 2 / ab) : "";

    const physAut = toNum(physAllowed);
    const physUse = toNum(physUsed);
    let physRem = "";
    if (!isNaN(physAut) && !isNaN(physUse)) {
      const val = physAut - physUse * (1 - forget);
      physRem = fmt(val < 0 ? 0 : val);
    }

    const manual = toNum(bedRemainManual);
    const bedFinal = !isNaN(manual) ? manual : remaining;

    return [fmt(bedFinal), fmt(eq), physRem];
  }, [
    bedAllowed,
    bedAuthManual,
    bedUsed,
    physAllowed,
    physUsed,
    forgetPercent,
    alphaBeta,
    bedRemainManual,
  ]);

  /* ------------------------- Étape 4 — dpf max ------------------------- */
  useEffect(() => {
    const B = toNum(bedRemain); // inclut bedRemainManual si saisi
    const n = toNum(nPlan);
    const ab = toNum(alphaBeta);
    if (isNaN(B) || isNaN(n) || n <= 0 || isNaN(ab) || ab === 0) {
      setDpfMax("");
      setTotMax("");
      return;
    }
    // n d (1 + d/ab) = B  => (n/ab) d^2 + n d - B = 0
    const a = n / ab;
    const b = n;
    const c = -B;
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      setDpfMax("");
      setTotMax("");
      return;
    }
    const root = (-b + Math.sqrt(disc)) / (2 * a);
    if (root <= 0) {
      setDpfMax("");
      setTotMax("");
      return;
    }
    setDpfMax(root.toFixed(2));
    setTotMax((root * n).toFixed(2));
  }, [bedRemain, nPlan, alphaBeta]);

  /* ----------------------------- Historique ---------------------------- */
  useEffect(() => {
    try {
      localStorage.setItem("bed_history_full", JSON.stringify(history));
    } catch {}
  }, [history]);

  const saveToHistory = () => {
    const item = {
      title: (titleSave && titleSave.trim()) || "Sans titre",
      organ,
      alphaBeta,
      tdAuth,
      nAuth,
      dAuth,
      bedAllowed,
      eqd2Allowed,
      physAllowed,
      tdUsed,
      nUsed,
      dUsed,
      bedUsed,
      eqd2Used,
      physUsed,
      forgetPercent,
      bedRemain,
      eqd2Remain,
      physRemain,
      nPlan,
      dpfMax,
      totMax,
      createdAt: new Date().toISOString(),
    };
    setHistory((h) => [...h, item]);
    setTitleSave("");
  };

  const resetAll = () => {
    setOrgan("");
    setAbManual("");
    setTdAuth("");
    setNAuth("");
    setDAuth("");
    setBedAuthManual("");
    setBlockBelow18(false);

    setTdUsed("");
    setNUsed("");
    setDUsed("");
    setBedUsedManual("");

    setForgetPercent("");
    setDStart("");
    setDEnd("");
    setMonths("");
    setRecoveryModel("");
    setOpenTip(null);
    setBedRemainManual("");

    setNPlan("");
    setDpfMax("");
    setTotMax("");

    setTitleSave("");

    setVxRows([
      { id: Date.now(), seuil: "", dInit: "", nNew: "", dNew: "", ab: "", percent: "" },
    ]);
  };

  const removeHistoryItem = (index) => {
  setHistory((h) => h.filter((_, i) => i !== index));
};

  /* ----------------------- Conversion VxGy < x% ------------------------ */

  const addVxRow = () =>
    setVxRows((rows) => [
      ...rows,
      {
        id: Date.now() + Math.random(),
        seuil: "",
        dInit: "",
        nNew: "",
        dNew: "",
        ab: "",
        percent: "",
      },
    ]);

  const removeVxRow = (id) =>
    setVxRows((rows) => rows.filter((r) => r.id !== id));

  const updateVxRow = (id, field, value) =>
    setVxRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );

  const computeVx = (row) => {
    const abUsed = row.ab !== "" ? toNum(row.ab) : toNum(alphaBeta);
    const seuil = toNum(row.seuil); // D_seuil en Gy physique
    const d1 = toNum(row.dInit); // dose/fraction initiale
    const nNew = toNum(row.nNew); // nouveau nombre de fractions (optionnel)
    const d2 = toNum(row.dNew); // nouvelle dose/fraction
    if (isNaN(abUsed) || isNaN(seuil) || isNaN(d1) || isNaN(d2)) return null;

    // BED_ref = D_seuil * (1 + d1/ab)
    const BEDref = seuil * (1 + d1 / abUsed);
    // Dose physique équivalente au nouveau fractionnement si on impose d2 :
    const Dequiv_total = BEDref / (1 + d2 / abUsed);
    // Si nNew est fourni, d/f nécessaire pour respecter ce Vx au même % :
    const d_per_frac_needed =
      !isNaN(nNew) && nNew > 0 ? Dequiv_total / nNew : null;

    return { Dequiv_total, d_per_frac_needed };
  };

  /* ------------------------------- Render ------------------------------ */

  const shownAB = () => (abManual !== "" ? abManual : abDefault || "");

  return (
    <div className="app-wrap">
      <div className="card">
        <h1 className="main-title centered">BED Simulator ☢️</h1>

        {/* =========================== Étape 1 =========================== */}
        <section className="step">
          <h2 className="step-title">1. BED totale autorisée</h2>

          <div className="inline-row">
            <div className="col grow">
              <label className="field-label">Organe</label>
              <select
                className="field"
                value={organ}
                onChange={(e) => setOrgan(e.target.value)}
              >
                {OARS.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name || "-- Sélectionner --"}
                  </option>
                ))}
              </select>
            </div>

            <div className="col fixed">
              <label className="field-label">α/β (Gy)</label>
              <input
                className="field"
                value={abManual}
                onChange={(e) => setAbManual(e.target.value)}
                placeholder={shownAB() ? `prérempli ${shownAB()}` : ""}
              />
            </div>
          </div>

          <label className="field-label">Dose totale (Gy)</label>
          <input
            className="field"
            value={tdAuth}
            onChange={(e) => setTdAuth(e.target.value)}
          />

          <label className="field-label">Nombre de fractions</label>
          <input
            className="field"
            value={nAuth}
            onChange={(e) => setNAuth(e.target.value)}
          />

          <label className="field-label">Dose par fraction (Gy)</label>
          <input
            className="field"
            value={dAuth}
            onChange={(e) => setDAuth(e.target.value)}
          />

          <div className="controls-row">
            <button className="btn primary" onClick={calcMissingStep1}>
              ⚙️ Calculer le champ manquant
            </button>
            <label className="inline-checkbox">
              <input
                type="checkbox"
                checked={blockBelow18}
                onChange={(e) => setBlockBelow18(e.target.checked)}
              />
              Bloquer les dose/fraction &lt; 1.8 Gy
            </label>
          </div>

          <div className="recorad-links">
            <div>
              <strong>Contraintes Recorad :</strong>
            </div>
            <a
              href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/"
              target="_blank"
              rel="noreferrer"
            >
              &nbsp;• Doses par fraction ≤ 6 Gy
            </a>
            <a
              href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/"
              target="_blank"
              rel="noreferrer"
            >
              &nbsp;• Doses par fraction &gt; 6 Gy
            </a>
          </div>

          <div className="result-box highlight">
            <div className="result-line">
              <span className="result-label">BED autorisée :</span>{" "}
              <strong>{bedAllowed || "-"}</strong> Gy
            </div>
            <div className="result-line">
              <span className="result-label">EQD2 autorisée :</span>{" "}
              <strong>{eqd2Allowed || "-"}</strong> Gy
            </div>
            <div className="result-line">
              <span className="result-label">Dose physique autorisée :</span>{" "}
              <strong>{physAllowed || "-"}</strong> Gy
            </div>
          </div>

          <label className="field-label">OU BED autorisée (saisie manuelle)</label>
          <input
            className="field"
            value={bedAuthManual}
            onChange={(e) => setBedAuthManual(e.target.value)}
          />
        </section>

        {/* =========================== Étape 2 =========================== */}
        <section className="step">
          <h2 className="step-title">2. BED utilisée</h2>

          <label className="field-label">Dose totale reçue (Gy)</label>
          <input
            className="field"
            value={tdUsed}
            onChange={(e) => setTdUsed(e.target.value)}
            onBlur={calcMissingStep2}
          />

          <label className="field-label">Nombre de fractions</label>
          <input
            className="field"
            value={nUsed}
            onChange={(e) => setNUsed(e.target.value)}
            onBlur={calcMissingStep2}
          />

          <label className="field-label">Dose par fraction (Gy)</label>
          <input
            className="field"
            value={dUsed}
            onChange={(e) => setDUsed(e.target.value)}
            onBlur={calcMissingStep2}
          />

          <div className="result-box">
            <div className="result-line">
              <span className="result-label">BED utilisée :</span>{" "}
              <strong>{bedUsed || "-"}</strong> Gy
            </div>
            <div className="result-line">
              <span className="result-label">EQD2 utilisée :</span>{" "}
              <strong>{eqd2Used || "-"}</strong> Gy
            </div>
            <div className="result-line">
              <span className="result-label">Dose physique utilisée :</span>{" "}
              <strong>{physUsed || "-"}</strong> Gy
            </div>
          </div>

          <label className="field-label">OU BED utilisée (saisie manuelle)</label>
          <input
            className="field"
            value={bedUsedManual}
            onChange={(e) => setBedUsedManual(e.target.value)}
          />
        </section>

        {/* =========================== Étape 3 =========================== */}
        <section className="step">
          <h2 className="step-title">3. BED restante autorisée</h2>

          <label className="field-label">% de dose d’oubli (manuel)</label>
          <input
            className="field"
            value={forgetPercent}
            onChange={(e) => setForgetPercent(e.target.value)}
          />

          <div className="row-dates">
            <div className="col grow">
              <label className="field-label">Date début RT</label>
              <input
                className="field"
                type="date"
                value={dStart}
                onChange={(e) => setDStart(e.target.value)}
              />
            </div>
            <div className="col grow">
              <label className="field-label">Date fin RT</label>
              <input
                className="field"
                type="date"
                value={dEnd}
                onChange={(e) => setDEnd(e.target.value)}
              />
            </div>
            <div className="col fixed small">
              <label className="field-label">Mois écoulés</label>
              <input className="field" value={months} readOnly />
            </div>
          </div>

          <label className="field-label">
            Choisir un modèle (ou laisser % manuel)
          </label>
          <div className="model-list">
            {Object.entries(RECOVERY_MODELS).map(([key, val]) => (
              <div key={key} className="model-row">
                <label className="model-label">
                  <input
                    type="radio"
                    name="recov"
                    checked={recoveryModel === key}
                    onChange={() => setRecoveryModel(key)}
                  />{" "}
                  {val.title}
                </label>
                <button
                  className="info"
                  onClick={() => setOpenTip(openTip === key ? null : key)}
                  aria-label="info"
                  title="Afficher le détail"
                >
                  i
                </button>
                {openTip === key && <div className="tooltip">{val.tooltip}</div>}
              </div>
            ))}
          </div>

          <div className="result-box highlight">
            <div className="result-line">
              <span className="result-label">BED restante :</span>{" "}
              <strong>{bedRemain || "-"}</strong> Gy
            </div>
            <div className="result-line">
              <span className="result-label">EQD2 restante :</span>{" "}
              <strong>{eqd2Remain || "-"}</strong> Gy
            </div>
            <div className="result-line">
              <span className="result-label">Dose physique restante :</span>{" "}
              <strong>{physRemain || "-"}</strong> Gy
            </div>
          </div>

          <label className="field-label">OU BED restante (saisie manuelle)</label>
          <input
            className="field"
            value={bedRemainManual}
            onChange={(e) => setBedRemainManual(e.target.value)}
          />
        </section>

        {/* =========================== Étape 4 =========================== */}
        <section className="step">
          <h2 className="step-title">4. Dose maximale par fraction autorisée</h2>

          <label className="field-label">Nombre de fractions prévues</label>
          <input
            className="field"
            value={nPlan}
            onChange={(e) => setNPlan(e.target.value)}
          />

          <div className="result-box">
            <div className="result-line">
              <span className="result-label">Dose max par fraction :</span>{" "}
              <strong>{dpfMax || "-"}</strong> Gy
            </div>
            <div className="result-line">
              <span className="result-label">Dose totale max possible :</span>{" "}
              <strong>{totMax || "-"}</strong> Gy
            </div>
          </div>
        </section>

        {/* =========================== Historique ========================= */}
        <section className="step">
          <h2 className="step-title">Sauvegarde</h2>
          <label className="field-label">Nom de l'organe</label>
          <input
            className="field"
            value={titleSave}
            onChange={(e) => setTitleSave(e.target.value)}
          />
          <div className="buttons">
            <button className="btn primary" onClick={saveToHistory}>
              💾 Enregistrer
            </button>
            <button className="btn" onClick={resetAll}>
              ♻️ Réinitialiser
            </button>
          </div>
        </section>

        <div className="history">
          <h3 className="history-title">📘 Résultats enregistrés</h3>
          {history.length === 0 ? (
            <div className="hint">Aucun résultat enregistré</div>
          ) : (
            history
              .slice()
              .reverse()
              .map((h, i) => (
<div key={i} className="history-item">
  <button
    className="history-remove"
    onClick={() => removeHistoryItem(history.length - 1 - i)}
    title="Supprimer"
    aria-label="Supprimer"
  >
    ✕
  </button>
  <div className="hist-title">{h.title}</div>
  <div>
    BED restante : {h.bedRemain || "-"} Gy — EQD2 restante :{" "}
    {h.eqd2Remain || "-"} Gy
  </div>
  <div> Dose physique restante : {h.physRemain || "-"} Gy</div>
  <div>
    Dose max/fraction : {h.dpfMax || "-"} Gy — Nb de fractions
    prévues : {h.nPlan || "-"}
  </div>
</div>
              ))
          )}
        </div>

        {/* ================= Conversion VxGy < x% — équivalent ============ */}
        <section className="step">
          <h2 className="step-title centered">Conversion VxGy &lt; x% — équivalent</h2>
          <div className="hint small">
            α/β utilisé : <strong>{alphaBeta || "-"}</strong> (repris de l’étape 1 — modifiable par ligne)
          </div>

          {vxRows.map((row) => {
            const out = computeVx(row);
            const percent = toNum(row.percent);
            const hasValidPercent = !isNaN(percent) && percent >= 0 && percent <= 100;

            return (
              <div key={row.id} className="vx-row">
                <div className="vx-col">
                  <label className="field-label">Dose seuil initiale (Gy)</label>
                  <input
                    className="field"
                    type="number"
                    value={row.seuil}
                    onChange={(e) =>
                      updateVxRow(row.id, "seuil", e.target.value)
                    }
                  />
                </div>
                <div className="vx-col">
                  <label className="field-label">Dose par fraction initiale (Gy)</label>
                  <input
                    className="field"
                    type="number"
                    value={row.dInit}
                    onChange={(e) =>
                      updateVxRow(row.id, "dInit", e.target.value)
                    }
                  />
                </div>
                <div className="vx-col">
                  <label className="field-label">Nouveau nombre de fractions</label>
                  <input
                    className="field"
                    type="number"
                    value={row.nNew}
                    onChange={(e) =>
                      updateVxRow(row.id, "nNew", e.target.value)
                    }
                  />
                </div>
                <div className="vx-col">
                  <label className="field-label">Nouvelle dose/fraction (Gy)</label>
                  <input
                    className="field"
                    type="number"
                    value={row.dNew}
                    onChange={(e) =>
                      updateVxRow(row.id, "dNew", e.target.value)
                    }
                  />
                </div>
                <div className="vx-col ab-override">
                  <label className="field-label">α/β (optionnel)</label>
                  <input
                    className="field"
                    value={row.ab}
                    onChange={(e) => updateVxRow(row.id, "ab", e.target.value)}
                    placeholder={alphaBeta ? `défaut ${alphaBeta}` : ""}
                  />
                </div>
                <div className="vx-col">
                  <label className="field-label">% du volume (x%)</label>
                  <input
                    className="field"
                    type="number"
                    value={row.percent}
                    onChange={(e) =>
                      updateVxRow(row.id, "percent", e.target.value)
                    }
                    min="0"
                    max="100"
                  />
                </div>

                <div className="vx-result blue">
                  {out ? (
                    hasValidPercent ? (
                      <>
                        <div className="vx-main-line">
                          Équivalence calculée :{" "}
                          <strong>
                            V{out.Dequiv_total.toFixed(2)} Gy &lt; {percent}%
                          </strong>
                        </div>
                        {row.nNew && out.d_per_frac_needed != null ? (
                          <div className="vx-sub-line">
                            Dose max par fraction : {out.d_per_frac_needed.toFixed(2)} Gy
                          </div>
                        ) : (
                          <div className="vx-sub-line muted">
                            (Renseigner n pour obtenir la dose/fraction max)
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="muted">
                          Ajouter le % (x%) pour afficher la contrainte complète.
                        </div>
                        <div className="vx-sub-line">
                          Équiv. totale (Gy) = {out.Dequiv_total.toFixed(2)}
                          {row.nNew && out.d_per_frac_needed != null
                            ? ` — d/f max = ${out.d_per_frac_needed.toFixed(2)} Gy`
                            : ""}
                        </div>
                      </>
                    )
                  ) : (
                    <div className="muted">Équivalence calculée :</div>
                  )}
                </div>

                <button
                  className="vx-remove small"
                  onClick={() => removeVxRow(row.id)}
                  title="Supprimer"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </div>
            );
          })}

          <div className="vx-actions">
            <button className="btn" onClick={addVxRow}>
              + Ajouter une contrainte Vx
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
