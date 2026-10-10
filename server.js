import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {publicAssets} from './src/public-assets.js';
let api,storage;
try{({api,storage}=await import('./src/backend.js'));}catch{console.error('Không thể khởi tạo lưu trữ. Kiểm tra DATABASE_URL, kết nối/TLS và quyền database; production bắt buộc dùng PostgreSQL.');process.exit(1);}
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8'};
const publicPaths=new Set(publicAssets);
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/healthz'){try{await storage.health();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true}));}catch{res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:false}));}}if(await api(req,res,pathname))return;const route=pathname==='/'?'/index.html':pathname;if(!publicPaths.has(route)){res.writeHead(404);return res.end('Không tìm thấy');}const data=await readFile(path.join(root,route));res.writeHead(200,{'Content-Type':types[path.extname(route)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(404);res.end('Không tìm thấy');}}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('CYPER // ZERO listening on port '+(process.env.PORT||3000)));

server.requestTimeout=15000;server.headersTimeout=15000;
let stopping=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(stopping)return;stopping=true;const deadline=setTimeout(()=>process.exit(1),25000);deadline.unref();server.close(async()=>{await storage.close();process.exit(0);});});
