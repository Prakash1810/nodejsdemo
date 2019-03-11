const express       = require('express');
const user          = require('../core/user');
const password      = require('../core/password');
const Controller    = require('../core/controller');
const auth          = require("../middleware/authentication");
const router        = express.Router();
const controller    = new Controller;

router.get('/activation/:hash', (req, res) => {
    try {
        user.activate(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({'message': 'Invalid token.' }));
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
        return res.status(500).send(controller.errorMsgFormat({'message': err.message }));
    }
});

router.delete('/', (req, res) => {
    user.removeUser(req.body.email, res);
});

router.post('/forget-password', (req, res) => {
    try {
        let { error }  = password.validate(req.body);
        if (error) {
            return res.status(400).send(controller.errorFormat(error));
        } else {
            password.sendResetLink(req, res);
        }
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({'message': err.message }));
    }
});

router.get('/reset-password/:hash', (req, res) => {
    try {
        password.checkResetLink(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({'message': err.message }));
    }
});


router.patch('/reset-password', (req, res) => {
    try {
        let { error }  = password.resetPasswordValidate(req.body);
        if (error) {
            return res.status(400).send(controller.errorFormat(error));
        } else {
            password.resetPassword(req, res);
        }
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({'message': err.message }));
    }
});

router.patch('/change-password', auth, (req, res) => {
    try {
        let { error }  = password.changePasswordValidate(req.body);

        if (error) {
            return res.status(400).send(controller.errorFormat(error));
        } else {
            password.changePassword(req, res);
        }
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({'message': err.message }));
    }
});

router.post('/get-user-id', (req, res) => {
    try {
        if (req.headers.authorization) {
            user.getTokenToUserId(req, res);
        } else {
            return res.status(401).json(controller.errorMsgFormat({
                message: "Invalid authentication"
            }));
        }
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({'message': err.message }));
    }
});

module.exports = router;