const axios = require('axios');
const Controller = require('../core/controller');
const helpers = require('../helpers/helper.functions');
const assets = require('../db/assets');
const users = require('../db/users');
const controller = new Controller;

class Api extends Controller {

    async sendEmailNotification(data) {
        console.log('Data:',data);
        if (data.email_for !== 'registration') {
            let disableData = JSON.stringify({
                'user_id': data.user_id,
                'is_active': false
            });

            data.disable_code = helpers.encrypt(disableData);

            let user = await users.findById(data.user_id);
            data.to_email = user.email
            data.anti_spoofing_code = (user.anti_spoofing) ? user.anti_spoofing_code : false
        }

        axios.post(`${process.env.NOTIFICATION}/api/${process.env.NOTIFICATION_VERSION}/email-notification`, this.requestDataFormat(data))
            .then((res) => {
                console.log(res.data);
            })
            .catch((err) => {
                throw (err.message)
            });
    }


    async initAddressCreation(user) {
        try {
            let results = await assets.find({
                is_default: true
            });

            results.forEach((result) => {
                let data = {
                    "coin": result.asset_code,
                    "user_id": user.user_id,
                    "user": user._id,
                    "asset": result._id
                };
                return this.axiosAPI(data)
            });

        } catch (err) {
            throw (err.message)
        }
    }

    axiosAPI(data) {
        axios.post(
            `${process.env.WALLETAPI}/api/${process.env.WALLETAPI_VERSION}/address/generate`, this.requestDataFormat(data)
        ).then(axiosResponse => {
            if (axiosResponse.data !== undefined) return axiosResponse.data;
        }).catch(axiosError => {
            if (axiosError.response !== undefined) throw (axiosError.response)
        });
    }

    async matchingEngineGetRequest(path, res) {
        let axiosResponse = await axios['get'](
            `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}`);
        let result = axiosResponse.data;
        if (result.status) {
            return res.status(200).send(controller.successFormat(result.result.result, result.result.id))
        } else {
            return res.status(result.errorCode).send(controller.errorMsgFormat({
                'message': result.error
            }, 'order-matching', result.errorCode));
        }
    }

    async matchingEngineQueryRequest(path, data, res) {
        let value = Object.values(data);
        let axiosResponse = await axios.get(
            `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}?${Object.keys(data)}=${value[0]}`);
        let result = axiosResponse.data;
        if (result.status) {
            return res.status(200).send(controller.successFormat(result.result.result, result.result.id))
        } else {
            return res.status(result.errorCode).send(controller.errorMsgFormat({
                'message': result.error
            }, 'order-matching', result.errorCode));
        }
    }

    async matchingEngineRequest(method, path, data, res, type = 'json') {
        const axiosResponse = await axios[method](
            `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}`, data)
        const result = axiosResponse.data;
        if (result.status) {
            if (type === 'json') {
                return res.status(200).send(controller.successFormat(result.result.result, result.result.id));
            } else {
                return controller.successFormat(result.result.result, result.result.id);
            }
        } else {
            return res.status(result.errorCode).send(controller.errorMsgFormat({
                'message': result.error
            }, 'order-matching', result.errorCode));
        }
    }

    async marketPrice(assetsName, convertTo = 'usd,btc') {
        return await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${assetsName}&vs_currencies=${convertTo}`);
    }
}

module.exports = new Api();