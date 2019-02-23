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

    errorMsgFormat (error) {
        return { 
            "code": 400,
            "errors": true,
            "data": { 
                "type": "users",
                "attributes": error
            }
        };
    }

    errorFormat (error) {
        let errors = {};
        if (error.details) {
            error.details.forEach((detail) => {
                errors[detail.path] = detail.message;
            });
        } else {
            errors = error;
        }
        return this.errorMsgFormat(errors);
    }

    successFormat ( res, id = false ) {
        return { 
            "code": 200,
            "errors": false,
            "data": {
                "id": id,
                "type": "users",
                "attributes": res
            }
        }; 
    }

}

module.exports = new Helpers();