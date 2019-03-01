const express       = require('express');
const user          = require('../core/user');
const Controller    = require('../core/controller');
const router        = express.Router();
const controller    = new Controller;

router.get('/activation/:hash', (req, res) => {
    try {
        user.activate(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorFormat({'message': 'Invalid token.' }));
    }
});

router.post('/login', (req, res) => {
    try {
        let { error }  = user.validate(req.body);
        if (error) {
            return res.status(400).send(controller.errorFormat(error));
        } else {
            user.login(req, res);
        }
    }
    catch (err) {
        return res.status(500).send(controller.errorFormat({'message': err.message }));
    }
});

router.delete('/', (req, res) => {
    try {
        let { error }  = user.validate(req.body);
        if (error) {
            return res.status(400).send(controller.errorFormat(error));
        } else {
            user.login(req, res);
        }
    }
    catch (err) {
        return res.status(500).send(controller.errorFormat({'message': err.message }));
    }
});

module.exports = router;