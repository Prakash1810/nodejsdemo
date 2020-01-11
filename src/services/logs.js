const fs = require('fs');
const moment = require('moment');


class logs {
    constructor(req, user,res,type) {
        let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}): ${user} : ${JSON.stringify(req)},${JSON.stringify(res)} : type`
        fs.appendFile('userLogs.txt', `\n${fileConent} `, function (err) {
            if (err)
                console.log("Error:", err);
        });
    }
}

module.exports = logs;