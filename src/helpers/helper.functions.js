const _ = require('lodash');
const crypto = require('crypto');
const config = require('config');
const http = require('http');
const uuid = require('uuid/v4');
const Redis = require('ioredis');
const buttervalue = Buffer.from("uyewdbnyjsyedord");
const iv = Buffer.from(config.get('encryption.key'));
const Controller = require('../core/controller');
const userTimeline = require('../db/user-timeline');
const userNotification = require('../db/user-notifications')

class Helpers extends Controller {

    encrypt(data) {
        let hash = crypto.createHash('sha256').update(config.get('encryption.key')).digest('base64').substr(0, 32);
        let cipher = crypto.createCipheriv('aes-256-ctr', hash, iv)
        let secret = cipher.update(data, 'utf8', 'hex')
        secret += cipher.final('hex');
        return secret;

    }
    decrypt(data, res) {
        try {
            let hash = crypto.createHash('sha256').update(config.get('encryption.key')).digest('base64').substr(0, 32);
            let cipher = crypto.createDecipheriv('aes-256-ctr', hash, iv)
            let secret = cipher.update(data, 'hex', 'utf8')
            secret += cipher.final('utf8');
            return secret;
        }
        catch (err) {
            return res.send(this.errorMsgFormat({ message: "Your request was not encrypted." })).status(400);
        }

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

    redisConnection() {
        return new Redis.Cluster([{
            port: process.env.REDIS_PORT,
            host: process.env.REDIS_HOST
        }]);

        // return new Redis({
        //     port: process.env.REDIS_PORT,
        //     host: process.env.REDIS_HOST
        // });
    }

    async publishAndStoreData(data, user, type, topic) {
        try {
            let id = new Date().valueOf();
            switch (type) {
                case 'publish':
                    await this.publish(topic, data.publish, id, user);
                    break;
                case 'store':
                    await this.storeData(user, data.store);
                    break;
                case 'both':
                    await this.publish(topic, data.publish, id, user);
                    await this.storeData(user, data.store);
                    break;
                default:
                    break;
            }
        } catch (error) {
            return false;
        }
    }

    async publish(topic, data, id, user) {
        let redis = await this.redisConnection();
        data.id = id
        data.user = user;
        data.isStore == true ? await new userNotification(data).save() : '';
        return await redis.publish(`${topic}`, JSON.stringify(data));
    }

    async storeData(user, data) {
        let existsData = await userTimeline.findOne({ user }).lean();
        if (_.isEmpty(existsData)) {
            let payload = Object.assign({
                activity: [data],
                user
            });
            await new userTimeline(payload).save();
        } else {
            existsData.activity.push(data);
            await userTimeline.findOneAndUpdate({ user }, existsData);
        }
    }

}

module.exports = new Helpers();
