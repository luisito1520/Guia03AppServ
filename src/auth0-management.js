let cachedToken;

function getManagementApiBaseUrl() {
  return `https://${process.env.AUTH0_DOMAIN}/api/v2`;
}

async function getManagementToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AUTH0_MGMT_CLIENT_ID,
      client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
      audience: `${getManagementApiBaseUrl()}/`,
      grant_type: 'client_credentials',
      scope: 'read:users update:users',
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth0 no emitio el token de Management API (HTTP ${response.status}).`);
  }

  const tokenResponse = await response.json();
  if (
    typeof tokenResponse.access_token !== 'string'
    || typeof tokenResponse.expires_in !== 'number'
  ) {
    throw new Error('La respuesta de Auth0 no contiene un token de Management API valido.');
  }

  cachedToken = {
    value: tokenResponse.access_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
  };
  return cachedToken.value;
}

async function requestUser(userId, method, body) {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('No se encontro el identificador del usuario autenticado.');
  }

  const token = await getManagementToken();
  const response = await fetch(
    `${getManagementApiBaseUrl()}/users/${encodeURIComponent(userId)}`,
    {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );

  if (!response.ok) {
    throw new Error(`Auth0 Management API rechazo la solicitud (HTTP ${response.status}).`);
  }

  return response.json();
}

async function getUser(userId) {
  return requestUser(userId, 'GET');
}

async function updateUserMetadata(userId, metadata) {
  return requestUser(userId, 'PATCH', { user_metadata: metadata });
}

module.exports = { getUser, updateUserMetadata };
