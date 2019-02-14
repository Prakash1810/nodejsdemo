const request   = require('supertest');
const baseUrl   = 'http://localhost:3000';
const route     = '/api/user/login';
const UserTemp  = require('../src/db/user-temp');
const helpers = require('../src/helpers/helper.functions');


beforeAll((done) => {
    done();
});
  
afterAll((done) => {
    done();
});

describe('Intergration testing for POST and GET:- /api/user/login', () => {
    it( 'Validate email and password is required' , () => {
        request(baseUrl)
                .post(route)
                .set('Accept', 'application/json')
                .send({})
                .expect(400)
                .then((res) => {
                    expect(res.body).toMatchObject({
                        data: {
                            attributes: {
                                email: "\"email\" is required",
                                password: "\"password\" is required"
                            }
                        }
                    });
                });
    });

    it('Validate invalid credentials', () => {
        request(baseUrl)
                .post(route)
                .set('Accept', 'application/json')
                .send({
                    email: "satz@mail.com",
                    password: "1234567S"
                })
                .expect(400)
                .then((res) => {
                    expect(res.body).toMatchObject({
                        data: {
                            attributes: {
                                message: "Invalid credentials"
                            }
                        }
                    });
                });
    });

    it ('User activation invalid token', () => {
        var route = `/api/user/activation/dsdsadsadsa`;
        request(baseUrl)
        .get(route)
        .set('Accept', 'application/json')
        .expect(400)
        .then((res) => {
            expect(res.body).toMatchObject({
                data: {
                    attributes: {
                        message: "Invalid token. may be token as expired!"
                    }
                }
            });
        });
    });

    it ('User activation', async () => {
        await UserTemp.find({ email: 'satz@mail.com' })
            .exec()
            .then(result => {
                let encryptedHash = helpers.encrypt(
                    JSON.stringify({
                        'id': result.id,
                        'email': result.email
                    })
                );
            var route = `/api/user/activation/${encryptedHash}`;
                request(baseUrl)
                .get(route)
                .set('Accept', 'application/json')
                .expect(200)
                .then((res) => {
                    expect(res.body).toMatchObject({
                        data: {
                            attributes: {
                                message: "Congratulation!, Your account has been activated."
                            }
                        }
                    });
                });
            });
    });

    it('Validate login credentials', () => {
        request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            email: "satz@mail.com",
            password: "1234567S"
        })
        .expect(200)
        .then((res) => {
            expect(res.body).toHaveProperty('errors', false);
            expect(res.body).toHaveProperty('data.attributes.token');
        });
    });
});
