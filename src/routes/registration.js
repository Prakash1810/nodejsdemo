const express = require('express');
const registration = require('../core/registration');
const Controller = require('../core/controller');
const { registrationValidation } = require('../validation/registration.validations.js');
const controller = new Controller;
const Utils = require('../helpers/utils');
const utils = new Utils();

let router = express.Router()

router.post('/', async (req, res) => {
    try {
        await utils.passwordDecryption(req.body.data.attributes, res);
        let { error } = registrationValidation(req.body.data.attributes);
        if (error) {
            res.status(400).send(controller.errorFormat(error));
        } else {
            registration.post(req, res);
        }
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({ 'message': err.message }));
    }
});

module.exports = router;