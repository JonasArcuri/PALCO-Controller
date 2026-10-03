const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(){const elements=new Map();const context=vm.createContext({document:{querySelector(s){if(!elements.has(s))elements.set(s,{addEventListener(){}});return elements.get(s)},addEventListener(){}},indexedDB:{open(){return {}}},setInterval(){},setTimeout(){},clearTimeout(){},crypto:{randomUUID(){return 'id'}}});vm.runInContext(fs.readFileSync('js/app.js','utf8'),context);return context}
test('finite repeats stop after exactly two or three total plays; infinity and disabled loops',()=>{const c=setup();assert.equal(vm.runInContext("(()=>{const p={completed:0},s={loop:true,repeatCount:2};return nextRepeat(s,p) && !nextRepeat(s,p)})()",c),true);assert.equal(vm.runInContext("(()=>{const p={completed:0},s={loop:true,repeatCount:3};return nextRepeat(s,p) && nextRepeat(s,p) && !nextRepeat(s,p)})()",c),true);assert.equal(vm.runInContext("nextRepeat({loop:true},{completed:10000})",c),true);assert.equal(vm.runInContext("nextRepeat({loop:false,repeatCount:2},{completed:0})",c),false)});
test('repertoire reordering preserves metadata and saves positions atomically',async()=>{const c=setup();vm.runInContext("songs=[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}]; render=()=>{};notify=()=>{};tx=async(stores,mode,fn)=>fn({objectStore:()=>({put(s){if(!s.name)throw Error('Lost metadata')}})});",c);await vm.runInContext("reorderSongs('a','c')",c);assert.equal(vm.runInContext("songs.map(s=>s.id).join(',')",c),'b,c,a');assert.equal(vm.runInContext("songs.map(s=>s.position).join(',')",c),'0,1,2')});
test('repeat adjustments enable repeat, count down to infinity and reset active player cycles',async()=>{const c=setup();vm.runInContext("samples=[{id:'a',name:'A',loop:false}];render=()=>{};tx=async()=>{};players.set('a',{completed:5,audio:{loop:false}})",c);await vm.runInContext("changeRepeat('a',1)",c);assert.equal(vm.runInContext("samples[0].repeatCount",c),2);assert.equal(vm.runInContext("players.get('a').completed",c),0);await vm.runInContext("changeRepeat('a',-1)",c);await vm.runInContext("changeRepeat('a',-1)",c);assert.equal(vm.runInContext("repeatLabel(samples[0])",c),'∞');assert.equal(vm.runInContext("players.get('a').audio.loop",c),true)});
test('audio pads share one context and play, pause, resume and stop independently',async()=>{
 const c=setup(),sources=[];let contexts=0;
 class Mixer {constructor(){contexts++;this.currentTime=0;this.destination={}}resume(){return Promise.resolve()}decodeAudioData(){return Promise.resolve({duration:10})}createGain(){return {gain:{value:0},connect(){},disconnect(){}}}createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true},stop(){this.stopped=true}};sources.push(source);return source}}
 c.window={AudioContext:Mixer}; c.clearInterval=()=>{};
 vm.runInContext("updateUI=()=>{};getFile=async()=>({blob:{arrayBuffer:async()=>new ArrayBuffer(8)}});samples=[{id:'a',fileId:'fa',kind:'audio',volume:.8,loop:false},{id:'b',fileId:'fb',kind:'audio',volume:.6,loop:false}]",c);
 await Promise.all([vm.runInContext("toggle('a')",c),vm.runInContext("toggle('b')",c)]);
 assert.equal(contexts,1);assert.equal(sources.length,2);assert.equal(vm.runInContext("players.get('a').playing && players.get('b').playing",c),true);
 await vm.runInContext("toggle('a')",c);assert.equal(sources[0].stopped,true);assert.equal(vm.runInContext("players.get('b').playing",c),true);
 await vm.runInContext("toggle('a')",c);assert.equal(sources.length,3);vm.runInContext("stop('a')",c);assert.equal(vm.runInContext("players.has('b') && !players.has('a')",c),true);
 sources[1].onended();assert.equal(vm.runInContext("players.size",c),0);
});
test('sample reordering persists per-song order without interrupting players or altering other songs',async()=>{
 const c=setup();vm.runInContext("samples=[{id:'a',songId:'s',position:0,name:'A'},{id:'b',songId:'s',position:1,name:'B'},{id:'c',songId:'s',position:2,name:'C'},{id:'other',songId:'t',position:10,name:'Other'}];players.set('a',{playing:true});render=()=>{};notify=()=>{};tx=async(stores,mode,fn)=>fn({objectStore:()=>({put(s){if(!s.name)throw Error('Metadata lost')}})})",c);
 await vm.runInContext("reorderSamples('a','c')",c);
 assert.equal(vm.runInContext("samples.filter(s=>s.songId==='s').sort((a,b)=>a.position-b.position).map(s=>s.id).join(',')",c),'b,c,a');
 assert.equal(vm.runInContext("samples.find(s=>s.id==='other').position",c),10);assert.equal(vm.runInContext("players.get('a').playing",c),true);
 await vm.runInContext("reorderSamples('a','other')",c);assert.equal(vm.runInContext("samples.find(s=>s.id==='a').position",c),2);
});
