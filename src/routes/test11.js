const mode12 = require('../routes/test');
const crypto = require('crypto');
let bufer = Buffer.from('uyewdbnyjsyedord');
let mode1 = new mode12;

const value=mode1.generateUuid();
console.log(value);
const values = value.split('-');
console.log(`${values[0]}-${values[values.length-1]}`)

