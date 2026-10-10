// Original vector silhouettes; combat also works offline.
const operative = `<path d="M147 34c0-20 14-31 32-31s30 13 30 32l-6 27-14 14-7 15 22 10 24 40 13 46-20 21-14-9-16-37-2 61 18 47-9 49-4 51-7 15-28 1-8-13 6-56-7-36-12-16-13 55-20 61-29 6-12-9 8-19 17-56 12-74-7-48-17 30-13 33-21-7 5-25 12-37 15-31 25-18 6-14-16-16z"/><path d="m104 141-25 21-38 108 13 8 31-68 13-10 11-38 23-9-4-13z"/><path class="silhouette-plate" d="m141 109 32-10 32 15-8 40-47 11-12-20zm8 80 43-9 5 16-49 10z"/><path class="silhouette-light" d="m160 34 35 3-2 9-34-3z"/><path class="silhouette-line" d="m141 114 11 40 31-9m-43 68 40-11m-53 80 21 9m32 3 25-4"/>`;
const mech = `<path d="m126 18 17 12 47-3 19-12 8 30-6 29 22 17 35 10 22 40 9 48-23 20-19-31-11-16-5 58-17 10 18 42-10 71-2 32-48 1-4-17 11-23-2-41-17-32-14 29-5 43 10 27-4 16-48-1-3-37 1-62 20-49-24-9-10-49-12 34-28 8-9-36 16-52 27-23 28-7 6-16-10-30z"/><path class="silhouette-plate" d="m124 99 61-5 23 23-9 62-38 23-38-29-10-53z"/><path class="silhouette-light" d="m147 48 42-2-3 12-39 1zm-9 76 53-3-8 17-39 1z"/><path class="silhouette-line" d="m133 160 28 27 30-25m-104-43 14 40m132-32 17 31m-102 97 21 3m40-4 20-4"/>`;
const drone = `<path d="m128 119 32-19 39 4 25 20-5 54-26 31-43-4-31-31zM38 104l60 13 36 23-10 24-47-27-44-7zM224 137l38-25 44-11 7 28-48 10-33 26zM112 173l-11 63 21 30 15-7-12-30 12-50zM209 181l16 40 7 47 15-5 2-44-20-54z"/><path class="silhouette-plate" d="m150 117 44 2 14 21-10 39-40 12-24-35z"/><path class="silhouette-light" d="m149 139 40-1 7 9-14 12-26-2z"/><path class="silhouette-line" d="m63 117 41 16m152-11 36-10m-173 78 6 29m105-35 7 25"/>`;
export function enemySilhouette(foe) {
 const kind=foe.boss?'boss':/drone/i.test(foe.name)?'drone':/robot|chó máy/i.test(foe.name)?'mech':'operative';
 return `<svg class="enemy-silhouette silhouette-${kind}" viewBox="0 0 340 400" fill="currentColor" aria-hidden="true" focusable="false">${kind==='drone'?drone:kind==='boss'||kind==='mech'?mech:operative}</svg>`;
}
export function weaponSilhouette(slot) {
 const paths={weapon:'M4 12h32V8h9v5h8v10H31l-5 18H15l5-18H4zm5-8h27v5H9z',special:'M3 12h8l5-6h23l6 6h17v5H45v10H29l-3 13H15l4-13-7-6H3zm29 18h17v5H32z',destructive:'M5 10h42l6-5h8v28h-8l-6-5H31l-3 12H16l3-12H5zm32 21h8v9h-8z'};
 return `<svg viewBox="0 0 64 48" fill="currentColor" aria-hidden="true" focusable="false"><path d="${paths[slot]}"/></svg>`;
}
