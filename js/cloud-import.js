'use strict';
const cloudName = name => name.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
function planCloudImport(backup, localSongs, localSamples) {
    if (backup.version !== 1 || !['songs','samples','files'].every(k => Array.isArray(backup[k]))) throw Error('Biblioteca inválida.');
    const songMap = new Map(), fileMap = new Map(), conflicts = [], incomingSongs = [], incomingSamples = [], incomingFiles = [];
    const names = new Set(), sampleIds = new Set(), sampleNames = new Set();
    for (const song of backup.songs) {
        if (typeof song.id !== 'string' || songMap.has(song.id) || typeof song.name !== 'string' || !song.name.trim() || names.has(cloudName(song.name))) throw Error('Músicas duplicadas ou inválidas na nuvem.');
        names.add(cloudName(song.name));
        const matches = localSongs.filter(s => cloudName(s.name) === cloudName(song.name));
        if (matches.length > 1) throw Error('Há mais de uma música local chamada “'+song.name+'”. Renomeie antes de importar.');
        const old = matches[0], id = old?.id || uid(); songMap.set(song.id,id);
        const item = { value: {...song,id,position:song.position ?? old?.position ?? Date.now(),updatedAt:Date.now()}, old };
        incomingSongs.push(item);
        if (old) { item.conflict = conflicts.length; conflicts.push({name:song.name,kind:'Música',local:'Organização e dados da música',incoming:'Dados da música na nuvem'}); }
    }
    for (const file of backup.files) {
        if (typeof file.id !== 'string' || fileMap.has(file.id) || typeof file.name !== 'string' || typeof file.data !== 'string') throw Error('Arquivo inválido.');
        const id=uid(); fileMap.set(file.id,id);
        const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));
        incomingFiles.push({id,name:file.name,mime:typeof file.mime==='string'?file.mime:'',size:bytes.length,blob:new Blob([bytes],{type:file.mime||''})});
    }
    for (const sample of backup.samples) {
        if (typeof sample.id !== 'string' || sampleIds.has(sample.id) || typeof sample.name !== 'string' || !sample.name.trim() || typeof sample.fileName !== 'string' || !songMap.has(sample.songId) || !fileMap.has(sample.fileId) || !['audio','midi'].includes(sample.kind) || !Number.isFinite(sample.volume) || sample.volume<0 || sample.volume>1 || typeof sample.loop!=='boolean' || typeof sample.shortcut!=='string' || !/^([a-z0-9])?$/.test(sample.shortcut)) throw Error('Sample inválido.');
        sampleIds.add(sample.id);
        const songId=songMap.get(sample.songId),key=songId+':'+cloudName(sample.name);
        if(sampleNames.has(key))throw Error('Samples com nomes duplicados na nuvem: '+sample.name); sampleNames.add(key);
        const matches=localSamples.filter(s=>s.songId===songId && cloudName(s.name)===cloudName(sample.name));
        if(matches.length>1)throw Error('Há samples locais duplicados chamados “'+sample.name+'”. Renomeie antes de importar.');
        const old=matches[0],item={value:{...sample,id:old?.id||uid(),songId,fileId:fileMap.get(sample.fileId)},old}; incomingSamples.push(item);
        if(old){item.conflict=conflicts.length;conflicts.push({name:sample.name,kind:'Sample · '+backup.songs.find(s=>songMap.get(s.id)===songId).name,local:cloudSampleDescription(old),incoming:cloudSampleDescription(sample)})}
    }
    return {conflicts,incomingSongs,incomingSamples,incomingFiles};
}
function cloudImportOperations(plan, replace, localSamples) {
    const operations=[],finalSamples=new Map(localSamples.map(s=>[s.id,s]));
    const chosen=plan.incomingSamples.filter(item=>!item.old||replace.has(item.conflict));
    for(const item of plan.incomingSongs)if(!item.old||replace.has(item.conflict))operations.push({store:'songs',type:'put',value:item.value});
    for(const item of chosen)finalSamples.set(item.value.id,item.value);
    const shortcuts=new Set();
    for(const s of finalSamples.values()){const key=s.songId+':'+s.shortcut;if(s.shortcut&&shortcuts.has(key))throw Error('Atalho “'+s.shortcut.toUpperCase()+'” conflita com outro sample. Ajuste o atalho antes de importar.');if(s.shortcut)shortcuts.add(key)}
    const needed=new Set(chosen.map(item=>item.value.fileId)),used=new Set([...finalSamples.values()].map(s=>s.fileId));
    for(const item of chosen){operations.push({store:'samples',type:'put',value:item.value});if(item.old&&!used.has(item.old.fileId))operations.push({store:'files',type:'delete',id:item.old.fileId})}
    for(const file of plan.incomingFiles)if(needed.has(file.id))operations.push({store:'files',type:'put',value:file});
    return operations;
}
function chooseCloudConflicts(conflicts) {
    const dialog=$('#conflictDialog');
    $('#conflictList').innerHTML=conflicts.map((c,i)=>`<label class="conflict-item"><input type="checkbox" value="${i}"><span><b>${esc(c.kind)}: ${esc(c.name)}</b><small>Local: ${esc(c.local)}</small><small>Nuvem: ${esc(c.incoming)}</small></span></label>`).join('');
    $('#replaceAll').onclick=()=>{dialog.querySelectorAll('input').forEach(input=>input.checked=true);dialog.close('apply')};
    return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='apply'?new Set([...dialog.querySelectorAll('input:checked')].map(input=>+input.value)):null),{once:true});dialog.returnValue='cancel';dialog.showModal()});
}
async function importCloudLibrary(backup) {
    const localSongs=await all('songs'),localSamples=await all('samples');
    const plan=planCloudImport(backup,localSongs,localSamples);
    const replace=plan.conflicts.length?await chooseCloudConflicts(plan.conflicts):new Set();
    if(replace===null)return;
    if(!plan.conflicts.length&&!confirm('Importar '+backup.songs.length+' músicas da nuvem?'))return;
    const operations=cloudImportOperations(plan,replace,localSamples);
    await tx(['songs','samples','files'],'readwrite',t=>{for(const op of operations){const store=t.objectStore(op.store);if(op.type==='put')store.put(op.value);else store.delete(op.id)}});
    stopAll();await refresh();notify('Biblioteca da nuvem importada.');
}
document.addEventListener('click',e=>{document.querySelectorAll('.header-menu[open]').forEach(menu=>{if(!menu.contains(e.target)||e.target.closest('button'))menu.open=false})});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.header-menu[open]').forEach(menu=>menu.open=false)});

function cloudSampleDescription(s) { const count=Number.isInteger(s.repeatCount)&&s.repeatCount>0?'x'+s.repeatCount:'∞'; return s.fileName+' · Volume: '+Math.round(s.volume*100)+'% · Repetição: '+(s.loop?count:'desativada'); }
