const express = require('express');
const setting = require('../core/setting');
const Controller = require('../core/controller');
const controller = new Controller;
let router = express.Router()

router.get('/version', async (req, res) => {
    try {
        await setting.getVersion(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'setting', 500));
    }
})

module.exports = router;