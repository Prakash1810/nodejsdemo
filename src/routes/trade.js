const express = require('express');
const router = express.Router();
const trade = require('../core/trade');
const Controller = require('../core/controller');
const controller = new Controller;

router.get('/fees', (req, res) => {
    try {
        trade.getTakeAndMakeFee(req, res);
    } catch (error) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': error.message
        }, 'payment-process', 500));
    }
});


module.exports = router;