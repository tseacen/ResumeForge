import { describe, expect, it } from "vitest";

import {
  addSessionAssistantMessage,
  addSessionUserInstruction,
  initializeSession,
} from "@/lib/resumeforge/agent";

describe("addSessionUserInstruction", () => {
  it("appends a user message and stores the instruction history", () => {
    const session = initializeSession("Backend engineer position focused on TypeScript and APIs");
    const updated = addSessionUserInstruction(session, "Revert the last summary change.");

    expect(updated.revisionInstructions).toEqual(["Revert the last summary change."]);
    const lastMessage = updated.messages.at(-1);
    expect(lastMessage?.kind).toBe("user");
    if (lastMessage?.kind === "user") {
      expect(lastMessage.body).toBe("Revert the last summary change.");
    }
  });

  it("keeps only the most recent 12 instructions", () => {
    let session = initializeSession("Product manager role in B2B SaaS");

    for (let index = 1; index <= 15; index += 1) {
      session = addSessionUserInstruction(session, `Instruction ${index}`);
    }

    expect(session.revisionInstructions).toHaveLength(12);
    expect(session.revisionInstructions[0]).toBe("Instruction 4");
    expect(session.revisionInstructions.at(-1)).toBe("Instruction 15");
  });

  it("can append an assistant acknowledgement after a user instruction", () => {
    const session = initializeSession("Data engineer role with analytics stack");
    const withUserNote = addSessionUserInstruction(session, "Please keep this concise.");
    const updated = addSessionAssistantMessage(withUserNote, [
      "Noted. I will keep this as a constraint.",
    ]);

    const lastMessage = updated.messages.at(-1);
    expect(lastMessage?.kind).toBe("assistant");
  });
});
