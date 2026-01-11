
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, UserProfile, StoreProduct, Transaction, Sale, SHUPool, MemberSHU } from './types';
import { ADMIN_MENU, MEMBER_MENU } from './constants';
import { 
  Menu, X, LogOut, Plus, Search, Trash2, 
  Store, Wallet, Users, PieChart, FileText,
  UserCircle, ShoppingCart, Receipt, 
  Wallet2, CloudLightning, RefreshCw, Zap, Lock, Camera, 
  Package, Banknote, Gift, Copy, CheckCircle2, AlertCircle,
  Database, Trash
} from 'lucide-react';

// --- UTILS ---
const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID').format(amount);
};

// --- INITIAL DATA ---
const INITIAL_MEMBERS: UserProfile[] = [
  { 
    id: 'ADM001', 
    name: 'Admin Utama', 
    role: UserRole.ADMIN, 
    phone: '085892156602', 
    email: 'ubmqi212@gmail.com', 
    password: 'Admin123',
    status: 'Aktif', 
    address: 'Kantor Pusat UB. Qurrotul \'Ibaad', 
    joinedDate: new Date().toISOString().split('T')[0], 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' 
  },
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // --- SYNC STATE ---
  const [syncId, setSyncId] = useState(() => localStorage.getItem('ub_sync_id') || '');

  // --- APP STATE ---
  const [members, setMembers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('ub_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });
  const [products, setProducts] = useState<StoreProduct[]>(() => {
    const saved = localStorage.getItem('ub_products');
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('ub_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('ub_sales');
    return saved ? JSON.parse(saved) : [];
  });
  const [shuPool, setShuPool] = useState<SHUPool>(() => {
    const saved = localStorage.getItem('ub_shupool');
    return saved ? JSON.parse(saved) : { jasaModal: 0, jasaTransaksi: 0, pengurus: 0, cadanganModal: 0, infaqMQI: 0 };
  });
  const [memberShu, setMemberShu] = useState<MemberSHU[]>(() => {
    const saved = localStorage.getItem('ub_membershu');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_MEMBERS[0]);

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('ub_members', JSON.stringify(members)); }, [members]);
  useEffect(() => { localStorage.setItem('ub_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('ub_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('ub_sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('ub_shupool', JSON.stringify(shuPool)); }, [shuPool]);
  useEffect(() => { localStorage.setItem('ub_membershu', JSON.stringify(memberShu)); }, [memberShu]);
  useEffect(() => { localStorage.setItem('ub_sync_id', syncId); }, [syncId]);

  const menu = useMemo(() => role === UserRole.ADMIN ? ADMIN_MENU : MEMBER_MENU, [role]);

  // --- CLOUD SYNC LOGIC ---
  const handlePushToCloud = async () => {
    setIsSyncing(true);
    try {
      const fullData = { 
        app_signature: "UB_MQI_OFFICIAL",
        members, 
        products, 
        transactions, 
        sales, 
        shuPool, 
        memberShu,
        lastUpdated: new Date().toISOString()
      };
      
      const url = syncId ? `https://api.npoint.io/${syncId}` : 'https://api.npoint.io/';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData)
      });

      if (!response.ok) throw new Error("Server Cloud menolak permintaan.");
      
      const result = await response.json();
      
      if (!syncId && result.id) {
        setSyncId(result.id);
        alert(`BERHASIL MENDAFTAR!\n\nKODE CLOUD ANDA: ${result.id}\n\nGunakan kode ini di HP lain untuk menarik data.`);
      } else {
        alert("Sinkronisasi Berhasil! Data di Cloud sudah diperbarui.");
      }
    } catch (err: any) {
      alert("GAGAL MENGIRIM DATA: " + err.message);
    } finally { setIsSyncing(false); }
  };

  const handleFetchFromCloud = async (targetSyncId: string) => {
    const cleanId = targetSyncId.trim();
    if (!cleanId || cleanId.length < 5) { 
      alert("Kode Sinkronisasi tidak valid."); 
      return false; 
    }
    
    setIsSyncing(true);
    try {
      const res = await fetch(`https://api.npoint.io/${cleanId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Kode Salah atau Data sudah kedaluwarsa.");
        throw new Error("Gagal menghubungi server.");
      }
      
      const data = await res.json();
      
      // Validasi apakah ini data aplikasi kita
      if (data.app_signature !== "UB_MQI_OFFICIAL") {
        throw new Error("Kode ini bukan milik database UB MQI.");
      }
      
      // Update local state with cloud data
      setMembers(data.members || INITIAL_MEMBERS);
      setProducts(data.products || []);
      setTransactions(data.transactions || []);
      setSales(data.sales || []);
      setShuPool(data.shuPool || { jasaModal: 0, jasaTransaksi: 0, pengurus: 0, cadanganModal: 0, infaqMQI: 0 });
      setMemberShu(data.memberShu || []);
      setSyncId(cleanId);
      
      alert("SINKRONISASI BERHASIL!\nSeluruh data terbaru telah dimuat ke perangkat ini.");
      return true;
    } catch (err: any) {
      alert("ERROR: " + err.message);
      return false;
    } finally { setIsSyncing(false); }
  };

  const resetSyncId = () => {
    if (window.confirm("Hapus kode sinkronisasi? Anda harus mendaftar ulang jika ingin menggunakan cloud lagi.")) {
      setSyncId('');
      localStorage.removeItem('ub_sync_id');
    }
  };

  // --- BUSINESS LOGIC ---
  const distributeSHU = (netProfit: number, memberId: string) => {
    const alloc = {
      jasaModal: Math.round(netProfit * 0.30),
      jasaTransaksi: Math.round(netProfit * 0.20),
      pengurus: Math.round(netProfit * 0.15),
      cadanganModal: Math.round(netProfit * 0.25),
      infaqMQI: Math.round(netProfit * 0.10),
    };
    setShuPool(prev => ({
      jasaModal: prev.jasaModal + alloc.jasaModal,
      jasaTransaksi: prev.jasaTransaksi + alloc.jasaTransaksi,
      pengurus: prev.pengurus + alloc.pengurus,
      cadanganModal: prev.cadanganModal + alloc.cadanganModal,
      infaqMQI: prev.infaqMQI + alloc.infaqMQI,
    }));
    setMemberShu(prev => {
      const idx = prev.findIndex(m => m.memberId === memberId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], jasaTransaksi: updated[idx].jasaTransaksi + alloc.jasaTransaksi };
        return updated;
      }
      return [...prev, { memberId, jasaModal: 0, jasaTransaksi: alloc.jasaTransaksi }];
    });
  };

  const handleWithdrawSHU = (memberId: string, amount: number) => {
    const mShu = memberShu.find(ms => ms.memberId === memberId);
    if (!mShu) return;
    const availableTotal = mShu.jasaModal + mShu.jasaTransaksi;
    if (amount > availableTotal) { alert("Saldo SHU tidak cukup."); return; }
    
    setMemberShu(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(ms => ms.memberId === memberId);
      let rem = amount;
      if (updated[idx].jasaModal >= rem) {
        updated[idx].jasaModal -= rem;
      } else {
        rem -= updated[idx].jasaModal;
        updated[idx].jasaModal = 0;
        updated[idx].jasaTransaksi -= rem;
      }
      return updated;
    });

    const mName = members.find(m => m.id === memberId)?.name || 'Anggota';
    setTransactions(prev => [...prev, {
      id: `WTH-SHU-${Date.now()}`,
      type: 'KREDIT',
      description: `Pencairan SHU: ${mName}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      category: 'SHU'
    }]);
    alert("Pencairan SHU berhasil!");
  };

  const recordFinancials = (sale: Sale) => {
    const profit = sale.total - sale.hpp;
    const opCost = Math.round(profit * 0.20);
    const netProfit = profit - opCost;
    
    setProducts(prev => prev.map(p => {
      const item = sale.items.find(si => si.productId === p.id);
      return item ? { ...p, stock: p.stock - item.qty } : p;
    }));

    if (sale.paymentStatus === 'Lunas') {
      const newTrxs: Transaction[] = [
        { id: `T-INC-${Date.now()}`, type: 'DEBIT', description: `Penjualan: ${sale.id} (${sale.memberName})`, amount: sale.total, date: sale.date, category: 'Penjualan' },
        { id: `T-OP-${Date.now()}`, type: 'KREDIT', description: `Biaya Ops (20%): ${sale.id}`, amount: opCost, date: sale.date, category: 'Biaya Operasional' }
      ];
      setTransactions(prev => [...prev, ...newTrxs]);
      distributeSHU(netProfit, sale.memberId);
    }
  };

  const handleLogin = (user: UserProfile) => { setCurrentUser(user); setRole(user.role); setIsAuthenticated(true); setActiveTab('dashboard'); };
  const handleLogout = () => { setIsAuthenticated(false); setIsSidebarOpen(false); };

  const renderContent = () => {
    const common = { 
      role, members, setMembers, products, setProducts, transactions, 
      setTransactions, sales, setSales, user: currentUser, 
      shuPool, memberShu, setActiveTab, syncId, handlePushToCloud, isSyncing,
      onWithdrawSHU: handleWithdrawSHU, resetSyncId
    };
    switch (activeTab) {
      case 'dashboard': return <DashboardView {...common} />;
      case 'anggota': 
      case 'sahabat': return <AnggotaView {...common} />;
      case 'simpanan':
      case 'simpanan-saya': return <SimpananView {...common} />;
      case 'store': return <StoreView {...common} onCheckout={(s: Sale) => { setSales(prev => [...prev, s]); recordFinancials(s); }} />;
      case 'kas': return <KasView {...common} />;
      case 'keuangan': return <KeuanganView {...common} />;
      case 'shu':
      case 'shu-saya': return <SHUView {...common} />;
      case 'hutang-saya': return <HutangView {...common} onPay={(saleId: string) => {
        const sale = sales.find(s => s.id === saleId);
        if (sale) {
          setSales(prev => prev.map(s => s.id === saleId ? { ...s, paymentStatus: 'Lunas' } : s));
          const profit = sale.total - sale.hpp;
          const opCost = Math.round(profit * 0.20);
          const netProfit = profit - opCost;
          setTransactions(prev => [...prev, { id: `T-PAY-${Date.now()}`, type: 'DEBIT', description: `Lunas Piutang: ${sale.id}`, amount: sale.total, date: new Date().toISOString().split('T')[0], category: 'Penjualan' }]);
          distributeSHU(netProfit, sale.memberId);
          alert("Piutang lunas!");
        }
      }} />;
      case 'profil': return <ProfilView user={currentUser} onUpdate={(u: UserProfile) => { setCurrentUser(u); setMembers(members.map(m => m.id === u.id ? u : m)); }} />;
      default: return <div className="p-8 text-center text-slate-400">Halaman sedang dikembangkan.</div>;
    }
  };

  if (!isAuthenticated) return <LoginScreen members={members} onLogin={handleLogin} onSync={handleFetchFromCloud} isSyncing={isSyncing} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:pl-64">
      <header className="fixed top-0 left-0 right-0 h-16 bg-emerald-700 text-white flex items-center justify-between px-4 z-40 md:hidden shadow-md">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 active:scale-95"><Menu size={24} /></button>
        <h1 className="font-bold text-lg tracking-tight">UB. Qurrotul 'Ibaad</h1>
        <div className="w-10"></div>
      </header>

      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 overflow-y-auto hide-scrollbar`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-emerald-700 text-white">
          <span className="font-black text-xl tracking-tight">UB. MQI</span>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X size={24} /></button>
        </div>
        <div className="p-4 flex flex-col min-h-[calc(100%-4rem)]">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl mb-6 border border-emerald-100">
            <img src={currentUser.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-sm border-2 border-white" />
            <div className="overflow-hidden">
              <p className="font-bold text-slate-800 truncate text-sm leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-emerald-600 font-black uppercase mt-0.5 tracking-widest">{role}</p>
            </div>
          </div>
          <nav className="space-y-1 flex-1">
            {menu.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors"><LogOut size={18} /> Keluar</button>
          </div>
        </div>
      </aside>

      <main className="pt-20 px-4 pb-24 md:pt-10 md:px-12 max-w-6xl mx-auto animate-in fade-in duration-500">
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 md:hidden z-40 safe-bottom shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {menu.slice(0, 4).map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 w-full transition-all ${activeTab === item.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-500'}`}>
            {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

// --- COMPONENTS ---

const Modal: React.FC<{ title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto hide-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const LoginScreen: React.FC<any> = ({ members, onLogin, onSync, isSyncing }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncCode, setSyncCode] = useState('');

  return (
    <div className="min-h-screen bg-emerald-700 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-in zoom-in duration-500">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-[2.2rem] mb-4 text-emerald-600 shadow-inner"><Store size={40} /></div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">UB. MQI</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Qurrotul 'Ibaad Management</p>
        </div>
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const u = members.find((m:any) => m.email === email && m.password === password); 
          if(u) onLogin(u); else alert('Email atau Password salah!'); 
        }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Email</label>
            <input type="email" placeholder="email@gmail.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-emerald-500 transition-colors font-medium" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-emerald-500 transition-colors font-medium" required />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all uppercase tracking-widest">MASUK</button>
        </form>
        <div className="pt-6 border-t text-center">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3 flex items-center justify-center gap-2"><CloudLightning size={12} /> Tarik Data Dari Cloud</p>
          <div className="flex gap-2">
            <input 
                placeholder="KODE SYNC" 
                value={syncCode} 
                onChange={e=>setSyncCode(e.target.value)} 
                className="flex-1 p-3 bg-slate-50 border rounded-xl text-center font-black uppercase text-xs tracking-widest focus:border-emerald-500 outline-none" 
            />
            <button 
                onClick={() => onSync(syncCode)} 
                disabled={isSyncing} 
                className="bg-slate-800 text-white p-3 rounded-xl active:scale-90 disabled:opacity-50 shadow-md"
                title="Tarik Data Cloud"
            >
              <RefreshCw className={isSyncing ? "animate-spin" : ""} size={18} />
            </button>
          </div>
          <p className="text-[8px] text-slate-400 italic mt-2">*Masukkan kode sinkronisasi untuk memuat database terbaru.</p>
        </div>
      </div>
    </div>
  );
};

const DashboardView: React.FC<any> = ({ transactions, members, sales, role, user, syncId, handlePushToCloud, isSyncing, setActiveTab, resetSyncId }) => {
  const isAdmin = role === UserRole.ADMIN;
  const cash = useMemo(() => transactions.filter(t => t.category !== 'HPP').reduce((acc: number, t: any) => t.type === 'DEBIT' ? acc + t.amount : acc - t.amount, 0), [transactions]);
  const receivables = useMemo(() => sales.filter(s => s.paymentStatus === 'Piutang').reduce((acc: number, s: any) => acc + s.total, 0), [sales]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Kode berhasil disalin!");
  };

  if (isAdmin) {
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
        <div className="bg-emerald-700 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 p-4 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Wallet2 size={240} /></div>
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Kas Utama</p>
          <h2 className="text-5xl font-black mt-2 tracking-tighter">Rp {formatIDR(cash)}</h2>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-emerald-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${syncId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <CloudLightning size={24} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Status Cloud</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {syncId ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> ID: {syncId}</span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><AlertCircle size={12} /> Belum Sinkron</span>
                  )}
                </div>
              </div>
            </div>
            {syncId && <button onClick={resetSyncId} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="Hapus Kode"><Trash size={18} /></button>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button 
              onClick={handlePushToCloud} 
              disabled={isSyncing} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={isSyncing ? "animate-spin" : ""} size={16} /> 
              {syncId ? 'UPDATE DATA KE CLOUD' : 'DAFTARKAN DATABASE BARU'}
            </button>
            
            {syncId && (
              <button 
                onClick={() => copyToClipboard(syncId)}
                className="bg-slate-800 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Copy size={16} /> SALIN KODE CLOUD
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center shadow-sm">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.8rem] mb-3 shadow-inner"><Users size={24} /></div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Anggota</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{members.length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center shadow-sm">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-[1.8rem] mb-3 shadow-inner"><Receipt size={24} /></div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Piutang Toko</p>
            <p className="text-2xl font-black text-rose-600 mt-1">Rp {formatIDR(receivables)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 py-2">
        <img src={user.avatar} className="w-16 h-16 rounded-[2rem] border-4 border-white shadow-xl object-cover" />
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Halo, {user.name.split(' ')[0]}!</h2>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Anggota UB. MQI</p>
        </div>
      </div>
      <div className="bg-emerald-700 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700"><Zap size={100} /></div>
        <h3 className="text-xl font-black leading-tight">Pantau Keuangan</h3>
        <p className="text-sm text-emerald-50 font-medium mt-2 opacity-90">Lihat saldo simpanan, hutang, dan SHU secara langsung di HP Anda.</p>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setActiveTab('store')} className="bg-white text-emerald-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">BELANJA <ShoppingCart size={14} /></button>
          <button onClick={() => setActiveTab('simpanan-saya')} className="bg-emerald-800/50 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 border border-emerald-500/30">SIMPANAN</button>
        </div>
      </div>
    </div>
  );
};

const AnggotaView: React.FC<any> = ({ members, setMembers, role }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isAdmin = role === UserRole.ADMIN;
  const filtered = members.filter((m:any) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-slate-800">Anggota</h2>{isAdmin && <button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 active:scale-95"><Plus size={18} /> TAMBAH</button>}</div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input placeholder="Cari nama anggota..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm outline-none focus:border-emerald-500 transition-colors" />
      </div>
      <div className="grid gap-4">
        {filtered.map((m: any) => (
          <div key={m.id} className="bg-white p-5 rounded-[2.2rem] flex items-center gap-4 border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
            <img src={m.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`} className="w-14 h-14 rounded-[1.4rem] border border-slate-50 object-cover shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-slate-800 text-sm leading-tight">{m.name}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">{m.id} • {m.role}</p>
            </div>
            {isAdmin && m.id !== 'ADM001' && (
              <button className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" onClick={() => { if(window.confirm('Hapus anggota ini?')) setMembers(members.filter((mb:any)=>mb.id !== m.id)); }}><Trash2 size={18} /></button>
            )}
          </div>
        ))}
      </div>
      <Modal title="Anggota Baru" isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const fd = new FormData(e.currentTarget); 
          const nm: UserProfile = { 
            id: fd.get('id') as string, 
            name: fd.get('name') as string, 
            email: fd.get('email') as string, 
            phone: fd.get('phone') as string, 
            password: fd.get('password') as string, 
            role: fd.get('role') as UserRole, 
            status: 'Aktif', 
            address: fd.get('address') as string, 
            joinedDate: new Date().toISOString().split('T')[0], 
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fd.get('id')}` 
          }; 
          setMembers([...members, nm]); setIsAddOpen(false); 
        }} className="space-y-4">
          <input name="id" placeholder="ID (Contoh: AG001)" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          <input name="name" placeholder="Nama Lengkap" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          <input name="email" type="email" placeholder="Email Login" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          <input name="password" placeholder="Password Login" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          <input name="phone" placeholder="WhatsApp (08...)" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          <select name="role" className="w-full p-4 bg-slate-50 border rounded-xl font-bold focus:border-emerald-500 outline-none"><option value={UserRole.ANGGOTA}>ANGGOTA</option><option value={UserRole.ADMIN}>ADMIN</option></select>
          <textarea name="address" placeholder="Alamat Lengkap" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" rows={2} required />
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg uppercase tracking-widest">SIMPAN</button>
        </form>
      </Modal>
    </div>
  );
};

const SimpananView: React.FC<any> = ({ transactions, setTransactions, user, role, members }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const isAdmin = role === UserRole.ADMIN;
  const filtered = transactions.filter((t: any) => t.category === 'Simpanan');
  const displayData = isAdmin ? filtered : filtered.filter((t: any) => t.description.includes(user.name));
  const total = displayData.reduce((acc: number, t: any) => t.type === 'DEBIT' ? acc + t.amount : acc - t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-slate-800">Simpanan</h2>{isAdmin && <button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 active:scale-95"><Plus size={18} /> INPUT DANA</button>}</div>
      <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
        <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest opacity-80">Total Saldo {isAdmin ? 'UB' : 'Tabungan Saya'}</p>
        <h3 className="text-4xl font-black mt-1 tracking-tight">Rp {formatIDR(total)}</h3>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 divide-y overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">Riwayat</div>
        {displayData.slice().reverse().map((t: any) => (
          <div key={t.id} className="p-6 flex justify-between items-center text-xs hover:bg-slate-50 transition-colors">
            <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{t.description}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{t.date}</p>
            </div>
            <p className={`font-black ${t.type === 'DEBIT' ? 'text-emerald-600' : 'text-rose-600'} text-base`}>
                {t.type === 'DEBIT' ? '+' : '-'} Rp {formatIDR(t.amount)}
            </p>
          </div>
        ))}
      </div>
      <Modal title="Input Simpanan" isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <form onSubmit={(e) => { 
          e.preventDefault(); const fd = new FormData(e.currentTarget); 
          const mId = fd.get('mId'); const mName = members.find((m:any)=>m.id === mId)?.name; 
          setTransactions([...transactions, { 
            id: `SAV-${Date.now()}`, type: fd.get('type') as any, category: 'Simpanan', 
            description: `[${fd.get('subType')}] ${mName}`, amount: parseInt(fd.get('amount') as string), date: fd.get('date') as string
          }]); 
          setIsAddOpen(false); 
        }} className="space-y-4">
          <input type="date" name="date" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" defaultValue={new Date().toISOString().split('T')[0]} />
          <select name="mId" className="w-full p-4 bg-slate-50 border rounded-xl font-bold">{members.map((m:any)=>(<option key={m.id} value={m.id}>{m.name}</option>))}</select>
          <div className="grid grid-cols-2 gap-4">
            <select name="type" className="w-full p-4 bg-slate-50 border rounded-xl font-bold"><option value="DEBIT">Masuk</option><option value="KREDIT">Keluar</option></select>
            <select name="subType" className="w-full p-4 bg-slate-50 border rounded-xl font-bold"><option value="Wajib">Wajib</option><option value="Pokok">Pokok</option><option value="Sukarela">Sukarela</option></select>
          </div>
          <input name="amount" type="number" placeholder="Nominal" className="w-full p-4 bg-slate-50 border rounded-xl font-black text-lg focus:border-emerald-500 outline-none" required />
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg uppercase tracking-widest">SIMPAN</button>
        </form>
      </Modal>
    </div>
  );
};

const StoreView: React.FC<any> = ({ products, setProducts, members, onCheckout, role }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPOSOpen, setIsPOSOpen] = useState(false);
  const [cart, setCart] = useState<{ product: StoreProduct, qty: number }[]>([]);
  const isAdmin = role === UserRole.ADMIN;
  const cartTotal = cart.reduce((acc, item) => acc + (item.product.sellPrice * item.qty), 0);
  const cartHPP = cart.reduce((acc, item) => acc + (item.product.buyPrice * item.qty), 0);
  
  const addToCart = (p: StoreProduct) => {
    if (p.stock <= 0) { alert('Stok Habis!'); return; }
    setCart(prev => {
      const ex = prev.find(item => item.product.id === p.id);
      if (ex) return prev.map(item => item.product.id === p.id ? { ...item, qty: Math.min(item.qty + 1, p.stock) } : item);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const removeFromCart = (pId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== pId));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-slate-800">UB. Store</h2>{isAdmin && (<div className="flex gap-2"><button onClick={() => setIsAddOpen(true)} className="p-3 bg-white text-emerald-600 rounded-2xl border border-slate-100 shadow-sm active:scale-90"><Package size={20} /></button><button onClick={() => setIsPOSOpen(true)} className="relative bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 active:scale-95"><ShoppingCart size={18} /> KASIR {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">{cart.length}</span>}</button></div>)}</div>
      <div className="grid grid-cols-2 gap-4">
        {products.map((p: StoreProduct) => (
          <div key={p.id} className="bg-white p-3 rounded-[2.2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="aspect-square bg-slate-50 rounded-[1.8rem] mb-3 flex items-center justify-center overflow-hidden border border-slate-50">
              <img src={p.image || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" alt={p.name} />
            </div>
            <p className="font-bold text-slate-800 text-sm truncate px-1">{p.name}</p>
            <p className="text-emerald-700 font-black text-xs px-1">Rp {formatIDR(p.sellPrice)}</p>
            <div className="flex justify-between items-center mt-3 px-1">
              <span className={`text-[9px] font-black px-2 py-1 rounded-full ${p.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{p.stock > 0 ? `STOK: ${p.stock}` : 'HABIS'}</span>
              {isAdmin && <button onClick={() => addToCart(p)} className="p-2 text-emerald-600 bg-emerald-50 rounded-xl active:scale-90 transition-transform"><Plus size={18} /></button>}
            </div>
          </div>
        ))}
      </div>
      <Modal title="Produk Baru" isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <form onSubmit={(e) => { 
          e.preventDefault(); const fd = new FormData(e.currentTarget); 
          const np: StoreProduct = { 
            id: `P-${Date.now()}`, name: fd.get('name') as string, buyPrice: parseInt(fd.get('buyPrice') as string), 
            sellPrice: parseInt(fd.get('sellPrice') as string), stock: parseInt(fd.get('stock') as string), 
            category: fd.get('category') as string, image: `https://api.dicebear.com/7.x/initials/svg?seed=${fd.get('name')}` 
          }; 
          setProducts([...products, np]); setIsAddOpen(false); 
        }} className="space-y-4">
          <input name="name" placeholder="Nama Barang" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          <div className="grid grid-cols-2 gap-4">
            <input name="buyPrice" type="number" placeholder="Harga Beli" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
            <input name="sellPrice" type="number" placeholder="Harga Jual" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          </div>
          <input name="stock" type="number" placeholder="Stok Awal" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg">SIMPAN</button>
        </form>
      </Modal>
      <Modal title="Kasir" isOpen={isPOSOpen} onClose={() => setIsPOSOpen(false)}>
        <div className="space-y-4">
          <div className="divide-y max-h-[35vh] overflow-y-auto pr-2 hide-scrollbar">
            {cart.map((item, idx) => (
              <div key={idx} className="py-4 flex justify-between items-center text-xs">
                <div><p className="font-bold text-slate-800 text-sm">{item.product.name}</p><p className="text-[10px] text-slate-400 font-bold mt-1">{item.qty} x Rp {formatIDR(item.product.sellPrice)}</p></div>
                <div className="flex items-center gap-3">
                    <p className="font-black text-emerald-600 text-sm">Rp {formatIDR(item.product.sellPrice * item.qty)}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-rose-400 p-2 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-emerald-50 p-6 rounded-2xl flex justify-between items-center border border-emerald-100 shadow-inner">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Total Belanja</span>
            <span className="text-2xl font-black text-emerald-700">Rp {formatIDR(cartTotal)}</span>
          </div>
          <form onSubmit={(e) => { 
            e.preventDefault(); if (cart.length === 0) return;
            const fd = new FormData(e.currentTarget); const memberId = fd.get('memberId') as string; 
            const member = members.find((m: any) => m.id === memberId); 
            onCheckout({ 
              id: `SALE-${Date.now()}`, memberId, memberName: member?.name || 'Umum', 
              items: cart.map(c => ({ productId: c.product.id, name: c.product.name, qty: c.qty, price: c.product.sellPrice })), 
              total: cartTotal, hpp: cartHPP, paymentStatus: fd.get('paymentStatus') as any, date: new Date().toISOString().split('T')[0], isSHUDistributed: false 
            }); 
            setCart([]); setIsPOSOpen(false); 
          }} className="space-y-4">
            <select name="memberId" className="w-full p-4 bg-white border border-slate-100 rounded-xl font-bold focus:border-emerald-500 outline-none" required><option value="">-- Pilih Anggota --</option>{members.map((m: any) => (<option key={m.id} value={m.id}>{m.name}</option>))}</select>
            <select name="paymentStatus" className="w-full p-4 bg-white border border-slate-100 rounded-xl font-bold focus:border-emerald-500 outline-none" required><option value="Lunas">Tunai (Lunas)</option><option value="Piutang">Hutang (Piutang)</option></select>
            <button type="submit" disabled={cart.length === 0} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl uppercase tracking-widest">BAYAR</button>
          </form>
        </div>
      </Modal>
    </div>
  );
};

const KasView: React.FC<any> = ({ transactions, setTransactions }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const data = useMemo(() => transactions.filter((t: any) => t.category !== 'HPP'), [transactions]);
  const balance = data.reduce((acc: number, t: any) => t.type === 'DEBIT' ? acc + t.amount : acc - t.amount, 0);
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-slate-800">Kas Umum</h2><button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg active:scale-95 transition-all"><Plus size={18} /> INPUT KAS</button></div>
      <div className="bg-slate-800 p-8 rounded-[2.5rem] text-white shadow-xl text-center relative overflow-hidden">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Saldo Kas Utama</p>
          <h3 className="text-4xl font-black mt-2 tracking-tighter">Rp {formatIDR(balance)}</h3>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 divide-y overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">Aliran Dana</div>
        {data.slice().reverse().map((t: any) => (
          <div key={t.id} className="p-6 flex justify-between items-center text-xs hover:bg-slate-50 transition-colors">
            <div><p className="font-bold text-slate-800 text-sm">{t.description}</p><p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{t.category} • {t.date}</p></div>
            <p className={`font-black ${t.type === 'DEBIT' ? 'text-emerald-600' : 'text-rose-600'} text-base`}>{t.type === 'DEBIT' ? '+' : '-'} Rp {formatIDR(t.amount)}</p>
          </div>
        ))}
      </div>
      <Modal title="Input Transaksi Kas" isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <form onSubmit={(e) => { 
          e.preventDefault(); const fd = new FormData(e.currentTarget); 
          setTransactions([...transactions, { 
            id: `TRX-${Date.now()}`, type: fd.get('type') as any, description: fd.get('description') as string, 
            amount: parseInt(fd.get('amount') as string), date: new Date().toISOString().split('T')[0], category: 'Lainnya' 
          }]); 
          setIsAddOpen(false); 
        }} className="space-y-4">
          <select name="type" className="w-full p-4 bg-slate-50 border rounded-xl font-bold focus:border-emerald-500 outline-none"><option value="DEBIT">Kas Masuk</option><option value="KREDIT">Kas Keluar</option></select>
          <input name="description" placeholder="Keterangan" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" required />
          <input name="amount" type="number" placeholder="Nominal" className="w-full p-4 bg-slate-50 border rounded-xl font-black text-lg focus:border-emerald-500 outline-none" required />
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg uppercase tracking-widest">SIMPAN</button>
        </form>
      </Modal>
    </div>
  );
};

const KeuanganView: React.FC<any> = ({ transactions, products, sales, shuPool }) => {
  const [tab, setTab] = useState('neraca');
  const stats = useMemo(() => {
    const totalPenjualan = sales.reduce((acc: number, s: any) => acc + s.total, 0);
    const totalHPP = sales.reduce((acc: number, s: any) => acc + s.hpp, 0);
    const totalBebanOps = transactions.filter((t: any) => t.category === 'Biaya Operasional').reduce((acc: number, t: any) => acc + t.amount, 0);
    const labaBersih = totalPenjualan - totalHPP - totalBebanOps;
    const kas = transactions.filter(t => t.category !== 'HPP').reduce((acc: number, t: any) => t.type === 'DEBIT' ? acc + t.amount : acc - t.amount, 0);
    const piutang = sales.filter(s => s.paymentStatus === 'Piutang').reduce((acc: number, s: any) => acc + s.total, 0);
    const simpanan = transactions.filter(t => t.category === 'Simpanan').reduce((acc: number, t: any) => t.type === 'DEBIT' ? acc + t.amount : acc - t.amount, 0);
    const shu = (Object.values(shuPool) as number[]).reduce((a, b) => a + b, 0);
    const inv = products.reduce((acc: number, p: any) => acc + (p.stock * p.buyPrice), 0);
    return { totalPenjualan, totalHPP, totalBebanOps, labaBersih, kas, piutang, simpanan, shu, inv };
  }, [transactions, sales, shuPool, products]);
  
  const Row = ({ l, v, b=false, n=false }: any) => (<div className={`flex justify-between py-3 text-xs ${b ? 'font-black text-slate-800 border-t border-slate-100 mt-2' : 'text-slate-600'}`}><span>{l}</span><span>{n ? '-' : ''} Rp {formatIDR(v)}</span></div>);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800">Laporan Keuangan</h2>
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
        {['neraca', 'labarugi'].map(t => (<button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>{t === 'neraca' ? 'Neraca' : 'Laba Rugi'}</button>))}
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 text-slate-800">
        {tab === 'neraca' && (
          <>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Aktiva (Harta)</p>
            <Row l="Kas Tunai" v={stats.kas} /><Row l="Piutang Toko" v={stats.piutang} /><Row l="Persediaan Produk" v={stats.inv} /><Row l="TOTAL AKTIVA" v={stats.kas + stats.piutang + stats.inv} b />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 mt-8">Pasiva (Kewajiban & Modal)</p>
            <Row l="Simpanan Anggota" v={stats.simpanan} /><Row l="Dana SHU Belum Dibagi" v={stats.shu} /><Row l="TOTAL PASIVA" v={stats.simpanan + stats.shu} b />
          </>
        )}
        {tab === 'labarugi' && (
          <>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Pendapatan Usaha</p>
            <Row l="Penjualan Produk" v={stats.totalPenjualan} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 mt-8">Beban & HPP</p>
            <Row l="Harga Pokok Penjualan (HPP)" v={stats.totalHPP} n /><Row l="Biaya Operasional (20%)" v={stats.totalBebanOps} n /><div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 mt-8 shadow-inner"><Row l="LABA BERSIH" v={stats.labaBersih} b /></div>
          </>
        )}
      </div>
    </div>
  );
};

const SHUView: React.FC<any> = ({ shuPool, memberShu, user, role, onWithdrawSHU, members }) => {
  const isAdmin = role === UserRole.ADMIN;
  const [isWthOpen, setIsWthOpen] = useState(false);
  const total = (Object.values(shuPool) as number[]).reduce((a, b) => a + b, 0);
  const my = memberShu.find((m: any) => m.memberId === user.id);
  const myTotal = (my?.jasaModal || 0) + (my?.jasaTransaksi || 0);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-slate-800">SHU</h2>{isAdmin && <button onClick={() => setIsWthOpen(true)} className="bg-rose-600 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-all"><Banknote size={14} /> CAIRKAN</button>}</div>
      <div className="bg-indigo-700 p-10 rounded-[2.5rem] text-white shadow-xl text-center relative overflow-hidden group">
          <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest opacity-80">Saldo SHU {isAdmin ? 'UB' : 'Anda'}</p>
          <h3 className="text-4xl font-black mt-1 tracking-tight">Rp {formatIDR(isAdmin ? total : myTotal)}</h3>
      </div>
      {isAdmin && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-sm space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3">Alokasi SHU</p>
          {Object.entries(shuPool).map(([k, v]) => (
            <div key={k} className="py-3.5 flex justify-between text-xs items-center">
                <span className="font-bold text-slate-500 uppercase tracking-wider">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-black text-slate-800 text-sm">Rp {formatIDR(v as number)}</span>
            </div>
          ))}
        </div>
      )}
      <Modal title="Pencairan SHU Anggota" isOpen={isWthOpen} onClose={() => setIsWthOpen(false)}>
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); onWithdrawSHU(fd.get('mId') as string, parseInt(fd.get('amount') as string)); setIsWthOpen(false); }} className="space-y-4">
          <select name="mId" className="w-full p-4 border border-slate-100 rounded-xl font-bold focus:border-emerald-500 outline-none" required><option value="">-- Pilih Anggota --</option>{memberShu.map(ms => { const m = members.find(mb => mb.id === ms.memberId); if(ms.jasaModal + ms.jasaTransaksi <= 0) return null; return <option key={ms.memberId} value={ms.memberId}>{m?.name} (Saldo: Rp {formatIDR(ms.jasaModal + ms.jasaTransaksi)})</option>})}</select>
          <input name="amount" type="number" placeholder="Nominal" className="w-full p-4 border border-slate-100 rounded-xl font-black text-lg text-rose-600 focus:border-rose-500 outline-none" required />
          <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all tracking-widest">PENCAIRAN</button>
        </form>
      </Modal>
    </div>
  );
};

const HutangView: React.FC<any> = ({ sales, user, role, onPay }) => {
  const isAdmin = role === UserRole.ADMIN;
  const list = isAdmin ? sales.filter((s:any)=>s.paymentStatus === 'Piutang') : sales.filter((s:any)=>s.memberId === user.id && s.paymentStatus === 'Piutang');
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800">{isAdmin ? 'Piutang Toko' : 'Hutang Belanja'}</h2>
      <div className="space-y-4">
        {list.map((s:any)=>(
          <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center text-slate-800 hover:bg-slate-50 transition-colors">
            <div className="min-w-0">
                <p className="font-bold text-sm truncate">{s.memberName}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{s.date}</p>
                <p className="text-rose-600 font-black text-base mt-1.5">Rp {formatIDR(s.total)}</p>
            </div>
            {isAdmin && (
                <button onClick={()=>onPay(s.id)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[10px] font-bold uppercase active:scale-95 shadow-lg transition-all tracking-widest">LUNASI</button>
            )}
          </div>
        ))}
        {list.length === 0 && <div className="py-24 text-center text-slate-300 italic text-sm">Semua catatan belanja sudah lunas.</div>}
      </div>
    </div>
  );
};

const ProfilView: React.FC<any> = ({ user, onUpdate }) => {
  const [data, setData] = useState({ name: user.name, phone: user.phone, address: user.address, avatar: user.avatar, password: user.password });
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col items-center">
        <div className="relative group">
            <img src={data.avatar} className="w-32 h-32 rounded-[2.8rem] border-4 border-white shadow-2xl object-cover" />
            <div className="absolute bottom-0 right-0 p-3 bg-emerald-600 text-white rounded-[1.2rem] shadow-lg cursor-pointer hover:bg-emerald-700 transition-colors"><Camera size={18} /></div>
        </div>
        <h2 className="text-2xl font-black mt-5 text-slate-800 tracking-tight">{user.name}</h2>
        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest opacity-80 mt-1">{user.role}</p>
      </div>
      <div className="bg-white p-8 rounded-[2.8rem] border border-slate-100 space-y-6 shadow-sm text-slate-800">
        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nama Lengkap</label><input value={data.name} onChange={e => setData(p => ({ ...p, name: e.target.value }))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-50 outline-none focus:border-emerald-500 transition-colors" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">WhatsApp</label><input value={data.phone} onChange={e => setData(p => ({ ...p, phone: e.target.value }))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-50 outline-none focus:border-emerald-500 transition-colors" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Alamat Lengkap</label><textarea value={data.address} onChange={e => setData(p => ({ ...p, address: e.target.value }))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-50 outline-none focus:border-emerald-500 transition-colors" rows={2} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Ganti Password</label><input type="text" value={data.password} onChange={e => setData(p => ({ ...p, password: e.target.value }))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-50 outline-none focus:border-emerald-500 transition-colors" /></div>
        <button onClick={() => { onUpdate({ ...user, ...data }); alert('Profil Anda berhasil diperbarui!'); }} className="w-full bg-emerald-700 text-white py-5 rounded-[1.8rem] font-black shadow-xl uppercase active:scale-95 transition-all mt-6 tracking-[0.2em]">SIMPAN</button>
      </div>
    </div>
  );
};

export default App;
