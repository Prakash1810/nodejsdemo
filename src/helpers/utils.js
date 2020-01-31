require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const iv = Buffer.from("uyewdbnyjsyedord");
class Utils {
    async getTime() {
        const time = await axios({
            method: 'get',
            url: `${process.env.URLHOST}/api/general/v3/time`
        });
        return time.data;
    }

    createSignature(requestString, api_secret) {
       
        const hmac = crypto.createHmac('sha256', api_secret);
        const signature = hmac.update(requestString).digest('base64');
        return signature;
    }

    createSecret(uuid, passphrase) {
        const uuidSplit = uuid.split('-');
        const uuidString = `${uuidSplit[0]}-${uuidSplit[uuidSplit.length - 1]}`
        let hash = crypto.createHash('sha256').update(passphrase).digest('base64').substr(0, 32);
        let cipher = crypto.createCipheriv('aes-256-ctr', hash, iv)
        let secret = cipher.update(uuidString, 'utf8', 'hex')
        secret += cipher.final('hex');
        return secret;
    }

    decryptSecret(secret, passphrase) {
        let hash = crypto.createHash('sha256').update(passphrase).digest('base64').substr(0, 32);
        var decipher = crypto.createDecipheriv('aes-256-ctr', hash, iv)
        var dec = decipher.update(secret, 'hex', 'utf8')
        dec += decipher.final('utf8');
        return dec;
    }
}

module.exports = Utils;