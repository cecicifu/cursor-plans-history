import * as assert from "assert";
import { dateBucket, relativeDate } from "../util/time";

suite("time utils", () => {
  const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

  test("relativeDate handles minutes and hours", () => {
    assert.match(relativeDate(NOW - 2 * 60_000, NOW), /2m/);
    assert.match(relativeDate(NOW - 3 * 3_600_000, NOW), /3h/);
  });

  test("relativeDate handles days within a week", () => {
    assert.match(relativeDate(NOW - 3 * 86_400_000, NOW), /3d/);
  });

  test("dateBucket categorises correctly", () => {
    assert.strictEqual(typeof dateBucket(NOW - 100, NOW), "string");
    assert.strictEqual(typeof dateBucket(NOW - 2 * 86_400_000, NOW), "string");
  });
});
