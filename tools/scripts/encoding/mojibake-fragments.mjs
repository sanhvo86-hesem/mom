import fs from 'node:fs/promises';
import path from 'node:path';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node tools/mojibake-fragments.mjs <file>');
  process.exit(1);
}

const file = path.resolve(process.cwd(), arg);
const text = await fs.readFile(file, 'utf8');

const re =
  /(?:\u00c3[\u0080-\u00bfA-Za-z]|Â[^\p{L}\p{N}]|Ä[\u0080-\u00bf]|\u00f0\u0178|á»|áº|ï»¿|\uFFFD|â€|â€¢|â€“|â€”|â†|â˜|âœ|â•|â‹|â„|â€¦|â€˜|â€™|â€œ|â€|[\u0080-\u009f])/gu;
const list = text.match(re) || [];
const map = new Map();
for (const item of list) map.set(item, (map.get(item) || 0) + 1);
const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);

console.log(`file=${file}`);
console.log(`total=${list.length}`);
for (const [frag, count] of rows) {
  console.log(`${JSON.stringify(frag)}\t${count}`);
}
