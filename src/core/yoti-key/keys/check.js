var fs = require('fs');
var NodeRSA = require('node-rsa');

async function getFile() {

    var contents = await fs.readFileSync('./Beldex-KYC-access-security.pem', 'utf8');
    console.log(contents);
    var key = new NodeRSA();
    key.importKey(contents, "pkcs1-private-pem");
    var encrypted = key.encrypt("hello", 'base64');
    console.log("Encrpyted:",encrypted);

   
}

getFile();