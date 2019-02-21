const chai      = require('chai');
const expect    = chai.expect;
const assert    = chai.assert;
const should    = chai.should();
const registration  = require('../src/core/registration');

var isInValidRequest = {
    'email_address'     : null,
    'password'          : null,
    'confirm_password'  : '1234567'
}

var isValidRequest = {
    'email_address'     : 'satz@mail.com',
    'password'          : '1234567S',
    'confirm_password'  : '1234567S'
}

describe('Registration :-', () => {
    it ('should check all the fields are required', (done) => {
        let error = registration.validate(isInValidRequest);
        expect(error).to.be.an.error();
        expect(error.isJoi).to.be.true();
        done()
    });

    it ('should check all the fields are entered', (done) => {
        done()
    });

    it ('should match the password and confirm password', (done) => {
        done()
    });

    it ('should matched the password and confirm password', (done) => {
        done()
    });

    it ('should match the password strength', (done) => {
        done()
    });

    it ('should matched the password strength', (done) => {
        done()
    });

    it ('should be validate email format', (done) => {
        done()
    });

    it ('should be email formated', (done) => {
        done()
    });

    it ('should be check unique email address', (done) => {
        done()
    });

    it ('should be check email address is unique', (done) => {
        done()
    });
});