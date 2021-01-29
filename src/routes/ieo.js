const express = require('express');
const router = express.Router();
const Controller = require('../core/controller');
const controller = new Controller()
const ieoValidation = require('../validation/ieo.validation');
const ieo = require('../core/ieo');
const info = require('../middlewares/info');
const auth = require('../middlewares/authentication');

router.get('/', async (req, res) => {
    try {
        await ieo.ieoList(req, res)

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'ieo-details', 500));
    }
})
router.get('/details/:ieo_id', async (req, res) => {
    try {
        await ieo.ieoDetails(req, res)

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'ieo-details', 500));
    }
})
router.post('/token-sale/:ieo_id', auth, info, async (req, res) => {
    try {
        let { error } = await ieoValidation.ieoTokenSale(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error));
        }
        await ieo.addTokenSale(req, res);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'ieo-details', 500));
    }
});

router.get('/history', info, auth, async (req, res) => {
    try {
        await ieo.ieoHistory(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'ieo-details', 500));
    }
})

module.exports = router