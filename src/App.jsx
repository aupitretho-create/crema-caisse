import React, { useState, useEffect, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import {
  IceCream, GlassWater, Cookie, Coffee, Star, Trash2, ArrowLeft, Delete, Plus, Minus, Settings,
  CreditCard, Banknote, Wallet, Check, RotateCcw, BarChart3, Store, ChevronLeft, ChevronRight,
  Undo2, UserRound, LogOut, Receipt, Target, Cloud, Camera, Pencil, X, Package, AlertTriangle,
  Tag, TrendingUp, ClipboardList, Copy, Heart, Search, Phone, Gift, Stamp
} from "lucide-react";

/* ---- Stockage navigateur (localStorage) : utilisé quand Supabase n'est pas configuré ---- */
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (k) => { const v = localStorage.getItem(k); return v == null ? null : { key: k, value: v }; },
    set: async (k, v) => { localStorage.setItem(k, v); return { key: k, value: v }; },
    delete: async (k) => { localStorage.removeItem(k); return { key: k, deleted: true }; },
    list: async (p = "") => ({ keys: Object.keys(localStorage).filter((x) => x.startsWith(p)) }),
  };
}


/* ============================================================
   CONFIG CLOUD (Supabase) — à remplir après création du projet.
   Tant que c'est vide, l'app marche en LOCAL (ce téléphone).
   Une fois rempli + lib chargée, tout passe en CLOUD (partagé).
   ============================================================ */
const SUPABASE_URL = "";   // ex: https://xxxx.supabase.co
const SUPABASE_KEY = "";   // clé "anon public"

/* ===== Brand ===== */
const C = {
  rose: "#F05C8A", roseL: "#FFB6C9", jaune: "#FFD93D", creme: "#FFF4D8",
  brun: "#B7773C", vert: "#7FA66A", noir: "#181818", ink: "#3a3030", soft: "#9a8d84", line: "#ece1cc", rouge: "#E0524B",
};
const eur = (n) => (Number(n) || 0).toFixed(2).replace(".", ",") + " €";
const SALES_KEY = "crema:sales:v3";
const CONF_KEY = "crema:config:v4";
const STOCK_KEY = "crema:stock:v1";
const FID_KEY = "crema:fid:v1";
const PALETTE = ["#EBCB6B", "#F05C8A", "#7FA66A", "#5a3a24", "#B7773C", "#D6A86A", "#d63a63", "#f6a93b", "#E9C93B", "#7a5b9a", "#BFC7B8", "#c98a4a", "#6b4a2f", "#E0AE1E", "#f3c9cf", "#CFC2A6"];
const pad = (n) => String(n).padStart(2, "0");
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const cleanTel = (t) => (t || "").replace(/[^0-9+]/g, "");
const BOULES_PAR_BAC = 110;
const TAMPONS_RECOMPENSE = 10;
const DEF_SELLERS = [
  { id: "tho", name: "Tho", color: C.rose, photo: null }, { id: "pere", name: "Papa", color: C.vert, photo: null }, { id: "soeur", name: "Sœur", color: C.brun, photo: null },
];
const DEF_COSTS = { boule: 0.48, cornet: 0.15, pot: 0.20, gobelet: 0.15, cuillere: 0.02, serviette: 0.01, paille: 0.02, coquedubai: 1.20, dubaiBase: 1.5, drinkBase: 0.8, gaufreBase: 0.6 };

/* ============================================================
   DB : couche de stockage. Local par défaut, Cloud si Supabase配置.
   - Ventes / config / stock : clé-valeur (local, ou table kv cloud).
   - Clients fidélité : table 'clients' cloud, ou liste locale.
   ============================================================ */
const CLOUD_ON = !!(SUPABASE_URL && SUPABASE_KEY && typeof window !== "undefined" && window.supabase);
let sb = null;
if (CLOUD_ON) { try { sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) { sb = null; } }

const DB = {
  cloud: !!sb,
  async load(key) {
    if (sb) { try { const { data } = await sb.from("kv").select("value").eq("key", key).maybeSingle(); return data ? data.value : null; } catch (e) {} }
    try { if (typeof window !== "undefined" && window.storage) { const r = await window.storage.get(key); return r && r.value ? JSON.parse(r.value) : null; } } catch (e) {}
    return null;
  },
  async save(key, val) {
    if (sb) { try { await sb.from("kv").upsert({ key, value: val }); return true; } catch (e) {} }
    try { if (typeof window !== "undefined" && window.storage) await window.storage.set(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  },
  // ---- clients fidélité ----
  async clientsAll() {
    if (sb) { try { const { data } = await sb.from("clients").select("*").order("updated", { ascending: false }); return data || []; } catch (e) {} }
    return (await this.load(FID_KEY)) || [];
  },
  async clientSave(client) {
    if (sb) { try { const { data } = await sb.from("clients").upsert(client).select().maybeSingle(); return data || client; } catch (e) {} }
    const list = (await this.load(FID_KEY)) || [];
    const i = list.findIndex((c) => c.id === client.id);
    if (i >= 0) list[i] = client; else list.unshift(client);
    await this.save(FID_KEY, list);
    return client;
  },
};

/* ===== Defaults menu/parfums (identiques) ===== */
const DEF_PARFUMS = [
  { n: "Vanille", c: "#EBCB6B" }, { n: "Chocolat", c: "#5a3a24" }, { n: "Stracciatella", c: "#CFC2A6" },
  { n: "Pistache", c: "#7FA66A" }, { n: "Noisette", c: "#B7773C" }, { n: "Caramel B.S.", c: "#D6A86A" },
  { n: "Café", c: "#6f4a2f" }, { n: "Kinder", c: "#C99A6A" }, { n: "Rocher", c: "#6b4a2f" },
  { n: "Spéculoos", c: "#c98a4a" }, { n: "Nougat", c: "#E7D69B" }, { n: "Coco", c: "#BFC7B8" },
  { n: "Fraise", c: "#F05C8A", s: 1 }, { n: "Framboise", c: "#d63a63", s: 1 }, { n: "Mangue", c: "#f6a93b", s: 1 },
  { n: "Passion", c: "#E0AE1E", s: 1 }, { n: "Citron", c: "#E9C93B", s: 1 }, { n: "Cassis", c: "#7a5b9a", s: 1 },
  { n: "Abricot", c: "#f0a85a", s: 1 }, { n: "Litchi", c: "#f3c9cf", s: 1 },
];
const ITAL_FLAVORS = [{ n: "Vanille", c: "#EBCB6B" }, { n: "Chocolat", c: "#5a3a24" }, { n: "Panaché", c: "#B7773C" }];
const NAPPAGES = [
  { name: "Sans", price: 0 }, { name: "Chocolat maison", price: 0 }, { name: "Caramel B.S.", price: 0 },
  { name: "Nutella", price: 0 }, { name: "Crème de marrons", price: 0 }, { name: "Fruits rouges", price: 0 },
];
const DEF_TOPPINGS = [
  { name: "Sans", price: 0 }, { name: "Chantilly", price: 0 }, { name: "Amandes", price: 0.5 },
  { name: "Spéculoos", price: 0.5 }, { name: "Cookies", price: 0.5 }, { name: "Brownie", price: 0.5 },
  { name: "M&M's", price: 0.5 }, { name: "Perles dorées", price: 0.5 }, { name: "Éclats pistache", price: 0.5 }, { name: "Kataifi", price: 1 },
];
const DEF_MENU = {
  SIGNATURES: { name: "Signatures", short: "Sign.", icon: Star, color: C.rose, type: "compose", steps: ["contenant", "nappage", "topping"], items: [{ label: "Le Crémà", base: 5.5, scoops: 2, fixed: ["Pistache", "Framboise"] }, { label: "Soleïa", base: 5.5, scoops: 2, fixed: ["Mangue", "Passion"] }, { label: "Violette d'Oc", base: 5.5, scoops: 2, fixed: ["Vanille", "Vanille"] }, { label: "Coupe gourmande", base: 6.5, scoops: 2, fixed: ["Chocolat", "Noisette"] }] },
  GLACES: { name: "Glaces", short: "Glaces", icon: IceCream, color: C.brun, type: "compose", steps: ["flavors", "contenant", "nappage", "topping"], flavorSet: "parfums", items: [{ label: "1 boule", base: 3.0, scoops: 1 }, { label: "2 boules", base: 5.0, scoops: 2 }, { label: "3 boules", base: 6.5, scoops: 3 }, { label: "4 boules", base: 8.0, scoops: 4 }, { label: "Café glacé", base: 3.0, simple: true, drink: true }, { label: "Café gourmand", base: 4.5, simple: true, drink: true }] },
  ITALIENNE: { name: "Italienne", short: "Ital.", icon: IceCream, color: C.vert, type: "compose", steps: ["flavors", "contenant", "topping"], flavorSet: "ital", items: [{ label: "Cornet", base: 3.0, scoops: 1 }, { label: "Maxi cornet", base: 4.0, scoops: 1 }, { label: "Pot", base: 3.5, scoops: 1 }] },
  GAUFRES: { name: "Crêpes & Gaufres", short: "Gauf.", icon: Cookie, color: C.brun, type: "simple", items: [{ label: "Gaufre sucre", base: 3.0 }, { label: "Gaufre Nutella", base: 4.5 }, { label: "Gaufre caramel", base: 4.5 }, { label: "Crêpe sucre", base: 3.0 }, { label: "Crêpe Nutella", base: 4.5 }, { label: "Crêpe confiture", base: 4.5 }] },
  BOISSONS: { name: "Boissons", short: "Bois.", icon: GlassWater, color: C.jaune, type: "simple", items: [{ label: "Ice Tea", base: 2.5, drink: true }, { label: "Coca-Cola", base: 2.5, drink: true }, { label: "Orangina", base: 2.5, drink: true }, { label: "Limonade", base: 2.5, drink: true }, { label: "Jus de fruits", base: 3.0, drink: true }, { label: "Eau plate", base: 1.5, drink: true }, { label: "Eau pétillante", base: 2.0, drink: true }, { label: "Granité", base: 3.5, drink: true }, { label: "Milkshake", base: 6.0, drink: true }, { label: "Milkshake Peanuts", base: 7.5, drink: true }, { label: "Milkshake Choco", base: 7.5, drink: true }] },
  DUBAI: { name: "Café Dubaï", short: "Dubaï", icon: Coffee, color: C.brun, type: "simple", items: [{ label: "Café Dubaï", base: 6.0, dubai: true }, { label: "Dubaï Matcha", base: 6.0, dubai: true }, { label: "Dubaï Pistache", base: 6.5, dubai: true }] },
};
const CAT_KEYS = Object.keys(DEF_MENU);
const DEF_CONSUM = [
  { id: "cornet", name: "Cornets", qty: 500, seuil: 80, parBac: 100 }, { id: "pot", name: "Pots", qty: 500, seuil: 80, parBac: 100 },
  { id: "gobelet", name: "Gobelets (granita/café)", qty: 300, seuil: 50, parBac: 100 }, { id: "couvercle", name: "Couvercles", qty: 300, seuil: 50, parBac: 100 },
  { id: "cuillere", name: "Cuillères", qty: 800, seuil: 100, parBac: 200 }, { id: "serviette", name: "Serviettes", qty: 1000, seuil: 150, parBac: 250 },
  { id: "paille", name: "Pailles", qty: 400, seuil: 60, parBac: 200 }, { id: "coquedubai", name: "Coques choco Dubaï", qty: 120, seuil: 20, parBac: 50 },
];
function lineCost(l, costs) {
  let c = 0; c += (l.scoops || 0) * (costs.boule || 0);
  if (l.contenant === "Pot") c += (costs.pot || 0) + (costs.cuillere || 0) + (costs.serviette || 0);
  else if (l.contenant === "Cornet") c += (costs.cornet || 0) + (costs.serviette || 0);
  if (l.dubai) c += (costs.dubaiBase || 0) + (costs.gobelet || 0) + (costs.coquedubai || 0) + (costs.cuillere || 0) + (costs.serviette || 0);
  else if (l.drink) c += (costs.drinkBase || 0) + (costs.gobelet || 0) + (costs.paille || 0);
  if (l.cat === "GAUFRES") c += (costs.gaufreBase || 0) + (costs.serviette || 0);
  return c;
}
// tampons = 1 par boule + 1 par boisson
const cartTampons = (lines) => lines.reduce((s, l) => s + (l.scoops || 0) + (l.drink ? 1 : 0), 0);

export default function CremaCaisse() {
  const [seller, setSeller] = useState(null);
  const [view, setView] = useState("caisse");
  const [cat, setCat] = useState("SIGNATURES");
  const [cart, setCart] = useState([]);
  const [modal, setModal] = useState(null);
  const [pay, setPay] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [fidClient, setFidClient] = useState(null);  // client attaché à la vente en cours
  const [fidOpen, setFidOpen] = useState(false);
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [cloud, setCloud] = useState("local");
  const [toast, setToast] = useState(null);
  const [config, setConfigState] = useState({ prices: {}, parfums: DEF_PARFUMS, toppings: DEF_TOPPINGS, goal: 300, sellers: DEF_SELLERS, costs: DEF_COSTS });
  const [stock, setStockState] = useState({ consum: DEF_CONSUM, boules: {} });

  useEffect(() => {
    (async () => {
      const s = await DB.load(SALES_KEY); if (s) setSales(s);
      const c = await DB.load(CONF_KEY); if (c) setConfigState({ prices: c.prices || {}, parfums: c.parfums || DEF_PARFUMS, toppings: c.toppings || DEF_TOPPINGS, goal: c.goal ?? 300, sellers: c.sellers || DEF_SELLERS, costs: { ...DEF_COSTS, ...(c.costs || {}) } });
      const st = await DB.load(STOCK_KEY); if (st) setStockState({ consum: st.consum || DEF_CONSUM, boules: st.boules || {} });
      const cl = await DB.clientsAll(); setClients(cl);
      setLoaded(true);
    })();
  }, []);
  const persistSales = async (next) => { setSales(next); setCloud("saving"); const ok = await DB.save(SALES_KEY, next); setCloud(ok ? "saved" : "error"); setTimeout(() => setCloud("local"), 1200); };
  const setConfig = (updater) => setConfigState((prev) => { const next = typeof updater === "function" ? updater(prev) : updater; DB.save(CONF_KEY, next); return next; });
  const setStock = (updater) => setStockState((prev) => { const next = typeof updater === "function" ? updater(prev) : updater; DB.save(STOCK_KEY, next); return next; });
  const saveClient = async (cl) => { const saved = await DB.clientSave(cl); setClients((prev) => { const i = prev.findIndex((x) => x.id === saved.id); if (i >= 0) { const n = [...prev]; n[i] = saved; return n; } return [saved, ...prev]; }); return saved; };

  const fcolor = (name) => (config.parfums.find((p) => p.n === name) || ITAL_FLAVORS.find((p) => p.n === name) || { c: C.roseL }).c;
  const menu = useMemo(() => { const m = {}; for (const k of CAT_KEYS) m[k] = { ...DEF_MENU[k], items: DEF_MENU[k].items.map((it) => ({ ...it, base: config.prices[k + "|" + it.label] ?? it.base })) }; return m; }, [config.prices]);
  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price, 0), [cart]);
  const caToday = useMemo(() => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); return sales.filter((s) => s.ts >= t0.getTime()).reduce((a, x) => a + x.total, 0); }, [sales]);
  const lowStock = useMemo(() => stock.consum.filter((c) => c.qty <= c.seuil).length + config.parfums.filter((p) => (stock.boules[p.n] ?? 0) > 0 && (stock.boules[p.n] ?? 0) <= 10).length, [stock, config.parfums]);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1900); };

  const pick = (item) => {
    const M = menu[cat];
    if (M.type === "simple" || item.simple) { addLine({ cat, label: item.label, base: item.base, scoops: 0, flavors: [], nappage: null, topping: null, contenant: null, drink: item.drink, dubai: item.dubai, price: item.base }); flash(item.label + " ajouté"); return; }
    setModal({ cat, item, steps: M.steps, idx: 0, flavors: item.fixed ? [...item.fixed] : [], contenant: null, nappage: NAPPAGES[0], topping: config.toppings[0], flavorSet: M.flavorSet });
  };
  const addLine = (l) => setCart((c) => [...c, { ...l, uid: Date.now() + Math.random() }]);
  const completeSale = (m) => { addLine({ cat: m.cat, label: m.item.label, base: m.item.base, scoops: m.item.scoops || 0, flavors: m.flavors, contenant: m.contenant, nappage: m.nappage.name !== "Sans" ? m.nappage.name : null, topping: m.topping.name !== "Sans" ? m.topping.name : null, price: m.item.base + m.nappage.price + m.topping.price }); setModal(null); };
  const removeLine = (id) => setCart((c) => c.filter((l) => l.uid !== id));
  const applyStock = (lines, dir = -1) => {
    setStock((prev) => { const consum = prev.consum.map((c) => ({ ...c })); const boules = { ...prev.boules }; const dec = (id, n) => { const it = consum.find((c) => c.id === id); if (it) it.qty = Math.max(0, it.qty + dir * n); };
      lines.forEach((l) => { if ((l.scoops || 0) > 0 && l.flavors) l.flavors.forEach((f) => { boules[f] = Math.max(0, (boules[f] ?? 0) + dir * 1); }); if (l.contenant === "Pot") { dec("pot", 1); dec("cuillere", 1); dec("serviette", 1); } else if (l.contenant === "Cornet") { dec("cornet", 1); dec("serviette", 1); } if (l.dubai) { dec("gobelet", 1); dec("coquedubai", 1); dec("cuillere", 1); dec("serviette", 1); } else if (l.drink) { dec("gobelet", 1); dec("paille", 1); } if (l.cat === "GAUFRES") dec("serviette", 1); });
      return { consum, boules }; });
  };
  const checkout = async (method, remise = 0) => {
    const total = Math.max(0, subtotal - remise);
    const cost = cart.reduce((s, l) => s + lineCost(l, config.costs), 0);
    const gained = cartTampons(cart);
    const sale = { id: "T" + Date.now(), ts: Date.now(), seller: seller?.id, sellerName: seller?.name, items: cart.map((l) => ({ cat: l.cat, label: l.label, price: l.price, scoops: l.scoops || 0, flavors: l.flavors || [], contenant: l.contenant, nappage: l.nappage, topping: l.topping, drink: l.drink, dubai: l.dubai })), subtotal, remise, total, cost, method, scoops: cart.reduce((s, l) => s + (l.scoops || 0), 0), clientId: fidClient?.id, tampons: gained };
    applyStock(cart, -1); persistSales([sale, ...sales]);
    if (fidClient && gained > 0) { const c = { ...fidClient, tampons: (fidClient.tampons || 0) + gained, visites: (fidClient.visites || 0) + 1, updated: Date.now() }; await saveClient(c); flash(`Encaissé · ${eur(total)} · +${gained} 🎟️ (${c.tampons})`); }
    else flash("Encaissé · " + eur(total));
    setCart([]); setPay(null); setFidClient(null);
  };
  const undoLast = () => { if (sales.length) { const last = sales[0]; applyStock(last.items, +1); persistSales(sales.slice(1)); flash("Dernière vente annulée"); } };

  if (!seller) return <SellerGate sellers={config.sellers} onPick={(s) => { setSeller(s); setView("caisse"); }} onSave={(list) => setConfig((c) => ({ ...c, sellers: list }))} caToday={caToday} />;

  return (
    <div style={{ background: C.creme, color: C.noir, minHeight: "100%", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Inter:wght@400;500;600;700;800;900&display=swap');
        .logo{font-family:'Pacifico',cursive}.tap{transition:transform .07s ease}.tap:active{transform:scale(.95)}
        .fade{animation:fade .18s ease}@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1}}
        .pop{animation:pop .3s cubic-bezier(.2,1.3,.4,1)}@keyframes pop{from{transform:scale(.6);opacity:0}to{transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input{font-family:inherit}::-webkit-scrollbar{height:6px;width:6px}::-webkit-scrollbar-thumb{background:#e3d6bd;border-radius:9px}`}</style>

      <div style={{ height: 12, background: `repeating-linear-gradient(90deg, ${C.jaune} 0 22px, ${C.creme} 22px 44px)` }} />
      <header style={{ background: "#fff", borderBottom: `2px solid ${C.roseL}` }} className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="logo" style={{ color: C.rose, fontSize: 30, transform: "rotate(-3deg)" }}>Crémà</span>
          <button onClick={() => setSeller(null)} className="tap flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: C.creme, fontSize: 12, fontWeight: 700, color: C.ink }}><Avatar s={seller} size={18} /> {seller.name} <LogOut size={12} color={C.soft} /></button>
          <span className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: C.creme, fontSize: 11, fontWeight: 700, color: C.soft }}><Cloud size={13} color={DB.cloud ? C.vert : cloud === "saved" ? C.vert : cloud === "error" ? C.rose : C.soft} /> {DB.cloud ? "Cloud" : cloud === "saving" ? "Sauvegarde…" : cloud === "saved" ? "Sauvegardé" : "Local"}</span>
        </div>
        <div className="flex gap-1.5">
          <Tab on={view === "caisse"} onClick={() => setView("caisse")} icon={Store} label="Caisse" />
          <Tab on={view === "fidelite"} onClick={() => setView("fidelite")} icon={Heart} label="Fidélité" />
          <Tab on={view === "stock"} onClick={() => setView("stock")} icon={Package} label="Stock" badge={lowStock} />
          <Tab on={view === "stats"} onClick={() => setView("stats")} icon={BarChart3} label="Stats" />
          <Tab on={view === "reglages"} onClick={() => setView("reglages")} icon={Settings} label="Réglages" />
        </div>
      </header>

      {view === "caisse" && <Caisse {...{ menu, cat, setCat, pick, cart, removeLine, total: subtotal, setPay, setCart, fcolor, caToday, goal: config.goal, onTicket: () => setTicket({ items: cart, total: subtotal }), fidClient, onFid: () => setFidOpen(true), onFidClear: () => setFidClient(null) }} />}
      {view === "fidelite" && <Fidelite clients={clients} saveClient={saveClient} flash={flash} />}
      {view === "stock" && <StockView stock={stock} setStock={setStock} parfums={config.parfums} fcolor={fcolor} />}
      {view === "stats" && <Stats sales={sales} loaded={loaded} sellers={config.sellers} clients={clients} onReset={() => persistSales([])} onUndo={undoLast} fcolor={fcolor} goal={config.goal} onShowTicket={(s) => setTicket({ items: s.items, total: s.total, remise: s.remise, ts: s.ts, method: s.method, sellerName: s.sellerName })} />}
      {view === "reglages" && <Reglages menu={menu} config={config} setConfig={setConfig} />}

      {modal && <Wizard modal={modal} setModal={setModal} onComplete={completeSale} parfums={config.parfums} toppings={config.toppings} fcolor={fcolor} />}
      {pay && <Payment subtotal={subtotal} onClose={() => setPay(null)} onPay={checkout} />}
      {ticket && <TicketModal ticket={ticket} onClose={() => setTicket(null)} />}
      {fidOpen && <FidPicker clients={clients} saveClient={saveClient} onClose={() => setFidOpen(false)} onSelect={(c) => { setFidClient(c); setFidOpen(false); flash(`${c.prenom} · ${c.tampons || 0} 🎟️`); }} />}
      {toast && <div className="fade" style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: C.noir, color: "#fff", padding: "12px 22px", borderRadius: 999, fontWeight: 700, fontSize: 14, zIndex: 70, textAlign: "center" }}>{toast}</div>}
    </div>
  );
}

/* ===== Avatar ===== */
function Avatar({ s, size = 46 }) {
  if (s.photo) return <img src={s.photo} alt={s.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", boxShadow: "0 0 0 2px rgba(0,0,0,.05)" }} />;
  return <span style={{ width: size, height: size, borderRadius: "50%", background: s.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.42 }}>{(s.name || "?")[0].toUpperCase()}</span>;
}

/* ===== Seller gate ===== */
function SellerGate({ sellers, onPick, onSave, caToday }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(sellers);
  const fileRefs = useRef({});
  useEffect(() => { setDraft(sellers); }, [sellers]);
  const readPhoto = (id, file) => { if (!file) return; const r = new FileReader(); r.onload = () => { const max = 320; const img = new Image(); img.onload = () => { const cv = document.createElement("canvas"); const sc = Math.min(1, max / Math.max(img.width, img.height)); cv.width = img.width * sc; cv.height = img.height * sc; cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); setDraft((d) => d.map((s) => s.id === id ? { ...s, photo: cv.toDataURL("image/jpeg", 0.8) } : s)); }; img.src = r.result; }; r.readAsDataURL(file); };
  const upd = (id, patch) => setDraft((d) => d.map((s) => s.id === id ? { ...s, ...patch } : s));
  const add = () => setDraft((d) => [...d, { id: uid(), name: "Nouveau", color: PALETTE[d.length % PALETTE.length], photo: null }]);
  const del = (id) => setDraft((d) => d.filter((s) => s.id !== id));
  const save = () => { onSave(draft.filter((s) => (s.name || "").trim())); setEdit(false); };
  return (
    <div style={{ minHeight: "100%", background: C.creme, fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Inter:wght@400;600;700;800;900&display=swap');.logo{font-family:'Pacifico',cursive}.tap{transition:transform .08s ease}.tap:active{transform:scale(.96)}`}</style>
      <div style={{ height: 12, background: `repeating-linear-gradient(90deg, ${C.jaune} 0 22px, ${C.creme} 22px 44px)` }} />
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8" style={{ textAlign: "center" }}>
        <div className="logo" style={{ color: C.rose, fontSize: 62, lineHeight: 1, transform: "rotate(-3deg)" }}>Crémà</div>
        <div style={{ color: C.soft, fontWeight: 700, letterSpacing: 1, marginTop: 8, marginBottom: 28, textTransform: "uppercase", fontSize: 13 }}>{edit ? "Gérer les profils" : "Qui encaisse ?"}</div>
        {!edit ? (
          <>
            <div className="grid gap-3 w-full" style={{ maxWidth: 380 }}>{sellers.map((s) => <button key={s.id} onClick={() => onPick(s)} className="tap flex items-center gap-3 rounded-2xl" style={{ background: "#fff", border: `2px solid ${C.line}`, padding: "14px 16px", boxShadow: "0 4px 0 rgba(0,0,0,.04)" }}><Avatar s={s} size={48} /><span style={{ fontWeight: 800, fontSize: 19 }}>{s.name}</span><UserRound size={20} color={C.soft} style={{ marginLeft: "auto" }} /></button>)}</div>
            <button onClick={() => setEdit(true)} className="tap flex items-center gap-2 mt-5" style={{ color: C.soft, fontWeight: 700, fontSize: 13 }}><Pencil size={14} /> Gérer les profils</button>
          </>
        ) : (
          <>
            <div className="grid gap-3 w-full" style={{ maxWidth: 420 }}>
              {draft.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl" style={{ background: "#fff", border: `2px solid ${C.line}`, padding: 12 }}>
                  <div style={{ position: "relative" }}><Avatar s={s} size={52} /><button onClick={() => fileRefs.current[s.id]?.click()} className="tap" style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%", background: C.rose, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}><Camera size={11} /></button><input ref={(el) => (fileRefs.current[s.id] = el)} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => readPhoto(s.id, e.target.files[0])} /></div>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <input value={s.name} onChange={(e) => upd(s.id, { name: e.target.value })} style={{ width: "100%", padding: "7px 9px", borderRadius: 10, border: `2px solid ${C.line}`, fontWeight: 700, fontSize: 15 }} />
                    <div className="flex gap-1.5 mt-2 flex-wrap">{PALETTE.slice(0, 8).map((col) => <button key={col} onClick={() => upd(s.id, { color: col, photo: null })} className="tap" style={{ width: 18, height: 18, borderRadius: "50%", background: col, border: s.color === col && !s.photo ? `2px solid ${C.noir}` : "1px solid rgba(0,0,0,.1)" }} />)}{s.photo && <button onClick={() => upd(s.id, { photo: null })} className="tap flex items-center gap-1" style={{ fontSize: 11, color: C.soft, fontWeight: 600 }}><X size={11} /> photo</button>}</div>
                  </div>
                  <button onClick={() => del(s.id)} className="tap shrink-0"><Trash2 size={18} color={C.rose} /></button>
                </div>
              ))}
            </div>
            <button onClick={add} className="tap flex items-center justify-center gap-2 mt-3 py-3 rounded-xl w-full" style={{ maxWidth: 420, background: "#fff", border: `2px dashed ${C.roseL}`, color: C.rose, fontWeight: 800, fontSize: 14 }}><Plus size={16} /> Ajouter un profil</button>
            <div className="flex gap-2 mt-4 w-full" style={{ maxWidth: 420 }}><button onClick={() => { setDraft(sellers); setEdit(false); }} className="tap flex-1 py-3 rounded-2xl" style={{ background: C.creme, fontWeight: 700 }}>Annuler</button><button onClick={save} className="tap flex-1 py-3 rounded-2xl" style={{ background: C.rose, color: "#fff", fontWeight: 800 }}>Enregistrer</button></div>
          </>
        )}
        {!edit && <div style={{ color: C.soft, fontSize: 12, marginTop: 26 }}>CA du jour&nbsp;: <b style={{ color: C.vert }}>{eur(caToday)}</b></div>}
      </div>
    </div>
  );
}

/* ===== Tampons row ===== */
function Tampons({ n, size = 22 }) {
  const cur = n % TAMPONS_RECOMPENSE;
  const filled = n > 0 && cur === 0 ? TAMPONS_RECOMPENSE : cur;
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: TAMPONS_RECOMPENSE }).map((_, i) => (
        <span key={i} style={{ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: i < filled ? C.rose : "#fff", border: `2px solid ${i < filled ? C.rose : C.line}` }}>
          {i < filled && <IceCream size={size * 0.55} color="#fff" />}
        </span>
      ))}
    </div>
  );
}

/* ===== FidPicker (caisse: attacher/créer un client) ===== */
function FidPicker({ clients, saveClient, onClose, onSelect }) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [tel, setTel] = useState("");
  const res = q.trim() ? clients.filter((c) => (c.prenom || "").toLowerCase().includes(q.toLowerCase()) || cleanTel(c.tel).includes(cleanTel(q))).slice(0, 8) : clients.slice(0, 6);
  const create = async () => { if (!prenom.trim() || cleanTel(tel).length < 6) return; const c = await saveClient({ id: uid(), prenom: prenom.trim(), tel: cleanTel(tel), tampons: 0, visites: 0, consent: true, created: Date.now(), updated: Date.now() }); onSelect(c); };
  return (
    <Overlay onClose={onClose}>
      <div className="fade" style={panel}>
        <div className="flex items-center gap-2 mb-3"><Heart size={20} color={C.rose} /><span style={{ fontWeight: 900, fontSize: 18 }}>Carte de fidélité</span></div>
        {!creating ? (
          <>
            <div className="flex items-center gap-2 rounded-xl px-3 mb-3" style={{ background: C.creme }}>
              <Search size={16} color={C.soft} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Prénom ou téléphone…" style={{ flex: 1, background: "transparent", border: "none", padding: "11px 0", fontWeight: 600, fontSize: 14 }} />
            </div>
            <div className="space-y-2" style={{ maxHeight: 280, overflowY: "auto" }}>
              {res.map((c) => (
                <button key={c.id} onClick={() => onSelect(c)} className="tap w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-left" style={{ background: "#fff", border: `2px solid ${C.line}` }}>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 15 }}>{c.prenom}</div><div style={{ color: C.soft, fontSize: 12 }}>{c.tel}</div></div>
                  <div className="flex items-center gap-1 shrink-0" style={{ color: C.rose, fontWeight: 800, fontSize: 14 }}>{(c.tampons || 0) % TAMPONS_RECOMPENSE}<span style={{ color: C.soft, fontWeight: 600 }}>/{TAMPONS_RECOMPENSE}</span></div>
                </button>
              ))}
              {res.length === 0 && <p style={{ color: C.soft, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Aucun client trouvé.</p>}
            </div>
            <button onClick={() => { setCreating(true); setPrenom(q.match(/[a-zA-ZÀ-ÿ]/) ? q : ""); }} className="tap flex items-center justify-center gap-2 w-full mt-3 py-3 rounded-2xl" style={{ background: C.rose, color: "#fff", fontWeight: 800, fontSize: 15 }}><Plus size={17} /> Nouveau client</button>
            <button onClick={onClose} className="tap w-full py-2 mt-1" style={{ color: C.soft, fontWeight: 600, fontSize: 13 }}>Sans carte / fermer</button>
          </>
        ) : (
          <>
            <Step label="Nouveau client" />
            <input autoFocus value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" style={{ width: "100%", padding: "12px", borderRadius: 12, border: `2px solid ${C.line}`, fontWeight: 600, fontSize: 15, marginBottom: 10 }} />
            <div className="flex items-center gap-2 rounded-xl px-3 mb-2" style={{ border: `2px solid ${C.line}` }}><Phone size={16} color={C.soft} /><input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="Téléphone" inputMode="tel" style={{ flex: 1, border: "none", padding: "10px 0", fontWeight: 600, fontSize: 15 }} /></div>
            <p style={{ color: C.soft, fontSize: 11, marginBottom: 12 }}>Le client accepte de figurer dans le programme fidélité Crémà. Il peut être retiré à tout moment.</p>
            <button onClick={create} className="tap w-full rounded-2xl" style={{ background: C.rose, color: "#fff", fontWeight: 800, fontSize: 16, padding: "13px 0" }}>Créer & attacher</button>
            <button onClick={() => setCreating(false)} className="tap w-full py-2 mt-1" style={{ color: C.soft, fontWeight: 600, fontSize: 13 }}>Retour</button>
          </>
        )}
      </div>
    </Overlay>
  );
}

/* ===== Fidélité (onglet gestion) ===== */
function Fidelite({ clients, saveClient, flash }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const list = q.trim() ? clients.filter((c) => (c.prenom || "").toLowerCase().includes(q.toLowerCase()) || cleanTel(c.tel).includes(cleanTel(q))) : clients;
  const reward = async (c) => { const nc = { ...c, tampons: Math.max(0, (c.tampons || 0) - TAMPONS_RECOMPENSE), recompenses: (c.recompenses || 0) + 1, updated: Date.now() }; await saveClient(nc); setSel(nc); flash(`🎁 Récompense pour ${c.prenom} !`); };
  const addStamp = async (c, n) => { const nc = { ...c, tampons: Math.max(0, (c.tampons || 0) + n), updated: Date.now() }; await saveClient(nc); setSel(nc); };
  const totalClients = clients.length;
  const totalReward = clients.reduce((s, c) => s + (c.recompenses || 0), 0);
  return (
    <div className="p-4" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="mb-3"><div style={{ fontWeight: 900, fontSize: 20 }}>Fidélité</div><div style={{ color: C.soft, fontSize: 12 }}>1 tampon par boule & par boisson · {TAMPONS_RECOMPENSE} tampons = 1 récompense.</div></div>
      {!DB.cloud && <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: "#fff7e6", border: `2px solid ${C.jaune}` }}><AlertTriangle size={16} color={C.brun} style={{ marginTop: 1 }} /><div style={{ fontSize: 12, color: C.ink }}><b>Mode local.</b> Les cartes sont sur cet appareil uniquement. Branche Supabase (voir guide) pour le cloud partagé + sauvegardé.</div></div>}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Kpi label="Clients fidèles" value={String(totalClients)} color={C.rose} />
        <Kpi label="Récompenses données" value={String(totalReward)} color={C.vert} />
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 mb-3" style={{ background: "#fff", border: `2px solid ${C.line}` }}><Search size={16} color={C.soft} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un client…" style={{ flex: 1, background: "transparent", border: "none", padding: "11px 0", fontWeight: 600, fontSize: 14 }} /></div>
      <div className="space-y-2">
        {list.map((c) => { const cur = (c.tampons || 0) % TAMPONS_RECOMPENSE; const ready = (c.tampons || 0) >= TAMPONS_RECOMPENSE; return (
          <div key={c.id} className="rounded-2xl p-3" style={{ background: "#fff", border: `2px solid ${ready ? C.vert : C.line}` }}>
            <div className="flex items-center justify-between gap-2">
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 16 }}>{c.prenom}</div><div style={{ color: C.soft, fontSize: 12 }}>{c.tel} · {c.visites || 0} visite{(c.visites || 0) > 1 ? "s" : ""}</div></div>
              <button onClick={() => setSel(sel?.id === c.id ? null : c)} className="tap px-3 py-2 rounded-xl shrink-0" style={{ background: C.creme, fontWeight: 700, fontSize: 13 }}>{sel?.id === c.id ? "Fermer" : "Gérer"}</button>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap"><Tampons n={c.tampons || 0} /><span style={{ color: ready ? C.vert : C.soft, fontWeight: 700, fontSize: 13 }}>{ready ? "🎁 Récompense dispo !" : `${cur}/${TAMPONS_RECOMPENSE}`}</span></div>
            {sel?.id === c.id && (
              <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: `1px dashed ${C.line}` }}>
                <button onClick={() => addStamp(c, 1)} className="tap px-3 py-2 rounded-xl flex items-center gap-1" style={{ background: C.creme, fontWeight: 700, fontSize: 13 }}><Plus size={14} /> tampon</button>
                <button onClick={() => addStamp(c, -1)} className="tap px-3 py-2 rounded-xl flex items-center gap-1" style={{ background: C.creme, fontWeight: 700, fontSize: 13 }}><Minus size={14} /> tampon</button>
                <button disabled={!ready} onClick={() => reward(c)} className="tap px-3 py-2 rounded-xl flex items-center gap-1 ml-auto" style={{ background: ready ? C.vert : "#e7ddca", color: "#fff", fontWeight: 800, fontSize: 13 }}><Gift size={15} /> Offrir la récompense</button>
              </div>
            )}
          </div>
        ); })}
        {list.length === 0 && <p style={{ color: C.soft, fontSize: 13, textAlign: "center", padding: "20px 0" }}>{q ? "Aucun client trouvé." : "Pas encore de client. Crée-en un depuis la caisse (bouton ❤️ Fidélité)."}</p>}
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

/* ===== Caisse ===== */
function Caisse({ menu, cat, setCat, pick, cart, removeLine, total, setPay, setCart, fcolor, caToday, goal, onTicket, fidClient, onFid, onFidClear }) {
  const M = menu[cat]; const Icon = M.icon;
  const nb = cart.reduce((s, l) => s + (l.scoops || 0), 0);
  const pct = goal > 0 ? Math.min(100, Math.round((caToday / goal) * 100)) : 0;
  const gain = cartTampons(cart);
  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: 540 }}>
      <div className="flex-1 p-3">
        <div className="rounded-2xl p-3 mb-3" style={{ background: "#fff", border: `2px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-1.5"><span className="flex items-center gap-1.5" style={{ fontWeight: 700, fontSize: 13 }}><Target size={15} color={C.rose} /> Objectif du jour</span><span style={{ fontSize: 13, fontWeight: 700 }}><b style={{ color: pct >= 100 ? C.vert : C.rose }}>{eur(caToday)}</b> <span style={{ color: C.soft }}>/ {eur(goal)}</span></span></div>
          <div style={{ height: 10, borderRadius: 9, background: C.creme, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", borderRadius: 9, background: pct >= 100 ? C.vert : `linear-gradient(90deg, ${C.jaune}, ${C.rose})`, transition: "width .4s ease" }} /></div>
          {pct >= 100 && <div style={{ color: C.vert, fontSize: 12, fontWeight: 700, marginTop: 5 }}>🎉 Objectif atteint, bravo !</div>}
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {CAT_KEYS.map((k) => { const Mk = menu[k]; const KIcon = Mk.icon; const on = cat === k; return (
            <button key={k} onClick={() => setCat(k)} className="tap flex items-center gap-2 px-4 py-3 rounded-2xl shrink-0" style={{ background: on ? Mk.color : "#fff", color: on ? "#fff" : C.ink, fontWeight: 800, fontSize: 13.5, border: `2px solid ${on ? Mk.color : C.line}`, boxShadow: on ? "0 6px 14px rgba(240,92,138,.18)" : "none" }}><KIcon size={17} /> {Mk.name}</button>
          ); })}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {M.items.map((it) => (
            <button key={it.label} onClick={() => pick(it)} className="tap text-left rounded-2xl fade" style={{ background: "#fff", border: `2px solid ${cat === "SIGNATURES" ? C.roseL : C.line}`, padding: 16, minHeight: 96, position: "relative", boxShadow: "0 2px 0 rgba(0,0,0,.03)" }}>
              {cat === "SIGNATURES" && <Star size={14} color={C.rose} fill={C.rose} style={{ position: "absolute", top: 12, right: 12 }} />}
              <Icon size={22} color={M.color} />
              <div style={{ fontWeight: 700, marginTop: 8, fontSize: 15 }}>{it.label}</div>
              {it.fixed && <div style={{ color: C.soft, fontSize: 11 }}>{it.fixed.join(" · ")}</div>}
              <div style={{ color: M.color, fontWeight: 800, fontSize: 16, marginTop: it.fixed ? 0 : 2 }}>{eur(it.base)}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="md:w-80 p-3 flex flex-col" style={{ background: "#fff", borderTop: `2px solid ${C.roseL}` }}>
        {/* Bandeau fidélité */}
        {fidClient ? (
          <div className="rounded-xl p-2.5 mb-2 flex items-center justify-between gap-2" style={{ background: C.rose, color: "#fff" }}>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 14 }}>❤️ {fidClient.prenom}</div><div style={{ fontSize: 11, opacity: .9 }}>{(fidClient.tampons || 0) % TAMPONS_RECOMPENSE}/{TAMPONS_RECOMPENSE} tampons{gain > 0 ? ` · +${gain} à valider` : ""}</div></div>
            <button onClick={onFidClear} className="tap shrink-0"><X size={18} color="#fff" /></button>
          </div>
        ) : (
          <button onClick={onFid} className="tap flex items-center justify-center gap-2 mb-2 py-2.5 rounded-xl" style={{ background: C.creme, color: C.rose, fontWeight: 800, fontSize: 13, border: `2px dashed ${C.roseL}` }}><Heart size={15} /> Carte de fidélité</button>
        )}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontWeight: 800, fontSize: 16 }}>Panier</span>
          <div className="flex items-center gap-3">
            {cart.length > 0 && <button onClick={onTicket} className="tap flex items-center gap-1" style={{ color: C.brun, fontSize: 12, fontWeight: 700 }}><Receipt size={14} /> Ticket</button>}
            {cart.length > 0 && <button onClick={() => setCart([])} className="tap" style={{ color: C.soft, fontSize: 12, fontWeight: 600 }}>Effacer</button>}
          </div>
        </div>
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10 flex-1" style={{ color: C.soft }}><IceCream size={36} color={C.roseL} /><p style={{ marginTop: 8, fontSize: 13 }}>Composez une vente en touchant les articles.</p></div>
        ) : (
          <div className="space-y-2 mb-2 flex-1" style={{ maxHeight: 270, overflowY: "auto" }}>
            {cart.map((l) => (
              <div key={l.uid} className="flex items-start justify-between gap-2 p-2 rounded-xl fade" style={{ background: C.creme }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{l.label}{l.contenant ? <span style={{ color: C.soft, fontWeight: 600 }}> · {l.contenant}</span> : ""}</div>
                  {l.flavors && l.flavors.length > 0 && <div className="flex flex-wrap items-center gap-1 mt-1">{l.flavors.map((fn, i) => <span key={i} className="flex items-center gap-1" style={{ fontSize: 11, color: C.ink, fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: fcolor(fn) }} />{fn}{i < l.flavors.length - 1 ? "," : ""}</span>)}</div>}
                  {(l.nappage || l.topping) && <div style={{ color: C.soft, fontSize: 11, marginTop: 2 }}>{[l.nappage, l.topping].filter(Boolean).join(" · ")}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0"><span style={{ fontWeight: 800, fontSize: 14 }}>{eur(l.price)}</span><button onClick={() => removeLine(l.uid)} className="tap"><Trash2 size={16} color={C.rose} /></button></div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end justify-between mb-3 pt-2" style={{ borderTop: `1px dashed ${C.roseL}` }}>
          <div><span style={{ fontWeight: 700 }}>Total</span>{nb > 0 && <span style={{ color: C.soft, fontSize: 12, marginLeft: 6 }}>· {nb} boule{nb > 1 ? "s" : ""}</span>}</div>
          <span className="logo" style={{ color: C.rose, fontSize: 32, lineHeight: 1 }}>{eur(total)}</span>
        </div>
        <button disabled={cart.length === 0} onClick={() => setPay(true)} className="tap w-full rounded-2xl" style={{ background: cart.length ? C.rose : "#e7ddca", color: "#fff", fontWeight: 800, fontSize: 18, padding: "16px 0", boxShadow: cart.length ? "0 8px 18px rgba(240,92,138,.3)" : "none" }}>Encaisser</button>
      </div>
    </div>
  );
}

/* ===== Stock + commande Poupart ===== */
function StockView({ stock, setStock, parfums, fcolor }) {
  const [tab, setTab] = useState("conso");
  const [order, setOrder] = useState(false);
  const setConsum = (id, qty) => setStock((s) => ({ ...s, consum: s.consum.map((c) => c.id === id ? { ...c, qty: Math.max(0, qty) } : c) }));
  const setSeuil = (id, seuil) => setStock((s) => ({ ...s, consum: s.consum.map((c) => c.id === id ? { ...c, seuil: Math.max(0, seuil) } : c) }));
  const addConsum = () => setStock((s) => ({ ...s, consum: [...s.consum, { id: uid(), name: "Nouvel article", qty: 0, seuil: 10, parBac: 100 }] }));
  const renConsum = (id, name) => setStock((s) => ({ ...s, consum: s.consum.map((c) => c.id === id ? { ...c, name } : c) }));
  const delConsum = (id) => setStock((s) => ({ ...s, consum: s.consum.filter((c) => c.id !== id) }));
  const setBac = (parfum, bacs) => setStock((s) => ({ ...s, boules: { ...s.boules, [parfum]: Math.max(0, Math.round(bacs * BOULES_PAR_BAC)) } }));
  const addBoules = (parfum, n) => setStock((s) => ({ ...s, boules: { ...s.boules, [parfum]: Math.max(0, (s.boules[parfum] ?? 0) + n) } }));
  const num = { width: 64, textAlign: "center", padding: "6px 4px", borderRadius: 10, border: `2px solid ${C.line}`, fontWeight: 800, fontSize: 15 };
  const parfumsToOrder = parfums.map((p) => ({ p, b: stock.boules[p.n] ?? 0 })).filter((x) => x.b <= BOULES_PAR_BAC / 2).map((x) => ({ name: x.p.n, bacs: Math.max(1, Math.ceil((BOULES_PAR_BAC - x.b) / BOULES_PAR_BAC)) }));
  const consumToOrder = stock.consum.filter((c) => c.qty <= c.seuil).map((c) => ({ name: c.name, lots: Math.max(1, Math.ceil((c.seuil * 3 - c.qty) / (c.parBac || 100))), parBac: c.parBac || 100 }));
  const orderText = ["Bonjour, commande Crémà :", "", "— Glaces (bacs) —", ...(parfumsToOrder.length ? parfumsToOrder.map((x) => `• ${x.name} : ${x.bacs} bac${x.bacs > 1 ? "s" : ""}`) : ["(rien)"]), "", "— Consommables —", ...(consumToOrder.length ? consumToOrder.map((x) => `• ${x.name} : ${x.lots} lot${x.lots > 1 ? "s" : ""} (~${x.lots * x.parBac} u.)`) : ["(rien)"]), "", "Merci !"].join("\n");
  const nbToOrder = parfumsToOrder.length + consumToOrder.length;
  const copy = () => { try { navigator.clipboard.writeText(orderText); } catch (e) {} };
  return (
    <div className="p-4" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div><div style={{ fontWeight: 900, fontSize: 20 }}>Stock</div><div style={{ color: C.soft, fontSize: 12 }}>Décompté auto à chaque vente.</div></div>
        <button onClick={() => setOrder(true)} className="tap flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={{ background: C.vert, color: "#fff", fontWeight: 800, fontSize: 14, position: "relative" }}><ClipboardList size={17} /> Commande Poupart{nbToOrder > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9, background: C.rouge, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{nbToOrder}</span>}</button>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("conso")} className="tap px-4 py-2 rounded-full" style={{ background: tab === "conso" ? C.rose : "#fff", color: tab === "conso" ? "#fff" : C.ink, fontWeight: 700, fontSize: 13, border: `2px solid ${tab === "conso" ? C.rose : C.line}` }}>Consommables</button>
        <button onClick={() => setTab("bacs")} className="tap px-4 py-2 rounded-full" style={{ background: tab === "bacs" ? C.rose : "#fff", color: tab === "bacs" ? "#fff" : C.ink, fontWeight: 700, fontSize: 13, border: `2px solid ${tab === "bacs" ? C.rose : C.line}` }}>Bacs de glace</button>
      </div>
      {tab === "conso" && (
        <>
          <div className="space-y-2">
            {stock.consum.map((c) => { const low = c.qty <= c.seuil; return (
              <div key={c.id} className="rounded-2xl p-3" style={{ background: "#fff", border: `2px solid ${low ? C.rouge : C.line}` }}>
                <div className="flex items-center gap-2"><input value={c.name} onChange={(e) => renConsum(c.id, e.target.value)} style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 10, border: `2px solid ${C.line}`, fontWeight: 700, fontSize: 14 }} />{low && <span className="flex items-center gap-1 px-2 py-1 rounded-full shrink-0" style={{ background: "#fde9e7", color: C.rouge, fontSize: 11, fontWeight: 800 }}><AlertTriangle size={12} /> Bas</span>}<button onClick={() => delConsum(c.id)} className="tap shrink-0"><Trash2 size={16} color={C.soft} /></button></div>
                <div className="flex items-center gap-2 mt-2"><button onClick={() => setConsum(c.id, c.qty - 10)} className="tap p-2 rounded-xl" style={{ background: C.creme }}><Minus size={15} /></button><input type="number" inputMode="numeric" value={c.qty} onChange={(e) => setConsum(c.id, parseInt(e.target.value) || 0)} style={{ ...num, color: low ? C.rouge : C.ink }} /><button onClick={() => setConsum(c.id, c.qty + 10)} className="tap p-2 rounded-xl" style={{ background: C.creme }}><Plus size={15} /></button><span style={{ color: C.soft, fontSize: 12, fontWeight: 600 }}>en stock</span><div className="flex items-center gap-1 ml-auto"><span style={{ color: C.soft, fontSize: 11 }}>alerte à</span><input type="number" inputMode="numeric" value={c.seuil} onChange={(e) => setSeuil(c.id, parseInt(e.target.value) || 0)} style={{ width: 56, textAlign: "center", padding: "5px 4px", borderRadius: 9, border: `2px solid ${C.line}`, fontWeight: 700, fontSize: 13 }} /></div></div>
              </div>
            ); })}
          </div>
          <button onClick={addConsum} className="tap flex items-center justify-center gap-2 w-full mt-3 py-3 rounded-xl" style={{ background: "#fff", border: `2px dashed ${C.roseL}`, color: C.rose, fontWeight: 800, fontSize: 14 }}><Plus size={16} /> Ajouter un consommable</button>
        </>
      )}
      {tab === "bacs" && (
        <>
          <div className="rounded-xl p-3 mb-3" style={{ background: "#fff", border: `2px solid ${C.line}`, color: C.soft, fontSize: 12 }}>1 bac ≈ <b style={{ color: C.ink }}>{BOULES_PAR_BAC} boules</b>. Chaque boule vendue déduit auto le bon parfum.</div>
          <div className="space-y-2">
            {parfums.map((p) => { const b = stock.boules[p.n] ?? 0; const bacs = (b / BOULES_PAR_BAC); const low = b > 0 && b <= 10; return (
              <div key={p.n} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "#fff", border: `2px solid ${low ? C.rouge : C.line}` }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: p.c, border: "1px solid rgba(0,0,0,.12)" }} />
                <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.n}{p.s ? <span style={{ color: C.soft, fontSize: 11 }}> · sorbet</span> : ""}</div><div style={{ color: low ? C.rouge : C.soft, fontSize: 12, fontWeight: 600 }}>{b} boules · {bacs.toFixed(1)} bac{bacs >= 2 ? "s" : ""}{low ? " · bientôt vide !" : ""}</div></div>
                <div className="flex items-center gap-1.5 shrink-0"><button onClick={() => addBoules(p.n, -10)} className="tap p-2 rounded-xl" style={{ background: C.creme }}><Minus size={14} /></button><button onClick={() => addBoules(p.n, 10)} className="tap p-2 rounded-xl" style={{ background: C.creme }}><Plus size={14} /></button><div className="flex flex-col gap-1 ml-1"><button onClick={() => setBac(p.n, bacs + 1)} className="tap px-2 py-1 rounded-lg" style={{ background: C.vert, color: "#fff", fontSize: 11, fontWeight: 800 }}>+1 bac</button><button onClick={() => setStock((s) => ({ ...s, boules: { ...s.boules, [p.n]: 0 } }))} className="tap px-2 py-1 rounded-lg" style={{ background: C.creme, color: C.soft, fontSize: 11, fontWeight: 700 }}>Vide</button></div></div>
              </div>
            ); })}
          </div>
        </>
      )}
      {order && (
        <Overlay onClose={() => setOrder(false)}>
          <div className="fade" style={panel}>
            <div className="flex items-center gap-2 mb-1"><ClipboardList size={20} color={C.vert} /><span style={{ fontWeight: 900, fontSize: 18 }}>Commande Poupart</span></div>
            <p style={{ color: C.soft, fontSize: 12, marginBottom: 14 }}>Basé sur ton stock (parfums ≤ ½ bac, consommables sous seuil).</p>
            {nbToOrder === 0 ? <div className="text-center py-6"><Check size={40} color={C.vert} style={{ margin: "0 auto 8px" }} /><div style={{ fontWeight: 700 }}>Rien à commander 👍</div></div> : (
              <><div style={{ background: C.creme, borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 600, whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 300, overflowY: "auto" }}>{orderText}</div><button onClick={copy} className="tap flex items-center justify-center gap-2 w-full rounded-2xl mt-3" style={{ background: C.vert, color: "#fff", fontWeight: 800, fontSize: 15, padding: "13px 0" }}><Copy size={17} /> Copier la commande</button><p style={{ color: C.soft, fontSize: 11, textAlign: "center", marginTop: 8 }}>À envoyer à chloegerardin.glacespoupart@gmail.com</p></>
            )}
            <button onClick={() => setOrder(false)} className="tap w-full py-2 mt-2" style={{ color: C.soft, fontWeight: 600, fontSize: 13 }}>Fermer</button>
          </div>
        </Overlay>
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}

/* ===== Ticket ===== */
function TicketModal({ ticket, onClose }) {
  const t = ticket.ts ? new Date(ticket.ts) : new Date();
  return (
    <Overlay onClose={onClose}>
      <div className="fade" style={{ ...panel, maxWidth: 340, padding: 0, overflow: "hidden" }}>
        <div style={{ height: 8, background: `repeating-linear-gradient(90deg, ${C.jaune} 0 14px, ${C.creme} 14px 28px)` }} />
        <div style={{ padding: 20 }}>
          <div className="text-center mb-3"><div className="logo" style={{ color: C.rose, fontSize: 34, lineHeight: 1 }}>Crémà</div><div style={{ color: C.soft, fontSize: 11, marginTop: 2 }}>Glaces artisanales bio · Albi</div><div style={{ color: C.soft, fontSize: 11 }}>{t.toLocaleDateString("fr-FR")} · {t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{ticket.sellerName ? " · " + ticket.sellerName : ""}</div></div>
          <div style={{ borderTop: `2px dashed ${C.line}`, borderBottom: `2px dashed ${C.line}`, padding: "10px 0" }} className="space-y-2">
            {ticket.items.map((l, i) => (<div key={i} className="flex items-start justify-between gap-2"><div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{l.label}{l.contenant ? " · " + l.contenant : ""}</div>{l.flavors && l.flavors.length > 0 && <div style={{ color: C.soft, fontSize: 11 }}>{l.flavors.join(", ")}</div>}{(l.nappage || l.topping) && <div style={{ color: C.soft, fontSize: 11 }}>{[l.nappage, l.topping].filter(Boolean).join(" · ")}</div>}</div><span style={{ fontWeight: 700, fontSize: 13 }}>{eur(l.price)}</span></div>))}
          </div>
          {ticket.remise > 0 && <div className="flex items-center justify-between mt-2" style={{ color: C.vert, fontWeight: 700, fontSize: 13 }}><span>Remise</span><span>−{eur(ticket.remise)}</span></div>}
          <div className="flex items-center justify-between mt-2"><span style={{ fontWeight: 800, fontSize: 16 }}>Total</span><span className="logo" style={{ color: C.rose, fontSize: 26 }}>{eur(ticket.total)}</span></div>
          {ticket.method && <div style={{ color: C.soft, fontSize: 12, textAlign: "right", marginTop: 2 }}>{ticket.method}</div>}
          <div className="text-center" style={{ color: C.soft, fontSize: 11, marginTop: 12 }}>Merci & à bientôt 🍦 · @crema.albi</div>
          <button onClick={onClose} className="tap w-full rounded-2xl mt-4" style={{ background: C.rose, color: "#fff", fontWeight: 800, fontSize: 15, padding: "12px 0" }}>Fermer</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ===== Wizard ===== */
function Wizard({ modal, setModal, onComplete, parfums, toppings, fcolor }) {
  const step = modal.steps[modal.idx];
  const isLast = modal.idx === modal.steps.length - 1;
  const flavorList = modal.flavorSet === "ital" ? ITAL_FLAVORS : parfums;
  const back = () => modal.idx === 0 ? setModal(null) : setModal((m) => ({ ...m, idx: m.idx - 1 }));
  const advance = (patch) => { const m2 = { ...modal, ...patch }; if (isLast) onComplete(m2); else setModal({ ...m2, idx: modal.idx + 1 }); };
  const pickFlavor = (name) => { const nf = [...modal.flavors, name]; if (nf.length < modal.item.scoops) setModal((m) => ({ ...m, flavors: nf })); else advance({ flavors: nf }); };
  return (
    <Overlay onClose={() => setModal(null)}>
      <div className="fade" style={panel}>
        <div className="flex items-center justify-between mb-2"><button onClick={back} className="tap flex items-center gap-1" style={{ color: C.soft, fontSize: 13, fontWeight: 600 }}><ArrowLeft size={15} /> {modal.idx === 0 ? "Annuler" : "Retour"}</button><span style={{ fontWeight: 800 }}>{modal.item.label} · {eur(modal.item.base)}</span></div>
        <div className="flex items-center gap-1.5 mb-3">{modal.steps.map((s, i) => <div key={i} style={{ height: 4, flex: 1, borderRadius: 9, background: i <= modal.idx ? C.rose : C.line }} />)}</div>
        {step === "flavors" && (<>
          <Step label={`Goût · ${modal.flavors.length}/${modal.item.scoops}`} />
          <div className="grid grid-cols-2 gap-2" style={{ maxHeight: 280, overflowY: "auto", paddingRight: 2 }}>{flavorList.map((f) => <button key={f.n} onClick={() => pickFlavor(f.n)} className="tap flex items-center gap-2 px-3 py-2 rounded-xl text-left" style={{ background: C.creme, fontWeight: 600, fontSize: 13 }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: f.c, border: "1px solid rgba(0,0,0,.12)" }} /><span style={{ minWidth: 0 }}>{f.n}{f.s ? <span style={{ color: C.soft, fontSize: 10 }}> · sorbet</span> : ""}</span></button>)}</div>
          {modal.flavors.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{modal.flavors.map((fn, i) => <button key={i} onClick={() => setModal((m) => ({ ...m, flavors: m.flavors.filter((_, j) => j !== i) }))} className="tap flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: C.rose, color: "#fff", fontSize: 12, fontWeight: 600 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: fcolor(fn) }} />{fn} ✕</button>)}</div>}
        </>)}
        {step === "contenant" && (<>
          {modal.item.fixed && <div className="mb-3 p-2 rounded-xl flex flex-wrap items-center gap-2" style={{ background: C.creme }}><span style={{ fontSize: 12, color: C.soft, fontWeight: 600 }}>Recette :</span>{modal.flavors.map((fn, i) => <span key={i} className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: fcolor(fn) }} />{fn}</span>)}</div>}
          <Step label="Pot ou cornet ?" />
          <div className="grid grid-cols-2 gap-3">{[{ k: "Cornet", emo: "🍦" }, { k: "Pot", emo: "🥤" }].map((o) => <button key={o.k} onClick={() => advance({ contenant: o.k })} className="tap rounded-2xl flex flex-col items-center justify-center" style={{ background: C.creme, padding: "22px 0", fontWeight: 800, fontSize: 16 }}><span style={{ fontSize: 36, lineHeight: 1, marginBottom: 6 }}>{o.emo}</span>{o.k}</button>)}</div>
        </>)}
        {step === "nappage" && (<><Step label="Nappage" /><div className="grid grid-cols-2 gap-2">{NAPPAGES.map((n) => <Choice key={n.name} onClick={() => advance({ nappage: n })} name={n.name} price={n.price} />)}</div></>)}
        {step === "topping" && (<><Step label="Topping" /><div className="grid grid-cols-2 gap-2" style={{ maxHeight: 280, overflowY: "auto" }}>{toppings.map((t) => <Choice key={t.name} onClick={() => advance({ topping: t })} name={t.name} price={t.price} />)}</div></>)}
        <p style={{ color: C.soft, fontSize: 11, marginTop: 12, textAlign: "center" }}>{isLast ? "Touchez un choix pour ajouter au panier" : "Touchez un choix pour continuer"}</p>
      </div>
    </Overlay>
  );
}

/* ===== Payment ===== */
function Payment({ subtotal, onClose, onPay }) {
  const [mode, setMode] = useState("choice");
  const [remise, setRemise] = useState(0);
  const [remiseInput, setRemiseInput] = useState("");
  const [recu, setRecu] = useState("");
  const [sumup, setSumup] = useState("idle");
  const total = Math.max(0, subtotal - remise);
  const rendu = recu ? parseFloat(recu.replace(",", ".")) - total : 0;
  const key = (k) => { if (k === "del") return setRecu((r) => r.slice(0, -1)); if (k === ".") return setRecu((r) => (r.includes(".") ? r : (r || "0") + ".")); setRecu((r) => (r + k).replace(/^0(\d)/, "$1")); };
  const runSumup = () => { setMode("sumup"); setSumup("sending"); setTimeout(() => setSumup("ok"), 1300); setTimeout(() => onPay("Carte SumUp", remise), 2300); };
  const applyRemise = () => { const v = parseFloat((remiseInput || "0").replace(",", ".")) || 0; setRemise(Math.min(subtotal, Math.max(0, v))); setMode("choice"); };
  return (
    <Overlay onClose={() => { if (sumup === "idle") onClose(); }}>
      <div className="fade" style={panel}>
        <div className="text-center mb-1" style={{ color: C.soft, fontWeight: 600, fontSize: 13 }}>Total à encaisser</div>
        {remise > 0 && <div className="text-center" style={{ color: C.soft, fontSize: 13 }}><span style={{ textDecoration: "line-through" }}>{eur(subtotal)}</span> <span style={{ color: C.vert, fontWeight: 700 }}>− {eur(remise)}</span></div>}
        <div className="text-center mb-4 logo" style={{ color: C.rose, fontSize: 46, lineHeight: 1 }}>{eur(total)}</div>
        {mode === "choice" && (<div className="grid gap-2"><PayBtn icon={Banknote} label="Espèces" color={C.vert} onClick={() => setMode("cash")} /><PayBtn icon={Wallet} label="Carte · SumUp" color={C.noir} onClick={runSumup} /><PayBtn icon={CreditCard} label="Autre / manuel" color={C.brun} onClick={() => onPay("Manuel", remise)} /><button onClick={() => { setRemiseInput(remise ? String(remise) : ""); setMode("remise"); }} className="tap flex items-center justify-center gap-2 py-2 mt-1 rounded-xl" style={{ color: C.rose, fontWeight: 700, fontSize: 14, border: `2px dashed ${C.roseL}` }}><Tag size={15} /> {remise > 0 ? "Modifier la remise" : "Ajouter une remise"}</button><button onClick={onClose} className="tap py-2" style={{ color: C.soft, fontWeight: 600, fontSize: 13 }}>Retour au panier</button></div>)}
        {mode === "remise" && (<><Step label="Remise en €" /><div className="flex items-center gap-2 mb-3"><input autoFocus type="number" inputMode="decimal" step="0.5" value={remiseInput} onChange={(e) => setRemiseInput(e.target.value)} placeholder="0,00" style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: 14, border: `2px solid ${C.line}`, fontWeight: 800, fontSize: 24 }} /><span style={{ fontWeight: 800, fontSize: 20, color: C.soft }}>€</span></div><div className="flex gap-2 mb-3">{[1, 2, 5].map((v) => <button key={v} onClick={() => setRemiseInput(String(v))} className="tap flex-1 py-2 rounded-xl" style={{ background: C.creme, fontWeight: 700, fontSize: 14 }}>−{v}€</button>)}</div><button onClick={applyRemise} className="tap w-full rounded-2xl" style={{ background: C.rose, color: "#fff", fontWeight: 800, fontSize: 16, padding: "13px 0" }}>Appliquer</button><button onClick={() => { setRemise(0); setRemiseInput(""); setMode("choice"); }} className="tap w-full py-2 mt-1" style={{ color: C.soft, fontWeight: 600, fontSize: 13 }}>Enlever la remise</button></>)}
        {mode === "cash" && (<>
          <div className="flex items-center justify-between px-1 mb-2"><span style={{ fontWeight: 600, color: C.soft, fontSize: 13 }}>Reçu</span><span style={{ fontWeight: 800, fontSize: 20 }}>{recu ? eur(parseFloat(recu.replace(",", "."))) : "—"}</span></div>
          <div className="rounded-2xl mb-3 text-center py-3" style={{ background: rendu >= 0 && recu ? C.vert : C.creme, color: rendu >= 0 && recu ? "#fff" : C.soft }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>À rendre</div><div style={{ fontSize: 28, fontWeight: 800 }}>{recu ? eur(Math.max(0, rendu)) : "—"}</div></div>
          <div className="flex gap-2 mb-2">{[total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10].filter((v, i, a) => a.indexOf(v) === i).map((v) => <button key={v} onClick={() => setRecu(String(v))} className="tap flex-1 py-2 rounded-xl" style={{ background: C.creme, fontWeight: 700, fontSize: 13 }}>{eur(v)}</button>)}</div>
          <div className="grid grid-cols-3 gap-2">{["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => <button key={k} onClick={() => key(k)} className="tap rounded-xl flex items-center justify-center" style={{ background: "#fff", border: `2px solid ${C.line}`, padding: "12px 0", fontWeight: 800, fontSize: 18 }}>{k === "del" ? <Delete size={18} color={C.rose} /> : k}</button>)}</div>
          <button disabled={rendu < 0} onClick={() => onPay("Espèces", remise)} className="tap w-full rounded-2xl mt-3" style={{ background: rendu >= 0 ? C.vert : "#e7ddca", color: "#fff", fontWeight: 800, fontSize: 16, padding: "13px 0" }}>Valider l'encaissement</button>
          <button onClick={() => { setMode("choice"); setRecu(""); }} className="tap w-full py-2 mt-1" style={{ color: C.soft, fontWeight: 600, fontSize: 13 }}>Changer de paiement</button>
        </>)}
        {mode === "sumup" && (<div className="text-center py-6">{sumup === "sending" ? (<><div className="mx-auto mb-4" style={{ width: 46, height: 46, borderRadius: "50%", border: `4px solid ${C.roseL}`, borderTopColor: C.rose, animation: "spin 1s linear infinite" }} /><div style={{ fontWeight: 700 }}>Envoi au terminal SumUp…</div><div style={{ color: C.soft, fontSize: 12, marginTop: 4 }}>Le client présente sa carte</div></>) : (<><div className="pop mx-auto mb-3 flex items-center justify-center" style={{ width: 60, height: 60, borderRadius: "50%", background: C.vert }}><Check size={34} color="#fff" /></div><div style={{ fontWeight: 800, color: C.vert }}>Paiement accepté</div></>)}</div>)}
      </div>
    </Overlay>
  );
}

/* ===== Réglages ===== */
function Reglages({ menu, config, setConfig }) {
  const [openColor, setOpenColor] = useState(null);
  const setPrice = (k, v) => setConfig((c) => ({ ...c, prices: { ...c.prices, [k]: v } }));
  const setCost = (k, v) => setConfig((c) => ({ ...c, costs: { ...c.costs, [k]: v } }));
  const editParfum = (i, patch) => setConfig((c) => { const p = [...c.parfums]; p[i] = { ...p[i], ...patch }; return { ...c, parfums: p }; });
  const addParfum = () => setConfig((c) => ({ ...c, parfums: [...c.parfums, { n: "Nouveau parfum", c: PALETTE[c.parfums.length % PALETTE.length] }] }));
  const delParfum = (i) => setConfig((c) => ({ ...c, parfums: c.parfums.filter((_, j) => j !== i) }));
  const editTop = (i, patch) => setConfig((c) => { const t = [...c.toppings]; t[i] = { ...t[i], ...patch }; return { ...c, toppings: t }; });
  const addTop = () => setConfig((c) => ({ ...c, toppings: [...c.toppings, { name: "Nouveau topping", price: 0.5 }] }));
  const delTop = (i) => setConfig((c) => ({ ...c, toppings: c.toppings.filter((_, j) => j !== i) }));
  const reset = () => setConfig((c) => ({ prices: {}, parfums: DEF_PARFUMS, toppings: DEF_TOPPINGS, goal: 300, sellers: c.sellers, costs: DEF_COSTS }));
  const num = { width: 78, textAlign: "right", padding: "7px 9px", borderRadius: 10, border: `2px solid ${C.line}`, fontWeight: 700, fontSize: 14 };
  const txt = { flex: 1, minWidth: 0, padding: "7px 9px", borderRadius: 10, border: `2px solid ${C.line}`, fontWeight: 600, fontSize: 14 };
  const costLabels = { boule: "Boule de glace", cornet: "Cornet", pot: "Pot", gobelet: "Gobelet", cuillere: "Cuillère", serviette: "Serviette", paille: "Paille", coquedubai: "Coque Dubaï", dubaiBase: "Base Café Dubaï", drinkBase: "Base boisson", gaufreBase: "Base gaufre/crêpe" };
  return (
    <div className="p-4" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-1"><div><div style={{ fontWeight: 900, fontSize: 20 }}>Réglages</div><div style={{ color: C.soft, fontSize: 12 }}>Tes modifications sont enregistrées automatiquement.</div></div><button onClick={reset} className="tap flex items-center gap-1" style={{ color: C.soft, fontSize: 12, fontWeight: 600 }}><RotateCcw size={14} /> Réinitialiser carte</button></div>
      <Sec title="Objectif du jour" desc="Le CA cible affiché dans la barre de progression."><div className="flex items-center gap-3 flex-wrap"><Target size={20} color={C.rose} /><input type="number" step="10" inputMode="decimal" value={config.goal} onChange={(e) => setConfig((c) => ({ ...c, goal: parseFloat(e.target.value) || 0 }))} style={{ ...num, width: 120, fontSize: 18 }} /><span style={{ color: C.soft, fontWeight: 700 }}>€ / jour</span><div className="flex gap-2 ml-auto">{[200, 300, 500].map((v) => <button key={v} onClick={() => setConfig((c) => ({ ...c, goal: v }))} className="tap px-3 py-2 rounded-xl" style={{ background: config.goal === v ? C.rose : C.creme, color: config.goal === v ? "#fff" : C.ink, fontWeight: 700, fontSize: 13 }}>{v}€</button>)}</div></div></Sec>
      <Sec title="Coûts matière" desc="Pour la marge en direct. Ajuste avec tes vrais chiffres."><div className="grid sm:grid-cols-2 gap-2">{Object.keys(costLabels).map((k) => (<div key={k} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: C.creme }}><span style={{ fontSize: 13, fontWeight: 600 }}>{costLabels[k]}</span><input type="number" step="0.01" inputMode="decimal" value={config.costs[k] ?? 0} onChange={(e) => setCost(k, parseFloat(e.target.value) || 0)} style={{ ...num, width: 84 }} /></div>))}</div></Sec>
      <Sec title="Parfums" desc="Ajoute, renomme, change la couleur ou marque comme sorbet."><div className="space-y-2">{config.parfums.map((p, i) => (<div key={i} className="rounded-xl" style={{ background: C.creme, padding: 8 }}><div className="flex items-center gap-2"><button onClick={() => setOpenColor(openColor === i ? null : i)} className="tap shrink-0" style={{ width: 26, height: 26, borderRadius: "50%", background: p.c, border: "2px solid rgba(0,0,0,.12)" }} /><input value={p.n} onChange={(e) => editParfum(i, { n: e.target.value })} style={txt} /><button onClick={() => editParfum(i, { s: p.s ? 0 : 1 })} className="tap shrink-0 px-2 py-1 rounded-lg" style={{ background: p.s ? C.vert : "#fff", color: p.s ? "#fff" : C.soft, border: `2px solid ${p.s ? C.vert : C.line}`, fontSize: 11, fontWeight: 800 }}>SORBET</button><button onClick={() => delParfum(i)} className="tap shrink-0"><Trash2 size={17} color={C.rose} /></button></div>{openColor === i && <div className="flex flex-wrap gap-2 mt-2">{PALETTE.map((col) => <button key={col} onClick={() => { editParfum(i, { c: col }); setOpenColor(null); }} className="tap" style={{ width: 24, height: 24, borderRadius: "50%", background: col, border: p.c === col ? `3px solid ${C.noir}` : "2px solid rgba(0,0,0,.1)" }} />)}</div>}</div>))}</div><button onClick={addParfum} className="tap flex items-center justify-center gap-2 w-full mt-3 py-3 rounded-xl" style={{ background: "#fff", border: `2px dashed ${C.roseL}`, color: C.rose, fontWeight: 800, fontSize: 14 }}><Plus size={16} /> Ajouter un parfum</button></Sec>
      <Sec title="Prix des articles" desc="Touche un prix pour le modifier (en €).">{CAT_KEYS.map((k) => (<div key={k} className="mb-3"><div className="flex items-center gap-2 mb-1"><span style={{ width: 9, height: 9, borderRadius: "50%", background: menu[k].color }} /><span style={{ fontWeight: 800, fontSize: 13 }}>{menu[k].name}</span></div><div className="grid sm:grid-cols-2 gap-2">{menu[k].items.map((it) => (<div key={it.label} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: C.creme }}><span style={{ fontSize: 13, fontWeight: 600, minWidth: 0 }}>{it.label}</span><input type="number" step="0.5" inputMode="decimal" value={it.base} onChange={(e) => setPrice(k + "|" + it.label, parseFloat(e.target.value) || 0)} style={num} /></div>))}</div></div>))}</Sec>
      <Sec title="Suppléments toppings" desc="Le prix s'ajoute à la glace. Mets 0 pour offrir."><div className="space-y-2">{config.toppings.map((t, i) => (<div key={i} className="flex items-center gap-2 rounded-xl px-2 py-2" style={{ background: C.creme }}><input value={t.name} onChange={(e) => editTop(i, { name: e.target.value })} style={txt} /><input type="number" step="0.5" inputMode="decimal" value={t.price} onChange={(e) => editTop(i, { price: parseFloat(e.target.value) || 0 })} style={num} /><button onClick={() => delTop(i)} className="tap shrink-0"><Trash2 size={17} color={C.rose} /></button></div>))}</div><button onClick={addTop} className="tap flex items-center justify-center gap-2 w-full mt-3 py-3 rounded-xl" style={{ background: "#fff", border: `2px dashed ${C.roseL}`, color: C.rose, fontWeight: 800, fontSize: 14 }}><Plus size={16} /> Ajouter un topping</button></Sec>
      <p style={{ color: C.soft, fontSize: 12, marginTop: 14 }}>Profils → écran d'accueil. Stock & commande → onglet Stock. Clients fidélité → onglet Fidélité.</p>
      <div style={{ height: 24 }} />
    </div>
  );
}

/* ===== Stats ===== */
function Stats({ sales, loaded, sellers, clients, onReset, onUndo, fcolor, goal, onShowTicket }) {
  const [mode, setMode] = useState("day");
  const [day, setDay] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [confirm, setConfirm] = useState(false);
  const dayStart = day.getTime(), dayEnd = dayStart + 86400000;
  const isToday = new Date().toDateString() === day.toDateString();
  const shiftDay = (n) => setDay((d) => { const x = new Date(d); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; });
  const data = useMemo(() => mode === "all" ? sales : sales.filter((s) => s.ts >= dayStart && s.ts < dayEnd), [sales, mode, dayStart]);
  const ca = data.reduce((s, x) => s + x.total, 0), tickets = data.length, scoops = data.reduce((s, x) => s + (x.scoops || 0), 0), avg = tickets ? ca / tickets : 0;
  const cost = data.reduce((s, x) => s + (x.cost || 0), 0); const marge = ca - cost; const margePct = ca > 0 ? Math.round((marge / ca) * 100) : 0;
  const pct = goal > 0 ? Math.min(100, Math.round((ca / goal) * 100)) : 0;
  const byCat = CAT_KEYS.map((k) => ({ name: DEF_MENU[k].short, value: data.reduce((s, x) => s + x.items.filter((i) => i.cat === k).reduce((a, i) => a + i.price, 0), 0), color: DEF_MENU[k].color }));
  const topFlavors = useMemo(() => { const m = {}; data.forEach((s) => s.items.forEach((i) => (i.flavors || []).forEach((f) => m[f] = (m[f] || 0) + 1))); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6); }, [data]);
  const bySeller = useMemo(() => { const m = {}; data.forEach((s) => { const k = s.sellerName || "—"; m[k] = (m[k] || 0) + s.total; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [data]);
  const byHour = useMemo(() => { const h = Array.from({ length: 13 }, (_, i) => ({ name: (i + 10) + "h", value: 0 })); data.forEach((s) => { const hr = new Date(s.ts).getHours(); if (hr >= 10 && hr <= 22) h[hr - 10].value += s.total; }); return h; }, [data]);
  const fidShare = tickets ? Math.round((data.filter((s) => s.clientId).length / tickets) * 100) : 0;
  const sellerColor = (name) => (sellers.find((s) => s.name === name) || { color: C.soft }).color;
  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2"><button onClick={() => { shiftDay(-1); setMode("day"); }} className="tap p-2 rounded-xl" style={{ background: "#fff", border: `2px solid ${C.line}` }}><ChevronLeft size={16} /></button><label className="rounded-xl flex items-center" style={{ background: mode === "day" ? C.rose : "#fff", border: `2px solid ${mode === "day" ? C.rose : C.line}`, padding: "6px 10px" }}><input type="date" value={localISO(day)} max={localISO(new Date())} onChange={(e) => { const [y, m, d] = e.target.value.split("-").map(Number); const nd = new Date(y, m - 1, d); nd.setHours(0, 0, 0, 0); setDay(nd); setMode("day"); }} style={{ background: "transparent", border: "none", color: mode === "day" ? "#fff" : C.ink, fontWeight: 700, fontSize: 13, colorScheme: mode === "day" ? "dark" : "light" }} /></label><button onClick={() => { shiftDay(1); setMode("day"); }} disabled={isToday} className="tap p-2 rounded-xl" style={{ background: "#fff", border: `2px solid ${C.line}`, opacity: isToday ? .4 : 1 }}><ChevronRight size={16} /></button><button onClick={() => setMode("all")} className="tap px-4 py-2 rounded-full" style={{ background: mode === "all" ? C.noir : "#fff", color: mode === "all" ? "#fff" : C.ink, fontWeight: 700, fontSize: 13, border: `2px solid ${mode === "all" ? C.noir : C.line}` }}>Tout</button></div>
        <div className="flex items-center gap-3"><button onClick={onUndo} className="tap flex items-center gap-1" style={{ color: C.soft, fontSize: 12, fontWeight: 600 }}><Undo2 size={14} /> Annuler dernière vente</button><button onClick={() => setConfirm(true)} className="tap flex items-center gap-1" style={{ color: C.soft, fontSize: 12, fontWeight: 600 }}><RotateCcw size={14} /> Réinitialiser</button></div>
      </div>
      {mode === "day" && <div style={{ color: C.soft, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: "capitalize" }}>{day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}{isToday ? " · aujourd'hui" : ""}</div>}
      {mode === "day" && (<div className="rounded-2xl p-3 mb-4" style={{ background: "#fff", border: `2px solid ${C.line}` }}><div className="flex items-center justify-between mb-1.5"><span className="flex items-center gap-1.5" style={{ fontWeight: 700, fontSize: 13 }}><Target size={15} color={C.rose} /> Objectif</span><span style={{ fontSize: 13, fontWeight: 700 }}><b style={{ color: pct >= 100 ? C.vert : C.rose }}>{eur(ca)}</b> <span style={{ color: C.soft }}>/ {eur(goal)} · {pct}%</span></span></div><div style={{ height: 10, borderRadius: 9, background: C.creme, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", borderRadius: 9, background: pct >= 100 ? C.vert : `linear-gradient(90deg, ${C.jaune}, ${C.rose})` }} /></div></div>)}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3"><Kpi label="Chiffre d'affaires" value={eur(ca)} color={C.rose} big /><Kpi label="Ventes" value={String(tickets)} color={C.vert} /><Kpi label="Boules vendues" value={String(scoops)} color={C.brun} /><Kpi label="Panier moyen" value={eur(avg)} color={C.noir} /></div>
      <div className="grid grid-cols-3 gap-3 mb-4"><div className="p-4 rounded-2xl" style={{ background: C.vert, color: "#fff" }}><div className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .9 }}><TrendingUp size={13} /> Marge estimée</div><div style={{ fontWeight: 800, fontSize: 24, marginTop: 4 }}>{eur(marge)}</div><div style={{ fontSize: 12, opacity: .9, fontWeight: 600 }}>{margePct}% du CA</div></div><Kpi label="Coût matière" value={eur(cost)} color={C.brun} /><Kpi label="Ventes fidélité" value={fidShare + "%"} color={C.rose} /></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="CA par catégorie"><div style={{ height: 200 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={byCat} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 10, fill: C.soft }} axisLine={false} tickLine={false} interval={0} /><YAxis tick={{ fontSize: 11, fill: C.soft }} axisLine={false} tickLine={false} /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{byCat.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
        <Card title="Top parfums">{topFlavors.length === 0 ? <Empty /> : <div className="space-y-2">{topFlavors.map(([name, n]) => <div key={name} className="flex items-center justify-between"><div className="flex items-center gap-2"><span style={{ width: 16, height: 16, borderRadius: "50%", background: fcolor(name), border: "1px solid rgba(0,0,0,.1)" }} /><span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span></div><span style={{ color: C.soft, fontWeight: 700, fontSize: 13 }}>×{n}</span></div>)}</div>}</Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card title="Top vendeurs">{bySeller.length === 0 ? <Empty /> : <div className="space-y-2">{bySeller.map(([name, v]) => <div key={name} className="flex items-center justify-between"><div className="flex items-center gap-2"><span style={{ width: 22, height: 22, borderRadius: "50%", background: sellerColor(name), color: "#fff", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{name[0]}</span><span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span></div><span style={{ color: C.ink, fontWeight: 800, fontSize: 14 }}>{eur(v)}</span></div>)}</div>}</Card>
        <Card title="Heures de pointe (CA)"><div style={{ height: 160 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={byHour} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 10, fill: C.soft }} axisLine={false} tickLine={false} interval={1} /><YAxis tick={{ fontSize: 11, fill: C.soft }} axisLine={false} tickLine={false} /><Bar dataKey="value" radius={[6, 6, 0, 0]} fill={C.jaune} /></BarChart></ResponsiveContainer></div></Card>
      </div>
      <Card title="Dernières ventes" className="mt-4">{data.length === 0 ? <Empty /> : <div className="space-y-1" style={{ maxHeight: 240, overflowY: "auto" }}>{data.slice(0, 30).map((s) => <button key={s.id} onClick={() => onShowTicket(s)} className="tap w-full flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #f0e6d2" }}><div style={{ fontSize: 13, textAlign: "left" }}><span style={{ fontWeight: 700 }}>{eur(s.total)}</span><span style={{ color: C.soft }}> · {s.items.length} art. · {s.method}{s.sellerName ? " · " + s.sellerName : ""}{s.clientId ? " · ❤️" : ""}</span></div><div className="flex items-center gap-2"><span style={{ color: C.soft, fontSize: 12 }}>{new Date(s.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span><Receipt size={14} color={C.brun} /></div></button>)}</div>}</Card>
      {!loaded && <p style={{ color: C.soft, fontSize: 12, marginTop: 10 }}>Chargement…</p>}
      {confirm && <Overlay onClose={() => setConfirm(false)}><div className="fade" style={panel}><div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Réinitialiser les ventes ?</div><p style={{ color: C.soft, fontSize: 13, marginBottom: 16 }}>Toutes les ventes seront effacées (les clients fidélité sont conservés). Action définitive.</p><div className="grid grid-cols-2 gap-2"><button onClick={() => setConfirm(false)} className="tap py-3 rounded-2xl" style={{ background: C.creme, fontWeight: 700 }}>Annuler</button><button onClick={() => { onReset(); setConfirm(false); }} className="tap py-3 rounded-2xl" style={{ background: C.rose, color: "#fff", fontWeight: 800 }}>Effacer</button></div></div></Overlay>}
    </div>
  );
}

/* ===== Bits ===== */
const panel = { background: "#fff", borderRadius: 24, padding: 20, width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,.28)", maxHeight: "90vh", overflowY: "auto" };
function Tab({ on, onClick, icon: Icon, label, badge }) { return <button onClick={onClick} className="tap flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: on ? C.rose : C.creme, color: on ? "#fff" : C.ink, fontWeight: 700, fontSize: 13, position: "relative" }}><Icon size={16} /> <span className="hidden sm:inline">{label}</span>{badge > 0 && <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 9, background: C.rouge, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span>}</button>; }
function Overlay({ children, onClose }) { return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(24,24,24,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}><div onClick={(e) => e.stopPropagation()} style={{ width: "100%", display: "flex", justifyContent: "center" }}>{children}</div></div>; }
function Step({ label }) { return <div style={{ fontWeight: 800, fontSize: 12, color: C.rose, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>; }
function Choice({ name, price, active, onClick }) { return <button onClick={onClick} className="tap text-left px-3 py-2 rounded-xl" style={{ background: active ? C.rose : C.creme, color: active ? "#fff" : C.ink, fontWeight: 600, fontSize: 13, border: `2px solid ${active ? C.rose : "transparent"}` }}>{name}{price ? <span style={{ opacity: .8 }}> +{eur(price)}</span> : ""}</button>; }
function PayBtn({ icon: Icon, label, color, onClick }) { return <button onClick={onClick} className="tap flex items-center justify-center gap-2 rounded-2xl" style={{ background: color, color: "#fff", fontWeight: 800, fontSize: 16, padding: "15px 0" }}><Icon size={20} /> {label}</button>; }
function Kpi({ label, value, color, big }) { return <div className="p-4 rounded-2xl" style={{ background: "#fff", border: `2px solid ${C.line}` }}><div style={{ color: C.soft, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div><div style={{ color, fontWeight: 800, fontSize: big ? 26 : 22, marginTop: 4 }}>{value}</div></div>; }
function Card({ title, children, className = "" }) { return <div className={"p-4 rounded-2xl " + className} style={{ background: "#fff", border: `2px solid ${C.line}` }}><div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>{title}</div>{children}</div>; }
function Sec({ title, desc, children }) { return <div className="mt-4 p-4 rounded-2xl" style={{ background: "#fff", border: `2px solid ${C.line}` }}><div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div><div style={{ color: C.soft, fontSize: 12, marginBottom: 12 }}>{desc}</div>{children}</div>; }
function Empty() { return <p style={{ color: C.soft, fontSize: 13 }}>Aucune donnée pour l'instant.</p>; }
