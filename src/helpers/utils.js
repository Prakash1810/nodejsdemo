require('dotenv').config();
const axios = require('axios');

class Utils {
    async getTime() {
        const time = await axios({
            method: 'get',
            url: `${process.env.URLHOST}/api/general/v3/time`
        });
        return time.data;
    }
}

module.exports = Utils;