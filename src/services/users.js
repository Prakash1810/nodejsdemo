const axios         = require('axios');
const config        = require('config');
const baseUrl       = config.get("notification-api.url");
const Controller    = require('../core/controller');
const helpers       = require('../helpers/helper.functions');

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
}

module.exports = new Users;