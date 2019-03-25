const express   = require('express');
const registration = require('../core/registration');
const Controller    = require('../core/controller');
const controller = new Controller;

let router = express.Router()

router.post('/', (req, res) => {
    try {
        let { error }  = registration.validate(req.body.data.attributes);
        if (error) {
            res.status(400).send(controller.errorFormat(error));
        } else {
            registration.post(req, res);
        }
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({'message': err.message }));
    }
});

module.exports = router;