import {executeCraft} from './crafting.js';
import {stats,note,gain} from './game.js';
import {activity} from './journal.js';
import {milestoneStatus,earnedBadges} from './achievements.js';
export function progressionAction(s,b){
 if(b.action==='notifications-read'){for(const n of s.notifications||[])n.read=true;return true;}
 if(b.action==='pin-badge'){if(!Number.isInteger(b.slot)||b.slot<0||b.slot>=6||b.id!==''&&!earnedBadges(s).some(v=>v.id===b.id))return false;const pins=[...(s.pinnedBadges||Array(6).fill(null))];if(b.id&&pins.some((id,i)=>id===b.id&&i!==b.slot))return false;pins[b.slot]=b.id||null;s.pinnedBadges=pins;return true;}
 if(b.action==='title'){if(b.id!==''&&!earnedBadges(s).some(v=>v.id===b.id))return false;s.title=b.id||null;return true;}
 if(s.work||s.combat||s.dungeon)return false;
 if(b.action==='milestone-claim'){const m=milestoneStatus(s,b.id);if(!m||m.done||m.value<m.target)return false;(s.milestoneClaims??=[]).push(m.id);s.credits+=m.credits;s.scrap=(s.scrap??6)+m.scrap;gain(s,m.xp);note(s,`Hoàn thành ${m.name}: +${m.credits} ₡, +${m.xp} XP, +${m.scrap} linh kiện.`);return true;}
 if(b.action==='scavenge'){if(s.energy<2||s.scavenged?.includes(s.map))return false;s.energy-=2;(s.scavenged??=[]).push(s.map);s.hashProcessors=(s.hashProcessors||0)+1;s.scrap=(s.scrap??6)+1;note(s,'Tìm kiếm khu vực: +1 bộ xử lý Hash, +1 linh kiện. Mỗi khu vực chỉ tìm một lần.');return true;}
 if(b.action==='core-craft')return executeCraft(s,'ai-core');
 if(b.action==='core-recharge'){const st=stats(s);if((s.aiCores||0)<1||s.hp>=st.maxHp&&s.energy>=30)return false;s.aiCores--;s.hp=Math.min(st.maxHp,s.hp+30);s.energy=Math.min(30,s.energy+20);note(s,'Dùng lõi AI: +30 HP, +20 EN (không vượt giới hạn).');return true;}
 return false;
}
