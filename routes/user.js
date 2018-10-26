const express   = require('express');
const user = require('../core/user');
const helpers = require('../helpers/helper.functions');

const router    = express.Router();

router.get('/activation/:hash', (req, res, next) => {
    try {
        let activate = user.activate(req, res, next);
    }
    catch (err) {
        res.status(500).send(helpers.errorFormat({'message': 'Something failed.'}));
    }
});

module.exports = router;