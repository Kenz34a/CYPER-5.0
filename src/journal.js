export function activity(s,key){s.activity??={};s.activity[key]=(s.activity[key]||0)+1;}
export function record(s,text){
 s.log.unshift(text);s.log=s.log.slice(0,40);
 s.notificationSeq=(s.notificationSeq||0)+1;
 (s.notifications??=[]).unshift({id:String(s.notificationSeq),text,time:Date.now(),read:false});
 s.notifications=s.notifications.slice(0,100);
}
