#!/usr/bin/env node
// Starts the proxy server and Vite dev server together for convenience.
const { spawn } = require('child_process');

function run(name, cmd, args){
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true });
  p.on('exit', (code, signal)=>{
    if(signal){
      console.log(`${name} exited with signal ${signal}`);
    } else {
      console.log(`${name} exited with code ${code}`);
    }
  });
  return p;
}

console.log('Starting proxy (npm start) and vite (npm run dev) ...');
const proxy = run('proxy', 'npm', ['start']);
const vite = run('vite', 'npm', ['run', 'dev']);

function shutdown(){
  try{ proxy.kill('SIGINT'); }catch(e){}
  try{ vite.kill('SIGINT'); }catch(e){}
  process.exit();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);
