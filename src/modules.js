import {rarities} from './content.js';

export const moduleTypes=[
 {id:'damage',name:'Lõi xung kích',stat:'damage',amount:3,price:60},
 {id:'health',name:'Mạch sinh học',stat:'health',amount:15,price:65},
 {id:'armor',name:'Lưới phòng thủ',stat:'armor',amount:3,price:60},
 {id:'crit',name:'Bộ ngắm lượng tử',stat:'crit',amount:.02,price:80},
 {id:'shield',name:'Mạch khiên',stat:'shield',amount:20,price:75},
 {id:'stun',name:'Lõi gây choáng',stat:'stun',amount:.05,price:90},
 {id:'regen',name:'Mạch tái sinh',stat:'regen',amount:2,price:80},
 {id:'pocket',name:'Khoang mở rộng',stat:'pocket',amount:2,price:100},
 {id:'crit-damage',name:'Bộ khuếch đại chí mạng',stat:'critDamage',amount:.04,price:100,newOnly:true},
];
const labels={damage:'Sát thương',health:'Máu',armor:'Giáp',crit:'Chí mạng',shield:'Lá chắn',stun:'Choáng',regen:'Hồi HP/lượt',pocket:'Ô túi',critDamage:'Sát thương chí mạng'};
const percentages=new Set(['crit','stun','critDamage']);
export function moduleSummary(item){return Object.entries(item?.stats||{}).filter(([,v])=>v>0).map(([key,n])=>`${labels[key]} +${new Intl.NumberFormat('vi',{maximumFractionDigits:1}).format(percentages.has(key)?n*100:n)}${percentages.has(key)?'%':''}`).join(' · ');}
// A canonical ID contains only type, rarity and level. Clients cannot choose stats.
export function moduleItem(id){
 if(typeof id!=='string')return null;
 const legacy=moduleTypes.find(v=>!v.newOnly&&(id===v.id||id==='mod-'+v.id));
 if(legacy){const item={...legacy,id:'mod-'+legacy.id,type:legacy.id,fittedId:legacy.id,rarity:2,level:1,quality:80,icon:'▣',legacy:true,stats:{[legacy.stat]:legacy.amount}};return {...item,label:moduleSummary(item)};}
 const match=/^mod-([a-z-]+)-r([0-5])-l([1-9]\d{0,3})$/.exec(id);if(!match)return null;
 const type=moduleTypes.find(v=>v.id===match[1]),rarity=Number(match[2]),level=Number(match[3]);if(!type||level>1000)return null;
 const scale=(1+rarity*.25)*(1+(level-1)*.025),value=type.amount*scale;
 const stats={[type.stat]:percentages.has(type.stat)?Math.round(value*1000)/1000:Math.max(1,Math.round(value))};
 if(rarity>0){const secondary=type.stat==='health'?'armor':'health';stats[secondary]=Math.max(1,Math.round(rarity*(secondary==='health'?2:1)*(1+(level-1)*.06)));}
 if(rarity>=2&&type.stat!=='damage')stats.damage=Math.max(1,Math.round(rarity*(1+(level-1)*.025)));
 const item={id,type:type.id,fittedId:id,name:`Module ${rarities[rarity]} · ${type.name}`,rarity,level,quality:70+rarity*5,stats,icon:'▣',legacy:false};return {...item,label:moduleSummary(item)};
}
export function makeModule(type,rarity,level){return moduleItem(`mod-${type}-r${rarity}-l${level}`);}
export function fittedModuleStats(ids){const sum={};for(const id of ids||[]){const m=moduleItem(id);if(m)for(const [key,n] of Object.entries(m.stats))sum[key]=(sum[key]||0)+n;}return sum;}
export function moduleDrop(level,rarity,random=Math.random){const index=Math.min(moduleTypes.length-1,Math.max(0,Math.floor(random()*moduleTypes.length)));return makeModule(moduleTypes[index].id,Math.max(0,Math.min(5,rarity)),Math.max(1,Math.min(1000,Math.floor(Number.isFinite(level)?level:1)))).id;}
