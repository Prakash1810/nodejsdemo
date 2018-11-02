const request = require('supertest');

let baseUrl     = 'http://localhost:3000';
let route = '/api/user/login';

describe('Intergration testing for POST:- /api/user/login', () => {
    it( 'Validate email and password is required' , (done) => {
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
        done()
    });

    it('Validate invalid credentials', (done) => {
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
        done()
    });

    it('Validate login credentials', (done) => {
        request(baseUrl)
                .post(route)
                .set('Accept', 'application/json')
                .send({
                    email: "satz3@mail.com",
                    password: "1234567S"
                })
                .expect(200)
                .then((res) => {
                    expect(res.body).toHaveProperty('errors', false);
                    expect(res.body).toHaveProperty('data.attributes.token');
                    done()
                });
    });
});
