import {bagSize,bagCapacity} from './inventory-state.js';
import {activity} from './journal.js';
import {gear,npcs} from './content.js';
import {stats,note,rest} from './game.js';
export const cosmetics=[{id:'cyan',name:'Mạch băng',color:'#b7d9d2',price:100},{id:'pink',name:'Xung hồng',color:'#ff286b',price:150},{id:'gold',name:'Lõi vàng',color:'#d8d640',price:200}];
export const housingLevel=100,housingPrice=2500;
export function cityAction(s,b){
 if(s.combat||s.dungeon)return false;
 if(b.action==='alley-rumor'){const n=npcs.find(v=>v.map===s.map);if(!n)return false;note(s,`Người giữ sóng · ${n.name}: ${n.dialogue}`);return true;}
 if(b.action==='medical'){if(s.work)return false;if(s.credits<15||s.hp>=stats(s).maxHp)return false;s.credits-=15;s.hp=stats(s).maxHp;activity(s,'heals');note(s,'Trinoky: điều trị đầy sinh lực · 15 ₡.');return true;}
 if(b.action==='cosmetic'){const c=cosmetics.find(c=>c.id===b.id);if(!c)return false;const owned=s.cosmetics??=[];if(!owned.includes(c.id)){if(s.credits<c.price)return false;s.credits-=c.price;(s.cosmetics??=[]).push(c.id);}s.aura=c.id;note(s,`Bật cyberwear ${c.name}.`);return true;}
 if(b.action==='housing-rent'){if(s.housing||s.level<housingLevel||s.credits<housingPrice)return false;s.credits-=housingPrice;s.housing={storage:[]};note(s,'Đã thuê căn hộ Neon. Phí một lần 2.500 ₡.');return true;}
 if(!s.housing)return false;
 if(b.action==='housing-rest')return rest(s);
 if(['housing-deposit','housing-withdraw'].includes(b.action)){const g=gear.find(g=>g.id===b.id),storage=s.housing.storage;if(!g)return false;if(b.action==='housing-deposit'){if(!s.inventory.includes(g.id)||Object.values(s.equipped).includes(g.id)||storage.includes(g.id)||storage.length>=20)return false;s.inventory=s.inventory.filter(id=>id!==g.id);storage.push(g.id);}else{if(!storage.includes(g.id)||s.inventory.includes(g.id)||bagSize(s)>=bagCapacity(s))return false;s.housing.storage=storage.filter(id=>id!==g.id);s.inventory.push(g.id);}note(s,`${b.action==='housing-deposit'?'Cất':'Lấy'} ${g.name}.`);return true;}
 return false;
}
