const jwt = require('jsonwebtoken');
const helpers   = require('../helpers/helper.functions');


module.exports = (req, res, next) => {
	try {
		const token = req.headers.authorization;
        jwt.verify(token, "satz");
        next();
    }
    catch (error) {
        return res.status(401).json(helpers.errorFormat({
            message: error.message
        }));
    }
};