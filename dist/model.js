export const spaces = {
  creator: {name:'SS Tech AI Creator', focus:'Tutorial enquiries, creator leads and Instagram workflow planning.'},
  retail: {name:'Shreevika Retail', focus:'Retail enquiries, follow-ups and invoice workflow planning using sample records.'},
  client: {name:'Client CRM', focus:'Business intake, solution proposals and implementation tracking.'}
};
export const stages = ['Submitted','In review','Proposal','Planning','Implementing','Completed'];
export const contactStages = ['New','Contacted','Qualified','Customer','Closed'];
export const triggers = ['Problem submitted','Contact created','Contact stage changed'];
export const actions = ['Add activity entry','Flag problem for review','Tag contact'];
export const blank = () => ({problems:[],contacts:[],rules:[],logs:[]});
export function seed() {
  const db = blank();
  for (const [space, titles] of Object.entries({
    creator:['Organize tutorial requests','Demo Creator Studio'],
    retail:['Track retail order follow-ups','Demo Retail Buyer'],
    client:['Reduce missed consultation enquiries','Demo Design Studio']
  })) {
    apply(db,'problems',{workspace:space,business:titles[1],type:'Other',problem:titles[0]});
    apply(db,'contacts',{workspace:space,name:titles[1],stage:'New',notes:'Sample enquiry for the workspace.'});
  }
  return db;
}
export function apply(db, group, values, id, remove = false) {
  const rows = db[group];
  const previous = rows.find(row => row.id === id);
  if (id && !previous) throw new Error('This record is no longer available.');
  const now = new Date().toISOString();
  if (remove) {
    rows.splice(rows.indexOf(previous),1);
    values = previous;
  }
  const stage = values.stage || (group === 'problems' ? 'Submitted' : undefined);
  const record = {...previous,...values,stage,id:id || crypto.randomUUID(),updated:now};
  if (!remove) {
    if (previous) rows[rows.indexOf(previous)] = record;
    else rows.unshift(record);
  }
  const label = values.business || values.name || values.title;
  const change = previous && previous.stage !== stage && stage ? ' · ' + stage : '';
  const log = message => db.logs.unshift({workspace:record.workspace,message,updated:now});
  log((remove ? 'Removed ' : previous ? 'Updated ' : 'Created ') + label + (remove ? '' : change));
  const event = remove ? null : group === 'problems' && !previous ? triggers[0] :
    group === 'contacts' ? (!previous ? triggers[1] : change ? triggers[2] : null) : null;
  if (event) for (const rule of db.rules.filter(rule => rule.enabled === 'Enabled' && rule.workspace === record.workspace && rule.trigger === event)) {
    if (rule.action === actions[1] && group === 'problems') record.flag = true;
    if (rule.action === actions[2] && group === 'contacts') record.tag = rule.tag;
    log('Workflow ran: ' + rule.title + ' · ' + label);
  }
  return record;
}
export function validate(group, data) {
  if (!spaces[data.workspace]) throw new Error('Choose a workspace.');
  if (group === 'problems' && (!data.business || (data.problem || '').length < 10 || (data.stage && !stages.includes(data.stage)))) throw new Error('Enter a business name, at least 10 characters about the problem, and a valid stage.');
  if (group === 'contacts' && (!data.name || !contactStages.includes(data.stage))) throw new Error('Enter a contact name and stage.');
  if (group === 'rules') {
    if (!data.title || !triggers.includes(data.trigger) || !actions.includes(data.action)) throw new Error('Enter a workflow name, trigger and action.');
    if (data.action === actions[1] && data.trigger !== triggers[0]) throw new Error('Flagging requires the Problem submitted trigger.');
    if (data.action === actions[2] && (data.trigger === triggers[0] || !data.tag)) throw new Error('Tagging requires a contact trigger and a tag.');
  }
}
