// tests/api.test.js - Integration tests on endpoints (Security Point 19)
const request = require('supertest');
const { app, server } = require('../src/server');
const prisma = require('../src/config/prisma');

describe('API SyndicBloc Integration Tests', () => {
  let authCookie = null;

  afterAll(async () => {
    if (server && server.close) {
      server.close();
    }
    await prisma.$disconnect();
  });

  test('Tentative de connexion avec mauvais mot de passe renvoie 401 et décrémente les tentatives', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@syndic.dz',
        password: 'WrongPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('Connexion réussie de l\'administrateur renvoie un jeton et un cookie HttpOnly', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@syndic.dz',
        password: 'AdminPassword2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.admin).toBeDefined();
    expect(res.body.data.admin.email).toBe('admin@syndic.dz');
    expect(res.body.data.admin.mot_de_passe_hash).toBeUndefined(); // Point 11: hash never exposed

    // Extract cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies.find(c => c.startsWith('access_token='));
    expect(authCookie).toBeDefined();
  });

  test('Connexion réussie avec nom d\'utilisateur "aymen" et mot de passe "aymen31"', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'aymen',
        password: 'aymen31',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.admin).toBeDefined();
    expect(res.body.data.admin.username).toBe('aymen');
    expect(res.body.data.admin.mot_de_passe_hash).toBeUndefined();
  });

  test('Accès refusé sans cookie d\'authentification sur route protégée (401)', async () => {
    const res = await request(app)
      .get('/api/v1/apartments');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test('Récupération de la liste des 24 appartements avec authentification (200)', async () => {
    const res = await request(app)
      .get('/api/v1/apartments')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.apartments)).toBe(true);
    expect(res.body.data.apartments.length).toBe(24);
  });

  test('Récupération des cotisations du mois avec calcul automatique des KPIs', async () => {
    const res = await request(app)
      .get('/api/v1/cotisations?mois=10&annee=2026')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.summary.totalApartments).toBe(24);
    expect(res.body.data.summary.totalExpected).toBe(12000);
    expect(res.body.data.cotisations.length).toBe(24);
  });
});
