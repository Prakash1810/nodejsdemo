const express   = require('express');
const registration = require('../core/registration');
const helpers = require('../helpers/helper.functions');

const router    = express.Router();

router.post('/', (req, res, next) => {
    let { error }  = registration.validate(req.body);
    if (error) {
        res.status(400).send(helpers.errorFormat(error));
        return next()
    } else {
        registration.post(req, res);
    }
});

module.exports = router;
