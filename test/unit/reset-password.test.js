'use strict';

const { expect }    = require('chai');
const password      = require('../../src/core/password');
const moment        = require('moment');

describe('Reset password module unit test case:-', () => {
    it ('Should be check return encrypted hash', (done) => {
        let encryptHash = password.encryptHash('satz@mail.com');
        expect(encryptHash).to.be.a('string');
        done()
    });

    it ('should check reset token time is expired', (done) => {
        var time = moment().subtract(7300, 'seconds').format('YYYY-MM-DD HH:mm:ss');
        let checkExired = password.checkTimeExpired(moment(time).format('YYYY-MM-DD HH:mm:ss'));
        expect(checkExired).to.equal(false);
        done()   
    });

    it ('should check reset token time is not expired', (done) => {
        var time = moment().subtract(7199, 'seconds').format('YYYY-MM-DD HH:mm:ss');
        let checkExired = password.checkTimeExpired(moment(time).format('YYYY-MM-DD HH:mm:ss'));
        expect(checkExired).to.equal(true);
        done()  
    });
});