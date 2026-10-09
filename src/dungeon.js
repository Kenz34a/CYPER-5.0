import {awardDungeonFragment} from './rail.js';
import {ownsGear,receiveGear,receiveStack,blueprintDrop} from './inventory-state.js';
import {gear,maps} from './content.js';
import {startFight,stats,note,gain} from './game.js';
import {createFloor,index} from './dungeon-layout.js';
export const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export function enterDungeon(s){
 if(s.work||s.dungeon||s.combat||s.energy<3||s.hp<=0)return false;
 s.energy-=3;s.dungeonRuns=(s.dungeonRuns||0)+1;s.dungeon=createFloor(s.map,s.dungeonRuns,1);note(s,'Đã vào dungeon. Tìm boss để mở cửa sang tầng tiếp theo.');return true;
}
export function leaveDungeon(s){if(!s.dungeon||s.combat)return false;s.dungeon=null;note(s,'Rời dungeon. Bạn giữ lại chiến lợi phẩm; lần vào sau tạo lượt khám phá mới.');return true;}
export function stepDungeon(s,direction,random=Math.random){
 const d=s.dungeon,delta=directions[direction];if(!d||s.combat||!delta)return false;
 const x=d.x+delta[0],y=d.y+delta[1];if(x<0||y<0||x>=d.width||y>=d.height)return false;
 const tile=index(x,y),cell=d.cells[tile];if(cell==='#')return false;
 if(cell==='X'&&!d.bossDefeated){note(s,'Cửa tầng bị khóa. Hạ boss Ω trước.');return false;}
 const from={x:d.x,y:d.y};
 if(cell==='M'||cell==='B'){
  if(!startFight(s,cell==='B'?'boss':'enemy',true))return false;
  const factor=1+(d.floor-1)*0.15;s.combat.hp=s.combat.currentHp=Math.ceil(s.combat.hp*factor);s.combat.attack=Math.ceil(s.combat.attack*factor);s.combat.name+=` / tầng ${d.floor}`;s.combat.dungeonTile=tile;s.combat.dungeonFloor=d.floor;s.combat.from=from;
 }
 d.x=x;d.y=y;d.steps++;if(!d.visited.includes(tile))d.visited.push(tile);
 if(cell==='C'){
  d.cells[tile]='.';d.chests++;blueprintDrop(s,['weapon','armor','implant'][d.chests%3]);const m=maps.find(m=>m.id===d.map);const credits=20+m.level*5;s.credits+=credits;s.scrap=(s.scrap??6)+2;note(s,`Mở rương: +${credits} ₡, +2 linh kiện.`);
  const pool=gear.filter(g=>g.level<=s.level+1&&!ownsGear(s,g.id));if(random()<0.35&&pool.length){const item=pool[Math.floor(random()*pool.length)];receiveGear(s,item.id);note(s,`${s.itemInbox?.includes(item.id)?'Túi đầy, gửi vào hộp thư:':'Rương chứa'} ${item.name}.`);}
 }else if(cell==='H'){d.cells[tile]='.';s.hp=Math.min(stats(s).maxHp,s.hp+35);s.energy=Math.min(30,s.energy+10);note(s,'Trạm cứu trợ: +35 HP, +10 EN.');}
 else if(cell==='T'){d.cells[tile]='.';s.energy=Math.min(30,s.energy+5);note(s,'Giải mã terminal: +5 EN.');}
 else if(cell==='X'){
  if(d.floor<3){s.dungeon=createFloor(d.map,d.run,d.floor+1);note(s,`Đã xuống tầng ${d.floor+1}.`);}
  else{const level=maps.find(m=>m.id===d.map).level;s.credits+=100+level*10;s.scrap=(s.scrap??6)+3;s.dungeonClears=(s.dungeonClears||0)+1;receiveStack(s,'nitron',2);note(s,'Thưởng dungeon: 2 pin Nitron; túi đầy sẽ gửi vào hộp thư.');awardDungeonFragment(s,d.map);s.dungeon=null;gain(s,50+level*5);note(s,`Hoàn thành dungeon 3 tầng: +${100+level*10} ₡, +3 linh kiện, +${50+level*5} XP.`);}
 }
 return true;
}
