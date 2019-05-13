const axios = require('axios');
const config = require('config');
const Controller = require('../core/controller');
const helpers = require('../helpers/helper.functions');
const assets = require('../db/assets');

class Api extends Controller {

    sendEmailNotification(data) {
        if (data.email_for !== 'registration') {
            let disableData = JSON.stringify({
                'user_id': data.user_id,
                'is_active': false
            });

            data.disable_code = helpers.encrypt(disableData);
        }

        axios.post(`${config.get("notification-api.url")}/api/${config.get('notification-api.version')}/email-notification`, this.requestDataFormat(data))
            .then((res) => {})
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
                    "coin": result.asset_code.toLowerCase(),
                    "user_id": user.user_id
                };
                return this.axiosAPI(data)
            });

        } catch (err) {
            throw (err.message)
        }
    }

    axiosAPI(data) {
        axios.post(
            `${config.get("wallet-api.url")}/api/${config.get('wallet-api.version')}/address/generate`, this.requestDataFormat(data)
        ).then(axiosResponse => {
            if (axiosResponse.data !== undefined) return axiosResponse.data;
        }).catch(axiosError => {
            console.log(axiosError)
            if (axiosError.response !== undefined) throw (axiosError.response)
        });
    }

    async matchingEngineRequest(method, data) {
        let axiosResponse = await axios.post(
            `${config.get("matching-engine-api.url")}/api/${config.get('matching-engine-api.version')}/${method}`, this.requestDataFormat(data)
        );

        return axiosResponse.data;
    }

    async marketPrice(assetsName, convertTo = 'usd,btc') {
        return await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${assetsName}&vs_currencies=${convertTo}`);
    }
}

module.exports = new Api();