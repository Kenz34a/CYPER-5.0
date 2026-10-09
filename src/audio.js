export function createAudio(){
 let context=null,musicGain=null,ambient=null,enabled=false,configuration={};
 function tone(frequency,duration=.12,volume=.025,musical=false){if(!context||context.state!=='running'||globalThis.document?.hidden||volume<=0)return;const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);oscillator.connect(gain);gain.connect(musical?musicGain:context.destination);oscillator.start(now);oscillator.stop(now+duration+.01);}
 function chord(){if(enabled&&configuration.music)[130.81,196,261.63].forEach((n,i)=>tone(n,3+i*.3,.014,true));}
 return {
  async unlock(){try{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;if(!context){context=new Context();musicGain=context.createGain();musicGain.connect(context.destination);musicGain.gain.value=configuration.music?configuration.musicVolume/100:0;}if(context.state==='suspended')await context.resume();enabled=true;}catch{}},
  configure(value){const wasMusic=configuration.music;configuration={...value};if(musicGain)musicGain.gain.value=value.music?value.musicVolume/100:0;if(ambient){clearInterval(ambient);ambient=null;}if(value.music){ambient=setInterval(chord,6000);if(!wasMusic)chord();}},
  play(kind='effect'){if(!configuration[kind==='effect'?'soundEffects':kind==='mail'?'soundMail':kind==='mention'?'soundMentions':'soundNotices'])return;tone(kind==='effect'?330:kind==='mail'?660:kind==='mention'?784:523.25);},
  pause(){try{context?.suspend()?.catch(()=>{});}catch{}},
  async resume(){if(enabled)try{await context?.resume();}catch{}},
  dispose(){if(ambient)clearInterval(ambient);ambient=null;try{context?.close()?.catch(()=>{});}catch{}}
 };
}
