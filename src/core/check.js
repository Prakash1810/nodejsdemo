var fs = require('fs');
var yoti = require('yoti');
var NodeRSA = require('node-rsa');
const uuidv4 = require('uuid/v4');
async function getFile() {
    let session_id= '8cc34834-66d9-473d-95c4-2f6980c9da0a';
    let id = '70a51de5-c92a-4211-95ad-5ce78f736d34'
    let date = new Date();
    let timestamp = date.valueOf();
    console.log("Timestamp:", timestamp);
    let uuid = uuidv4();
    let text = `GET&/sessions/${session_id}?sdkId=${id}&nonce=${uuid}&timestamp=${timestamp}`
    var contents = await fs.readFileSync('./yoti-key/keys/Beldex-KYC-access-security.pem', 'utf8');
    var key = new NodeRSA(contents, 'pkcs1', { encryptionScheme: 'pkcs1' });
    let encrypted = key.encrypt(text, 'base64');
    console.log('encrypted: ', encrypted);
    const decrypted = key.decrypt(encrypted, 'utf8');
    console.log('decrypted: ', decrypted);


    // const CLIENT_SDK_ID ='70a51de5-c92a-4211-95ad-5ce78f736d34'
    // console.log(__dirname);
    // const PEM = fs.readFileSync(__dirname + '/yoti-key/keys/Beldex-KYC-access-security.pem');
    // const yotiClient = new yoti.Client(CLIENT_SDK_ID, PEM);
    // console.log("ClientId:",yotiClient);
}

getFile()





