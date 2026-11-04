import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { appRouter } from "server/routers/app";
import { prisma } from "server/prisma/prisma-client";
import { matchStore } from "server/match-store";
import { subscribe } from "server/emitter/event-emitter";
import type { Context } from "server/trpc/trpc-context";
import type { MatchRules } from "shared/schemas/match-rules";
import type { Emittable } from "shared/types/events";
import type { UnitWithVisibleStats } from "shared/schemas/unit";

const enabled = process.env.WARSWORLD_INTEGRATION_TEST === "1";

void test(
  "two players can complete a persisted, synchronized game",
  { skip: !enabled },
  async (t) => {
    // Use a dedicated database: this suite inserts and removes only its own fixtures.
    assert.match(process.env.DATABASE_URL ?? "", /warsworld.*test/);
    const prefix = `multiplayer-${randomUUID()}`;
    const users: string[] = [];
    const matches: string[] = [];
    const subscriptions: (() => void)[] = [];
    let mapId: string | undefined;
    const rules: MatchRules = {
      unitCapPerPlayer: 50,
      fogOfWar: false,
      fundsPerProperty: 1000,
      labUnitTypes: [],
      bannedUnitTypes: [],
      captureLimit: 50,
      dayLimit: 50,
      weatherSetting: "snow",
      teamMapping: [0, 1],
    };
    const infantry = (
      position: [number, number],
      playerSlot: number,
    ): Extract<UnitWithVisibleStats, { type: "infantry" }> => ({
      type: "infantry",
      position,
      playerSlot,
      isReady: true,
      stats: { hp: 100, fuel: 99 },
    });

    try {
      const identities = await Promise.all(
        ["alice", "bob", "carol"].map(async (name) => {
          const user = await prisma.user.create({
            data: {
              name: `${prefix}-${name}`,
              identities: { create: { name: `${prefix}-${name}`, displayName: name } },
            },
            include: { identities: true },
          });
          users.push(user.id);
          const playerId = user.identities[0].id;
          const ctx: Context = {
            session: { user: { name: user.name }, expires: "2099-01-01" },
            req: undefined,
            res: undefined,
          };
          return { caller: appRouter.createCaller(ctx), playerId };
        }),
      );
      const [alice, bob, carol] = identities;
      const map = await prisma.wWMap.create({
        data: {
          name: prefix,
          numberOfPlayers: 2,
          tiles: [
            [
              { type: "base", playerSlot: 0 },
              { type: "plain", variant: "normal" },
              { type: "plain", variant: "normal" },
              { type: "plain", variant: "normal" },
              { type: "base", playerSlot: 1 },
            ],
            [
              { type: "hq", playerSlot: 0 },
              { type: "city", playerSlot: -1 },
              { type: "plain", variant: "normal" },
              { type: "plain", variant: "normal" },
              { type: "hq", playerSlot: 1 },
            ],
            [
              { type: "plain", variant: "normal" },
              { type: "plain", variant: "normal" },
              { type: "plain", variant: "normal" },
              { type: "plain", variant: "normal" },
              { type: "plain", variant: "normal" },
            ],
          ],
          predeployedUnits: [
            infantry([1, 2], 0),
            { ...infantry([3, 2], 1), stats: { hp: 10, fuel: 99 } },
            infantry([3, 1], 0),
          ],
        },
      });
      mapId = map.id;
      const created = await alice.caller.match.create({
        playerId: alice.playerId,
        mapId: map.id,
        rules,
        name: "  Alice vs Bob  ",
      });
      matches.push(created.id);
      assert.equal(created.name, "Alice vs Bob");
      const a = { playerId: alice.playerId, matchId: created.id };
      const b = { playerId: bob.playerId, matchId: created.id };
      const c = { playerId: carol.playerId, matchId: created.id };
      const events: Emittable[][] = [[], []];
      subscriptions.push(subscribe(created.id, alice.playerId, (event) => events[0].push(event)));
      subscriptions.push(subscribe(created.id, bob.playerId, (event) => events[1].push(event)));

      await t.test("rejects impersonation and gameplay before both players are ready", async () => {
        await assert.rejects(bob.caller.match.full(a), /don't own/);
        await assert.rejects(alice.caller.action.send({ ...a, type: "passTurn" }), /not started/);
        await alice.caller.match.setReady({ ...a, readyState: true });
        assert.equal(matchStore.get(created.id)?.status, "setup");
      });
      await t.test(
        "join and ready events reach both players; first turn has income and weather",
        async () => {
          await bob.caller.match.join({
            ...b,
            playerSlot: null,
            selectedCO: { name: "andy", version: "AW2" },
          });
          await assert.rejects(
            carol.caller.match.join({
              ...c,
              playerSlot: null,
              selectedCO: { name: "andy", version: "AW2" },
            }),
            /full/,
          );
          await assert.rejects(
            bob.caller.match.switchOptions({ ...b, selectedSlot: 2 }),
            /Invalid player slot/,
          );
          await bob.caller.match.setReady({ ...b, readyState: true });
          const state = await alice.caller.match.full(a);
          assert.equal(state.status, "playing");
          assert.equal(state.turn, 1);
          assert.equal(state.currentWeather, "snow");
          assert.deepEqual(
            state.players.map((p) => [p.hasCurrentTurn, p.funds]),
            [
              [true, 2000],
              [false, 0],
            ],
          );
          assert.ok(events[0].some((event) => event.type === "player-joined"));
          assert.ok(
            events.every((received) => received.some((event) => event.type === "matchStart")),
          );
        },
      );
      await t.test(
        "builds persist and publish to both clients; the opponent cannot act",
        async () => {
          await assert.rejects(bob.caller.action.send({ ...b, type: "passTurn" }), /not your turn/);
          await alice.caller.action.send({
            ...a,
            type: "build",
            unitType: "infantry",
            position: [0, 0],
          });
          assert.equal(await prisma.event.count({ where: { matchId: created.id } }), 2);
          assert.ok(events.every((received) => received.some((event) => event.type === "build")));
          assert.equal((await bob.caller.match.full(b)).units.length, 4);
          await alice.caller.action.send({ ...a, type: "passTurn" });
          await bob.caller.action.send({
            ...b,
            type: "build",
            unitType: "infantry",
            position: [4, 0],
          });
          await bob.caller.action.send({ ...b, type: "passTurn" });
          assert.equal(matchStore.get(created.id)?.turn, 2);
        },
      );
      await t.test("a failed save leaves live state unchanged and sends no events", async () => {
        const before = structuredClone(await alice.caller.match.full(a));
        const counts = events.map((received) => received.length);
        const failure = t.mock.method(prisma, "$transaction", () =>
          Promise.reject(new Error("Test write failure")),
        );

        try {
          await assert.rejects(
            alice.caller.action.send({ ...a, type: "passTurn" }),
            /Test write failure/,
          );
        } finally {
          failure.mock.restore();
        }

        assert.deepEqual(await alice.caller.match.full(a), before);
        assert.deepEqual(
          events.map((received) => received.length),
          counts,
        );
      });
      await t.test("rejects teleporting movement and invalid room names", async () => {
        await assert.rejects(
          alice.caller.action.send({
            ...a,
            type: "move",
            path: [
              [1, 2],
              [4, 2],
            ],
            subAction: { type: "wait" },
          }),
          /adjacent tile/,
        );
        await assert.rejects(
          alice.caller.match.create({
            playerId: alice.playerId,
            mapId: map.id,
            rules,
            name: "   ",
          }),
        );
        await assert.rejects(
          alice.caller.match.create({
            playerId: alice.playerId,
            mapId: map.id,
            rules,
            name: "a".repeat(61),
          }),
        );
      });
      await t.test(
        "an invalid subaction leaves the live state and event log unchanged",
        async () => {
          const before = structuredClone(await alice.caller.match.full(a));
          const eventCount = await prisma.event.count({ where: { matchId: created.id } });
          await assert.rejects(
            alice.caller.action.send({
              ...a,
              type: "move",
              path: [
                [1, 2],
                [1, 1],
              ],
              subAction: { type: "launchMissile", targetPosition: [4, 0] },
            }),
          );
          assert.deepEqual(await alice.caller.match.full(a), before);
          assert.equal(await prisma.event.count({ where: { matchId: created.id } }), eventCount);
        },
      );
      await t.test(
        "captures, simultaneous requests and ordered replay preserve the same game",
        async () => {
          await alice.caller.action.send({
            ...a,
            type: "move",
            path: [
              [1, 2],
              [1, 1],
            ],
            subAction: { type: "ability" },
          });
          const passes = await Promise.allSettled([
            alice.caller.action.send({ ...a, type: "passTurn" }),
            alice.caller.action.send({ ...a, type: "passTurn" }),
          ]);
          assert.equal(passes.filter((result) => result.status === "fulfilled").length, 1);
          await bob.caller.action.send({ ...b, type: "passTurn" });
          await alice.caller.action.send({
            ...a,
            type: "move",
            path: [[1, 1]],
            subAction: { type: "ability" },
          });
          assert.equal(matchStore.get(created.id)?.getTile([1, 1]).type, "city");
          const city = matchStore.get(created.id)?.getTile([1, 1]);
          assert.ok(city !== undefined && "playerSlot" in city && city.playerSlot === 0);
          const before = structuredClone(await alice.caller.match.full(a));
          await matchStore.rebuild();
          assert.deepEqual(await alice.caller.match.full(a), before);
          assert.equal(
            (await alice.caller.match.getPlayerMatches({ playerId: alice.playerId })).filter(
              (m) => m.id === created.id,
            ).length,
            1,
          );
        },
      );
      await t.test(
        "HQ capture ends the game for both players and survives a server restart",
        async () => {
          await alice.caller.action.send({
            ...a,
            type: "move",
            path: [
              [3, 1],
              [4, 1],
            ],
            subAction: { type: "ability" },
          });
          await alice.caller.action.send({ ...a, type: "passTurn" });
          await bob.caller.action.send({ ...b, type: "passTurn" });
          await alice.caller.action.send({
            ...a,
            type: "move",
            path: [[4, 1]],
            subAction: { type: "ability" },
          });
          assert.equal(matchStore.get(created.id)?.status, "finished");
          assert.equal(
            (await prisma.match.findUniqueOrThrow({ where: { id: created.id } })).status,
            "finished",
          );
          assert.ok(
            events.every((received) => received.some((event) => event.type === "matchEnd")),
          );
          await assert.rejects(
            alice.caller.action.send({ ...a, type: "passTurn" }),
            /not in progress/,
          );
          const before = structuredClone(await alice.caller.match.full(a));
          await matchStore.rebuild();
          assert.deepEqual(await bob.caller.match.full(b), before);
        },
      );
      await t.test(
        "destroying the last enemy unit declares victory and replays consistently",
        async () => {
          const battle = await alice.caller.match.create({
            playerId: alice.playerId,
            mapId: map.id,
            rules,
          });
          matches.push(battle.id);
          const aa = { ...a, matchId: battle.id };
          const bb = { ...b, matchId: battle.id };
          await bob.caller.match.join({
            ...bb,
            playerSlot: null,
            selectedCO: { name: "andy", version: "AW2" },
          });
          await alice.caller.match.setReady({ ...aa, readyState: true });
          await bob.caller.match.setReady({ ...bb, readyState: true });
          await alice.caller.action.send({
            ...aa,
            type: "move",
            path: [
              [1, 2],
              [2, 2],
            ],
            subAction: { type: "attack", defenderPosition: [3, 2] },
          });
          const before = structuredClone(await alice.caller.match.full(aa));
          assert.equal(before.status, "finished");
          assert.equal(before.players.find((p) => p.id === bob.playerId)?.status, "routed");
          await matchStore.rebuild();
          assert.deepEqual(await bob.caller.match.full(bb), before);
        },
      );
      await t.test(
        "leaving preserves the opponent; slots can change and be filled again",
        async () => {
          const lobby = await alice.caller.match.create({
            playerId: alice.playerId,
            mapId: map.id,
            rules,
          });
          matches.push(lobby.id);
          const aa = { ...a, matchId: lobby.id };
          const bb = { ...b, matchId: lobby.id };
          await bob.caller.match.join({
            ...bb,
            playerSlot: 1,
            selectedCO: { name: "andy", version: "AW2" },
          });
          await bob.caller.match.leave(bb);
          assert.deepEqual(
            (await alice.caller.match.full(aa)).players.map((p) => p.id),
            [alice.playerId],
          );
          await alice.caller.match.switchOptions({ ...aa, selectedSlot: 1 });
          await bob.caller.match.join({
            ...bb,
            playerSlot: 0,
            selectedCO: { name: "andy", version: "AW2" },
          });
          assert.equal(matchStore.get(lobby.id)?.getPlayerById(alice.playerId)?.team.index, 1);
          await alice.caller.match.setReady({ ...aa, readyState: true });
          await bob.caller.match.setReady({ ...bb, readyState: true });
          assert.equal(matchStore.get(lobby.id)?.getCurrentTurnPlayer().data.id, bob.playerId);
        },
      );
    } finally {
      subscriptions.forEach((unsubscribe) => unsubscribe());

      if (mapId !== undefined) {
        const fixtures = await prisma.match.findMany({ where: { mapId }, select: { id: true } });
        matches.push(...fixtures.map((match) => match.id));
      }

      await prisma.event.deleteMany({ where: { matchId: { in: matches } } });
      await prisma.match.deleteMany({ where: { id: { in: matches } } });

      if (mapId !== undefined) {
        await prisma.wWMap.delete({ where: { id: mapId } });
      }

      await prisma.player.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  },
);
