const express   = require('express');
const registration = require('../core/registration');
const Controller    = require('../core/controller');

const controller = new Controller;

let router = express.Router()
router.post('/', (req, res) => {
    let { error }  = registration.validate(req.body.data.attributes);
    if (error) {
        res.status(400).send(controller.errorFormat(error));
    } else {
        registration.post(req, res);
    }
});

module.exports = router;