const jwt = require('jsonwebtoken');
const config = require('config');
const Controller = require('../core/controller');
const refreshToken = require('../db/management-token');
const controller = new Controller;

let verifyOptions = {
    issuer: config.get('secrete.issuer'),
    subject: 'Authentication',
    audience: config.get('secrete.domain'),
    expiresIn: config.get('secrete.refreshTokenExpiry')
};

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const data = await jwt.verify(token, config.get('secrete.refreshKey'), verifyOptions);
        const isChecked = await refreshToken.findOne({
            user: data.user, refreshToken: token, isDeleted: true
        })
        if (isChecked) {
            throw error
        } else {
            req.user = data;
            next();
        }
    }
    catch (error) {
        return res.status(401).json(controller.errorMsgFormat({
            message: "Invalid authentication"
        }));
    }
};
