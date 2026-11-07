import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Archive, BadgeIndianRupee, BriefcaseBusiness, Check, ClipboardList,
  Download, FilePlus2, FileText, HardDrive, History, Info, Layers3, Menu, Package,
  Plus, Printer, Save, Settings2, ShieldCheck, ShoppingBag, Trash2, Upload,
  UserRound, X, Zap
} from "lucide-react";
import type { AppData, BillItem, Business, Customer, Invoice, StockMovement } from "./types";

const STORAGE_KEY = "volt-bill-data-v1";
const today = () => new Date().toISOString().slice(0, 10);
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
const uid = () => crypto.randomUUID();

const defaultBusiness: Business = {
  name: "Your Electrical Store",
  owner: "Proprietor",
  phone: "+91 00000 00000",
  email: "",
  address: "Shop address, City, Gujarat",
  gstin: "",
  state: "Gujarat", 
  stateCode: "24",
  upi: "",
  footer: "Thank you for your business!"
};

const starterCatalog: BillItem[] = [
  { id: uid(), kind: "Product", name: "LED Bulb 9W", hsn: "8539", quantity: 1, unit: "Pcs", rate: 90, taxRate: 12 },
  { id: uid(), kind: "Product", name: "Modular Switch 6A", hsn: "8536", quantity: 1, unit: "Pcs", rate: 65, taxRate: 18 },
  { id: uid(), kind: "Product", name: "Copper Wire 1.5 sq mm", hsn: "8544", quantity: 1, unit: "Mtr", rate: 22, taxRate: 18 },
  { id: uid(), kind: "Fitting / Labour", name: "Fan installation", hsn: "", quantity: 1, unit: "Job", rate: 250, taxRate: 18 }
];

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      if (parsed.business && Array.isArray(parsed.catalog) && Array.isArray(parsed.invoices)) {
        return {
          business: parsed.business, catalog: parsed.catalog.map(i => ({ ...i, purchaseRate: Number(i.purchaseRate ?? 0), stockTracked: i.stockTracked ?? i.kind === "Product", stockQty: Number(i.stockQty ?? 0), lowStockAt: Number(i.lowStockAt ?? 5) })),
          invoices: parsed.invoices.map(inv => ({ ...inv, items: (inv.items || []).map(item => ({ ...item })) })),
          nextNumber: Number(parsed.nextNumber || 1), stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : []
        };
      }
    }
  } catch { /* recover with defaults */ }
  return { business: defaultBusiness, catalog: starterCatalog.map(i => ({ ...i, purchaseRate: 0, stockTracked: i.kind === "Product", stockQty: 0, lowStockAt: 5 })), invoices: [], nextNumber: 1, stockMovements: [] };
}

function newInvoice(number: number): Invoice {
  return {
    id: uid(),
    number: `VB-${String(number).padStart(4, "0")}`,
    date: today(),
    customer: { name: "", phone: "", address: "", gstin: "" },
    items: [],
    discountType: "percent",
    discountValue: 0,
    taxMode: "intra",
    notes: "",
    paymentMode: "Cash",
    amountReceived: 0,
    status: "Draft",
    createdAt: new Date().toISOString()
  };
}

function calc(invoice: Invoice) {
  const subtotal = invoice.items.reduce((s, item) => s + Math.max(0, item.quantity) * Math.max(0, item.rate), 0);
  const discount = invoice.discountType === "percent"
    ? subtotal * Math.min(100, Math.max(0, invoice.discountValue)) / 100
    : Math.min(subtotal, Math.max(0, invoice.discountValue));
  const taxable = Math.max(0, subtotal - discount);
  const tax = invoice.items.reduce((sum, item) => {
    const base = Math.max(0, item.quantity) * Math.max(0, item.rate);
    const itemDiscount = subtotal > 0 ? discount * (base / subtotal) : 0;
    return sum + Math.max(0, base - itemDiscount) * Math.max(0, item.taxRate) / 100;
  }, 0);
  const total = taxable + tax;
  return { subtotal, discount, taxable, tax, total, cgst: invoice.taxMode === "intra" ? tax / 2 : 0, sgst: invoice.taxMode === "intra" ? tax / 2 : 0, igst: invoice.taxMode === "inter" ? tax : 0 };
}

function Field({ label, value, onChange, placeholder, type = "text", className = "" }: {
  label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return <label className={`field-wrap ${className}`}><span className="field-label">{label}</span><input className="field" type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></label>;
}

function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [invoice, setInvoice] = useState<Invoice>(() => newInvoice(loadData().nextNumber));
  const [tab, setTab] = useState<"billing" | "history" | "catalog" | "inventory" | "settings">("billing");
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const totals = useMemo(() => calc(invoice), [invoice]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const patchInvoice = (patch: Partial<Invoice>) => setInvoice(prev => ({ ...prev, ...patch }));
  const patchCustomer = (patch: Partial<Customer>) => setInvoice(prev => ({ ...prev, customer: { ...prev.customer, ...patch } }));
  const patchBusiness = (patch: Partial<Business>) => setData(prev => ({ ...prev, business: { ...prev.business, ...patch } }));
  const patchItem = (id: string, patch: Partial<BillItem>) => patchInvoice({ items: invoice.items.map(i => i.id === id ? { ...i, ...patch } : i) });
  const addItem = (kind: BillItem["kind"] = "Product") => patchInvoice({
    items: [...invoice.items, { id: uid(), kind, name: "", hsn: "", quantity: 1, unit: kind === "Product" ? "Pcs" : "Job", rate: 0, taxRate: 18 }]
  });
  const addCatalogItem = (item: BillItem) => patchInvoice({ items: [...invoice.items, { ...item, id: uid(), catalogItemId: item.id, quantity: 1 }] });
  const invoiceStock = (inv?: Invoice) => {
    const quantities = new Map<string, number>();
    inv?.items.forEach(item => {
      if (item.catalogItemId) quantities.set(item.catalogItemId, (quantities.get(item.catalogItemId) || 0) + Math.max(0, item.quantity));
    });
    return quantities;
  };
  const saveInvoice = () => {
    if (!invoice.customer.name.trim()) { setToast("Please enter the customer name first."); return; }
    if (!invoice.items.length || invoice.items.some(i => !i.name.trim())) { setToast("Add at least one item and give every item a name."); return; }
    const saved = { ...invoice, items: invoice.items.map(line => {
      if (line.catalogItemId) return line;
      const match = data.catalog.find(product => product.kind === line.kind && product.name.trim().toLowerCase() === line.name.trim().toLowerCase());
      return match ? { ...line, catalogItemId: match.id } : line;
    }), status: "Saved" as const };
    const oldInvoice = data.invoices.find(i => i.id === saved.id && i.status === "Saved");
    const before = invoiceStock(oldInvoice);
    const after = invoiceStock(saved);
    const deltas = new Map<string, number>();
    new Set([...before.keys(), ...after.keys()]).forEach(id => {
      const item = data.catalog.find(c => c.id === id);
      if (item?.stockTracked) deltas.set(id, (after.get(id) || 0) - (before.get(id) || 0));
    });
    for (const [id, delta] of deltas) {
      const product = data.catalog.find(c => c.id === id);
      if (product && delta > (product.stockQty || 0)) { setToast(`Not enough stock for ${product.name}. Available: ${product.stockQty || 0}.`); return; }
    }
    setData(prev => {
      const now = new Date().toISOString();
      const movements: StockMovement[] = [...deltas.entries()].filter(([,delta]) => delta !== 0).map(([id,delta]) => {
        const product = prev.catalog.find(c => c.id === id)!;
        return { id: uid(), productId: id, productName: product.name, type: delta > 0 ? "sale" : "return", quantityChange: -delta, reference: saved.number, note: delta > 0 ? "Invoice saved" : "Invoice quantity reduced", createdAt: now };
      });
      return {
        ...prev,
        catalog: prev.catalog.map(product => deltas.has(product.id) ? { ...product, stockQty: Math.max(0, product.stockQty! - deltas.get(product.id)!) } : product),
        stockMovements: [...movements, ...(prev.stockMovements || [])],
        invoices: [saved, ...prev.invoices.filter(i => i.id !== saved.id)],
        nextNumber: Math.max(prev.nextNumber, Number(invoice.number.match(/(\d+)$/)?.[1] || 0) + 1)
      };
    });
    setInvoice(saved);
    setToast("Bill saved and stock updated.");
  };
  const startNew = () => {
    const next = Math.max(data.nextNumber, ...data.invoices.map(i => Number(i.number.match(/(\d+)$/)?.[1] || 0) + 1), 1);
    setInvoice(newInvoice(next));
    setTab("billing");
  };
  const openInvoice = (saved: Invoice) => { setInvoice(JSON.parse(JSON.stringify(saved)) as Invoice); setTab("billing"); };
  const deleteInvoice = (id: string) => setData(prev => {
    const invoiceToDelete = prev.invoices.find(i => i.id === id);
    if (!invoiceToDelete) return prev;
    const qty = invoiceStock(invoiceToDelete);
    const now = new Date().toISOString();
    const movements: StockMovement[] = [];
    const catalog = prev.catalog.map(product => {
      const amount = product.stockTracked ? (qty.get(product.id) || 0) : 0;
      if (!amount) return product;
      movements.push({ id: uid(), productId: product.id, productName: product.name, type: "return", quantityChange: amount, reference: invoiceToDelete.number, note: "Invoice deleted; stock returned", createdAt: now });
      return { ...product, stockQty: (product.stockQty || 0) + amount };
    });
    return { ...prev, catalog, stockMovements: [...movements, ...(prev.stockMovements || [])], invoices: prev.invoices.filter(i => i.id !== id) };
  });
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `volt-bill-backup-${today()}.json`; a.click();
    URL.revokeObjectURL(url); setToast("Backup downloaded.");
  };
  const importBackup = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppData>;
        if (!parsed.business || !Array.isArray(parsed.catalog) || !Array.isArray(parsed.invoices)) throw new Error("Invalid backup");
        const restored: AppData = { business: parsed.business, catalog: parsed.catalog.map(i => ({ ...i, purchaseRate: Number(i.purchaseRate ?? 0), stockTracked: i.stockTracked ?? i.kind === "Product", stockQty: Number(i.stockQty ?? 0), lowStockAt: Number(i.lowStockAt ?? 5) })), invoices: parsed.invoices, nextNumber: Number(parsed.nextNumber || 1), stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [] };
        setData(restored); setInvoice(newInvoice(restored.nextNumber)); setToast("Backup restored successfully.");
      } catch { setToast("That backup file is not valid."); }
    };
    reader.readAsText(file);
  };
  const saveCatalog = (item: BillItem) => {
    setData(prev => ({ ...prev, catalog: [...prev.catalog.filter(x => x.id !== item.id), item] }));
    setToast("Product saved to catalogue.");
  };
  const navItems = [
    { id: "billing", label: "New bill", icon: FilePlus2 },
    { id: "history", label: "Bill history", icon: History },
    { id: "catalog", label: "Product catalogue", icon: Package },
    { id: "inventory", label: "Inventory & stock", icon: Layers3 },
    { id: "settings", label: "Business settings", icon: Settings2 }
  ] as const;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Zap size={21} fill="currentColor" /></div><div><div className="brand-name">Chaudhary</div><div className="brand-caption">ELECTRICAL BILLING</div></div><button className="mobile-close" onClick={() => setMobileMenu(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">
        {navItems.map(n => <button key={n.id} className={`nav-link ${tab === n.id ? "active" : ""}`} onClick={() => { setTab(n.id); setMobileMenu(false); }}><n.icon size={18}/><span>{n.label}</span>{n.id === "history" && data.invoices.length > 0 && <span className="nav-count">{data.invoices.length}</span>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="local-card"><div className="local-icon"><ShieldCheck size={17}/></div><div><strong>Your data stays local</strong><span>Saved on this device only</span></div></div>
        <div className="sidebar-version">Chaudhary Billing · VERSION 1.0</div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileMenu(true)}><Menu size={20}/></button>
        <div className="breadcrumb">Workspace <span>/</span> <strong>{navItems.find(n => n.id === tab)?.label}</strong></div>
        <div className="topbar-right"><span className="local-status"><span className="status-dot"/> Local storage active</span><button className="icon-button" title="Export backup" onClick={exportBackup}><Download size={17}/></button></div>
      </header>

      {tab === "billing" && <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">BILLING WORKSPACE</div><h1>Create a bill</h1><p>Prepare a clean, professional invoice in a few steps.</p></div><div className="heading-actions"><button className="btn btn-secondary" onClick={startNew}><Plus size={16}/> New bill</button><button className="btn btn-primary" onClick={saveInvoice}><Save size={16}/> Save bill</button></div></div>
        <div className="billing-layout">
          <div className="editor-column">
            <section className="panel">
              <div className="section-heading"><div className="section-icon"><UserRound size={17}/></div><div><h2>Customer details</h2><p>Who is this bill for?</p></div></div>
              <div className="form-grid">
                <Field label="Customer name *" value={invoice.customer.name} onChange={v => patchCustomer({name:v})} placeholder="Enter customer name" />
                <Field label="Mobile number" value={invoice.customer.phone} onChange={v => patchCustomer({phone:v})} placeholder="+91 98765 43210" />
                <Field label="Customer address" value={invoice.customer.address} onChange={v => patchCustomer({address:v})} placeholder="Street, area, city" className="span-2" />
                <Field label="Customer GSTIN (optional)" value={invoice.customer.gstin} onChange={v => patchCustomer({gstin:v.toUpperCase()})} placeholder="15-character GSTIN" />
              </div>
            </section>

            <section className="panel">
              <div className="section-heading section-heading-between"><div className="section-title-group"><div className="section-icon"><ClipboardList size={17}/></div><div><h2>Items & fitting charges</h2><p>Add electrical products and labour separately.</p></div></div><span className="item-count">{invoice.items.length} items</span></div>
              {data.catalog.length > 0 && <div className="quick-add"><span className="quick-add-label">QUICK ADD FROM CATALOGUE</span><div className="quick-chips">{data.catalog.slice(0,5).map(item => <button key={item.id} className="quick-chip" onClick={() => addCatalogItem(item)}><Plus size={13}/>{item.name}</button>)}</div></div>}
              <div className="items-table-wrap">
                <table className="items-table">
                  <thead><tr><th>DESCRIPTION</th><th>QTY</th><th>UNIT</th><th>RATE (₹)</th><th>GST %</th><th>AMOUNT</th><th></th></tr></thead>
                  <tbody>
                    {invoice.items.map(item => <tr key={item.id}>
                      <td className="desc-cell"><div className="kind-tag">{item.kind === "Product" ? "PRODUCT" : "LABOUR"}</div><input value={item.name} placeholder="Item / work description" onChange={e => patchItem(item.id,{name:e.target.value})}/><input className="hsn-input" value={item.hsn} placeholder="HSN / SAC (optional)" onChange={e => patchItem(item.id,{hsn:e.target.value})}/></td>
                      <td><input className="small-input qty-input" type="number" min="0" value={item.quantity} onChange={e => patchItem(item.id,{quantity:Math.max(0,Number(e.target.value))})}/></td>
                      <td><select className="small-input unit-input" value={item.unit} onChange={e => patchItem(item.id,{unit:e.target.value})}>{["Pcs","Nos","Mtr","Ft","Set","Box","Job","Hr","Day"].map(u=><option key={u}>{u}</option>)}</select></td>
                      <td><input className="small-input rate-input" type="number" min="0" value={item.rate} onChange={e => patchItem(item.id,{rate:Math.max(0,Number(e.target.value))})}/></td>
                      <td><select className="small-input tax-input" value={item.taxRate} onChange={e => patchItem(item.id,{taxRate:Number(e.target.value)})}>{[0,5,12,18,28].map(t=><option key={t} value={t}>{t}%</option>)}</select></td>
                      <td className="amount-cell">{money(item.quantity * item.rate)}</td>
                      <td><button className="row-delete" title="Remove item" onClick={() => patchInvoice({items:invoice.items.filter(i=>i.id!==item.id)})}><Trash2 size={15}/></button></td>
                    </tr>)}
                    {invoice.items.length === 0 && <tr><td colSpan={7}><div className="empty-items"><ShoppingBag size={22}/><strong>No items added yet</strong><span>Add a product or fitting charge to get started.</span></div></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="add-row-actions"><button className="btn btn-dashed" onClick={() => addItem("Product")}><Plus size={15}/> Add product</button><button className="btn btn-dashed" onClick={() => addItem("Fitting / Labour")}><Plus size={15}/> Add fitting / labour</button></div>
              <div className="catalog-hint"><Info size={14}/> Stock is deducted only for catalogue-linked items with tracking enabled. Fitting and labour are excluded by default unless you turn tracking on.</div>
            </section>

            <section className="panel">
              <div className="section-heading"><div className="section-icon"><BadgeIndianRupee size={17}/></div><div><h2>Discount, tax & payment</h2><p>Choose how tax and payment are recorded.</p></div></div>
              <div className="settings-grid">
                <div className="setting-block"><span className="field-label">DISCOUNT</span><div className="inline-controls"><select className="field select-field" value={invoice.discountType} onChange={e=>patchInvoice({discountType:e.target.value as Invoice["discountType"]})}><option value="percent">Percentage (%)</option><option value="flat">Flat amount (₹)</option></select><input className="field" type="number" min="0" value={invoice.discountValue} onChange={e=>patchInvoice({discountValue:Math.max(0,Number(e.target.value))})}/></div></div>
                <div className="setting-block"><span className="field-label">GST TYPE</span><div className="segmented"><button className={invoice.taxMode==="intra"?"selected":""} onClick={()=>patchInvoice({taxMode:"intra"})}>CGST + SGST</button><button className={invoice.taxMode==="inter"?"selected":""} onClick={()=>patchInvoice({taxMode:"inter"})}>IGST</button></div><span className="helper-text">Intra-state or inter-state supply</span></div>
                <div className="setting-block"><span className="field-label">PAYMENT MODE</span><select className="field select-field" value={invoice.paymentMode} onChange={e=>patchInvoice({paymentMode:e.target.value})}>{["Cash","UPI","Bank Transfer","Card","Cheque","Credit"].map(x=><option key={x}>{x}</option>)}</select></div>
                <div className="setting-block"><span className="field-label">AMOUNT RECEIVED (₹)</span><input className="field" type="number" min="0" value={invoice.amountReceived} onChange={e=>patchInvoice({amountReceived:Math.max(0,Number(e.target.value))})}/></div>
              </div>
              <Field label="Notes / payment terms" value={invoice.notes} onChange={v=>patchInvoice({notes:v})} placeholder="e.g. Warranty as per manufacturer policy, balance due within 7 days" />
            </section>
          </div>

          <div className="preview-column">
            <div className="preview-toolbar"><div><span className="preview-label">LIVE PREVIEW</span><span className="preview-live"><span/> Updating</span></div><div className="preview-actions"><button className="btn btn-secondary btn-sm" onClick={()=>window.print()}><Printer size={15}/> Print / PDF</button></div></div>
            <div className="invoice-paper" id="invoice-paper">
              <div className="invoice-topline"><div className="invoice-brand"><div className="invoice-logo"><Zap size={19} fill="currentColor"/></div><div><h3>{data.business.name || "Your Electrical Store"}</h3><span>Electrical goods & installation services</span></div></div><div className="invoice-title"><strong>INVOICE</strong><span>{invoice.status === "Saved" ? "SAVED BILL" : "DRAFT BILL"}</span></div></div>
              <div className="invoice-business-details"><span>{data.business.address}</span>{data.business.phone && <span>Phone: {data.business.phone}</span>}{data.business.email && <span>{data.business.email}</span>}{data.business.gstin && <span>GSTIN: {data.business.gstin}</span>}</div>
              <div className="invoice-meta"><div><span>INVOICE NUMBER</span><strong>{invoice.number}</strong></div><div><span>DATE</span><strong>{invoice.date}</strong></div><div><span>PLACE OF SUPPLY</span><strong>{data.business.state || "—"} ({data.business.stateCode || "—"})</strong></div></div>
              <div className="bill-to"><span className="paper-kicker">BILL TO</span><strong>{invoice.customer.name || "Customer name"}</strong>{invoice.customer.phone && <span>{invoice.customer.phone}</span>}{invoice.customer.address && <span>{invoice.customer.address}</span>}{invoice.customer.gstin && <span>GSTIN: {invoice.customer.gstin}</span>}</div>
              <table className="paper-table"><thead><tr><th>#</th><th>DESCRIPTION</th><th>QTY</th><th>RATE</th><th>GST</th><th className="text-right">AMOUNT</th></tr></thead><tbody>
                {invoice.items.map((item,i)=><tr key={item.id}><td>{i+1}</td><td><strong>{item.name || "Item description"}</strong>{item.hsn && <small>HSN/SAC: {item.hsn}</small>}<small>{item.kind}</small></td><td>{item.quantity} {item.unit}</td><td>{money(item.rate)}</td><td>{item.taxRate}%</td><td className="text-right">{money(item.quantity*item.rate)}</td></tr>)}
                {invoice.items.length===0 && <tr><td colSpan={6} className="paper-empty">Your billed items will appear here</td></tr>}
              </tbody></table>
              <div className="paper-bottom">
                <div className="paper-notes"><span className="paper-kicker">NOTES</span><p>{invoice.notes || "Thank you for choosing us."}</p><div className="payment-info"><span>Payment mode</span><strong>{invoice.paymentMode}</strong></div></div>
                <div className="paper-totals"><div><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>{totals.discount>0 && <div className="discount-line"><span>Discount</span><strong>- {money(totals.discount)}</strong></div>}<div><span>Taxable amount</span><strong>{money(totals.taxable)}</strong></div>{invoice.taxMode==="intra"?<><div><span>CGST</span><strong>{money(totals.cgst)}</strong></div><div><span>SGST</span><strong>{money(totals.sgst)}</strong></div></>:<div><span>IGST</span><strong>{money(totals.igst)}</strong></div>}<div className="grand-total"><span>Grand total</span><strong>{money(totals.total)}</strong></div><div><span>Received</span><strong>{money(invoice.amountReceived)}</strong></div><div className="balance-line"><span>Balance due</span><strong>{money(Math.max(0,totals.total-invoice.amountReceived))}</strong></div></div>
              </div>
              <div className="amount-words"><span>AMOUNT PAYABLE</span><strong>{money(totals.total)}</strong></div>
              <div className="invoice-footer"><div><strong>{data.business.footer || "Thank you for your business!"}</strong><span>{data.business.upi ? `UPI: ${data.business.upi}` : "Please retain this invoice for your records."}</span></div><div className="signature"><span>For {data.business.name || "Your Store"}</span><strong>Authorized Signature</strong></div></div>
              <div className="paper-bottomline">This is a computer-generated invoice.</div>
            </div>
            <div className="preview-footnote"><ShieldCheck size={15}/> Your invoice preview is private and stored locally on this device.</div>
          </div>
        </div>
      </div>}

      {tab === "history" && <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">YOUR RECORDS</div><h1>Bill history</h1><p>Find, reopen, print or remove previously saved bills.</p></div><button className="btn btn-primary" onClick={startNew}><Plus size={16}/> Create new bill</button></div>
        <section className="panel history-panel">
          <div className="history-summary"><div><span className="summary-icon"><FileText size={18}/></span><div><strong>{data.invoices.length}</strong><span>Saved bills</span></div></div><div><span className="summary-icon"><BadgeIndianRupee size={18}/></span><div><strong>{money(data.invoices.reduce((s,i)=>s+calc(i).total,0))}</strong><span>Total billed value</span></div></div></div>
          {data.invoices.length===0 ? <div className="empty-state"><div className="empty-icon"><Archive size={26}/></div><h3>No saved bills yet</h3><p>Your saved invoices will appear here. Create your first bill to get started.</p><button className="btn btn-primary" onClick={startNew}><Plus size={16}/> Create first bill</button></div> :
          <div className="history-table-wrap"><table className="history-table"><thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{data.invoices.map(i=><tr key={i.id}><td><strong>{i.number}</strong></td><td>{i.customer.name}<small>{i.customer.phone}</small></td><td>{i.date}</td><td><strong>{money(calc(i).total)}</strong></td><td><span className="saved-pill"><Check size={12}/> Saved</span></td><td><div className="table-actions"><button onClick={()=>openInvoice(i)} title="Open bill"><FileText size={15}/> Open</button><button onClick={()=>{openInvoice(i);setTimeout(()=>window.print(),100)}} title="Print bill"><Printer size={15}/></button><button className="danger-action" onClick={()=>{if(confirm("Delete this saved bill?")) deleteInvoice(i.id)}} title="Delete bill"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
        </section>
      </div>}

      {tab === "catalog" && <Catalog data={data} onSave={saveCatalog} onDelete={id=>{if(data.invoices.some(inv=>inv.items.some(line=>line.catalogItemId===id))){setToast("This item is used by saved bills. Disable stock tracking instead of deleting it.");return;}setData(p=>({...p,catalog:p.catalog.filter(x=>x.id!==id)}));}} onToast={setToast}/>}
      {tab === "inventory" && <Inventory data={data} onAdjust={(id,amount,note)=>setData(prev=>{
        const product=prev.catalog.find(x=>x.id===id); if(!product || !product.stockTracked) return prev;
        return { ...prev, catalog:prev.catalog.map(x=>x.id===id?{...x,stockQty:Math.max(0,(x.stockQty||0)+amount)}:x), stockMovements:[{id:uid(),productId:id,productName:product.name,type:"adjustment",quantityChange:amount,reference:"Manual adjustment",note,createdAt:new Date().toISOString()},...(prev.stockMovements||[])] };
      })} onToast={setToast}/>}
      {tab === "settings" && <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">CONFIGURATION</div><h1>Business settings</h1><p>These details appear on your printed invoices.</p></div><button className="btn btn-primary" onClick={()=>setToast("Business details are saved automatically.")}><Check size={16}/> Save settings</button></div>
        <section className="panel settings-panel"><div className="section-heading"><div className="section-icon"><BriefcaseBusiness size={17}/></div><div><h2>Your business information</h2><p>Keep your shop identity and contact details up to date.</p></div></div><div className="form-grid"><Field label="Business / shop name" value={data.business.name} onChange={v=>patchBusiness({name:v})} placeholder="e.g. Shree Electricals"/><Field label="Owner / proprietor" value={data.business.owner} onChange={v=>patchBusiness({owner:v})} placeholder="Owner name"/><Field label="Mobile number" value={data.business.phone} onChange={v=>patchBusiness({phone:v})} placeholder="+91"/><Field label="Email address" value={data.business.email} onChange={v=>patchBusiness({email:v})} placeholder="shop@example.com"/><Field label="GSTIN" value={data.business.gstin} onChange={v=>patchBusiness({gstin:v.toUpperCase()})} placeholder="Enter GSTIN"/><Field label="UPI ID" value={data.business.upi} onChange={v=>patchBusiness({upi:v})} placeholder="shop@upi"/><Field label="Business address" value={data.business.address} onChange={v=>patchBusiness({address:v})} placeholder="Full shop address" className="span-2"/><Field label="State" value={data.business.state} onChange={v=>patchBusiness({state:v})} placeholder="Gujarat"/><Field label="State code" value={data.business.stateCode} onChange={v=>patchBusiness({stateCode:v})} placeholder="24"/><Field label="Invoice footer message" value={data.business.footer} onChange={v=>patchBusiness({footer:v})} placeholder="Thank you for your business" className="span-2"/></div></section>
        <section className="panel backup-panel"><div className="section-heading"><div className="section-icon"><HardDrive size={17}/></div><div><h2>Backup & restore</h2><p>Keep a copy of your records somewhere safe.</p></div></div><div className="backup-actions"><div><strong>Download a complete backup</strong><span>Includes business details, product catalogue and all saved bills.</span></div><button className="btn btn-secondary" onClick={exportBackup}><Download size={16}/> Export backup</button></div><div className="backup-actions"><div><strong>Restore from backup</strong><span>Import a previously downloaded Chaudhary Billing JSON backup.</span></div><button className="btn btn-secondary" onClick={()=>fileRef.current?.click()}><Upload size={16}/> Import backup</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e=>importBackup(e.target.files?.[0])}/></div><div className="warning-note"><Info size={15}/> Data is stored in this browser on this computer. Export backups regularly, especially before clearing browser data or changing computers.</div></section>
      </div>}
    </main>
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Inventory({data,onAdjust,onToast}:{data:AppData;onAdjust:(id:string,amount:number,note:string)=>void;onToast:(s:string)=>void}) {
  const [selected,setSelected]=useState(data.catalog.find(x=>x.stockTracked)?.id || "");
  const [amount,setAmount]=useState(1); const [note,setNote]=useState("Stock count correction");
  const tracked=data.catalog.filter(x=>x.stockTracked);
  const low=tracked.filter(x=>(x.stockQty||0)<=(x.lowStockAt??5));
  const submit=()=>{if(!selected||!Number.isFinite(amount)||amount===0){onToast("Choose an item and enter a non-zero adjustment.");return;}const product=tracked.find(x=>x.id===selected);if(product && (product.stockQty||0)+amount<0){onToast("Stock cannot be reduced below zero.");return;}onAdjust(selected,amount,note.trim()||"Manual adjustment");setAmount(1);onToast("Stock adjustment recorded.");};
  return <div className="page-content">
    <div className="page-heading"><div><div className="eyebrow">STOCK CONTROL</div><h1>Inventory & stock</h1><p>Track quantities, stock value and every stock movement locally.</p></div><span className="catalog-total">{tracked.length} tracked items</span></div>
    <div className="inventory-stats"><div className="panel"><span>Tracked items</span><strong>{tracked.length}</strong></div><div className="panel"><span>Low-stock alerts</span><strong className={low.length?"stock-warning":""}>{low.length}</strong></div><div className="panel"><span>Stock cost value</span><strong>{money(tracked.reduce((sum,x)=>sum+(x.stockQty||0)*(x.purchaseRate||0),0))}</strong></div></div>
    {low.length>0&&<section className="panel low-stock-panel"><div className="section-heading"><div className="section-icon"><Info size={17}/></div><div><h2>Low-stock alerts</h2><p>Items at or below their configured threshold.</p></div></div><div className="low-stock-list">{low.map(x=><div key={x.id}><strong>{x.name}</strong><span>{x.stockQty||0} {x.unit} left · alert at {x.lowStockAt??5}</span></div>)}</div></section>}
    <section className="panel inventory-panel"><div className="section-heading"><div className="section-icon"><Package size={17}/></div><div><h2>Current stock</h2><p>Purchase cost and selling price come from the product catalogue.</p></div></div>
      {tracked.length===0?<div className="empty-state compact"><Package size={24}/><h3>No stock-tracked items</h3><p>Open Product catalogue and enable stock tracking for products.</p></div>:<div className="history-table-wrap"><table className="history-table inventory-table"><thead><tr><th>ITEM</th><th>ON HAND</th><th>LOW ALERT</th><th>PURCHASE COST</th><th>SELLING PRICE</th><th>STOCK COST</th></tr></thead><tbody>{tracked.map(x=><tr key={x.id}><td><strong>{x.name}</strong><small>{x.kind} · {x.unit}</small></td><td><strong>{x.stockQty||0} {x.unit}</strong></td><td>{x.lowStockAt??5}</td><td>{money(x.purchaseRate||0)}</td><td>{money(x.rate)}</td><td>{money((x.stockQty||0)*(x.purchaseRate||0))}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel stock-adjust-panel"><div className="section-heading"><div className="section-icon"><Activity size={17}/></div><div><h2>Adjust stock</h2><p>Use a positive number to add stock and a negative number to remove stock.</p></div></div><div className="stock-adjust-grid"><label className="field-wrap"><span className="field-label">PRODUCT</span><select className="field select-field" value={selected} onChange={e=>setSelected(e.target.value)}>{tracked.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><Field label="QUANTITY CHANGE (+ / −)" type="number" value={amount} onChange={v=>setAmount(Number(v))}/><Field label="NOTE / REASON" value={note} onChange={setNote} placeholder="Purchase, damaged, count correction"/><button className="btn btn-primary" onClick={submit} disabled={!tracked.length}>Record adjustment</button></div></section>
    <section className="panel inventory-panel"><div className="section-heading"><div className="section-icon"><History size={17}/></div><div><h2>Stock movement history</h2><p>Sales, returns and manual adjustments.</p></div></div>{(data.stockMovements||[]).length===0?<p className="helper-text">No stock movements recorded yet.</p>:<div className="history-table-wrap"><table className="history-table"><thead><tr><th>DATE</th><th>ITEM</th><th>TYPE</th><th>CHANGE</th><th>REFERENCE / NOTE</th></tr></thead><tbody>{data.stockMovements.map(m=><tr key={m.id}><td>{new Date(m.createdAt).toLocaleString()}</td><td><strong>{m.productName}</strong></td><td>{m.type}</td><td><strong className={m.quantityChange<0?"stock-negative":"stock-positive"}>{m.quantityChange>0?"+":""}{m.quantityChange}</strong></td><td>{m.reference}<small>{m.note}</small></td></tr>)}</tbody></table></div>}</section>
  </div>;
}

function Catalog({data,onSave,onDelete,onToast}: {data:AppData;onSave:(item:BillItem)=>void;onDelete:(id:string)=>void;onToast:(s:string)=>void}) {
  const blank = ():BillItem=>({id:uid(),kind:"Product",name:"",hsn:"",quantity:1,unit:"Pcs",rate:0,taxRate:18,purchaseRate:0,stockTracked:true,stockQty:0,lowStockAt:5});
  const [draft,setDraft]=useState<BillItem>(blank);
  const [editing,setEditing]=useState(false);
  const reset=()=>{setDraft(blank());setEditing(false)};
  const save=()=>{if(!draft.name.trim()){onToast("Enter a product or service name.");return;}onSave(draft);reset();};
  return <div className="page-content">
    <div className="page-heading"><div><div className="eyebrow">REUSABLE ITEMS</div><h1>Product catalogue</h1><p>Save common electrical products and fitting services for faster billing.</p></div><span className="catalog-total">{data.catalog.length} saved items</span></div>
    <div className="catalog-layout">
      <section className="panel catalog-form"><div className="section-heading"><div className="section-icon"><Plus size={17}/></div><div><h2>{editing?"Edit catalogue item":"Add catalogue item"}</h2><p>Enter the details you use most often.</p></div></div>
        <div className="form-stack"><label className="field-wrap"><span className="field-label">ITEM TYPE</span><select className="field select-field" value={draft.kind} onChange={e=>{const kind=e.target.value as BillItem["kind"];setDraft({...draft,kind,stockTracked:kind === "Product"});}}><option>Product</option><option>Fitting / Labour</option></select></label><Field label="Product / service name *" value={draft.name} onChange={v=>setDraft({...draft,name:v})} placeholder="e.g. 16A socket / Fan fitting"/><div className="form-grid"><Field label="HSN / SAC" value={draft.hsn} onChange={v=>setDraft({...draft,hsn:v})} placeholder="Optional"/><Field label="Unit" value={draft.unit} onChange={v=>setDraft({...draft,unit:v})} placeholder="Pcs / Mtr / Job"/><Field label="Selling rate (₹)" type="number" value={draft.rate} onChange={v=>setDraft({...draft,rate:Number(v)})}/><Field label="Purchase cost (₹)" type="number" value={draft.purchaseRate || 0} onChange={v=>setDraft({...draft,purchaseRate:Number(v)})}/><label className="field-wrap"><span className="field-label">GST RATE</span><select className="field select-field" value={draft.taxRate} onChange={e=>setDraft({...draft,taxRate:Number(e.target.value)})}>{[0,5,12,18,28].map(t=><option key={t} value={t}>{t}%</option>)}</select></label></div><div className="inventory-form-options"><label><input type="checkbox" checked={draft.stockTracked ?? draft.kind === "Product"} onChange={e=>setDraft({...draft,stockTracked:e.target.checked})}/> Track stock for this item</label><Field label="Low-stock alert at" type="number" value={draft.lowStockAt ?? 5} onChange={v=>setDraft({...draft,lowStockAt:Math.max(0,Number(v))})}/></div><div className="form-button-row"><button className="btn btn-primary" onClick={save}><Save size={15}/> {editing?"Update item":"Save item"}</button>{editing&&<button className="btn btn-secondary" onClick={reset}>Cancel</button>}</div></div>
      </section>
      <section className="panel catalog-list"><div className="section-heading"><div className="section-icon"><Layers3 size={17}/></div><div><h2>Saved items</h2><p>Click edit to update an item.</p></div></div>
        {data.catalog.length===0?<div className="empty-state compact"><Package size={24}/><h3>Your catalogue is empty</h3><p>Add products and fitting charges using the form.</p></div>:<div className="catalog-items">{data.catalog.map(item=><div className="catalog-item" key={item.id}><div className="catalog-item-icon">{item.kind==="Product"?<Package size={17}/>:<Activity size={17}/>}</div><div className="catalog-item-info"><strong>{item.name}</strong><span>{item.kind} · {item.unit}{item.hsn?` · HSN ${item.hsn}`:""} · GST {item.taxRate}% · Stock {item.stockTracked ? (item.stockQty ?? 0) : "not tracked"}</span></div><strong className="catalog-price">{money(item.rate)}</strong><div className="catalog-item-actions"><button onClick={()=>{setDraft(item);setEditing(true)}} title="Edit"><Settings2 size={15}/></button><button className="danger-action" onClick={()=>{if(confirm("Delete this catalogue item?"))onDelete(item.id)}} title="Delete"><Trash2 size={15}/></button></div></div>)}</div>}
      </section>
    </div>
  </div>;
}

export default App;
