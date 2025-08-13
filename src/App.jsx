/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState } from "react";
import "./index.css";

/** ---------- Utilitaires ---------- */
const parseNum = (v) => {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return NaN;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};
const fmt = (x, d = 2) =>
  Number.isFinite(x) ? (Math.round(x * 10 ** d) / 10 ** d).toFixed(d) : "";

/** Résolution d pour B = n*d*(1 + d/ab)  */
const solveDosePerFraction = (B, n, ab) => {
  if (!Number.isFinite(B) || !Number.isFinite(n) || !Number.isFinite(ab) || n <= 0 || ab <= 0) return NaN;
  // d^2/ab + d - B/n = 0  => d = 0.5*ab*(sqrt(1 + 4*B/(n*ab)) - 1)
  const disc = 1 + (4 * B) / (n * ab);
  if (disc < 0) return NaN;
  return 0.5 * ab * (Math.sqrt(disc) - 1);
};

/** % d’oubli selon les modèles */
const forgetParadis = (months) => {
  if (months <= 3) return 0;
  if (months <= 6) return 10;
  if (months <= 12) return 25;
  return 50;
};
const forgetNieder = (months) => {
  if (months <= 3) return 0;
  if (months < 4) return 0;
  if (months < 5) return 17;
  if (months < 6) return 25;
  if (months < 7) return 28;
  if (months < 8) return 33;
  if (months < 9) return 37;
  if (months < 10) return 40;
  if (months < 11) return 45;
  return 50;
};
const forgetAbusaris = (months) => {
  if (months < 6) return 0;
  if (months <= 12) return 25;
  return 50;
};
const forgetNoel = (months) => {
  // 0 % avant 1 an, puis +5 % / an jusqu’à 50 % (plateau à 10 ans)
  if (months < 12) return 0;
  const years = Math.floor(months / 12);
  const p = Math.min(50, (years - 1) * 5); // 1 an => 0 ; 2 ans => 5 ; ... ; 10 ans => 45 ; ≥10 => 50 (plateau)
  return years >= 10 ? 50 : p;
};
const monthsBetween = (d1, d2) => {
  if (!(d1 && d2)) return NaN;
  const a = new Date(d1);
  const b = new Date(d2);
  if (isNaN(a) || isNaN(b)) return NaN;
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(0, months);
};

/** OAR α/β (pré-sélection) */
const OARS = [
  { label: "— Choisir un OAR —", ab: "" },
  { label: "Moelle épinière", ab: 2 },
  { label: "Tronc cérébral", ab: 2 },
  { label: "Nerf optique", ab: 2 },
  { label: "Chiasma optique", ab: 2 },
  { label: "Rétine", ab: 2 },
  { label: "Cristallin", ab: 1.2 },
  { label: "Cervelet", ab: 2 },
  { label: "Cerveau (parenchyme)", ab: 2 },
  { label: "Hippocampe", ab: 2 },
  { label: "Glande parotide", ab: 3 },
  { label: "Glande sous-maxillaire", ab: 3 },
  { label: "Muqueuse orale", ab: 10 },
  { label: "Larynx (cartilage)", ab: 3 },
  { label: "Larynx (muqueuse)", ab: 10 },
  { label: "Œsophage (tardif)", ab: 3 },
  { label: "Poumon (tissu normal)", ab: 3 },
  { label: "Cœur", ab: 3 },
  { label: "Péricarde", ab: 3 },
  { label: "Foie", ab: 2.7 },
  { label: "Reins", ab: 1.5 },
  { label: "Vessie", ab: 3 },
  { label: "Rectum", ab: 3 },
  { label: "Intestin grêle", ab: 3 },
  { label: "Côlon", ab: 3 },
  { label: "Peau (réactions tardives)", ab: 3 },
  { label: "Peau (réactions aiguës)", ab: 10 },
  { label: "Os cortical", ab: 1.7 },
  { label: "Tête fémorale", ab: 2 },
  { label: "Testicules", ab: 2 },
  { label: "Ovaires", ab: 3 },
];

/** ---------- Composant principal ---------- */
export default function App() {
  /** Options globales */
  const [blockUnder18, setBlockUnder18] = useState(false);

  /** Étape 1 — BED autorisée */
  const [oarIdx, setOarIdx] = useState(0);
  const [alphaBeta, setAlphaBeta] = useState(""); // manuel (prérempli via OAR)
  const [totalDose1, setTotalDose1] = useState("");
  const [dpf1, setDpf1] = useState("");
  const [n1, setN1] = useState("");
  const [manualBedAllowed, setManualBedAllowed] = useState("");

  /** Étape 2 — BED utilisée */
  const [usedTotal, setUsedTotal] = useState("");
  const [usedDpf, setUsedDpf] = useState("");
  const [usedN, setUsedN] = useState("");

  /** Étape 3 — % d’oubli, dates & modèle */
  const [forgetManual, setForgetManual] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [model, setModel] = useState("paradis");

  /** Étape 4 — nouveau schéma */
  const [newN, setNewN] = useState("");

  /** Résultats enregistrés */
  const [organName, setOrganName] = useState("");
  const [saved, setSaved] = useState([]);

  /** Section Conversion VxGy */
  const [vxInitialDose, setVxInitialDose] = useState("");
  const [vxInitialDpf, setVxInitialDpf] = useState("");
  const [vxNewN, setVxNewN] = useState("");
  const [vxNewDpf, setVxNewDpf] = useState("");
  const [vxAb, setVxAb] = useState("");
  const [vxPercent, setVxPercent] = useState("30");

  /** Pré-remplir α/β via OAR */
  const onSelectOAR = (idx) => {
    setOarIdx(idx);
    const ab = OARS[idx].ab;
    if (ab !== "") setAlphaBeta(String(ab));
  };

  /** Boutons “Calculer le champ manquant” pour ÉTAPE 1 et 2 */
  const calcMissingStep1 = () => {
    const TD = parseNum(totalDose1);
    const N = parseNum(n1);
    const D = parseNum(dpf1);
    if (Number.isFinite(TD) && Number.isFinite(N) && !Number.isFinite(D)) {
      if (N > 0) setDpf1(fmt(TD / N));
    } else if (Number.isFinite(TD) && Number.isFinite(D) && !Number.isFinite(N)) {
      if (D > 0) setN1(String(Math.round(TD / D)));
    }
  };
  const calcMissingStep2 = () => {
    const TD = parseNum(usedTotal);
    const N = parseNum(usedN);
    const D = parseNum(usedDpf);
    if (Number.isFinite(TD) && Number.isFinite(N) && !Number.isFinite(D)) {
      if (N > 0) setUsedDpf(fmt(TD / N));
    } else if (Number.isFinite(TD) && Number.isFinite(D) && !Number.isFinite(N)) {
      if (D > 0) setUsedN(String(Math.round(TD / D)));
    }
  };

  /** Valeurs communes */
  const ab = parseNum(alphaBeta);
  const abOrNaN = Number.isFinite(ab) ? ab : NaN;
  const clampDpf = (x) => (blockUnder18 ? Math.max(x, 1.8) : x);

  /** Étape 1 — calculs */
  const d1Raw = parseNum(dpf1);
  const n1Raw = parseNum(n1);
  const td1 = parseNum(totalDose1);
  const d1 = Number.isFinite(d1Raw) ? clampDpf(d1Raw) : NaN;
  const n1v = Number.isFinite(n1Raw) ? n1Raw : Number.isFinite(td1) && Number.isFinite(d1) && d1 > 0 ? Math.round(td1 / d1) : NaN;

  const bedAllowed = useMemo(() => {
    if (!Number.isFinite(abOrNaN)) return NaN;
    // Priorité au manuel si saisi
    const man = parseNum(manualBedAllowed);
    if (Number.isFinite(man)) return man;
    if (Number.isFinite(td1) && Number.isFinite(d1) && Number.isFinite(n1v)) {
      return n1v * d1 * (1 + d1 / abOrNaN);
    }
    return NaN;
  }, [manualBedAllowed, td1, d1, n1v, abOrNaN]);

  const eqd2Allowed = Number.isFinite(bedAllowed) && Number.isFinite(abOrNaN)
    ? bedAllowed / (1 + 2 / abOrNaN)
    : NaN;

  /** Étape 2 — calculs */
  const usedTd = parseNum(usedTotal);
  const usedD = Number.isFinite(parseNum(usedDpf)) ? clampDpf(parseNum(usedDpf)) : NaN;
  const usedNv = parseNum(usedN);

  const bedUsed = Number.isFinite(usedD) && Number.isFinite(usedNv) && Number.isFinite(abOrNaN)
    ? usedNv * usedD * (1 + usedD / abOrNaN)
    : NaN;

  const eqd2Used = Number.isFinite(bedUsed) && Number.isFinite(abOrNaN)
    ? bedUsed / (1 + 2 / abOrNaN)
    : NaN;

  /** Étape 3 — % d’oubli & BED restante */
  const months = monthsBetween(startDate, endDate);
  const modelPct = useMemo(() => {
    if (!Number.isFinite(months)) return NaN;
    switch (model) {
      case "paradis": return forgetParadis(months);
      case "nieder": return forgetNieder(months);
      case "abusaris": return forgetAbusaris(months);
      case "noel": return forgetNoel(months);
      default: return NaN;
    }
  }, [model, months]);

  const pctUsed = Number.isFinite(parseNum(forgetManual))
    ? parseNum(forgetManual)
    : (Number.isFinite(modelPct) ? modelPct : 0);

  const bedRemaining = Number.isFinite(bedAllowed) && Number.isFinite(bedUsed)
    ? bedAllowed - bedUsed * (1 - pctUsed / 100)
    : NaN;

  const eqd2Remaining = Number.isFinite(bedRemaining) && Number.isFinite(abOrNaN)
    ? bedRemaining / (1 + 2 / abOrNaN)
    : NaN;

  /** Étape 4 — dose max/fraction & dose totale max */
  const newNnum = parseNum(newN);
  const dMax = Number.isFinite(bedRemaining) && Number.isFinite(newNnum) && Number.isFinite(abOrNaN)
    ? solveDosePerFraction(bedRemaining, newNnum, abOrNaN)
    : NaN;

  const totalMax = Number.isFinite(dMax) && Number.isFinite(newNnum) ? dMax * newNnum : NaN;

  /** Sauvegarde */
  const saveCurrent = () => {
    const name = organName.trim() || `Organe ${saved.length + 1}`;
    const entry = {
      organ: name,
      bedRemaining,
      eqd2Remaining,
      dMax,
      newN: Number.isFinite(newNnum) ? newNnum : null,
      totalMax,
    };
    setSaved((prev) => [entry, ...prev]);
    setOrganName("");
  };
  const removeSaved = (i) => setSaved((prev) => prev.filter((_, k) => k !== i));

  /** Conversion VxGy — calculs */
  const vx_ab = Number.isFinite(parseNum(vxAb)) ? parseNum(vxAb) : abOrNaN;
  const vx_td0 = parseNum(vxInitialDose);
  const vx_d0 = parseNum(vxInitialDpf);
  const vx_n = parseNum(vxNewN);
  const vx_d = parseNum(vxNewDpf);
  const vx_pct = parseNum(vxPercent);

  const vx_bedRef = Number.isFinite(vx_td0) && Number.isFinite(vx_d0) && Number.isFinite(vx_ab)
    ? vx_td0 * (1 + vx_d0 / vx_ab)
    : NaN;

  const vx_equivTotal = Number.isFinite(vx_bedRef) && Number.isFinite(vx_d) && Number.isFinite(vx_ab)
    ? vx_bedRef / (1 + vx_d / vx_ab)
    : NaN;

  const vx_equivPerFx = Number.isFinite(vx_equivTotal) && Number.isFinite(vx_n) && vx_n > 0
    ? vx_equivTotal / vx_n
    : NaN;

  return (
    <div className="app">
      <h1 className="title centered">BED Simulator ☢️</h1>

      {/* Bandeau options */}
      <div className="banner">
        <label className="inline">
          <input
            type="checkbox"
            checked={blockUnder18}
            onChange={(e) => setBlockUnder18(e.target.checked)}
          />
          <span> Bloquer les doses par fraction &lt; 1.8 Gy (étapes 1 & 2)</span>
        </label>
      </div>

      {/* Étape 1 */}
      <section className="section">
        <h2 className="section-title">1) <strong>BED totale autorisée</strong></h2>

        <div className="oar-row">
          <div className="oar-col">
            <label className="field-label">Organe (OAR) — α/β suggéré</label>
            <select
              value={oarIdx}
              onChange={(e) => onSelectOAR(parseInt(e.target.value, 10))}
            >
              {OARS.map((o, i) => (
                <option key={i} value={i}>
                  {o.label}{o.ab !== "" ? ` (α/β = ${o.ab})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="oar-col">
            <label className="field-label">α/β (Gy) — manuel</label>
            <input
              value={alphaBeta}
              onChange={(e) => setAlphaBeta(e.target.value)}
              placeholder="ex : 3"
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Dose totale (Gy)</label>
          <input
            value={totalDose1}
            onChange={(e) => setTotalDose1(e.target.value)}
            placeholder="ex : 60"
            inputMode="decimal"
          />
        </div>

        <div className="field">
          <label className="field-label">Dose par fraction (Gy)</label>
          <input
            value={dpf1}
            onChange={(e) => setDpf1(e.target.value)}
            placeholder="ex : 2"
            inputMode="decimal"
          />
        </div>

        <div className="field">
          <label className="field-label">Nombre de fractions (n)</label>
          <input
            value={n1}
            onChange={(e) => setN1(e.target.value)}
            placeholder="ex : 30"
            inputMode="numeric"
          />
        </div>

        <button className="btn" onClick={calcMissingStep1}>⚙️ Calculer le champ manquant</button>

        <div className="result blue">
          <div><strong>BED autorisée :</strong> {fmt(bedAllowed)} Gy</div>
          <div><strong>EQD2 autorisée :</strong> {fmt(eqd2Allowed)} Gy</div>
          <div><strong>Dose physique autorisée :</strong> {Number.isFinite(td1) ? fmt(td1) : ""} Gy</div>
        </div>

        <div className="field">
          <label className="field-label">OU BED autorisée (saisie manuelle)</label>
          <input
            value={manualBedAllowed}
            onChange={(e) => setManualBedAllowed(e.target.value)}
            placeholder="ex : 120"
            inputMode="decimal"
          />
        </div>

        <div className="links">
          <div><a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/doses-limites-des-irradiations-normofractionnees-ou-hypofractionnees-moderees-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes ReCoRAD : dose par fraction &lt; 6 Gy</a></div>
          <div><a href="https://sfro-recorad.fr/radiotherapie-principes-generaux/doses-limites-dans-les-organes-a-risque/test_doses-limites-des-irradiations-hypofractionnees-ablatives-dose-par-fraction-6-gy-des-organes-a-risque/" target="_blank" rel="noreferrer">Contraintes ReCoRAD : dose par fraction ≥ 6 Gy</a></div>
        </div>
      </section>

      {/* Étape 2 */}
      <section className="section">
        <h2 className="section-title">2) <strong>BED utilisée (1ère irradiation)</strong></h2>

        <div className="field">
          <label className="field-label">Dose totale reçue (Gy)</label>
          <input
            value={usedTotal}
            onChange={(e) => setUsedTotal(e.target.value)}
            placeholder="ex : 57"
            inputMode="decimal"
          />
        </div>

        <div className="field">
          <label className="field-label">Dose par fraction (Gy)</label>
          <input
            value={usedDpf}
            onChange={(e) => setUsedDpf(e.target.value)}
            placeholder="ex : 1.9"
            inputMode="decimal"
          />
        </div>

        <div className="field">
          <label className="field-label">Nombre de fractions (n)</label>
          <input
            value={usedN}
            onChange={(e) => setUsedN(e.target.value)}
            placeholder="ex : 30"
            inputMode="numeric"
          />
        </div>

        <button className="btn" onClick={calcMissingStep2}>⚙️ Calculer le champ manquant</button>

        <div className="result">
          <div><strong>BED utilisée :</strong> {fmt(bedUsed)} Gy</div>
          <div><strong>EQD2 utilisée :</strong> {fmt(eqd2Used)} Gy</div>
          <div><strong>Dose physique utilisée :</strong> {Number.isFinite(usedTd) ? fmt(usedTd) : ""} Gy</div>
        </div>
      </section>

      {/* Étape 3 */}
      <section className="section">
        <h2 className="section-title">3) <strong>BED restante autorisée</strong></h2>

        <div className="field">
          <label className="field-label">% de dose d’oubli (manuel)</label>
          <input
            value={forgetManual}
            onChange={(e) => setForgetManual(e.target.value)}
            placeholder="ex : 25"
            inputMode="decimal"
          />
        </div>

        <div className="dates-row">
          <div className="field small">
            <label className="field-label">Date de début RT</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field small">
            <label className="field-label">Date de fin RT</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="field small">
            <label className="field-label">Modèle d’oubli</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="paradis">Paradis et al. : récupération rapide</option>
              <option value="nieder">Nieder et al. : récupération rapide</option>
              <option value="abusaris">Abusaris et al. : récupération rapide</option>
              <option value="noel">Noël et al. : récupération lente</option>
            </select>
          </div>
          <div className="helps">
            <details>
              <summary>ℹ️ Paradis</summary>
              <div>0–3 mois : 0 %<br/>4–6 mois : 10 %<br/>7–12 mois : 25 %<br/>≥ 12 mois : 50 %</div>
            </details>
            <details>
              <summary>ℹ️ Nieder</summary>
              <div>0–3 mois : 0 %<br/>4 : 17 %<br/>5 : 25 %<br/>6 : 28 %<br/>7 : 33 %<br/>8 : 37 %<br/>9 : 40 %<br/>10 : 45 %<br/>≥ 11 : 50 %</div>
            </details>
            <details>
              <summary>ℹ️ Abusaris</summary>
              <div>&lt; 6 mois : 0 %<br/>6–12 : 25 %<br/>&gt; 12 : 50 %</div>
            </details>
            <details>
              <summary>ℹ️ Noël</summary>
              <div>0 % avant 1 an<br/>puis +5 %/an jusqu’à 10 ans<br/>≥ 10 ans : 50 %</div>
            </details>
          </div>
        </div>

        <div className="result">
          <div><strong>% d’oubli utilisé :</strong> {Number.isFinite(pctUsed) ? `${fmt(pctUsed,0)} %` : "—"}</div>
          <div><strong>BED restante :</strong> {fmt(bedRemaining)} Gy</div>
          <div><strong>EQD2 restante :</strong> {fmt(eqd2Remaining)} Gy</div>
        </div>
      </section>

      {/* Étape 4 */}
      <section className="section">
        <h2 className="section-title">4) <strong>Dose maximale par fraction autorisée</strong></h2>

        <div className="field small">
          <label className="field-label">Nombre de fractions prévues (n)</label>
          <input
            value={newN}
            onChange={(e) => setNewN(e.target.value)}
            placeholder="ex : 5"
            inputMode="numeric"
          />
        </div>

        <div className="result">
          <div><strong>Dose max / fraction :</strong> {fmt(dMax)} Gy</div>
          <div><strong>Dose totale max possible :</strong> {fmt(totalMax)} Gy</div>
        </div>

        <div className="save-row">
          <div className="field">
            <label className="field-label">Nom de l’organe à sauvegarder</label>
            <input
              value={organName}
              onChange={(e) => setOrganName(e.target.value)}
              placeholder="ex : Chiasma, Tronc cérébral…"
            />
          </div>
          <button className="btn" onClick={saveCurrent}>💾 Sauvegarder</button>
        </div>
      </section>

      {/* Résultats enregistrés */}
      <section className="section">
        <h2 className="section-title">📘 <strong>Résultats enregistrés</strong></h2>
        {saved.length === 0 && <div className="muted">Aucun résultat pour l’instant.</div>}
        {saved.map((r, i) => (
          <div key={i} className="saved">
            <button className="kill" onClick={() => removeSaved(i)} title="Supprimer">❌</button>
            <div className="saved-title"><strong>{r.organ}</strong></div>
            <div>BED restante : {fmt(r.bedRemaining)} Gy</div>
            <div>EQD2 restante : {fmt(r.eqd2Remaining)} Gy</div>
            <div>Dose physique restante : {fmt(r.totalMax)} Gy</div>
            <div>Dose max / fraction : {fmt(r.dMax)} Gy</div>
            <div>Nombre de fractions : {r.newN ?? "—"}</div>
          </div>
        ))}
      </section>

      {/* Conversion Vx */}
      <section className="section">
        <h2 className="section-title">🔁 <strong>Conversion VxGy &lt; x% — équivalent</strong></h2>

        <div className="muted">α/β utilisé : {Number.isFinite(vx_ab) ? vx_ab : "—"} (repris de l’étape 1 si non précisé)</div>

        <div className="field">
          <label className="field-label">Dose seuil initiale (Gy)</label>
          <input
            value={vxInitialDose}
            onChange={(e) => setVxInitialDose(e.target.value)}
            placeholder="ex : 20"
            inputMode="decimal"
          />
        </div>

        <div className="field">
          <label className="field-label">Dose par fraction initiale (Gy)</label>
          <input
            value={vxInitialDpf}
            onChange={(e) => setVxInitialDpf(e.target.value)}
            placeholder="ex : 2"
            inputMode="decimal"
          />
        </div>

        <div className="field">
          <label className="field-label">Nouveau nombre de fractions</label>
          <input
            value={vxNewN}
            onChange={(e) => setVxNewN(e.target.value)}
            placeholder="ex : 8"
            inputMode="numeric"
          />
        </div>

        <div className="field">
          <label className="field-label">Nouvelle dose par fraction (Gy)</label>
          <input
            value={vxNewDpf}
            onChange={(e) => setVxNewDpf(e.target.value)}
            placeholder="ex : 7.5"
            inputMode="decimal"
          />
        </div>

        <div className="row-2">
          <div className="field">
            <label className="field-label">α/β (Gy) — optionnel</label>
            <input
              value={vxAb}
              onChange={(e) => setVxAb(e.target.value)}
              placeholder="(sinon reprend celui de l’étape 1)"
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label className="field-label">Pourcentage cible x (%)</label>
            <input
              value={vxPercent}
              onChange={(e) => setVxPercent(e.target.value)}
              placeholder="ex : 30"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="result blue">
          <div><strong>BED de référence :</strong> {fmt(vx_bedRef)} Gy</div>
          <div><strong>Équiv. totale :</strong> {fmt(vx_equivTotal)} Gy</div>
          <div><strong>Équiv. par fraction :</strong> {fmt(vx_equivPerFx)} Gy/fx</div>
          <div className="new-constraint">
            Nouvelle contrainte : <strong>V{fmt(vx_equivTotal)} Gy &lt; {Number.isFinite(vx_pct) ? vx_pct : "x"}%</strong> &nbsp;ou&nbsp;
            <strong> V{fmt(vx_equivPerFx)} Gy/fraction &lt; {Number.isFinite(vx_pct) ? vx_pct : "x"}%</strong>
          </div>
        </div>
      </section>

      <footer className="footer muted">
        <div>📌 Remarque : le verrou &lt;1.8 Gy s’applique aux étapes 1 & 2 uniquement (pas à la recherche de la dose max en étape 4).</div>
      </footer>
    </div>
  );
}
