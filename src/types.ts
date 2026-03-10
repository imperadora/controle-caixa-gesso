import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  cost: number;
  price: number;
  supplier: string;
}

export interface Transaction {
  id: number;
  date: string;
  type: 'entrada' | 'saida';
  description: string;
  category: string;
  value: number;
}

export interface RecurringTransaction {
  id: number;
  type: 'entrada' | 'saida';
  description: string;
  category: string;
  value: number;
  day_of_month: number;
  last_generated_month?: string; // Format: YYYY-MM
}

export interface Sale {
  id: number;
  date: string;
  material_id: number;
  material_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  client: string;
  payment_method: string;
}

export interface Work {
  id: number;
  client_name: string;
  address: string;
  service: string;
  materials_used: string; // JSON string
  total_value: number;
  total_cost: number;
  status: 'orçamento' | 'em andamento' | 'finalizada';
  date: string;
}

export interface Budget {
  id: number;
  date: string;
  client_name: string;
  client_phone: string;
  items: string; // JSON string
  total_value: number;
}

export interface Stats {
  dailySales: number;
  dailyInflow: number;
  dailyOutflow: number;
  dailyProfit: number;
  monthlyProfit: number;
  totalStockValue: number;
  activeWorks: number;
  topProducts: { name: string; total_qty: number }[];
}
