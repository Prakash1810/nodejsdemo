const axios         = require('axios');
const config        = require('config');
const baseUrl       = config.get("notification-api.url");
const Controller    = require('../core/controller');
const helpers       = require('../helpers/helper.functions');
const assets        = require('../db/assets');
const userAssets    = require('../db/user-assets');

class Users extends Controller {

    sendEmailNotification (data) {

        if ( data.email_for !== 'registration') {
            let disableData     = JSON.stringify({
                'user_id': data.user_id,
                'is_active': false
            });

            data.disable_code = helpers.encrypt(disableData);
        }

        axios.post(`${baseUrl}/api/${config.get('notification-api.version')}/email-notification`, this.requestDataFormat(data))
        .then((res) => {
            console.log(res.data)
        })
        .catch((err) => {
            console.log(err.message)
        });
    }

    generateAddress (user, res) {
        assets.find({ is_default: true }, (err, assets) => {
            let data = { user_id: 1 };
            assets.forEach((asset,index) => {
                axios.post(`${config.get("address-generation-api.url")}/api/${config.get('address-generation-api.version')}/generate-address`, this.requestDataFormat(data))
                .then((response) => {
                    return res.json(response)
                })
                .catch((err) => {
                    return res.json({ err })
                });
                return false;
            });
        });
    }
}

module.exports = new Users;