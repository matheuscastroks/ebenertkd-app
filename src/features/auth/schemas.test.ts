import { adultRegistrationSchema, minorLoginSchema, minorRegistrationSchema } from "@/features/auth/schemas";

describe("auth schemas", () => {
  it("normalizes adult registration email", () => {
    const result = adultRegistrationSchema.parse({
      fullName: "Maria Silva", email: " MARIA@EXAMPLE.COM ", password: "segura123", accountType: "guardian"
    });
    expect(result.email).toBe("maria@example.com");
  });

  it("normalizes a minor username without exposing a technical email", () => {
    const result = minorLoginSchema.parse({ username: " Joao.Silva ", password: "segura123" });
    expect(result.username).toBe("joao.silva");
  });

  it("rejects invalid minor usernames", () => {
    expect(minorRegistrationSchema.safeParse({
      fullName: "João Silva", username: "@@", password: "segura123"
    }).success).toBe(false);
  });
});
