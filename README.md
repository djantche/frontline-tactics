# Frontline Tactics

Frontline Tactics is a turn-based tactics game for the browser, based on Advance Wars 2: create a room, challenge an opponent, build your own maps and learn the game with the built-in guide. The interface is available in French and English.

This project is a fork of [WarsWorld](https://github.com/WarsWorld/WarsWorld), and like it is licensed under the [GNU AGPL-3.0](LICENSE.md). Advance Wars is (c) Nintendo and Intelligent Systems; this is an unofficial fan project.

Want to help? See the [contribution guidelines](CONTRIBUTING.md).

# Setting up your local environment

To make sure our project is able to run locally, follow these 6 easy steps!

1 - Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and run it (the Docker daemon is needed to run your local database, so all need is to have the app running in the background. Nothing else!).

2 - Make sure you have [node installed](https://nodejs.org/en/download) and the version is recent. version ^18.15.0 is recommended

3 - Clone the repository in your own working environment or IDE.

4 - Copy the "env.example" to ".env" and setup a random password/string in the PGPASSWORD and NEXTAUTH_SECRET fields.

5 - Install the dependencies from package.json and run app using the following code:

```
npm install
npm run db:up // creates DB container
npm run prisma:push // creates tables and columns
npm run prisma:seed // inserts some data to create development users and a match
npm run dev
```

Now go to localhost:3000 and you should be set! If you are having issues, feel free to contact someone in the team!

## Playing with two players

Sign in with a separate account for each player. On one computer, use two browser
profiles or a regular window and a private window, since tabs in the same profile
share a login. In development, `npm run prisma:seed-dev-accounts` provides Alice
and Bob through the quick login buttons.

Open `/` to browse or create a room. Its invitation URL is `/rooms/<id>`; share it
with the other player. Each player picks
their options and marks themselves ready. The match starts when both are ready;
only the player whose turn it is can build, move or pass. Capture the enemy HQ or
destroy their last unit to win. Actions are saved before they are sent to the
players, and the match can be resumed after refreshing or restarting the server.
The game itself is at `/game/<id>`. Other pages are `/maps` (map editor),
`/how-to-play` (guide) and `/leaderboard` (ranking). French is the default language;
the language switcher also provides English.

For two devices on the same network, open `http://<server-ip>:3000` on both devices
and allow access to ports 3000 (web) and 3001 (WebSocket). A development WebSocket
URL configured with localhost automatically follows the hostname of the page.

## Multiplayer regression tests

The tests use Node's test runner and the existing `tsx` dependency:

```sh
node --import tsx --test src/tests/multiplayer.test.ts src/tests/map-editor.test.ts src/tests/player-stats.test.ts
```

The integration suite requires a **separate PostgreSQL database**, with
`frontline` and `test` in its URL. It creates and removes its own fixtures. For
example, with the local Docker database:

```sh
docker compose exec postgres psql -U postgres -c 'CREATE DATABASE frontline_multiplayer_test;'
DATABASE_URL=postgresql://postgres@localhost:5932/frontline_multiplayer_test npm exec prisma db push -- --skip-generate
DATABASE_URL=postgresql://postgres@localhost:5932/frontline_multiplayer_test FRONTLINE_INTEGRATION_TEST=1 node --import tsx --test src/tests/multiplayer.integration.test.ts
```

Coverage includes ownership and turn checks, joining and readiness, initial funds
and weather, builds, captures, combat victory, rejected actions, failed writes,
simultaneous requests, leaving and changing slots, named rooms, event delivery to
both players and rebuilding the same state from saved events.

# My local setup isn't working!

If you are having troubleshotting issues, here are some clear steps to help you get back on track.

1 - Make sure Docker Desktop is running on the background.

2 - Run the `npm i` to install any missing dependencies.

3 - Run `npm run db:destroy` to clear the docker container (and therefore the database as well).

4 - Run `npm run db:up`, `npm run prisma:push`, `npm run prisma:seed` to re-create the docker container and seed the database. You might see the error

5 - Make sure node, npm, git, and docker desktop are all installed properly. Also make sure you copy the ".env.example" file to ".env" and setup a random password/string in the PGPASSWORD and NEXTAUTH_SECRET fields.

# Where is the database? How can we see it?

To see the contents of the db all you need to is run `prisma studio` or `npm run prisma:studio`, this should immediatly send you to localhost:5555 and show you the database!

## How to use accounts and log in to Frontline Tactics as a dev

The following steps are optional, and it's only useful if you want to help with authentication/authorization or you just want to try to login with Discord, GitHub or Google. You also don't need to set up every provider, if you just want to try to login with discord, just follow the directions to setup discord authentication, same with the others. Furthermore you can still login and register users with email and password authentication without following the next steps.

If you want to login with GitHub, Discord or Google you should follow the next steps:

Directions for Github Account:

1 - Open Github, click your icon, and choose `settings`

2 - Scroll down the options on the left panel and click `Developer Settings`

3 - It will bring you to a new page, again on the left click `OAuth Apps`

4 - Click `New OAuth App`

5 - Fill in an Application Name, set the Homepage to `http://localhost:3000`

6 - Set the Authorization Callback URL to `http://localhost:3000/api/auth/callback/github`

7 - Click Register application and open the app

8 - You're given your Github Client ID, copy that and add to your `.env`

9 - On the Github page, click `Generate a new client secret`

10 - Copy this and paste it into `.env` as your Github Client Secret. All Done!

Directions for Discord Account:

- Follow this guide to get the client and secret: [Discord Guide](https://support.heateor.com/discord-client-id-discord-client-secret/)

Directions for Google Account:

- Follow through steps 1 to 3 and 5 to get the client and secret and set up the redirect link: [Google Guide](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid)

## Our Tech Stack's Features

- 🧙‍♂️ E2E type safety with [tRPC](https://trpc.io)
- 🖼️ [Tailwind CSS](https://tailwindcss.com/) for easy consistent styling
- ⚡ Full-stack React with Next.js
- ⚡ WebSockets / Subscription support
- ⚡ Database with Prisma
- 🔐 Authorization using [next-auth](https://next-auth.js.org/)
- ⚙️ VSCode extensions
- 🎨 ESLint + Prettier
