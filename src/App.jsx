import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

/** ===========
 *  Données OAR (α/β)
 *  =========== */
const OAR_LIST = [
  { name: "Moelle épinière", alphaBeta: 2 },
  { name: "Tronc cérébral", alphaBeta: 2 },
  { name: "Nerf optique", alphaBeta: 2 },
  { name: "Chiasma optique", alphaBeta: 2 },
  { name: "Rétine", alphaBeta: 2 },
  { name: "Cristallin", alphaBeta: 1.5 },
  { name: "Cervelet", alphaBeta: 2 },
  { name: "Cerveau (parenchyme)", alphaBeta: 2 },
  { name: "Hippocampe", alphaBeta: 2 },
  { name: "Glande parotide", alphaBeta: 3 },
  { name: "Glande sous-maxillaire", alphaBeta: 3 },
  { name: "Muqueuse orale", alphaBeta: 10 },
  { name: "Larynx (cartilage)", alphaBeta: 3 },
  { name: "Larynx (muqueuse)", alphaBeta: 10 },
  { name: "Œsophage (tardif)", alphaBeta: 3 },
  { name: "Poumon (tissu normal)", alphaBeta: 3 },
  { name: "Cœur", alphaBeta: 3 },
  { name: "Péricarde", alphaBeta: 3 },
  { name: "Foie", alphaBeta: 3 },
  { name: "Reins", alphaBeta: 1.5 },
  { name: "Vessie", alphaBeta: 3 },
  { name: "Rectum", alphaBeta: 3 },
  { name: "Intestin grêle", alphaBeta: 3 },
  { name: "Côlon", alphaBeta: 3 },
  { name: "Peau (réactions tardives)", alphaBeta: 3 },
  { name: "Peau (réactions aiguës)", alphaBeta: 10 },
  { name: "Os cortical", alphaBeta: 2 },
  { name: "Tête fémorale", alphaBeta: 2 },
  { name: "Testicules", alphaBeta: 2 },
  { name: "Ovaires", alphaBeta: 3 },
];

/** ===========
 *  Helpers
 *  =========== */
const p = (v) => {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const s = String(v).replace(",", ".").trim();
  const num = Number(s);
  return Number.isFinite(num) ? num : NaN;
};
const fmt = (v, digits = 2) =>
  Number.isFinite(v) ? Number(v).toFixed(digits) : "";

const bed = (n, d, ab) => n * d * (1 + d / ab);
const eqd2FromBED = (B, ab) => B / (1 + 2 / ab);

/** ===========
 *  Modèles d’oubli
 *  =========== */
function percentOubliParMois(mode, months) {
  const m = p(months);
  if (!Number.isFinite(m) || m < 0) return 0;
  switch (mode) {
    case "Paradis":
      // 0–3 : 0% ; 4–6 : 10% ; 7–12 : 25% ; ≥12 : 50%
      if (m <= 3) return 0;
      if (m <= 6) return 10;
      if (m <= 12) return 25;
      return 50;
    case "Nieder":
      // 0–3 : 0% ; 4 : 17 ; 5 : 25 ; 6 : 28 ; 7 : 33 ; 8 : 37 ; 9 : 40 ; 10 : 45 ; ≥11 : 50
      if (m <= 3) return 0;
      if (m < 5) return 17;
      if (m < 6) return 25;
      if (m < 7) return 28;
      if (m < 8) return 33;
      if (m < 9) return 37;
      if (m < 10) return 40;
      if (m < 11) return 45;
      return 50;
    case "Abusaris":
      // <6 : 0 ; 6–12 : 25 ; >12 : 50
      if (m < 6) return 0;
      if (m <= 12) return 25;
      return 50;
    case "Noël":
      // 0% avant 12 mois ; +5%/an ensuite ; plateau 50% à 10 ans
      if (m < 12) return 0;
      const yearsAfter1y = Math.floor((m - 12) / 12) + 1; // à 12m → 1 an => 5%
      return Math.min(5 * yearsAfter1y, 50);
    default:
      return 0;
  }
}

/** ===========
 *  Composant principal
 *  =========== */
export default function App() {
  /* ---- Préférences / options globales ---- */
  const [lockMin18, setLockMin18] = useState(false); // Bloquer d/f < 1.8 Gy (autorisé & utilisé)
  const enforceDpf = (d) => {
    const x = p(d);
    if (!Number.isFinite(x)) return NaN;
    return lockMin18 ? Math.max(x, 1.8) : x;
  };

  /* ---- Étape 1 : Autorisé ---- */
  const [oar, setOar] = useState("");
  const [abManual, setAbManual] = useState(""); // α/β manuel
  const abSelected = useMemo(() => {
    if (abManual !== "" && Number.isFinite(p(abManual))) return p(abManual);
    const found = OAR_LIST.find((x) => x.name === oar);
    return found ? found.alphaBeta : NaN;
  }, [oar, abManual]);

  const [totalA, setTotalA] = useState("");
  const [fractionsA, setFractionsA] = useState("");
  const [dpfA, setDpfA] = useState("");
  const [bedA_manual, setBedA_manual] = useState(""); // saisie manuelle alternative

  // Recalcul “champ manquant” (exactement comme avant) — sur clic
  const calcMissingA = () => {
    const td = p(totalA);
    const n = p(fractionsA);
    const d = p(dpfA);
    if (Number.isFinite(td) && Number.isFinite(n) && !Number.isFinite(d)) {
      setDpfA(fmt(td / n));
    } else if (Number.isFinite(td) && Number.isFinite(d) && !Number.isFinite(n)) {
      setFractionsA(String(Math.round(td / d)));
    }
  };

  // Valeurs autorisées (BED/EQD2/dose physique)
  const B_A = useMemo(() => {
    if (bedA_manual !== "" && Number.isFinite(p(bedA_manual))) {
      return p(bedA_manual);
    }
    const n = p(fractionsA);
    let d = p(dpfA);
    const ab = abSelected;
    if (!Number.isFinite(ab) || ab <= 0) return NaN;
    if (Number.isFinite(p(totalA)) && !Number.isFinite(d) && Number.isFinite(n)) {
      // si total et n présents mais pas d : on peut déduire d = total/n pour calcul physique
      d = p(totalA) / n;
    }
    if (!Number.isFinite(n) || !Number.isFinite(d)) return NaN;
    const dEff = enforceDpf(d);
    return bed(n, dEff, ab);
  }, [bedA_manual, fractionsA, dpfA, totalA, abSelected, lockMin18]);

  const EQD2_A = useMemo(() => {
    if (!Number.isFinite(B_A) || !Number.isFinite(abSelected) || abSelected <= 0)
      return NaN;
    return eqd2FromBED(B_A, abSelected);
  }, [B_A, abSelected]);

  const dosePhys_A = useMemo(() => {
    // Dose physique autorisée = dpf * n si on a les deux, sinon total si saisi
    const n = p(fractionsA);
    const d = Number.isFinite(p(dpfA)) ? enforceDpf(dpfA) : NaN;
    if (Number.isFinite(n) && Number.isFinite(d)) {
      return n * d;
    }
    const td = p(totalA);
    return Number.isFinite(td) ? td : NaN;
  }, [fractionsA, dpfA, totalA, lockMin18]);

  /* ---- Étape 2 : Utilisée (1ère irradiation) ---- */
  const [totalU, setTotalU] = useState("");
  const [fractionsU, setFractionsU] = useState("");
  const [dpfU, setDpfU] = useState("");

  // AUTO : dpfU = totalU / fractionsU (bug corrigé : recalcule à chaque changement)
  useEffect(() => {
    const td = p(totalU);
    const n = p(fractionsU);
    if (Number.isFinite(td) && Number.isFinite(n) && n > 0) {
      setDpfU(fmt(td / n));
    } else {
      setDpfU(""); // si incomplet, on efface
    }
  }, [totalU, fractionsU]);

  const B_U = useMemo(() => {
    const n = p(fractionsU);
    const d = enforceDpf(dpfU);
    const ab = abSelected;
    if (!Number.isFinite(ab) || ab <= 0) return NaN;
    if (!Number.isFinite(n) || !Number.isFinite(d)) return NaN;
    return bed(n, d, ab);
  }, [fractionsU, dpfU, abSelected, lockMin18]);

  const EQD2_U = useMemo(() => {
    if (!Number.isFinite(B_U) || !Number.isFinite(abSelected) || abSelected <= 0)
      return NaN;
    return eqd2FromBED(B_U, abSelected);
  }, [B_U, abSelected]);

  const dosePhys_U = useMemo(() => {
    const n = p(fractionsU);
    const d = enforceDpf(dpfU);
    if (Number.isFinite(n) && Number.isFinite(d)) return n * d;
    const td = p(totalU);
    return Number.isFinite(td) ? td : NaN;
  }, [fractionsU, dpfU, totalU, lockMin18]);

  /* ---- Étape 3 : Oubli + BED restante ---- */
  const [mois, setMois] = useState("");
  const [modeOubli, setModeOubli] = useState("Paradis");
  const [pourcentManuel, setPourcentManuel] = useState("");
  const pourcentAuto = useMemo(
    () => percentOubliParMois(modeOubli, mois),
    [modeOubli, mois]
  );
  const forgetPct = useMemo(() => {
    const m = p(pourcentManuel);
    if (Number.isFinite(m)) return Math.min(Math.max(m, 0), 50);
    return pourcentAuto;
  }, [pourcentManuel, pourcentAuto]);

  const [bedR_manual, setBedR_manual] = useState(""); // “OU BED restante (saisie manuelle)”

  const B_R = useMemo(() => {
    if (bedR_manual !== "" && Number.isFinite(p(bedR_manual))) {
      return p(bedR_manual);
    }
    if (!Number.isFinite(B_A) || !Number.isFinite(B_U)) return NaN;
    // BED restante = BED_autorisée - BED_utilisée*(1 - oubli)
    const B = B_A - B_U * (1 - forgetPct / 100);
    return B >= 0 ? B : 0;
  }, [bedR_manual, B_A, B_U, forgetPct]);

  const EQD2_R = useMemo(() => {
    if (!Number.isFinite(B_R) || !Number.isFinite(abSelected) || abSelected <= 0)
      return NaN;
    return eqd2FromBED(B_R, abSelected);
  }, [B_R, abSelected]);

  // Dose physique “restante” n’est pas définie sans n/d cibles ; on l’affichera en Étape 4

  /* ---- Étape 4 : Dose max par fraction possible pour n prévu ---- */
  const [nPrev, setNPrev] = useState("");
  const dpfMax = useMemo(() => {
    // d solution de : B_R = n * d * (1 + d/ab)  →  (n/ab) d^2 + n d - B_R = 0
    const B = B_R;
    const n = p(nPrev);
    const ab = abSelected;
    if (!Number.isFinite(B) || !Number.isFinite(n) || !Number.isFinite(ab)) return NaN;
    if (B <= 0 || n <= 0 || ab <= 0) return NaN;
    const a = n / ab;
    const b = n;
    const c = -B;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return NaN;
    const d = (-b + Math.sqrt(disc)) / (2 * a); // racine positive
    return d;
  }, [B_R, nPrev, abSelected]);

  const totalMax = useMemo(() => {
    const n = p(nPrev);
    return Number.isFinite(dpfMax) && Number.isFinite(n) ? dpfMax * n : NaN;
  }, [dpfMax, nPrev]);

  /* ---- Historique ---- */
  const [organeTitre, setOrganeTitre] = useState("");
  const [history, setHistory] = useState([]);
  const saveEntry = () => {
    const name = (organeTitre || oar || "Organe").trim();
    setHistory((prev) => [
      ...prev,
      {
        name,
        ab: Number.isFinite(abSelected) ? abSelected : null,
        A: {
          BED: Number.isFinite(B_A) ? fmt(B_A) : "",
          EQD2: Number.isFinite(EQD2_A) ? fmt(EQD2_A) : "",
          phys: Number.isFinite(dosePhys_A) ? fmt(dosePhys_A) : "",
          n: Number.isFinite(p(fractionsA)) ? String(p(fractionsA)) : "",
          dpf: Number.isFinite(p(dpfA)) ? fmt(enforceDpf(dpfA)) : "",
          total: Number.isFinite(p(totalA)) ? fmt(p(totalA)) : "",
        },
        U: {
          BED: Number.isFinite(B_U) ? fmt(B_U) : "",
          EQD2: Number.isFinite(EQD2_U) ? fmt(EQD2_U) : "",
          phys: Number.isFinite(dosePhys_U) ? fmt(dosePhys_U) : "",
          n: Number.isFinite(p(fractionsU)) ? String(p(fractionsU)) : "",
          dpf: Number.isFinite(p(dpfU)) ? fmt(enforceDpf(dpfU)) : "",
          total: Number.isFinite(p(totalU)) ? fmt(p(totalU)) : "",
        },
        R: {
          BED: Number.isFinite(B_R) ? fmt(B_R) : "",
          EQD2: Number.isFinite(EQD2_R) ? fmt(EQD2_R) : "",
        },
        plan: {
          n: Number.isFinite(p(nPrev)) ? String(p(nPrev)) : "",
          dpfMax: Number.isFinite(dpfMax) ? fmt(dpfMax) : "",
          totalMax: Number.isFinite(totalMax) ? fmt(totalMax) : "",
        },
      },
    ]);
    setOrganeTitre("");
  };

  /* ---- Conversion VxGy (équivalences) ---- */
  const [vx_ab_manual, setVxAbManual] = useState(""); // alpha/beta spécifique à l’étape Vx (par défaut = abSelected)
  const vxAB = useMemo(() => {
    const v = p(vx_ab_manual);
    if (Number.isFinite(v) && v > 0) return v;
    return Number.isFinite(abSelected) ? abSelected : NaN;
  }, [vx_ab_manual, abSelected]);

  const [vxDoseSeuilIni, setVxDoseSeuilIni] = useState("");
  const [vxDpfIni, setVxDpfIni] = useState("");
  const [vxN, setVxN] = useState("");
  const [vxDpfNew, setVxDpfNew] = useState("");

  const vxResult = useMemo(() => {
    const D0 = p(vxDoseSeuilIni);
    const d0 = p(vxDpfIni);
    const n1 = p(vxN);
    const d1 = p(vxDpfNew);
    const ab = vxAB;
    if (!Number.isFinite(D0) || !Number.isFinite(d0) || !Number.isFinite(ab)) return null;

    // BED de référence pour la dose-seuil
    const BED_ref = D0 * (1 + d0 / ab);

    // Nouvelle dose-seuil physique si on impose d1 :
    // D1 = BED_ref / (1 + d1/ab)
    const D1_if_d1 = Number.isFinite(d1) ? BED_ref / (1 + d1 / ab) : NaN;

    // Si on impose n1, quelle d/f donnerait la même dose-seuil ?:
    // BED_ref = n1 * d * (1 + d/ab)  -> résout d
    let dNeeded = NaN;
    if (Number.isFinite(n1) && n1 > 0) {
      const a = n1 / ab;
      const b = n1;
      const c = -BED_ref;
      const disc = b * b - 4 * a * c;
      if (disc >= 0) dNeeded = (-b + Math.sqrt(disc)) / (2 * a);
    }

    return {
      equivTotalIfD1: Number.isFinite(D1_if_d1) ? D1_if_d1 : null,
      dpfNeededIfN1: Number.isFinite(dNeeded) ? dNeeded : null,
    };
  }, [vxDoseSeuilIni, vxDpfIni, vxN, vxDpfNew, vxAB]);

  /* ---- UI ---- */
  return (
    <div className="container">
      <h1 className="title">BED Simulator ☢️</h1>

      {/* Option globale */}
      <div className="inline-row">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={lockMin18}
            onChange={(e) => setLockMin18(e.target.checked)}
          />
          Bloquer les doses par fraction &lt; 1,8 Gy (autorisé & utilisée)
        </label>
      </div>

      {/* Étape 1 */}
      <section className="card">
        <h2 className="step-title">1) BED totale autorisée</h2>

        <div className="two-col">
          <div className="col">
            <label className="lbl">Organe (OAR)</label>
            <select value={oar} onChange={(e) => setOar(e.target.value)}>
              <option value="">— Choisir —</option>
              {OAR_LIST.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col">
            <label className="lbl">α/β (Gy) — manuel</label>
            <input
              value={abManual}
              onChange={(e) => setAbManual(e.target.value)}
              inputMode="decimal"
            />
          </div>
        </div>

        {Number.isFinite(abSelected) && (
          <div className="hint">
            <strong>α/β utilisé :</strong> {fmt(abSelected, 2)} Gy
          </div>
        )}

        <div className="links">
          <a
            href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/"
            target="_blank" rel="noreferrer"
          >
            Contraintes Recorad : dose par fraction &lt; 6 Gy
          </a>
          <a
            href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/"
            target="_blank" rel="noreferrer"
          >
            Contraintes Recorad : dose par fraction &gt; 6 Gy
          </a>
        </div>

        <div className="field-block">
          <label className="lbl">Dose totale (Gy)</label>
          <input value={totalA} onChange={(e) => setTotalA(e.target.value)} inputMode="decimal" />
        </div>

        <div className="field-block">
          <label className="lbl">Nombre de fractions</label>
          <input value={fractionsA} onChange={(e) => setFractionsA(e.target.value)} inputMode="numeric" />
        </div>

        <div className="field-block">
          <label className="lbl">Dose par fraction (Gy)</label>
          <input value={dpfA} onChange={(e) => setDpfA(e.target.value)} inputMode="decimal" />
        </div>

        <div className="actions">
          <button className="btn" onClick={calcMissingA}>⚙️ Calculer le champ manquant</button>
        </div>

        <div className="result-pane">
          <div><strong>BED autorisée :</strong> {fmt(B_A)}</div>
          <div><strong>EQD2 autorisée :</strong> {fmt(EQD2_A)}</div>
          <div><strong>Dose physique autorisée :</strong> {fmt(dosePhys_A)}</div>
        </div>

        <div className="field-block">
          <label className="lbl">OU BED autorisée (saisie manuelle)</label>
          <input value={bedA_manual} onChange={(e) => setBedA_manual(e.target.value)} inputMode="decimal" />
        </div>
      </section>

      {/* Étape 2 */}
      <section className="card">
        <h2 className="step-title">2) BED utilisée (première irradiation)</h2>

        <div className="field-block">
          <label className="lbl">Dose totale reçue (Gy)</label>
          <input value={totalU} onChange={(e) => setTotalU(e.target.value)} inputMode="decimal" />
        </div>

        <div className="field-block">
          <label className="lbl">Nombre de fractions</label>
          <input value={fractionsU} onChange={(e) => setFractionsU(e.target.value)} inputMode="numeric" />
        </div>

        <div className="field-block">
          <label className="lbl">Dose par fraction (Gy) — calculée</label>
          <input value={dpfU} onChange={(e) => setDpfU(e.target.value)} inputMode="decimal" />
        </div>

        <div className="result-pane">
          <div><strong>BED utilisée :</strong> {fmt(B_U)}</div>
          <div><strong>EQD2 utilisée :</strong> {fmt(EQD2_U)}</div>
          <div><strong>Dose physique utilisée :</strong> {fmt(dosePhys_U)}</div>
        </div>
      </section>

      {/* Étape 3 */}
      <section className="card">
        <h2 className="step-title">3) BED restante autorisée</h2>

        <div className="field-block">
          <label className="lbl">Mois écoulés depuis la fin de RT</label>
          <input value={mois} onChange={(e) => setMois(e.target.value)} inputMode="numeric" />
        </div>

        <div className="field-block">
          <label className="lbl">Modèle de dose d’oubli</label>
          <select value={modeOubli} onChange={(e) => setModeOubli(e.target.value)}>
            <option value="Paradis">Paradis et al. : récupération rapide</option>
            <option value="Nieder">Nieder et al. : récupération rapide</option>
            <option value="Abusaris">Abusaris et al. : récupération rapide</option>
            <option value="Noël">Noël et al. : récupération lente</option>
          </select>
          <div className="model-notes">
            <details>
              <summary>Détails des modèles (cliquer)</summary>
              <div className="notes">
                <p><strong>Paradis :</strong><br/>0–3 mois : 0%<br/>4–6 mois : 10%<br/>7–12 mois : 25%<br/>≥12 mois : 50%</p>
                <p><strong>Nieder :</strong><br/>0–3 mois : 0%<br/>4 : 17%<br/>5 : 25%<br/>6 : 28%<br/>7 : 33%<br/>8 : 37%<br/>9 : 40%<br/>10 : 45%<br/>≥11 : 50%</p>
                <p><strong>Abusaris :</strong><br/>{`<`}6 mois : 0%<br/>6–12 mois : 25%<br/>{`>`}12 mois : 50%</p>
                <p><strong>Noël :</strong><br/>0% avant 1 an, puis +5%/an jusqu’à 10 ans, plateau 50%.</p>
              </div>
            </details>
          </div>
        </div>

        <div className="two-col">
          <div className="col">
            <div className="hint"><strong>% d’oubli auto :</strong> {fmt(forgetPct, 0)} %</div>
          </div>
          <div className="col">
            <label className="lbl">% d’oubli — saisie manuelle (optionnel)</label>
            <input value={pourcentManuel} onChange={(e) => setPourcentManuel(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        <div className="result-pane">
          <div><strong>BED restante :</strong> {fmt(B_R)}</div>
          <div><strong>EQD2 restante :</strong> {fmt(EQD2_R)}</div>
        </div>

        <div className="field-block">
          <label className="lbl">OU BED restante (saisie manuelle)</label>
          <input value={bedR_manual} onChange={(e) => setBedR_manual(e.target.value)} inputMode="decimal" />
        </div>
      </section>

      {/* Étape 4 */}
      <section className="card">
        <h2 className="step-title">4) Dose maximale par fraction autorisée</h2>

        <div className="field-block">
          <label className="lbl">Nombre de fractions prévues</label>
          <input value={nPrev} onChange={(e) => setNPrev(e.target.value)} inputMode="numeric" />
        </div>

        <div className="result-pane">
          <div><strong>Dose max par fraction (Gy) :</strong> {fmt(dpfMax)}</div>
          <div><strong>Dose totale max possible (Gy) :</strong> {fmt(totalMax)}</div>
        </div>

        <div className="save-row">
          <label className="lbl">Nom de l’organe à sauvegarder</label>
          <input value={organeTitre} onChange={(e) => setOrganeTitre(e.target.value)} />
          <button className="btn" onClick={saveEntry}>💾 Sauvegarder</button>
        </div>
      </section>

      {/* Historique */}
      <section className="card">
        <h2 className="step-title">📘 Résultats enregistrés</h2>
        {history.length === 0 && <div className="hint">Aucun résultat pour l’instant.</div>}
        {history.map((h, i) => (
          <div key={i} className="history-block">
            <div className="history-title">{h.name}</div>
            {h.ab != null && <div className="small">α/β : {fmt(h.ab)}</div>}
            <div className="history-row">
              <div>
                <div className="history-sub">Autorisé</div>
                <div>BED : {h.A.BED} Gy</div>
                <div>EQD2 : {h.A.EQD2} Gy</div>
                <div>Dose physique : {h.A.phys} Gy</div>
              </div>
              <div>
                <div className="history-sub">Utilisé</div>
                <div>BED : {h.U.BED} Gy</div>
                <div>EQD2 : {h.U.EQD2} Gy</div>
                <div>Dose physique : {h.U.phys} Gy</div>
              </div>
              <div>
                <div className="history-sub">Restant</div>
                <div>BED : {h.R.BED} Gy</div>
                <div>EQD2 : {h.R.EQD2} Gy</div>
              </div>
              <div>
                <div className="history-sub">Plan</div>
                <div>n : {h.plan.n}</div>
                <div>d/f max : {h.plan.dpfMax} Gy</div>
                <div>Totale max : {h.plan.totalMax} Gy</div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Conversion VxGy */}
      <section className="card">
        <h2 className="step-title center">Conversion VxGy &lt; x% — équivalent</h2>

        <div className="two-col">
          <div className="col">
            <label className="lbl">α/β (Gy) utilisé</label>
            <input
              value={vx_ab_manual}
              onChange={(e) => setVxAbManual(e.target.value)}
              placeholder={Number.isFinite(abSelected) ? String(abSelected) : ""}
              inputMode="decimal"
            />
            <div className="hint small">
              α/β par défaut : {Number.isFinite(abSelected) ? fmt(abSelected) : "—"}
            </div>
          </div>
          <div className="col" />
        </div>

        <div className="two-col">
          <div className="col">
            <label className="lbl">Dose seuil initiale (Gy)</label>
            <input value={vxDoseSeuilIni} onChange={(e) => setVxDoseSeuilIni(e.target.value)} inputMode="decimal" />
          </div>
          <div className="col">
            <label className="lbl">Dose par fraction initiale (Gy)</label>
            <input value={vxDpfIni} onChange={(e) => setVxDpfIni(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        <div className="two-col">
          <div className="col">
            <label className="lbl">Nouveau nombre de fractions (n)</label>
            <input value={vxN} onChange={(e) => setVxN(e.target.value)} inputMode="numeric" />
          </div>
          <div className="col">
            <label className="lbl">Nouvelle dose par fraction (Gy)</label>
            <input value={vxDpfNew} onChange={(e) => setVxDpfNew(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        {vxResult && (
          <div className="result-pane">
            <div>
              <strong>Nouvelle contrainte Vx :</strong><br />
              • Équiv. totale (si d/f fixé) : {fmt(vxResult.equivTotalIfD1)} Gy<br />
              • d/f nécessaire (si n fixé) : {fmt(vxResult.dpfNeededIfN1)} Gy
            </div>
          </div>
        )}
      </section>

      <footer className="foot-space" />
    </div>
  );
}
