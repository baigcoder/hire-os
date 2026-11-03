import mongoose from "mongoose";
import { Company } from "../../models/company.model.js";

const company = (name, payments = []) => ({
  name,
  email: `hr@${name.toLowerCase()}.test`,
  description: "A company description long enough for validation.",
  website: `https://${name.toLowerCase()}.test`,
  location: "Remote",
  adminUser: new mongoose.Types.ObjectId(),
  payments,
});

const payment = (transactionId) => ({
  transactionId,
  amount: 10,
  currency: "USD",
  plan: "basic",
  duration: "monthly",
});

describe("Company payments index", () => {
  beforeAll(() => Company.syncIndexes());

  it("allows any number of companies without payments", async () => {
    await Company.create(company("Alpha"));
    await Company.create(company("Beta"));
    await Company.create(company("Gamma"));
    expect(await Company.countDocuments()).toBe(3);
  });

  it("still rejects a transaction id used by another company", async () => {
    await Company.create(company("Alpha", [payment("txn_1")]));
    await expect(
      Company.create(company("Beta", [payment("txn_1")])),
    ).rejects.toThrow(/duplicate key/);
    await expect(
      Company.create(company("Gamma", [payment("txn_2")])),
    ).resolves.toBeTruthy();
  });
});
