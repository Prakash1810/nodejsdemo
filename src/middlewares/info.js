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
        const deviceInfo = await jwt.verify(token, config.get('secrete.infokey'), jwtOptions);
        const checkToken = await accesstoken.findOne({ user: deviceInfo.info, info_token: token, type_for: "info-token" });
        if (!checkToken || checkToken.is_deleted) {
            throw error
        } else {
            // if (!deviceInfo.is_app) {
            let checkDevice = await device.findOne({
                browser: deviceInfo.browser,
                user: deviceInfo.info,
                browser_version: deviceInfo.browser_version,
                is_deleted: false,
                region: deviceInfo.region,
                city: deviceInfo.city,
                os: deviceInfo.os
            })

            if (!checkDevice) {
                res.status(401).json(controller.errorMsgFormat({
                    message: 'The device or browser that you are currently logged in has been removed from the device whitelist.'
                }, 'user', 401));
            }
            // }
            // else {
            //     let checkDevice = await device.findOne({
            //         browser: deviceInfo.browser,
            //         user: deviceInfo.info,
            //         browser_version: deviceInfo.browser_version,
            //         is_deleted: false,
            //         is_app: false,
            //         region: deviceInfo.region,
            //         city: deviceInfo.city,
            //         os: deviceInfo.os
            //     });
            //     if (!checkDevice) {
            //         res.status(401).json(controller.errorMsgFormat({
            //             message: 'The device or browser that you are currently logged in has been removed from the device whitelist.'
            //         }, 'user', 401));
            //     }


            // }

            let checkActive = await users.findOne({ _id: deviceInfo.info, is_active: false });
            if (checkActive) {
                await accesstoken.findOneAndUpdate({ user: deviceInfo.info, info_token: token, type_for: "info-token" }, { is_deleted: true });
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