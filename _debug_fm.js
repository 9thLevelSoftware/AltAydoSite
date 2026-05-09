const fs = require('fs');
const c = fs.readFileSync('.planning/phases/08-mongodb-consolidation/08-01-PLAN.md', 'utf8');
console.log('starts with ---:', c.slice(0, 3) === '---');
console.log(
  'first 5 char codes:',
  [...c.slice(0, 5)].map((ch) => ch.charCodeAt(0))
);

const lines = c.split(/\r?\n/);
let inFM = false,
  end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '---') {
    if (!inFM) {
      inFM = true;
    } else {
      end = i;
      break;
    }
  }
}
console.log('FM closing --- at line:', end);
if (end > 0) {
  console.log('FM content lines:', end - 1);
  console.log('First few FM lines:', lines.slice(1, 5));
}
