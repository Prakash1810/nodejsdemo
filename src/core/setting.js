const Controller = require('./controller');
const controller = new Controller;
const configs = require('../db/config')

const setting = () => {

    return {
        async getVersion(req, res) {
            try {
                let checkVersion = await configs.findOne({ key: 'version' })
                if (checkVersion) {
                    return res.status(200).send(controller.successFormat(checkVersion, '', 'setting'));
                }
                return res.status(200).send(controller.successFormat(null, '', 'setting'));
            } catch (err) {
                return res.status(500).send(controller.errorMsgFormat({
                    'message': err.message
                }, 'setting', 500));

            }
        }

    }
};

module.exports = setting();
