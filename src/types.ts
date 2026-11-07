export type TaxMode = "intra" | "inter";
export type DiscountType = "percent" | "flat";
export type ItemKind = "Product" | "Fitting / Labour";

export interface Business {
  name: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  state: string;
  stateCode: string;
  upi: string;
  footer: string;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
  gstin: string;
}

export interface BillItem {
  id: string;
  kind: ItemKind;
  name: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  catalogItemId?: string;
  purchaseRate?: number;
  stockTracked?: boolean;
  stockQty?: number;
  lowStockAt?: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  customer: Customer;
  items: BillItem[];
  discountType: DiscountType;
  discountValue: number;
  taxMode: TaxMode;
  notes: string;
  paymentMode: string;
  amountReceived: number;
  status: "Draft" | "Saved";
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: "sale" | "return" | "adjustment";
  quantityChange: number;
  reference: string;
  note: string;
  createdAt: string;
}

export interface AppData {
  business: Business;
  catalog: BillItem[];
  invoices: Invoice[];
  nextNumber: number;
  stockMovements: StockMovement[];
}
