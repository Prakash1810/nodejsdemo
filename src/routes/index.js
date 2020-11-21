const express = require('express');
const registrationRoutes = require('./registration');
const userRoutes = require('./user');
const walletRoutes = require('./wallet');
const router = express.Router();
const matchRoutes = require('./matching');
const ieo = require('./ieo');
const maintenance = require('./maintenance');
const trade = require('./trade');
const setting =  require('./setting')

router.use(express.static('dist'));
router.use('/user/registration', registrationRoutes);
router.use('/user', userRoutes);
router.use('/wallet', walletRoutes);
router.use('/matching', matchRoutes);
router.use('/ieo',ieo);
router.use('/maintenance', maintenance);
router.use('/trade',trade);
router.use('/setting',setting);

module.exports = router;