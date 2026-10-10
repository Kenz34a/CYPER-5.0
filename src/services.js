import {equipmentSlots} from './gear-rules.js';
import {bagSize,bagCapacity,ownsGear} from './inventory-state.js';
import {record as log,activity} from './journal.js';
import {gear} from './content.js';
import {calibration,upgradeCost,itemStats} from './equipment.js';

export function resources(s){return {units:s.units??0,scrap:s.scrap??6,bank:s.bank??0};}
export function printing(s){return s.printing??{rank:1,xp:0,total:0};}
export function printPlan(s,slot){const p=printing(s);return {cost:40+p.rank*10,scrap:2,xp:25,maxLevel:Math.min(50,p.rank+2),pool:gear.filter(g=>g.slot===slot&&g.level<=p.rank+2&&!ownsGear(s,g.id))};}
export function printItem(s,slot,random=Math.random){
 if(!equipmentSlots.includes(slot)||s.combat||s.work||bagSize(s)>=bagCapacity(s))return false;
 const plan=printPlan(s,slot),r=resources(s);if(s.credits<plan.cost||r.scrap<plan.scrap||!plan.pool.length)return false;
 const g=plan.pool[Math.min(plan.pool.length-1,Math.floor(random()*plan.pool.length))];
 s.credits-=plan.cost;s.scrap=r.scrap-plan.scrap;s.inventory.push(g.id);const p={...printing(s)};p.xp+=plan.xp;p.total++;
 while(p.rank<50&&p.xp>=p.rank*50){p.xp-=p.rank*50;p.rank++;}if(p.rank===50)p.xp=Math.min(p.xp,2500);s.printing=p;
 log(s,`In thành công ${g.name}: +${plan.xp} XP nghề in.`);return true;
}
export function calibrationPlan(s,id,options={}){
 const g=gear.find(g=>g.id===id),c=calibration(s,id),boost=options.boost===true,protect=options.protect===true;
 const destruction=protect||c.level===0?0:0.02+c.level*0.005,success=Math.min(1-destruction,1-c.level*0.08+(boost?0.1:0));
 const before=itemStats(s,id),after=g&&c.level<5?{...before,power:before.power+2,quality:Math.min(100,before.quality+2)}:before;
 return {level:c.level,cost:Math.ceil(upgradeCost(s,id)*0.65),units:(boost?1:0)+(protect?2:0),success,destruction,failure:Math.max(0,1-success-destruction),before,after};
}
export function calibrateItem(s,id,options={},random=Math.random){
 const g=gear.find(g=>g.id===id),plan=calibrationPlan(s,id,options),r=resources(s);
 if(s.work||s.combat||!g||!s.inventory.includes(id)||g.level>s.level||plan.level>=5||s.credits<plan.cost||r.units<plan.units)return false;
 s.credits-=plan.cost;s.units=r.units-plan.units;const roll=random();let result;
 if(roll<plan.destruction){s.inventory=s.inventory.filter(item=>item!==id);if(s.calibration)delete s.calibration[id];for(const slot of Object.keys(s.equipped))if(s.equipped[slot]===id)s.equipped[slot]=null;const maxHp=90+s.level*10+Object.values(s.equipped).reduce((sum,item)=>sum+itemStats(s,item).health,0);s.hp=Math.min(s.hp,maxHp);result='destroyed';log(s,`Hiệu chuẩn phá hủy ${g.name}. Trang bị và module đã mất.`);}
 else if(roll<plan.destruction+plan.success){const c=calibration(s,id);s.calibration??={};s.calibration[id]={level:c.level+1,modules:[...c.modules]};result='success';activity(s,'calibrations');log(s,`Hiệu chuẩn thành công ${g.name} +${c.level+1}.`);}
 else{result='failed';log(s,`Hiệu chuẩn thất bại ${g.name}. Chỉ số giữ nguyên; phí đã tiêu thụ.`);}
 s.lastCalibration={id,result};return true;
}
export function exchange(s,direction,amount){
 // Unit is premium currency. Legacy exchange requests cannot mint or convert it.
 return false;
}
export function bankTransfer(s,direction,amount){
 if(s.combat||!Number.isSafeInteger(amount)||amount<=0||amount>1000000000)return false;const r=resources(s);
 if(direction==='deposit'){if(s.credits<amount)return false;s.credits-=amount;s.bank=r.bank+amount;}
 else if(direction==='withdraw'){if(r.bank<amount)return false;s.bank=r.bank-amount;s.credits+=amount;}
 else return false;log(s,`${direction==='deposit'?'Gửi':'Rút'} ${amount} ₡ tại ngân hàng Helix.`);return true;
}

export function gainPrintXP(s,xp){const p={...printing(s)};p.xp+=xp;while(p.rank<50&&p.xp>=p.rank*50){p.xp-=p.rank*50;p.rank++;}if(p.rank===50)p.xp=Math.min(p.xp,2500);s.printing=p;}
