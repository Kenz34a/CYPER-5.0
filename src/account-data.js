// Server-only cleanup. The caller verifies session, password and exact character name first.
export function removeAccountData(db,id){
 const draft=structuredClone(db),googleSub=draft.users.find(u=>u.id===id)?.identities?.google?.sub,removedMessages=new Set(draft.messages.filter(m=>m.author===id).map(m=>m.id));
 draft.users=draft.users.filter(u=>u.id!==id);draft.market=draft.market.filter(m=>m.seller!==id);draft.mail=draft.mail.filter(m=>m.sender!==id&&m.recipient!==id);draft.messages=draft.messages.filter(m=>m.author!==id).map(m=>{if(m.reply&&removedMessages.has(m.reply.id))delete m.reply;return m;});
 draft.corporations=draft.corporations.filter(c=>{const members=draft.users.filter(u=>u.corporation===c.id);if(!members.length)return false;if(c.leader===id)c.leader=members[0].id;return true;});
 for(const u of draft.users)if(u.commended?.id===id)u.commended={day:u.commended.day,id:null};
 for(const e of draft.expeditions||[]){e.members=e.members.filter(v=>v!==id);e.departed=e.departed.filter(v=>v!==id);for(const room of Object.values(e.foes)){delete room.damage[id];room.rewarded=room.rewarded.filter(v=>v!==id);}if(e.owner===id)e.owner=e.members[0]||null;}draft.expeditions=(draft.expeditions||[]).filter(e=>e.owner);
 for(const [key,flow] of Object.entries(draft.oauthFlows||{}))if(flow.linkUserId===id||(googleSub&&flow.identity?.sub===googleSub))delete draft.oauthFlows[key];
 return draft;
}
