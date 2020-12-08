const config = require('config');
require('dotenv').config();
const Controller = require('../core/controller');
const moment = require('moment');
const accountActive = require('../db/account-active');


class userHelper extends Controller {

    async accountActiveCountIncrese(data, timeNow) {
        await accountActive.findOneAndUpdate({ email: data.email, type_for: 'login' },
            {
                $inc: {
                    count: 1
                },
                create_date: timeNow
            });
    }

    accountExpiryTimeCheck(isChecked) {
        let date = new Date(isChecked.create_date);
        let getSeconds = date.getSeconds() + config.get('accountActive.timeExpiry');
        let duration = moment.duration(moment().diff(isChecked.create_date));
        return { getSeconds, duration: duration.asSeconds() };
    }

}

module.exports = new userHelper();