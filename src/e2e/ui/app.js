import { E2E_CSS } from './style.generated.js';
import { E2E_HEADER, E2E_BODY } from './template.js';

export function mountE2E(root, options = {}) {
  const mode = options.mode === 'embedded' ? 'embedded' : 'standalone';
  if (!root.classList.contains('e2e-app')) root.classList.add('e2e-app');
  root.classList.toggle('is-embedded', mode === 'embedded');
  if (!root.querySelector('.toolbar')) {
    if (mode !== 'embedded' && !root.querySelector('.e2e-app__header')) root.insertAdjacentHTML('afterbegin', E2E_HEADER);
    root.insertAdjacentHTML('beforeend', E2E_BODY);
  }
  if (!root.querySelector('style[data-e2e-style]')) {
    const style = document.createElement('style');
    style.dataset.e2eStyle = '';
    style.textContent = E2E_CSS;
    root.prepend(style);
  }
  let panelActive = options.active !== false, timer = null;
  const THEME_VARS = ['bg', 'surface', 'text', 'text-soft', 'muted', 'line', 'hover', 'selected', 'selected-line', 'primary', 'primary-hover', 'danger', 'danger-text', 'success', 'success-text', 'warning', 'info', 'focus', 'overlay', 'code', 'code-bg', 'code-text', 'radius'];
  const THEME_CLASSES = ['theme-claude-code', 'theme-zcode', 'theme-zcode-light', 'theme-linear'];
  const themeClassesOf = el => (el ? THEME_CLASSES.filter(name => el.classList.contains(name)).join(' ') : '');
  function syncTheme() {
    const source = document.getElementById('scenario-test-root');
    if (!source) return;
    const style = getComputedStyle(source);
    root.classList.add('is-theme-switching');
    for (const name of THEME_VARS) {
      const value = style.getPropertyValue('--workspace-' + name).trim();
      if (value) root.style.setProperty('--workspace-' + name, value);
    }
    // 禁用过渡时一次性提交新配色，避免控件底色向旧主题插值
    void root.offsetWidth;
    root.classList.remove('is-theme-switching');
  }
  syncTheme();
  // 主题切换只改 #scenario-test-root 与 body 的主题类；面板可见期间也要实时跟随。
  // 只比对主题类：本函数自身也会改动 root 的 is-theme-switching，不能按任意 class 变化重入
  let lastThemeClasses = '';
  const themeObserver = new MutationObserver(() => {
    const next = themeClassesOf(document.body) + '|' + themeClassesOf(document.getElementById('scenario-test-root'));
    if (next === lastThemeClasses) return;
    lastThemeClasses = next;
    syncTheme();
  });
  lastThemeClasses = themeClassesOf(document.body) + '|' + themeClassesOf(document.getElementById('scenario-test-root'));
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const themeSource = document.getElementById('scenario-test-root');
  if (themeSource && themeSource !== root) themeObserver.observe(themeSource, { attributes: true, attributeFilter: ['class'] });
  function destroy() {
    themeObserver.disconnect();
    if (timer) { clearInterval(timer); timer = null; }
    if (mode !== 'embedded') { window.removeEventListener('popstate', syncFromUrl); window.removeEventListener('hashchange', syncFromUrl); }
    root.replaceChildren();
  }
  function setActive(value) { panelActive = !!value; if (panelActive) { syncTheme(); state(); } }
  function setSpec(spec) { if (spec && specs.includes(spec) && spec !== selected) { selected = spec; listing(); show(); } }
const $=id=>root.querySelector('#'+id);let specs=[],selected='',active=null,running=false,rev=0,stepFilter='all';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
const CROSS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
function controls(){ $('run').disabled=running||!selected;$('headed').disabled=running;$('stop').disabled=!running;$('stop').textContent=running?'停止运行':'停止运行';$('active-run').textContent=running?'正在执行：'+(active||'未知'):'每个场景使用自己的账号与独立登录状态';$('status').className='status'+(running&&active===selected?' running':''); }
const FILE_ICON='<svg class="spec-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
const CHEVRON='<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FOLDER='<svg class="folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const collapsed=new Set();
function specName(spec){return spec.split('/').pop().replace(/[.]spec[.](?:js|ts|mjs)$/,'')}
function readSpecParam(){
  const hash=location.hash.replace(/^#/,'');
  const fromHash=hash?new URLSearchParams(hash).get('spec'):null;
  return fromHash||new URLSearchParams(location.search).get('spec');
}
function setSpecParam(spec){
  if(typeof options.onSpecChange==='function'){options.onSpecChange(spec);return}
  const url=new URL(location.href);url.searchParams.delete('spec');
  const next=url.pathname+url.search+(spec?'#spec='+encodeURIComponent(spec):'');
  if(next===location.pathname+location.search+location.hash)return;
  history.pushState(null,'',next);
}
function syncFromUrl(){
  const spec=readSpecParam();
  const target=spec&&specs.includes(spec)?spec:specs[0]||'';
  setSpec(target);
}
function specItem(spec,depth){
  const wrap=document.createElement('div');wrap.className='spec-item'+(selected===spec?' is-active':'');
  const b=document.createElement('button');b.type='button';b.className='spec-item-main';b.setAttribute('aria-label',spec);if(selected===spec)b.setAttribute('aria-current','true');
  b.title=spec;b.style.paddingLeft=(28+depth*12)+'px';b.innerHTML=FILE_ICON;
  const text=document.createElement('span');text.className='spec-item-text';
  const name=document.createElement('span');name.className='spec-item-name';name.textContent=specName(spec);
  const file=document.createElement('span');file.className='spec-item-file';file.textContent=spec.split('/').pop();
  text.append(name,file);b.append(text);b.onclick=()=>{selected=spec;setSpecParam(spec);listing();show()};wrap.append(b);return wrap;
}
function renderDir(dir,depth,parent){
  const off=collapsed.has(dir.path);
  const wrap=document.createElement('div');wrap.className='spec-dir';
  const toggle=document.createElement('div');toggle.className='spec-dir-toggle';toggle.setAttribute('role','button');toggle.tabIndex=0;toggle.setAttribute('aria-expanded',String(!off));toggle.title=dir.path;toggle.style.paddingLeft=(8+depth*12)+'px';toggle.innerHTML=CHEVRON+FOLDER;
  const name=document.createElement('span');name.className='spec-dir-name';name.textContent=dir.name;
  const count=document.createElement('span');count.className='spec-dir-count';count.textContent=dir.count;
  toggle.append(name,count);
  const children=document.createElement('div');children.className='spec-children';children.style.setProperty('--tree-guide',(14+depth*12)+'px');children.hidden=off;
  renderTree(dir,depth+1,children);
  const flip=()=>{off?collapsed.delete(dir.path):collapsed.add(dir.path);listing()};
  toggle.onclick=flip;toggle.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}};
  wrap.append(toggle,children);parent.append(wrap);
}
function renderTree(node,depth,parent){for(const dir of node.dirs.values())renderDir(dir,depth,parent);for(const spec of node.files)parent.append(specItem(spec,depth))}
function listing(){
  const query=$('search').value.trim().toLowerCase();$('list').replaceChildren();
  const visible=specs.filter(spec=>spec.toLowerCase().includes(query));
  $('file-count').textContent=visible.length+' 个文件';$('no-files').hidden=visible.length>0;
  const root={dirs:new Map(),files:[]};
  for(const spec of visible){
    const parts=spec.split('/');let node=root,dirPath='';
    for(let i=0;i<parts.length-1;i++){
      dirPath=dirPath?dirPath+'/'+parts[i]:parts[i];
      if(!node.dirs.has(dirPath))node.dirs.set(dirPath,{name:parts[i],path:dirPath,dirs:new Map(),files:[],count:0});
      node=node.dirs.get(dirPath);node.count++;
    }
    node.files.push(spec);
  }
  const wrap=document.createElement('div');wrap.className='spec-tree';
  if(query)for(const spec of visible)wrap.append(specItem(spec,0));
  else renderTree(root,0,wrap);
  $('list').append(wrap);
}
async function api(url,opt){const r=await fetch(url,opt);if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
function cleanErr(text){return String(text).replace(/\x1b\[[0-9;]*m/g,'')}
const STATUS_CN={passed:'通过',failed:'失败',interrupted:'已停止',timedOut:'超时',skipped:'跳过',running:'运行中'};
function fmtTime(iso){if(!iso)return '-';const d=new Date(iso);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0')}
function fmtDur(ms){if(ms==null||isNaN(ms))return '-';return ms>=1000?(ms/1000).toFixed(2)+' s':Math.round(ms)+' ms'}
function applyFilter(){
  const q=$('step-search').value.trim().toLowerCase();let shown=0,total=0;
  for(const row of $('steps').children){total++;const ok=(stepFilter==='all'||row.dataset.status===stepFilter)&&(!q||row.dataset.search.includes(q));row.hidden=!ok;if(ok)shown++}
  $('filter-summary').textContent=total?'显示 '+shown+' / '+total+' 个步骤':'未加载测试文件';
  $('steps-empty').style.display=shown===0?'flex':'none';
}
let sourceCache={},sourcePending={};
const BACKTICK=String.fromCharCode(96);
function ensureSource(spec){
  if(Object.hasOwn(sourceCache,spec))return Promise.resolve(sourceCache[spec]);
  if(!sourcePending[spec])sourcePending[spec]=fetch('/e2e/api/source?spec='+encodeURIComponent(spec)).then(r=>r.ok?r.json():null).then(v=>{sourceCache[spec]=(v&&v.content)||'';delete sourcePending[spec];return sourceCache[spec]}).catch(()=>{sourceCache[spec]='';delete sourcePending[spec];return ''});
  return sourcePending[spec];
}
const isSpaceChar=ch=>ch===' '||ch==='\t'||ch==='\n'||ch==='\r';
function matchParen(src,open){
  let depth=0,quote='',escaped=false;
  for(let i=open;i<src.length;i++){
    const ch=src[i];
    if(quote){
      if(escaped)escaped=false;
      else if(ch==='\\')escaped=true;
      else if(ch===quote)quote='';
      continue;
    }
    if(ch==='"'||ch==="'"||ch===BACKTICK){quote=ch;continue}
    if(ch==='/'&&src[i+1]==='/'){const nl=src.indexOf('\n',i);i=nl<0?src.length:nl;continue}
    if(ch==='/'&&src[i+1]==='*'){const close=src.indexOf('*/',i+2);i=close<0?src.length:close+1;continue}
    if(ch==='(')depth++;
    else if(ch===')'){depth--;if(depth===0)return i+1}
  }
  return -1;
}
function readStepTitle(src,start){
  let i=start;
  while(i<src.length&&isSpaceChar(src[i]))i++;
  const quote=src[i];
  if(quote!=='"'&&quote!=="'"&&quote!==BACKTICK)return '';
  let out='',escaped=false;
  for(i++;i<src.length;i++){
    const ch=src[i];
    if(escaped){out+=ch;escaped=false;continue}
    if(ch==='\\'){escaped=true;continue}
    if(ch===quote)break;
    out+=ch;
  }
  return out;
}
function stepDefs(source){
  const defs=[],needle='test.step(';let from=0;
  while(true){
    const start=source.indexOf(needle,from);
    if(start<0)break;
    const end=matchParen(source,start+needle.length-1);
    if(end<0)break;
    defs.push({title:readStepTitle(source,start+needle.length),code:source.slice(start,end)});
    from=end;
  }
  return defs;
}
function toggleStepSource(row,title){
  const existing=row.querySelector('.step-source');
  if(existing){existing.remove();return}
  ensureSource(selected).then(source=>{
    const pre=document.createElement('pre');pre.className='step-source';
    const defs=stepDefs(source);
    const def=defs.find(item=>item.title===title)||defs.find(item=>item.title.indexOf(title)>=0)||null;
    pre.textContent=def?def.code:'未找到该步骤的原始定义';
    row.append(pre);
  });
}
function buildStepView(defs,steps,running){
  const pool=(steps||[]).slice(),view=[];
  for(const def of (defs||[])){
    const i=pool.findIndex(item=>item.title===def.title);
    view.push({title:def.title,data:i>=0?pool.splice(i,1)[0]:null});
  }
  for(const rest of pool)view.push({title:rest.title,data:rest});
  if(running){
    const next=view.find(item=>!item.data);
    if(next)next.running=true;
  }
  return view;
}
function stepTone(status){return status==='passed'?'ok':(status==='failed'||status==='timedOut'||status==='interrupted')?'fail':status==='running'?'running':'pending'}
function renderSteps(view){
  $('steps').replaceChildren();let passed=0,failed=0;
  view.forEach((item,i)=>{
    const step=item.data||{};
    const title=step.title||item.title||'';
    const status=step.status||(item.running?'running':'pending');
    const tone=stepTone(status),ok=tone==='ok',bad=tone==='fail';
    ok?passed++:bad?failed++:0;
    const li=document.createElement('li');li.className='step-row';li.dataset.status=status;li.dataset.search=title.toLowerCase();
    const head=document.createElement('div');head.className='step-head';
    const lead=document.createElement('div');lead.className='step-lead';
    const seq=document.createElement('span');seq.className='seq '+tone;seq.innerHTML=ok?CHECK:bad?CROSS:'';
    if(!ok&&!bad)seq.textContent=String(i+1);
    const titleEl=document.createElement('span');titleEl.className='step-title';titleEl.textContent=title;titleEl.title=title;
    lead.append(seq,titleEl);
    const tail=document.createElement('div');tail.className='step-tail';
    const badge=document.createElement('span');badge.className='step-badge '+tone;badge.textContent=ok?'成功':bad?'失败':tone==='running'?'运行中':'待执行';
    const dur=document.createElement('span');dur.className='step-dur';dur.textContent=step.duration!=null?fmtDur(step.duration):'';
    const codeBtn=document.createElement('button');codeBtn.type='button';codeBtn.className='step-code-btn';codeBtn.textContent='定义';codeBtn.title='查看原始 step 定义';codeBtn.onclick=e=>{e.stopPropagation();toggleStepSource(li,title)};
    tail.append(badge,dur,codeBtn);head.append(lead,tail);li.append(head);
    if(step.error){const err=document.createElement('div');err.className='step-error';err.textContent=cleanErr(step.error);li.append(err)}
    $('steps').append(li);
  });
  const nums=root.querySelectorAll('.filter-option .n');
  nums[0].textContent=view.length;nums[1].textContent=passed;nums[2].textContent=failed;
  applyFilter();
}
function renderStats(r,spec,steps){
  const panel=$('stats-panel');panel.replaceChildren();
  if(!r){panel.innerHTML='<div class="side-empty">测试文件未加载或未执行</div>';return}
  steps=steps||[];
  const cases=r?.results?.[spec]||[];
  const passed=steps.filter(s=>s.status==='passed').length,failed=steps.filter(s=>stepTone(s.status)==='fail').length;
  const pct=steps.length?((passed/steps.length)*100).toFixed(1):'0.0';
  const label=document.createElement('div');label.className='stat-progress-row';
  label.innerHTML='<span class="stat-label">总步骤进度</span><span class="stat-progress-val">'+passed+' / '+steps.length+' <em>('+pct+'%)</em></span>';
  const bar=document.createElement('div');bar.className='seg-bar';
  for(const s of steps){const seg=document.createElement('i');seg.className=stepTone(s.status);seg.title=(s.title||'步骤')+'：'+(s.status==='passed'?'成功':stepTone(s.status)==='fail'?'失败':s.status==='running'?'运行中':'待执行');bar.append(seg)}
  if(!steps.length){const seg=document.createElement('i');bar.append(seg)}
  const cards=document.createElement('div');cards.className='stat-cards';
  cards.innerHTML='<div class="stat-card ok"><div class="num">'+passed+'</div><div class="lab">成功步骤</div></div><div class="stat-card fail"><div class="num">'+failed+'</div><div class="lab">失败步骤</div></div>';
  const meta=document.createElement('div');meta.className='stat-meta';
  const caseCount=cases.length;
  meta.innerHTML='<div class="row"><span>测试用例</span><span class="v">'+caseCount+' 个</span></div><div class="row"><span>运行批次</span><span class="v" title="'+(r.runId||'')+'">'+String(r.runId||'').slice(0,8)+'</span></div><div class="row"><span>运行状态</span><span class="v">'+(STATUS_CN[r.status]||r.status||'-')+'</span></div>';
  panel.append(label,bar,cards,meta);
}
function renderReport(r,spec){
  const cases=(r?.results?.[spec]||[]).filter(c=>c.status!=='passed');
  const globals=r?.globalErrors||[];
  const count=cases.length+globals.length;
  $('report-badge').hidden=!count;$('report-badge').textContent=count;$('report-badge').classList.toggle('alert',count>0);
  $('report-tab').disabled=!count;
  const panel=$('report-panel');panel.replaceChildren();
  if(!count){panel.innerHTML='<div class="side-empty">本次运行没有失败项<br><span class="note">失败用例和错误详情将在这里展示</span></div>';if($('report-tab').classList.contains('is-active'))switchTab('stats');return}
  for(const c of cases){const box=document.createElement('div');box.className='report-case';const t=document.createElement('div');t.className='t';t.textContent=c.title+'（'+(STATUS_CN[c.status]||c.status)+'）';box.append(t);for(const e of c.errors||[]){const err=document.createElement('div');err.className='err';err.textContent=cleanErr(e);box.append(err)}panel.append(box)}
  for(const e of globals){const box=document.createElement('div');box.className='report-case';const t=document.createElement('div');t.className='t';t.textContent='全局错误';const err=document.createElement('div');err.className='err';err.textContent=cleanErr(e);box.append(t,err);panel.append(box)}
}
function switchTab(name){
  const stats=name==='stats';
  $('stats-tab').classList.toggle('is-active',stats);$('stats-tab').setAttribute('aria-selected',String(stats));
  $('report-tab').classList.toggle('is-active',!stats);$('report-tab').setAttribute('aria-selected',String(!stats));
  $('stats-panel').hidden=!stats;$('report-panel').hidden=stats;
}
$('stats-tab').onclick=()=>switchTab('stats');
$('report-tab').onclick=()=>{if(!$('report-tab').disabled)switchTab('report')};
for(const b of root.querySelectorAll('.filter-option'))b.onclick=()=>{stepFilter=b.dataset.filter;for(const x of root.querySelectorAll('.filter-option'))x.classList.toggle('is-active',x===b);applyFilter()};
$('step-search').oninput=applyFilter;
async function show(){const spec=selected,n=++rev;$('title').textContent=spec?specName(spec):'选择测试文件';$('selected-path').textContent=spec||'从左侧选择测试文件，查看执行结果与证据';$('shots').replaceChildren();$('steps').replaceChildren();$('steps-empty').style.display='flex';$('report').hidden=true;$('log').textContent='暂无日志';$('filter-summary').textContent='未加载测试文件';for(const x of root.querySelectorAll('.filter-option .n'))x.textContent='0';$('exec-start').textContent='-';$('exec-end').textContent='-';$('exec-duration').textContent='-';controls();if(!spec){$('status').textContent='暂无测试文件';renderStats(null);renderReport(null);return}const source=await ensureSource(spec);if(n!==rev)return;const defs=stepDefs(source);if(running&&active===spec){$('status').textContent='运行中';$('log').textContent=liveLog||'等待日志';const live=liveData;const pseudo={results:{[spec]:live?.results||[]},globalErrors:[],runId:liveRunId,status:'running',startedAt:live?.startedAt};const liveView=buildStepView(defs,live?.steps||[],true);renderSteps(liveView);renderStats(pseudo,spec,liveView.map(item=>({title:item.title,status:(item.data&&item.data.status)||(item.running?'running':'pending')})));renderReport(pseudo,spec);$('exec-start').textContent=fmtTime(live?.startedAt);const liveShots=(live?.screenshots||[]).slice().sort((a,b)=>String(a.capturedAt||'').localeCompare(String(b.capturedAt||'')));for(const s of liveShots){const a=document.createElement('a');a.className='evidence-item';a.dataset.evidence='1';a.dataset.name=s.name||'';a.dataset.test=s.test||'';a.href='/e2e/api/artifacts/'+liveRunId+'/'+s.file;const img=document.createElement('img');img.src=a.href;img.alt=s.name;const name=document.createElement('strong');name.textContent=s.name;const label=document.createElement('small');label.textContent=s.test;a.append(img,name,label);$('shots').append(a)}$('empty').textContent=$('shots').childElementCount?'点击截图查看大图':'等待截图生成';return}try{const r=await api('/e2e/api/result?spec='+encodeURIComponent(spec));if(n!==rev)return;if(!r){$('status').textContent='尚未运行';$('empty').textContent='该测试文件暂无截图';renderSteps(buildStepView(defs,[],false));renderStats(null);renderReport(null,spec);return}const cases=r.results?.[spec]||[];if(!cases.length){$('status').textContent='尚未运行';const pendingView=buildStepView(defs,[],false);renderSteps(pendingView);renderStats(r,spec,pendingView.map(item=>({title:item.title,status:'pending'})));renderReport(r,spec);return}const status=cases.every(c=>c.status==='passed')?'通过':cases.map(c=>STATUS_CN[c.status]||c.status).join(', ');$('status').textContent=status;if(cases.length===1&&cases[0].title)$('title').textContent=cases[0].title;$('status').className='status '+(cases.every(c=>c.status==='passed')?'ok':'fail');const steps=r.steps?.[spec]||[];const resultView=buildStepView(defs,steps,false);renderSteps(resultView);renderStats(r,spec,resultView.map(item=>({title:item.title,status:item.data?item.data.status:'pending'})));renderReport(r,spec);$('exec-start').textContent=fmtTime(r.startedAt);$('exec-end').textContent=fmtTime(r.finishedAt);$('exec-duration').textContent=r.startedAt&&r.finishedAt?fmtDur(new Date(r.finishedAt)-new Date(r.startedAt)):'-';$('log').textContent=(r.logs?.[spec]||[]).join('\n')||'暂无日志';if(r.reportAvailable){$('report').href='/e2e/api/artifacts/'+r.runId+'/report/index.html';$('report').hidden=false}const resultShots=(r.screenshots||[]).filter(x=>x.spec===spec).sort((a,b)=>String(a.capturedAt||'').localeCompare(String(b.capturedAt||'')));for(const s of resultShots){const a=document.createElement('a');a.className='evidence-item';a.dataset.evidence='1';a.dataset.name=s.name||'';a.dataset.test=s.test||'';a.href='/e2e/api/artifacts/'+r.runId+'/'+s.file;const img=document.createElement('img');img.src=a.href;img.alt=s.name;const name=document.createElement('strong');name.textContent=s.name;const label=document.createElement('small');label.textContent=s.test;a.append(img,name,label);$('shots').append(a)}$('empty').textContent=$('shots').childElementCount?'点击截图查看大图':'该次运行未生成截图'}catch(e){if(n===rev)$('status').textContent='结果读取失败：'+e.message}}
async function state(){try{const s=await api('/e2e/api/state');specs=s.specs;if(!selected){const wanted=options.spec||readSpecParam();selected=(wanted&&specs.includes(wanted))?wanted:specs[0]||'';}running=s.running;active=s.spec||null;liveLog=s.log||'';liveData=s.live||null;liveRunId=s.runId||null;$('env').textContent=s.configSummary||'';listing();await show()}catch(e){$('status').textContent='连接失败：'+e.message}}
$('search').oninput=()=>{$('search-clear').hidden=!$('search').value;listing()};
$('search-clear').onclick=()=>{$('search').value='';$('search-clear').hidden=true;$('search').focus();listing()};
$('search').onkeydown=e=>{if(e.key==='Escape'){$('search').value='';$('search-clear').hidden=true;listing();$('search').blur()}};
let lbItems=[],lbIndex=0,lbScale=1;
function lbClamp(v){return Math.max(0.25,Math.min(6,Math.round(v*100)/100))}
function lbShow(){
  const item=lbItems[lbIndex];if(!item)return;
  const img=$('lb-img');img.src=item.src;img.alt=item.name;img.style.maxWidth=(100*lbScale)+'%';img.style.maxHeight=(100*lbScale)+'%';
  $('lb-title').textContent=item.name;$('lb-sub').textContent=item.test+' · '+(lbIndex+1)+' / '+lbItems.length;
  $('lb-zoom').textContent=Math.round(lbScale*100)+'%';
  $('lb-prev').disabled=lbItems.length<2;$('lb-next').disabled=lbItems.length<2;
}
function lbOpen(index){
  const nodes=[...root.querySelectorAll('[data-evidence]')];if(!nodes.length)return;
  lbItems=nodes.map(node=>({src:node.querySelector('img').src,name:node.dataset.name||node.querySelector('strong')?.textContent||'',test:node.dataset.test||node.querySelector('small')?.textContent||''}));
  lbIndex=Math.max(0,Math.min(index,lbItems.length-1));lbScale=1;
  $('lightbox').hidden=false;root.classList.add('is-lightbox-open');lbShow();$('lb-close').focus();
}
function lbClose(){$('lightbox').hidden=true;root.classList.remove('is-lightbox-open');$('lb-img').removeAttribute('src')}
function lbStep(delta){if(lbItems.length<2)return;lbIndex=(lbIndex+delta+lbItems.length)%lbItems.length;lbScale=1;lbShow()}
function lbZoom(delta){lbScale=lbClamp(lbScale+delta);lbShow()}
function lbKey(e){
  if(e.key==='Escape'){e.preventDefault();lbClose()}
  else if(e.key==='ArrowLeft'){e.preventDefault();lbStep(-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();lbStep(1)}
  else if(e.key==='+'||e.key==='='){e.preventDefault();lbZoom(0.25)}
  else if(e.key==='-'||e.key==='_'){e.preventDefault();lbZoom(-0.25)}
  else if(e.key==='0'){e.preventDefault();lbScale=1;lbShow()}
}
root.addEventListener('click',e=>{const item=e.target.closest('[data-evidence]');if(!item)return;e.preventDefault();lbOpen([...root.querySelectorAll('[data-evidence]')].indexOf(item))});
$('lb-prev').onclick=()=>lbStep(-1);$('lb-next').onclick=()=>lbStep(1);$('lb-close').onclick=lbClose;
$('lb-in').onclick=()=>lbZoom(0.25);$('lb-out').onclick=()=>lbZoom(-0.25);$('lb-fit').onclick=()=>{lbScale=1;lbShow()};
$('lightbox').addEventListener('click',e=>{if(e.target===$('lightbox')||e.target.classList.contains('lb-stage'))lbClose()});
$('lightbox').addEventListener('wheel',e=>{if($('lightbox').hidden)return;e.preventDefault();lbZoom(e.deltaY<0?0.25:-0.25)},{passive:false});
document.addEventListener('keydown',e=>{
  if(!panelActive||!root.isConnected)return;
  if($('lightbox').hidden&&!root.contains(document.activeElement))return;
  if(!$('lightbox').hidden){if(['Escape','ArrowLeft','ArrowRight','+','=','-','_','0'].indexOf(e.key)>=0)lbKey(e);return}
  const tag=(e.target&&e.target.tagName)||'';
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus();$('search').select()}
  else if(e.key==='/'&&tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();$('search').focus()}
});
(()=>{
  const ws=root.querySelector('.workspace'),bar=$('list-resizer');
  const clamp=x=>Math.min(420,Math.max(180,x));
  const setW=v=>ws.style.setProperty('--list-w',clamp(v)+'px');
  const curW=()=>parseFloat(getComputedStyle(ws).getPropertyValue('--list-w'))||260;
  bar.addEventListener('pointerdown',e=>{e.preventDefault();bar.setPointerCapture(e.pointerId);bar.classList.add('is-dragging');root.classList.add('is-list-resizing')});
  bar.addEventListener('pointermove',e=>{if(bar.classList.contains('is-dragging'))setW(e.clientX-ws.getBoundingClientRect().left-8)});
  const end=e=>{bar.classList.remove('is-dragging');root.classList.remove('is-list-resizing')};
  bar.addEventListener('pointerup',end);bar.addEventListener('pointercancel',end);
  bar.addEventListener('dblclick',()=>ws.style.removeProperty('--list-w'));
  bar.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();setW(curW()-16)}else if(e.key==='ArrowRight'){e.preventDefault();setW(curW()+16)}});
})();
root.classList.toggle('is-embedded',mode==='embedded');
$('run').onclick=async()=>{try{await api('/e2e/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({spec:selected,headed:$('headed').checked})});await state()}catch(e){$('status').textContent='启动失败：'+e.message}};
$('stop').onclick=async()=>{try{await api('/e2e/api/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});await state()}catch(e){$('status').textContent='停止失败：'+e.message}};
if(mode!=='embedded')window.addEventListener('popstate',syncFromUrl);
if(mode!=='embedded')window.addEventListener('hashchange',syncFromUrl);
fetch('/__scenario-test__/status').then(r=>r.json()).then(s=>{$('identity').textContent='版本 '+s.version+' · 构建 '+String(s.buildId||'').slice(0,8)+' · PID '+s.pid+' · '+s.workspace}).catch(()=>{$('identity').textContent='身份读取失败'});timer=setInterval(()=>{if(panelActive&&running)state()},1000);state();

  return { destroy, setActive, setSpec };
}
