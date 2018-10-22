const express   = require('express');
const registration = require('../core/registration');
const helpers = require('../helpers/helper.functions');

const router    = express.Router();

router.get('/', (req, res) => {
    res.status(200).send({msg:'registration page'});
});

router.post('/', (req, res, next) => {
    let { error }  = registration.validate(req.body);
    if (error) {
        res.status(400).send(helpers.errorFormat(error));
    } else {
        registration.post(req, res, next);
    }
});

module.exports = router;