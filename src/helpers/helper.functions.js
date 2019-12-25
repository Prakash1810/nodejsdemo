const crypto = require('crypto');
const config = require('config');
const http = require('http');
const uuid = require('uuid/v4');
const buttervalue = Buffer.from("uyewdbnyjsyedord");
<<<<<<< Updated upstream
const iv = Buffer.from(config.get('encryption.key'));
=======
const iv =  Buffer.from(config.get('encryption.key'));
>>>>>>> Stashed changes
const Controller = require('../core/controller');
class Helpers extends Controller {

    encrypt(data) {
<<<<<<< Updated upstream
            let hash = crypto.createHash('sha256').update(config.get('encryption.key')).digest('base64').substr(0, 32);
            let cipher = crypto.createCipheriv('aes-256-ctr', hash, iv)
            let secret = cipher.update(data, 'utf8', 'hex')
            secret += cipher.final('hex');
            return secret;

    }
    decrypt(data,res) {
        try {
=======
        try{
        let hash = crypto.createHash('sha256').update(config.get('encryption.key')).digest('base64').substr(0, 32);
        let cipher = crypto.createCipheriv('aes-256-ctr', hash, iv)
        let secret = cipher.update(data, 'utf8', 'hex')
        secret += cipher.final('hex');
        return secret;
        }
        catch(err){
            return res.send(this.errorMsgFormat({message:"Your request was not found."})).status(400);
        }
    }
    decrypt(data,res) {
        try{
>>>>>>> Stashed changes
            let hash = crypto.createHash('sha256').update(config.get('encryption.key')).digest('base64').substr(0, 32);
            let cipher = crypto.createDecipheriv('aes-256-ctr', hash, iv)
            let secret = cipher.update(data, 'hex', 'utf8')
            secret += cipher.final('utf8');
            return secret;
<<<<<<< Updated upstream
        } catch (error) {
            return res.status(400).send(this.errorMsgFormat({message: 'Your request was not encrypted.'}));
        }

=======
        }
        catch(err){
            return res.send(this.errorMsgFormat({message:"Your request was not encrypted."})).status(400);
        }
        
>>>>>>> Stashed changes
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