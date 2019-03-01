'use strict';

const { expect }    = require('chai');
const UserTemp      = require('../../src/db/user-temp');
const helpers       = require('../../src/helpers/helper.functions');
const request       = require('supertest');
const config        = require('config');
const baseUrl       = config.get('site.url');
const route         = `/api/${config.get('site.version')}/user/login`;

describe('User module intergration testing for POST and GET:- /api/user', () => {
    it( 'Validate email and password is required' , async () => {
        await request(baseUrl)
                .post(route)
                .set('Accept', 'application/json')
                .send({})
                .expect(400)
                .then((res) => {
                    expect(res.body.data.attributes.email).to.equal("\"email\" is required");
                    expect(res.body.data.attributes.password).to.equal("\"password\" is required");
                });
    });

    it('Validate invalid credentials', async () => {
        await request(baseUrl)
                .post(route)
                .set('Accept', 'application/json')
                .send({
                    email: "satz@mail.com",
                    password: "1234567SS"
                })
                .expect(400)
                .then((res) => {
                    expect(res.body.data.attributes.message).to.equal("Invalid credential");
                });
    });

    it ('User activation invalid token', async () => {
        let routeActivation = `/api/${config.get('site.version')}/user/activation/dsdsadsadsa`;
        await request(baseUrl)
        .get(routeActivation)
        .set('Accept', 'application/json')
        .expect(500)
        .then((res) => {
            expect(res.body.data.attributes.message).to.equal("Invalid token.");
        });
    });

    it ('User activation',  () => {
        UserTemp.findOne({ email: 'satz@mail.com' })
        .exec(function (err, result) {
                let encryptedHash = helpers.encrypt(
                    JSON.stringify({
                        'id': result.id,
                        'email': result.email
                    })
                );
            let routeActivation = `/api/${config.get('site.version')}/user/activation/${encryptedHash}`;
                request(baseUrl)
                .get(routeActivation)
                .set('Accept', 'application/json')
                .expect(200)
                .then((res) => {
                    expect(res.body.data.attributes.message).to.equal("Congratulation!, Your account has been activated.");
                });
            });
    });

    it('Validate login credentials', async () => {
         await request(baseUrl)
        .post(route)
        .send({
            email: "satz@mail.com",
            password: "1234567S"
        })
        .set('Accept', 'application/json')
        .expect(400)
        .then((res) => {
            expect(res.body).to.have.property('errors', true);
            expect(res.body).to.have.property('data.attributes.token');
        });
    });

    it ('Delete login credentials', async () => {
        await request(baseUrl)
        .post(route)
        .send({
            email: "satz@mail.com",
            password: "1234567S"
        })
        .set('Accept', 'application/json')
        .expect(400)
        .then((res) => {
            expect(res.body).to.have.property('errors', true);
            expect(res.body).to.have.property('data.attributes.token');
        });
    });
});