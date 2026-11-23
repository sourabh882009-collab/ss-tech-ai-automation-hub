import {spaces, stages, contactStages, triggers, actions, seed, apply, validate} from './model.js';

const root = document.querySelector('#app');
const notice = document.querySelector('#notice');
const key = 'ss-tech-ai-hub-v1';
const params = new URLSearchParams(location.search);
const publicView = params.get('view') === 'submit';
const scopeOptions = Object.entries(spaces).map(([id, item]) => [id,item.name]);
const tabs = {overview:'Dashboard',problems:'Business problems',contacts:'Leads & customers',rules:'Workflows',logs:'Activity & analytics'};
const groups = {problems:'problem',contacts:'contact',rules:'workflow'};
let scope = 'all';
let editing = null;
let timeout;
let memory = seed();
let memoryOnly = false;
function load() {
  if (memoryOnly) return memory;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(key,JSON.stringify(memory));
  } catch { memoryOnly = true; }
  return memory;
}
function save(db) {
  memory = db;
  try { localStorage.setItem(key,JSON.stringify(db)); }
  catch { memoryOnly = true; }
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const badge = value => '<span class="tag">'+esc(value)+'</span>';
const page = () => Object.hasOwn(tabs,location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
const scoped = rows => rows.filter(row => scope === 'all' || row.workspace === scope);
const time = value => new Date(value).toLocaleString();
function alertUser(message) {
  notice.textContent = message;
  clearTimeout(timeout);
  timeout = setTimeout(() => {notice.textContent = '';},5000);
}
function select(name,label,options,value) {
  return '<label>'+label+'<select name="'+name+'">'+options.map(option => {
    const [id,title] = Array.isArray(option) ? option : [option,option];
    return '<option value="'+esc(id)+'" '+(id === value ? 'selected' : '')+'>'+esc(title)+'</option>';
  }).join('')+'</select></label>';
}
function field(name,label,value='',required=false, multiline=false,max=100) {
  const attrs = ' name="'+name+'" maxlength="'+max+'" '+(required?'required':'');
  return '<label>'+label+(multiline?'<textarea rows="3"'+attrs+'>'+esc(value)+'</textarea>':'<input'+attrs+' value="'+esc(value)+'">')+'</label>';
}
function problemFields(row) {
  return field('business','Business name',row.business,true)+select('type','Business type',['Retail','Creator','Services','Travel','Bakery / Food','Other'],row.type)+field('problem','Business problem (at least 10 characters)',row.problem,true,true,1200);
}
function logo() {
  return '<a class="brand" href="./"><span class="mark" aria-hidden="true">SS</span><span>SS TECH AI<span class="sub">Automation Hub</span></span></a>';
}
function renderPublic() {
  root.innerHTML = '<main class="public"><header class="row">'+logo()+badge('Intake demo')+'</header><div class="hero"><h1>Tell us what slows your business down</h1><p>You Share the Problem, We Build the Solution.</p></div><div class="panel"><h2>Submit a business problem</h2><p>Use sample information. Submissions stay in this browser for review in the dashboard.</p><form class="fields" data-group="problems">'+select('workspace','Workspace',scopeOptions,'client')+problemFields({})+'<button class="primary">Submit demo problem</button></form></div></main>';
}
function integrationCards() {
  return '<div class="grid">'+['Instagram AutoDM','WhatsApp'].map(name=>'<article class="panel"><h2>'+name+'</h2>'+badge('Planned')+'<p class="intro">Future server connector. Simulated rules run in this browser.</p></article>').join('')+'</div>';
}
function putOverview(db) {
  const problems = scoped(db.problems);
  const contacts = scoped(db.contacts);
  const stats = [['Business problems',problems.length],['Active leads',contacts.filter(x=>!['Customer','Closed'].includes(x.stage)).length],['Customers',contacts.filter(x=>x.stage==='Customer').length],['Enabled workflows',scoped(db.rules).filter(x=>x.enabled==='Enabled').length]];
  return '<div class="hero"><h1>'+esc(scope === 'all'?'Master dashboard':spaces[scope].name)+'</h1><p>'+esc(scope === 'all'?'You Share the Problem, We Build the Solution.':spaces[scope].focus)+'</p><a class="button primary" href="#problems">Review intake</a></div><div class="grid">'+stats.map(([label,n])=>'<article class="panel"><span class="muted">'+label+'</span><strong class="metric">'+n+'</strong></article>').join('')+'</div><section class="panel"><h2>Implementation pipeline</h2><div class="grid">'+stages.map(stage=>'<div>'+badge(stage)+' <strong>'+problems.filter(x=>x.stage===stage).length+'</strong></div>').join('')+'</div></section>'+(scope==='all'?'<section><h2>Business workspaces</h2><div class="grid">'+Object.entries(spaces).map(([id,x])=>'<article class="panel"><h2>'+x.name+'</h2><p>'+x.focus+'</p><button data-workspace="'+id+'">Open workspace</button></article>').join('')+'</div></section>':'');
}
function formFor(group,row) {
  let fields = select('workspace','Workspace',scopeOptions,row.workspace || (scope === 'all' ? 'client' : scope));
  if (group === 'problems') fields += problemFields(row)+select('stage','Stage',stages,row.stage)+field('proposal','Solution proposal',row.proposal,false,true,1200)+field('plan','Automation plan',row.plan,false,true,1200)+field('progress','Implementation notes',row.progress,false,true,1200);
  if (group === 'contacts') fields += field('name','Contact name',row.name,true)+field('business','Company',row.business)+select('stage','Lead stage',contactStages,row.stage)+field('notes','Enquiry and notes',row.notes,false,true,1200);
  if (group === 'rules') fields += field('title','Workflow name',row.title,true)+select('trigger','When',triggers,row.trigger)+select('action','Then',actions,row.action)+field('tag','Contact tag (for tagging rules)',row.tag)+select('enabled','Mode',['Draft','Enabled'],row.enabled);
  return '<section class="panel"><h2>'+(row.id?'Edit ':'Add ')+groups[group]+'</h2><form class="fields" data-group="'+group+'" data-id="'+esc(row.id)+'">'+fields+'<div class="row"><button class="primary">Save '+groups[group]+'</button>'+(row.id?'<button type="button" data-cancel>Cancel</button>':'')+'</div></form></section>';
}
function recordList(group, rows) {
  return '<section class="panel"><h2>Records · '+rows.length+'</h2>'+(rows.length?rows.map(row => {
    const label = group === 'problems' ? row.business : row.name || row.title;
    const detail = row.problem || row.notes || (row.trigger ? row.trigger+' · '+row.action : '');
    return '<article class="record"><div class="row"><strong>'+esc(label)+'</strong>'+badge(row.stage || row.enabled)+'</div><div class="muted">'+esc(spaces[row.workspace].name)+' · '+esc(time(row.updated))+'</div><p>'+esc(detail)+'</p>'+
      [['Proposal',row.proposal],['Automation plan',row.plan],['Implementation',row.progress]].filter(([,v])=>v).map(([label,v])=>'<p><strong>'+label+'</strong> '+esc(v)+'</p>').join('')+
      (row.flag?badge('Flagged for review'):'')+(row.tag?badge(row.tag):'')+'<div class="row intro"><button data-edit="'+row.id+'">Edit</button><button data-remove="'+row.id+'">Delete</button></div></article>';
  }).join(''):'<p>No records in this workspace yet.</p>')+'</section>';
}
function logs(db) {
  const entries = scoped(db.logs);
  const problems = scoped(db.problems);
  const completed = problems.filter(x=>x.stage==='Completed').length;
  const rate = problems.length ? Math.round(100*completed/problems.length) : 0;
  return '<h1>Activity & analytics</h1><div class="grid"><article class="panel">Implementation completion<strong class="metric">'+rate+'%</strong><progress max="100" value="'+rate+'" aria-label="Implementation completion"></progress></article><article class="panel">Recorded events<strong class="metric">'+entries.length+'</strong></article></div><section class="panel"><h2>Activity history</h2>'+(entries.map(x=>'<div class="record"><strong>'+esc(x.message)+'</strong><p>'+esc(spaces[x.workspace].name)+' · '+esc(time(x.updated))+'</p></div>').join('') || '<p>No activity yet.</p>')+'</section>';
}
function render() {
  if (publicView) {renderPublic();return;}
  const db = load();
  const tab = page();
  const body = tab === 'overview' ? putOverview(db) : tab === 'logs' ? logs(db) :
    '<h1>'+tabs[tab]+'</h1><div class="layout">'+formFor(tab,db[tab].find(x=>x.id===editing) || {})+recordList(tab,scoped(db[tab]))+'</div>'+(tab==='rules'?integrationCards():'');
  root.innerHTML = '<div class="shell"><aside>'+logo()+'<div class="switch">'+select('scope','Workspace',[['all','All workspaces'],...scopeOptions],scope)+'</div><nav aria-label="Management">'+Object.entries(tabs).map(([id,title])=>'<a href="#'+id+'" '+(id===tab?'aria-current="page"':'')+'>'+title+'</a>').join('')+'</nav></aside><main><header class="row">'+badge('Private demo · Admin view')+'<a class="button" href="?view=submit">Open intake form</a></header><p class="intro">Sample data only. '+(memoryOnly?'Browser storage is unavailable. Changes last until reload.':'Changes stay in this browser.')+'</p>'+body+'</main></div>';
}
root.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const group = form.dataset.group;
  const data = Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,value.trim()]));
  try {
    validate(group,data);
    const db = load();
    apply(db,group,data,form.dataset.id || undefined);
    save(db);
    editing = null;
    render();
    alertUser(publicView ? 'Demo submission received. Review it in the dashboard on this browser.' : 'Saved '+groups[group]+'.');
  } catch (error) {alertUser(error.message);}
});
root.addEventListener('change', event => {
  if (event.target.name !== 'scope') return;
  scope = event.target.value;
  editing = null;
  render();
  root.querySelector('[name=scope]').focus();
});
root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const {workspace,edit,remove,cancel} = button.dataset;
  if (workspace) {scope = workspace;render();}
  if (edit) {editing = edit;render();root.querySelector('form input').focus();}
  if (cancel !== undefined) {editing = null;render();}
  if (remove && confirm('Delete this demo record?')) {
    try {
      const db = load();
      apply(db,page(),{},remove,true);
      save(db);
      editing = null;
      render();
      alertUser('Record deleted.');
    } catch (error) {alertUser(error.message);}
  }
});
window.addEventListener('hashchange',()=>{editing=null;render();});
window.addEventListener('storage',event=>{if(event.key===key && !publicView && !editing && !root.querySelector('form:focus-within')) render();});
render();
