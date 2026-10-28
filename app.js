require('dotenv').config();

const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { getUser, updateUserMetadata } = require('./src/auth0-management');
const { hasValidCsrfToken, issueCsrfToken } = require('./src/csrf');
const { DOCUMENT_TYPES, getProfileValues, validateProfile } = require('./src/profile');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Falta configurar la variable ${name}. Copia .env.example a .env y completala.`);
  }
  return value.trim();
}

const auth0Domain = requiredEnv('AUTH0_DOMAIN').replace(/^https?:\/\//, '').replace(/\/+$/, '');
if (!/^[a-zA-Z0-9.-]+$/.test(auth0Domain)) {
  throw new Error('AUTH0_DOMAIN debe ser solo el dominio del tenant, sin protocolo ni ruta.');
}

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const sessionSecret = requiredEnv('AUTH0_SESSION_SECRET');
if (sessionSecret.length < 32) {
  throw new Error('AUTH0_SESSION_SECRET debe tener al menos 32 caracteres.');
}

const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL,
  clientID: requiredEnv('AUTH0_CLIENT_ID'),
  clientSecret: requiredEnv('AUTH0_CLIENT_SECRET'),
  issuerBaseURL: `https://${auth0Domain}`,
  secret: sessionSecret,
  authorizationParams: { scope: 'openid profile email' },
};

requiredEnv('AUTH0_MGMT_CLIENT_ID');
requiredEnv('AUTH0_MGMT_CLIENT_SECRET');
process.env.AUTH0_DOMAIN = auth0Domain;

const app = express();
const port = Number(process.env.PORT || 3000);

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(auth(config));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.static(`${__dirname}/public`));

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function authenticatedUserId(req) {
  const userId = req.oidc.user && req.oidc.user.sub;
  if (typeof userId !== 'string' || !userId) {
    throw new Error('La sesion autenticada no contiene un identificador de usuario.');
  }
  return userId;
}

function userName(req) {
  const user = req.oidc.user || {};
  return user.name || user.nickname || user.email || 'Estudiante';
}

app.get('/', (req, res) => {
  res.render('home', {
    isAuthenticated: req.oidc.isAuthenticated(),
    name: req.oidc.isAuthenticated() ? userName(req) : '',
  });
});

app.get('/profile', requiresAuth(), asyncHandler(async (req, res) => {
  const auth0User = await getUser(authenticatedUserId(req));
  const csrfToken = issueCsrfToken(res);
  res.render('profile', {
    csrfToken,
    documentTypes: DOCUMENT_TYPES,
    errors: {},
    name: userName(req),
    saved: req.query.saved === '1',
    values: getProfileValues(auth0User.user_metadata),
  });
}));

app.post('/profile', requiresAuth(), asyncHandler(async (req, res) => {
  if (!hasValidCsrfToken(req)) {
    return res.status(403).render('error', {
      message: 'El formulario vencio o no pudo verificarse. Recarga la pagina e intenta nuevamente.',
      name: userName(req),
    });
  }

  const { values, errors } = validateProfile(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).render('profile', {
      csrfToken: issueCsrfToken(res),
      documentTypes: DOCUMENT_TYPES,
      errors,
      name: userName(req),
      saved: false,
      values,
    });
  }

  await updateUserMetadata(authenticatedUserId(req), values);
  return res.redirect('/profile?saved=1');
}));

app.use((req, res) => {
  res.status(404).render('error', {
    message: 'No encontramos la pagina solicitada.',
    name: req.oidc.isAuthenticated() ? userName(req) : '',
  });
});

app.use((error, req, res, next) => {
  console.error('[app] Error al procesar la solicitud:', error.message);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).render('error', {
    message: 'No fue posible completar la solicitud. Verifica la configuracion de Auth0 y vuelve a intentarlo.',
    name: req.oidc && req.oidc.isAuthenticated() ? userName(req) : '',
  });
});

app.listen(port, () => {
  console.log(`Aplicacion disponible en ${baseURL}`);
});
