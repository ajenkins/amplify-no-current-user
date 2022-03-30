import {
  createClient,
  dedupExchange,
  cacheExchange,
  fetchExchange,
} from "urql";
import { authExchange } from "@urql/exchange-auth";
import { makeOperation } from "@urql/core";
import { Auth } from "aws-amplify";

const url = "https://crystal-dating.hasura.app/v1/graphql";

const getAuth = async ({ authState }) => {
  console.log("getAuth");
  if (!authState) {
    const session = await Auth.currentAuthenticatedUser();
    if (session) {
      console.log("party time", session);
      return {
        token: session.getIdToken().getJwtToken(),
      };
    }
    Auth.signOut();
    return null;
  }

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
    },
  });
};

const didAuthError = ({ error }) =>
  error.graphQLErrors.some((e) => e.message === "Unauthorized");

const willAuthError = ({ authState }) => {
  console.log(authState);
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
