const jwt           = require('jsonwebtoken');
const config        = require('config');
const Controller    = require('../core/controller');
const controller    = new Controller;

let verifyOptions   = {
    issuer:  config.get('secrete.issuer'),
    subject:  'Authentication',
    audience:  config.get('secrete.domain'),
    expiresIn:  config.get('secrete.expiry')
};

module.exports = async (req, res, next) => {
	try {
		const token = req.headers.authorization;
        const data = await jwt.verify(token, config.get('secrete.key'), verifyOptions);
        req.user = data;
        next();
    }
    catch (error) {
        return res.status(401).json(controller.errorMsgFormat({
            message: "Invalid authentication"
        }));
    }
};
