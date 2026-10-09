import {executeCraft} from './crafting.js';
export {craftPool} from './crafting.js';
import {gear} from './content.js';
import {stats,turn,note,sell} from './game.js';
import {activity} from './journal.js';
import {supplies,blueprints,stacks,bagSize,capacity,hasRoom,ownsGear,addStack,settleInbox,clearInboxEntry} from './inventory-state.js';
export const quickSlots=s=>s.quickSlots??['balm','nano','stim'];
export function inventoryAction(s,b){
 const item=supplies.find(v=>v.id===b.id),bp=blueprints.find(v=>v.id===b.id);
 if(b.action==='quick-set'){if(!Number.isInteger(b.slot)||b.slot<0||b.slot>2||b.id&&!item)return false;const q=[...quickSlots(s)];q[b.slot]=b.id||null;s.quickSlots=q;return true;}
 if(b.action==='item-use'){
  if(!item||!(stacks(s)[item.id]>0))return false;const st=stats(s);if((!item.hp||s.hp>=st.maxHp)&&(!item.energy||s.energy>=30))return false;
  s.stacks??={...stacks(s)};s.stacks[item.id]--;s.hp=Math.min(st.maxHp,s.hp+item.hp);s.energy=Math.min(30,s.energy+item.energy);activity(s,'heals');note(s,`Dùng ${item.name}: +${item.hp} HP / +${item.energy} EN.`);
  // A combat consumable occupies one turn and the enemy retaliates normally.
  if(s.combat)turn(s,'consumable');return true;
 }
 if(s.combat||s.dungeon)return false;
 if(b.action==='bulk-sell'){if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>60||new Set(b.ids).size!==b.ids.length||!b.ids.every(id=>gear.some(g=>g.id===id)&&s.inventory.includes(id)&&!Object.values(s.equipped).includes(id)))return false;for(const id of b.ids)sell(s,id);note(s,`Đã bán ${b.ids.length} trang bị.`);return true;}
 if(b.action==='supply-buy'){if(!item||s.credits<item.price||!hasRoom(s,item.id))return false;addStack(s,item.id);s.credits-=item.price;activity(s,'trades');note(s,`Mua ${item.name}.`);return true;}
 if(b.action==='craft')return executeCraft(s,b.id,b.count??1);
 if(b.action==='inbox-claim-all'){let received=0;if(!s.inventoryWelcomeClaimed&&hasRoom(s,'balm')){inventoryAction(s,{action:'inbox-claim',id:'welcome'});received++;}received+=settleInbox(s).received;if(!received)return false;note(s,'Đã lấy các vật phẩm còn chỗ trong túi. Phần còn lại được giữ trong hộp thư.');return true;}
 if(b.action==='inbox-claim'){
  settleInbox(s,{collect:false});
  if(b.id==='welcome'){if(s.inventoryWelcomeClaimed||!hasRoom(s,'balm'))return false;addStack(s,'balm',2);s.credits+=50;s.scrap=(s.scrap??6)+2;s.inventoryWelcomeClaimed=true;note(s,'Nhận tiếp tế runner: 2 thuốc, 50 ₡ và 2 linh kiện.');return true;}
  if(s.itemInbox?.includes(b.id)){if(bagSize(s)>=capacity||s.inventory.includes(b.id))return false;clearInboxEntry(s,b.id);s.inventory.push(b.id);note(s,'Đã nhận trang bị từ hộp thư.');return true;}
  if((s.stackInbox?.[b.id]||0)>0&&hasRoom(s,b.id)){addStack(s,b.id,s.stackInbox[b.id]);clearInboxEntry(s,b.id);note(s,'Đã nhận vật phẩm từ hộp thư.');return true;}return false;
 }
 if(b.action==='loadout-save'||b.action==='loadout-apply'){
  const i=Number(b.id);if(!['0','1'].includes(String(b.id)))return false;
  if(b.action==='loadout-save'){s.loadouts??=[];s.loadouts[i]={...s.equipped};note(s,`Lưu bộ trang bị ${i+1}.`);return true;}
  const set=s.loadouts?.[i];if(!set||!['weapon','armor','implant'].every(slot=>set[slot]===null||gear.some(g=>g.id===set[slot]&&g.slot===slot&&s.inventory.includes(g.id)&&g.level<=s.level)))return false;
  s.equipped={...set};s.hp=Math.min(s.hp,stats(s).maxHp);note(s,`Đổi sang bộ trang bị ${i+1}.`);return true;
 }
 return false;
}
