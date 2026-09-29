"use client";
import {useCallback,useEffect,useState} from "react";
import styles from "./AdminPage.module.css";

type AdminPerson={id:string;name:string;status:"GO"|"NO"|"PENDING"};
type AdminInvite={id:string;label:string;confirmed:boolean;people:AdminPerson[]};
type AdminGift={id:string;title:string;description:string;link:string|null};
type AdminData={invites:AdminInvite[];gifts:AdminGift[]};
type AttendanceFilter="ALL"|"GO"|"NO"|"PENDING";

function getGuestInviteUrl(inviteId:string){
  const configuredSiteUrl=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/,"");
  const siteUrl=configuredSiteUrl||(typeof window!=="undefined"?window.location.origin:"");
  return `${siteUrl}/?id=${inviteId}`;
}

export function AdminPage(){
  const [authenticated,setAuthenticated]=useState<boolean|null>(null);
  const [setupRequired,setSetupRequired]=useState(false);
  const [setupEnabled,setSetupEnabled]=useState(false);
  const [setupToken,setSetupToken]=useState("");
  const [password,setPassword]=useState("");
  const [passwordConfirmation,setPasswordConfirmation]=useState("");
  const [authError,setAuthError]=useState("");
  const [data,setData]=useState<AdminData|null>(null);
  const [attendanceFilter,setAttendanceFilter]=useState<AttendanceFilter>("ALL");
  const [attendanceSearch,setAttendanceSearch]=useState("");
  const [lastUpdated,setLastUpdated]=useState<Date|null>(null);
  const [names,setNames]=useState('');
  const [label,setLabel]=useState('');
  const [couple,setCouple]=useState('Kelvia & Erick');
  const [pixKey,setPixKey]=useState('');
  const [gift,setGift]=useState({title:'',description:'',link:''});

  const adminFetch=useCallback((input:RequestInfo|URL,init?:RequestInit)=>fetch(input,init).then(response=>{
    if(response.status===401){
      setData(null);
      setAuthError("Sua sessão expirou. Entre novamente.");
      setAuthenticated(false);
    }
    return response;
  }),[]);

  const load=useCallback(async()=>{
    try{
      const response=await adminFetch('/api/admin/invites');
      if(response.status===401){setAuthenticated(false);return}
      if(!response.ok)throw new Error("Não foi possível carregar os dados administrativos.");
      const result=await response.json() as AdminData;
      setData(result);
      setLastUpdated(new Date());
      setAuthError("");
    }catch(error){
      setAuthError(error instanceof Error?error.message:"Não foi possível atualizar as confirmações.");
    }
  },[adminFetch]);

  useEffect(()=>{
    fetch('/api/admin/auth/session')
      .then(async response=>{
        if(!response.ok)throw new Error("Não foi possível verificar a sessão.");
        const session=await response.json();
        setSetupRequired(session.setupRequired);
        setSetupEnabled(session.setupEnabled);
        setAuthenticated(session.authenticated);
      })
      .catch(()=>{setAuthError("Não foi possível verificar a sessão. Recarregue a página.");setAuthenticated(false)});
  },[]);

  useEffect(()=>{
    if(authenticated){
      load();
      const refreshInterval=window.setInterval(load,30_000);
      adminFetch('/api/admin/settings').then(r=>{
        if(!r.ok)throw new Error("Não foi possível carregar as configurações.");
        return r.json();
      }).then(x=>{setCouple(x.coupleName);setPixKey(x.pixKey??'')}).catch(()=>setAuthError("Não foi possível carregar os dados administrativos."));
      return ()=>window.clearInterval(refreshInterval);
    }
  },[authenticated,adminFetch,load]);

  const authenticate=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    setAuthError("");
    try{
      const response=await fetch(setupRequired?'/api/admin/auth/setup':'/api/admin/auth/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(setupRequired
          ?{setupToken,password,confirmation:passwordConfirmation}
          :{username:"Erick",password}),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível entrar.");
      setPassword("");
      setPasswordConfirmation("");
      setSetupToken("");
      setSetupRequired(false);
      setAuthenticated(true);
    }catch(error){
      setAuthError(error instanceof Error?error.message:"Não foi possível entrar.");
    }
  };

  const logout=async()=>{
    const response=await fetch('/api/admin/auth/logout',{method:'POST'});
    if(!response.ok){setAuthError("Não foi possível encerrar a sessão.");return}
    setAuthenticated(false);
    setData(null);
    setAuthError("");
  };

  if(authenticated===null)return <main className="wrap"><section className="card"><p>Verificando sessão...</p></section></main>;
  if(!authenticated)return <main className="wrap"><header className="hero"><div className="small">Acesso restrito</div><h1>Kelvia & Erick</h1></header><section className="card"><h2 className="serif">{setupRequired?"Configurar administrador":"Entrar no painel"}</h2>{setupRequired&&<><p className="status">Crie a senha do administrador Erick. A senha será armazenada como hash e não poderá ser recuperada.</p>{!setupEnabled&&<p role="alert" className="status">O primeiro acesso ainda não está habilitado. Configure ADMIN_SETUP_TOKEN no ambiente da aplicação.</p>}</>}<form onSubmit={authenticate}>{setupRequired?<><label htmlFor="admin-setup-token">Código de configuração</label><input id="admin-setup-token" type="password" autoComplete="one-time-code" value={setupToken} onChange={event=>setSetupToken(event.target.value)} required/><label htmlFor="admin-password">Crie uma senha (mínimo 12 caracteres)</label></>:<><label htmlFor="admin-username">Usuário</label><input id="admin-username" type="text" autoComplete="username" value="Erick" readOnly/><label htmlFor="admin-password">Senha do administrador</label></>}<input id="admin-password" type="password" autoComplete={setupRequired?"new-password":"current-password"} value={password} onChange={event=>setPassword(event.target.value)} minLength={setupRequired?12:undefined} required/>{setupRequired&&<><label htmlFor="admin-password-confirmation">Confirme a senha</label><input id="admin-password-confirmation" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={event=>setPasswordConfirmation(event.target.value)} minLength={12} required/></>}<br/><br/><button className="btn" type="submit" disabled={setupRequired&&!setupEnabled}>{setupRequired?"Criar administrador":"Entrar"}</button></form>{authError&&<p role="alert" className="status">{authError}</p>}</section></main>;

  const create=async()=>{await adminFetch('/api/admin/invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label,names})});setNames('');setLabel('');load()};
  const remove=async(id:string)=>{if(confirm('Remover convite?')){await adminFetch(`/api/admin/invites/${id}`,{method:'DELETE'});load()}};
  const save=async()=>{await adminFetch('/api/admin/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({coupleName:couple,pixKey})})};
  const addGift=async()=>{await adminFetch('/api/admin/gifts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(gift)});setGift({title:'',description:'',link:''});load()};
  const delGift=async(id:string)=>{await adminFetch(`/api/admin/gifts/${id}`,{method:'DELETE'});load()};
  const people=data?.invites.flatMap(invite=>invite.people)??[];
  const attendance={
    going:people.filter(person=>person.status==="GO").length,
    notGoing:people.filter(person=>person.status==="NO").length,
    pending:people.filter(person=>person.status==="PENDING").length,
  };
  const search=attendanceSearch.trim().toLocaleLowerCase("pt-BR");
  const visibleInvites=data?.invites.map(invite=>({
    ...invite,
    people:invite.people.filter(person=>{
      const matchesFilter=attendanceFilter==="ALL"||person.status===attendanceFilter;
      const matchesSearch=!search||`${invite.label} ${person.name}`.toLocaleLowerCase("pt-BR").includes(search);
      return matchesFilter&&matchesSearch;
    }),
  })).filter(invite=>invite.people.length>0)??[];

  return <main className="wrap">
    <header className="hero"><div className="small">Painel administrativo</div><h1>Kelvia & Erick</h1><button className="btn alt" onClick={logout}>Sair</button></header>
    {authError&&<section className="card"><p role="alert">{authError}</p></section>}
    <section className="card">
      <div className={styles.sectionHeading}><div><h2 className="serif">Acompanhamento de presença</h2><p className="status">As respostas são atualizadas automaticamente a cada 30 segundos.</p></div><button className="btn alt" onClick={load}>Atualizar agora</button></div>
      {lastUpdated&&<p className="status" aria-live="polite">Última atualização: {lastUpdated.toLocaleTimeString("pt-BR")}</p>}
      <div className={styles.summary} aria-label="Resumo das confirmações">
        <div className={styles.stat}><span className="status">Vão comparecer</span><strong>{attendance.going}</strong></div>
        <div className={styles.stat}><span className="status">Não vão comparecer</span><strong>{attendance.notGoing}</strong></div>
        <div className={styles.stat}><span className="status">Aguardando resposta</span><strong>{attendance.pending}</strong></div>
        <div className={styles.stat}><span className="status">Convites respondidos</span><strong>{data?.invites.filter(invite=>invite.confirmed).length??0} / {data?.invites.length??0}</strong></div>
      </div>
      <div className={`grid ${styles.controls}`}>
        <div><label htmlFor="attendance-search">Buscar convidado ou convite</label><input id="attendance-search" value={attendanceSearch} onChange={event=>setAttendanceSearch(event.target.value)} placeholder="Digite um nome"/></div>
        <div><label htmlFor="attendance-filter">Filtrar respostas</label><select className={styles.filterSelect} id="attendance-filter" value={attendanceFilter} onChange={event=>setAttendanceFilter(event.target.value as AttendanceFilter)}><option value="ALL">Todas as respostas</option><option value="GO">Vai comparecer</option><option value="NO">Não vai comparecer</option><option value="PENDING">Ainda não respondeu</option></select></div>
      </div>
      <div className={styles.tableWrap}><table><thead><tr><th>Convite</th><th>Convidado</th><th>Resposta</th><th>Convite respondido</th></tr></thead><tbody>
        {visibleInvites.flatMap(invite=>invite.people.map(person=><tr key={person.id}><td>{invite.label}</td><td>{person.name}</td><td><span className={`tag ${person.status==='GO'?'go':person.status==='NO'?'no':'pending'}`}>{person.status==='GO'?'Vai comparecer':person.status==='NO'?'Não vai comparecer':'Pendente'}</span></td><td>{invite.confirmed?'Sim':'Não'}</td></tr>))}
        {visibleInvites.length===0&&<tr><td colSpan={4}>Nenhum convidado encontrado para esse filtro.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="card"><h2 className="serif">Dados do casamento</h2><label htmlFor="couple-name">Nome dos noivos</label><input id="couple-name" value={couple} onChange={e=>setCouple(e.target.value)}/><label htmlFor="pix-key">Chave PIX</label><input id="pix-key" value={pixKey} onChange={e=>setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória"/><p className="status">Essa chave será exibida aos convidados após a confirmação.</p><br/><button className="btn" onClick={save}>Salvar</button></section>
    <section className="card"><h2 className="serif">Novo convite</h2><div className="grid"><div><label>Rótulo</label><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Família Oliveira"/></div><div><label>Nomes separados por vírgula</label><input value={names} onChange={e=>setNames(e.target.value)} placeholder="Roberto Oliveira, Sandra Oliveira"/></div></div><br/><button className="btn" onClick={create}>Criar convite</button></section>
    <section className="card"><h2 className="serif">Convites</h2><div style={{overflowX:'auto'}}><table><thead><tr><th>Convite</th><th>Pessoas</th><th>Link</th><th>Ações</th></tr></thead><tbody>{data?.invites.map(x=>{const inviteUrl=getGuestInviteUrl(x.id);return <tr key={x.id}><td>{x.label}</td><td>{x.people.map(p=><div key={p.id}><b>{p.name}</b> <span className={`tag ${p.status==='GO'?'go':p.status==='NO'?'no':'pending'}`}>{p.status==='GO'?'Vai':p.status==='NO'?'Não vai':'Pendente'}</span></div>)}</td><td><input readOnly value={inviteUrl} onFocus={e=>e.currentTarget.select()}/></td><td><button className="btn alt" onClick={()=>navigator.clipboard.writeText(inviteUrl)}>Copiar</button> <button className="btn" onClick={()=>remove(x.id)}>Remover</button></td></tr>})}</tbody></table></div></section>
    <section className="card"><h2 className="serif">Lista de presentes</h2><div className="grid"><div><label>Título</label><input value={gift.title} onChange={e=>setGift({...gift,title:e.target.value})}/></div><div><label>Descrição</label><input value={gift.description} onChange={e=>setGift({...gift,description:e.target.value})}/></div></div><label>Link opcional</label><input value={gift.link} onChange={e=>setGift({...gift,link:e.target.value})}/><br/><br/><button className="btn" onClick={addGift}>Adicionar presente</button><div>{data?.gifts.map(g=><div className="gift" key={g.id}><b>{g.title}</b><div className="status">{g.description}</div><button className="btn alt" onClick={()=>delGift(g.id)}>Remover</button></div>)}</div></section>
  </main>
}
