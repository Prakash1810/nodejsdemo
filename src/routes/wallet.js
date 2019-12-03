const express = require('express');
const Controller = require('../core/controller');
const wallet = require('../core/wallet');
const info = require('../middlewares/info');
const auth = require("../middlewares/authentication");
const router = express.Router();
const controller = new Controller;

router.get('/assets',(req, res) => {
    try {
        return wallet.getAssets(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.post('/asset-address',info, auth, (req, res) => {
    try {
        return wallet.getAssetAddress(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.post('/withdraw-address',info, auth, (req, res) => {
    try {
        let { error } = wallet.postWithdrawAddressValidation(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorMsgFormat({
                "message": error
            }, 'withdraw', 400));
        } else {
            return wallet.postWithdrawAddress(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.patch('/withdraw-address',info, auth, (req, res) => {
    try {
        return wallet.patchWithdrawAddress(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.delete('/withdraw-address/:id',info, auth, (req, res) => {
    try {
        return wallet.deleteWithdrawAddress(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.get('/withdraw-address',info, auth, (req, res) => {
    try {
        return wallet.getWithdrawAddress(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.get('/withdraw-address/:asset',info, auth, (req, res) => {
    try {
        return wallet.getAssetWithdrawAddress(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.get('/balance',info, auth, (req, res) => {
    try {
        return wallet.getAssetsBalance(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.get('/transactions/:type',info, auth, (req, res) => {
    try {
        return wallet.getTransactionsHistory(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.post('/withdraw',info,auth, (req, res) => {
    try {
        let { error } = wallet.postWithdrawValidation(req.body.data.attributes);
        if (error) {
           
            return res.status(400).send(controller.errorMsgFormat({
                "message": error
            }, 'withdraw', 400));
        } else {
            return wallet.postWithdraw(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.patch('/withdraw', (req, res) => {
    try {
        let { error } = wallet.patchWithdrawConfirmationValidation(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorMsgFormat({
                "message": error
            }, 'withdraw', 400));
        } else {
            return wallet.patchWithdrawConfirmation(req, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.post('/resend-withdraw',info, auth, (req, res) => {
    try {
        return wallet.resendWithdrawNotification(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.delete('/withdraw/:id',info, auth, (req, res) => {
    try {
        return wallet.deleteWithdraw(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

module.exports = router;