import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, CreditCard, PiggyBank, UserPlus, X, Rocket, MapPin } from "lucide-react";

const CreateEventPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [total, setTotal] = useState("");
  const [raised, setRaised] = useState("");
  const [guest, setGuest] = useState("");

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body pb-40">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-6 bg-[#dcffe7] border-b border-border">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-primary active:scale-95 transition-transform duration-200"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-black tracking-tight text-[#033621]">Novo Evento</h1>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvo3wxsFsS7YeHFEEzP37BThBiYo2LKVRjSZ9f1Q-lJMipRE6vcKSn-qw0HTcoUM4i6e00uOTTF1AltpaiaLRBSxqsEUpDn2KWvNMTV16CDe05AQkRT0-6EgSN6TB7ku2F90zHdDITUBVVZ_gc3xPtjcQY-8q3VQObXSlS6DwK4WAe3J196wAq38jS2Cu0TQxffi_wHJECkmufBijGPVthqR6XiFlmazDcPbw9Fz92kXFxmvqPiQVYjirnV7yitGMdnVAEv_2kCVk"
            alt="User profile"
            className="w-full h-full object-cover"
          />
        </div>
      </header>

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8">
        <section className="relative h-48 rounded-[2rem] overflow-hidden bg-surface-container-highest">
          <div className="absolute inset-0 p-6 flex flex-col justify-end">
            <h2 className="text-2xl font-black text-foreground">CRIAR EVENTO</h2>
          </div>
        </section>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant px-1">Nome do Evento</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
              placeholder="Ex: Pelada dos Amigos"
              className="w-full rounded-[1.25rem] bg-surface-container-lowest px-4 py-4 text-lg font-medium text-on-surface outline-none ring-1 ring-transparent transition focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant px-1">Data</label>
              <input
                value={date}
                onChange={(event) => setDate(event.target.value)}
                type="date"
                className="w-full rounded-[1.25rem] bg-surface-container-lowest px-4 py-4 text-on-surface outline-none ring-1 ring-transparent transition focus:ring-primary/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant px-1">Horário</label>
              <input
                value={time}
                onChange={(event) => setTime(event.target.value)}
                type="time"
                className="w-full rounded-[1.25rem] bg-surface-container-lowest px-4 py-4 text-on-surface outline-none ring-1 ring-transparent transition focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant px-1">Local</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                <MapPin size={18} />
              </span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                type="text"
                placeholder="Arena do Povo"
                className="w-full rounded-[1.25rem] bg-surface-container-lowest px-12 py-4 text-on-surface outline-none ring-1 ring-transparent transition focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-[2rem] bg-surface-container-highest p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-[0.3em] text-on-primary-container">Valor Total Estimado</label>
                <CreditCard size={18} className="text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-on-background opacity-40">R$</span>
                <input
                  value={total}
                  onChange={(event) => setTotal(event.target.value)}
                  type="number"
                  placeholder="0,00"
                  className="w-full bg-transparent text-4xl font-black text-on-background placeholder:text-on-background/20 outline-none"
                />
              </div>
            </div>
            <div className="rounded-[2rem] bg-primary/5 p-6 space-y-4 border border-primary/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Valor Arrecadado</label>
                <PiggyBank size={18} className="text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-on-background opacity-40">R$</span>
                <input
                  value={raised}
                  onChange={(event) => setRaised(event.target.value)}
                  type="number"
                  placeholder="0,00"
                  className="w-full bg-transparent text-4xl font-black text-on-background outline-none"
                />
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-on-surface-variant">Soma das contribuições individuais definidas abaixo</p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-bold tracking-tight text-on-surface">Selecionar Jogadores</h3>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">12 Atletas</span>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
            <div className="flex-shrink-0 min-w-[140px] rounded-[1.75rem] bg-surface-container-highest p-4 flex flex-col items-center gap-2 border-2 border-primary/20">
              <div className="relative">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMFrsepBm6LgqlaWiVo69WgYGTQkpvY4CDHrrjlCV8EoqZHHLZKbFHAwiY5bLEe3DbnYdwW1zykoe6a7W9o_pBPMscFzSdEfnV9t1x4w-lWkmyGAt_4yEI54sIcFQbPZ_mBDCPdp5X5nnlo63WcfdXfEau1jxwDSyTdj8U3efUr2EqmuPWrUYa-S6n3z7h3r25oKkv9Mdo37zu1MgCt07afQdnFq9sROuxcOBV973hlFgNaj9GhQ7e5bJSNCPHXLazguTY4tplnRg"
                  alt="Jogador selecionado"
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1 rounded-full bg-primary text-on-primary p-0.5">
                  <span className="text-[14px]">✔</span>
                </div>
              </div>
              <span className="text-xs font-bold text-on-surface text-center leading-tight">Vini Jr</span>
              <div className="relative w-full">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface/40">R$</span>
                <input
                  className="w-full rounded-xl bg-white/50 px-6 py-2 text-[10px] font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="0,00"
                  type="number"
                />
              </div>
            </div>
            <div className="flex-shrink-0 min-w-[140px] rounded-[1.75rem] bg-surface-container p-4 flex flex-col items-center gap-2">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDKxUmzXZhBSzYmbXdWxMwqjug5RymK2xkarNUPSG_hMSGmb59OP3anQyE6WwlxR6j1AawQeem3S_9jnoFgTx7Y1IuFRYEeT_3r2z8KCaImGrvrRo_vUXJ5bkMZLJ3m-9ZOwFm-5Obp2YJvPh9qESQG5yholhjHiWrRpnp9ev06uhed_Ek0Oq-gpAT7QPadGjFgxApYyAHEjVwkVcHfyplmNayEUHTbrrtBwQ9SxdNP3VmWsSV7tymNSoak8resXKqgRNE4a_T9PY"
                alt="Jogador"
                className="w-14 h-14 rounded-full object-cover grayscale opacity-70"
              />
              <span className="text-xs font-medium text-on-surface-variant text-center leading-tight">Marcos</span>
              <div className="relative w-full">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface/40">R$</span>
                <input
                  className="w-full rounded-xl bg-white/20 px-6 py-2 text-[10px] font-bold text-on-surface outline-none"
                  placeholder="0,00"
                  type="number"
                />
              </div>
            </div>
            <div className="flex-shrink-0 min-w-[140px] rounded-[1.75rem] bg-surface-container p-4 flex flex-col items-center gap-2">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxd924zg9rUT47Uwqn-xkND_oln0cHmRU3CfxFkM-u-zvICzJeWKVK9XUE6ka_xbS3CiiidK455uBHf-1K_ScFY3nbO0ysTNOTW5m8vwTcVqtdMee3ziEaQZ_Ht7aXLeMn7bOKgFPMLztDWFQl98ckVgh3PAlnvWlQAPKOmkto2jiK9xF-IXq25TQ7eIUi8KJh1ZpkNQnjDlZQdt0-pbNChwCzEXeUf_WxNk0WueQJ1zpb7xnn8ZZFt9qArh1D_Hc2a5SUdnDJO9E"
                alt="Jogador"
                className="w-14 h-14 rounded-full object-cover grayscale opacity-70"
              />
              <span className="text-xs font-medium text-on-surface-variant text-center leading-tight">Aline</span>
              <div className="relative w-full">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface/40">R$</span>
                <input
                  className="w-full rounded-xl bg-white/20 px-6 py-2 text-[10px] font-bold text-on-surface outline-none"
                  placeholder="0,00"
                  type="number"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight text-on-surface">Adicionar Convidados</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 relative">
              <input
                value={guest}
                onChange={(event) => setGuest(event.target.value)}
                type="text"
                placeholder="Nome do convidado"
                className="w-full rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-on-surface outline-none ring-1 ring-transparent transition focus:ring-primary/40"
              />
            </div>
            <div className="relative w-full max-w-[140px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/40">R$</span>
              <input
                type="number"
                placeholder="0,00"
                className="w-full rounded-[1.5rem] bg-surface-container-low px-12 py-4 text-on-surface outline-none ring-1 ring-transparent transition focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              className="rounded-[1.5rem] bg-primary-container px-6 py-4 text-on-primary-container font-bold flex items-center justify-center"
            >
              <UserPlus size={20} />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center bg-white/40 p-4 rounded-[1.5rem] gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex-shrink-0 flex items-center justify-center text-on-secondary-container font-black text-xs">P1</div>
                <span className="text-sm font-medium text-on-surface truncate">Paulo Henrique</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface/40">R$</span>
                  <input
                    className="w-full rounded-xl bg-white px-6 py-2 text-xs font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/20"
                    placeholder="0,00"
                    type="number"
                  />
                </div>
                <button className="text-error opacity-60 flex-shrink-0">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-white/40 p-4 rounded-[1.5rem] gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex-shrink-0 flex items-center justify-center text-on-secondary-container font-black text-xs">J1</div>
                <span className="text-sm font-medium text-on-surface truncate">João Silva</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface/40">R$</span>
                  <input
                    className="w-full rounded-xl bg-white px-6 py-2 text-xs font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/20"
                    placeholder="0,00"
                    type="number"
                  />
                </div>
                <button className="text-error opacity-60 flex-shrink-0">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-surface via-surface to-transparent pt-12">
        <button className="w-full rounded-[1.5rem] bg-gradient-to-r from-primary to-primary-container text-on-primary font-black py-5 text-lg shadow-xl shadow-primary/10 tracking-tight flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
          <span>Criar Evento</span>
          <Rocket size={20} />
        </button>
      </div>
    </div>
  );
};

export default CreateEventPage;
