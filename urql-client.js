import {
  createClient,
  dedupExchange,
  cacheExchange,
  fetchExchange,
} from "urql";
import { authExchange } from "@urql/exchange-auth";
import { makeOperation } from "@urql/core";
import { Auth } from "aws-amplify";
import { Buffer } from "buffer";

const url = "https://crystal-dating.hasura.app/v1/graphql";

const getAuth = async ({ authState }) => {
  if (!authState) {
    let session;
    try {
      session = await Auth.currentSession();
    } catch {
      // The promise will be rejected if the user isn't signed in yet
      return null;
    }
    if (session) {
      return {
        token: session.getIdToken().getJwtToken(),
      };
    }
    return null;
  }

  // This is where auth has gone wrong and we need to clean up and redirect to a login page
  Auth.signOut();
  return null;
};

const addAuthToOperation = ({ authState, operation }) => {
  if (!authState || !authState.token) {
    return operation;
  }

  const fetchOptions =
    typeof operation.context.fetchOptions === "function"
      ? operation.context.fetchOptions()
      : operation.context.fetchOptions || {};

  return makeOperation(operation.kind, operation, {
    ...operation.context,
    fetchOptions: {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        Authorization: `Bearer ${authState.token}`,
      },
      credentials: "include",
    },
  });
};

const didAuthError = ({ error }) =>
  error.graphQLErrors.some((e) => e.message === "Unauthorized");

const willAuthError = ({ authState }) => {
  if (!authState) return true;
  try {
    const [, payload] = authState.token.split(".");
    const { exp } = JSON.parse(Buffer.from(payload, "base64"));
    return exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
};

const client = createClient({
  url,
  exchanges: [
    dedupExchange,
    cacheExchange,
    authExchange({
      getAuth,
      addAuthToOperation,
      didAuthError,
      willAuthError,
    }),
    fetchExchange,
  ],
});

export default client;
