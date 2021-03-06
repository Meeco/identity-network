import { PrivateKey } from "@hashgraph/sdk";
import supertest, { Response } from "supertest";
import { app } from "../../src/server";
import { generateAuthHeaders, getPublicKeyMultibase } from "../utils";
import { setupBeforeAndAfter } from "./setup";

describe("DID Verification Relationships", () => {
  const DID_PRIVATE_KEY = PrivateKey.fromString(
    process.env.DID_PRIVATE_KEY || ""
  );
  const DID_PUBLIC_KEY_MULTIBASE = getPublicKeyMultibase(DID_PRIVATE_KEY);

  const verificationRelationshipIdentifier =
    "did:hedera:testnet:z6MkubW6fwkWSA97RbKs17MtLgWGHBtShQygUc5SeHueFCaG_0.0.29656231#key-1";
  const verificationRelationshipPublicKey =
    "z6Mkkcn1EDXc5vzpmvnQeCKpEswyrnQG7qq59k92gFRm1EGk";
  const verificationRelationshipType = "authentication";
  const dateInThePast = new Date(new Date().getTime() - 1000);

  let registeredDidDocument: Response;

  //setup in memory mongodb and mock mongoose db connection
  setupBeforeAndAfter();
  beforeAll(async () => {
    // register new DID
    registeredDidDocument = await supertest(app).post("/did").send({
      publicKeyMultibase: DID_PUBLIC_KEY_MULTIBASE,
    });

    expect(registeredDidDocument.statusCode).toBe(201);
    expect(registeredDidDocument.body).toBeDefined();
    expect(
      registeredDidDocument.body.verificationMethod[1].publicKeyMultibase
    ).toEqual(DID_PUBLIC_KEY_MULTIBASE);
  });

  describe("Register verification-relationship to the DID Document", () => {
    describe("given valid register DID identifier and verification-relationship payload", () => {
      it("returns error about expired request", async () => {
        const body = {
          verificationRelationship: {
            id: verificationRelationshipIdentifier,
            type: "Ed25519VerificationKey2018",
            relationshipType: verificationRelationshipType,
            controller: registeredDidDocument.body.id,
            publicKeyMultibase: verificationRelationshipPublicKey,
          },
        };

        const requestOptions = {
          json: true,
          url: `http://localhost:8000/did/${registeredDidDocument.body.id}/verification-relationships`,
          method: "POST",
          headers: {},
          body: body,
        };

        const authHeaders = await generateAuthHeaders(
          requestOptions,
          DID_PRIVATE_KEY,
          registeredDidDocument.body.verificationMethod[1].id,
          dateInThePast
        );

        // register new did verification method
        const result = await supertest(app)
          .post(
            `/did/${registeredDidDocument.body.id}/verification-relationships`
          )
          .set({ ...requestOptions.headers, ...authHeaders })
          .send(body);

        expect(result.statusCode).toBe(500);
        expect(result.body).toBeDefined();
        expect(result.body).toEqual({
          error: "Request has expired",
          message: "Internal Server Error",
        });
      });

      it("should return a 200 with updated DID Document.", async () => {
        const body = {
          verificationRelationship: {
            id: verificationRelationshipIdentifier,
            type: "Ed25519VerificationKey2018",
            relationshipType: verificationRelationshipType,
            controller: registeredDidDocument.body.id,
            publicKeyMultibase: verificationRelationshipPublicKey,
          },
        };

        const requestOptions = {
          json: true,
          url: `http://localhost:8000/did/${registeredDidDocument.body.id}/verification-relationships`,
          method: "POST",
          headers: {},
          body: body,
        };

        const authHeaders = await generateAuthHeaders(
          requestOptions,
          DID_PRIVATE_KEY,
          registeredDidDocument.body.verificationMethod[1].id
        );

        // register new did verification method
        const result = await supertest(app)
          .post(
            `/did/${registeredDidDocument.body.id}/verification-relationships`
          )
          .set({ ...requestOptions.headers, ...authHeaders })
          .send(body);

        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();
        expect(result.body.verificationMethod).toBeDefined();
        expect(result.body.verificationMethod.length).toBe(3);
        expect(result.body.verificationMethod[2].publicKeyMultibase).toEqual(
          verificationRelationshipPublicKey
        );
        expect(result.body.authentication.length).toBe(3);
        expect(result.body.authentication[2]).toEqual(
          verificationRelationshipIdentifier
        );
      });
    });
  });

  describe("Update verification-relationship information on the DID Document", () => {
    describe("given valid register DID identifier, verification-relationship ID and verification-relationship payload", () => {
      it("returns error about expired request", async () => {
        const updatedVerificationRelationshipPublicKey =
          "z6MkhHbhBBLdKGiGnHPvrrH9GL7rgw6egpZiLgvQ9n7pHt1P";

        const body = {
          verificationRelationship: {
            type: "Ed25519VerificationKey2018",
            controller: registeredDidDocument.body.id,
            publicKeyMultibase: updatedVerificationRelationshipPublicKey,
          },
        };

        const requestOptions = {
          json: true,
          url: `http://localhost:8000/did/${
            registeredDidDocument.body.id
          }/verification-relationships/${verificationRelationshipType}/${encodeURIComponent(
            verificationRelationshipIdentifier
          )}`,
          method: "PUT",
          headers: {},
          body: body,
        };

        const authHeaders = await generateAuthHeaders(
          requestOptions,
          DID_PRIVATE_KEY,
          registeredDidDocument.body.verificationMethod[1].id,
          dateInThePast
        );

        const result = await supertest(app)
          .put(
            `/did/${
              registeredDidDocument.body.id
            }/verification-relationships/${verificationRelationshipType}/${encodeURIComponent(
              verificationRelationshipIdentifier
            )}`
          )
          .set({ ...requestOptions.headers, ...authHeaders })
          .send(body);

        expect(result.statusCode).toBe(500);
        expect(result.body).toBeDefined();
        expect(result.body).toEqual({
          error: "Request has expired",
          message: "Internal Server Error",
        });
      });

      it("should return a 200 with updated DID Document.", async () => {
        const updatedVerificationRelationshipPublicKey =
          "z6MkhHbhBBLdKGiGnHPvrrH9GL7rgw6egpZiLgvQ9n7pHt1P";

        const body = {
          verificationRelationship: {
            type: "Ed25519VerificationKey2018",
            controller: registeredDidDocument.body.id,
            publicKeyMultibase: updatedVerificationRelationshipPublicKey,
          },
        };

        const requestOptions = {
          json: true,
          url: `http://localhost:8000/did/${
            registeredDidDocument.body.id
          }/verification-relationships/${verificationRelationshipType}/${encodeURIComponent(
            verificationRelationshipIdentifier
          )}`,
          method: "PUT",
          headers: {},
          body: body,
        };

        const authHeaders = await generateAuthHeaders(
          requestOptions,
          DID_PRIVATE_KEY,
          registeredDidDocument.body.verificationMethod[1].id
        );

        const result = await supertest(app)
          .put(
            `/did/${
              registeredDidDocument.body.id
            }/verification-relationships/${verificationRelationshipType}/${encodeURIComponent(
              verificationRelationshipIdentifier
            )}`
          )
          .set({ ...requestOptions.headers, ...authHeaders })
          .send(body);

        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();
        expect(result.body.verificationMethod).toBeDefined();
        expect(result.body.verificationMethod.length).toBe(3);
        expect(result.body.verificationMethod[2].publicKeyMultibase).toEqual(
          updatedVerificationRelationshipPublicKey
        );
        expect(result.body.authentication.length).toBe(3);
      });
    });
  });

  describe("Remove verification-relationship information from the DID Document", () => {
    describe("given valid register DID identifier and verification-relationship ID", () => {
      it("returns error about expired request", async () => {
        const requestOptions = {
          json: true,
          url: `http://localhost:8000/did/${
            registeredDidDocument.body.id
          }/verification-relationships/${verificationRelationshipType}/${encodeURIComponent(
            verificationRelationshipIdentifier
          )}`,
          method: "DELETE",
          headers: {},
        };

        const authHeaders = await generateAuthHeaders(
          requestOptions,
          DID_PRIVATE_KEY,
          registeredDidDocument.body.verificationMethod[1].id,
          dateInThePast
        );

        const result = await supertest(app)
          .delete(
            `/did/${
              registeredDidDocument.body.id
            }/verification-relationships/${verificationRelationshipType}/${encodeURIComponent(
              verificationRelationshipIdentifier
            )}`
          )
          .set({ ...requestOptions.headers, ...authHeaders })
          .send();

        expect(result.statusCode).toBe(500);
        expect(result.body).toBeDefined();
        expect(result.body).toEqual({
          error: "Request has expired",
          message: "Internal Server Error",
        });
      });

      it("should return a 200 with updated DID document", async () => {
        const requestOptions = {
          json: true,
          url: `http://localhost:8000/did/${
            registeredDidDocument.body.id
          }/verification-relationships/${verificationRelationshipType}/${encodeURIComponent(
            verificationRelationshipIdentifier
          )}`,
          method: "DELETE",
          headers: {},
        };

        const authHeaders = await generateAuthHeaders(
          requestOptions,
          DID_PRIVATE_KEY,
          registeredDidDocument.body.verificationMethod[1].id
        );

        const result = await supertest(app)
          .delete(
            `/did/${
              registeredDidDocument.body.id
            }/verification-relationships/${verificationRelationshipType}/${encodeURIComponent(
              verificationRelationshipIdentifier
            )}`
          )
          .set({ ...requestOptions.headers, ...authHeaders })
          .send();

        expect(result.statusCode).toBe(200);
        expect(result.body).toBeDefined();
        expect(result.body.verificationMethod[2]).toBeUndefined();
        expect(result.body.authentication.length).toBe(2);
      });
    });
  });
});
