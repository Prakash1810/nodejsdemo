const express   = require('express');
const registration = require('../core/registration');

const router    = express.Router();

router.get('/', (req, res) => {
    res.status(200).send({msg:'registration page'});
});

router.post('/', (req, res, next) => {
      let result  = registration.validate(req.body, {abortEarly: false});
      if( result) {
        let errors = [];
        // result.error.details.forEach((detail) => {
        //     errors.push({
        //         key: detail.path,
        //         message: detail.message
        //     });
        // });
        res.status(400).send(result.error.details);
      } 
});

module.exports = router;