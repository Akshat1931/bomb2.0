/**
 * lib/supabase.js — Supabase REST API client (no SDK, pure fetch)
 */
function clean(str) {
  return (str || '').trim().replace(/^["']|["']$/g, '');
}

function getUrl() {
  return clean(process.env.SUPABASE_URL).replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
}

function getKey() {
  return clean(process.env.SUPABASE_SERVICE_KEY);
}

function headers(extra = {}) {
  const key = getKey();
  return {
    'Authorization': `Bearer ${key}`,
    'apikey': key,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function getUser(discord_id) {
  const res = await fetch(
    `${getUrl()}/rest/v1/users?discord_id=eq.${discord_id}&select=*`,
    { headers: headers() }
  );
  const data = await res.json();
  return Array.isArray(data) ? data[0] || null : null;
}

async function getAllUsers() {
  const res = await fetch(
    `${getUrl()}/rest/v1/users?select=*&order=created_at.desc`,
    { headers: headers() }
  );
  return await res.json();
}

async function createUser(user) {
  const res = await fetch(`${getUrl()}/rest/v1/users`, {
    method: 'POST',
    headers: headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(user),
  });
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function updateUser(discord_id, updates) {
  const res = await fetch(
    `${getUrl()}/rest/v1/users?discord_id=eq.${discord_id}`,
    {
      method: 'PATCH',
      headers: headers({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(updates),
    }
  );
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

/**
 * On login: creates new trial user OR updates username/avatar for returning user.
 * Never overwrites status or trial_start for existing users.
 */
async function loginUser({ discord_id, username, avatar }) {
  const existing = await getUser(discord_id);
  if (existing) {
    return await updateUser(discord_id, { username, avatar });
  }
  return await createUser({
    discord_id,
    username,
    avatar,
    status: 'trial',
    trial_start: new Date().toISOString(),
  });
}

module.exports = { getUser, getAllUsers, createUser, updateUser, loginUser };
