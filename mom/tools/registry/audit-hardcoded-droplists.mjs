import fs from 'fs';
import path from 'path';

const root = path.resolve('C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal');
const ignoreFiles = new Set([
  '00-block-engine.js',
  '31-module-builder.js'
]);

function walk(dir, acc = []){
  for(const entry of fs.readdirSync(dir, { withFileTypes:true })){
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()) walk(full, acc);
    else if(entry.isFile() && full.endsWith('.js')) acc.push(full);
  }
  return acc;
}

function lineOf(text, index){
  return text.slice(0, index).split(/\r?\n/).length;
}

const findings = [];
for(const file of walk(root)){
  if(ignoreFiles.has(path.basename(file))) continue;
  const text = fs.readFileSync(file, 'utf8');
  const regex = /type\s*:\s*['"]select['"][\s\S]{0,220}?options\s*:\s*\[[\s\S]{0,220}?\]/g;
  let match;
  while((match = regex.exec(text))){
    findings.push({
      file,
      line: lineOf(text, match.index),
      snippet: match[0].replace(/\s+/g, ' ').slice(0, 220)
    });
  }
}

if(!findings.length){
  console.log('OK: no hardcoded business droplists found.');
  process.exit(0);
}

console.log('FOUND hardcoded business droplists:');
for(const finding of findings){
  console.log(`- ${finding.file}:${finding.line}`);
  console.log(`  ${finding.snippet}`);
}
process.exit(1);
