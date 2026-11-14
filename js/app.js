(function(){
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const load=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(u);return r.json()};
const store={get(k){try{return JSON.parse(localStorage.getItem(k))||{}}catch(e){return{}}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}};
const TYPE={transport:"交通",food:"餐飲",sight:"景點",stay:"住宿",tips:"提醒"};
const STATUS={verified:"官方資料",community:"民間資料",tbd:"待確認"};
const CUR={KRW:"韓元",JPY:"日圓",USD:"美元",EUR:"歐元",THB:"泰銖",TWD:"新台幣"};
const fmt=n=>n.toLocaleString("en-US");

async function home(){
  const box=$("#trip-list");
  for(const t of await load("data/trips.json")){
    let prog="";
    try{const d=await load("data/"+t.id+".json"),n=d.days.flatMap(x=>x.items),st=store.get("planner:"+t.id);
      prog="・已完成 "+n.filter(x=>st.done&&st.done[x.id]).length+" / "+n.length+" 項"}catch(e){}
    const a=el("a","card");a.href="trip.html?id="+encodeURIComponent(t.id);
    a.append(el("b",null,t.title),el("br"),el("span",null,t.summary),el("br"),el("small",null,t.city+"・"+t.days+" 天・更新 "+t.updated+prog));
    box.append(a);
  }
}

async function trip(){
  const id=new URLSearchParams(location.search).get("id")||"";
  if(!/^[a-z0-9-]+$/.test(id))throw new Error("bad id");
  const data=await load("data/"+id+".json"),key="planner:"+id;
  const st=store.get(key);st.done=st.done||{};st.order=st.order||{};
  const save=()=>store.set(key,st);
  document.title=data.title;
  const cur=CUR[data.currency]||data.currency,twd=data.currency==="TWD";
  const ordered=di=>{const items=data.days[di].items,o=st.order[di];
    if(!o)return items;
    const pos=x=>{const i=o.indexOf(x.id);return i<0?999:i};
    return[...items].sort((a,b)=>pos(a)-pos(b))};
  const move=(di,i,d)=>{const ids=ordered(di).map(x=>x.id),j=i+d;
    if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];st.order[di]=ids;save();render()};
  const num=v=>{const n=parseFloat(v);return isFinite(n)&&n>0?n:null};
  const field=(label,val,set)=>{const w=el("label","field",label+" "),i=el("input");
    i.type="number";i.min="0";i.step="any";if(val)i.value=val;
    i.onchange=()=>{set(num(i.value));save();render()};w.append(i);return w};
  const check=(id,text)=>{const row=el("div","item"+(st.done[id]?" done":"")),cb=el("input");
    cb.type="checkbox";cb.checked=!!st.done[id];cb.setAttribute("aria-label","完成："+text);
    cb.onchange=()=>{if(cb.checked)st.done[id]=true;else delete st.done[id];save();render()};
    const b=el("div","body");b.append(el("span","name",text));row.append(cb,b);return row};

  function render(){
    const root=$("#itinerary");root.replaceChildren();
    const rate=twd?1:(st.rate||data.units_per_twd);
    const all=data.days.flatMap(d=>d.items);
    const done=all.filter(x=>st.done[x.id]).length;
    let total=0,unknown=0;const byType={};
    all.forEach(x=>{if(x.type==="tips")return;if(x.cost==null){unknown++;return}
      total+=x.cost;byType[x.type]=(byType[x.type]||0)+x.cost});
    const totalTwd=Math.round(total/rate);
    root.append(el("h1",null,data.title),el("p","sub",data.summary));
    if(data.emergency&&data.emergency.length){const e=el("div","summary");e.append(el("b",null,"緊急聯絡"));
      data.emergency.forEach(r=>e.append(el("div","meta",r.label+"："+r.value)));root.append(e)}
    const sum=el("div","summary");
    sum.append(el("div",null,"已完成 "+done+" / "+all.length+" 項"));
    const bar=el("div","bar"),fill=el("i");fill.style.width=(all.length?done/all.length*100:0)+"%";bar.append(fill);sum.append(bar);
    sum.append(el("div","meta","已知費用 "+fmt(total)+" "+cur+(twd?"":"（約 "+fmt(totalTwd)+" 新台幣）")+"，另有 "+unknown+" 項費用待確認。"));
    const types=Object.keys(byType).map(k=>(TYPE[k]||k)+" "+fmt(byType[k])).join("・");
    if(types)sum.append(el("div","meta","依類型："+types+" "+cur));
    const ctl=el("div","controls");
    ctl.append(field("預算（新台幣）",st.budget,v=>st.budget=v));
    if(!twd)ctl.append(field("匯率（1 新台幣＝幾"+cur+"）",rate,v=>st.rate=v));
    sum.append(ctl);
    if(!twd)sum.append(el("div","meta","匯率預設為教學假設，請改成出發前的即時匯率。"));
    if(st.budget){const diff=Math.round(st.budget-totalTwd);
      sum.append(el("div","meta "+(diff>=0?"okmsg":"over"),diff>=0?"預算剩 "+fmt(diff)+" 新台幣（不含待確認項目）":"已超支 "+fmt(-diff)+" 新台幣"))}
    root.append(sum);
    const fb=el("button","reset",st.onlyTbd?"顯示全部項目":"只看待確認項目");
    fb.onclick=()=>{st.onlyTbd=!st.onlyTbd;save();render()};root.append(fb);
    if(data.checklist&&data.checklist.length){root.append(el("h2",null,"行前檢查清單"));
      data.checklist.forEach(c=>root.append(check(c.id,c.text)))}
    if(data.guides&&data.guides.length){root.append(el("h2",null,"旅遊須知"));
      data.guides.forEach(g=>{const dt=el("details","guide"),sm=el("summary");
        sm.append(el("b",null,g.title+" "),el("span","tag "+g.status,STATUS[g.status]||g.status));dt.append(sm);
        const ul=el("ul");g.points.forEach(p=>ul.append(el("li",null,p)));dt.append(ul);
        if(/^https?:\/\//.test(g.source)){const a=el("a",null,"來源");a.href=g.source;a.target="_blank";a.rel="noopener";dt.append(a)}
        root.append(dt)})}
    data.days.forEach((day,di)=>{
      root.append(el("h2",null,day.title));
      const list=ordered(di),dayTotal=list.reduce((s,x)=>s+(x.type!=="tips"&&x.cost!=null?x.cost:0),0);
      list.forEach((x,i)=>{
        if(st.onlyTbd&&x.status!=="tbd")return;
        const row=el("div","item"+(st.done[x.id]?" done":""));
        const cb=el("input");cb.type="checkbox";cb.checked=!!st.done[x.id];cb.setAttribute("aria-label","完成："+x.name);
        cb.onchange=()=>{if(cb.checked)st.done[x.id]=true;else delete st.done[x.id];save();render()};
        const body=el("div","body"),head=el("div");
        head.append(el("span","time",x.time),el("span","name",x.name));
        const meta=el("div","meta");
        meta.append(el("span","tag",TYPE[x.type]||x.type),el("span","tag "+x.status,STATUS[x.status]||x.status),
          document.createTextNode(x.cost==null?"費用待確認":fmt(x.cost)+" "+cur));
        body.append(head,meta,el("div","note",x.note));
        if(/^https?:\/\//.test(x.source)){const a=el("a",null,"來源");a.href=x.source;a.target="_blank";a.rel="noopener";const s=el("div","meta");s.append(a);body.append(s)}
        else body.append(el("div","meta","來源：自行整理"));
        const mv=el("div","mv"),up=el("button",null,"↑"),dn=el("button",null,"↓");
        up.setAttribute("aria-label","上移");dn.setAttribute("aria-label","下移");
        up.disabled=st.onlyTbd||i===0;dn.disabled=st.onlyTbd||i===list.length-1;
        up.onclick=()=>move(di,i,-1);dn.onclick=()=>move(di,i,1);mv.append(up,dn);
        row.append(cb,body,mv);root.append(row);
      });
      root.append(el("div","dayfoot","本日已知費用 "+fmt(dayTotal)+" "+cur));
    });
    const rs=el("button","reset","重設進度、順序、預算與匯率");
    rs.onclick=()=>{if(confirm("要清除這個行程的勾選、順序、預算與匯率嗎？")){store.del(key);for(const k of Object.keys(st))delete st[k];st.done={};st.order={};render()}};
    root.append(rs);
  }
  render();
}

(async()=>{try{
  if($("#trip-list"))await home();else if($("#itinerary"))await trip();
}catch(e){document.querySelector("main").append(el("p","err","資料載入失敗：請用 GitHub Pages 或本機伺服器開啟，不能直接雙擊 HTML。"))}})();
})();
