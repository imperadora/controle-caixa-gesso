import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  ShoppingCart, 
  HardHat, 
  FileText, 
  PieChart,
  Menu,
  X,
  Plus,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  MapPin,
  Trash2,
  Calendar,
  Edit3,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from './types';
import type { Stats, Material, Transaction, Sale, Work, Budget, RecurringTransaction } from './types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Components ---

const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden", className)} {...props}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: string }) => (
  <Card className="p-6 relative overflow-hidden group hover:shadow-md transition-all border-slate-200/60">
    <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 transition-transform group-hover:scale-110", color)} />
    <div className="relative z-10">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-600 uppercase">{trend}</span>
        </div>
      )}
    </div>
  </Card>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [formErrors, setFormErrors] = useState<any>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ resource: string, id: number, label: string } | null>(null);

  const fetchData = async () => {
    try {
      const [s, m, t, sa, w, b, rt] = await Promise.all([
        fetch('/api/stats').then(res => res.json()).catch(() => ({ dailySales: 0, dailyInflow: 0, dailyOutflow: 0, dailyProfit: 0, monthlyProfit: 0, totalStockValue: 0, activeWorks: 0, topProducts: [] })),
        fetch('/api/materials').then(res => res.json()).catch(() => []),
        fetch('/api/transactions').then(res => res.json()).catch(() => []),
        fetch('/api/sales').then(res => res.json()).catch(() => []),
        fetch('/api/works').then(res => res.json()).catch(() => []),
        fetch('/api/budgets').then(res => res.json()).catch(() => []),
        fetch('/api/recurring_transactions').then(res => res.json()).catch(() => []),
      ]);
      setStats(s);
      setMaterials(m);
      setTransactions(t);
      setSales(sa);
      setWorks(w);
      setBudgets(b);
      setRecurringTransactions(rt);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchTerm('');
    setMaterialSearch('');
    setFormData({});
    setFormErrors({});
  };

  const handleDeleteRecurring = (rt: RecurringTransaction) => {
    setDeleteConfirm({ resource: 'recurring_transactions', id: rt.id, label: rt.description });
  };

  const handleDelete = (resource: string, id: number, label: string) => {
    setDeleteConfirm({ resource, id, label });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const endpoint = deleteConfirm.resource === 'recurring_transactions' 
        ? `/api/recurring_transactions/${deleteConfirm.id}`
        : deleteConfirm.resource === 'system' && deleteConfirm.id === 0
        ? `/api/system/reset`
        : `/api/${deleteConfirm.resource}/${deleteConfirm.id}`;
        
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error(`Error deleting ${deleteConfirm.resource}:`, err);
    }
  };

  const handleResetSystem = () => {
    setDeleteConfirm({ resource: 'system', id: 0, label: 'TODOS OS DADOS DO SISTEMA' });
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'caixa', label: 'Caixa', icon: ArrowLeftRight },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'obras', label: 'Obras', icon: HardHat },
    { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
    { id: 'relatorios', label: 'Relatórios', icon: PieChart },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const COMPANY_INFO = {
    name: "Gesso Forteleve",
    cnpj: "21.729.304/0001-64",
    phone: "(XX) XXXXX-XXXX",
    address: "Nova Brasília",
    city: "Cariacica - ES",
    description: "Sistema completo de gestão de estoque, obras, vendas e financeiro"
  };

  const safeParse = (data: any) => {
    if (!data) return [];
    if (typeof data !== 'string') return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Erro ao processar JSON:", e);
      return [];
    }
  };

  const generateBudgetPDF = (budget: Budget) => {
    const doc = new jsPDF();
    const items = safeParse(budget.items);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(COMPANY_INFO.name, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`CNPJ: ${COMPANY_INFO.cnpj}`, 105, 26, { align: 'center' });
    doc.text(`${COMPANY_INFO.address} - ${COMPANY_INFO.city}`, 105, 31, { align: 'center' });
    doc.text(`Telefone: ${COMPANY_INFO.phone}`, 105, 36, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 42, 190, 42);

    // Client Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("ORÇAMENTO", 105, 52, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Cliente: ${budget.client_name}`, 20, 65);
    doc.text(`Telefone: ${budget.client_phone}`, 20, 71);
    doc.text(`Data: ${format(new Date(budget.date), 'dd/MM/yyyy')}`, 150, 65);

    // Table
    autoTable(doc, {
      startY: 80,
      head: [['Item', 'Qtd', 'V. Unit', 'Total']],
      body: items.map((item: any) => [
        item.name,
        item.quantity,
        formatCurrency(item.price),
        formatCurrency(item.quantity * item.price)
      ]),
      foot: [['', '', 'TOTAL:', formatCurrency(budget.total_value)]],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`orcamento_${budget.client_name.replace(/\s+/g, '_')}.pdf`);
  };

  const generateSalePDF = (sale: Sale) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(COMPANY_INFO.name, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`CNPJ: ${COMPANY_INFO.cnpj}`, 105, 26, { align: 'center' });
    doc.text(`${COMPANY_INFO.address} - ${COMPANY_INFO.city}`, 105, 31, { align: 'center' });
    doc.text(`Telefone: ${COMPANY_INFO.phone}`, 105, 36, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 42, 190, 42);

    // Sale Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("COMPROVANTE DE VENDA", 105, 52, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}`, 20, 65);
    doc.text(`Cliente: ${sale.client || 'Consumidor'}`, 20, 71);
    doc.text(`Forma de Pagamento: ${sale.payment_method}`, 20, 77);

    // Table
    autoTable(doc, {
      startY: 85,
      head: [['Material', 'Qtd', 'V. Unit', 'Total']],
      body: [[
        sale.material_name || 'Material',
        sale.quantity,
        formatCurrency(sale.unit_price),
        formatCurrency(sale.total_price)
      ]],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald 500
      styles: { fontSize: 10 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(12);
    doc.text(`TOTAL: ${formatCurrency(sale.total_price)}`, 190, finalY + 15, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Obrigado pela preferência!", 105, finalY + 35, { align: 'center' });

    doc.save(`venda_${sale.id}.pdf`);
  };

  const generateWorkPDF = (work: Work) => {
    try {
      const doc = new jsPDF();
      const materialsUsed = safeParse(work.materials_used);
      const materialsTotal = materialsUsed.reduce((acc: number, curr: any) => acc + ((curr.price || 0) * (curr.quantity || 0)), 0);
      const serviceValue = work.total_value - materialsTotal;
      const workDate = work.date ? format(new Date(work.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');

      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text(COMPANY_INFO.name, 105, 20, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(COMPANY_INFO.description, 105, 25, { align: 'center' });
      doc.text(`CNPJ: ${COMPANY_INFO.cnpj} | Telefone: ${COMPANY_INFO.phone}`, 105, 30, { align: 'center' });
      doc.text(`${COMPANY_INFO.address} - ${COMPANY_INFO.city}`, 105, 35, { align: 'center' });

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 40, 190, 40);

      // Work Info
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DETALHADO DA OBRA", 105, 50, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Cliente: ${work.client_name}`, 20, 65);
      doc.text(`Endereço: ${work.address}`, 20, 71);
      doc.text(`Serviço: ${work.service}`, 20, 77);
      doc.text(`Data de Início: ${workDate}`, 150, 71);
      
      // Status Badge
      const statusColors: any = {
        'orçamento': [245, 158, 11], // Amber
        'em andamento': [59, 130, 246], // Blue
        'finalizada': [16, 185, 129] // Emerald
      };
      const color = statusColors[work.status] || [100, 116, 139];
      
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(150, 60, 40, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(work.status.toUpperCase(), 170, 64.5, { align: 'center' });

      // Materials Table
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.text("MATERIAIS UTILIZADOS", 20, 90);
      
      autoTable(doc, {
        startY: 95,
        head: [['Material', 'Quantidade', 'Preço Unit.', 'Total']],
        body: materialsUsed.map((m: any) => [
          m.name || 'Material',
          m.quantity,
          formatCurrency(m.price),
          formatCurrency(m.price * m.quantity)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        styles: { fontSize: 9 },
        columnStyles: {
          3: { halign: 'right' }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 150;

      // Financial Summary Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(120, finalY + 10, 70, 40, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(120, finalY + 10, 70, 40, 2, 2, 'D');

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMO FINANCEIRO", 155, finalY + 18, { align: 'center' });
      
      doc.setFont("helvetica", "normal");
      doc.text(`Total Materiais:`, 125, finalY + 25);
      doc.text(formatCurrency(materialsTotal), 185, finalY + 25, { align: 'right' });
      
      doc.setTextColor(16, 185, 129);
      doc.text(`Lucro Estimado:`, 125, finalY + 31);
      doc.text(formatCurrency(serviceValue), 185, finalY + 31, { align: 'right' });
      
      doc.line(125, finalY + 34, 185, finalY + 34);
      
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(`VALOR TOTAL:`, 125, finalY + 42);
      doc.text(formatCurrency(work.total_value), 185, finalY + 42, { align: 'right' });

      doc.save(`relatorio_obra_${work.client_name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF da obra:", error);
    }
  };

  const generateMaterialSheetPDF = (work: Work) => {
    try {
      const doc = new jsPDF();
      const materialsUsed = safeParse(work.materials_used);
      const workDate = work.date ? format(new Date(work.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');

      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(COMPANY_INFO.name, 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`CNPJ: ${COMPANY_INFO.cnpj}`, 105, 26, { align: 'center' });
      doc.text(`Telefone: ${COMPANY_INFO.phone}`, 105, 31, { align: 'center' });

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 38, 190, 38);

      // Title
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("FOLHA DE MATERIAIS GASTOS NA OBRA", 105, 50, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Cliente: ${work.client_name}`, 20, 60);
      doc.text(`Endereço: ${work.address}`, 20, 66);
      doc.text(`Data da Obra: ${workDate}`, 150, 60);

      // Table
      autoTable(doc, {
        startY: 75,
        head: [['Material', 'Quantidade', 'Unidade']],
        body: materialsUsed.map((m: any) => {
          const matInfo = materials.find(mat => mat.id === m.material_id);
          return [
            m.name || 'Material',
            m.quantity,
            matInfo?.unit || 'un'
          ];
        }),
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
      });

      doc.setFontSize(10);
      const finalY = (doc as any).lastAutoTable?.finalY || 120;
      doc.text("Assinatura Responsável: _________________________________", 20, finalY + 30);

      doc.save(`materiais_obra_${work.client_name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar folha de materiais:", error);
    }
  };

  const generateAllWorksMaterialsPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const allMaterials: any[] = [];

    // Sort works by date descending
    const sortedWorks = [...works].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedWorks.forEach(work => {
      const materialsUsed = safeParse(work.materials_used);
      materialsUsed.forEach((m: any) => {
        const matInfo = materials.find(mat => mat.id === m.material_id);
        allMaterials.push([
          work.date ? format(new Date(work.date), 'dd/MM/yyyy') : '-',
          work.client_name,
          work.address,
          m.name || 'Material',
          m.quantity,
          matInfo?.unit || 'un'
        ]);
      });
    });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(COMPANY_INFO.name, 148.5, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text("Relatório Consolidado de Materiais por Obra", 148.5, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 28);

    autoTable(doc, {
      startY: 32,
      head: [['Data', 'Cliente', 'Endereço', 'Material', 'Qtd', 'Unidade']],
      body: allMaterials,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 60 },
        3: { cellWidth: 80 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
      }
    });

    doc.save(`relatorio_materiais_obras.pdf`);
  };

  const validateForm = () => {
    const errors: any = {};
    if (activeTab === 'estoque') {
      if (!formData.name) errors.name = 'Nome é obrigatório';
      if (!formData.category) errors.category = 'Categoria é obrigatória';
      if (!formData.unit) errors.unit = 'Unidade é obrigatória';
      if (formData.quantity === undefined || formData.quantity < 0) errors.quantity = 'Quantidade inválida';
      if (formData.cost === undefined || formData.cost < 0) errors.cost = 'Custo inválido';
      if (formData.price === undefined || formData.price < 0) errors.price = 'Preço inválido';
    } else if (activeTab === 'vendas') {
      if (!formData.material_id) errors.material_id = 'Selecione um material';
      if (!formData.quantity || formData.quantity <= 0) {
        errors.quantity = 'Quantidade deve ser maior que zero';
      } else {
        const material = materials.find(m => m.id === formData.material_id);
        if (material && formData.quantity > material.quantity) {
          errors.quantity = `Estoque insuficiente. Disponível: ${material.quantity}`;
        }
      }
    } else if (activeTab === 'obras') {
      if (!formData.client_name) errors.client_name = 'Nome do cliente é obrigatório';
      if (!formData.address) errors.address = 'Endereço é obrigatório';
      if (!formData.service) errors.service = 'Serviço é obrigatório';
      if (formData.total_value === undefined || formData.total_value < 0) errors.total_value = 'Valor total inválido';
    } else if (activeTab === 'orcamentos') {
      if (!formData.client_name) errors.client_name = 'Nome do cliente é obrigatório';
      if (!formData.address) errors.address = 'Endereço é obrigatório';
      if (!formData.service) errors.service = 'Serviço é obrigatório';
      if (formData.total_value === undefined || formData.total_value < 0) errors.total_value = 'Valor total inválido';
    } else if (activeTab === 'caixa') {
      if (!formData.description) errors.description = 'Descrição é obrigatória';
      if (!formData.category) errors.category = 'Categoria é obrigatória';
      if (formData.value === undefined || formData.value <= 0) errors.value = 'Valor deve ser maior que zero';
    } else if (activeTab === 'mensalidades') {
      if (!formData.description) errors.description = 'Descrição é obrigatória';
      if (!formData.category) errors.category = 'Categoria é obrigatória';
      if (formData.value === undefined || formData.value <= 0) errors.value = 'Valor deve ser maior que zero';
      if (!formData.day_of_month || formData.day_of_month < 1 || formData.day_of_month > 31) errors.day_of_month = 'Dia inválido (1-31)';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    let endpoint = '';
    let method = 'POST';
    let body = { ...formData };

    switch (activeTab) {
      case 'estoque': 
        if (body.mode) {
          const newQty = body.mode === 'entrada' 
            ? body.quantity + (body.movement_qty || 0) 
            : body.quantity - (body.movement_qty || 0);
          body.quantity = newQty;
          
          if (body.mode === 'entrada' && body.record_transaction) {
            await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: new Date().toISOString().split('T')[0],
                type: 'saida',
                description: `Compra: ${body.name} (${body.movement_qty} ${body.unit})`,
                category: 'Compra de Material',
                value: (body.movement_qty || 0) * (body.cost || 0)
              })
            });
          }
        }
        endpoint = body.id ? `/api/materials/${body.id}` : '/api/materials'; 
        method = body.id ? 'PUT' : 'POST';
        break;
      case 'vendas': endpoint = '/api/sales'; body.date = new Date().toISOString(); break;
      case 'obras': 
        endpoint = body.id ? `/api/works/${body.id}` : '/api/works'; 
        method = body.id ? 'PUT' : 'POST';
        const materialsTotal = (body.materials_used || []).reduce((acc: number, curr: any) => acc + ((curr.price || 0) * (curr.quantity || 0)), 0);
        body.total_cost = body.total_cost || materialsTotal;
        // Profit is Total - Cost
        body.service_value = (body.total_value || 0) - (body.total_cost || 0);
        break;
      case 'orcamentos': endpoint = '/api/budgets'; body.date = new Date().toISOString(); break;
      case 'caixa': endpoint = '/api/transactions'; break;
      case 'mensalidades': endpoint = '/api/recurring_transactions'; break;
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsModalOpen(false);
        if (activeTab === 'mensalidades') setActiveTab('caixa');
        setFormData({});
        setFormErrors({});
        setMaterialSearch('');
        fetchData();
      }
    } catch (err) {
      console.error("Error adding record:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold">G</div>
          <span className="font-bold text-lg">Gesso Forteleve</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-0 z-40 bg-slate-900 text-slate-300 transition-transform md:relative md:translate-x-0 md:w-64 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white text-xl">GF</div>
          <span className="font-bold text-xl text-white tracking-tight">Forteleve</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                handleTabChange(tab.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium",
                activeTab === tab.id 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          © 2024 Gesso Forteleve
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 capitalize">{activeTab}</h1>
            <p className="text-slate-500">Gestão integrada Gesso Forteleve</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'obras' && (
              <button 
                onClick={generateAllWorksMaterialsPDF}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Relatório de Materiais
              </button>
            )}
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <TrendingUp className="w-4 h-4" />
              Atualizar
            </button>
            <button 
              onClick={() => {
                setFormData({ materials_used: [], date: new Date().toISOString().split('T')[0] });
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Registro
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Top Stats Row */}
                <StatCard title="Vendas Hoje" value={formatCurrency(stats.dailySales)} icon={ShoppingCart} color="bg-blue-500" trend="+12% vs ontem" />
                <StatCard title="Entradas" value={formatCurrency(stats.dailyInflow)} icon={TrendingUp} color="bg-emerald-500" trend="Fluxo positivo" />
                <StatCard title="Saídas" value={formatCurrency(stats.dailyOutflow)} icon={TrendingDown} color="bg-rose-500" trend="Contas em dia" />
                <StatCard title="Lucro do Dia" value={formatCurrency(stats.dailyProfit)} icon={DollarSign} color="bg-amber-500" trend="Meta atingida" />

                {/* Main Content Area */}
                <div className="md:col-span-2 lg:col-span-3 space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Fluxo de Caixa Mensal</h3>
                        <p className="text-xs text-slate-400 font-medium">Resumo comparativo de entradas e saídas</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Entradas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Saídas</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={[
                          { name: 'Entradas', value: stats.dailyInflow * 20 }, 
                          { name: 'Saídas', value: stats.dailyOutflow * 15 },
                          { name: 'Lucro', value: stats.monthlyProfit }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600, fill: '#94a3b8'}} />
                          <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}} 
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                            { [0, 1, 2].map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#10b981', '#f43f5e', '#f59e0b'][index]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-500" /> Produtos Mais Vendidos
                      </h3>
                      <div className="space-y-4">
                        {stats.topProducts.map((p, i) => (
                          <div key={i} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                0{i+1}
                              </div>
                              <span className="text-sm font-medium text-slate-600">{p.name}</span>
                            </div>
                            <span className="text-sm font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded-md">{p.total_qty} un</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-6 bg-slate-900 text-white border-none overflow-hidden relative">
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                      <h3 className="text-sm font-bold mb-6 flex items-center gap-2 text-emerald-400">
                        <TrendingUp className="w-4 h-4" /> Performance Mensal
                      </h3>
                      <div className="space-y-6 relative z-10">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lucro Líquido Estimado</p>
                          <p className="text-3xl font-black text-white">{formatCurrency(stats.monthlyProfit)}</p>
                        </div>
                        <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Obras Ativas</p>
                            <p className="text-lg font-bold">{stats.activeWorks}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Valor Estoque</p>
                            <p className="text-lg font-bold">{formatCurrency(stats.totalStockValue)}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="md:col-span-2 lg:col-span-1 space-y-6">
                  <Card className="p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Ações Rápidas</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Venda', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600', tab: 'vendas' },
                        { label: 'Obra', icon: HardHat, color: 'bg-emerald-50 text-emerald-600', tab: 'obras' },
                        { label: 'Gasto', icon: TrendingDown, color: 'bg-rose-50 text-rose-600', tab: 'caixa' },
                        { label: 'Orç.', icon: FileText, color: 'bg-amber-50 text-amber-600', tab: 'orcamentos' },
                      ].map((action, i) => (
                        <button 
                          key={i}
                          onClick={() => handleTabChange(action.tab)}
                          className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", action.color)}>
                            <action.icon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-black uppercase text-slate-500">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
                    <h3 className="text-sm font-bold mb-4">Dica de Gestão</h3>
                    <p className="text-xs text-blue-100 leading-relaxed mb-6">
                      Mantenha seu estoque atualizado para garantir que os orçamentos reflitam os custos reais de cada obra.
                    </p>
                    <button 
                      onClick={() => handleTabChange('estoque')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all backdrop-blur-sm"
                    >
                      Ver Estoque
                    </button>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Próximas Mensalidades</h3>
                    <div className="space-y-3">
                      {recurringTransactions.slice(0, 3).map((rt) => (
                        <div key={rt.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-xs font-medium text-slate-600">{rt.description}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">Dia {rt.day_of_month}</span>
                        </div>
                      ))}
                      {recurringTransactions.length === 0 && (
                        <p className="text-[10px] text-slate-400 italic text-center py-2">Nenhuma mensalidade próxima.</p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'estoque' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-5 bg-emerald-50 border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Lucro Total da Loja (Vendas)</p>
                      <h4 className="text-2xl font-bold text-emerald-700">{formatCurrency(stats?.totalSalesProfit || 0)}</h4>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-200" />
                  </Card>
                  <Card className="p-5 bg-blue-50 border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase mb-1">Itens em Estoque</p>
                      <h4 className="text-2xl font-bold text-blue-700">{materials.reduce((acc, m) => acc + m.quantity, 0)} un</h4>
                    </div>
                    <Package className="w-8 h-8 text-blue-200" />
                  </Card>
                </div>

                <Card className="p-0">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Buscar material..." 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setFormData({}); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Material
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Material</th>
                          <th className="px-6 py-4">Estoque</th>
                          <th className="px-6 py-4">Custo</th>
                          <th className="px-6 py-4">Venda</th>
                          <th className="px-6 py-4">Lucro Unit.</th>
                          <th className="px-6 py-4">Lucro Total</th>
                          <th className="px-6 py-4">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {materials
                          .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-medium text-slate-800">{m.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase">{m.category}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-bold",
                                m.quantity < 10 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                              )}>
                                {m.quantity} {m.unit}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm">{formatCurrency(m.cost)}</td>
                            <td className="px-6 py-4 text-slate-800 font-bold text-sm">{formatCurrency(m.price)}</td>
                            <td className="px-6 py-4 text-emerald-600 font-medium text-sm">{formatCurrency(m.price - m.cost)}</td>
                            <td className="px-6 py-4 text-emerald-700 font-bold text-sm">{formatCurrency((m.price - m.cost) * m.quantity)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    setFormData({ ...m, mode: 'entrada', movement_qty: 0 });
                                    setIsModalOpen(true);
                                  }}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                  title="Entrada de Estoque"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setFormData({ ...m, mode: 'saida', movement_qty: 0 });
                                    setIsModalOpen(true);
                                  }}
                                  className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                                  title="Saída de Estoque"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setFormData(m);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Editar"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete('materials', m.id, m.name)}
                                  className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'caixa' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 bg-emerald-50 border-emerald-100">
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Total Entradas</p>
                    <h4 className="text-xl font-bold text-emerald-700">
                      {formatCurrency(transactions.filter(t => t.type === 'entrada').reduce((acc, curr) => acc + curr.value, 0))}
                    </h4>
                  </Card>
                  <Card className="p-4 bg-rose-50 border-rose-100">
                    <p className="text-xs font-bold text-rose-600 uppercase mb-1">Total Saídas</p>
                    <h4 className="text-xl font-bold text-rose-700">
                      {formatCurrency(transactions.filter(t => t.type === 'saida').reduce((acc, curr) => acc + curr.value, 0))}
                    </h4>
                  </Card>
                  <Card className="p-4 bg-blue-50 border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Saldo Atual</p>
                    <h4 className="text-xl font-bold text-blue-700">
                      {formatCurrency(transactions.reduce((acc, curr) => acc + (curr.type === 'entrada' ? curr.value : -curr.value), 0))}
                    </h4>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 p-0">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">Movimentações Recentes</h3>
                      <button 
                        onClick={() => { setFormData({ type: 'saida', date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
                      >
                        Nova Movimentação
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4">Categoria</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-slate-600 text-sm">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                  t.type === 'entrada' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                )}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-800 font-medium">{t.description}</td>
                              <td className="px-6 py-4 text-slate-600 text-sm">{t.category}</td>
                              <td className={cn(
                                "px-6 py-4 font-bold",
                                t.type === 'entrada' ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.value)}
                              </td>
                              <td className="px-6 py-4">
                                <button 
                                  onClick={() => handleDelete('transactions', t.id, t.description)}
                                  className="text-rose-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-800">Mensalidades</h3>
                      <button 
                        onClick={() => { 
                          setActiveTab('mensalidades');
                          setFormData({ type: 'saida', day_of_month: 10 }); 
                          setIsModalOpen(true); 
                        }}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        + Adicionar
                      </button>
                    </div>
                    <div className="space-y-4">
                      {recurringTransactions.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4 italic">Nenhuma mensalidade configurada.</p>
                      )}
                      {recurringTransactions.map((rt) => (
                        <div key={rt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-bold text-slate-800">{rt.description}</p>
                            <button 
                              onClick={() => handleDeleteRecurring(rt)}
                              className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 uppercase">Dia {rt.day_of_month} | {rt.category}</span>
                            <span className={cn("text-sm font-bold", rt.type === 'entrada' ? "text-emerald-600" : "text-rose-600")}>
                              {formatCurrency(rt.value)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Total Mensal Fixo</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(recurringTransactions.reduce((acc, curr) => acc + (curr.type === 'entrada' ? curr.value : -curr.value), 0))}
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'obras' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {works.map((w) => (
                  <Card key={w.id} className="p-6 flex flex-col group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        w.status === 'finalizada' ? "bg-emerald-100 text-emerald-600" : 
                        w.status === 'em andamento' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {w.status}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const parsedWork = { ...w };
                            if (typeof parsedWork.materials_used === 'string') {
                              try {
                                parsedWork.materials_used = JSON.parse(parsedWork.materials_used);
                              } catch (e) {
                                parsedWork.materials_used = [];
                              }
                            }
                            // Calculate service_value for the form
                            const materialsTotal = (parsedWork.materials_used || []).reduce((acc: number, curr: any) => acc + ((curr.price || 0) * (curr.quantity || 0)), 0);
                            parsedWork.service_value = parsedWork.total_value - materialsTotal;
                            parsedWork.total_cost = materialsTotal;
                            
                            setFormData(parsedWork);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Menu className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete('works', w.id, w.client_name)}
                          className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{w.client_name}</h3>
                    <div className="flex flex-col gap-1 mb-4">
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {w.address}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {w.date ? format(new Date(w.date), 'dd/MM/yyyy') : 'Sem data'}
                      </p>
                    </div>
                    <div className="space-y-3 mb-6 flex-1">
                      <div className="flex justify-between text-sm p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500">Serviço:</span>
                        <span className="font-medium text-slate-800">{w.service}</span>
                      </div>
                      <div className="flex justify-between text-sm p-2 bg-emerald-50 rounded-lg">
                        <span className="text-emerald-600 font-bold uppercase text-[10px]">Valor do Contrato:</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(w.total_value)}</span>
                      </div>
                      <div className="flex justify-between text-sm p-2 bg-blue-50 rounded-lg">
                        <span className="text-blue-600 font-bold uppercase text-[10px]">Lucro Estimado:</span>
                        <span className="font-bold text-blue-700">{formatCurrency(w.total_value - w.total_cost)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button 
                        onClick={() => generateWorkPDF(w)}
                        className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10"
                      >
                        <Download className="w-3 h-3" /> PDF OBRA
                      </button>
                      <button 
                        onClick={() => generateMaterialSheetPDF(w)}
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-1 shadow-md shadow-blue-500/10"
                      >
                        <Download className="w-3 h-3" /> FOLHA DE MATERIAIS
                      </button>
                    </div>
                  </Card>
                ))}
                <button className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all group">
                  <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="font-bold">Nova Obra</span>
                </button>
              </div>
            )}

            {activeTab === 'orcamentos' && (
              <Card className="p-0">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Orçamentos Gerados</h3>
                  <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Novo Orçamento
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Valor Total</th>
                        <th className="px-6 py-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budgets.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-600 text-sm">{format(new Date(b.date), 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4 font-medium text-slate-800">{b.client_name}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(b.total_value)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => generateBudgetPDF(b)}
                                className="text-emerald-500 hover:text-emerald-700 text-sm font-bold flex items-center gap-1"
                              >
                                <Download className="w-4 h-4" /> PDF
                              </button>
                              <button 
                                onClick={() => handleDelete('budgets', b.id, b.client_name)}
                                className="text-rose-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'vendas' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Nova Venda</h3>
                  <form className="space-y-4" onSubmit={handleAddRecord}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Material</label>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Pesquisar material..."
                            className="w-full p-2 mb-2 bg-slate-100 border border-slate-200 rounded-lg text-sm"
                            onChange={(e) => setMaterialSearch(e.target.value)}
                            value={materialSearch}
                          />
                          <select 
                            required
                            value={formData.material_id || ''}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                            onChange={(e) => {
                              const id = parseInt(e.target.value);
                              const mat = materials.find(m => m.id === id);
                              setFormData({ 
                                ...formData, 
                                material_id: id, 
                                material_name: mat?.name || '',
                                unit_price: mat?.price || 0,
                                total_price: (formData.quantity || 0) * (mat?.price || 0)
                              });
                            }}
                          >
                            <option value="">Selecione um material</option>
                            {materials
                              .filter(m => m.name.toLowerCase().includes(materialSearch.toLowerCase()))
                              .map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} - {formatCurrency(m.price)} (Estoque: {m.quantity})
                                </option>
                              ))
                            }
                          </select>
                          {formErrors.material_id && <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.material_id}</p>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Quantidade</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={formData.quantity || ''}
                          className={cn(
                            "w-full p-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-emerald-500/20",
                            formErrors.quantity ? "border-rose-500" : "border-slate-200"
                          )}
                          placeholder="0.00"
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            setFormData({ 
                              ...formData, 
                              quantity: qty, 
                              total_price: qty * (formData.unit_price || 0) 
                            });
                          }}
                        />
                        {formErrors.quantity && <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.quantity}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Cliente (Opcional)</label>
                        <input 
                          type="text" 
                          value={formData.client || ''}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20" 
                          placeholder="Nome do cliente"
                          onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pagamento</label>
                        <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                          value={formData.payment_method || 'Dinheiro'}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        >
                          <option>Dinheiro</option>
                          <option>PIX</option>
                          <option>Cartão de Crédito</option>
                          <option>Cartão de Débito</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Total da Venda</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(formData.total_price || 0)}</p>
                      </div>
                      <button type="submit" className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                        Finalizar Venda
                      </button>
                    </div>
                  </form>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Vendas Recentes</h3>
                  <div className="space-y-4">
                    {sales.slice(0, 8).map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{s.material_name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{s.client || 'Consumidor'}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency(s.total_price)}</p>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => generateSalePDF(s)}
                              className="text-[10px] text-blue-500 font-bold hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> PDF
                            </button>
                            <button 
                              onClick={() => handleDelete('sales', s.id, s.material_name)}
                              className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'relatorios' && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {['Hoje', 'Semana', 'Mês', 'Ano'].map(f => (
                    <button key={f} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                      {f}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Desempenho de Vendas</h3>
                    <div className="h-[300px] min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <RePieChart>
                          <Pie
                            data={[
                              { name: 'Gesso', value: 400 },
                              { name: 'Estrutura', value: 300 },
                              { name: 'Placas', value: 300 },
                              { name: 'Acessórios', value: 200 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            { [0, 1, 2, 3].map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#f43f5e'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Resumo Financeiro</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Total Vendido', value: stats?.dailySales || 0, color: 'text-blue-600' },
                        { label: 'Total Entradas', value: stats?.dailyInflow || 0, color: 'text-emerald-600' },
                        { label: 'Total Saídas', value: stats?.dailyOutflow || 0, color: 'text-rose-600' },
                        { label: 'Lucro Líquido', value: stats?.dailyProfit || 0, color: 'text-amber-600', bold: true },
                      ].map((item, i) => (
                        <div key={i} className={cn("flex justify-between items-center p-4 rounded-xl bg-slate-50", item.bold && "bg-slate-900 text-white")}>
                          <span className={cn("text-sm font-medium", !item.bold && "text-slate-500")}>{item.label}</span>
                          <span className={cn("text-lg font-bold", item.color, item.bold && "text-white")}>{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                      <Download className="w-4 h-4" /> Exportar Relatório PDF
                    </button>
                  </Card>

                  <Card className="p-6 border-rose-100 bg-rose-50/30">
                    <h3 className="text-sm font-bold text-rose-600 mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <Trash2 className="w-4 h-4" /> Zona de Perigo
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">
                      Esta ação irá apagar permanentemente todos os registros de estoque, vendas, obras, orçamentos e movimentações financeiras. Utilize apenas se desejar reiniciar o sistema do zero.
                    </p>
                    <button 
                      onClick={handleResetSystem}
                      className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                    >
                      Limpar Todo o Sistema
                    </button>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmar Exclusão</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Deseja realmente excluir <strong>"{deleteConfirm.label}"</strong>? Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={confirmDelete}
                      className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal for New Records */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                  <h3 className="text-xl font-bold text-slate-800">
                    {formData.mode === 'entrada' ? 'Entrada de Estoque' : 
                     formData.mode === 'saida' ? 'Saída de Estoque' : 
                     formData.id ? 'Editar Registro' : 'Novo Registro'}: {activeTab === 'mensalidades' ? 'Mensalidade' : activeTab}
                  </h3>
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      if (activeTab === 'mensalidades') setActiveTab('caixa');
                    }} 
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <form className="flex flex-col flex-1 overflow-hidden" onSubmit={handleAddRecord}>
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {activeTab === 'estoque' && (
                    <>
                      {formData.mode ? (
                        <div className="space-y-6">
                          <div className={cn(
                            "p-4 rounded-2xl border flex items-center gap-4",
                            formData.mode === 'entrada' ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                          )}>
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                              formData.mode === 'entrada' ? "bg-emerald-500" : "bg-rose-500"
                            )}>
                              {formData.mode === 'entrada' ? <Plus className="text-white" /> : <Minus className="text-white" />}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Movimentação</p>
                              <h4 className="text-lg font-bold text-slate-800">{formData.mode === 'entrada' ? 'Entrada' : 'Saída'}: {formData.name}</h4>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Estoque Atual</label>
                              <div className="p-3 bg-slate-100 rounded-xl font-bold text-slate-600 border border-slate-200">
                                {formData.quantity} {formData.unit}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Qtd Movimentada</label>
                              <input required type="number" step="0.01" autoFocus value={formData.movement_qty || ''} placeholder="0.00" className={cn("w-full p-3 bg-white border rounded-xl font-bold text-lg", formData.mode === 'entrada' ? "border-emerald-200 focus:ring-emerald-500/20" : "border-rose-200 focus:ring-rose-500/20")} onChange={e => setFormData({...formData, movement_qty: parseFloat(e.target.value)})} />
                            </div>
                          </div>

                          {formData.mode === 'entrada' && (
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="flex items-center gap-2 mb-2">
                                <input type="checkbox" id="record_transaction" className="rounded text-blue-500" checked={formData.record_transaction} onChange={e => setFormData({...formData, record_transaction: e.target.checked})} />
                                <label htmlFor="record_transaction" className="text-xs font-bold text-blue-700 uppercase cursor-pointer">Registrar Saída de Caixa (Compra)</label>
                              </div>
                              {formData.record_transaction && (
                                <div className="space-y-1 mt-3">
                                  <label className="text-[10px] font-bold text-blue-400 uppercase">Custo Unitário da Compra</label>
                                  <input type="number" step="0.01" value={formData.cost || ''} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-sm font-bold text-blue-700" onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Novo Estoque Estimado</p>
                            <p className="text-xl font-black text-slate-800">
                              {formData.mode === 'entrada' 
                                ? (formData.quantity + (formData.movement_qty || 0)) 
                                : (formData.quantity - (formData.movement_qty || 0))} {formData.unit}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <input required type="text" value={formData.name || ''} placeholder="Nome do Material" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.name ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, name: e.target.value})} />
                            {formErrors.name && <p className="text-[10px] text-rose-500 font-bold">{formErrors.name}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <input required type="text" value={formData.category || ''} placeholder="Categoria" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.category ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, category: e.target.value})} />
                              {formErrors.category && <p className="text-[10px] text-rose-500 font-bold">{formErrors.category}</p>}
                            </div>
                            <div className="space-y-1">
                              <input required type="text" value={formData.unit || ''} placeholder="Unidade (Ex: Saco)" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.unit ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, unit: e.target.value})} />
                              {formErrors.unit && <p className="text-[10px] text-rose-500 font-bold">{formErrors.unit}</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Qtd</label>
                              <input required type="number" step="0.01" value={formData.quantity || ''} placeholder="Qtd" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.quantity ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} />
                              {formErrors.quantity && <p className="text-[10px] text-rose-500 font-bold">{formErrors.quantity}</p>}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Custo</label>
                              <input required type="number" step="0.01" value={formData.cost || ''} placeholder="Custo" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.cost ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} />
                              {formErrors.cost && <p className="text-[10px] text-rose-500 font-bold">{formErrors.cost}</p>}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Preço</label>
                              <input required type="number" step="0.01" value={formData.price || ''} placeholder="Preço" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.price ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                              {formErrors.price && <p className="text-[10px] text-rose-500 font-bold">{formErrors.price}</p>}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                    )}
                  {activeTab === 'orcamentos' && (
                    <>
                      <div className="space-y-1">
                        <input required type="text" value={formData.client_name || ''} placeholder="Nome do Cliente" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.client_name ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, client_name: e.target.value})} />
                        {formErrors.client_name && <p className="text-[10px] text-rose-500 font-bold">{formErrors.client_name}</p>}
                      </div>
                      <input required type="text" value={formData.client_phone || ''} placeholder="Telefone" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" onChange={e => setFormData({...formData, client_phone: e.target.value})} />
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Itens do Orçamento</p>
                        <div className="space-y-2">
                          <input type="text" placeholder="Descrição do Item" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" onBlur={e => setFormData({...formData, items: [{name: e.target.value, quantity: 1, price: formData.total_value || 0}]})} />
                          <div className="space-y-1">
                            <input type="number" step="0.01" value={formData.total_value || ''} placeholder="Valor Total" className={cn("w-full p-2 bg-white border rounded-lg text-sm", formErrors.total_value ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, total_value: parseFloat(e.target.value)})} />
                            {formErrors.total_value && <p className="text-[10px] text-rose-500 font-bold">{formErrors.total_value}</p>}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {activeTab === 'obras' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <input required type="text" value={formData.client_name || ''} placeholder="Nome do Cliente" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.client_name ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, client_name: e.target.value})} />
                          {formErrors.client_name && <p className="text-[10px] text-rose-500 font-bold">{formErrors.client_name}</p>}
                        </div>
                        <input required type="date" value={formData.date || new Date().toISOString().split('T')[0]} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" onChange={e => setFormData({...formData, date: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <input required type="text" value={formData.address || ''} placeholder="Endereço" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.address ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, address: e.target.value})} />
                        {formErrors.address && <p className="text-[10px] text-rose-500 font-bold">{formErrors.address}</p>}
                      </div>
                      <div className="space-y-1">
                        <input required type="text" value={formData.service || ''} placeholder="Serviço" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.service ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, service: e.target.value})} />
                        {formErrors.service && <p className="text-[10px] text-rose-500 font-bold">{formErrors.service}</p>}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Total do Contrato</label>
                          <input required type="number" step="0.01" value={formData.total_value || ''} placeholder="Valor Total" className={cn("w-full p-3 bg-emerald-50 border rounded-xl font-bold text-emerald-700", formErrors.total_value ? "border-rose-500" : "border-emerald-200")} onChange={e => setFormData({...formData, total_value: parseFloat(e.target.value)})} />
                          {formErrors.total_value && <p className="text-[10px] text-rose-500 font-bold">{formErrors.total_value}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Status da Obra</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={formData.status || 'orçamento'} onChange={e => setFormData({...formData, status: e.target.value})}>
                            <option value="orçamento">Orçamento</option>
                            <option value="em andamento">Em Andamento</option>
                            <option value="finalizada">Finalizada</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-3">Materiais da Obra (Preço de Venda)</p>
                        <div className="space-y-3">
                          {(formData.materials_used || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <select 
                                className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                value={item.material_id || ''}
                                onChange={(e) => {
                                  const mat = materials.find(m => m.id === parseInt(e.target.value));
                                  const newMaterials = [...(formData.materials_used || [])];
                                  newMaterials[idx] = { ...newMaterials[idx], material_id: mat?.id, name: mat?.name, price: mat?.price };
                                  const materialsTotal = newMaterials.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 0)), 0);
                                  setFormData({ ...formData, materials_used: newMaterials, total_cost: materialsTotal });
                                }}
                              >
                                <option value="">Material</option>
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="Qtd" 
                                  className="w-16 p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                  value={item.quantity || ''}
                                  onChange={(e) => {
                                    const newMaterials = [...(formData.materials_used || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], quantity: parseFloat(e.target.value) };
                                    const materialsTotal = newMaterials.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 0)), 0);
                                    setFormData({ ...formData, materials_used: newMaterials, total_cost: materialsTotal });
                                  }}
                                />
                                <div className="w-24 text-right text-xs font-bold text-slate-600">
                                  {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  const newMaterials = formData.materials_used.filter((_: any, i: number) => i !== idx);
                                  const materialsTotal = newMaterials.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 0)), 0);
                                  setFormData({ ...formData, materials_used: newMaterials, total_cost: materialsTotal });
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, materials_used: [...(formData.materials_used || []), { material_id: null, quantity: 1, price: 0 }] })}
                            className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-xs font-bold text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all"
                          >
                            + Adicionar Material
                          </button>
                        </div>
                        {formData.materials_used?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Materiais:</span>
                            <span className="font-bold text-slate-800">
                              {formatCurrency(formData.total_cost || 0)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-blue-600 uppercase">Lucro Estimado (Líquido):</span>
                        <span className="text-xl font-bold text-blue-700">
                          {formatCurrency(
                            (formData.total_value || 0) - 
                            (formData.total_cost || 0)
                          )}
                        </span>
                      </div>
                    </>
                  )}
                    {activeTab === 'mensalidades' && (
                      <>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                          <p className="text-xs text-blue-700 font-medium">
                            As mensalidades são geradas automaticamente todo mês no dia selecionado.
                          </p>
                        </div>
                        <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={formData.type || 'saida'} onChange={e => setFormData({...formData, type: e.target.value})}>
                          <option value="entrada">Entrada Recorrente</option>
                          <option value="saida">Saída Recorrente (Despesa Fixa)</option>
                        </select>
                        <div className="space-y-1">
                          <input required type="text" value={formData.description || ''} placeholder="Descrição (Ex: Aluguel, Internet)" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.description ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, description: e.target.value})} />
                          {formErrors.description && <p className="text-[10px] text-rose-500 font-bold">{formErrors.description}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <input required type="text" value={formData.category || ''} placeholder="Categoria" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.category ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, category: e.target.value})} />
                            {formErrors.category && <p className="text-[10px] text-rose-500 font-bold">{formErrors.category}</p>}
                          </div>
                          <div className="space-y-1">
                            <input required type="number" min="1" max="31" value={formData.day_of_month || ''} placeholder="Dia do Mês" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.day_of_month ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, day_of_month: parseInt(e.target.value)})} />
                            {formErrors.day_of_month && <p className="text-[10px] text-rose-500 font-bold">{formErrors.day_of_month}</p>}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <input required type="number" step="0.01" value={formData.value || ''} placeholder="Valor Mensal" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.value ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
                          {formErrors.value && <p className="text-[10px] text-rose-500 font-bold">{formErrors.value}</p>}
                        </div>
                      </>
                    )}
                    {activeTab === 'caixa' && (
                      <>
                        <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={formData.type || 'entrada'} onChange={e => setFormData({...formData, type: e.target.value})}>
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                        </select>
                        <div className="space-y-1">
                          <input required type="text" value={formData.description || ''} placeholder="Descrição" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.description ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, description: e.target.value})} />
                          {formErrors.description && <p className="text-[10px] text-rose-500 font-bold">{formErrors.description}</p>}
                        </div>
                        <div className="space-y-1">
                          <input required type="text" value={formData.category || ''} placeholder="Categoria" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.category ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, category: e.target.value})} />
                          {formErrors.category && <p className="text-[10px] text-rose-500 font-bold">{formErrors.category}</p>}
                        </div>
                        <div className="space-y-1">
                          <input required type="number" step="0.01" value={formData.value || ''} placeholder="Valor" className={cn("w-full p-3 bg-slate-50 border rounded-xl", formErrors.value ? "border-rose-500" : "border-slate-200")} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
                          {formErrors.value && <p className="text-[10px] text-rose-500 font-bold">{formErrors.value}</p>}
                        </div>
                        <input required type="date" value={formData.date ? formData.date.split('T')[0] : ''} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" onChange={e => setFormData({...formData, date: e.target.value})} />
                      </>
                    )}
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20">
                      Salvar Registro
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
