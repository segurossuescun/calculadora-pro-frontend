// ============================
// Utils
// ============================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function parseNumSmart(v) {
  const s0 = String(v ?? "").trim();
  if (!s0) return null;

  const s = s0.replace(",", ".");

  if (/^-?\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(s)) {
    const [a, b] = s.split("/").map(x => Number(x.trim()));
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    return a / b;
  }

  if (!/^-?\d*\.?\d*$/.test(s)) return null;

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatNum(n, decimals = 4) {
  if (!Number.isFinite(n)) return "";
  const s = n.toFixed(decimals);
  return s.replace(/\.?0+$/, "");
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

// ============================
// Theme (dark/light)
// ============================
const btnTheme = $("#btnTheme");
const themeKey = "calcpro_theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (btnTheme) btnTheme.textContent = theme === "light" ? "🌙" : "☀️";
  localStorage.setItem(themeKey, theme);
}
applyTheme(localStorage.getItem(themeKey) || "dark");

btnTheme?.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
});

// ============================
// PRO/TRIAL access
// - 3 días gratis desde el primer uso
// ============================
const proKey = "calcpro_access_v1";
const proStateDot = $("#proStateDot");
const proStateText = $("#proStateText");

function getAccess() {
  const raw = localStorage.getItem(proKey);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  const start = Date.now();
  const end = start + (3 * 24 * 60 * 60 * 1000);
  const obj = { trialStart: start, trialEnd: end, isPro: false };
  localStorage.setItem(proKey, JSON.stringify(obj));
  return obj;
}

function setAccess(obj) {
  localStorage.setItem(proKey, JSON.stringify(obj));
  applyGating();
}

function isProPaid() {
  const a = getAccess();
  return !!a.isPro;
}

function isTrialActive() {
  const a = getAccess();
  return Date.now() <= a.trialEnd;
}

// ✅ Premium = trial activo o PRO pagado
function canUsePremium() {
  return isProPaid() || isTrialActive();
}

function accessLabel() {
  const a = getAccess();
  if (a.isPro) return { text: "PRO activo", dot: "pro" };

  const now = Date.now();
  if (now <= a.trialEnd) {
    const hrs = Math.max(0, Math.ceil((a.trialEnd - now) / (60 * 60 * 1000)));
    return { text: `Prueba activa • ${hrs}h`, dot: "trial" };
  }
  return { text: "Free (sin premium)", dot: "free" };
}

function applyGating() {
  const lab = accessLabel();

  if (proStateText) proStateText.textContent = lab.text;

  if (proStateDot) {
    proStateDot.style.background =
      lab.dot === "pro" ? "rgba(80,220,140,.9)" :
      lab.dot === "trial" ? "rgba(139,104,176,.9)" :
      "rgba(190,190,190,.9)";

    proStateDot.style.boxShadow =
      lab.dot === "pro" ? "0 0 0 4px rgba(80,220,140,.18)" :
      lab.dot === "trial" ? "0 0 0 4px rgba(139,104,176,.18)" :
      "0 0 0 4px rgba(255,255,255,.10)";
  }

  // 🔥 Importante: pantallas SIEMPRE visibles
  const lockConv = $("#lockConv");
  const convContent = $("#convContent");
  const lockIncome = $("#lockIncome");
  const incomeContent = $("#incomeContent");

  if (lockConv) lockConv.style.display = "none";
  if (convContent) convContent.style.display = "block";

  if (lockIncome) lockIncome.style.display = "none";
  if (incomeContent) incomeContent.style.display = "block";

  // 🎨 Reaplicar reglas de color (sin romper nada)
  if (typeof refreshAccentUI === "function") refreshAccentUI();
}

// ✅ correr gating al final del tick (más seguro)
setTimeout(applyGating, 0);

// Simulamos "desbloqueo" (modo demo)
function unlockProMock() {
  const a = getAccess();
  a.isPro = true;
  setAccess(a);
  alert("✅ PRO activado (modo demo) 💜\nLuego lo conectamos con Stripe + magic link 😄");
}

$("#btnUnlockFromConv")?.addEventListener("click", unlockProMock);
$("#btnUnlockFromIncome")?.addEventListener("click", unlockProMock);

// ============================
// Accent color (Premium: trial 3 días + PRO pagado)
// - Siempre visible (tentación 😈)
// - Si NO premium: se deshabilita y se resetea a default
// ============================
const accentKey = "calcpro_accent_v1";
const accentPicker = document.querySelector("#accentPicker");
const accentLock = document.querySelector("#accentLock");
const DEFAULT_ACCENT = "#8b68b0";

function hexToRgb(hex){
  const h = String(hex || "").replace("#","").trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  if (![r,g,b].every(Number.isFinite)) return null;
  return { r, g, b };
}

// oscurecer color para el "deep"
function shadeRgb({r,g,b}, factor){ // factor 0..1 (menor = más oscuro)
  const rr = Math.max(0, Math.min(255, Math.round(r * factor)));
  const gg = Math.max(0, Math.min(255, Math.round(g * factor)));
  const bb = Math.max(0, Math.min(255, Math.round(b * factor)));
  return { r: rr, g: gg, b: bb };
}

function rgbToCss({r,g,b}){ return `rgb(${r},${g},${b})`; }

function applyAccent(hex){
  const root = document.documentElement;
  const c = (hex || DEFAULT_ACCENT).toLowerCase();
  root.style.setProperty("--accent", c);

  const rgb = hexToRgb(c);
  if (!rgb) return;

  root.style.setProperty("--accent-r", rgb.r);
  root.style.setProperty("--accent-g", rgb.g);
  root.style.setProperty("--accent-b", rgb.b);

  const deep = shadeRgb(rgb, 0.62);
  root.style.setProperty("--accent-deep", `rgb(${deep.r},${deep.g},${deep.b})`);
  root.style.setProperty("--accent-deep-soft", `rgba(${deep.r},${deep.g},${deep.b},.55)`);

  // (opcionales) tint de panel/borde:
  root.style.setProperty("--panel-tint",   `rgba(${rgb.r},${rgb.g},${rgb.b},.10)`);
  root.style.setProperty("--panel-tint-2", `rgba(${rgb.r},${rgb.g},${rgb.b},.06)`);
  root.style.setProperty("--stroke-tint",  `rgba(${rgb.r},${rgb.g},${rgb.b},.24)`);
}

// ✅ Premium = trial activo o PRO pagado

function refreshAccentUI(){
  const premium = canUsePremium();
  const saved = localStorage.getItem(accentKey);

  // siempre visible (tentación 😈)
  if (accentPicker) accentPicker.style.display = "inline-block";

  // bloquear/desbloquear
  if (accentPicker){
    accentPicker.disabled = !premium;
    accentPicker.style.opacity = premium ? "1" : ".55";
    accentPicker.style.filter = premium ? "none" : "grayscale(1)";
    accentPicker.style.cursor = premium ? "pointer" : "not-allowed";
  }

  if (accentLock){
    accentLock.style.display = premium ? "none" : "inline";
  }

  // si NO premium => reset malvado 😈
  if (!premium){
    localStorage.removeItem(accentKey);
    applyAccent(DEFAULT_ACCENT);
    if (accentPicker) accentPicker.value = DEFAULT_ACCENT;
    return;
  }

  const start = saved || DEFAULT_ACCENT;
  applyAccent(start);
  if (accentPicker) accentPicker.value = start;
}

// Init
refreshAccentUI();
setTimeout(() => refreshAccentUI(), 0);

// Cambios en vivo (trial + pro guardan)
accentPicker?.addEventListener("input", ()=>{
  if (!canUsePremium()){
    alert("🔒 Colores es PRO 😄💜");
    accentPicker.value = DEFAULT_ACCENT;
    applyAccent(DEFAULT_ACCENT);
    return;
  }
  const hex = accentPicker.value || DEFAULT_ACCENT;
  applyAccent(hex);
  localStorage.setItem(accentKey, hex);
});

// ============================
// Premium actions (copiar / capturar)
// ============================
function requirePremium(actionText = "Esta función") {
  if (canUsePremium()) return true;
  alert(`🔒 ${actionText} es Premium (después de 3 días) 😈💜`);
  return false;
}

// ============================
// Chips navigation
// ============================
function showView(view) {
  $$(".chip").forEach(c => c.classList.toggle("active", c.dataset.view === view));
  $$(".view").forEach(v => v.classList.toggle("active", v.dataset.view === view));

  if (view === "conv") {
    ["panelLength", "panelWeight", "panelTemp", "panelVolume", "panelAge"].forEach(id => {
      const d = document.getElementById(id);
      if (d) d.open = false;
    });
  }
}

$$(".chip").forEach(chip => {
  chip.addEventListener("click", () => showView(chip.dataset.view));
});
showView("calc");

// ============================
// Calculator
// ============================
const calcExprEl = $("#calcExpr");
const calcValueEl = $("#calcValue");
const historyList = $("#historyList");
const btnCopyResult = $("#btnCopyResult");
const btnClearHistory = $("#btnClearHistory");

let expr = "";
let history = [];
let cursorPos = 0;

function renderCalc() {
  if (!calcExprEl) return;

  const p = Math.max(0, Math.min(cursorPos, expr.length));
  const before = expr.slice(0, p);
  const after  = expr.slice(p);

  // caret visible (sin meterlo en expr)
  calcExprEl.textContent = (before || "") + "│" + (after || "");

  // si no hay expr, igual mostramos el caret
  if (!expr) calcExprEl.textContent = "│";
}

function pushHistory(item) {
  history.unshift(item);
  history = history.slice(0, 20);
  renderHistory();
}

function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = "";
  for (const h of history) {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <div>
        <div style="font-size:12px;opacity:.85">${escapeHtml(h.expr)}</div>
        <div style="font-size:16px;font-weight:700;margin-top:2px">${escapeHtml(h.result)}</div>
      </div>
      <button type="button" data-paste="${escapeHtml(h.result)}">Usar</button>
    `;
    historyList.appendChild(li);
  }

  historyList.querySelectorAll("button[data-paste]").forEach(btn => {
    btn.addEventListener("click", () => {
      expr = btn.getAttribute("data-paste") || "";
      cursorPos = expr.length;
      if (calcValueEl) calcValueEl.textContent = expr || "0";
      renderCalc();
    });
  });
}

function sanitizeForEval(raw) {
  let s = raw.replaceAll("×", "*").replaceAll("÷", "/");
  s = s.replace(/(\d+(\.\d+)?)%/g, "($1/100)");
  s = s.replaceAll("√(", "Math.sqrt(");
  s = s.replace(/(\)|\d+(\.\d+)?)(\^2)/g, "Math.pow($1,2)");
  if (!/^[0-9+\-*/().\sMathsqrtpow,]*$/.test(s.replaceAll("Math.", "Math"))) {
    throw new Error("Expresión inválida");
  }
  return s;
}

function evalExpr(raw) {
  const s = sanitizeForEval(raw);
  // eslint-disable-next-line no-new-func
  const fn = Function(`"use strict"; return (${s});`);
  const out = fn();
  if (!Number.isFinite(out)) throw new Error("Resultado inválido");
  return out;
}

function setValueText(text) {
  if (calcValueEl) calcValueEl.textContent = text;
}

function insertAtCursor(text) {
  const p = Math.max(0, Math.min(cursorPos, expr.length));
  expr = expr.slice(0, p) + text + expr.slice(p);
  cursorPos = p + text.length;
  renderCalc();
}

function onKeyInput(val) {
  insertAtCursor(val);
}

function backspace() {
  const p = Math.max(0, Math.min(cursorPos, expr.length));
  if (p === 0) return;
  expr = expr.slice(0, p - 1) + expr.slice(p);
  cursorPos = p - 1;
  renderCalc();
}

function deleteAtCursor() {
  const p = Math.max(0, Math.min(cursorPos, expr.length));
  if (p >= expr.length) return;
  expr = expr.slice(0, p) + expr.slice(p + 1);
  renderCalc();
}

function clearAll() {
  expr = "";
  cursorPos = 0;
  setValueText("0");
  renderCalc();
}

function insertSqrt() {
  const p = Math.max(0, Math.min(cursorPos, expr.length));
  const prev = expr[p - 1] || "";
  if (expr && /[\d)]$/.test(prev)) insertAtCursor("*");
  insertAtCursor("√(");
}

function insertSquare() {
  const p = Math.max(0, Math.min(cursorPos, expr.length));
  const prev = expr[p - 1] || "";
  if (expr && /[\d)]$/.test(prev)) insertAtCursor("^2");
}

function equals() {
  if (!expr.trim()) return;

  try {
    // ✅ 1) Autocerrar paréntesis faltantes (ej: "√(125" -> "√(125)")
    const opens = (expr.match(/\(/g) || []).length;
    const closes = (expr.match(/\)/g) || []).length;
    if (opens > closes) expr += ")".repeat(opens - closes);

    // ✅ 2) Evaluar normal
    const result = evalExpr(expr);
    const pretty = formatNum(result, 10);

    pushHistory({ expr, result: pretty });
    setValueText(pretty);

    // ✅ dejar el resultado como nueva expresión
    expr = pretty;

    // ✅ cursor al final (si estás usando cursorPos)
    if (typeof cursorPos !== "undefined") cursorPos = expr.length;

    renderCalc();
  } catch {
    setValueText("Error 😅");
  }
}

$$(".keypad .key").forEach(btn => {
  const ins = btn.getAttribute("data-in");
  const act = btn.getAttribute("data-act");
  btn.addEventListener("click", () => {
    if (ins != null) onKeyInput(ins);
    if (act === "back") backspace();
    if (act === "clear") clearAll();
    if (act === "sqrt") insertSqrt();
    if (act === "square") insertSquare();
    if (act === "eq") equals();
  });
});

// Teclado físico
document.addEventListener("keydown", (e) => {
  const tag = (document.activeElement?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return;

  const k = e.key;

  if (/^\d$/.test(k)) { onKeyInput(k); e.preventDefault(); return; }
  if (k === "ArrowLeft")  { cursorPos = Math.max(0, cursorPos - 1); renderCalc(); e.preventDefault(); return; }
  if (k === "ArrowRight") { cursorPos = Math.min(expr.length, cursorPos + 1); renderCalc(); e.preventDefault(); return; }
  if (k === "Home")       { cursorPos = 0; renderCalc(); e.preventDefault(); return; }
  if (k === "End")        { cursorPos = expr.length; renderCalc(); e.preventDefault(); return; }
  if (k === "Delete")     { deleteAtCursor(); e.preventDefault(); return; }

  const ops = { "+": "+", "-": "-", "*": "×", "/": "÷", ".": ".", "(": "(", ")": ")" };
  if (ops[k]) { onKeyInput(ops[k]); e.preventDefault(); return; }

  if (k === "Enter") { equals(); e.preventDefault(); return; }
  if (k === "Backspace") { backspace(); e.preventDefault(); return; }
  if (k === "Escape") { clearAll(); e.preventDefault(); return; }

  if (k === "x" || k === "X") { onKeyInput("×"); e.preventDefault(); }
});

btnCopyResult?.addEventListener("click", async () => {
  if (!requirePremium("Copiar")) return;

  const text = calcValueEl?.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    btnCopyResult.textContent = "✅ Copiado";
    setTimeout(() => btnCopyResult.textContent = "Copiar", 900);
  } catch {
    alert("No pude copiar 😅");
  }
});

btnClearHistory?.addEventListener("click", () => {
  history = [];
  renderHistory();
});

renderCalc();
renderHistory();

// ============================
// Conversiones (LIVE)
// ============================
const lengthInputs = { m: $("#lenM"), cm: $("#lenCM"), ft: $("#lenFT"), inch: $("#lenIN") };
const weightInputs = { kg: $("#kg"), g: $("#g"), lb: $("#lb"), oz: $("#oz") };
const tempInputs   = { c: $("#tempC"), f: $("#tempF"), k: $("#tempK") };
const volumeInputs = { l: $("#volL"), ml: $("#volML"), oz: $("#volOZ"), cup: $("#volCUP"), gal: $("#volGAL") };

let lockLength = false, lockWeight = false, lockTemp = false, lockVolume = false;

function clearLength(){ lockLength = true; Object.values(lengthInputs).forEach(el => el && (el.value="")); lockLength = false; }
function clearWeight(){ lockWeight = true; Object.values(weightInputs).forEach(el => el && (el.value="")); lockWeight = false; }
function clearTemp(){ lockTemp = true; Object.values(tempInputs).forEach(el => el && (el.value="")); lockTemp = false; }
function clearVolume(){ lockVolume = true; Object.values(volumeInputs).forEach(el => el && (el.value="")); lockVolume = false; }

// Length
function updateFromMeters(m){
  lengthInputs.cm.value = formatNum(m * 100);
  lengthInputs.ft.value = formatNum(m * 3.280839895);
  lengthInputs.inch.value = formatNum(m * 39.37007874);
}
function updateFromFeet(ft){
  const inch = ft * 12;
  const m = ft * 0.3048;
  lengthInputs.m.value = formatNum(m);
  lengthInputs.cm.value = formatNum(m * 100);
  lengthInputs.inch.value = formatNum(inch);
}
function updateFromInches(inch){
  const ft = inch / 12;
  const m = inch * 0.0254;
  lengthInputs.m.value = formatNum(m);
  lengthInputs.cm.value = formatNum(m * 100);
  lengthInputs.ft.value = formatNum(ft);
}
function updateFromCM(cm){
  const m = cm / 100;
  lengthInputs.m.value = formatNum(m);
  lengthInputs.ft.value = formatNum(m * 3.280839895);
  lengthInputs.inch.value = formatNum(m * 39.37007874);
}

function onLengthInput(sourceKey){
  if (lockLength) return;
  lockLength = true;

  const val = parseNumSmart(lengthInputs[sourceKey]?.value);
  if (val == null){ lockLength = false; return; }

  if (sourceKey === "m") updateFromMeters(val);
  if (sourceKey === "cm") updateFromCM(val);
  if (sourceKey === "ft") updateFromFeet(val);
  if (sourceKey === "inch") updateFromInches(val);

  lockLength = false;
}

// Weight
function updateFromKg(kg){
  weightInputs.g.value  = formatNum(kg * 1000);
  weightInputs.lb.value = formatNum(kg * 2.20462262185);
  weightInputs.oz.value = formatNum(kg * 35.27396195);
}
function updateFromGrams(g){
  weightInputs.kg.value = formatNum(g / 1000);
  weightInputs.lb.value = formatNum(g * 0.00220462262185);
  weightInputs.oz.value = formatNum(g * 0.03527396195);
}
function updateFromLb(lb){
  const g = lb * 453.59237;
  weightInputs.kg.value = formatNum(g / 1000);
  weightInputs.g.value  = formatNum(g);
  weightInputs.oz.value = formatNum(lb * 16);
}
function updateFromOz(oz){
  const lb = oz / 16;
  const g = oz * 28.349523125;
  weightInputs.kg.value = formatNum(g / 1000);
  weightInputs.g.value  = formatNum(g);
  weightInputs.lb.value = formatNum(lb);
}

function onWeightInput(sourceKey){
  if (lockWeight) return;
  lockWeight = true;

  const val = parseNumSmart(weightInputs[sourceKey]?.value);
  if (val == null){ lockWeight = false; return; }

  if (sourceKey === "kg") updateFromKg(val);
  if (sourceKey === "g") updateFromGrams(val);
  if (sourceKey === "lb") updateFromLb(val);
  if (sourceKey === "oz") updateFromOz(val);

  lockWeight = false;
}

// Temp
function updateFromC(c){
  tempInputs.f.value = formatNum((c * 9/5) + 32);
  tempInputs.k.value = formatNum(c + 273.15);
}
function updateFromF(f){
  const c = (f - 32) * 5/9;
  tempInputs.c.value = formatNum(c);
  tempInputs.k.value = formatNum(c + 273.15);
}
function updateFromK(k){
  const c = k - 273.15;
  tempInputs.c.value = formatNum(c);
  tempInputs.f.value = formatNum((c * 9/5) + 32);
}
function onTempInput(sourceKey){
  if (lockTemp) return;
  lockTemp = true;

  const val = parseNumSmart(tempInputs[sourceKey]?.value);
  if (val == null){ lockTemp = false; return; }

  if (sourceKey === "c") updateFromC(val);
  if (sourceKey === "f") updateFromF(val);
  if (sourceKey === "k") updateFromK(val);

  lockTemp = false;
}

// Volume (base mL)
function setVolumeOthers(skipKey, ml){
  if (skipKey !== "ml"  && volumeInputs.ml)  volumeInputs.ml.value  = formatNum(ml);
  if (skipKey !== "l"   && volumeInputs.l)   volumeInputs.l.value   = formatNum(ml / 1000);
  if (skipKey !== "oz"  && volumeInputs.oz)  volumeInputs.oz.value  = formatNum(ml / 29.5735295625);
  if (skipKey !== "cup" && volumeInputs.cup) volumeInputs.cup.value = formatNum(ml / 236.5882365);
  if (skipKey !== "gal" && volumeInputs.gal) volumeInputs.gal.value = formatNum(ml / 3785.411784);
}
function onVolumeInput(sourceKey){
  if (lockVolume) return;
  lockVolume = true;

  const val = parseNumSmart(volumeInputs[sourceKey]?.value ?? "");
  if (val == null){ lockVolume = false; return; }

  let ml = null;
  if (sourceKey === "ml") ml = val;
  if (sourceKey === "l")  ml = val * 1000;
  if (sourceKey === "oz") ml = val * 29.5735295625;
  if (sourceKey === "cup")ml = val * 236.5882365;
  if (sourceKey === "gal")ml = val * 3785.411784;

  if (ml != null) setVolumeOthers(sourceKey, ml);
  lockVolume = false;
}

// listeners
Object.entries(lengthInputs).forEach(([k, el]) => el?.addEventListener("input", () => onLengthInput(k)));
Object.entries(weightInputs).forEach(([k, el]) => el?.addEventListener("input", () => onWeightInput(k)));
Object.entries(tempInputs).forEach(([k, el]) => el?.addEventListener("input", () => onTempInput(k)));
Object.entries(volumeInputs).forEach(([k, el]) => el?.addEventListener("input", () => onVolumeInput(k)));

$$("[data-clear]").forEach(btn => {
  btn.addEventListener("click", () => {
    const t = btn.getAttribute("data-clear");
    if (t === "length") clearLength();
    if (t === "weight") clearWeight();
    if (t === "temp") clearTemp();
    if (t === "volume") clearVolume();
  });
});

$("#btnConvCollapseAll")?.addEventListener("click", () => {
  ["panelLength","panelWeight","panelTemp","panelVolume","panelAge"].forEach(id => {
    const d = document.getElementById(id);
    if (d) d.open = false;
  });
});

// ============================
// Edad (A y B)
// ============================
const dob = $("#dob");
const asOf = $("#asOf");
const ageResultA = $("#ageResultA");
const btnAgeToday = $("#btnAgeToday");

const ageYears = $("#ageYears");
const birthMonth = $("#birthMonth");
const btnBdayYes = $("#btnBdayYes");
const btnBdayNo = $("#btnBdayNo");
const ageResultB = $("#ageResultB");
const btnAgeClearB = $("#btnAgeClearB");

let bdayThisYear = null;

function setAsOfToday(){
  if (asOf) asOf.value = todayISO();
}

function calcAgeExact(dobDate, asOfDate){
  if (!(dobDate instanceof Date) || isNaN(dobDate)) return null;
  if (!(asOfDate instanceof Date) || isNaN(asOfDate)) return null;
  if (asOfDate < dobDate) return null;

  let years = asOfDate.getFullYear() - dobDate.getFullYear();
  let months = asOfDate.getMonth() - dobDate.getMonth();
  let days = asOfDate.getDate() - dobDate.getDate();

  if (days < 0){
    const prevMonth = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }
  if (months < 0){
    months += 12;
    years -= 1;
  }
  return { years, months, days };
}

function updateAgeA(){
  if (!ageResultA) return;
  const dobVal = dob?.value;
  const asOfVal = asOf?.value;

  if (!dobVal || !asOfVal){ ageResultA.textContent = "—"; return; }

  const out = calcAgeExact(new Date(dobVal + "T00:00:00"), new Date(asOfVal + "T00:00:00"));
  if (!out){ ageResultA.textContent = "Revisa las fechas 😅"; return; }

  ageResultA.textContent = `${out.years} años • ${out.months} meses • ${out.days} días`;
}

btnAgeToday?.addEventListener("click", ()=>{ setAsOfToday(); updateAgeA(); });
dob?.addEventListener("input", updateAgeA);
asOf?.addEventListener("input", updateAgeA);

setAsOfToday();
updateAgeA();

// 🔹 Limpiar Edad A
const btnAgeClearA = $("#btnAgeClearA");

btnAgeClearA?.addEventListener("click", ()=>{
  if (dob) dob.value = "";
  if (asOf) asOf.value = todayISO(); // mantiene hoy (UX bonito 💜)
  if (ageResultA) ageResultA.textContent = "—";
});

function setYesNo(active){
  bdayThisYear = active;
  btnBdayYes?.classList.toggle("active-yn", active === true);
  btnBdayNo?.classList.toggle("active-yn", active === false);
  updateAgeB();
}
btnBdayYes?.addEventListener("click", ()=> setYesNo(true));
btnBdayNo?.addEventListener("click", ()=> setYesNo(false));

function updateAgeB(){
  if (!ageResultB) return;

  const yrs = parseNumSmart(ageYears?.value);
  const m = parseNumSmart(birthMonth?.value);

  if (yrs == null || yrs < 0 || !m){ ageResultB.textContent = "—"; return; }
  if (bdayThisYear === null){ ageResultB.textContent = "Elige: ¿Ya cumplió este año? ✅/❌"; return; }

  const currentYear = new Date().getFullYear();
  const birthYear = bdayThisYear ? (currentYear - yrs) : (currentYear - yrs - 1);
  ageResultB.textContent = `Nació en ${birthYear}`;
}

ageYears?.addEventListener("input", updateAgeB);
birthMonth?.addEventListener("change", updateAgeB);

btnAgeClearB?.addEventListener("click", ()=>{
  if (ageYears) ageYears.value = "";
  if (birthMonth) birthMonth.value = "";
  bdayThisYear = null;
  btnBdayYes?.classList.remove("active-yn");
  btnBdayNo?.classList.remove("active-yn");
  if (ageResultB) ageResultB.textContent = "—";
});

// estilo activo yes/no
const styleTag = document.createElement("style");
styleTag.textContent = `
  .active-yn{
    box-shadow: 0 0 0 4px var(--ring) !important;
    border-color: var(--accent-border) !important;
    background: var(--accent-soft) !important;
  }
`;
document.head.appendChild(styleTag);

// ============================
// Capturas (canvas) — Premium
// ============================
async function captureCard(title, lines){
  if (!requirePremium("Capturar/Compartir")) return;

  const canvas = document.createElement("canvas");
  const w = 1080, h = 720;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");

  // 🎨 toma color actual
  const cs = getComputedStyle(document.documentElement);
  const soft   = cs.getPropertyValue("--accent-soft").trim()   || "rgba(139,104,176,0.18)";
  const border = cs.getPropertyValue("--accent-border").trim() || "rgba(139,104,176,0.45)";
  const tint   = cs.getPropertyValue("--bg-tint").trim()       || "rgba(139,104,176,0.08)";

  // Fondo más “notable”
  ctx.fillStyle = "#0f0b14";
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle = tint;
  ctx.fillRect(0,0,w,h);

  // Panel
  ctx.fillStyle = soft;
  roundRect(ctx, 70, 90, w-140, h-180, 40);
  ctx.fill();

  // Borde
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  roundRect(ctx, 70, 90, w-140, h-180, 40);
  ctx.stroke();

  // Títulos
  ctx.fillStyle = "#f4eefb";
  ctx.font = "700 54px system-ui, Segoe UI, Arial";
  ctx.fillText("Calculadora Pro", 120, 170);

  ctx.fillStyle = "rgba(244,238,251,0.90)";
  ctx.font = "600 46px system-ui, Segoe UI, Arial";
  ctx.fillText(title, 120, 245);

 // Líneas (auto-ajuste por cantidad)
ctx.fillStyle = "rgba(244,238,251,0.92)";
const baseSize = 40;
const size = lines.length > 4 ? 34 : baseSize;
const lineH = lines.length > 4 ? 56 : 66;
ctx.font = `500 ${size}px system-ui, Segoe UI, Arial`;

let y = 330;
for (const ln of lines){
  ctx.fillText(String(ln), 120, y);
  y += lineH;
}
  // Footer
  ctx.fillStyle = "rgba(244,238,251,0.65)";
  ctx.font = "500 30px system-ui, Segoe UI, Arial";
  ctx.fillText("Captura generada • Para compartir", 120, 560);

  const blob = await new Promise(res => canvas.toBlob(res, "image/png", 1.0));
  if (!blob) return;

  const file = new File([blob], "calculadora-pro.png", { type:"image/png" });

  try{
    if (navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title:"Calculadora Pro", text:"Mira esto 📸💜" });
      return;
    }
  } catch {}

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calculadora-pro-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

$$("[data-capture]").forEach(btn=>{
  btn.addEventListener("click", async ()=>{
    const kind = btn.getAttribute("data-capture");

    if (kind === "length"){
      await captureCard("📏 Longitud", [
        `Metros (m): ${lengthInputs.m.value || "—"}`,
        `Centímetros (cm): ${lengthInputs.cm.value || "—"}`,
        `Pies (ft): ${lengthInputs.ft.value || "—"}`,
        `Pulgadas (in): ${lengthInputs.inch.value || "—"}`
      ]);
    }

    if (kind === "weight"){
      await captureCard("⚖️ Masa", [
        `Kilogramos (kg): ${weightInputs.kg.value || "—"}`,
        `Gramos (g): ${weightInputs.g.value || "—"}`,
        `Libras (lb): ${weightInputs.lb.value || "—"}`,
        `Onzas (oz): ${weightInputs.oz.value || "—"}`
      ]);
    }

    if (kind === "temp"){
      await captureCard("🌡️ Temperatura", [
        `Celsius (°C): ${tempInputs.c.value || "—"}`,
        `Fahrenheit (°F): ${tempInputs.f.value || "—"}`,
        `Kelvin (K): ${tempInputs.k.value || "—"}`,
        `Fiebre: ≥ 38 °C / 100.4 °F 🔥`
      ]);
    }

    if (kind === "volume"){
      await captureCard("🧃 Volumen", [
        `Litros (L): ${volumeInputs.l.value || "—"}`,
        `Mililitros (mL): ${volumeInputs.ml.value || "—"}`,
        `Onzas (oz): ${volumeInputs.oz.value || "—"}`,
        `Tazas (cup): ${volumeInputs.cup.value || "—"}`,
        `Galones (US): ${volumeInputs.gal.value || "—"}`
      ]);
    }
  });
});

$("#btnAgeCaptureA")?.addEventListener("click", async ()=>{
  await captureCard("🎂 Edad exacta", [
    `Nacimiento: ${dob?.value || "—"}`,
    `Calcular al: ${asOf?.value || "—"}`,
    `Edad: ${ageResultA?.textContent || "—"}`
  ]);
});

$("#btnAgeCaptureB")?.addEventListener("click", async ()=>{
  await captureCard("🎂 Año de nacimiento", [
    `Edad: ${ageYears?.value || "—"} años`,
    `Mes: ${birthMonth?.value || "—"}`,
    `Resultado: ${ageResultB?.textContent || "—"}`
  ]);
});

// ============================
// Ingresos (FREE, pero Captura Premium)
// ============================
const rateHour = $("#rateHour");
const rateWeek = $("#rateWeek");
const rateMonth = $("#rateMonth");
const rateYear = $("#rateYear");
const btnIncomeClear = $("#btnIncomeClear");
const btnIncomeCapture = $("#btnIncomeCapture");

const hrsWeekInput = $("#hrsWeek");
const weeksYearInput = $("#weeksYear");
const baseHrsText = $("#baseHrs");
const baseWeeksText = $("#baseWeeks");

function getHrsWeek(){ return parseNumSmart(hrsWeekInput?.value) || 40; }
function getWeeksYear(){ return parseNumSmart(weeksYearInput?.value) || 52; }

function updateBaseText(){
  if (baseHrsText) baseHrsText.textContent = getHrsWeek();
  if (baseWeeksText) baseWeeksText.textContent = getWeeksYear();
}

let lockIncomeCalc = false;

function setVal(el, v){ if (el) el.value = v; }

function clearIncomeCalc(){
  lockIncomeCalc = true;

  setVal(rateHour, "");
  setVal(rateWeek, "");
  setVal(rateMonth, "");
  setVal(rateYear, "");

  if (hrsWeekInput) hrsWeekInput.value = 40;
  if (weeksYearInput) weeksYearInput.value = 52;

  updateBaseText();
  lockIncomeCalc = false;
}

function fromHour(h){
  const H = getHrsWeek(), W = getWeeksYear();
  const week = h * H;
  const year = week * W;
  const month = year / 12;
  setVal(rateWeek, formatNum(week, 2));
  setVal(rateYear, formatNum(year, 2));
  setVal(rateMonth, formatNum(month, 2));
}
function fromWeek(w){
  const H = getHrsWeek(), W = getWeeksYear();
  const hour = w / H;
  const year = w * W;
  const month = year / 12;
  setVal(rateHour, formatNum(hour, 4));
  setVal(rateYear, formatNum(year, 2));
  setVal(rateMonth, formatNum(month, 2));
}
function fromMonth(m){
  const H = getHrsWeek(), W = getWeeksYear();
  const year = m * 12;
  const week = year / W;
  const hour = week / H;
  setVal(rateYear, formatNum(year, 2));
  setVal(rateWeek, formatNum(week, 2));
  setVal(rateHour, formatNum(hour, 4));
}
function fromYear(y){
  const H = getHrsWeek(), W = getWeeksYear();
  const month = y / 12;
  const week = y / W;
  const hour = week / H;
  setVal(rateMonth, formatNum(month, 2));
  setVal(rateWeek, formatNum(week, 2));
  setVal(rateHour, formatNum(hour, 4));
}

function onIncomeCalcInput(source){
  if (lockIncomeCalc) return;
  lockIncomeCalc = true;

  const map = { hour: rateHour, week: rateWeek, month: rateMonth, year: rateYear };
  const val = parseNumSmart(map[source]?.value);

  if (val == null){ lockIncomeCalc = false; return; }

  if (source === "hour") fromHour(val);
  if (source === "week") fromWeek(val);
  if (source === "month") fromMonth(val);
  if (source === "year") fromYear(val);

  lockIncomeCalc = false;
}

rateHour?.addEventListener("input", ()=> onIncomeCalcInput("hour"));
rateWeek?.addEventListener("input", ()=> onIncomeCalcInput("week"));
rateMonth?.addEventListener("input", ()=> onIncomeCalcInput("month"));
rateYear?.addEventListener("input", ()=> onIncomeCalcInput("year"));

btnIncomeClear?.addEventListener("click", clearIncomeCalc);

function recalcWithCurrentValue(){
  if (rateHour?.value) onIncomeCalcInput("hour");
  else if (rateWeek?.value) onIncomeCalcInput("week");
  else if (rateMonth?.value) onIncomeCalcInput("month");
  else if (rateYear?.value) onIncomeCalcInput("year");
}

hrsWeekInput?.addEventListener("input", ()=>{ updateBaseText(); recalcWithCurrentValue(); });
weeksYearInput?.addEventListener("input", ()=>{ updateBaseText(); recalcWithCurrentValue(); });

updateBaseText();

btnIncomeCapture?.addEventListener("click", async ()=>{
  await captureCard("💰 Ingresos (salario)", [
    `$ por hora: ${rateHour?.value || "—"}`,
    `$ por semana: ${rateWeek?.value || "—"}`,
    `$ por mes: ${rateMonth?.value || "—"}`,
    `$ por año: ${rateYear?.value || "—"}`,
    `Base: ${getHrsWeek()}h/sem • ${getWeeksYear()} sem/año`
  ]);
});
