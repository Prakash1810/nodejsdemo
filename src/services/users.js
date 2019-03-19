const axios         = require('axios');
const config        = require('config');
const baseUrl       = config.get("notification-api.url");
const Controller    = require('../core/controller');

class Users extends Controller {

    sendEmailNotification (data) {
        axios.post(`${baseUrl}/api/${config.get('notification-api.version')}/email-notification`, data)
        .then((res) => {
            console.log(res.data)
        })
        .catch((err) => {
            console.log(err.message)
        });
    }
}

module.exports = new Users;