const express       = require('express');
const Controller    = require('../core/controller');
const wallet        = require('../core/wallet');
const userServices  = require('../services/users');
const router        = express.Router();

const controller    = new Controller;

router.get('/', (req,res) => {
    try {
        userServices.addressCreation(1, res);
    } catch(er) {
        console.log(er.message)
    }
});


router.get('/assets', (req, res) => {
    try {
        wallet.getAssets(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({'message': err.message }, 'wallet', 500));
    }
});

module.exports = router;