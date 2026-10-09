export const milestones=[
 {id:'printing',name:'MOLECULAR PRINTING',requirement:'In hai trang bị bất kỳ tại Máy in 3D.',target:2,credits:100,xp:40,scrap:2,destination:'printer'},
 {id:'progression20',name:'PROGRESSION-20',requirement:'Đạt cấp 20 và thu Chìa khóa bí mật Neon từ boss Chợ Dưới / Trung tâm (khu vực 20).',target:1,credits:800,xp:500,scrap:5,destination:'map'}
];
export const pveKills=s=>Object.entries(s.progress).filter(([k])=>/^map\d+:(enemy|boss)$/.test(k)).reduce((n,[,v])=>n+v,0);
export const bossKills=s=>Object.entries(s.progress).filter(([k])=>/^map\d+:boss$/.test(k)).reduce((n,[,v])=>n+v,0);
export const hasKey=s=>(s.progress['map19:boss']||0)>0;
export function milestoneStatus(s,id){const m=milestones.find(m=>m.id===id);if(!m)return null;const value=id==='printing'?Math.min(2,s.printing?.total||0):s.level>=20&&hasKey(s)?1:0;return {...m,value,done:!!s.milestoneClaims?.includes(id)};}
export const badgeCatalog=[
 {id:'printer',name:'Kỹ sư in',icon:'⬡',requirement:'In 2 trang bị',test:s=>(s.printing?.total||0)>=2},
 {id:'hunter',name:'Thợ săn tín hiệu',icon:'⌖',requirement:'Hạ 10 địch PvE',test:s=>pveKills(s)>=10},
 {id:'boss',name:'Kẻ phá tường',icon:'Ω',requirement:'Hạ 1 boss',test:s=>bossKills(s)>=1},
 {id:'arena',name:'Runner đấu trường',icon:'⚔',requirement:'Thắng 1 trận PvP',test:s=>s.wins>=1},
 {id:'dungeon',name:'Người vượt mê cung',icon:'▥',requirement:'Hoàn thành 1 dungeon',test:s=>(s.dungeonClears||0)>=1},
 {id:'veteran',name:'Runner kỳ cựu',icon:'◈',requirement:'Đạt cấp 20',test:s=>s.level>=20}
];
export const earnedBadges=s=>badgeCatalog.filter(b=>b.test(s));
export function skillValues(s){return [
 {name:'Kỹ thuật in',value:Math.min(100,(s.printing?.total||0)*5),raw:(s.printing?.total||0)+' bản in'},
 {name:'Chiến đấu',value:Math.min(100,pveKills(s)+s.wins*3),raw:pveKills(s)+' PvE / '+s.wins+' PvP'},
 {name:'Chế tạo',value:Math.min(100,((s.activity?.calibrations||0)+(s.activity?.coresCrafted||0)+(s.activity?.crafted||0))*5),raw:(s.activity?.calibrations||0)+' hiệu chuẩn / '+(s.activity?.coresCrafted||0)+' lõi / '+(s.activity?.crafted||0)+' vật phẩm'},
 {name:'Giao thương',value:Math.min(100,(s.activity?.trades||0)*4),raw:(s.activity?.trades||0)+' giao dịch'},
 {name:'Khám phá',value:Math.min(100,(s.scavenged?.length||0)*2.5+(s.dungeonClears||0)*10),raw:(s.scavenged?.length||0)+' khu tìm kiếm / '+(s.dungeonClears||0)+' dungeon'},
 {name:'Y học',value:Math.min(100,(s.activity?.heals||0)*5),raw:(s.activity?.heals||0)+' lần điều trị'}
 ];}
