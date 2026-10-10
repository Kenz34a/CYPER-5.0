import {queueLoot} from './loot.js';
import {equipmentSlots} from './gear-rules.js';
import {dungeonModes,modePlan,loreFor} from './dungeon-events.js';
import {awardDungeonFragment} from './rail.js';
import {ownsGear} from './inventory-state.js';
import {gear,maps} from './content.js';
import {startFight,stats,note,gain} from './game.js';
import {createFloor,index,remainingMonsters} from './dungeon-layout.js';
export const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export function enterDungeon(s,mode='normal',{corporation=false}={}){
 const plan=dungeonModes.find(v=>v.id===mode);if(!plan||mode==='corporation'&&(!corporation||s.level<10))return false;
 if(s.work||s.dungeon||s.combat||s.energy<plan.energy||s.hp<=0)return false;
 s.energy-=plan.energy;s.dungeonRuns=(s.dungeonRuns||0)+1;s.dungeon=createFloor(s.map,s.dungeonRuns,1,mode);note(s,'Đã vào dungeon. Chạm ô đích để tìm đường. Hạ hết quái và boss trên tầng để mở rương và cửa.');return true;
}
export function leaveDungeon(s){if(!s.dungeon||s.combat)return false;s.dungeon=null;note(s,'Rời dungeon. Bạn giữ lại chiến lợi phẩm; lần vào sau tạo lượt khám phá mới.');return true;}
export function stepDungeon(s,direction,random=Math.random){
 const d=s.dungeon,delta=directions[direction];if(!d||s.work||s.combat||!delta)return false;
 const x=d.x+delta[0],y=d.y+delta[1];if(x<0||y<0||x>=d.width||y>=d.height)return false;
 const tile=index(x,y),cell=d.cells[tile];if(cell==='#')return false;
 const remaining=remainingMonsters(d);
 if(cell==='X'&&remaining){note(s,`Cửa tầng bị khóa. Còn ${remaining} quái cần hạ (kể cả boss).`);return false;}
 const from={x:d.x,y:d.y};
 if(cell==='M'||cell==='B'){
  const variant=d.mode&&d.mode!=='normal'?['rage','shielded','fortified','agile','overclock'][(tile+d.run+d.floor)%5]:'plain';
  if(!startFight(s,cell==='B'?'boss':'enemy',true,variant))return false;
  const plan=modePlan(d),factor=(1+(d.floor-1)*0.15)*plan.hp;s.combat.hp=s.combat.currentHp=Math.ceil(s.combat.hp*factor);s.combat.attack=Math.ceil(s.combat.attack*(1+(d.floor-1)*.15)*plan.attack);s.combat.shield=s.combat.currentShield=Math.ceil((s.combat.shield||0)*factor);s.combat.xp=Math.ceil(s.combat.xp*plan.reward);s.combat.credits=Math.ceil(s.combat.credits*plan.reward);s.combat.name+=` / tầng ${d.floor}`;s.combat.dungeonTile=tile;s.combat.dungeonFloor=d.floor;s.combat.from=from;
 }
 d.x=x;d.y=y;d.steps++;if(!d.visited.includes(tile))d.visited.push(tile);
 if(cell==='C'&&remaining){note(s,`Rương bị khóa. Còn ${remaining} quái trên tầng. Bạn vẫn có thể đi qua ô này.`);}
 else if(cell==='C')openChest(s,d,tile,random);
 else if(cell==='H'){d.cells[tile]='.';s.hp=Math.min(stats(s).maxHp,s.hp+35);s.energy=Math.min(30,s.energy+10);note(s,'Trạm cứu trợ: +35 HP, +10 EN.');}
 else if(cell==='T'){d.cells[tile]='.';const lore=loreFor(d.map);if(!s.loreFound?.includes(d.map))(s.loreFound??=[]).push(d.map);s.lastLore=lore;note(s,lore.title+': '+lore.text);}
 else if(cell==='Q'){d.cells[tile]='.';d.questFound=true;note(s,'Người giữ hầm đề nghị đổi 2 linh kiện lấy buff 10 phút.');}
 else if(cell==='X'){
  if(d.floor<3){s.dungeon=createFloor(d.map,d.run,d.floor+1,d.mode);if(d.instance)s.dungeon.instance=d.instance;note(s,`Đã xuống tầng ${d.floor+1}. Hạ hết quái để mở rương và cửa tầng này.`);}
  else{const level=maps.find(m=>m.id===d.map).level;s.credits+=100+level*10;s.scrap=(s.scrap??6)+3;s.dungeonClears=(s.dungeonClears||0)+1;s.dungeonTokens=(s.dungeonTokens||0)+modePlan(d).tokens;queueLoot(s,[{kind:'stack',id:'energy-cell',count:3},{kind:'stack',id:'antimatter',count:1},{kind:'stack',id:'nitron',count:2}],{source:'Hoàn thành phó bản',description:'Bạn đã thoát khỏi tầng cuối. Nhận số vật tư thu được từ chuyến thám hiểm.'});awardDungeonFragment(s,d.map);s.dungeon=null;gain(s,50+level*5);note(s,`Hoàn thành dungeon 3 tầng: +${100+level*10} ₡, +3 linh kiện, +${50+level*5} XP.`);}
 }
 return true;
}
function openChest(s,d,tile,random){
  d.cells[tile]='.';d.chests++;
  const slot=equipmentSlots[(d.chests+(d.floor-1)*3)%equipmentSlots.length],drops=[{kind:'stack',id:`bp-${slot}-0`,count:1},{kind:'stack',id:'ammo-material',count:3}];
  const m=maps.find(m=>m.id===d.map),credits=20+m.level*5;s.credits+=credits;s.scrap=(s.scrap??6)+2;note(s,`Mở rương: +${credits} ₡, +2 linh kiện.`);
  const pool=gear.filter(g=>g.level<=s.level+1&&!ownsGear(s,g.id));if(random()<0.35&&pool.length)drops.push({kind:'gear',id:pool[Math.floor(random()*pool.length)].id,count:1});
  queueLoot(s,drops,{source:'Rương tiếp tế',description:'Bạn tìm thấy một thùng hàng trong hành lang. Bên trong vẫn còn vật tư dùng được.'});
}

export const dungeonTarget=(d,tile)=>`${d.run}:${d.floor}:${tile}`;
export function dungeonPath(d,target){
 if(!d||typeof target!=='string'||!/^\d+:\d+:\d+$/.test(target))return null;
 const [run,floor,end]=target.split(':').map(Number),start=index(d.x,d.y);
 if(run!==d.run||floor!==d.floor||!Number.isSafeInteger(end)||end<0||end>=d.cells.length||d.cells[end]==='#'||d.cells[end]==='X'&&remainingMonsters(d))return null;
 const previous=new Map([[start,null]]),queue=[start],locked=remainingMonsters(d)>0;
 for(let p=0;p<queue.length&&!previous.has(end);p++){
  const tile=queue[p],x=tile%d.width,y=Math.floor(tile/d.width);
  for(const [dir,[dx,dy]] of Object.entries(directions)){
   const nx=x+dx,ny=y+dy,next=ny*d.width+nx;
   if(nx<0||ny<0||nx>=d.width||ny>=d.height||previous.has(next)||d.cells[next]==='#'||d.cells[next]==='X'&&(locked||next!==end))continue;
   previous.set(next,{tile,dir});queue.push(next);
  }
 }
 if(!previous.has(end))return null;
 const path=[];for(let tile=end;tile!==start;){const p=previous.get(tile);path.push(p.dir);tile=p.tile;}
 return path.reverse();
}
export function moveDungeon(s,target,random=Math.random,step=dir=>stepDungeon(s,dir,random)){
 const d=s.dungeon;if(!d||s.work||s.combat)return false;
 const path=dungeonPath(d,target);if(!path)return false;
 if(!path.length){const tile=index(d.x,d.y);if(d.cells[tile]!=='C'||remainingMonsters(d))return false;openChest(s,d,tile,random);return true;}
 let moved=false;const loot=s.pendingLoot?.id;
 for(const direction of path){
  if(!step(direction))break;moved=true;
  if(s.combat||s.dungeon!==d||s.pendingLoot?.id!==loot)break;
 }
 return moved;
}
