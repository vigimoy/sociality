import { expect, it } from "vitest";
import { optionalPhone, profileChanges } from "../lib/sociality/payloads";
it("omits absent phone numbers rather than sending the empty string rejected by the API", () => {
  expect(optionalPhone(" ")).toEqual({});
  expect(optionalPhone("+628123456789")).toEqual({ phone: "+628123456789" });
});
it("sends only changed profile fields and supports clearing bio", () => {
  const user = {
    id: 1,
    name: "QA",
    username: "qauser",
    avatarUrl: null,
    phone: null,
    bio: "old",
  };
  expect(
    profileChanges(
      { name: "QA", username: "qauser", phone: "", bio: "" },
      user,
    ),
  ).toEqual({ bio: "" });
});
