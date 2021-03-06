import { PrivateKey } from "@hashgraph/sdk";
import supertest from "supertest";
import { app } from "../../src/server";
import { generateAuthHeaders, getPublicKeyMultibase } from "../utils";
import { setupBeforeAndAfter } from "./setup";

describe("DID Document", () => {
  const DID_PRIVATE_KEY = PrivateKey.fromString(
    process.env.DID_PRIVATE_KEY || ""
  );
  const DID_PUBLIC_KEY_MULTIBASE = getPublicKeyMultibase(DID_PRIVATE_KEY);

  const dateInThePast = new Date(new Date().getTime() - 1000);

  //setup in memory mongodb and mock mongoose db connection
  setupBeforeAndAfter();
  describe("resolve DID Document", () => {
    describe("given invalid DID Identifier", () => {
      it("should return a 500 with error incorrect format", async () => {
        const invalidDidIdentifier =
          "did:hedera:testnet:z6MkreRjoWnX5sCbQRxJUbcCneSqfbbzuTWh62wUmqrSoT4_0.0.30787373";
        const result = await supertest(app).get(`/did/${invalidDidIdentifier}`);

        expect(result.statusCode).toBe(500);
        expect(result.body).toEqual({
          error: "DID string is invalid. ID holds incorrect format.",
          message: "Internal Server Error",
        });
      });

      it("should return a 500 with error invalid prefix.", async () => {
        const invalidDidIdentifier =
          "invalid:hedera:testnet:z6MkreRjoWnX5sCbQRxJUbcCneSqfbbzuTWh62wUmqrSoT4_0.0.30787373";
        const result = await supertest(app).get(`/did/${invalidDidIdentifier}`);

        expect(result.statusCode).toBe(500);
        expect(result.body).toEqual({
          error: "DID string is invalid: invalid prefix.",
          message: "Internal Server Error",
        });
      });

      it("should return a 500 with error invalid method name.", async () => {
        const invalidDidIdentifier =
          "did:invalid:testnet:z6MkreRjoWnX5sCbQRxJUbcCneSqfbbzuTWh62wUmqrSoT4_0.0.30787373";
        const result = await supertest(app).get(`/did/${invalidDidIdentifier}`);

        expect(result.statusCode).toBe(500);
        expect(result.body).toEqual({
          error: "DID string is invalid: invalid method name: invalid",
          message: "Internal Server Error",
        });
      });

      it("should return a 500 with error invalid network.", async () => {
        const invalidDidIdentifier =
          "did:hedera:invalid:z6MkreRjoWnX5sCbQRxJUbcCneSqfbbzuTWh62wUmqrSoT4_0.0.30787373";
        const result = await supertest(app).get(`/did/${invalidDidIdentifier}`);

        expect(result.statusCode).toBe(500);
        expect(result.body).toEqual({
          error: "DID string is invalid. Invalid Hedera network.",
          message: "Internal Server Error",
        });
      });

      it("should return a 500 with error did parsing error.", async () => {
        const invalidDidIdentifier =
          "did:hedera:testnet:z6MkreRjoWnX5sCbQRxJUbcCneSqfbbzuTWh62wUmqrSoT4_0.0";
        const result = await supertest(app).get(`/did/${invalidDidIdentifier}`);

        expect(result.statusCode).toBe(500);
        expect(result.body).toEqual({
          error: "failed to parse entity id: 0.0",
          message: "Internal Server Error",
        });
      });
    });

    describe("given DID identifier without events", () => {
      it("should return a 200 with empty DID Document.", async () => {
        const identifier =
          "did:hedera:testnet:z6MkreRjoWnX5sCbQRxJUbcCneSqfbbzuTWh62wUmqrSoT47_0.0.3";
        const result = await supertest(app).get(`/did/${identifier}`);

        expect(result.statusCode).toBe(200);
        expect(result.body).toEqual({
          "@context": "https://www.w3.org/ns/did/v1",
          assertionMethod: [],
          authentication: [],
          id: identifier,
          verificationMethod: [],
        });
      });
    });

    describe("given newly register DID identifier", () => {
      it("should return a 200 with DID Document.", async () => {
        // register new did
        const newDIDDocument = await supertest(app).post("/did").send({
          publicKeyMultibase: DID_PUBLIC_KEY_MULTIBASE,
        });

        // resolve did
        const identifier = newDIDDocument.body.id;
        const result = await supertest(app).get(`/did/${identifier}`);

        expect(result.statusCode).toBe(200);
        expect(result.body).toEqual(newDIDDocument.body);
      });
    });
  });

  describe("register DID Document", () => {
    describe("given invalid request body object", () => {
      it("should return a 422 with validation error ", async () => {
        const result = await supertest(app).post("/did").send({
          invalid: "abcd",
        });
        expect(result.statusCode).toBe(422);
        expect(result.body).toEqual({
          details: {
            "body.invalid": {
              message:
                '"invalid" is an excess property and therefore is not allowed',
              value: "invalid",
            },
            "body.publicKeyMultibase": {
              message: "'publicKeyMultibase' is required",
            },
          },
          message: "Validation Failed",
        });
      });

      it("should return a 422 with validation error ", async () => {
        const result = await supertest(app).post("/did").send({
          publicKeyMultibase: DID_PUBLIC_KEY_MULTIBASE,
          extra: "invalid prop",
        });
        expect(result.statusCode).toBe(422);
        expect(result.body).toEqual({
          details: {
            "body.extra": {
              message:
                '"extra" is an excess property and therefore is not allowed',
              value: "extra",
            },
          },
          message: "Validation Failed",
        });
      });
    });

    describe("given valid request body", () => {
      it("should return a 201 with newly registered DID Document ", async () => {
        const result = await supertest(app).post("/did").send({
          publicKeyMultibase: DID_PUBLIC_KEY_MULTIBASE,
        });
        expect(result.statusCode).toBe(201);
        expect(result.body).toBeDefined();
        expect(result.body.verificationMethod).toBeDefined();
        expect(result.body.verificationMethod.length).toBe(2);
        expect(result.body.verificationMethod[1].publicKeyMultibase).toEqual(
          DID_PUBLIC_KEY_MULTIBASE
        );
      });
    });
  });

  describe("delete DID Document", () => {
    describe("given valid DID Identifier", () => {
      it("returns error about expired request", async () => {
        // register new DID
        const newDIDDocument = await supertest(app).post("/did").send({
          publicKeyMultibase: DID_PUBLIC_KEY_MULTIBASE,
        });

        expect(newDIDDocument.statusCode).toBe(201);
        expect(newDIDDocument.body).toBeDefined();
        expect(
          newDIDDocument.body.verificationMethod[1].publicKeyMultibase
        ).toEqual(DID_PUBLIC_KEY_MULTIBASE);

        const requestOptions = {
          json: true,
          url: `http://localhost:8000/did/${newDIDDocument.body.id}`,
          method: "DELETE",
          headers: {},
        };

        const authHeaders = await generateAuthHeaders(
          requestOptions,
          DID_PRIVATE_KEY,
          newDIDDocument.body.verificationMethod[1].id,
          dateInThePast
        );

        const result = await supertest(app)
          .delete(`/did/${newDIDDocument.body.id}`)
          .set({ ...requestOptions.headers, ...authHeaders })
          .send({
            publicKeyMultibase: DID_PUBLIC_KEY_MULTIBASE,
          });

        expect(result.statusCode).toBe(500);
        expect(result.body).toBeDefined();
        expect(result.body).toEqual({
          error: "Request has expired",
          message: "Internal Server Error",
        });
      });

      it("should return a 204 with no content", async () => {
        // register new DID
        const newDIDDocument = await supertest(app).post("/did").send({
          publicKeyMultibase: DID_PUBLIC_KEY_MULTIBASE,
        });

        expect(newDIDDocument.statusCode).toBe(201);
        expect(newDIDDocument.body).toBeDefined();
        expect(
          newDIDDocument.body.verificationMethod[1].publicKeyMultibase
        ).toEqual(DID_PUBLIC_KEY_MULTIBASE);

        const requestOptions = {
          json: true,
          url: `http://localhost:8000/did/${newDIDDocument.body.id}`,
          method: "DELETE",
          headers: {},
        };

        const authHeaders = await generateAuthHeaders(
          requestOptions,
          DID_PRIVATE_KEY,
          newDIDDocument.body.verificationMethod[1].id
        );

        const result = await supertest(app)
          .delete(`/did/${newDIDDocument.body.id}`)
          .set({ ...requestOptions.headers, ...authHeaders })
          .send({
            publicKeyMultibase: DID_PUBLIC_KEY_MULTIBASE,
          });

        expect(result.body).toEqual({});
        expect(result.statusCode).toBe(204);
      });
    });
  });
});
