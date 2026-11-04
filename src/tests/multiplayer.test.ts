import assert from "node:assert/strict";
import test from "node:test";
import { browserWebSocketUrl } from "frontend/utils/connection-url";
import { createEmitter } from "server/emitter/create-emitter";
import { getCOProperties } from "shared/match-logic/co";
import { applyMoveEvent } from "shared/match-logic/events/handlers/move";
import type { MatchWrapper } from "shared/wrappers/match";
import { unitPropertiesMap } from "shared/match-logic/game-constants/unit-properties";

void test("battle copters have six movement points", () => {
  assert.equal(unitPropertiesMap.battleCopter.movementPoints, 6);
});

void test("Hawke AW2 uses his own abilities rather than Hachi's", () => {
  const hawke = getCOProperties({ name: "hawke", version: "AW2" });
  assert.equal(hawke.displayName, "Hawke");
  assert.equal(hawke.powers.COPower?.name, "Black Wave");
  assert.equal(hawke.powers.superCOPower?.name, "Black Storm");
});

void test("each tab receives events and unsubscribes independently", () => {
  const emitter = createEmitter<{ matchId: string; value: number }>();
  const received: number[][] = [[], [], []];
  const offFirst = emitter.subscribe("game", "alice", (event) => received[0].push(event.value));
  const offSecond = emitter.subscribe("game", "alice", (event) => received[1].push(event.value));
  emitter.subscribe("other-game", "alice", (event) => received[2].push(event.value));
  emitter.emit("alice", { matchId: "game", value: 1 });
  offFirst();
  emitter.emit("alice", { matchId: "game", value: 2 });
  offSecond();
  emitter.emit("alice", { matchId: "game", value: 3 });
  assert.deepEqual(received, [[1], [1, 2], []]);
});

void test("a second device connects to the server rather than its own localhost", () => {
  assert.equal(
    browserWebSocketUrl("ws://localhost:3001", "http://192.168.1.8:3000"),
    "ws://192.168.1.8:3001/",
  );
  assert.equal(
    browserWebSocketUrl("ws://localhost:3001", "https://game.test"),
    "wss://game.test:3001/",
  );
  assert.equal(
    browserWebSocketUrl("wss://socket.game.test/ws", "https://game.test"),
    "wss://socket.game.test/ws",
  );
  assert.equal(
    browserWebSocketUrl("ws://localhost:3001", "http://localhost:3000"),
    "ws://localhost:3001/",
  );
});

void test("a unit that acts without moving has used its turn", () => {
  const unit = { data: { isReady: true } };
  const match = { getUnitOrThrow: () => unit } as unknown as MatchWrapper;

  applyMoveEvent(match, { type: "move", path: [[4, 2]], trap: false });

  assert.equal(unit.data.isReady, false);
});
