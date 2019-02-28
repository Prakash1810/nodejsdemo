'use strict';

const { expect }    = require('chai');
const request       = require('supertest');
const config        = require('config');
const baseUrl       = config.get('site.url');
const route         = `/api/${config.get('site.version')}/user/registration`;

describe('Registration module intergration test case:- /api/v1/user/registraton', () => {
    it( 'Validate email , password and confirm password is required' , async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({})
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.email).to.equal("\"email\" is required");
            expect(res.body.data.attributes.password).to.equal("\"password\" is required");
            expect(res.body.data.attributes.password_confirmation).to.equal("\"password confirmation\" is required");
        });
    });

    it('Validate email format', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satzmail.com",
            password: "1234567S",
            password_confirmation: "1234567S",
            refferal_code: null
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.email).to.equal("Invalid email address.");
        });
    });

    it('Validate pasword match with regx', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567",
            password_confirmation: "1234567"
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        });
    });

    it('Validate password & confirm password match', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567"
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.password_confirmation).to.equal("\"password confirmation\" must match password");
        });
    });

    it('Successfully user registred', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567S"
        })
        .expect(200)
        .then((res) => {
            expect(res.body.data.id).to.equal(false);
            expect(res.body.data.type).to.equal("users");
            expect(res.body.data.attributes.message).to.equal("We have sent a confirmation email to your registered email address. satz@mail.com. Please follow the instructions in the email to continue.");
        });
    });

    it('Validate email address already registred', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S",
            password_confirmation: "1234567S"
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.email).to.equal("This email address already exits.");
        });
    });
});