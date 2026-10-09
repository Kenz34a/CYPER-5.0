export const workBlockedActions=new Set(['move','fight','boss','pvp','enter-dungeon','rest','craft','print','calibrate','upgrade','module','core-craft','core-recharge','scavenge','claim','milestone-claim','medical','housing-rest','key-assemble','item-use']);
export const workAllows=(s,action)=>!s.work||!workBlockedActions.has(action);
