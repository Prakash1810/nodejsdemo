'use strict';

const { expect }    = require('chai');
const password      = require('../../src/core/password');
const moment        = require('moment');
var isValidRequest  = { 'id': '5c7e662bba7fe90ebe523256' , 'password' : '1234567S', 'password_confirmation' : '1234567S' };

describe('Reset password link module unit test case:-', () => {
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

describe('Reset password module unit test :-', () => {
    it ('Should validate all the fields', (done) => {
        var errors    = {};
       
        let { error } = password.resetPasswordValidate({});
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });

        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.id).to.equal("\"id\" is required");
        expect(errors.password).to.equal("\"password\" is required");
        expect(errors.password_confirmation).to.equal("\"password confirmation\" is required");
        done()
    });

    it ('Should enter all the fields', (done) => {
        let { error } = password.resetPasswordValidate(isValidRequest);
        expect(error).to.equal(null);
        done()
    });

    it ('should check password minimum length', (done) => {
        var errors    = {};
        isValidRequest.password = '123456';
        let { error } = password.resetPasswordValidate(isValidRequest);
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });

        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        done()
    });

    it ('should check password strength', (done) => {
        var errors    = {};
        isValidRequest.password = '12345678';
        let { error } = password.resetPasswordValidate(isValidRequest);
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });

        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        done()
    });

    it ('should match the password and confirm password', (done) => {
        var errors    = {};
        isValidRequest.password  = '1234567SS';
        let { error } = password.resetPasswordValidate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.password_confirmation).to.equal("\"password confirmation\" must match password");
        done()
    });
})