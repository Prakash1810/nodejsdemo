const express               = require('express');
const registrationRoutes    = require('./registration');
const userRoutes            = require('./user');
const router                = express.Router();

// GET v1/docs :- swagger
router.use(express.static('dist'));

router.use('/user/registration',registrationRoutes);
router.use('/user',userRoutes);

module.exports = router;