const paths={
 weapon:'M4 11h22v-3h5v3h5v6H20l-3 10h-8l3-10H4z',
 alley:'M8 29V13l12-8 12 8v16H8zm8 0V17h8v12M11 12h18M13 8l-3-4m17 4 3-4',
 pet:'M8 22c0-5 5-10 12-10s12 5 12 10c0 6-5 10-12 10S8 28 8 22zm4-8L8 6l9 6m11 2 4-8-9 6M14 20h1m10 0h1m-10 5 4 3 4-3',
 pub:'M12 13h15v20H12zm15 3h6v12h-6M12 19h15M17 22v7m5-7v7M12 13c-4 0-5-7 1-8 1-5 8-5 9 0 7-2 9 6 5 8',
 bag:'M8 12h24l-3 23H11zM15 13V9a5 5 0 0 1 10 0v4',
 stall:'M6 18h28v16H6zm-2-9h32l-2 9H6zm8 9v-9m8 9v-9m8 9v-9M12 24h9v10m5-10h5',
 clock:'M20 5a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 7v9h8',
 city:'M7 16h10v19H7zm16-7h10v26H23zM10 10h4v6m12-13h4v6M10 21h4m-4 5h4m-4 5h4m12-17h4m-4 5h4m-4 5h4m-4 5h4',
 house:'M5 18 20 6l15 12M10 15v20h20V15M17 35V24h6v11',
 coast:'M4 29c4-5 7 5 11 0s7 5 11 0 7 5 10 0M4 35c4-5 7 5 11 0s7 5 11 0 7 5 10 0M9 24 16 9l7 15H9zm7-15V5m12 6h7m-4-4v8',
 print:'M4 13 9 5h9l5 8-5 8H9zm16 13 5-8h9l5 8-5 8h-9zM6 30l4-7h8l4 7-4 7h-8z',
 medical:'m9 29 15-15 7 7-15 15zM22 12l11 11m-8-14 10 10M8 31l-4 5M14 24l5 5',
 ammo:'M9 8h22v24H9zm8 1-4 14h8l-3 12 11-18h-9l3-8M6 12h3m22 0h3M6 28h3m22 0h3',
 recycle:'m11 14 7-10h5l7 10m-7-4 7 4 2-8M31 18l6 10-3 4H22m6-5-6 5 7 5M18 32H6l-3-4 6-10m1 8-1-8-8 3',
 mine:'M20 4 36 20 20 36 4 20zM14 13h9a4 4 0 0 1 0 8h-9m0 0h10a4 4 0 0 1 0 8H14m3-18v20m5-20v3',
 group:'M8 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 27v-7h10v7m2 0v-7h10v7m2 0v-7h10v7M4 33h32'
};
export function cityIcon(id){return `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]?`<path d="${paths[id]}"/>`:'<circle cx="20" cy="20" r="13"/>'}</svg>`;}
