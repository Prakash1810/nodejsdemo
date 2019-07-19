const express = require('express');
const user = require('../core/user');
const password = require('../core/password');
const Controller = require('../core/controller');
const auth = require('../middlewares/authentication');
const refresh_auth = require('../middlewares/auth')
const registration = require('../core/registration');
const slide = require('../core/geetest-captcha');
const router = express.Router();
const controller = new Controller;

router.get('/activation/:hash', (req, res) => {
    try {
        user.activate(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.post('/login', (req, res) => {
    try {
        let {
            error
        } = user.validate(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            user.login(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.post('/validate/otp', (req, res) => {
    try {
        user.validateOtpForEmail(req, res);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});
router.post('/resend/otp/', (req, res) => {
    try {
        user.resendOtpForEmail(req, res);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});


router.delete('/', (req, res) => {
    user.removeUser(req.body.data.attributes.email, res);
});

router.post('/forget-password', (req, res) => {
    try {
        let {
            error
        } = password.validate(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            password.sendResetLink(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/reset-password/:hash', (req, res) => {
    try {
        password.checkResetLink(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});


router.patch('/reset-password', (req, res) => {
    try {
        let {
            error
        } = password.resetPasswordValidate(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            password.resetPassword(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.patch('/change-password', auth, (req, res) => {
    try {
        let {
            error
        } = password.changePasswordValidate(req.body.data.attributes);

        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            password.changePassword(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/get-user-id', (req, res) => {
    try {
        console.log("Token:", req.headers);
        if (req.headers.authorization) {

            return user.getTokenToUserId(req, res);
        } else {
            return res.status(401).json(controller.errorMsgFormat({
                message: "Invalid authentication",
                data: req.headers
            }, 'users', 500));
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/login-history', auth, (req, res) => {
    try {
        user.getLoginHistory(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/device-history', auth, (req, res) => {
    try {
        user.getDeviceHistory(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.patch('/whitelist-ip/:hash', (req, res) => {
    try {
        return user.patchWhiteListIP(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.patch('/settings', auth, (req, res) => {
    try {
        let {
            error
        } = user.settingsValidate(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            user.patchSettings(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.post('/resend-email', (req, res) => {
    try {
        registration.resendEmail(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }));
    }
});

router.patch('/disable', (req, res) => {
    try {
        user.disableAccount(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get("/gt/register-slide", function (req, res) {

    try {
        slide.register(null, function (err, data) {
            if (err) {
                return res.status(500).send(err);
            }
            return res.status(200).json(controller.successFormat({
                'message': 'Captcha values fetching successfully...',
                'data': data
            }));
        });
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.patch('/g2f-settings', auth, (req, res) => {
    try {
        user.patch2FAuth(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.post('/g2f-verify', (req, res) => {
    try {
        user.postVerifyG2F(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.post('/token', refresh_auth, async (req, res) => {
    try {
        await user.refreshToken(req.user, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
})


router.post('/logout', auth, async (req, res) => {
    try {
        await user.logout(req.user, req.headers.authorization, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
})

router.delete('/whitelist', auth, async (req, res) => {
    try {
        let data = req.body.data.attributes;
        data.user = req.user.user;
        await user.deleteWhitList(data, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
})
router.post('/market', async (req, res) => {
    try {
        await user.addMarkets(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
})

router.get('/market/list', async (req, res) => {
    try {
        await user.marketList(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
})

router.post('/favourite', auth, async (req, res) => {
    try {
        let {
            error
        } = user.favouriteValidation(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        }
        await user.addFavouriteUser(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
})

router.patch('/favourite', auth, async (req, res) => {
    try {
        await user.updateFavourite(req,res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
})

module.exports = router;