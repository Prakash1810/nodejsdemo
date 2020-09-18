const express = require('express');
const router = express.Router();
const Controller = require('../core/controller');
const maintenance = require('../core/maintenance');
const controller = new Controller;
const auth = require('../middlewares/auth')

router.get('/notice', async (req, res) => {
    try {
        await maintenance.getAlleNotice(req, res);
    } catch (error) {
        return res.status(400).send(controller.errorFormat({
            "message": error.message
        }, 500));
    }
});

module.exports = router;