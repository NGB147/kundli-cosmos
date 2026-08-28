const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'site');
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.txt':'text/plain'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const f=path.join(root,p);
  if(!f.startsWith(root)){res.writeHead(403);return res.end('no');}
  fs.readFile(f,(e,data)=>{
    if(e){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('404 '+p);}
    res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  });
}).listen(4173,()=>console.log('serving site/ on http://localhost:4173'));
