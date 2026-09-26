// Requests every page and API route of running servers backed by the sample
// database (sample-db/) and fails on any unexpected status code.
//
//   node scripts/smoke-test.mjs http://127.0.0.1:3000 [more base URLs...]

const SERVER_IDS = [1, 2];

const ROUTES = [
  ["/", 307],
  ["/servers", 307],
  ["/servers/home", 200],
  ["/servers/leaders", 200],
  ["/servers/leaders?view=weekly", 200],
  ["/servers/leaders?q=M%C3%BCller", 200],
  ["/servers/chat", 200],
  ["/servers/chat?q=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82", 200],
  ["/servers/chat?player=17&channel=global", 200],
  ["/servers/chat?at=2026-01-01T12%3A00", 200],
  ["/servers/maps", 200],
  ["/servers/countries", 200],
  ["/servers/countries?c=US,us,A1", 200],
  ["/servers/suspicious", 200],
  ["/servers/server", 200],
  ["/servers/bans", 200],
  ...SERVER_IDS.flatMap((id) => [
    [`/servers/${id}`, 200],
    [`/servers/${id}?scoreboardSort=soldierName&scoreboardOrder=asc`, 200],
    [`/servers/${id}/leaders`, 200],
    [`/servers/${id}/leaders?view=weekly`, 200],
    [`/servers/${id}/leaders?q=_`, 200],
    [`/servers/${id}/leaders?q=%25&page=3`, 200],
    [`/servers/${id}/chat`, 200],
    [`/servers/${id}/chat?q=ak%2047`, 200],
    [`/servers/${id}/chat?q=%22nice%20shot%22%20gg`, 200],
    [`/servers/${id}/chat?q=50%25_off%5C%27`, 200],
    [`/servers/${id}/chat?q=%F0%9F%98%80`, 200],
    [`/servers/${id}/chat?player=17`, 200],
    [`/servers/${id}/chat?player=999999`, 200],
    [`/servers/${id}/chat?channel=team`, 200],
    [`/servers/${id}/chat?msg=5`, 200],
    [`/servers/${id}/chat?at=2026-01-01T12%3A00`, 200],
    [`/servers/${id}/chat?at=2026-03-08T02%3A30`, 200],
    [`/servers/${id}/chat?before=20`, 200],
    [`/servers/${id}/chat?after=0`, 200],
    [`/servers/${id}/chat?before=50000000000000000000`, 200],
    [`/servers/${id}/maps`, 200],
    [`/servers/${id}/maps?mode=ConquestLarge0`, 200],
    [`/servers/${id}/countries`, 200],
    [`/servers/${id}/countries?c=US,US,a1`, 200],
    [`/servers/${id}/suspicious`, 200],
    [`/servers/${id}/server`, 200],
    [`/servers/${id}/bans`, 200]
  ]),
  ["/players/1", 200],
  ["/players/1?sid=1", 200],
  ["/players/1?sid=2", 200],
  ["/players/13", 200],
  ["/players/14", 200],
  ["/players/15?sid=1", 200],
  ["/players/17?sid=1", 200],
  ["/players/19?sid=2", 200],
  ["/players/21", 200],
  ["/players/22", 200],
  ["/players/999999", 404],
  ["/servers/3", 404],
  ["/servers/999", 404],
  ["/servers/1/unknown-section", 404],
  ["/does-not-exist", 404],
  ["/api/health", 200],
  ["/api/servers", 200],
  ["/api/players/suggest?term=Alex", 200],
  ["/api/players/suggest?term=Alex&sid=2", 200],
  ["/api/chat", 200],
  ["/api/chat?sid=1&q=gg", 200],
  ["/api/chat?sid=2&before=100&channel=squad", 200],
  ["/api/chat?sid=1&after=0&player=17", 200]
];

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`${baseUrl}/api/health did not answer with 200 within a minute`);
}

const baseUrls = process.argv.slice(2);
if (baseUrls.length === 0) {
  console.error("Usage: node scripts/smoke-test.mjs <base URL> [more base URLs...]");
  process.exit(2);
}

let failures = 0;
for (const baseUrl of baseUrls) {
  await waitForHealth(baseUrl);
  for (const [path, expected] of ROUTES) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    await response.arrayBuffer();
    if (response.status !== expected) {
      failures += 1;
      console.error(`FAIL ${baseUrl}${path}: ${response.status}, expected ${expected}`);
    }
  }
  console.log(`${baseUrl}: ${ROUTES.length} routes checked`);
}

if (failures > 0) {
  console.error(`${failures} route(s) failed`);
  process.exit(1);
}
