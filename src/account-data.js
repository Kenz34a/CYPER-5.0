// Server-only cleanup. The caller verifies session, password and exact character name first.
export function removeAccountData(db,id){
 const draft=structuredClone(db),removedMessages=new Set(draft.messages.filter(m=>m.author===id).map(m=>m.id));
 draft.users=draft.users.filter(u=>u.id!==id);draft.market=draft.market.filter(m=>m.seller!==id);draft.mail=draft.mail.filter(m=>m.sender!==id&&m.recipient!==id);draft.messages=draft.messages.filter(m=>m.author!==id).map(m=>{if(m.reply&&removedMessages.has(m.reply.id))delete m.reply;return m;});
 draft.corporations=draft.corporations.filter(c=>{const members=draft.users.filter(u=>u.corporation===c.id);if(!members.length)return false;if(c.leader===id)c.leader=members[0].id;return true;});
 for(const u of draft.users)if(u.commended?.id===id)u.commended={day:u.commended.day,id:null};
 return draft;
}
