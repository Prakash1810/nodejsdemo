const jwt = require('jsonwebtoken');
const helpers   = require('../helpers/helper.functions');
const config    = require('config');
const Controller    = require('../core/controller');
const controller    = new Controller;

let verifyOptions = {
    issuer:  config.get('secrete.issuer'),
    subject:  'Authentication',
    audience:  config.get('secrete.domain'),
    expiresIn:  config.get('secrete.expiry')
};

module.exports = (req, res, next) => {
	try {
		const token = req.headers.authorization;
        jwt.verify(token, config.get('secrete.key'), verifyOptions);
        next();
    }
    catch (error) {
        return res.status(401).json(controller.errorMsgFormat({
            message: "Invalid authentication"
        }));
    }
};
