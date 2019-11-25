const jwt = require('jsonwebtoken');
const config = require('config');
const accesstoken = require('../db/management-token');
const users = require('../db/users');
const Controller = require('../core/controller');
const device = require('../db/device-management');
const controller = new Controller;



let jwtOptions = {
    issuer: config.get('secrete.issuer'),
    subject: 'Authentication',
    audience: config.get('secrete.domain'),
    expiresIn: config.get('secrete.infoToken')
};


module.exports = async (req, res, next) => {
    try {
        let token = req.headers.info;
        const deviceInfo = jwt.verify(token, config.get('secrete.infokey'), jwtOptions);
        const checkToken = await accesstoken.findOne({ is_deleted: true, info_token: token });
        if (checkToken) {
            throw error
        } else {
            let checkDevice = await device.findOne({
                browser: deviceInfo.browser,
                user :deviceInfo.info,
                browser_version: deviceInfo.browser_version,
                is_deleted: true,
                region: deviceInfo.region,
                city: deviceInfo.city,
                os: deviceInfo.os
            });
            let checkActive = await users.findOne({ _id: deviceInfo.info, is_active: false });
            if (checkDevice) {
                res.status(401).json(controller.errorMsgFormat({
                    message: 'The device are browser that you are currently logged in has been removed from the device whitelist.'
                }, 'user', 401));
            } else if (checkActive) {
                await accesstoken.findOneAndUpdate({ info_token: token }, { is_deleted: true });
                res.status(401).json(controller.errorMsgFormat({
                    message: 'Your account has been disabled. Please contact support.'
                }, 'user', 401));

            }
            else {
                next();
            }


        }

    }

    catch (error) {
        res.status(401).json(controller.errorMsgFormat({
            message: 'Authentication failed. Your request could not be authenticated.'
        }, 'user', 401));
    }

};