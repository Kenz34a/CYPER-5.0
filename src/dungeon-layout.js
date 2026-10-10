export const WIDTH=15,HEIGHT=17;
export const index=(x,y)=>y*WIDTH+x;
export const remainingMonsters=d=>d?.cells.filter(c=>c==='M'||c==='B').length||0;
export function createFloor(map,run,floor,mode='normal'){
 let seed=(Number(map.replace('map',''))+1)*7919+run*104729+floor*997;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const cells=Array.from({length:WIDTH*HEIGHT},(_,i)=>{const x=i%WIDTH,y=Math.floor(i/WIDTH);return x===0||y===0||x===WIDTH-1||y===HEIGHT-1||random()<0.21?'#':'.';});
 const start={x:7,y:15};
 // A guaranteed spine links the entrance and exit. Disconnected pockets are opened.
 for(let y=1;y<=15;y++)cells[index(7,y)]='.';
 for(let x=1;x<=13;x++)cells[index(x,1)]=cells[index(x,15)]='.';
 for(let y=1;y<=15;y++)cells[index(13,y)]='.';
 function reachable(){const found=new Set([index(start.x,start.y)]),queue=[index(start.x,start.y)];for(let p=0;p<queue.length;p++){const i=queue[p],x=i%WIDTH,y=Math.floor(i/WIDTH);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=index(nx,ny);if(nx>0&&ny>0&&nx<WIDTH-1&&ny<HEIGHT-1&&cells[n]!=='#'&&!found.has(n)){found.add(n);queue.push(n);}}}return found;}
 let found=reachable();
 for(let y=1;y<HEIGHT-1;y++)for(let x=1;x<WIDTH-1;x++){const i=index(x,y);if(cells[i]==='.'&&!found.has(i)){for(let cx=Math.min(x,7);cx<=Math.max(x,7);cx++)cells[index(cx,y)]='.';found=reachable();}}
 cells[index(7,15)]='E';cells[index(13,1)]='X';cells[index(13,2)]='B';
 const objects=[[6,15,'C'],[5,15,'M'],[7,12,'H'],[3,3,'C'],[11,6,'C'],[3,9,'M'],[10,11,'M'],[6,5,'T'],[8,12,'Q']];
 for(const [x,y,type] of objects){for(let cx=Math.min(x,7);cx<=Math.max(x,7);cx++)if(cells[index(cx,y)]==='#')cells[index(cx,y)]='.';cells[index(x,y)]=type;}
 return {map,run,floor,mode,width:WIDTH,height:HEIGHT,cells,x:start.x,y:start.y,bossDefeated:false,defeated:0,chests:0,steps:0,visited:[index(start.x,start.y)]};
}
export function resolveDungeonCombat(s,foe,outcome){
 const d=s.dungeon;if(!d||foe.dungeonTile===undefined||foe.dungeonFloor!==d.floor)return;
 if(outcome==='victory'){d.cells[foe.dungeonTile]='.';d.defeated++;if(foe.boss)d.bossDefeated=true;}
 else if(outcome==='escape'){d.x=foe.from.x;d.y=foe.from.y;}
 else if(outcome==='defeat')s.dungeon=null;
}
