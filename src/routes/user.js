const express = require('express');
const user = require('../core/user');
const password = require('../core/password');
const Controller = require('../core/controller');
const auth = require('../middlewares/authentication');
const refresh_auth = require('../middlewares/auth')
const registration = require('../core/registration');
const slide = require('../core/geetest-captcha');
const router = express.Router();
const info = require('../middlewares/info');
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

router.post('/login', async (req, res) => {
    try {
        let { error } = await user.validate(req.body.data.attributes);
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

router.post('/validate/otp', async (req, res) => {
    try {
        let { error } = await user.validateOtp(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            user.validateOtpForEmail(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});
router.post('/resend/otp/', async (req, res) => {
    try {
        let { error } = await user.resendOtpValidation(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            user.resendOtpForEmail(req, res, req.body.data.attributes.type);
        }

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
        let { error } = password.validate(req.body.data.attributes);
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
        let { error } = password.resetPasswordValidate(req.body.data.attributes);
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

router.patch('/change-password', info, auth, (req, res) => {
    try {
        let { error } = password.changePasswordValidate(req.body.data.attributes);

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
        if (req.headers.authorization) {

            return user.getTokenToUserId(req, res);
        } else {
            return res.status(401).json(controller.errorMsgFormat({
                message: "Invalid authentication",
                data: req.headers
            }, 'users', 401));
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/login-history', info, auth, (req, res) => {
    try {
        user.getLoginHistory(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/device-history', info, auth, (req, res) => {
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

router.patch('/settings', info, auth, (req, res) => {
    try {
        let { error } = user.settingsValidate(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            user.patchSettings(req, res, 'withG2f');
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

router.get('/g2f-create', info, auth, (req, res) => {
    try {
        user.insert2faAuth(req, res);
    } catch (err) {
        return res.status(400).send(controller.errorFormat({
            'message': error
        }, 'users', 400));
    }

});

router.patch('/g2f-settings', info, auth, (req, res) => {
    try {
        let { error } = user.g2fSettingValidate(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        } else {
            user.patch2FAuth(req, res);
        }
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

router.post('/token', info, refresh_auth, async (req, res) => {
    try {

        await user.refreshToken(req.user, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});


router.post('/logout', info, auth, async (req, res) => {
    try {
        await user.logout(req.user, req.headers, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.delete('/whitelist', info, auth, async (req, res) => {
    try {
        let data = req.body.data.attributes;
        data.user = req.user.user;
        await user.deleteWhiteList(data, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});
router.post('/market', async (req, res) => {
    try {
        await user.addMarkets(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/market/list', async (req, res) => {
    try {
        await user.marketList(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.post('/favourite', info, auth, async (req, res) => {
    try {
        let { error } = user.favouriteValidation(req.body.data.attributes);
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
});

router.patch('/favourite', info, auth, async (req, res) => {
    try {
        await user.updateFavourite(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});


router.post('/generate/otp', info, auth, async (req, res) => {
    try {
        if (req.body.data.attributes.type) {
            await user.generatorOtpforEmail(req.user.user, req.body.data.attributes.type, res);
        } else {
            return res.status(400).send(controller.errorMsgFormat({
                'message': "Type is required"
            }, 'users', 400));
        }

    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/withdraw/active', info, auth, async (req, res) => {
    try {
        await user.withdrawActive(req.user.user, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/kyc-session', info, auth, async (req, res) => {
    try {
        await user.kycSession(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.post('/kyc-update', async (req, res) => {
    try {
        await user.kycUpdate(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/referrer-history/:code', info, auth, async (req, res) => {
    try {
        await user.referrerHistory(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/reward-history', info, auth, async (req, res) => {
    try {
        return user.rewardHistory(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.post('/kyc-details', info, auth, async (req, res) => {
    try {
        let { error } = user.kycDetailsValidation(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        }
        await user.kycDetails(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});

router.get('/kyc_statistics', info, auth, async (req, res) => {
    try {

        await user.kycStatistics(req, res);
    }
    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }
});
router.post('/apikey', info, auth, async (req, res) => {
    try {
        let { error } = user.apiKeyValidation(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 'users', 400));
        }
        await user.checkApikey(req, res);
    }

    catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'users', 500));
    }


});

// router.get('/active', async (req, res) => {
//     try {
//         await user.active(req, res);
//     }
//     catch (err) {
//         return res.status(500).send(controller.errorMsgFormat({
//             'message': err.message
//         }, 'users', 500));
//     }
// });

module.exports = router;
