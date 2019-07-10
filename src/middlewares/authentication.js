const jwt = require('jsonwebtoken');
const config = require('config');
const Controller = require('../core/controller');
const controller = new Controller;
const accesToken = require('../db/management-token');
const users = require('../db/users');
let verifyOptions = {
    issuer: config.get('secrete.issuer'),
    subject: 'Authentication',
    audience: config.get('secrete.domain'),
    expiresIn: config.get('secrete.expiry')
};

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const data = await jwt.verify(token, config.get('secrete.key'), verifyOptions);
        const isChecked = await accesToken.findOne({
            user: data.user, access_token: token, is_deleted: true
        })
        if (isChecked) {
            throw error
        } else {
            let isActive = await users.findOne({_id:data.user, is_active:false})
            if(isActive)
            {
                throw error;
            }
            else{
                req.user = data;
                next();
            }
           
        }
    }
    catch (error) {
        return res.status(401).json(controller.errorMsgFormat({
            message: "Invalid authentication"
        }));
    }
};
