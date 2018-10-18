const express   = require('express');
const registration = require('../core/registration');

const router    = express.Router();

router.get('/', (req, res) => {
    res.status(200).send({msg:'registration page'});
});

router.post('/', (req, res, next) => {
    let { error }  = registration.validate(req.body);
    if (error) {
        let errors = {};
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        res.status(400).send(errors);
    } else {
        if (registration.checkEmailiCount(req.body.email)) {
            res.status(400).send({email: 'This email address already registred.'});
        } else {
            let post = registration.post(req)
            res.status(200).send(post)
            next()
        }
    }
});

module.exports = router;