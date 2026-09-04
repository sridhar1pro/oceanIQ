const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '../data-pipeline/output/grid_thetao_0.49_2026-08-20T00-00-00.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const validData = data.filter(d => d.value != null && !isNaN(d.value) && d.value > -100 && d.value < 1000);
console.log("Valid data length:", validData.length);

let minVal = Infinity, maxVal = -Infinity;
validData.forEach(d => {
    if (d.value < minVal) minVal = d.value;
    if (d.value > maxVal) maxVal = d.value;
});
console.log("Min:", minVal, "Max:", maxVal);
