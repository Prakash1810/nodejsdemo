const express   = require('express');
const registration = require('../core/registration');
const helpers = require('../helpers/helper.functions');

class Registration {
    
    constructor () {
       this.router = express.Router();
       this.post();
    }

    post () {
        this.router.post('/', (req, res, next) => {
            let { error }  = registration.validate(req.body);
            if (error) {
                res.status(400).send(helpers.errorFormat(error));
                next()
            } else {
                registration.post(req, res);
            }
        });
    }
}

module.exports = Registration;