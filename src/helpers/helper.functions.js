const crypto = require('crypto');
const config = require('config');

class Helpers {

    encrypt (data) {
            var cipher = crypto.createCipher('aes-256-cbc', config.get('encryption.key'));
            var crypted = cipher.update(data, 'utf-8', 'hex');
            crypted += cipher.final('hex');
            return crypted;
    }
    
    decrypt (data) {
        var decipher = crypto.createDecipher('aes-256-cbc', config.get('encryption.key'));
        var decrypted = decipher.update(data, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    }
    requestDataFormat (data, id = null) {
        return {
            "lang": "en",
            "data": {
                "id": id,
                "attributes": data
            }
        };
    }
}

module.exports = new Helpers();