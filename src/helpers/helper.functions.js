const crypto = require('crypto');
const config = require('config');
const http = require('http');
const uuid = require('uuid/v4');
const buttervalue =  Buffer.from("uyewdbnyjsyedord");
class Helpers {

    encrypt(data) {
        var cipher = crypto.createCipher('aes-256-cbc', config.get('encryption.key'));
        var crypted = cipher.update(data, 'utf-8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    }

    decrypt(data) {
        var decipher = crypto.createDecipher('aes-256-cbc', config.get('encryption.key'));
        var decrypted = decipher.update(data, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    }
    requestDataFormat(data, id = null) {
        return {
            "lang": "en",
            "data": {
                "id": id,
                "attributes": data
            }
        };
    }

    async generateUuid() {
        return uuid();
    }

    async createSecret(createuuid, passphrase) {
        let hash = crypto.createHash('sha256').update(passphrase).digest('base64').substr(0, 32);
        let cipher = crypto.createCipheriv('aes-256-ctr', hash, buttervalue)
        let secret = cipher.update(createuuid, 'utf8', 'hex')
        secret += cipher.final('hex');
        return secret;
    }


}

module.exports = new Helpers();