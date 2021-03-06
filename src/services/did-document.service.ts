import { Hashing, HcsDid } from "@hashgraph/did-sdk-js";
import { PrivateKey, PublicKey } from "@hashgraph/sdk";
import { DidKeypairModel } from "../daos/did-keypair.dao";
import { DidDocument, IDidDocumentRegisterPayload } from "../models";
import { client } from "./hedera-client";
import { HcsMessageCollectorService } from "./hcs-message-collector.service";
import { ResolverService } from "./resolver.service";

/**
 * Resolve DID document by its address
 * @returns DID document information
 */
export const resolve = async (did: string): Promise<DidDocument> => {
  return new ResolverService(did).resolve();
};

/**
 * Register new DID with the identity-network
 * @returns Registered DID document information
 */
export const register = async (
  payload: IDidDocumentRegisterPayload
): Promise<DidDocument> => {
  const hcsMessages = new HcsMessageCollectorService();
  const decodedMultiBasePubKey = Hashing.multibase.decode(
    payload.publicKeyMultibase
  );
  const publicKey = PublicKey.fromBytes(decodedMultiBasePubKey);
  const privateKey = PrivateKey.generate();

  const hcsDid = new HcsDid({
    privateKey: privateKey,
    client: client,
    onMessageConfirmed: hcsMessages.listener,
  });

  await hcsDid.register();

  await DidKeypairModel.createDidKeypair({
    did: hcsDid.getIdentifier(),
    privateKey: privateKey,
  });

  await hcsDid.addVerificationRelationship({
    id: hcsDid.getIdentifier() + "#key-1",
    relationshipType: "authentication",
    controller: hcsDid.getIdentifier(),
    type: "Ed25519VerificationKey2018",
    publicKey: publicKey,
  });

  await hcsMessages.writeToDB();

  return new ResolverService(hcsDid.getIdentifier()).resolve();
};

/**
 * Deactivate existing DID document
 * @returns void
 */
export const revoke = async (did: string): Promise<void> => {
  const hcsMessages = new HcsMessageCollectorService();
  const didKeypair = await DidKeypairModel.findById(did);

  if (!didKeypair || !didKeypair.privateKey) {
    throw new Error(`DID is not controller by the identity-network`);
  }

  const privateKey = PrivateKey.fromString(didKeypair.privateKey);

  const hcsDid = new HcsDid({
    identifier: did,
    privateKey: privateKey,
    client: client,
    onMessageConfirmed: hcsMessages.listener,
  });

  await hcsDid.delete();
  await hcsMessages.writeToDB();
};
