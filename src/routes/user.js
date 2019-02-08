const express   = require('express');
const user = require('../core/user');
const helpers = require('../helpers/helper.functions');

const router    = express.Router();

router.get('/activation/:hash', (req, res) => {
    try {
        user.activate(req, res);
    }
    catch (err) {
        return res.status(500).send(helpers.errorFormat({'message': err.message }));
    }
});

router.post('/login', (req, res) => {
    try {
        let { error }  = user.validate(req.body);
        if (error) {
            return res.status(400).send(helpers.errorFormat(error));
        } else {
            user.login(req, res);
        }
    }
    catch (err) {
        return res.status(500).send(helpers.errorFormat({'message': err.message }));
    }
});

module.exports = router;
