const crypto = require('crypto');
const config = require('config');

const helpers = {};

helpers.errorMsgFormat = (error) => {
    return { 
        "code": 400,
        "errors": true,
        "data": { 
            "type": "users",
            "attributes": error
        }
    };
}

helpers.errorFormat = (error) => {
    let errors = {};
    if (error.details) {
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
    } else {
        errors = error;
    }
    return helpers.errorMsgFormat(errors);
}

helpers.successFormat = (res) => {
    return { 
        "code": 200,
        "errors": false,
        "data": { 
            "type": "users",
            "attributes": res
        }
    }; 
}

helpers.encrypt = (data) => {
        var cipher = crypto.createCipher('aes-256-cbc', config.get('encryption.key'));
        var crypted = cipher.update(data, 'utf-8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
}

helpers.decrypt = (data) => {
    var decipher = crypto.createDecipher('aes-256-cbc', config.get('encryption.key'));
    var decrypted = decipher.update(data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}

module.exports = helpers;