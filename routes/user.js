const express   = require('express');
const user = require('../core/user');
const helpers = require('../helpers/helper.functions');

const router    = express.Router();

router.get('/activation/:hash', (req, res, next) => {
    try {
        user.activate(req, res);
        next()
    }
    catch (err) {
        return res.status(500).send(helpers.errorFormat({'message': err.message }));
    }
});

router.post('/login', (req, res, next) => {
    try {
        user.login(req, res);
        next()
    }
    catch (err) {
        return res.status(500).send(helpers.errorFormat({'message': err.message }));
    }
});

module.exports = router;
