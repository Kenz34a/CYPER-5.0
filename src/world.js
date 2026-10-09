import {bagSize,capacity,receiveGear} from './inventory-state.js';
import {publicAssets} from './assets.js';
import {randomBytes} from 'node:crypto';
import {gear} from './content.js';
import {note} from './game.js';
import {activity} from './journal.js';

export const funds=[
 {id:'global',name:'Quỹ tiệc toàn cầu',target:10000,hour:0,discount:5},
 {id:'morning',name:'Quỹ Cali 07:00',target:3000,hour:7,discount:2},
 {id:'evening',name:'Quỹ Cali 19:00',target:3000,hour:19,discount:3}
];
const uid=()=>randomBytes(12).toString('hex');
const idle=s=>!s.combat&&!s.dungeon;
const amount=n=>Number.isSafeInteger(n)&&n>0&&n<=1000000;
export function initWorld(db){db.messages??=[];db.mail??=[];db.market??=[];db.corporations??=[];db.community??={day:'',donations:{}};}
function today(now){return new Date(now+7*3600000).toISOString().slice(0,10);}
function donations(db,now){return db.community.day===today(now)?db.community.donations:{};}
function fundView(db,now){const data=donations(db,now),hour=new Date(now+7*3600000).getUTCHours();return funds.map(f=>{const entries=Object.entries(data[f.id]||{}),total=entries.reduce((n,[,v])=>n+v,0);return {...f,total,active:total>=f.target&&hour>=f.hour,contributors:entries.filter(([id])=>{const user=db.users.find(u=>u.id===id);return user&&!user.state.settings?.hideDonations;}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,value])=>({name:db.users.find(u=>u.id===id)?.state.name||'Runner',value}))};});}
export function shopDiscount(db,now=Date.now()){return fundView(db,now).filter(f=>f.active).reduce((n,f)=>n+f.discount,0)/100;}
export function worldView(db,viewer,now=Date.now()){
 const decorate=m=>{const author=db.users.find(u=>u.id===m.author);return {...m,name:author?.state.name||'Runner',level:author?.state.level||1,corporationName:db.corporations.find(c=>c.id===author?.corporation)?.name||'',chatSkin:author?publicAssets(author.state).chatSkin:null};};
 return {day:today(now),timezone:'Asia/Ho_Chi_Minh',funds:fundView(db,now),discount:shopDiscount(db,now),kills:db.users.reduce((n,u)=>n+Object.entries(u.state.progress).filter(([k])=>/^map\d+:(enemy|boss)$/.test(k)).reduce((a,[,v])=>a+v,0),0),
 messages:db.messages.filter(m=>!m.channel||m.channel==='global').map(decorate),
 guildMessages:viewer?.corporation?db.messages.filter(m=>m.channel==='guild'&&m.corporation===viewer.corporation).map(decorate):[],
 mail:viewer?db.mail.filter(m=>m.recipient===viewer.id||m.sender===viewer.id).slice(-200).map(m=>({...m,senderName:db.users.find(u=>u.id===m.sender)?.state.name||'Runner',recipientName:db.users.find(u=>u.id===m.recipient)?.state.name||'Runner'})):[],
 players:db.users.map(u=>({id:u.id,name:u.state.name,level:u.state.level,reputation:u.state.reputation||0})),commendedToday:viewer?.commended?.day===today(now)?[viewer.commended.id]:[],
 market:db.market.map(m=>({...m,sellerName:db.users.find(u=>u.id===m.seller)?.state.name||'Runner'})),
 corporations:db.corporations.map(c=>({id:c.id,name:c.name,leader:c.leader,members:db.users.filter(u=>u.corporation===c.id).map(u=>({id:u.id,name:u.state.name,level:u.state.level}))})),corporation:viewer?.corporation||null};
}
export function worldAction(db,u,b,now=Date.now()){
 const s=u.state;
 switch(b.action){
 case 'chat':{
 const text=typeof b.text==='string'?b.text.trim():'',channel=b.channel||'global';
 if(!['global','guild'].includes(channel)||channel==='guild'&&!u.corporation||text.length>256||/[\x00-\x08\x0b-\x1f]/.test(text)||now-(u.lastChat||0)<2000)return false;
 const item=b.item?gear.find(g=>g.id===b.item&&s.inventory.includes(g.id)):null;if(b.item&&!item||!text&&!item)return false;
 const reply=b.replyId?db.messages.find(m=>m.id===b.replyId&&(m.channel||'global')===channel&&(channel==='global'||m.corporation===u.corporation)):null;if(b.replyId&&!reply)return false;
 const m={id:uid(),author:u.id,text,time:now,channel,...(channel==='guild'?{corporation:u.corporation}:{})};
 if(reply)m.reply={id:reply.id,name:db.users.find(v=>v.id===reply.author)?.state.name||'Runner',text:(reply.text||reply.item?.name||'').slice(0,200)};
 if(item)m.item={id:item.id,name:item.name,level:item.level,calibration:structuredClone(s.calibration?.[item.id]||{level:0,modules:[]})};
 db.messages.push(m);const ids=db.messages.filter(v=>(v.channel||'global')===channel&&(channel==='global'||v.corporation===u.corporation)).slice(-100).map(v=>v.id);
 db.messages=db.messages.filter(v=>(v.channel||'global')!==channel||channel==='guild'&&v.corporation!==u.corporation||ids.includes(v.id));u.lastChat=now;return true;
 }
 case 'mail-send':{const recipient=db.users.find(v=>v.id===b.id&&v.id!==u.id),text=typeof b.text==='string'?b.text.trim():'';if(!recipient||!text||text.length>1000||/[\x00-\x08\x0b-\x1f]/.test(text)||now-(u.lastMail||0)<5000)return false;db.mail.push({id:uid(),sender:u.id,recipient:recipient.id,text,time:now,read:false});const keep=new Set(db.mail.filter(m=>m.recipient===recipient.id).slice(-100).map(m=>m.id));db.mail=db.mail.filter(m=>m.recipient!==recipient.id||keep.has(m.id));u.lastMail=now;note(recipient.state,`Nhận thư riêng từ ${s.name}.`);return true;}
 case 'mail-read':{const m=db.mail.find(m=>m.id===b.id&&m.recipient===u.id);if(!m)return false;m.read=true;return true;}
 case 'rep-give':{const receiver=db.users.find(v=>v.id===b.id&&v.id!==u.id);if(!receiver||u.commended?.day===today(now))return false;u.commended={day:today(now),id:receiver.id};receiver.state.reputation=(receiver.state.reputation||0)+1;note(receiver.state,`${s.name} tặng bạn 1 uy tín.`);note(s,`Tặng ${receiver.state.name} 1 uy tín.`);return true;}
 case 'donate':{const f=funds.find(f=>f.id===b.id);if(!idle(s)||!f||!amount(b.amount)||s.credits<b.amount)return false;const data=donations(db,now),total=Object.values(data[f.id]||{}).reduce((n,v)=>n+v,0);if(b.amount>f.target-total)return false;if(db.community.day!==today(now))db.community={day:today(now),donations:{}};const d=db.community.donations[f.id]??={};d[u.id]=(d[u.id]||0)+b.amount;s.credits-=b.amount;note(s,`Đóng góp ${b.amount} ₡ cho ${f.name}.`);return true;}
 case 'market-list':{const g=gear.find(g=>g.id===b.id);if(!idle(s)||!g||!s.inventory.includes(g.id)||Object.values(s.equipped).includes(g.id)||!amount(b.price)||db.market.filter(m=>m.seller===u.id).length>=10||db.market.length>=1000)return false;const calibration=structuredClone(s.calibration?.[g.id]||{level:0,modules:[]});db.market.push({id:uid(),gear:g.id,seller:u.id,price:b.price,calibration,time:now});(s.escrow??=[]).push(g.id);s.inventory=s.inventory.filter(id=>id!==g.id);if(s.calibration)delete s.calibration[g.id];note(s,`Gửi ${g.name} vào chợ người chơi.`);return true;}
 case 'market-buy':case 'market-cancel':{const m=db.market.find(m=>m.id===b.id);if(!idle(s)||!m)return false;const g=gear.find(g=>g.id===m.gear),seller=db.users.find(v=>v.id===m.seller),cancel=b.action==='market-cancel';if(!g||!seller||s.inventory.includes(g.id)||s.housing?.storage?.includes(g.id)||s.itemInbox?.includes(g.id))return false;if(cancel){if(m.seller!==u.id)return false;}else{if(m.seller===u.id||s.escrow?.includes(g.id)||g.level>s.level||s.credits<m.price||bagSize(s)>=capacity)return false;s.credits-=m.price;seller.state.credits+=m.price;activity(s,'trades');activity(seller.state,'trades');note(seller.state,`${s.name} mua ${g.name}: +${m.price} ₡.`);}seller.state.escrow=(seller.state.escrow||[]).filter(id=>id!==g.id);receiveGear(s,g.id,{permanent:cancel});(s.calibration??={})[g.id]=structuredClone(m.calibration);db.market=db.market.filter(v=>v.id!==m.id);note(s,`${cancel?'Thu hồi':'Mua'} ${g.name}${cancel?'':` · ${m.price} ₡`}.`);return true;}
 case 'corp-create':{const name=typeof b.text==='string'?b.text.trim():'';if(!idle(s)||u.corporation||s.credits<500||name.length<3||name.length>32||db.corporations.length>=200||db.corporations.some(c=>c.name.toLocaleLowerCase('vi')===name.toLocaleLowerCase('vi')))return false;const c={id:uid(),name,leader:u.id};db.corporations.push(c);u.corporation=c.id;s.credits-=500;note(s,`Thành lập tập đoàn ${name}.`);return true;}
 case 'corp-join':{const c=db.corporations.find(c=>c.id===b.id);if(!idle(s)||u.corporation||!c||db.users.filter(v=>v.corporation===c.id).length>=20)return false;u.corporation=c.id;note(s,`Gia nhập ${c.name}.`);return true;}
 case 'corp-leave':{const c=db.corporations.find(c=>c.id===u.corporation);if(!idle(s)||!c)return false;delete u.corporation;const next=db.users.find(v=>v.corporation===c.id);if(!next)db.corporations=db.corporations.filter(v=>v.id!==c.id);else if(c.leader===u.id)c.leader=next.id;note(s,`Rời tập đoàn ${c.name}.`);return true;}
 default:return false;
 }
}
