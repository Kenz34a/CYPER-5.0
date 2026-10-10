export const appVersion='0.12';
export const settingDefaults={language:'vi',uiSize:'auto',animateNPC:true,animateWork:true,hideUpdates:false,disableTutorial:false,neverAskNotifications:true,newPromosOnly:false,music:false,musicVolume:65,soundEffects:true,soundNotices:true,soundMentions:true,soundMail:true,translateChat:false,showOriginal:true,translateOwn:false,disableChatEffects:false,disableSkipBanner:false,hideDamageMeter:false,disableVictory:false,notifyGuild:true,notifyWorld:true,rejectGifts:false,privateBadges:true,hideHandler:false,hideDonations:false,apartmentWall:false,hideNPC:false};
export const unsupportedSettings=new Set(['newPromosOnly','translateChat','showOriginal','translateOwn','disableSkipBanner','rejectGifts','apartmentWall']);
export function settings(s){const value={...settingDefaults,...s.settings};if(typeof s.privacy?.badges==='boolean')value.privateBadges=!s.privacy.badges;return value;}
export function settingsAction(s,b){
 if(b.action==='tutorial-dismiss'){s.tutorialDismissed=true;return true;}
 if(b.action==='updates-dismiss'){s.seenUpdateVersion=appVersion;return true;}
 if(b.action!=='settings'||!b.values||typeof b.values!=='object'||Array.isArray(b.values)||!Object.keys(b.values).length)return false;
 for(const [key,value] of Object.entries(b.values)){
  if(!Object.hasOwn(settingDefaults,key))return false;
  if(unsupportedSettings.has(key)&&value!==settingDefaults[key])return false;
  if(key==='language'){if(!['vi','en'].includes(value))return false;}
  else if(key==='uiSize'){if(!['auto','small','medium','large'].includes(value))return false;}
  else if(key==='musicVolume'){if(!Number.isInteger(value)||value<0||value>100)return false;}
  else if(typeof value!=='boolean')return false;
 }
 const next={...settings(s),...b.values};s.settings=next;s.privacy={...s.privacy,badges:!next.privateBadges};return true;
}
const english={'Trung tâm':'City center','Bản đồ':'Map','Ga tàu':'Train station','Dungeon':'Dungeon','Túi đồ':'Inventory','Nhiệm vụ':'Quests','Trò chuyện':'Chat','Uy tín':'Reputation','Lõi AI':'AI cores','Khu chợ':'Bazaar','Chợ người chơi':'Player market','Hẻm thông tin':'Information alley','Neon Paws':'Neon Paws','Partyline':'Partyline','Bờ biển':'Coast','Cửa hàng':'Shop','Chợ đen':'Black market','Hiệu chuẩn':'Calibration','Máy in':'Printer','Ngân hàng':'Bank','Đổi Unit':'Unit exchange','Terminal':'Terminal','Khu thương mại':'Commercial district','Tập đoàn':'Corporation','Trụ sở':'Headquarters','Căn hộ':'Apartment','Cyberwear':'Cyberwear','Trinoky':'Trinoky','NPC':'NPC','Boss':'Boss','Đấu trường':'Arena','Xếp hạng':'Rankings','Kho dữ liệu':'Codex','Tài khoản':'Account','Hồ sơ':'Profile','Cài đặt':'Settings','Tấn công':'Attack','Xung điện · 3 EN':'Pulse · 3 EN','Rút lui':'Retreat','Nghỉ tại trạm':'Rest','Trang bị':'Equip','Nhận thưởng':'Claim reward','Hủy công việc':'Cancel work','Trở lại trung tâm':'Return to city center','Cập nhật':'Updates','Tài sản':'Assets','Hướng dẫn':'Help','Đăng xuất':'Sign out','Đăng nhập / tạo tài khoản':'Sign in / register'};
export const uiLabel=(text,language)=>language==='en'&&Object.hasOwn(english,text)?english[text]:text;
