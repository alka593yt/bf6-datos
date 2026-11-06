/**
 * Motor del constructor BF6 (envoltorio en español).
 *
 * Usa el motor de cálculo de BF6 Weapon Analyzer (https://github.com/raymdl/BF6-Weapon-Analyzer),
 * de Raymdl, con su permiso. Los archivos de ./sim son copias sin modificar; este archivo solo
 * traduce entre el formato de la página (ranuras en español) y el del analizador.
 *
 * Uso:
 *   const M = await import('https://cdn.jsdelivr.net/gh/alka593yt/bf6-datos@main/motor/bf6-motor.js');
 *   await M.cargar();
 *   const sel = M.seleccionPorDefecto('m433');
 *   M.ranuras('m433', sel);          // ranuras y opciones para las listas desplegables
 *   M.calcular('m433', { ...sel, boca: 'comp_brake' });   // estadísticas y daño
 */
import { setSimContext } from './sim/core.js';
import { setAttachmentContext, applyAttachments, floorStatDisplay } from './sim/applyAttachments.js';
import * as Loadout from './sim/loadout.js';
import { fireModeConfiguration, selectedFireMode } from './sim/fire-modes.js';
import { setDataErrorReporter } from './sim/required-data.js';
import { createWeaponAttributeModel } from './sim/weapon-attributes.js';

/* Ranuras de la página, en orden. "tipo" es la clave del analizador. */
export const RANURAS = [
  { id: 'mira', nombre: 'Mira', tipo: 'sight' },
  { id: 'accesorioOptico', nombre: 'Accesorio óptico', tipo: 'accessory' },
  { id: 'boca', nombre: 'Boca', tipo: 'muzzle' },
  { id: 'canon', nombre: 'Cañón', tipo: 'barrel' },
  { id: 'canonInferior', nombre: 'Cañón inferior', tipo: 'grip' },
  { id: 'laser', nombre: 'Láser', tipo: 'laser' },
  { id: 'luz', nombre: 'Luz', tipo: 'light' },
  { id: 'cargador', nombre: 'Cargador', tipo: 'mag' },
  { id: 'municion', nombre: 'Munición', tipo: 'ammo' },
  { id: 'ergonomia', nombre: 'Ergonomía', tipo: 'ergo' },
];
const POR_TIPO = Object.fromEntries(RANURAS.map(r => [r.tipo, r]));
const NOMBRE_TIPO = { grip: 'Cañón inferior', laser: 'Láser', light: 'Luz' };
export const MODOS = { auto: 'Automático', burst: 'Ráfaga', single: 'Semiautomático' };
/** Límite de puntos de un equipamiento en el juego. */
export const LIMITE_PUNTOS = 100;

let D = null;          // datos del juego
let DATA = null;       // catálogos en el formato del analizador
let W = {};            // armas por id
let calcAtributos = null;
const avisos = [];

/** Carga los datos del juego. `opciones.datos` permite pasarlos ya cargados (pruebas). */
export async function cargar(opciones = {}) {
  if (D) return info();
  D = opciones.datos || await (await fetch(new URL('./datos-juego.json', import.meta.url))).json();
  setDataErrorReporter(e => { avisos.push(e.message); });   // un dato faltante devuelve "sin dato" en vez de romper
  const { SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS, ACCESSORIES, WEAPON_ATTS, WEAPON_ERGO, WEAPON_ACCESSORY, WEAPON_MAG } = D.attachments;
  const { AMMO, WEAPON_AMMO } = D.ammo;
  DATA = { SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS, ACCESSORIES, WEAPON_ATTS, WEAPON_ERGO, WEAPON_ACCESSORY, WEAPON_MAG,
    AMMO, WEAPON_AMMO, ATTACHMENT_TOOLTIPS: D.tooltips, GAME_BUGS: D.attachments.GAME_BUGS || [] };
  const b = D.balance, rd = D.recoilDecay;
  setSimContext({ aimState: 'ads', stanceState: 'stand', RECOIL_DEC: rd.RECOIL_DEC, RECOIL_DEC_EXP: rd.RECOIL_DEC_EXP, RECOIL_DEC_TEXP: rd.RECOIL_DEC_TEXP,
    compensationFn: () => 0, platformRecoilMultFn: () => 1 });
  setAttachmentContext({ SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, LIGHTS, ERGOS, WEAPON_MAG, WEAPON_ERGO, AMMO, WEAPON_AMMO, WEAPON_ATTS,
    RECOIL_MULT: b.RECOIL_MULT, HIP_SPREAD_TABLE: b.HIP_SPREAD_TABLE, HIP_SPREAD_BASE_INDEX: b.HIP_SPREAD_BASE_INDEX,
    HIP_SPREAD_BASE_INDEX_OVERRIDES: b.HIP_SPREAD_BASE_INDEX_OVERRIDES, COLLATERAL_MULT_OVERRIDE: b.COLLATERAL_MULT_OVERRIDE,
    HIT_ZONES: D.hitZones, MOVING_ACC_TIERS: b.MOVING_ACC_TIERS, ADS_SPD_TIERS: b.ADS_SPD_TIERS, ADS_MOVE_TIERS: b.ADS_MOVE_TIERS,
    DRAW_TIME_TABLES: b.DRAW_TIME_TABLES, RELOAD_SPEED_MULTIPLIERS: b.RELOAD_SPEED_MULTIPLIERS,
    VELOCITY_LADDER: b.VELOCITY_LADDER, HEALTH_REGEN_DELAY_S: b.HEALTH_REGEN_DELAY_S });
  for (const w of D.weapons) {
    const disp = D.weaponAttributes.shotgunDispersion?.[w.id];
    if (disp != null) w.pelletDispersion = disp;
    W[w.id] = w;
  }
  calcAtributos = createWeaponAttributeModel({ balance: b, catalogs: DATA, attributes: D.weaponAttributes });
  return info();
}
function info() { return { versionJuego: D.origen?.versionJuego, commit: D.origen?.commit, armas: D.weapons.length }; }
function arma(id) { if (!D) throw new Error('Llama primero a cargar().'); const w = W[id]; if (!w) throw new Error(`El motor no tiene el arma "${id}".`); return w; }

export function armas() { return D.weapons.map(w => ({ id: w.id, nombre: w.name, clase: w.cls })); }
export function existe(id) { return !!(D && W[id]); }

/* ---------- Conversión entre la selección de la página y la del analizador ---------- */
const nombreAtt = (a, wid) => a?.weaponOverrides?.[wid]?.name ?? a?.name ?? '';
const ranuraRiel = wid => DATA.WEAPON_ATTS[wid]?.slots?.rail;

function aAtts(w, sel = {}) {
  const atts = Loadout.blankAtts(); Loadout.resetAttsForWeapon(atts, w, DATA);
  const set = (k, v) => { if (v !== undefined && v !== null && v !== '') atts[k] = v; };
  set('sight', sel.mira); set('accessory', sel.accesorioOptico); set('muzzle', sel.boca); set('barrel', sel.canon);
  set('mag', sel.cargador); set('ammo', sel.municion); set('ergo', sel.ergonomia);
  if (ranuraRiel(w.id)) {
    const [tipo, id] = String(sel.riel || 'none').split(':');
    atts.rail = id && id !== 'none' ? { type: tipo, id } : null;
    if (!ranuraRiel(w.id).accepts.includes('grip')) set('grip', sel.canonInferior);
  } else { set('grip', sel.canonInferior); set('laser', sel.laser); set('light', sel.luz); }
  if (sel.modo) atts.fireMode = sel.modo;
  return Loadout.normalizeAttachments(atts, w, DATA);
}
function deAtts(w, atts) {
  const s = { mira: atts.sight, accesorioOptico: atts.accessory, boca: atts.muzzle, canon: atts.barrel, cargador: atts.mag,
    municion: atts.ammo, ergonomia: atts.ergo };
  const riel = ranuraRiel(w.id);
  if (riel) { s.riel = atts.rail ? `${atts.rail.type}:${atts.rail.id}` : 'none'; if (!riel.accepts.includes('grip')) s.canonInferior = atts.grip ?? 'none'; }
  else { s.canonInferior = atts.grip ?? 'none'; s.laser = atts.laser ?? 'none'; s.luz = atts.light ?? 'none'; }
  s.modo = selectedFireMode(w, atts);
  for (const k of Object.keys(s)) if (s[k] == null) s[k] = 'none';
  return s;
}

/** La configuración de fábrica del arma, en el formato de la página. */
export function seleccionPorDefecto(id) { const w = arma(id); return deAtts(w, aAtts(w, {})); }

/** Modos de disparo disponibles (vacío si el arma tiene uno solo). */
export function modos(id, sel = {}) {
  const w = arma(id); const cfg = fireModeConfiguration(w, aAtts(w, sel));
  return cfg.modes.length > 1 ? cfg.modes.map(m => ({ valor: m, nombre: MODOS[m] || m })) : [];
}

function puntosDe(w, tipo, opcion) {
  if (tipo === 'sight') return DATA.WEAPON_ATTS[w.id]?.sightPoints?.[opcion.id] ?? Loadout.getAttPts(opcion, w);
  if (tipo === 'ammo') return DATA.WEAPON_AMMO[w.id]?.ammo?.[opcion.id] ?? 0;
  if (tipo === 'mag') return opcion.pts ?? 0;
  return Loadout.getAttPts(opcion, w);
}
const NOMBRE_RANURA = Object.fromEntries(RANURAS.map(r => [r.tipo, r.nombre]));
function nombreDe(w, tipo, id) {
  if (tipo === 'mag') return DATA.WEAPON_MAG[w.id]?.mags?.[id]?.name ?? id;
  if (tipo === 'ammo') return DATA.AMMO.find(a => a.id === id)?.name ?? id;
  const cat = { sight: 'SIGHTS', muzzle: 'MUZZLES', barrel: 'BARRELS', grip: 'GRIPS', laser: 'LASERS', light: 'LIGHTS', ergo: 'ERGOS', accessory: 'ACCESSORIES' }[tipo];
  return nombreAtt((DATA[cat] || []).find(a => a.id === id), w.id) || id;
}
/** Qué hace falta para poder elegir un accesorio bloqueado: { ranura, opciones: [nombres en inglés] }. */
function requisito(w, tipo, id) {
  const rule = (DATA.WEAPON_ATTS[w.id]?.dependencies || []).find(r => r.slot === tipo && r.attachment === id);
  if (!rule) return undefined;
  const porRanura = {};
  for (const x of rule.requiresAny) (porRanura[x.slot] ??= []).push(nombreDe(w, x.slot, x.attachment));
  const [slot, nombres] = Object.entries(porRanura)[0];
  return { ranura: NOMBRE_RANURA[slot] || slot, opciones: nombres };
}
function descripcion(wid, tipo, id) {
  const s = D.tooltips?.byWeapon?.[wid]?.[tipo]?.[id];
  return s ? D.tooltips.descriptions[s] : undefined;
}

/**
 * Las ranuras del arma con sus opciones, para armar las listas desplegables.
 * Cada opción: { valor, en (nombre en inglés), puntos, porDefecto, disponible, motivo, descripcion, tipo }
 */
export function ranuras(id, sel = {}) {
  const w = arma(id); const atts = aAtts(w, sel); const actual = deAtts(w, atts); const def = deAtts(w, aAtts(w, {}));
  const out = [];
  const riel = ranuraRiel(w.id);
  for (const r of RANURAS) {
    if (riel && riel.accepts.includes(r.tipo)) {
      if (r.tipo !== riel.accepts[0]) continue;     // la ranura compartida aparece una sola vez
      const ops = Loadout.availableAttachments(w, 'rail', DATA).filter(o => o.id !== 'none').map(o => {
        const disponible = Loadout.attachmentCompatible(w, o.type, o.id, atts, DATA);
        return { valor: `${o.type}:${o.id}`, en: nombreAtt(o, w.id), puntos: Loadout.getAttPts(o, w), tipo: NOMBRE_TIPO[o.type],
          disponible, requiere: disponible ? undefined : requisito(w, o.type, o.id), descripcion: descripcion(w.id, o.type, o.id) };
      });
      out.push({ id: 'riel', nombre: riel.accepts.map(t => NOMBRE_TIPO[t]).join(' / '), compartida: true, valor: actual.riel, porDefecto: 'none',
        opciones: [{ valor: 'none', en: 'None', puntos: 0, disponible: true }, ...ops] });
      continue;
    }
    if (r.tipo === 'grip' || r.tipo === 'laser' || r.tipo === 'light') {
      if (!DATA.WEAPON_ATTS[w.id]?.slots?.[r.tipo]) continue;
    }
    const lista = Loadout.availableAttachments(w, r.tipo, DATA).filter(o => !o.legacy);
    const ops = lista.filter(o => o.id !== 'none').map(o => {
      const disponible = Loadout.attachmentCompatible(w, r.tipo, o.id, atts, DATA);
      const req = disponible ? undefined : requisito(w, r.tipo, o.id);
      return { valor: o.id, en: r.tipo === 'mag' ? o.name : nombreAtt(o, w.id), puntos: puntosDe(w, r.tipo, o), porDefecto: def[r.id] === o.id,
        disponible, requiere: req, motivo: req ? `Requiere ${req.ranura.toLowerCase()}: ${req.opciones.slice(0, 3).join(', ')}${req.opciones.length > 3 ? '…' : ''}` : undefined,
        descripcion: descripcion(w.id, r.tipo, o.id) };
    });
    if (!ops.length) continue;
    const obligatoria = ['sight', 'barrel', 'mag', 'ammo'].includes(r.tipo);
    out.push({ id: r.id, nombre: r.nombre, valor: actual[r.id], porDefecto: def[r.id],
      opciones: obligatoria ? ops : [{ valor: 'none', en: 'None', puntos: 0, disponible: true }, ...ops] });
  }
  return out;
}

/* ---------- Daño ---------- */
// Misma regla que tu base de datos: el daño nuevo empieza en el metro del corte.
function danoEn(puntos, m) {
  let i = -1; for (let k = 0; k < puntos.length && puntos[k].r <= m; k++) i = k;
  if (i < 0) return puntos[0].d;
  const a = puntos[i], b = puntos[i + 1];
  return b && b.r > a.r ? a.d + (b.d - a.d) * (m - a.r) / (b.r - a.r) : a.d;
}
const r2 = v => v == null || !Number.isFinite(v) ? null : Math.round((v + 1e-9) * 100) / 100;
function curva(build) {
  const pel = build.pellets || 1;
  return Array.from({ length: 201 }, (_, m) => r2(danoEn(build.dmg, m) * pel));
}

/**
 * Calcula el arma con la selección dada.
 * Devuelve { seleccion, modo, puntos, stats, dano: {pecho, cabeza, estomago} (201 valores),
 *            multiplicadores: {cabeza, estomago}, cambiaCurva, factores: {cabeza, estomago}, avisos }
 *  - cambiaCurva: la selección usa otra bala (otro daño base), no solo otros multiplicadores.
 *  - factores: cuánto cambian los multiplicadores de cabeza y estómago respecto a fábrica.
 */
export function calcular(id, sel = {}) {
  const w = arma(id); avisos.length = 0;
  const atts = aAtts(w, sel);
  const b = applyAttachments(w, atts);
  const fab = applyAttachments(w, aAtts(w, {}));
  const a = calcAtributos(w, atts, b);
  const ent = v => Number.isFinite(v) ? Math.round(v) : null;
  const stats = {
    // Mismo redondeo que la pantalla del juego (719.999 -> 720, 163.636 -> 163).
    cadencia: Number.isFinite(b.rpm) ? floorStatDisplay(b.rpm) : null,
    velBala: Number.isFinite(b.bulletVel) ? floorStatDisplay(b.bulletVel) : null,
    velApuntar: ent(b._adsTimeMs),
    velRecarga: Number.isFinite(b.tacRld) ? Math.round(b.tacRld * 1000) : null,
    cadera: a.hipfire ?? null,
    precision: a.precision ?? null,
    control: a.control ?? null,
    movilidad: a.mobility ?? null,
    recoilVertical: Number.isFinite(b.recoilV) ? Math.round(b.recoilV * 100) / 100 : null,
    recoilHorizontal: Number.isFinite(b.recoilVar) ? Math.round(b.recoilVar * 10) / 10 : null,
    cargador: b.mag ?? null,
  };
  const pecho = curva(b);
  const hs = b._hsMult, limb = b._limbMult;
  const dano = { pecho, cabeza: pecho.map(v => r2(v * hs)), estomago: pecho.map(v => r2(v * limb)) };
  const cambiaCurva = JSON.stringify(b.dmg) !== JSON.stringify(fab.dmg) || (b.pellets || 1) !== (fab.pellets || 1);
  return {
    seleccion: deAtts(w, atts), modo: selectedFireMode(w, atts), puntos: Loadout.computeAttPts(atts, w, DATA),
    stats, dano, multiplicadores: { cabeza: hs, estomago: limb },
    factores: { cabeza: hs / fab._hsMult, estomago: limb / fab._limbMult }, cambiaCurva,
    avisos: [...new Set(avisos)],
  };
}
