const axios        = require('axios');
const config       = require('config');
const Controller   = require('../core/controller');
const helpers      = require('../helpers/helper.functions');
const assets       = require('../db/assets');
const userAddress  = require('../db/user-address');


class Users extends Controller {

    sendEmailNotification (data) {

        if ( data.email_for !== 'registration') {
            let disableData     = JSON.stringify({
                'user_id': data.user_id,
                'is_active': false
            });

            data.disable_code = helpers.encrypt(disableData);
        }

        axios.post(`${config.get("notification-api.url")}/api/${config.get('notification-api.version')}/email-notification`, this.requestDataFormat(data))
        .then((res) => {
            // console.log(res.data)
        })
        .catch((err) => {
            // console.log(err.message)
        });
    }


    addressCreation (user) {
        assets.find({ asset_code: 'BTC' }).then((results) => {
            results.forEach((result, index) => {
                let data = { coin: result.asset_code.toLowerCase(), user_id: user.user_id };
                axios.post(
                    `${config.get("wallet-api.url")}/api/${config.get('wallet-api.version')}/address/generate`,
                    this.requestDataFormat(data)
                ).then( axiosResponse => {
                    this.insertAddress(axiosResponse.data, user, result._id );
                }).catch( axiosError => {
                    if (axiosError.response.data !== undefined) console.log(axiosError.response.data)
                });
            });
        }).catch((err) => {
            console.log(err.message)
        });
    }

    insertAddress (response, user, asset) {
        userAddress.create({
            user: user._id,
            asset: asset,
            address: response.data.attributes.address
        }, (err) => {
            if (err) {
                console.log(err.message)
            }
        });
    }
}

module.exports = new Users;