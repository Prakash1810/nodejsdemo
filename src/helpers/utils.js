require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const iv = Buffer.from("uyewdbnyjsyedord");
const helpers = require('./helper.functions');
const Controller = require('../core/controller');
const _ = require('lodash');


class Utils extends Controller {
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

    async passwordDecryption(data, res) {
        data.password = await helpers.decrypt(data.password, res);
        data.password_confirmation = await helpers.decrypt(data.password_confirmation, res);
        if (data.password == '' || data.password_confirmation == '') {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Your request was not encrypted.'
            }));
        }
        return data;
    }

    async assetLastPrice(assetCode, marketLastPriceAll) {
        let responseData = {};
        marketLastPriceAll.filter(requestData => {
            if (requestData.asset_name == assetCode) {
                if (requestData.market_pair == 'BTC') {
                    responseData = requestData;
                }
                else if (requestData.market_pair == 'USDT') {
                    let checkResponseData = _.isEmpty(responseData);
                    if (checkResponseData) {
                        responseData = requestData;
                    }
                }
            };
        });
        return responseData;
    }

    async subCategoryFormat(subCataData,res) {
        try {
            let result = []
            for (let i = 0; i < subCataData.length; i++) {
                let res = {
                    _id: subCataData[i].category._id,
                    name: subCataData[i].category.name,
                    id: subCataData[i].category.id,
                    value: subCataData[i].subCategory
                }
                result.push(res);
            }
            return result;
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                "message": error.message
            }, 'utils', 500));
        }
    }
}

module.exports = Utils;