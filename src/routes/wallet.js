const express = require('express');
const Controller = require('../core/controller');
const wallet = require('../core/wallet');
const apiServices = require('../services/api');
const auth = require("../middlewares/authentication");
const router = express.Router();

const controller = new Controller;

router.get('/assets', (req, res) => {
    try {
        return wallet.getAssets(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

router.post('/asset-address', auth, (req, res) => {
    try {
        return wallet.getAssetAddress(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'wallet', 500));
    }
});

module.exports = router;