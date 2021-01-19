const crypto = require('crypto');
const base32 = require('hi-base32');

function generateSecret(length = 20) {
   const randomBuffer = crypto.randomBytes(length);
   return base32.encode(randomBuffer).replace(/=/g, '');
}

exports.generateG2fSecret = generateSecret;